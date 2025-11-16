import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'

/**
 * 性能监控组合式函数
 * 提供组件渲染性能监控和内存泄漏检测
 */
export function usePerformanceMonitor(componentName = 'Unknown') {
  // 性能指标
  const metrics = ref({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    memoryUsage: 0,
    lastUpdate: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity
  })

  // 性能历史记录
  const performanceHistory = ref([])
  const maxHistorySize = 100

  // 内存监控
  const memoryLeaks = ref([])
  const observers = ref([])
  const timers = ref([])
  const eventListeners = ref([])

  // 性能观察器
  let performanceObserver = null
  
  let mutationObserver = null

  /**
   * 开始性能监控
   */
  const startMonitoring = () => {
    const startTime = globalThis.performance?.now() || Date.now()

    // 监控渲染性能
    if (globalThis.PerformanceObserver) {
      performanceObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name.includes(componentName)) {
            updateRenderMetrics(entry.duration)
          }
        })
      })

      try {
        performanceObserver.observe({ entryTypes: ['measure', 'navigation'] })
      } catch (error) {
        console.warn('Performance monitoring not supported:', error)
      }
    }

    // 监控 DOM 变化
    if (globalThis.MutationObserver) {
      mutationObserver = new globalThis.MutationObserver((mutations) => {
        const mutationTime = globalThis.performance?.now()
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            recordPerformanceEvent('dom-mutation', mutationTime)
          }
        })
      })
    }

    // 监控内存使用
    monitorMemoryUsage()

    metrics.value.mountTime = globalThis.performance?.now() - startTime
  }

  /**
   * 更新渲染指标
   */
  const updateRenderMetrics = (duration) => {
    metrics.value.renderTime = duration
    metrics.value.updateCount++
    metrics.value.lastUpdate = Date.now()

    // 计算平均渲染时间
    const history = performanceHistory.value
    history.push(duration)
    
    if (history.length > maxHistorySize) {
      history.shift()
    }

    metrics.value.averageRenderTime = history.reduce((a, b) => a + b, 0) / history.length
    metrics.value.maxRenderTime = Math.max(metrics.value.maxRenderTime, duration)
    metrics.value.minRenderTime = Math.min(metrics.value.minRenderTime, duration)

    // 记录性能事件
    recordPerformanceEvent('render', duration)
  }

  /**
   * 监控内存使用
   */
  const monitorMemoryUsage = () => {
    if ('memory' in globalThis.performance) {
      const updateMemory = () => {
        const memory = globalThis.performance?.memory
        metrics.value.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }

        // 检测内存泄漏
        detectMemoryLeaks()
      }

      updateMemory()
      const memoryTimer = setInterval(updateMemory, 5000) // 每5秒检查一次
      timers.value.push(memoryTimer)
    }
  }

  /**
   * 检测内存泄漏
   */
  const detectMemoryLeaks = () => {
    const currentMemory = metrics.value.memoryUsage
    if (!currentMemory) return

    const memoryHistory = performanceHistory.value
      .filter(entry => entry.type === 'memory')
      .slice(-10) // 最近10次记录

    if (memoryHistory.length >= 5) {
      const trend = calculateMemoryTrend(memoryHistory)
      
      if (trend > 0.1) { // 内存增长超过10%
        const leak = {
          timestamp: Date.now(),
          component: componentName,
          memoryUsage: currentMemory.used,
          trend: trend,
          severity: trend > 0.3 ? 'high' : 'medium'
        }
        
        memoryLeaks.value.push(leak)
        
        // 发出警告
        console.warn(`🚨 Potential memory leak detected in ${componentName}:`, leak)
      }
    }

    recordPerformanceEvent('memory', currentMemory.used)
  }

  /**
   * 计算内存趋势
   */
  const calculateMemoryTrend = (history) => {
    if (history.length < 2) return 0

    const first = history[0].value
    const last = history[history.length - 1].value
    
    return (last - first) / first
  }

  /**
   * 记录性能事件
   */
  const recordPerformanceEvent = (type, value) => {
    const event = {
      type,
      value,
      timestamp: Date.now(),
      component: componentName
    }

    performanceHistory.value.push(event)
    
    if (performanceHistory.value.length > maxHistorySize) {
      performanceHistory.value.shift()
    }
  }

  /**
   * 测量函数执行时间
   */
  const measureFunction = (fn, name = 'function') => {
    return async (...args) => {
      const start = globalThis.performance?.now() || Date.now()
      
      try {
        const result = await fn(...args)
        const duration = globalThis.performance?.now() - start
        
        recordPerformanceEvent(`function-${name}`, duration)
        
        if (duration > 16) { // 超过一帧的时间
          console.warn(`⚠️ Slow function detected: ${name} took ${duration.toFixed(2)}ms`)
        }
        
        return result
      } catch (error) {
        const duration = globalThis.performance?.now() - start
        recordPerformanceEvent(`function-${name}-error`, duration)
        throw error
      }
    }
  }

  /**
   * 监控 DOM 元素
   */
  const observeElement = (element, options = {}) => {
    if (!element) return

    // 监控大小变化
    if (globalThis.ResizeObserver) {
      const resizeObserver = new globalThis.ResizeObserver((entries) => {
        entries.forEach(entry => {
          recordPerformanceEvent('resize', {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          })
        })
      })
      
      resizeObserver.observe(element)
      observers.value.push(resizeObserver)
    }

    // 监控 DOM 变化
    if (mutationObserver) {
      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        attributes: options.attributes || false,
        attributeOldValue: options.attributeOldValue || false,
        characterData: options.characterData || false,
        characterDataOldValue: options.characterDataOldValue || false
      })
    }
  }

  /**
   * 添加事件监听器 (用于跟踪)
   */
  const addEventListener = (element, event, handler, options) => {
    const wrappedHandler = measureFunction(handler, `event-${event}`)
    element.addEventListener(event, wrappedHandler, options)
    
    eventListeners.value.push({
      element,
      event,
      handler: wrappedHandler,
      options
    })
    
    return wrappedHandler
  }

  /**
   * 获取性能报告
   */
  const getPerformanceReport = () => {
    return {
      component: componentName,
      metrics: { ...metrics.value },
      history: [...performanceHistory.value],
      memoryLeaks: [...memoryLeaks.value],
      resourceUsage: {
        observers: observers.value.length,
        timers: timers.value.length,
        eventListeners: eventListeners.value.length
      },
      recommendations: generateRecommendations()
    }
  }

  /**
   * 生成性能建议
   */
  const generateRecommendations = () => {
    const recommendations = []
    
    if (metrics.value.averageRenderTime > 16) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `Average render time (${metrics.value.averageRenderTime.toFixed(2)}ms) exceeds 16ms. Consider optimizing render logic.`
      })
    }
    
    if (metrics.value.updateCount > 100) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: `High update count (${metrics.value.updateCount}). Consider using computed properties or memoization.`
      })
    }
    
    if (memoryLeaks.value.length > 0) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: `${memoryLeaks.value.length} potential memory leaks detected. Check for unremoved event listeners or observers.`
      })
    }
    
    if (timers.value.length > 5) {
      recommendations.push({
        type: 'resource',
        severity: 'medium',
        message: `${timers.value.length} active timers. Ensure they are properly cleaned up.`
      })
    }
    
    return recommendations
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    // 清理性能观察器
    if (performanceObserver) {
      performanceObserver.disconnect()
      performanceObserver = null
    }

    // 清理变化观察器
    if (mutationObserver) {
      mutationObserver.disconnect()
      mutationObserver = null
    }

    // 清理大小观察器
    observers.value.forEach(observer => {
      observer.disconnect()
    })
    observers.value = []

    // 清理定时器
    timers.value.forEach(timer => {
      clearInterval(timer)
    })
    timers.value = []

    // 清理事件监听器
    eventListeners.value.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options)
    })
    eventListeners.value = []
  }

  // 生命周期钩子
  onMounted(() => {
    nextTick(() => {
      startMonitoring()
    })
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    metrics: readonly(metrics),
    performanceHistory: readonly(performanceHistory),
    memoryLeaks: readonly(memoryLeaks),
    measureFunction,
    observeElement,
    addEventListener,
    getPerformanceReport,
    cleanup
  }
}

/**
 * 全局性能监控
 */
export function useGlobalPerformanceMonitor() {
  const globalMetrics = ref({
    totalComponents: 0,
    activeComponents: 0,
    totalMemoryUsage: 0,
    averageRenderTime: 0,
    slowComponents: []
  })

  const componentReports = ref(new Map())

  const registerComponent = (componentName, report) => {
    componentReports.value.set(componentName, report)
    updateGlobalMetrics()
  }

  const unregisterComponent = (componentName) => {
    componentReports.value.delete(componentName)
    updateGlobalMetrics()
  }

  const updateGlobalMetrics = () => {
    const reports = Array.from(componentReports.value.values())
    
    globalMetrics.value = {
      totalComponents: reports.length,
      activeComponents: reports.filter(r => r.metrics.updateCount > 0).length,
      totalMemoryUsage: reports.reduce((sum, r) => sum + (r.metrics.memoryUsage?.used || 0), 0),
      averageRenderTime: reports.reduce((sum, r) => sum + r.metrics.averageRenderTime, 0) / reports.length || 0,
      slowComponents: reports
        .filter(r => r.metrics.averageRenderTime > 16)
        .map(r => ({ name: r.component, renderTime: r.metrics.averageRenderTime }))
        .sort((a, b) => b.renderTime - a.renderTime)
    }
  }

  return {
    globalMetrics: readonly(globalMetrics),
    registerComponent,
    unregisterComponent,
    getGlobalReport: () => ({
      metrics: { ...globalMetrics.value },
      components: Object.fromEntries(componentReports.value)
    })
  }
}

// 只读 ref 工具函数
function readonly(refValue) {
  return computed(() => refValue.value)
}

/**
 * 应用级性能监控组合式函数
 */
export function useAppPerformanceMonitor() {
  // 性能指标
  const metrics = ref({
    // 应用性能
    appStartTime: Date.now(),
    componentLoadTimes: new Map(),
    renderTimes: new Map(),
    
    // 内存使用
    memoryUsage: {
      used: 0,
      total: 0,
      percentage: 0
    },
    
    // 统计信息
    stats: {
      totalComponents: 0,
      activeComponents: 0,
      totalOperations: 0,
      errors: 0,
      warnings: 0
    },
    
    // 性能阈值
    thresholds: {
      renderTime: 16, // 16ms (60fps)
      memoryUsage: 80, // 80%
      componentLoad: 100 // 100ms
    }
  })
  
  // 性能警告
  const warnings = ref([])
  const errors = ref([])
  
  // 记录组件加载时间
  const recordComponentLoad = (componentName, loadTime) => {
    metrics.value.componentLoadTimes.set(componentName, loadTime)
    
    if (loadTime > metrics.value.thresholds.componentLoad) {
      addWarning(`组件 ${componentName} 加载时间过长: ${loadTime}ms`)
    }
    
    updateStats('componentLoad')
  }
  
  // 记录渲染时间
  const recordRenderTime = (componentName, renderTime) => {
    metrics.value.renderTimes.set(componentName, renderTime)
    
    if (renderTime > metrics.value.thresholds.renderTime) {
      addWarning(`组件 ${componentName} 渲染时间过长: ${renderTime}ms`)
    }
    
    updateStats('render')
  }
  
  // 更新内存使用情况
  const updateMemoryUsage = () => {
    if ('memory' in globalThis.performance) {
      const memory = globalThis.performance?.memory
      const used = memory.usedJSHeapSize
      const total = memory.totalJSHeapSize
      const percentage = (used / total) * 100
      
      metrics.value.memoryUsage = {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round(percentage)
      }
      
      if (percentage > metrics.value.thresholds.memoryUsage) {
        addWarning(`内存使用率过高: ${percentage.toFixed(1)}%`)
      }
    }
  }
  
  // 添加警告
  const addWarning = (message) => {
    const warning = {
      id: Date.now(),
      message,
      timestamp: new Date(),
      level: 'warning'
    }
    warnings.value.push(warning)
    metrics.value.stats.warnings++
    
    // 限制警告数量
    if (warnings.value.length > 100) {
      warnings.value = warnings.value.slice(-50)
    }
  }
  
  // 添加错误
  const addError = (message, error = null) => {
    const errorObj = {
      id: Date.now(),
      message,
      error,
      timestamp: new Date(),
      level: 'error'
    }
    errors.value.push(errorObj)
    metrics.value.stats.errors++
    
    // 限制错误数量
    if (errors.value.length > 100) {
      errors.value = errors.value.slice(-50)
    }
  }
  
  // 更新统计信息
  const updateStats = (type) => {
    metrics.value.stats.totalOperations++
    
    switch (type) {
      case 'componentLoad':
        metrics.value.stats.totalComponents++
        break
      case 'render':
        metrics.value.stats.activeComponents++
        break
    }
  }
  
  // 获取性能报告
  const getPerformanceReport = () => {
    const now = Date.now()
    const uptime = now - metrics.value.appStartTime
    
    const avgRenderTime = Array.from(metrics.value.renderTimes.values())
      .reduce((sum, time) => sum + time, 0) / metrics.value.renderTimes.size || 0
    
    const avgLoadTime = Array.from(metrics.value.componentLoadTimes.values())
      .reduce((sum, time) => sum + time, 0) / metrics.value.componentLoadTimes.size || 0
    
    return {
      uptime: Math.round(uptime / 1000), // 秒
      memory: metrics.value.memoryUsage,
      performance: {
        avgRenderTime: Math.round(avgRenderTime * 100) / 100,
        avgLoadTime: Math.round(avgLoadTime * 100) / 100,
        slowComponents: getSlowComponents(),
        slowRenders: getSlowRenders()
      },
      stats: metrics.value.stats,
      issues: {
        warnings: warnings.value.length,
        errors: errors.value.length
      }
    }
  }
  
  // 获取慢速组件
  const getSlowComponents = () => {
    return Array.from(metrics.value.componentLoadTimes.entries())
      .filter(([_, time]) => time > metrics.value.thresholds.componentLoad)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 10)
  }
  
  // 获取慢速渲染
  const getSlowRenders = () => {
    return Array.from(metrics.value.renderTimes.entries())
      .filter(([_, time]) => time > metrics.value.thresholds.renderTime)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 10)
  }
  
  // 清除警告和错误
  const clearWarnings = () => {
    warnings.value = []
    metrics.value.stats.warnings = 0
  }
  
  const clearErrors = () => {
    errors.value = []
    metrics.value.stats.errors = 0
  }
  
  // 重置所有指标
  const resetMetrics = () => {
    metrics.value.appStartTime = Date.now()
    metrics.value.componentLoadTimes.clear()
    metrics.value.renderTimes.clear()
    metrics.value.stats = {
      totalComponents: 0,
      activeComponents: 0,
      totalOperations: 0,
      errors: 0,
      warnings: 0
    }
    clearWarnings()
    clearErrors()
  }
  
  // 性能监控状态
  const isHealthy = computed(() => {
    return (
      metrics.value.memoryUsage.percentage < 90 &&
      metrics.value.stats.errors === 0 &&
      metrics.value.stats.warnings < 10
    )
  })
  
  // 性能评分
  const performanceScore = computed(() => {
    let score = 100
    
    // 内存使用评分 (40%)
    const memoryScore = Math.max(0, 100 - metrics.value.memoryUsage.percentage)
    score = score * 0.4 + memoryScore * 0.6
    
    // 错误和警告扣分
    score -= metrics.value.stats.errors * 5
    score -= metrics.value.stats.warnings
    
    return Math.max(0, Math.round(score))
  })
  
  // 定期更新内存使用情况
  let memoryInterval = null
  
  const startMonitoring = () => {
    updateMemoryUsage()
    memoryInterval = setInterval(updateMemoryUsage, 5000) // 每5秒更新一次
  }
  
  const stopMonitoring = () => {
    if (memoryInterval) {
      clearInterval(memoryInterval)
      memoryInterval = null
    }
  }
  
  // 自动开始监控
  startMonitoring()
  
  return {
    metrics,
    warnings,
    errors,
    isHealthy,
    performanceScore,
    recordComponentLoad,
    recordRenderTime,
    updateMemoryUsage,
    addWarning,
    addError,
    getPerformanceReport,
    getSlowComponents,
    getSlowRenders,
    clearWarnings,
    clearErrors,
    resetMetrics,
    startMonitoring,
    stopMonitoring
  }
}
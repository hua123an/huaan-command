import { ref, computed } from 'vue'

// 性能监控 Composable
export function usePerformanceMonitor() {
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
    if ('memory' in performance) {
      const memory = performance.memory
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
import { ref } from 'vue'
import { useNotificationStore } from '../stores/notifications'

/**
 * 统一错误处理组合式函数
 * 提供一致的错误处理、用户通知和错误恢复机制
 */
export function useErrorHandler() {
  const notificationStore = useNotificationStore()
  const isHandlingError = ref(false)

  /**
   * 处理错误的主要方法
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误发生的上下文
   * @param {Object} options - 处理选项
   */
  const handleError = async (error, context = 'Unknown', options = {}) => {
    if (isHandlingError.value) return // 防止错误处理循环

    isHandlingError.value = true

    try {
      // 1. 标准化错误对象
      const normalizedError = normalizeError(error)
      
      // 2. 记录错误日志
      logError(normalizedError, context)
      
      // 3. 显示用户友好的通知
      if (options.showNotification !== false) {
        await showErrorNotification(normalizedError, context, options)
      }
      
      // 4. 错误上报 (可选)
      if (options.report !== false) {
        reportError(normalizedError, context)
      }
      
      // 5. 执行恢复策略
      if (options.recovery) {
        await executeRecovery(options.recovery, normalizedError)
      }

    } catch (handlingError) {
      // 错误处理本身失败时的降级处理
      console.error('Error handler failed:', handlingError)
      fallbackErrorHandling(error, context)
    } finally {
      isHandlingError.value = false
    }
  }

  /**
   * 标准化错误对象
   */
  const normalizeError = (error) => {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        type: 'Error'
      }
    }
    
    if (typeof error === 'string') {
      return {
        name: 'StringError',
        message: error,
        type: 'String'
      }
    }
    
    if (typeof error === 'object' && error !== null) {
      return {
        name: error.name || 'ObjectError',
        message: error.message || JSON.stringify(error),
        code: error.code,
        type: 'Object',
        ...error
      }
    }
    
    return {
      name: 'UnknownError',
      message: 'An unknown error occurred',
      type: 'Unknown',
      originalError: error
    }
  }

  /**
   * 记录错误日志
   */
  const logError = (error, context) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      context,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      userAgent: globalThis.navigator?.userAgent || 'Unknown',
      url: window.location.href
    }

    // 开发环境：详细日志
    if (import.meta.env.DEV) {
      console.group(`🚨 Error in ${context}`)
      console.error('Error:', error)
      console.error('Context:', context)
      console.error('Full log:', logEntry)
      console.groupEnd()
    }

    // 生产环境：简化日志
    if (import.meta.env.PROD) {
      console.error(`[${timestamp}] ${context}: ${error.message}`)
    }

    // 存储到本地日志 (可选)
    storeErrorLog(logEntry)
  }

  /**
   * 显示用户友好的错误通知
   */
  const showErrorNotification = async (error, context, options) => {
    const userMessage = getUserFriendlyMessage(error, context)
    
    await notificationStore.showNotification({
      type: 'error',
      title: options.title || '操作失败',
      message: userMessage,
      duration: options.duration || 5000,
      actions: options.actions || []
    })
  }

  /**
   * 获取用户友好的错误消息
   */
  const getUserFriendlyMessage = (error, context) => {
    // 预定义的错误消息映射
    const errorMessages = {
      'Network Error': '网络连接失败，请检查网络设置',
      'Permission denied': '权限不足，请检查文件权限',
      'File not found': '文件未找到，请检查文件路径',
      'Invalid API key': 'API 密钥无效，请检查配置',
      'Rate limit exceeded': '请求过于频繁，请稍后重试',
      'Timeout': '操作超时，请重试',
      'Parse error': '数据解析失败，请检查数据格式'
    }

    // 根据错误类型返回友好消息
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message?.includes(key) || error.name?.includes(key)) {
        return message
      }
    }

    // 根据上下文提供特定消息
    const contextMessages = {
      'Terminal initialization failed': '终端初始化失败，请重新启动应用',
      'Failed to write to terminal': '终端写入失败，请检查终端状态',
      'Failed to generate AI command': 'AI 命令生成失败，请检查 AI 配置',
      'Failed to execute command': '命令执行失败，请检查命令语法',
      'Failed to load file': '文件加载失败，请检查文件是否存在'
    }

    if (contextMessages[context]) {
      return contextMessages[context]
    }

    // 默认消息
    return error.message || '发生未知错误，请重试'
  }

  /**
   * 错误上报 (可扩展)
   */
  const reportError = (error, context) => {
    // 这里可以集成错误监控服务
    // 如 Sentry, LogRocket, Bugsnag 等
    
    if (import.meta.env.DEV) {
      // 开发环境不上报
      return
    }

    // 示例：发送到错误收集服务
    // try {
    //   fetch('/api/errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       error: {
    //         name: error.name,
    //         message: error.message,
    //         stack: error.stack
    //       },
    //       context,
    //       timestamp: new Date().toISOString(),
    //       userAgent: navigator.userAgent,
    //       url: window.location.href
    //     })
    //   })
    // } catch (reportingError) {
    //   console.warn('Failed to report error:', reportingError)
    // }
  }

  /**
   * 执行错误恢复策略
   */
  const executeRecovery = async (recovery, error) => {
    try {
      if (typeof recovery === 'function') {
        await recovery(error)
      } else if (typeof recovery === 'object') {
        // 执行预定义的恢复策略
        if (recovery.retry) {
          await recovery.retry()
        }
        if (recovery.fallback) {
          await recovery.fallback()
        }
        if (recovery.reset) {
          await recovery.reset()
        }
      }
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError)
    }
  }

  /**
   * 存储错误日志到本地
   */
  const storeErrorLog = (logEntry) => {
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      logs.push(logEntry)
      
      // 只保留最近100条日志
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs))
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError)
    }
  }

  /**
   * 降级错误处理
   */
  const fallbackErrorHandling = (error, context) => {
    // 最基本的错误处理
    const message = error?.message || error || 'Unknown error'
    console.error(`[${context}] ${message}`)
    
    // 尝试显示基本的用户提示
    try {
      alert(`操作失败: ${message}`)
    } catch {
      // 如果连 alert 都失败了，就没办法了
    }
  }

  /**
   * 获取错误日志
   */
  const getErrorLogs = () => {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]')
    } catch {
      return []
    }
  }

  /**
   * 清除错误日志
   */
  const clearErrorLogs = () => {
    try {
      localStorage.removeItem('error_logs')
    } catch (error) {
      console.warn('Failed to clear error logs:', error)
    }
  }

  return {
    handleError,
    getErrorLogs,
    clearErrorLogs,
    isHandlingError: () => isHandlingError.value
  }
}

// 错误类型定义
export const ERROR_TYPES = {
  NETWORK: 'network',
  AI_API: 'ai_api',
  TERMINAL: 'terminal',
  FILE_SYSTEM: 'file_system',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
}

// 错误严重级别
export const ERROR_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// 错误状态管理
const errors = ref([])
const isRetrying = ref(false)
const retryQueue = ref(new Map())

// 错误处理 Composable (扩展版本)
export function useAdvancedErrorHandler() {
  // 添加错误
  const addError = (error, options = {}) => {
    const errorObj = {
      id: Date.now() + Math.random(),
      type: options.type || ERROR_TYPES.UNKNOWN,
      level: options.level || ERROR_LEVELS.MEDIUM,
      message: error.message || error,
      originalError: error,
      timestamp: new Date(),
      context: options.context || '',
      canRetry: options.canRetry || false,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      onRetry: options.onRetry,
      userMessage: options.userMessage || '发生了一个错误'
    }
    
    errors.value.push(errorObj)
    
    // 记录到控制台
    console.error(`[${errorObj.type.toUpperCase()}] ${errorObj.message}`, error)
    
    // 如果是高严重性错误，显示通知
    if (errorObj.level === ERROR_LEVELS.HIGH || errorObj.level === ERROR_LEVELS.CRITICAL) {
      showErrorNotification(errorObj)
    }
    
    // 如果可以重试，自动重试
    if (errorObj.canRetry && errorObj.retryCount < errorObj.maxRetries) {
      scheduleRetry(errorObj)
    }
    
    return errorObj
  }
  
  // 清除错误
  const clearError = (errorId) => {
    const index = errors.value.findIndex(e => e.id === errorId)
    if (index !== -1) {
      errors.value.splice(index, 1)
    }
  }
  
  // 清除所有错误
  const clearAllErrors = () => {
    errors.value = []
  }
  
  // 手动重试
  const retryError = async (errorId) => {
    const error = errors.value.find(e => e.id === errorId)
    if (!error || !error.canRetry) return false
    
    return await performRetry(error)
  }
  
  // 安排重试
  const scheduleRetry = (error) => {
    if (retryQueue.value.has(error.id)) return
    
    const retryTimeout = setTimeout(async () => {
      await performRetry(error)
    }, error.retryDelay * Math.pow(2, error.retryCount)) // 指数退避
    
    retryQueue.value.set(error.id, retryTimeout)
  }
  
  // 执行重试
  const performRetry = async (error) => {
    if (error.retryCount >= error.maxRetries) {
      clearError(error.id)
      return false
    }
    
    error.retryCount++
    isRetrying.value = true
    
    try {
      if (error.onRetry) {
        await error.onRetry()
      }
      
      // 重试成功，清除错误
      clearError(error.id)
      showSuccessNotification('操作已成功完成')
      return true
    } catch (retryError) {
      // 重试失败
      console.error(`重试失败 (第${error.retryCount}次):`, retryError)
      
      if (error.retryCount < error.maxRetries) {
        // 继续重试
        scheduleRetry(error)
      } else {
        // 达到最大重试次数
        error.level = ERROR_LEVELS.HIGH
        showErrorNotification(error)
      }
      
      return false
    } finally {
      isRetrying.value = false
    }
  }
  
  // 显示错误通知
  const showErrorNotification = (error) => {
    if ('Notification' in globalThis && globalThis.Notification.permission === 'granted') {
      new globalThis.Notification('错误', {
        body: error.userMessage,
        icon: '❌'
      })
    }
  }
  
  // 显示成功通知
  const showSuccessNotification = (message) => {
    if ('Notification' in globalThis && globalThis.Notification.permission === 'granted') {
      new globalThis.Notification('成功', {
        body: message,
        icon: '✅'
      })
    }
  }
  
  // 处理特定类型的错误
  const handleNetworkError = (error, context = '') => {
    return addError(error, {
      type: ERROR_TYPES.NETWORK,
      level: ERROR_LEVELS.MEDIUM,
      context,
      canRetry: true,
      maxRetries: 3,
      userMessage: '网络连接失败，正在重试...'
    })
  }
  
  const handleAIError = (error, context = '') => {
    return addError(error, {
      type: ERROR_TYPES.AI_API,
      level: ERROR_LEVELS.MEDIUM,
      context,
      canRetry: true,
      maxRetries: 2,
      userMessage: 'AI 服务暂时不可用，正在重试...'
    })
  }
  
  const handleTerminalError = (error, context = '') => {
    return addError(error, {
      type: ERROR_TYPES.TERMINAL,
      level: ERROR_LEVELS.HIGH,
      context,
      canRetry: false,
      userMessage: '终端操作失败，请检查命令是否正确'
    })
  }
  
  const handleFileSystemError = (error, context = '') => {
    return addError(error, {
      type: ERROR_TYPES.FILE_SYSTEM,
      level: ERROR_LEVELS.HIGH,
      context,
      canRetry: false,
      userMessage: '文件操作失败，请检查文件权限'
    })
  }
  
  const handleValidationError = (message, context = '') => {
    return addError(new Error(message), {
      type: ERROR_TYPES.VALIDATION,
      level: ERROR_LEVELS.LOW,
      context,
      canRetry: false,
      userMessage: `输入验证失败: ${message}`
    })
  }
  
  // 包装异步函数以自动处理错误
  const withErrorHandling = async (fn, options = {}) => {
    try {
      return await fn()
    } catch (error) {
      const errorHandler = options.errorHandler || handleUnknownError
      errorHandler(error, options.context)
      throw error
    }
  }
  
  // 处理未知错误
  const handleUnknownError = (error, context = '') => {
    return addError(error, {
      type: ERROR_TYPES.UNKNOWN,
      level: ERROR_LEVELS.MEDIUM,
      context,
      canRetry: false,
      userMessage: '发生了未知错误'
    })
  }
  
  // 获取错误统计
  const getErrorStats = () => {
    const stats = {
      total: errors.value.length,
      byType: {},
      byLevel: {},
      retrying: retryQueue.value.size
    }
    
    errors.value.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1
    })
    
    return stats
  }
  
  // 清理重试队列
  const cleanupRetryQueue = () => {
    retryQueue.value.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    retryQueue.value.clear()
  }
  
  return {
    errors,
    isRetrying,
    addError,
    clearError,
    clearAllErrors,
    retryError,
    handleNetworkError,
    handleAIError,
    handleTerminalError,
    handleFileSystemError,
    handleValidationError,
    handleUnknownError,
    withErrorHandling,
    getErrorStats,
    cleanupRetryQueue,
    ERROR_TYPES,
    ERROR_LEVELS
  }
}
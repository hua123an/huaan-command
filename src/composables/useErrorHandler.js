import { ref } from 'vue'

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

// 错误处理 Composable
export function useErrorHandler() {
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
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('错误', {
        body: error.userMessage,
        icon: '❌'
      })
    }
  }
  
  // 显示成功通知
  const showSuccessNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('成功', {
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
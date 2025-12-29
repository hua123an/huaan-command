import { ref } from 'vue'

/**
 * 简化版错误处理组合式函数
 */
export function useErrorHandler() {
  const isHandlingError = ref(false)

  /**
   * 处理错误的主要方法
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误发生的上下文
   */
  const handleError = (error, context = 'Unknown') => {
    if (isHandlingError.value) return // 防止错误处理循环

    isHandlingError.value = true

    try {
      const message = error?.message || error || 'Unknown error'
      console.error(`[${context}]`, message, error)
    } finally {
      isHandlingError.value = false
    }
  }

  return {
    handleError,
    isHandlingError
  }
}

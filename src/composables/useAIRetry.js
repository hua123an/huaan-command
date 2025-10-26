/**
 * AI 调用重试机制 Composable
 * 实现指数退避重试策略
 */

import { ref } from 'vue'

export function useAIRetry() {
  const isRetrying = ref(false)
  const retryCount = ref(0)
  const maxRetries = ref(3)

  /**
   * 执行带重试的 AI 调用
   * @param {Function} fn - AI 调用函数
   * @param {Object} options - 重试选项
   * @returns {Promise} AI 调用结果
   */
  async function withRetry(fn, options = {}) {
    const {
      maxRetries: max = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      onRetry = null
    } = options

    maxRetries.value = max
    retryCount.value = 0
    isRetrying.value = false

    let lastError = null
    let delay = initialDelay

    for (let i = 0; i <= max; i++) {
      try {
        if (i > 0) {
          isRetrying.value = true
          retryCount.value = i

          if (onRetry) {
            onRetry(i, delay)
          }

          // 等待一段时间后重试
          await sleep(delay)

          // 指数退避
          delay = Math.min(delay * backoffFactor, maxDelay)
        }

        const result = await fn()
        isRetrying.value = false
        retryCount.value = 0
        return result

      } catch (error) {
        lastError = error

        // 某些错误不应该重试
        if (isNonRetriableError(error)) {
          break
        }

        // 最后一次尝试也失败了
        if (i === max) {
          break
        }
      }
    }

    isRetrying.value = false
    retryCount.value = 0
    throw lastError
  }

  /**
   * 判断错误是否不应该重试
   */
  function isNonRetriableError(error) {
    const message = error.message?.toLowerCase() || ''

    // API Key 错误不重试
    if (message.includes('401') || message.includes('unauthorized') || message.includes('api key')) {
      return true
    }

    // 配额错误不重试
    if (message.includes('quota') || message.includes('billing')) {
      return true
    }

    // 请求格式错误不重试
    if (message.includes('400') || message.includes('bad request')) {
      return true
    }

    return false
  }

  /**
   * 延迟函数
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    withRetry,
    isRetrying,
    retryCount,
    maxRetries
  }
}

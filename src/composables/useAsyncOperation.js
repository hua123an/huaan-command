import { ref, computed } from 'vue'

/**
 * 异步操作管理组合式函数
 * 提供统一的 Promise 处理、加载状态管理和错误边界
 */
export function useAsyncOperation() {
  // 全局加载状态
  const globalLoading = ref(false)
  const activeOperations = ref(new Map())
  
  /**
   * 执行异步操作
   * @param {Function} operation - 异步操作函数
   * @param {Object} options - 配置选项
   */
  const execute = async (operation, options = {}) => {
    const {
      id = generateId(),
      showGlobalLoading = false,
      timeout = 30000,
      retries = 0,
      retryDelay = 1000,
      onSuccess,
      onError,
      onFinally
    } = options

    // 创建操作状态
    const operationState = {
      id,
      loading: ref(true),
      error: ref(null),
      data: ref(null),
      progress: ref(0),
      startTime: Date.now(),
      abortController: new globalThis.AbortController()
    }

    // 注册操作
    activeOperations.value.set(id, operationState)
    
    if (showGlobalLoading) {
      globalLoading.value = true
    }

    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      })

      // 执行操作（带重试机制）
      let lastError
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await Promise.race([
            operation(operationState.abortController.signal, operationState),
            timeoutPromise
          ])
          
          operationState.data.value = result
          operationState.error.value = null
          
          if (onSuccess) {
            await onSuccess(result)
          }
          
          return result
        } catch (error) {
          lastError = error
          
          // 如果是取消操作，直接退出
          if (error.name === 'AbortError') {
            throw error
          }
          
          // 如果还有重试次数，等待后重试
          if (attempt < retries) {
            await delay(retryDelay * Math.pow(2, attempt)) // 指数退避
            continue
          }
          
          throw error
        }
      }
    } catch (error) {
      operationState.error.value = error
      
      if (onError) {
        await onError(error)
      }
      
      throw error
    } finally {
      operationState.loading.value = false
      
      if (showGlobalLoading) {
        globalLoading.value = false
      }
      
      if (onFinally) {
        await onFinally()
      }
      
      // 清理操作状态
      setTimeout(() => {
        activeOperations.value.delete(id)
      }, 1000) // 延迟清理，允许组件读取最终状态
    }
  }

  /**
   * 取消操作
   */
  const cancel = (id) => {
    const operation = activeOperations.value.get(id)
    if (operation) {
      operation.abortController.abort()
      operation.loading.value = false
      activeOperations.value.delete(id)
    }
  }

  /**
   * 取消所有操作
   */
  const cancelAll = () => {
    for (const [id, operation] of activeOperations.value) {
      operation.abortController.abort()
      operation.loading.value = false
    }
    activeOperations.value.clear()
    globalLoading.value = false
  }

  /**
   * 获取操作状态
   */
  const getOperationState = (id) => {
    return activeOperations.value.get(id)
  }

  /**
   * 批量执行操作
   */
  const executeBatch = async (operations, options = {}) => {
    const {
      concurrent = false,
      maxConcurrency = 3,
      stopOnError = false
    } = options

    if (concurrent) {
      return executeConcurrent(operations, maxConcurrency, stopOnError)
    } else {
      return executeSequential(operations, stopOnError)
    }
  }

  /**
   * 并发执行操作
   */
  const executeConcurrent = async (operations, maxConcurrency, stopOnError) => {
    const results = []
    const errors = []
    
    // 创建信号量控制并发数
    const semaphore = new Semaphore(maxConcurrency)
    
    const promises = operations.map(async (operation, index) => {
      await semaphore.acquire()
      
      try {
        const result = await execute(operation.fn, {
          ...operation.options,
          id: operation.id || `batch_${index}`
        })
        results[index] = result
      } catch (error) {
        errors[index] = error
        if (stopOnError) {
          throw error
        }
      } finally {
        semaphore.release()
      }
    })

    await Promise.allSettled(promises)
    
    return { results, errors }
  }

  /**
   * 顺序执行操作
   */
  const executeSequential = async (operations, stopOnError) => {
    const results = []
    const errors = []
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      
      try {
        const result = await execute(operation.fn, {
          ...operation.options,
          id: operation.id || `sequential_${i}`
        })
        results[i] = result
      } catch (error) {
        errors[i] = error
        if (stopOnError) {
          throw error
        }
      }
    }
    
    return { results, errors }
  }

  // 计算属性
  const hasActiveOperations = computed(() => activeOperations.value.size > 0)
  const operationCount = computed(() => activeOperations.value.size)

  return {
    // 状态
    globalLoading: readonly(globalLoading),
    hasActiveOperations,
    operationCount,
    
    // 方法
    execute,
    cancel,
    cancelAll,
    getOperationState,
    executeBatch
  }
}

/**
 * 单个异步操作的组合式函数
 */
export function useAsyncState(operation, options = {}) {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)
  
  const {
    immediate = false,
    resetOnExecute = true
  } = options

  const execute = async (...args) => {
    if (resetOnExecute) {
      error.value = null
    }
    
    loading.value = true
    
    try {
      const result = await operation(...args)
      data.value = result
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // 立即执行
  if (immediate) {
    execute()
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    data: readonly(data),
    execute
  }
}

/**
 * 工具函数
 */

// 生成唯一 ID
function generateId() {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 信号量实现
class Semaphore {
  constructor(max) {
    this.max = max
    this.current = 0
    this.queue = []
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++
      return
    }

    return new Promise(resolve => {
      this.queue.push(resolve)
    })
  }

  release() {
    this.current--
    if (this.queue.length > 0) {
      this.current++
      const resolve = this.queue.shift()
      resolve()
    }
  }
}

// 只读 ref
function readonly(refValue) {
  return computed(() => refValue.value)
}
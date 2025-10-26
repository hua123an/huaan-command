/**
 * AI 响应缓存 Composable
 * 使用 LRU 缓存机制,减少重复的 AI API 调用
 */

import { ref } from 'vue'

// LRU 缓存实现
class LRUCache {
  constructor(maxSize = 100, ttl = 3600000) { // 默认100条,1小时过期
    this.maxSize = maxSize
    this.ttl = ttl // 过期时间(毫秒)
    this.cache = new Map()
  }

  // 生成缓存键
  generateKey(prompt, model, context = '') {
    return `${model}:${prompt}:${context}`.slice(0, 200)
  }

  // 获取缓存
  get(key) {
    if (!this.cache.has(key)) {
      return null
    }

    const item = this.cache.get(key)

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // 更新访问顺序(LRU)
    this.cache.delete(key)
    this.cache.set(key, item)

    return item.value
  }

  // 设置缓存
  set(key, value) {
    // 如果已存在,先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 如果超过最大容量,删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    // 添加新项
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  // 清空缓存
  clear() {
    this.cache.clear()
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }
}

// 全局缓存实例
const aiCache = new LRUCache(100, 3600000)

export function useAICache() {
  const cacheHits = ref(0)
  const cacheMisses = ref(0)

  /**
   * 从缓存获取 AI 响应
   */
  function getCachedResponse(prompt, model, context = '') {
    const key = aiCache.generateKey(prompt, model, context)
    const cached = aiCache.get(key)

    if (cached) {
      cacheHits.value++
      return cached
    }

    cacheMisses.value++
    return null
  }

  /**
   * 缓存 AI 响应
   */
  function cacheResponse(prompt, model, response, context = '') {
    const key = aiCache.generateKey(prompt, model, context)
    aiCache.set(key, response)
  }

  /**
   * 清空缓存
   */
  function clearCache() {
    aiCache.clear()
    cacheHits.value = 0
    cacheMisses.value = 0
  }

  /**
   * 获取缓存统计
   */
  function getCacheStats() {
    return {
      ...aiCache.getStats(),
      hits: cacheHits.value,
      misses: cacheMisses.value,
      hitRate: cacheHits.value + cacheMisses.value > 0
        ? (cacheHits.value / (cacheHits.value + cacheMisses.value) * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  return {
    getCachedResponse,
    cacheResponse,
    clearCache,
    getCacheStats,
    cacheHits,
    cacheMisses
  }
}

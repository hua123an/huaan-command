/**
 * Claude Code 配置管理 Store
 * 使用 Pinia 管理 Claude Code API 配置状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export const useClaudeConfigStore = defineStore('claudeConfig', () => {
  // ==================== 状态 ====================
  const providers = ref([])
  const activeProvider = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const successMessage = ref(null)

  // ==================== 计算属性 ====================
  const hasProviders = computed(() => providers.value.length > 0)

  const currentProvider = computed(() => {
    return providers.value.find(p => p.name === activeProvider.value)
  })

  const providersList = computed(() => {
    return providers.value.map(p => ({
      ...p,
      isActive: p.name === activeProvider.value,
      maskKey: maskApiKey(p.apiKey)
    }))
  })

  // ==================== 工具函数 ====================
  function maskApiKey(key) {
    if (!key || key.length < 12) {
      return '***'
    }
    const start = key.substring(0, 4)
    const end = key.substring(key.length - 4)
    return `${start}...${end}`
  }

  function clearMessages() {
    error.value = null
    successMessage.value = null
  }

  function clearError() {
    error.value = null
  }

  function clearSuccess() {
    successMessage.value = null
  }

  // ==================== 主要方法 ====================

  /**
   * 加载所有配置
   */
  async function loadProviders() {
    isLoading.value = true
    clearMessages()
    try {
      const result = await invoke('load_claude_providers')
      providers.value = result || []
      return true
    } catch (err) {
      error.value = `加载配置失败: ${err.message || err}`
      console.error('加载配置失败:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 添加新配置
   */
  async function addProvider(provider) {
    // 验证输入
    if (!provider.name || typeof provider.name !== 'string') {
      error.value = '配置名称必填且必须是字符串'
      return false
    }

    if (!provider.baseUrl || typeof provider.baseUrl !== 'string') {
      error.value = 'API Base URL 必填'
      return false
    }

    if (!isValidUrl(provider.baseUrl)) {
      error.value = 'API Base URL 格式无效'
      return false
    }

    if (!provider.apiKey || typeof provider.apiKey !== 'string') {
      error.value = 'API Key 必填'
      return false
    }

    if (!provider.model || typeof provider.model !== 'string') {
      error.value = '模型名称必填'
      return false
    }

    isLoading.value = true
    clearMessages()
    try {
      await invoke('add_claude_provider', {
        name: provider.name,
        base_url: provider.baseUrl,
        api_key: provider.apiKey,
        model: provider.model
      })
      // 重新加载配置列表
      const result = await invoke('load_claude_providers')
      providers.value = result || []
      successMessage.value = `成功添加配置: ${provider.name}`
      return true
    } catch (err) {
      error.value = `添加配置失败: ${err.message || err}`
      console.error('添加配置失败:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切换配置
   */
  async function switchProvider(name) {
    if (!name || typeof name !== 'string') {
      error.value = '配置名称无效'
      return false
    }

    if (name === activeProvider.value) {
      return true // 已经是当前配置，无需切换
    }

    isLoading.value = true
    clearMessages()
    try {
      await invoke('switch_claude_provider', { providerName: name })
      // 重新加载配置列表
      const result = await invoke('load_claude_providers')
      providers.value = result || []
      const current = await invoke('get_current_claude_provider')
      activeProvider.value = current?.name || null
      successMessage.value = `成功切换到配置: ${name}`
      return true
    } catch (err) {
      error.value = `切换配置失败: ${err.message || err}`
      console.error('切换配置失败:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 删除配置
   */
  async function removeProvider(name) {
    if (!name || typeof name !== 'string') {
      error.value = '配置名称无效'
      return false
    }

    isLoading.value = true
    clearMessages()
    try {
      await invoke('remove_claude_provider', { providerName: name })
      // 重新加载配置列表
      const result = await invoke('load_claude_providers')
      providers.value = result || []

      // 如果删除的是激活配置，更新激活配置
      if (name === activeProvider.value) {
        const current = await invoke('get_current_claude_provider')
        activeProvider.value = current?.name || null
      }

      successMessage.value = `成功删除配置: ${name}`
      return true
    } catch (err) {
      error.value = `删除配置失败: ${err.message || err}`
      console.error('删除配置失败:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取当前配置
   */
  async function getCurrentProvider() {
    isLoading.value = true
    clearMessages()
    try {
      const result = await invoke('get_current_claude_provider')
      return result
    } catch (err) {
      error.value = `获取当前配置失败: ${err.message || err}`
      console.error('获取当前配置失败:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重新加载配置
   */
  async function refreshProviders() {
    return loadProviders()
  }

  // ==================== URL 验证 ====================
  function isValidUrl(url) {
    try {
      // 简单的 URL 验证（浏览器兼容）
      return (
        typeof url === 'string' &&
        (url.startsWith('http://') || url.startsWith('https://')) &&
        url.length > 10
      )
    } catch {
      return false
    }
  }

  // ==================== 返回接口 ====================
  return {
    // 状态
    providers,
    activeProvider,
    isLoading,
    error,
    successMessage,

    // 计算属性
    hasProviders,
    currentProvider,
    providersList,

    // 方法
    loadProviders,
    addProvider,
    switchProvider,
    removeProvider,
    getCurrentProvider,
    refreshProviders,

    // 消息管理
    clearMessages,
    clearError,
    clearSuccess
  }
})

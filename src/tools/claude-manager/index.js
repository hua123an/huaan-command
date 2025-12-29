/**
 * Claude Code 配置管理工具 - 入口模块
 * 提供统一的 API 接口
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 调用 Tauri 后端命令
 * @param {string} command - 命令名称
 * @param {object} payload - 命令参数
 * @returns {Promise} 命令执行结果
 */
export async function invokeCommand(command, payload = {}) {
  try {
    const result = await invoke(command, payload)
    return result
  } catch (err) {
    console.error(`命令 ${command} 执行失败:`, err)
    throw new Error(err.message || `命令 ${command} 执行失败`)
  }
}

/**
 * 加载所有配置
 * @returns {Promise<Array>}
 */
export async function loadProviders() {
  return invokeCommand('load_claude_providers')
}

/**
 * 添加新配置
 * @param {object} provider - 配置对象 {name, baseUrl, apiKey, model}
 * @returns {Promise<void>}
 */
export async function addProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('配置对象无效')
  }

  return invokeCommand('add_claude_provider', {
    name: provider.name,
    base_url: provider.baseUrl,
    api_key: provider.apiKey,
    model: provider.model
  })
}

/**
 * 切换配置
 * @param {string} name - 配置名称
 * @returns {Promise<void>}
 */
export async function switchProvider(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('配置名称无效')
  }

  return invokeCommand('switch_claude_provider', { provider_name: name })
}

/**
 * 删除配置
 * @param {string} name - 配置名称
 * @returns {Promise<void>}
 */
export async function removeProvider(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('配置名称无效')
  }

  return invokeCommand('remove_claude_provider', { provider_name: name })
}

/**
 * 获取当前配置
 * @returns {Promise<object>} 当前激活的配置
 */
export async function getCurrentProvider() {
  return invokeCommand('get_current_claude_provider')
}

/**
 * 验证 API Key
 * @param {string} apiKey - API Key
 * @returns {Promise<boolean>} 验证结果
 */
export async function validateApiKey(apiKey) {
  return invokeCommand('validate_claude_api_key', { api_key: apiKey })
}

export default {
  invokeCommand,
  loadProviders,
  addProvider,
  switchProvider,
  removeProvider,
  getCurrentProvider,
  validateApiKey
}

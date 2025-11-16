/**
 * Claude Code 配置管理 - 常量定义
 * 统一管理所有常量值
 */

// ==================== 文件路径常量 ====================
export const CLAUDE_CONFIG_DIR = '~/.claude'
export const CONFIG_FILE = '~/.claude/model-switcher.json'
export const SETTINGS_FILE = '~/.claude/settings.json'
export const KEY_FILE = '~/.claude/.key'

// ==================== 配置常量 ====================
export const DEFAULT_PROVIDER = {
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  createdAt: null
}

// ==================== 验证常量 ====================
export const VALIDATION = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  API_KEY_MIN_LENGTH: 8,
  MODEL_MIN_LENGTH: 1,
  MODEL_MAX_LENGTH: 100,
  URL_MIN_LENGTH: 10
}

// ==================== UI 常量 ====================
export const API_KEY_DISPLAY_LENGTH = {
  PREFIX: 4,
  SUFFIX: 4
}

// ==================== 消息常量 ====================
export const MESSAGES = {
  // 成功消息
  ADD_SUCCESS: '✓ 成功添加配置',
  SWITCH_SUCCESS: '✓ 成功切换配置',
  REMOVE_SUCCESS: '✓ 成功删除配置',
  LOAD_SUCCESS: '✓ 成功加载配置',

  // 错误消息
  ADD_FAILED: '✗ 添加配置失败',
  SWITCH_FAILED: '✗ 切换配置失败',
  REMOVE_FAILED: '✗ 删除配置失败',
  LOAD_FAILED: '✗ 加载配置失败',
  VALIDATION_FAILED: '✗ 验证失败',

  // 信息消息
  LOADING: '⏳ 加载中...',
  SAVING: '⏳ 保存中...',
  NO_PROVIDERS: '还没有配置，请先添加一个'
}

// ==================== 服务商预设 ====================
export const PROVIDER_PRESETS = {
  anthropic: {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-5-20250929'
  },
  azure: {
    name: 'azure',
    baseUrl: 'https://your-resource.openai.azure.com/v1',
    model: 'your-deployment-name'
  },
  openai: {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4'
  }
}

// ==================== API 常量 ====================
export const API = {
  TIMEOUT: 5000, // 5秒超时
  RETRY_COUNT: 3, // 重试次数
  RETRY_DELAY: 1000 // 重试延迟（毫秒）
}

// ==================== UI 状态 ====================
export const TABS = {
  LIST: 'list',
  ADD: 'add',
  EDIT: 'edit'
}

export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

export default {
  CLAUDE_CONFIG_DIR,
  CONFIG_FILE,
  SETTINGS_FILE,
  KEY_FILE,
  DEFAULT_PROVIDER,
  VALIDATION,
  API_KEY_DISPLAY_LENGTH,
  MESSAGES,
  PROVIDER_PRESETS,
  API,
  TABS,
  STATUS
}

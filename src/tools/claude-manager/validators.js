/**
 * 输入验证模块
 * 提供配置验证和用户输入检查
 */

/**
 * 验证提供商配置
 * @param {object} provider - 配置对象
 * @returns {object} {valid: boolean, errors: string[]}
 */
export function validateProvider(provider) {
  const errors = []

  if (!provider) {
    errors.push('配置对象不能为空')
    return { valid: false, errors }
  }

  // 验证配置名称
  if (!provider.name) {
    errors.push('配置名称必填')
  } else if (typeof provider.name !== 'string') {
    errors.push('配置名称必须是字符串')
  } else if (provider.name.length < 1 || provider.name.length > 50) {
    errors.push('配置名称长度必须在 1-50 字符之间')
  } else if (!/^[\w\u4e00-\u9fff-]+$/.test(provider.name)) {
    errors.push('配置名称只能包含字母、数字、下划线、连字符和中文')
  }

  // 验证 API Base URL
  if (!provider.baseUrl) {
    errors.push('API Base URL 必填')
  } else if (typeof provider.baseUrl !== 'string') {
    errors.push('API Base URL 必须是字符串')
  } else if (!isValidUrl(provider.baseUrl)) {
    errors.push('API Base URL 格式无效 (必须以 http:// 或 https:// 开头)')
  }

  // 验证 API Key
  if (!provider.apiKey) {
    errors.push('API Key 必填')
  } else if (typeof provider.apiKey !== 'string') {
    errors.push('API Key 必须是字符串')
  } else if (provider.apiKey.length < 8) {
    errors.push('API Key 长度至少 8 个字符')
  }

  // 验证模型名称
  if (!provider.model) {
    errors.push('模型名称必填')
  } else if (typeof provider.model !== 'string') {
    errors.push('模型名称必须是字符串')
  } else if (provider.model.length < 1 || provider.model.length > 100) {
    errors.push('模型名称长度必须在 1-100 字符之间')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证 URL 格式
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false
  }

  return (
    (url.startsWith('http://') || url.startsWith('https://')) &&
    url.length > 10 &&
    !url.includes(' ')
  )
}

/**
 * 验证 API Key 格式
 * @param {string} key - API Key
 * @returns {boolean}
 */
export function isValidApiKey(key) {
  if (typeof key !== 'string') {
    return false
  }

  // 不能为空且长度至少 8
  return key.length >= 8 && !/\s/.test(key)
}

/**
 * 验证配置名称
 * @param {string} name - 配置名称
 * @returns {boolean}
 */
export function isValidName(name) {
  if (typeof name !== 'string') {
    return false
  }

  // 允许字母、数字、下划线、连字符、中文
  return /^[\w\u4e00-\u9fff-]+$/.test(name) && name.length > 0 && name.length <= 50
}

/**
 * 验证模型名称
 * @param {string} model - 模型名称
 * @returns {boolean}
 */
export function isValidModel(model) {
  if (typeof model !== 'string') {
    return false
  }

  return model.length > 0 && model.length <= 100
}

/**
 * 检查提供商名称是否已存在
 * @param {string} name - 配置名称
 * @param {array} providers - 现有配置列表
 * @returns {boolean}
 */
export function providerNameExists(name, providers) {
  return providers.some(p => p.name.toLowerCase() === name.toLowerCase())
}

export default {
  validateProvider,
  isValidUrl,
  isValidApiKey,
  isValidName,
  isValidModel,
  providerNameExists
}

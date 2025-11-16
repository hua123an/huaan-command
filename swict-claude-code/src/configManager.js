/**
 * 配置管理器模块
 * 统一管理所有配置操作，包括读取、保存、初始化等
 * 支持 API Key 加密存储
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {
  CLAUDE_CONFIG_DIR,
  CLAUDE_SETTINGS_FILE,
  SWITCHER_CONFIG_FILE,
  DEFAULT_PROVIDERS,
  DEFAULT_CLAUDE_SETTINGS,
  DEFAULT_SWITCHER_CONFIG,
  ENV_ANTHROPIC_AUTH_TOKEN,
  ENV_ANTHROPIC_BASE_URL,
  ENV_ANTHROPIC_API_KEY,
} = require('./constants');
const { logError } = require('./ui');

/**
 * 写入审计日志
 * @param {string} action - 操作类型 (add, remove, switch, etc.)
 * @param {string} details - 详细信息
 * @param {boolean} success - 是否成功
 */
function writeAuditLog(action, details, success = true) {
  try {
    const logFile = path.join(CLAUDE_CONFIG_DIR, 'audit.log');
    const timestamp = new Date().toISOString();
    const user = os.userInfo().username;
    const osInfo = `${os.platform()} ${os.release()}`;
    const status = success ? 'SUCCESS' : 'FAILED';
    const maskedDetails = details.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***MASKED***');

    const logEntry = `[${timestamp}] [${status}] [${action}] User: ${user} OS: ${osInfo} Details: ${maskedDetails}\n`;

    fs.appendFileSync(logFile, logEntry);

    // 限制日志文件大小 (10MB)
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size > 10 * 1024 * 1024) {
        // 读取最后1000行
        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.split('\n');
        const lastLines = lines.slice(-1000);
        fs.writeFileSync(logFile, lastLines.join('\n'));
      }
    }
  } catch (err) {
    // 静默失败，不影响主流程
  }
}

/**
 * 生成或获取加密密钥（32字节，用于 AES-256）
 * @returns {Buffer} 32字节加密密钥
 */
function getEncryptionKey() {
  const ENCRYPTION_KEY_FILE = path.join(CLAUDE_CONFIG_DIR, '.key');

  // 1. 尝试从环境变量读取
  const envKey = process.env.CLAUDE_SWITCHER_KEY;
  if (envKey) {
    try {
      const buffer = Buffer.from(envKey, 'base64');
      if (buffer.length === 32) {
        return buffer;
      }
      return crypto.createHash('sha256').update(envKey).digest();
    } catch (err) {
      return crypto.createHash('sha256').update(envKey).digest();
    }
  }

  // 2. 从密钥文件读取
  if (fs.existsSync(ENCRYPTION_KEY_FILE)) {
    try {
      const keyData = fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
      const buffer = Buffer.from(keyData, 'base64');
      if (buffer.length === 32) {
        fs.chmodSync(ENCRYPTION_KEY_FILE, 0o600);
        return buffer;
      }
    } catch (err) {
      logError('读取加密密钥失败，将重新生成');
    }
  }

  // 3. 生成新密钥
  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(ENCRYPTION_KEY_FILE, newKey.toString('base64'), 'utf-8');
    fs.chmodSync(ENCRYPTION_KEY_FILE, 0o600);
  } catch (err) {
    logError('保存加密密钥失败', err);
  }

  return newKey;
}

/**
 * 使用 AES-256-GCM 加密文本
 * @param {string} text - 要加密的明文
 * @returns {string} 加密后的字符串
 */
function encryptText(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密文本
 * @param {string} encryptedText - 加密的字符串
 * @returns {string} 解密后的明文
 */
function decryptText(encryptedText) {
  try {
    const key = getEncryptionKey();

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('无效的加密数据格式');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    throw new Error('解密失败: ' + err.message);
  }
}

/**
 * 初始化配置目录
 * 确保 .claude 目录存在
 */
function ensureConfigDir() {
  try {
    if (!fs.existsSync(CLAUDE_CONFIG_DIR)) {
      fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
      return { success: true };
    }
    return { success: true };
  } catch (err) {
    logError(`创建配置目录失败: ${err.message}`);
    return { success: false, error: err };
  }
}

/**
 * 读取切换器配置文件
 * @returns {Object} 配置对象
 */
function loadSwitcherConfig() {
  try {
    if (fs.existsSync(SWITCHER_CONFIG_FILE)) {
      const configData = fs.readFileSync(SWITCHER_CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      return {
        success: true,
        data: config,
      };
    }
    return {
      success: true,
      data: DEFAULT_SWITCHER_CONFIG,
    };
  } catch (err) {
    logError(`读取配置文件失败: ${err.message}`);
    return {
      success: false,
      error: err,
      data: DEFAULT_SWITCHER_CONFIG,
    };
  }
}

/**
 * 保存切换器配置文件
 * @param {Object} config - 配置对象
 * @returns {Object} 操作结果
 */
function saveSwitcherConfig(config) {
  try {
    if (!config || typeof config !== 'object') {
      throw new Error('配置对象无效');
    }

    fs.writeFileSync(
      SWITCHER_CONFIG_FILE,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    return { success: true };
  } catch (err) {
    logError(`保存配置文件失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 读取 Claude 设置文件
 * @returns {Object} 设置对象
 */
function loadClaudeSettings() {
  try {
    if (fs.existsSync(CLAUDE_SETTINGS_FILE)) {
      const settingsData = fs.readFileSync(CLAUDE_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(settingsData);
      return {
        success: true,
        data: settings,
      };
    }
    return {
      success: true,
      data: DEFAULT_CLAUDE_SETTINGS,
    };
  } catch (err) {
    logError(`读取 Claude 设置失败: ${err.message}`);
    return {
      success: false,
      error: err,
      data: DEFAULT_CLAUDE_SETTINGS,
    };
  }
}

/**
 * 保存 Claude 设置文件
 * @param {Object} settings - 设置对象
 * @returns {Object} 操作结果
 */
function saveClaudeSettings(settings) {
  try {
    if (!settings || typeof settings !== 'object') {
      throw new Error('设置对象无效');
    }

    fs.writeFileSync(
      CLAUDE_SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );

    return { success: true };
  } catch (err) {
    logError(`保存 Claude 设置失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 添加新的服务商配置
 * @param {string} name - 服务商名称
 * @param {string} baseUrl - API Base URL
 * @param {string} apiKey - API Key
 * @param {string} model - 模型名称（可选）
 * @returns {Object} 操作结果
 */
function addProvider(name, baseUrl, apiKey, model = null) {
  try {
    // 加载现有配置
    const configResult = loadSwitcherConfig();
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;

    // 检查服务商是否已存在
    if (config.providers.some(p => p.name === name)) {
      return {
        success: false,
        error: new Error(`服务商 "${name}" 已存在`),
      };
    }

    // 添加新服务商
    const newProvider = {
      name,
      baseUrl: baseUrl.trim(),
      apiKey: encryptText(apiKey.trim()),  // 加密存储 API Key
      model: model ? model.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    // 移除 undefined 值
    if (!newProvider.model) {
      delete newProvider.model;
    }

    config.providers.push(newProvider);

    // 保存配置
    const saveResult = saveSwitcherConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      data: newProvider,
    };
  } catch (err) {
    logError(`添加服务商失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 删除服务商配置
 * @param {string} name - 服务商名称
 * @returns {Object} 操作结果
 */
function removeProvider(name) {
  try {
    // 加载现有配置
    const configResult = loadSwitcherConfig();
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;

    // 查找服务商
    const index = config.providers.findIndex(p => p.name === name);

    if (index === -1) {
      return {
        success: false,
        error: new Error(`找不到服务商 "${name}"`),
      };
    }

    // 删除服务商
    const deletedProvider = config.providers.splice(index, 1)[0];

    // 保存配置
    const saveResult = saveSwitcherConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      data: deletedProvider,
    };
  } catch (err) {
    logError(`删除服务商失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 根据名称查找服务商
 * @param {string} name - 服务商名称
 * @returns {Object} 查找结果
 */
function findProviderByName(name) {
  try {
    const configResult = loadSwitcherConfig();
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;
    const provider = config.providers.find(p => p.name === name);

    if (!provider) {
      return {
        success: false,
        error: new Error(`找不到服务商 "${name}"`),
      };
    }

    return {
      success: true,
      data: provider,
    };
  } catch (err) {
    logError(`查找服务商失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 获取所有服务商列表
 * @returns {Object} 包含服务商列表的结果
 */
function getAllProviders() {
  try {
    const configResult = loadSwitcherConfig();
    if (!configResult.success) {
      return configResult;
    }

    return {
      success: true,
      data: configResult.data.providers,
    };
  } catch (err) {
    logError(`获取服务商列表失败: ${err.message}`);
    return {
      success: false,
      error: err,
      data: [],
    };
  }
}

/**
 * 切换到指定的服务商配置
 * @param {Object} provider - 服务商对象
 * @returns {Object} 操作结果
 */
function switchToProvider(provider) {
  try {
    if (!provider || !provider.name || !provider.apiKey || !provider.baseUrl) {
      return {
        success: false,
        error: new Error('服务商对象无效'),
      };
    }

    // 解密 API Key（如果它是加密的）
    let decryptedApiKey;
    try {
      decryptedApiKey = decryptText(provider.apiKey);
    } catch (err) {
      // 如果解密失败，可能是旧版本的明文存储，尝试直接使用
      decryptedApiKey = provider.apiKey;
    }

    // 读取当前设置
    const settingsResult = loadClaudeSettings();
    if (!settingsResult.success) {
      return settingsResult;
    }

    const claudeSettings = settingsResult.data;

    // 初始化 env 字段（Claude Code 需要的格式）
    if (!claudeSettings.env) {
      claudeSettings.env = {};
    }

    // 设置环境变量（使用正确的环境变量名）
    claudeSettings.env[ENV_ANTHROPIC_AUTH_TOKEN] = decryptedApiKey;
    claudeSettings.env[ENV_ANTHROPIC_BASE_URL] = provider.baseUrl;

    // 向后兼容：同时保留旧格式
    claudeSettings[ENV_ANTHROPIC_API_KEY] = decryptedApiKey;
    claudeSettings[ENV_ANTHROPIC_BASE_URL] = provider.baseUrl;

    // 设置活动提供商
    claudeSettings.activeProvider = provider.name;

    // 如果有模型字段，也保存
    if (provider.model) {
      claudeSettings.model = provider.model;
    }

    // 保存设置
    const saveResult = saveClaudeSettings(claudeSettings);
    if (!saveResult.success) {
      return saveResult;
    }

    // 同时设置当前进程的环境变量
    process.env[ENV_ANTHROPIC_AUTH_TOKEN] = decryptedApiKey;
    process.env[ENV_ANTHROPIC_BASE_URL] = provider.baseUrl;

    return {
      success: true,
      data: {
        providerName: provider.name,
        baseUrl: provider.baseUrl,
        model: provider.model,
      },
    };
  } catch (err) {
    logError(`切换配置失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 获取当前激活的配置信息
 * @returns {Object} 当前配置信息
 */
function getCurrentConfig() {
  try {
    const settingsResult = loadClaudeSettings();
    if (!settingsResult.success) {
      return settingsResult;
    }

    const claudeSettings = settingsResult.data;

    // 获取活动提供商
    const activeProviderName = claudeSettings.activeProvider;

    if (!activeProviderName) {
      return {
        success: true,
        data: {
          hasActiveProvider: false,
        },
      };
    }

    // 查找对应的服务商配置
    const providerResult = findProviderByName(activeProviderName);
    if (!providerResult.success) {
      return {
        success: true,
        data: {
          hasActiveProvider: true,
          activeProviderName,
          exists: false,
        },
      };
    }

    // 优先从 env 字段读取，向后兼容
    const apiKey = (claudeSettings.env && claudeSettings.env[ENV_ANTHROPIC_AUTH_TOKEN])
      || claudeSettings[ENV_ANTHROPIC_API_KEY]
      || claudeSettings[ENV_ANTHROPIC_AUTH_TOKEN];

    // 解密 API Key（如果它是加密的）
    let decryptedApiKey = apiKey;
    if (decryptedApiKey && typeof decryptedApiKey === 'string' && decryptedApiKey.includes(':')) {
      try {
        decryptedApiKey = decryptText(decryptedApiKey);
      } catch (err) {
        // 如果解密失败，保留原值
      }
    }

    const baseUrl = (claudeSettings.env && claudeSettings.env[ENV_ANTHROPIC_BASE_URL])
      || claudeSettings[ENV_ANTHROPIC_BASE_URL];

    return {
      success: true,
      data: {
        hasActiveProvider: true,
        activeProviderName,
        exists: true,
        provider: providerResult.data,
        apiKey: decryptedApiKey,
        baseUrl,
        model: claudeSettings.model,
      },
    };
  } catch (err) {
    logError(`获取当前配置失败: ${err.message}`);
    return {
      success: false,
      error: err,
      data: {
        hasActiveProvider: false,
      },
    };
  }
}

/**
 * 获取 API 连接的环境变量
 * @param {Object} claudeSettings - Claude 设置对象
 * @returns {Object} 环境变量对象
 */
function getApiEnvVars(claudeSettings) {
  try {
    // 优先从 env 字段读取，向后兼容
    const apiKey = (claudeSettings.env && claudeSettings.env[ENV_ANTHROPIC_AUTH_TOKEN])
      || claudeSettings[ENV_ANTHROPIC_API_KEY]
      || claudeSettings[ENV_ANTHROPIC_AUTH_TOKEN];

    const baseUrl = (claudeSettings.env && claudeSettings.env[ENV_ANTHROPIC_BASE_URL])
      || claudeSettings[ENV_ANTHROPIC_BASE_URL];

    return {
      success: true,
      data: {
        apiKey,
        baseUrl,
      },
    };
  } catch (err) {
    logError(`获取环境变量失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 更新服务商配置
 * @param {string} name - 服务商名称
 * @param {Object} updates - 要更新的字段对象 {baseUrl?, apiKey?, model?}
 * @returns {Object} 操作结果
 */
function updateProvider(name, updates) {
  try {
    if (!updates || typeof updates !== 'object') {
      return {
        success: false,
        error: new Error('更新对象无效'),
      };
    }

    // 加载现有配置
    const configResult = loadSwitcherConfig();
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;

    // 查找服务商
    const index = config.providers.findIndex(p => p.name === name);
    if (index === -1) {
      return {
        success: false,
        error: new Error(`找不到服务商 "${name}"`),
      };
    }

    const provider = config.providers[index];

    // 更新字段
    if (updates.baseUrl !== undefined) {
      provider.baseUrl = updates.baseUrl.trim();
    }
    if (updates.apiKey !== undefined) {
      provider.apiKey = encryptText(updates.apiKey.trim());
    }
    if (updates.model !== undefined) {
      if (updates.model) {
        provider.model = updates.model.trim();
      } else {
        delete provider.model;
      }
    }

    // 保存配置
    const saveResult = saveSwitcherConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      data: provider,
    };
  } catch (err) {
    logError(`更新服务商失败: ${err.message}`);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 生成配置文件的SHA-256哈希值
 * @param {string} filePath - 文件路径
 * @returns {string|null} 哈希值或null
 */
function generateFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha-256').update(content).digest('hex');
  } catch (err) {
    logError('生成文件哈希失败', err);
    return null;
  }
}

/**
 * 保存配置文件哈希值
 * @param {string} configFilePath - 配置文件路径
 * @param {string} hash - 哈希值
 */
function saveConfigHash(configFilePath, hash) {
  try {
    const hashFile = configFilePath + '.hash';
    fs.writeFileSync(hashFile, hash, 'utf-8');
  } catch (err) {
    logError('保存配置哈希失败', err);
  }
}

/**
 * 读取配置文件哈希值
 * @param {string} configFilePath - 配置文件路径
 * @returns {string|null} 哈希值或null
 */
function loadConfigHash(configFilePath) {
  try {
    const hashFile = configFilePath + '.hash';
    if (!fs.existsSync(hashFile)) {
      return null;
    }
    return fs.readFileSync(hashFile, 'utf-8').trim();
  } catch (err) {
    logError('读取配置哈希失败', err);
    return null;
  }
}

/**
 * 验证配置文件完整性
 * @param {string} configFilePath - 配置文件路径
 * @returns {Object} 验证结果
 */
function verifyConfigIntegrity(configFilePath) {
  try {
    const result = {
      isValid: true,
      isTampered: false,
      currentHash: null,
      storedHash: null,
      message: '配置文件完整性正常'
    };

    // 如果配置文件不存在，认为是有效的
    if (!fs.existsSync(configFilePath)) {
      result.message = '配置文件不存在';
      return result;
    }

    // 生成当前哈希
    result.currentHash = generateFileHash(configFilePath);
    if (!result.currentHash) {
      result.isValid = false;
      result.message = '无法生成配置文件哈希';
      return result;
    }

    // 读取存储的哈希
    result.storedHash = loadConfigHash(configFilePath);
    
    // 如果没有存储的哈希，这是第一次验证
    if (!result.storedHash) {
      result.message = '首次验证，将保存哈希值';
      saveConfigHash(configFilePath, result.currentHash);
      return result;
    }

    // 比较哈希值
    if (result.currentHash !== result.storedHash) {
      result.isTampered = true;
      result.isValid = false;
      result.message = '配置文件可能已被篡改';
    }

    return result;
  } catch (err) {
    return {
      isValid: false,
      isTampered: false,
      currentHash: null,
      storedHash: null,
      message: `验证过程出错: ${err.message}`
    };
  }
}

/**
 * 修复配置文件完整性
 * @param {string} configFilePath - 配置文件路径
 * @returns {Object} 修复结果
 */
function repairConfigIntegrity(configFilePath) {
  try {
    const result = {
      success: false,
      message: '',
      backupCreated: false
    };

    // 验证当前状态
    const verification = verifyConfigIntegrity(configFilePath);
    
    if (verification.isValid && !verification.isTampered) {
      result.success = true;
      result.message = '配置文件完整性正常，无需修复';
      return result;
    }

    // 如果配置文件不存在
    if (!fs.existsSync(configFilePath)) {
      result.success = true;
      result.message = '配置文件不存在，无需修复';
      return result;
    }

    // 创建备份
    const backupPath = configFilePath + '.backup.' + Date.now();
    try {
      fs.copyFileSync(configFilePath, backupPath);
      result.backupCreated = true;
    } catch (err) {
      logError('创建配置备份失败', err);
    }

    // 如果文件被篡改，更新哈希值（用户确认后的操作）
    if (verification.isTampered) {
      const currentHash = generateFileHash(configFilePath);
      if (currentHash) {
        saveConfigHash(configFilePath, currentHash);
        result.success = true;
        result.message = '已更新配置文件哈希值';
        if (result.backupCreated) {
          result.message += `，备份已保存至: ${backupPath}`;
        }
      } else {
        result.message = '无法生成新的哈希值';
      }
    } else {
      result.message = '未知的完整性问题';
    }

    return result;
  } catch (err) {
    return {
      success: false,
      message: `修复过程出错: ${err.message}`,
      backupCreated: false
    };
  }
}

/**
 * 在保存配置时更新完整性校验
 * @param {string} configFilePath - 配置文件路径
 * @param {Object} config - 配置对象
 * @returns {Object} 保存结果
 */
function saveConfigWithIntegrity(configFilePath, config) {
  try {
    // 保存配置文件
    const configJson = JSON.stringify(config, null, 2);
    fs.writeFileSync(configFilePath, configJson, 'utf-8');
    
    // 设置文件权限为600（仅所有者可读写）
    fs.chmodSync(configFilePath, 0o600);
    
    // 生成并保存哈希值
    const hash = generateFileHash(configFilePath);
    if (hash) {
      saveConfigHash(configFilePath, hash);
    }
    
    return {
      success: true,
      message: '配置文件保存成功'
    };
  } catch (err) {
    logError('保存配置文件失败', err);
    return {
      success: false,
      message: `保存失败: ${err.message}`
    };
  }
}

module.exports = {
  ensureConfigDir,
  loadSwitcherConfig,
  saveSwitcherConfig,
  loadClaudeSettings,
  saveClaudeSettings,
  addProvider,
  removeProvider,
  updateProvider,
  findProviderByName,
  getAllProviders,
  switchToProvider,
  getCurrentConfig,
  getApiEnvVars,
  generateFileHash,
  saveConfigHash,
  loadConfigHash,
  verifyConfigIntegrity,
  repairConfigIntegrity,
  saveConfigWithIntegrity,
};

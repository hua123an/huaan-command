/**
 * 验证器模块
 * 统一处理所有输入验证逻辑，确保数据完整性和正确性
 */

const {
  PROVIDER_NAME_MIN_LENGTH,
  BASE_URL_MIN_LENGTH,
  API_KEY_MIN_LENGTH,
  CONFIRM_DELETE_KEYWORDS,
} = require('./constants');

/**
 * 验证服务商名称
 * @param {string} name - 服务商名称
 * @returns {Object} 验证结果
 */
function validateProviderName(name) {
  try {
    // 检查是否为字符串
    if (typeof name !== 'string') {
      return {
        isValid: false,
        error: '服务商名称必须是字符串',
      };
    }

    // 检查是否为空或只包含空白字符
    const trimmedName = name.trim();
    if (!trimmedName) {
      return {
        isValid: false,
        error: '服务商名称不能为空',
      };
    }

    // 检查长度
    if (trimmedName.length < PROVIDER_NAME_MIN_LENGTH) {
      return {
        isValid: false,
        error: `服务商名称长度不能小于 ${PROVIDER_NAME_MIN_LENGTH} 个字符`,
      };
    }

    // 检查是否包含非法字符（可选，根据需要添加）
    const illegalChars = /[<>:"/\\|?*]/;
    if (illegalChars.test(trimmedName)) {
      return {
        isValid: false,
        error: '服务商名称不能包含特殊字符: < > : " / \\ | ? *',
      };
    }

    return {
      isValid: true,
      data: trimmedName,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证服务商名称时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证 Base URL
 * @param {string} baseUrl - Base URL
 * @returns {Object} 验证结果
 */
function validateBaseUrl(baseUrl) {
  try {
    // 检查是否为字符串
    if (typeof baseUrl !== 'string') {
      return {
        isValid: false,
        error: 'Base URL 必须是字符串',
      };
    }

    // 检查是否为空或只包含空白字符
    const trimmedUrl = baseUrl.trim();
    if (!trimmedUrl) {
      return {
        isValid: false,
        error: 'Base URL 不能为空',
      };
    }

    // 检查长度
    if (trimmedUrl.length < BASE_URL_MIN_LENGTH) {
      return {
        isValid: false,
        error: `Base URL 长度不能小于 ${BASE_URL_MIN_LENGTH} 个字符`,
      };
    }

    // 检查是否为有效的 URL 格式
    try {
      // 尝试创建 URL 对象来验证格式
      // 注意：允许不带协议头的 URL
      let urlToTest = trimmedUrl;
      if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
        urlToTest = 'https://' + urlToTest;
      }

      new URL(urlToTest);
    } catch (urlError) {
      return {
        isValid: false,
        error: 'Base URL 格式无效（应为有效的 URL，例如: https://api.example.com）',
      };
    }

    return {
      isValid: true,
      data: trimmedUrl,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证 Base URL 时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证 API Key
 * @param {string} apiKey - API Key
 * @returns {Object} 验证结果
 */
function validateApiKey(apiKey) {
  try {
    // 检查是否为字符串
    if (typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'API Key 必须是字符串',
      };
    }

    // 检查是否为空或只包含空白字符
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return {
        isValid: false,
        error: 'API Key 不能为空',
      };
    }

    // 检查长度
    if (trimmedKey.length < API_KEY_MIN_LENGTH) {
      return {
        isValid: false,
        error: `API Key 长度不能小于 ${API_KEY_MIN_LENGTH} 个字符`,
      };
    }

    // 检查是否包含明显的非法字符（可选）
    const trimmed = trimmedKey.replace(/\s/g, ''); // 移除所有空白字符
    if (trimmed.includes('<') || trimmed.includes('>')) {
      return {
        isValid: false,
        error: 'API Key 不能包含 < 或 > 字符',
      };
    }

    return {
      isValid: true,
      data: trimmedKey,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证 API Key 时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证模型名称（可选）
 * @param {string} model - 模型名称
 * @returns {Object} 验证结果
 */
function validateModel(model) {
  try {
    // 如果为空或未提供，返回有效（模型是可选的）
    if (!model || !model.trim()) {
      return {
        isValid: true,
        data: null,
      };
    }

    const trimmedModel = model.trim();

    // 检查长度（防止过长的模型名称）
    if (trimmedModel.length > 100) {
      return {
        isValid: false,
        error: '模型名称过长（不能超过 100 个字符）',
      };
    }

    return {
      isValid: true,
      data: trimmedModel,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证模型名称时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证完整的提供商配置
 * @param {Object} provider - 提供商配置对象
 * @returns {Object} 验证结果
 */
function validateProvider(provider) {
  try {
    // 检查是否为对象
    if (!provider || typeof provider !== 'object') {
      return {
        isValid: false,
        error: '提供商配置必须是对象',
      };
    }

    // 验证必需字段
    const nameValidation = validateProviderName(provider.name);
    if (!nameValidation.isValid) {
      return nameValidation;
    }

    const baseUrlValidation = validateBaseUrl(provider.baseUrl);
    if (!baseUrlValidation.isValid) {
      return baseUrlValidation;
    }

    const apiKeyValidation = validateApiKey(provider.apiKey);
    if (!apiKeyValidation.isValid) {
      return apiKeyValidation;
    }

    // 验证可选字段
    const modelValidation = validateModel(provider.model);
    if (!modelValidation.isValid) {
      return modelValidation;
    }

    // 返回验证通过的结果
    return {
      isValid: true,
      data: {
        name: nameValidation.data,
        baseUrl: baseUrlValidation.data,
        apiKey: apiKeyValidation.data,
        model: modelValidation.data,
      },
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证提供商配置时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证删除确认输入
 * @param {string} input - 用户输入
 * @returns {Object} 验证结果
 */
function validateDeleteConfirmation(input) {
  try {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: '请输入确认信息',
      };
    }

    const trimmedInput = input.trim().toLowerCase();

    if (CONFIRM_DELETE_KEYWORDS.includes(trimmedInput)) {
      return {
        isValid: true,
        data: true,
      };
    }

    return {
      isValid: false,
      error: '已取消删除',
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证删除确认时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证菜单选择
 * @param {string} choice - 菜单选择
 * @param {Array} validOptions - 有效选项列表
 * @returns {Object} 验证结果
 */
function validateMenuChoice(choice, validOptions = []) {
  try {
    if (typeof choice !== 'string') {
      return {
        isValid: false,
        error: '菜单选择必须是字符串',
      };
    }

    const trimmedChoice = choice.trim();

    // 检查是否在有效选项中
    if (validOptions.length > 0 && !validOptions.includes(trimmedChoice)) {
      return {
        isValid: false,
        error: `无效的选择，请选择: ${validOptions.join(', ')}`,
      };
    }

    return {
      isValid: true,
      data: trimmedChoice,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证菜单选择时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证数字选择
 * @param {string} input - 用户输入
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @returns {Object} 验证结果
 */
function validateNumericChoice(input, min = 1, max = 999) {
  try {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: '请输入一个数字',
      };
    }

    const trimmedInput = input.trim();
    const number = parseInt(trimmedInput, 10);

    // 检查是否为有效数字
    if (isNaN(number)) {
      return {
        isValid: false,
        error: '请输入有效的数字',
      };
    }

    // 检查范围
    if (number < min || number > max) {
      return {
        isValid: false,
        error: `请输入 ${min} 到 ${max} 之间的数字`,
      };
    }

    return {
      isValid: true,
      data: number,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证数字选择时发生错误: ${err.message}`,
    };
  }
}

/**
 * 验证布尔值选择
 * @param {string} input - 用户输入
 * @param {Array} trueValues - 代表 true 的值
 * @param {Array} falseValues - 代表 false 的值
 * @returns {Object} 验证结果
 */
function validateBooleanChoice(input, trueValues = ['y', 'yes'], falseValues = ['n', 'no']) {
  try {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: '请输入 y 或 n',
      };
    }

    const trimmedInput = input.trim().toLowerCase();

    if (trueValues.includes(trimmedInput)) {
      return {
        isValid: true,
        data: true,
      };
    }

    if (falseValues.includes(trimmedInput)) {
      return {
        isValid: true,
        data: false,
      };
    }

    return {
      isValid: false,
      error: `请输入 ${[...trueValues, ...falseValues].join(' 或 ')}`,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `验证布尔选择时发生错误: ${err.message}`,
    };
  }
}

module.exports = {
  validateProviderName,
  validateBaseUrl,
  validateApiKey,
  validateModel,
  validateProvider,
  validateDeleteConfirmation,
  validateMenuChoice,
  validateNumericChoice,
  validateBooleanChoice,
};

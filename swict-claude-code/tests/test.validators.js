#!/usr/bin/env node

/**
 * 验证函数测试
 * 测试 URL、API Key、ProviderName 等验证逻辑
 */

const assert = global.assert || require('assert');

/**
 * 验证 URL 格式
 * @param {string} url - 要验证的 URL
 * @returns {boolean} - URL 是否有效
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * 验证 API Key 格式
 * @param {string} apiKey - 要验证的 API Key
 * @returns {boolean} - API Key 是否有效
 */
function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // API Key 不能为空且长度至少为 1
  if (apiKey.trim().length === 0) {
    return false;
  }

  // API Key 不能包含换行符
  if (apiKey.includes('\n') || apiKey.includes('\r')) {
    return false;
  }

  // API Key 不能包含空格（前后空格或中间空格都不允许）
  if (apiKey.includes(' ')) {
    return false;
  }

  return true;
}

/**
 * 验证提供商名称格式
 * @param {string} name - 要验证的提供商名称
 * @returns {boolean} - 名称是否有效
 */
function isValidProviderName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  // 不能为空
  if (trimmed.length === 0) {
    return false;
  }

  // 长度应在 1-50 字符之间
  if (trimmed.length > 50) {
    return false;
  }

  // 不能包含特殊字符（只允许字母、数字、连字符、下划线）
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return false;
  }

  // 不能以连字符或下划线开头或结尾
  if (trimmed.startsWith('-') || trimmed.startsWith('_') ||
      trimmed.endsWith('-') || trimmed.endsWith('_')) {
    return false;
  }

  return true;
}

/**
 * 验证配置文件完整性
 * @param {Object} config - 配置文件对象
 * @returns {boolean} - 配置是否有效
 */
function isValidConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!Array.isArray(config.providers)) {
    return false;
  }

  for (const provider of config.providers) {
    if (!provider.name || !provider.baseUrl || !provider.apiKey) {
      return false;
    }

    if (!isValidProviderName(provider.name)) {
      return false;
    }

    if (!isValidUrl(provider.baseUrl)) {
      return false;
    }

    if (!isValidApiKey(provider.apiKey)) {
      return false;
    }
  }

  return true;
}

/**
 * 测试 URL 验证 - 有效 URL
 */
function testValidUrls() {
  const validUrls = [
    'https://api.openai.com/v1',
    'http://localhost:3000',
    'https://api.anthropic.com/v1',
    'https://api.example.com:8080/v1',
    'https://sub.domain.example.com/api/v1'
  ];

  validUrls.forEach(url => {
    assert.strictEqual(isValidUrl(url), true, `${url} 应为有效 URL`);
  });
}

/**
 * 测试 URL 验证 - 无效 URL
 */
function testInvalidUrls() {
  const invalidUrls = [
    '',
    null,
    undefined,
    'not-a-url',
    'ftp://example.com',
    '://example.com',
    'https://',
    'just-text',
    'https://example.com spaces',
    123,
    {},
    []
  ];

  invalidUrls.forEach(url => {
    assert.strictEqual(isValidUrl(url), false, `${url} 应为无效 URL`);
  });
}

/**
 * 测试 URL 验证 - HTTP/HTTPS 协议检查
 */
function testUrlProtocolValidation() {
  assert.strictEqual(isValidUrl('http://example.com'), true, 'HTTP URL 应有效');
  assert.strictEqual(isValidUrl('https://example.com'), true, 'HTTPS URL 应有效');

  // 非 HTTP/HTTPS 协议应无效
  assert.strictEqual(isValidUrl('ftp://example.com'), false, 'FTP URL 应无效');
  assert.strictEqual(isValidUrl('file://example.com'), false, 'File URL 应无效');
}

/**
 * 测试 API Key 验证 - 有效 API Key
 */
function testValidApiKeys() {
  const validApiKeys = [
    'sk-1234567890abcdef',
    'test-api-key',
    'ANTHROPIC_API_KEY_123',
    'a'.repeat(100),
    'key-with-dashes-and-underscores',
    'ApiKey123456789'
  ];

  validApiKeys.forEach(apiKey => {
    assert.strictEqual(isValidApiKey(apiKey), true, `"${apiKey}" 应为有效 API Key`);
  });
}

/**
 * 测试 API Key 验证 - 无效 API Key
 */
function testInvalidApiKeys() {
  const invalidApiKeys = [
    '',
    '   ',
    '\t',
    '\n',
    ' ',
    null,
    undefined,
    'key with spaces',
    'key\nwith\nnewlines',
    'key\rwith\rcarriage',
    '   key with leading spaces   ',
    123,
    {},
    []
  ];

  invalidApiKeys.forEach(apiKey => {
    assert.strictEqual(isValidApiKey(apiKey), false, `${JSON.stringify(apiKey)} 应为无效 API Key`);
  });
}

/**
 * 测试提供商名称验证 - 有效名称
 */
function testValidProviderNames() {
  const validNames = [
    'openai',
    'azure',
    'anthropic',
    'provider123',
    'my_provider',
    'test-provider',
    'a',
    'x'.repeat(50),
    'provider_with_both',
    'provider-with-both'
  ];

  validNames.forEach(name => {
    assert.strictEqual(isValidProviderName(name), true, `"${name}" 应为有效提供商名称`);
  });
}

/**
 * 测试提供商名称验证 - 无效名称
 */
function testInvalidProviderNames() {
  const invalidNames = [
    '',
    '   ',
    null,
    undefined,
    'provider with spaces',
    'provider@with@at',
    'provider/with/slash',
    'provider.with.dot',
    'provider!with!exclamation',
    '-starts-with-dash',
    '_starts_with_underscore',
    'ends-with-dash-',
    'ends_with_underscore_',
    'x'.repeat(51), // 超过 50 字符
    'ProviderWithUpperCase', // 包含大写字母（可选限制）
    123,
    {},
    []
  ];

  invalidNames.forEach(name => {
    assert.strictEqual(isValidProviderName(name), false, `${JSON.stringify(name)} 应为无效提供商名称`);
  });
}

/**
 * 测试配置文件验证 - 有效配置
 */
function testValidConfig() {
  const validConfig = {
    providers: [
      {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-1234567890abcdef',
        createdAt: new Date().toISOString()
      },
      {
        name: 'azure',
        baseUrl: 'https://api.example.com',
        apiKey: 'azure-api-key',
        createdAt: new Date().toISOString()
      }
    ]
  };

  assert.strictEqual(isValidConfig(validConfig), true, '有效配置应通过验证');
}

/**
 * 测试配置文件验证 - 无效配置
 */
function testInvalidConfig() {
  // 配置为空
  assert.strictEqual(isValidConfig(null), false, 'null 配置应无效');
  assert.strictEqual(isValidConfig(undefined), false, 'undefined 配置应无效');
  assert.strictEqual(isValidConfig({}), false, '空对象配置应无效');
  assert.strictEqual(isValidConfig({ providers: [] }), false, '空 providers 数组应无效');

  // providers 不是数组
  assert.strictEqual(isValidConfig({ providers: 'not-array' }), false, '非数组 providers 应无效');

  // 提供商字段缺失
  assert.strictEqual(isValidConfig({
    providers: [{ name: 'test' }]
  }), false, '缺少 baseUrl 和 apiKey 的提供商应无效');

  assert.strictEqual(isValidConfig({
    providers: [{ baseUrl: 'https://test.com' }]
  }), false, '缺少 name 的提供商应无效');

  assert.strictEqual(isValidConfig({
    providers: [{ apiKey: 'key' }]
  }), false, '缺少 name 和 baseUrl 的提供商应无效');

  // 提供商数据无效
  assert.strictEqual(isValidConfig({
    providers: [{
      name: 'invalid name with spaces',
      baseUrl: 'https://test.com',
      apiKey: 'valid-key'
    }]
  }), false, '包含空格的服务商名称应无效');

  assert.strictEqual(isValidConfig({
    providers: [{
      name: 'valid-name',
      baseUrl: 'invalid-url',
      apiKey: 'valid-key'
    }]
  }), false, '无效 URL 的提供商应无效');

  assert.strictEqual(isValidConfig({
    providers: [{
      name: 'valid-name',
      baseUrl: 'https://test.com',
      apiKey: ''
    }]
  }), false, '空 API Key 的提供商应无效');
}

/**
 * 测试边界条件 - 极长字符串
 */
function testEdgeCaseLongStrings() {
  assert.strictEqual(isValidProviderName('x'.repeat(50)), true, '50 字符名称应有效');
  assert.strictEqual(isValidProviderName('x'.repeat(51)), false, '51 字符名称应无效');

  assert.strictEqual(isValidApiKey('x'.repeat(1000)), true, '1000 字符 API Key 应有效');
  assert.strictEqual(isValidUrl('https://example.com/' + 'x'.repeat(1000)), true, '超长 URL 应有效');
}

/**
 * 测试边界条件 - 特殊字符
 */
function testEdgeCaseSpecialCharacters() {
  assert.strictEqual(isValidProviderName('provider_123'), true, '包含下划线的名称应有效');
  assert.strictEqual(isValidProviderName('provider-123'), true, '包含连字符的名称应有效');
  assert.strictEqual(isValidProviderName('provider_123-test'), true, '包含下划线和连字符的名称应有效');

  assert.strictEqual(isValidApiKey('key!@#$%^&*()'), true, '包含特殊字符的 API Key 应有效');
}

/**
 * 测试数字和对象类型
 */
function testEdgeCaseTypes() {
  // 数字类型
  assert.strictEqual(isValidUrl(123), false, '数字类型 URL 应无效');
  assert.strictEqual(isValidApiKey(123), false, '数字类型 API Key 应无效');
  assert.strictEqual(isValidProviderName(123), false, '数字类型名称应无效');

  // 对象类型
  assert.strictEqual(isValidUrl({}), false, '对象类型 URL 应无效');
  assert.strictEqual(isValidApiKey({}), false, '对象类型 API Key 应无效');
  assert.strictEqual(isValidProviderName({}), false, '对象类型名称应无效');

  // 数组类型
  assert.strictEqual(isValidUrl([]), false, '数组类型 URL 应无效');
  assert.strictEqual(isValidApiKey([]), false, '数组类型 API Key 应无效');
  assert.strictEqual(isValidProviderName([]), false, '数组类型名称应无效');
}

// 导出所有测试函数
module.exports = {
  // 测试函数
  testValidUrls,
  testInvalidUrls,
  testUrlProtocolValidation,
  testValidApiKeys,
  testInvalidApiKeys,
  testValidProviderNames,
  testInvalidProviderNames,
  testValidConfig,
  testInvalidConfig,
  testEdgeCaseLongStrings,
  testEdgeCaseSpecialCharacters,
  testEdgeCaseTypes,

  // 验证函数
  isValidUrl,
  isValidApiKey,
  isValidProviderName,
  isValidConfig
};

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  const runner = require('./test-runner.js');
  const tests = module.exports;

  Object.entries(tests).forEach(([name, testFn]) => {
    if (typeof testFn === 'function' && name.startsWith('test')) {
      runner.runTest(name, testFn);
    }
  });
}

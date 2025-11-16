#!/usr/bin/env node

/**
 * 配置管理测试
 * 测试配置保存、加载、读取等操作
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 使用全局断言模块（由 test-runner.js 提供）
const assert = global.assert || require('assert');

// 测试配置目录和文件路径
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'ultrathink-test');
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'model-switcher.json');
const TEST_SETTINGS_FILE = path.join(TEST_CONFIG_DIR, 'settings.json');

/**
 * 创建测试目录
 */
function ensureConfigDir() {
  if (!fs.existsSync(TEST_CONFIG_DIR)) {
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  }
}

/**
 * 删除测试配置
 */
function cleanupTestConfig() {
  if (fs.existsSync(TEST_CONFIG_DIR)) {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
}

/**
 * 读取配置 - 模拟主程序中的函数
 */
function loadConfig() {
  try {
    if (fs.existsSync(TEST_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    throw new Error(`Error reading config: ${err.message}`);
  }
  return { providers: [] };
}

/**
 * 保存配置 - 模拟主程序中的函数
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(TEST_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Error saving config: ${err.message}`);
  }
}

/**
 * 读取 Claude settings - 模拟主程序中的函数
 */
function loadClaudeSettings() {
  try {
    if (fs.existsSync(TEST_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(TEST_SETTINGS_FILE, 'utf-8'));
    }
  } catch (err) {
    throw new Error(`Error reading Claude settings: ${err.message}`);
  }
  return {};
}

/**
 * 保存 Claude settings - 模拟主程序中的函数
 */
function saveClaudeSettings(settings) {
  try {
    fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Error saving Claude settings: ${err.message}`);
  }
}

/**
 * 测试加载空配置
 */
function testLoadEmptyConfig() {
  // 清理并确保配置目录存在
  cleanupTestConfig();
  ensureConfigDir();

  const config = loadConfig();

  assert.strictEqual(config.providers.length, 0, '空配置应包含空的 providers 数组');
  assert.deepStrictEqual(config, { providers: [] }, '空配置应返回 { providers: [] }');
}

/**
 * 测试保存和加载配置
 */
function testSaveAndLoadConfig() {
  cleanupTestConfig();
  ensureConfigDir();

  const testConfig = {
    providers: [
      {
        name: 'test-provider',
        baseUrl: 'https://test.example.com',
        apiKey: 'test-api-key-123',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveConfig(testConfig);
  const loadedConfig = loadConfig();

  assert.strictEqual(loadedConfig.providers.length, 1, '应加载一个提供商');
  assert.strictEqual(loadedConfig.providers[0].name, 'test-provider', '提供商名称应匹配');
  assert.strictEqual(loadedConfig.providers[0].baseUrl, 'https://test.example.com', 'Base URL 应匹配');
  assert.strictEqual(loadedConfig.providers[0].apiKey, 'test-api-key-123', 'API Key 应匹配');
}

/**
 * 测试保存多个提供商配置
 */
function testSaveMultipleProviders() {
  cleanupTestConfig();
  ensureConfigDir();

  const testConfig = {
    providers: [
      {
        name: 'provider1',
        baseUrl: 'https://api1.example.com',
        apiKey: 'key1',
        createdAt: new Date().toISOString()
      },
      {
        name: 'provider2',
        baseUrl: 'https://api2.example.com',
        apiKey: 'key2',
        createdAt: new Date().toISOString()
      },
      {
        name: 'provider3',
        baseUrl: 'https://api3.example.com',
        apiKey: 'key3',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveConfig(testConfig);
  const loadedConfig = loadConfig();

  assert.strictEqual(loadedConfig.providers.length, 3, '应加载三个提供商');
  assert.strictEqual(loadedConfig.providers[0].name, 'provider1', '第一个提供商名称应匹配');
  assert.strictEqual(loadedConfig.providers[2].name, 'provider3', '第三个提供商名称应匹配');
}

/**
 * 测试配置文件不存在时的处理
 */
function testConfigNotExists() {
  cleanupTestConfig();

  const config = loadConfig();

  assert.strictEqual(config.providers.length, 0, '不存在的配置文件应返回空配置');
}

/**
 * 测试读取不存在的 Claude settings
 */
function testClaudeSettingsNotExists() {
  cleanupTestConfig();

  const settings = loadClaudeSettings();

  assert.deepStrictEqual(settings, {}, '不存在的 settings 文件应返回空对象');
}

/**
 * 测试保存和读取 Claude settings
 */
function testSaveAndLoadClaudeSettings() {
  cleanupTestConfig();
  ensureConfigDir();

  const testSettings = {
    env: {
      ANTHROPIC_AUTH_TOKEN: 'test-token',
      ANTHROPIC_BASE_URL: 'https://test.example.com'
    },
    ANTHROPIC_API_KEY: 'test-token',
    ANTHROPIC_BASE_URL: 'https://test.example.com',
    activeProvider: 'test-provider',
    model: 'claude-3-sonnet'
  };

  saveClaudeSettings(testSettings);
  const loadedSettings = loadClaudeSettings();

  assert.strictEqual(loadedSettings.activeProvider, 'test-provider', 'activeProvider 应匹配');
  assert.strictEqual(loadedSettings.env.ANTHROPIC_AUTH_TOKEN, 'test-token', 'env.ANTHROPIC_AUTH_TOKEN 应匹配');
  assert.strictEqual(loadedSettings.ANTHROPIC_API_KEY, 'test-token', 'ANTHROPIC_API_KEY 应匹配');
  assert.strictEqual(loadedSettings.model, 'claude-3-sonnet', 'model 应匹配');
}

/**
 * 测试配置文件格式验证
 */
function testConfigFormatValidation() {
  cleanupTestConfig();
  ensureConfigDir();

  // 创建格式不正确的配置文件
  fs.writeFileSync(TEST_CONFIG_FILE, '{ invalid json }', 'utf-8');

  try {
    loadConfig();
    assert.fail('应抛出解析错误');
  } catch (error) {
    assert.ok(error.message.includes('Error reading config'), '错误消息应包含 "Error reading config"');
  }
}

/**
 * 测试配置文件权限错误
 */
function testConfigPermissionError() {
  cleanupTestConfig();
  ensureConfigDir();

  const testConfig = { providers: [] };
  saveConfig(testConfig);

  // 使配置文件不可读
  try {
    fs.chmodSync(TEST_CONFIG_FILE, 0o000);

    try {
      loadConfig();
      assert.fail('应抛出权限错误');
    } catch (error) {
      assert.ok(error.message.includes('Error reading config'), '应抛出配置读取错误');
    }
  } finally {
    // 恢复权限以便清理
    try {
      fs.chmodSync(TEST_CONFIG_FILE, 0o644);
    } catch (e) {
      // 忽略清理错误
    }
  }
}

/**
 * 测试大配置文件处理
 */
function testLargeConfig() {
  cleanupTestConfig();
  ensureConfigDir();

  const providers = [];
  for (let i = 0; i < 100; i++) {
    providers.push({
      name: `provider-${i}`,
      baseUrl: `https://api${i}.example.com`,
      apiKey: `key-${i}-${'x'.repeat(100)}`,
      createdAt: new Date().toISOString()
    });
  }

  const testConfig = { providers };
  saveConfig(testConfig);
  const loadedConfig = loadConfig();

  assert.strictEqual(loadedConfig.providers.length, 100, '应加载 100 个提供商');
  assert.strictEqual(loadedConfig.providers[50].name, 'provider-50', '第 50 个提供商名称应匹配');
}

/**
 * 测试配置覆盖
 */
function testConfigOverride() {
  cleanupTestConfig();
  ensureConfigDir();

  // 初始配置
  const initialConfig = {
    providers: [
      {
        name: 'provider1',
        baseUrl: 'https://api1.example.com',
        apiKey: 'key1',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveConfig(initialConfig);
  let loadedConfig = loadConfig();
  assert.strictEqual(loadedConfig.providers.length, 1, '初始配置应有 1 个提供商');

  // 覆盖配置
  const newConfig = {
    providers: [
      {
        name: 'provider2',
        baseUrl: 'https://api2.example.com',
        apiKey: 'key2',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveConfig(newConfig);
  loadedConfig = loadConfig();
  assert.strictEqual(loadedConfig.providers.length, 1, '新配置应有 1 个提供商');
  assert.strictEqual(loadedConfig.providers[0].name, 'provider2', '新配置应覆盖旧配置');
}

/**
 * 测试特殊字符处理
 */
function testSpecialCharactersInConfig() {
  cleanupTestConfig();
  ensureConfigDir();

  const testConfig = {
    providers: [
      {
        name: 'provider-with-中文',
        baseUrl: 'https://api.example.com/path?param=value&other=测试',
        apiKey: 'key-with-special-chars-!@#$%^&*()',
        createdAt: new Date().toISOString()
      }
    ]
  };

  saveConfig(testConfig);
  const loadedConfig = loadConfig();

  assert.strictEqual(loadedConfig.providers[0].name, 'provider-with-中文', '应正确处理中文名称');
  assert.ok(loadedConfig.providers[0].baseUrl.includes('测试'), '应正确处理 URL 中的中文');
  assert.ok(loadedConfig.providers[0].apiKey.includes('!@#$%^&*()'), '应正确处理特殊字符');
}

// 导出所有测试函数
module.exports = {
  testLoadEmptyConfig,
  testSaveAndLoadConfig,
  testSaveMultipleProviders,
  testConfigNotExists,
  testClaudeSettingsNotExists,
  testSaveAndLoadClaudeSettings,
  testConfigFormatValidation,
  testConfigPermissionError,
  testLargeConfig,
  testConfigOverride,
  testSpecialCharactersInConfig
};

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  const runner = require('./test-runner.js');
  const tests = module.exports;

  Object.entries(tests).forEach(([name, testFn]) => {
    if (typeof testFn === 'function') {
      runner.runTest(name, testFn);
    }
  });
}

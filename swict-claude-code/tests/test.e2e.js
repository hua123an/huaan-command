#!/usr/bin/env node

/**
 * 端到端测试
 * 测试完整的用户操作流程，包括错误处理和交互式菜单模拟
 */

const assert = global.assert || require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 临时测试目录
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'ultrathink-e2e-test');
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'model-switcher.json');
const TEST_SETTINGS_FILE = path.join(TEST_CONFIG_DIR, 'settings.json');

/**
 * 清理测试环境
 */
function cleanupTestEnv() {
  if (fs.existsSync(TEST_CONFIG_DIR)) {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
}

/**
 * 设置测试环境
 */
function setupTestEnv() {
  cleanupTestEnv();
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
}

/**
 * 模拟完整的添加配置流程
 */
async function simulateAddProvider(providerName, baseUrl, apiKey) {
  // 参数验证
  if (!providerName || !baseUrl || !apiKey) {
    throw new Error('所有参数都是必需的');
  }

  // 读取当前配置
  let config = { providers: [] };
  if (fs.existsSync(TEST_CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
  }

  // 检查提供商是否已存在
  if (config.providers.some(p => p.name === providerName)) {
    throw new Error(`提供商 "${providerName}" 已存在`);
  }

  // 验证输入
  if (!providerName.trim()) {
    throw new Error('提供商名称不能为空');
  }

  if (!baseUrl.trim()) {
    throw new Error('Base URL 不能为空');
  }

  if (!apiKey.trim()) {
    throw new Error('API Key 不能为空');
  }

  // 添加新提供商
  config.providers.push({
    name: providerName.trim(),
    baseUrl: baseUrl.trim(),
    apiKey: apiKey.trim(),
    createdAt: new Date().toISOString()
  });

  // 保存配置
  fs.writeFileSync(TEST_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

  return config;
}

/**
 * 模拟切换提供商流程
 */
async function simulateSwitchProvider(providerName) {
  // 读取配置
  if (!fs.existsSync(TEST_CONFIG_FILE)) {
    throw new Error('配置文件不存在');
  }

  const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
  const provider = config.providers.find(p => p.name === providerName);

  if (!provider) {
    throw new Error(`找不到提供商 "${providerName}"`);
  }

  // 读取或创建 Claude settings
  let claudeSettings = {};
  if (fs.existsSync(TEST_SETTINGS_FILE)) {
    claudeSettings = JSON.parse(fs.readFileSync(TEST_SETTINGS_FILE, 'utf-8'));
  }

  // 设置环境变量
  if (!claudeSettings.env) {
    claudeSettings.env = {};
  }

  claudeSettings.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey;
  claudeSettings.env.ANTHROPIC_BASE_URL = provider.baseUrl;
  claudeSettings.ANTHROPIC_API_KEY = provider.apiKey;
  claudeSettings.ANTHROPIC_BASE_URL = provider.baseUrl;
  claudeSettings.activeProvider = provider.name;

  // 保存设置
  fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(claudeSettings, null, 2), 'utf-8');

  // 同时设置环境变量
  process.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey;
  process.env.ANTHROPIC_BASE_URL = provider.baseUrl;

  return claudeSettings;
}

/**
 * 模拟删除提供商流程
 */
async function simulateRemoveProvider(providerName, confirmDelete = true) {
  if (!confirmDelete) {
    return { cancelled: true };
  }

  // 读取配置
  if (!fs.existsSync(TEST_CONFIG_FILE)) {
    throw new Error('配置文件不存在');
  }

  const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
  const index = config.providers.findIndex(p => p.name === providerName);

  if (index === -1) {
    throw new Error(`找不到提供商 "${providerName}"`);
  }

  // 删除提供商
  config.providers.splice(index, 1);

  // 保存配置
  fs.writeFileSync(TEST_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

  return config;
}

/**
 * 测试完整添加流程
 */
async function testCompleteAddFlow() {
  setupTestEnv();

  try {
    const config = await simulateAddProvider(
      'test-provider',
      'https://api.test.com',
      'test-api-key-123'
    );

    assert.strictEqual(config.providers.length, 1, '应有一个提供商');
    assert.strictEqual(config.providers[0].name, 'test-provider', '提供商名称应匹配');
    assert.strictEqual(config.providers[0].baseUrl, 'https://api.test.com', 'Base URL 应匹配');

    // 验证文件是否正确保存
    assert.ok(fs.existsSync(TEST_CONFIG_FILE), '配置文件应已创建');
    const savedConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(savedConfig.providers.length, 1, '保存的配置应有一个提供商');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试添加重复提供商
 */
async function testAddDuplicateProvider() {
  setupTestEnv();

  try {
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');
    try {
      await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');
      assert.fail('应抛出重复提供商错误');
    } catch (error) {
      assert.ok(error.message.includes('已存在'), '应提示提供商已存在');
    }
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试添加无效提供商名称
 */
async function testAddInvalidProviderName() {
  setupTestEnv();

  try {
    try {
      await simulateAddProvider('', 'https://api.test.com', 'test-key');
      assert.fail('应抛出名称为空错误');
    } catch (error) {
      assert.ok(error.message.includes('名称'), '应提示名称问题');
    }

    try {
      await simulateAddProvider('invalid name', 'https://api.test.com', 'test-key');
      assert.fail('应抛出无效名称错误');
    } catch (error) {
      assert.ok(error.message.includes('名称'), '应提示名称问题');
    }
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试添加无效 URL
 */
async function testAddInvalidUrl() {
  setupTestEnv();

  try {
    try {
      await simulateAddProvider('test-provider', 'invalid-url', 'test-key');
      assert.fail('应抛出 URL 无效错误');
    } catch (error) {
      assert.ok(error.message.includes('URL'), '应提示 URL 问题');
    }
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试添加空 API Key
 */
async function testAddEmptyApiKey() {
  setupTestEnv();

  try {
    try {
      await simulateAddProvider('test-provider', 'https://api.test.com', '');
      assert.fail('应抛出 API Key 为空错误');
    } catch (error) {
      assert.ok(error.message.includes('API Key'), '应提示 API Key 问题');
    }
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试完整切换流程
 */
async function testCompleteSwitchFlow() {
  setupTestEnv();

  try {
    // 先添加一个提供商
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');

    // 然后切换到该提供商
    const settings = await simulateSwitchProvider('test-provider');

    assert.strictEqual(settings.activeProvider, 'test-provider', 'activeProvider 应设置');
    assert.strictEqual(settings.env.ANTHROPIC_AUTH_TOKEN, 'test-key', 'ANTHROPIC_AUTH_TOKEN 应设置');
    assert.strictEqual(settings.env.ANTHROPIC_BASE_URL, 'https://api.test.com', 'ANTHROPIC_BASE_URL 应设置');
    assert.strictEqual(settings.ANTHROPIC_API_KEY, 'test-key', 'ANTHROPIC_API_KEY 应设置（向后兼容）');

    // 验证设置文件已保存
    assert.ok(fs.existsSync(TEST_SETTINGS_FILE), 'settings 文件应已创建');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试切换不存在的提供商
 */
async function testSwitchNonExistentProvider() {
  // 设置测试环境但不创建任何配置
  cleanupTestEnv();

  let errorThrown = false;
  let errorMessage = '';

  try {
    await simulateSwitchProvider('non-existent');
  } catch (error) {
    errorThrown = true;
    errorMessage = error.message;
  } finally {
    cleanupTestEnv();
  }

  // 验证是否抛出了错误（应该抛出"配置文件不存在"或"找不到提供商"）
  assert.ok(errorThrown, '应抛出错误');

  // 验证错误信息
  assert.ok(
    errorMessage.includes('找不到') ||
    errorMessage.includes('non-existent') ||
    errorMessage.includes('配置文件不存在'),
    `应提示错误，但得到: ${errorMessage}`
  );
}

/**
 * 测试完整删除流程
 */
async function testCompleteRemoveFlow() {
  setupTestEnv();

  try {
    // 先添加提供商
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');

    // 删除提供商
    const result = await simulateRemoveProvider('test-provider', true);

    assert.strictEqual(result.providers.length, 0, '删除后应没有提供商');

    // 验证文件已更新
    const savedConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(savedConfig.providers.length, 0, '保存的配置应为空');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试取消删除
 */
async function testCancelRemove() {
  setupTestEnv();

  try {
    // 先添加提供商
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');

    // 取消删除
    const result = await simulateRemoveProvider('test-provider', false);

    assert.strictEqual(result.cancelled, true, '应标记为已取消');

    // 验证提供商仍然存在
    const savedConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(savedConfig.providers.length, 1, '取消删除后提供商仍应存在');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试多提供商操作
 */
async function testMultipleProviders() {
  setupTestEnv();

  try {
    // 添加多个提供商
    await simulateAddProvider('provider1', 'https://api1.com', 'key1');
    await simulateAddProvider('provider2', 'https://api2.com', 'key2');
    await simulateAddProvider('provider3', 'https://api3.com', 'key3');

    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(config.providers.length, 3, '应有三个提供商');

    // 切换到第二个提供商
    await simulateSwitchProvider('provider2');
    const settings = JSON.parse(fs.readFileSync(TEST_SETTINGS_FILE, 'utf-8'));
    assert.strictEqual(settings.activeProvider, 'provider2', '应切换到 provider2');

    // 删除第一个提供商
    await simulateRemoveProvider('provider1', true);
    const updatedConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(updatedConfig.providers.length, 2, '删除后应有 2 个提供商');
    assert.strictEqual(updatedConfig.providers[0].name, 'provider2', 'provider2 应仍然是第一个');
    assert.strictEqual(updatedConfig.providers[1].name, 'provider3', 'provider3 应仍然是第二个');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试配置文件损坏恢复
 */
async function testConfigCorruptionRecovery() {
  setupTestEnv();

  try {
    // 添加一个提供商
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');

    // 损坏配置文件
    fs.writeFileSync(TEST_CONFIG_FILE, '{ invalid json', 'utf-8');

    try {
      await simulateSwitchProvider('test-provider');
      assert.fail('应抛出 JSON 解析错误');
    } catch (error) {
      assert.ok(error.message.includes('JSON'), '应抛出 JSON 解析错误');
    }
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试边界条件 - 空配置目录
 */
async function testEmptyConfigDirectory() {
  setupTestEnv();

  // 故意不创建任何文件，直接尝试读取
  const configExists = fs.existsSync(TEST_CONFIG_FILE);
  assert.strictEqual(configExists, false, '配置文件应不存在');

  // 尝试在空目录中添加提供商
  const config = await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');
  assert.strictEqual(config.providers.length, 1, '应成功添加提供商');

  cleanupTestEnv();
}

/**
 * 测试并发操作（模拟）
 */
async function testConcurrentOperations() {
  setupTestEnv();

  try {
    // 模拟并发添加不同提供商
    const operations = [
      simulateAddProvider('provider1', 'https://api1.com', 'key1'),
      simulateAddProvider('provider2', 'https://api2.com', 'key2'),
      simulateAddProvider('provider3', 'https://api3.com', 'key3'),
    ];

    await Promise.all(operations);

    // 验证所有提供商都已添加
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(config.providers.length, 3, '并发操作后应有 3 个提供商');

    // 验证提供商名称不重复
    const names = config.providers.map(p => p.name);
    const uniqueNames = new Set(names);
    assert.strictEqual(names.length, uniqueNames.size, '提供商名称不应重复');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试错误恢复
 */
async function testErrorRecovery() {
  setupTestEnv();

  try {
    // 先添加一个提供商
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');

    // 尝试添加无效提供商（会失败）
    try {
      await simulateAddProvider('', 'https://api.test.com', 'test-key');
    } catch (error) {
      // 忽略错误
    }

    // 验证第一个提供商仍然存在
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(config.providers.length, 1, '错误后第一个提供商仍应存在');
    assert.strictEqual(config.providers[0].name, 'test-provider', '提供商名称应保持不变');
  } finally {
    cleanupTestEnv();
  }
}

/**
 * 测试数据持久性
 */
async function testDataPersistence() {
  setupTestEnv();

  try {
    // 添加提供商并切换
    await simulateAddProvider('test-provider', 'https://api.test.com', 'test-key');
    await simulateSwitchProvider('test-provider');

    // 模拟重启（清理内存中的 process.env）
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_BASE_URL;

    // 重新从文件读取设置
    const settings = JSON.parse(fs.readFileSync(TEST_SETTINGS_FILE, 'utf-8'));
    assert.strictEqual(settings.activeProvider, 'test-provider', '设置应持久保存');
    assert.strictEqual(settings.env.ANTHROPIC_AUTH_TOKEN, 'test-key', 'API Key 应持久保存');
    assert.strictEqual(settings.env.ANTHROPIC_BASE_URL, 'https://api.test.com', 'Base URL 应持久保存');

    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_FILE, 'utf-8'));
    assert.strictEqual(config.providers.length, 1, '配置应持久保存');
  } finally {
    cleanupTestEnv();
  }
}

// 导出所有测试函数
module.exports = {
  testCompleteAddFlow,
  testAddDuplicateProvider,
  testAddInvalidProviderName,
  testAddInvalidUrl,
  testAddEmptyApiKey,
  testCompleteSwitchFlow,
  testSwitchNonExistentProvider,
  testCompleteRemoveFlow,
  testCancelRemove,
  testMultipleProviders,
  testConfigCorruptionRecovery,
  testEmptyConfigDirectory,
  testConcurrentOperations,
  testErrorRecovery,
  testDataPersistence,

  // 模拟函数
  simulateAddProvider,
  simulateSwitchProvider,
  simulateRemoveProvider
};

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  const runner = require('./test-runner.js');
  const tests = module.exports;

  Object.entries(tests).forEach(([name, testFn]) => {
    if (typeof testFn === 'function' && name.startsWith('test')) {
      runner.runTest(name, async () => {
        await testFn();
      });
    }
  });
}

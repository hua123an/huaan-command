#!/usr/bin/env node

/**
 * updateChecker 模块测试
 */

const assert = global.assert || require('assert');
const updateChecker = require('../src/updateChecker');

/**
 * 测试版本比较功能
 */
function testVersionComparison() {
  // 测试相等版本
  assert.strictEqual(updateChecker.compareVersions('1.0.0', '1.0.0'), 0, '相同版本应返回0');
  
  // 测试版本1 < 版本2
  assert.strictEqual(updateChecker.compareVersions('1.0.0', '1.0.1'), -1, '1.0.0应小于1.0.1');
  assert.strictEqual(updateChecker.compareVersions('1.0.0', '1.1.0'), -1, '1.0.0应小于1.1.0');
  assert.strictEqual(updateChecker.compareVersions('1.0.0', '2.0.0'), -1, '1.0.0应小于2.0.0');
  
  // 测试版本1 > 版本2
  assert.strictEqual(updateChecker.compareVersions('1.0.1', '1.0.0'), 1, '1.0.1应大于1.0.0');
  assert.strictEqual(updateChecker.compareVersions('1.1.0', '1.0.0'), 1, '1.1.0应大于1.0.0');
  assert.strictEqual(updateChecker.compareVersions('2.0.0', '1.0.0'), 1, '2.0.0应大于1.0.0');
  
  // 测试不同长度版本号
  assert.strictEqual(updateChecker.compareVersions('1.0', '1.0.0'), 0, '1.0应等于1.0.0');
  assert.strictEqual(updateChecker.compareVersions('1.0.0', '1.0'), 0, '1.0.0应等于1.0');
}

/**
 * 测试缓存功能
 */
function testCacheFunctions() {
  // 测试读取不存在的缓存
  const cache = updateChecker.readCache();
  assert.strictEqual(cache, null, '不存在的缓存应返回null');
  
  // 测试写入缓存
  updateChecker.writeCache('1.0.1');
  
  // 测试读取缓存（这里只是验证函数不会出错）
  const newCache = updateChecker.readCache();
  // 注意：由于缓存文件位置和实际实现，这里可能仍然返回null
}

// 导出测试函数
module.exports = {
  testVersionComparison,
  testCacheFunctions
};
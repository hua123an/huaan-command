#!/usr/bin/env node

/**
 * constants 模块测试
 */

const assert = global.assert || require('assert');
const constants = require('../src/constants');

/**
 * 测试常量定义
 */
function testConstants() {
  // 测试颜色常量存在
  assert.ok(constants.COLORS, 'COLORS常量应存在');
  assert.ok(typeof constants.COLORS.reset === 'string', 'COLORS.reset应是字符串');
  assert.ok(typeof constants.COLORS.red === 'string', 'COLORS.red应是字符串');
  assert.ok(typeof constants.COLORS.green === 'string', 'COLORS.green应是字符串');
  
  // 测试长度常量
  assert.ok(typeof constants.PROVIDER_NAME_MIN_LENGTH === 'number', 'PROVIDER_NAME_MIN_LENGTH应是数字');
  assert.ok(typeof constants.BASE_URL_MIN_LENGTH === 'number', 'BASE_URL_MIN_LENGTH应是数字');
  assert.ok(typeof constants.API_KEY_MIN_LENGTH === 'number', 'API_KEY_MIN_LENGTH应是数字');
  
  // 测试删除关键词
  assert.ok(Array.isArray(constants.CONFIRM_DELETE_KEYWORDS), 'CONFIRM_DELETE_KEYWORDS应是数组');
  assert.ok(constants.CONFIRM_DELETE_KEYWORDS.length > 0, 'CONFIRM_DELETE_KEYWORDS不应为空');
  
  // 测试帮助文本
  assert.ok(typeof constants.HELP_TEXT === 'object', 'HELP_TEXT应是对象');
  assert.ok(typeof constants.HELP_TEXT.title === 'string', 'HELP_TEXT.title应是字符串');
  assert.ok(typeof constants.HELP_TEXT.usage === 'string', 'HELP_TEXT.usage应是字符串');
}

/**
 * 测试常量值的有效性
 */
function testConstantValues() {
  // 测试长度常量合理性
  assert.ok(constants.PROVIDER_NAME_MIN_LENGTH > 0, '提供商名称最小长度应大于0');
  assert.ok(constants.BASE_URL_MIN_LENGTH > 0, 'Base URL最小长度应大于0');
  assert.ok(constants.API_KEY_MIN_LENGTH > 0, 'API Key最小长度应大于0');
  
  // 测试删除关键词包含常见值
  const hasCommonKeywords = constants.CONFIRM_DELETE_KEYWORDS.some(keyword => 
    ['delete', 'yes', 'confirm', 'y'].includes(keyword.toLowerCase())
  );
  assert.ok(hasCommonKeywords, '应包含常见的确认关键词');
  
  // 测试颜色代码格式
  assert.ok(constants.COLORS.reset.startsWith('\x1b['), '颜色代码应是ANSI转义序列');
  assert.ok(constants.COLORS.red.startsWith('\x1b['), '颜色代码应是ANSI转义序列');
}

// 导出测试函数
module.exports = {
  testConstants,
  testConstantValues
};
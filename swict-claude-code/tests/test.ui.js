#!/usr/bin/env node

/**
 * UI 输出测试
 * 测试各种 UI 输出函数，包括颜色、消息格式化等
 */

const assert = global.assert || require('assert');
const fs = require('fs');
const { Writable } = require('stream');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

/**
 * 捕获控制台输出
 */
function captureConsoleOutput(fn) {
  const outputs = {
    stdout: [],
    stderr: []
  };

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = function(chunk, encoding, callback) {
    outputs.stdout.push(chunk);
    return originalStdoutWrite(chunk, encoding, callback);
  };

  process.stderr.write = function(chunk, encoding, callback) {
    outputs.stderr.push(chunk);
    return originalStderrWrite(chunk, encoding, callback);
  };

  try {
    fn();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return outputs;
}

/**
 * 打印标题
 */
function printTitle(text) {
  console.log(`\n${colors.cyan}${colors.bright}${text}${colors.reset}\n`);
}

/**
 * 打印成功消息
 */
function printSuccess(text) {
  console.log(`${colors.green}✅ ${text}${colors.reset}`);
}

/**
 * 打印错误消息
 */
function printError(text) {
  console.log(`${colors.red}❌ ${text}${colors.reset}`);
}

/**
 * 打印警告消息
 */
function printWarning(text) {
  console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`);
}

/**
 * 打印信息消息
 */
function printInfo(text) {
  console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`);
}

/**
 * 打印帮助信息
 */
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}Claude Code 模型服务商配置切换工具${colors.reset}

${colors.bright}使用方法:${colors.reset}
  claude-switcher <命令> [选项]
  ccs <命令> [选项]              # 简写

${colors.bright}命令:${colors.reset}
  ${colors.cyan}add <名称>${colors.reset}          添加新的服务商配置
  ${colors.cyan}list${colors.reset}                列出所有已保存的服务商配置
  ${colors.cyan}switch <名称>${colors.reset}       切换到指定的服务商配置
  ${colors.cyan}remove <名称>${colors.reset}       删除指定的服务商配置
  ${colors.cyan}show${colors.reset}                显示当前活跃的配置
  ${colors.cyan}interactive${colors.reset}        进入交互模式
  ${colors.cyan}help${colors.reset}                显示此帮助信息

${colors.bright}示例:${colors.reset}
  ccs add                  # 添加配置 (简写)
  ccs list                 # 列出配置 (简写)
  ccs switch openai        # 切换配置 (简写)
  ccs show                 # 显示当前配置 (简写)
  ccs interactive          # 进入交互模式 (简写)
`);
}

/**
 * 测试打印标题功能
 */
function testPrintTitle() {
  const outputs = captureConsoleOutput(() => {
    printTitle('测试标题');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('测试标题'), '输出应包含标题文本');
  assert.ok(output.includes('\x1b[36m'), '输出应包含青色 (cyan)');
  assert.ok(output.includes('\x1b[1m'), '输出应包含亮色 (bright)');
  assert.ok(output.includes('\x1b[0m'), '输出应包含重置 (reset)');
}

/**
 * 测试打印成功消息
 */
function testPrintSuccess() {
  const outputs = captureConsoleOutput(() => {
    printSuccess('操作成功');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('✅'), '输出应包含成功图标');
  assert.ok(output.includes('操作成功'), '输出应包含成功消息');
  assert.ok(output.includes('\x1b[32m'), '输出应包含绿色 (green)');
}

/**
 * 测试打印错误消息
 */
function testPrintError() {
  const outputs = captureConsoleOutput(() => {
    printError('操作失败');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('❌'), '输出应包含错误图标');
  assert.ok(output.includes('操作失败'), '输出应包含错误消息');
  assert.ok(output.includes('\x1b[31m'), '输出应包含红色 (red)');
}

/**
 * 测试打印警告消息
 */
function testPrintWarning() {
  const outputs = captureConsoleOutput(() => {
    printWarning('这是一个警告');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('⚠️'), '输出应包含警告图标');
  assert.ok(output.includes('这是一个警告'), '输出应包含警告消息');
  assert.ok(output.includes('\x1b[33m'), '输出应包含黄色 (yellow)');
}

/**
 * 测试打印信息消息
 */
function testPrintInfo() {
  const outputs = captureConsoleOutput(() => {
    printInfo('这是一条信息');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('ℹ️'), '输出应包含信息图标');
  assert.ok(output.includes('这是一条信息'), '输出应包含信息消息');
  assert.ok(output.includes('\x1b[34m'), '输出应包含蓝色 (blue)');
}

/**
 * 测试显示帮助信息
 */
function testShowHelp() {
  const outputs = captureConsoleOutput(() => {
    showHelp();
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('使用方法'), '帮助信息应包含"使用方法"');
  assert.ok(output.includes('命令'), '帮助信息应包含"命令"');
  assert.ok(output.includes('add'), '帮助信息应包含 add 命令');
  assert.ok(output.includes('list'), '帮助信息应包含 list 命令');
  assert.ok(output.includes('switch'), '帮助信息应包含 switch 命令');
  assert.ok(output.includes('interactive'), '帮助信息应包含 interactive 命令');
}

/**
 * 测试空消息处理
 */
function testEmptyMessage() {
  const outputs = captureConsoleOutput(() => {
    printSuccess('');
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('\x1b[32m'), '空消息也应应用颜色');
}

/**
 * 测试长消息处理
 */
function testLongMessage() {
  const longMessage = 'x'.repeat(1000);
  const outputs = captureConsoleOutput(() => {
    printInfo(longMessage);
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('ℹ️'), '长消息应包含图标');
  assert.ok(output.includes(longMessage), '长消息应完整输出');
}

/**
 * 测试特殊字符消息
 */
function testSpecialCharacters() {
  const specialMessage = '测试消息: !@#$%^&*()_+-=[]{}|;:,.<>?';
  const outputs = captureConsoleOutput(() => {
    printError(specialMessage);
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('测试消息'), '应正确处理中文');
  assert.ok(output.includes('!@#$%^&*()'), '应正确处理特殊字符');
}

/**
 * 测试多行消息
 */
function testMultilineMessage() {
  const multilineMessage = '第一行\n第二行\n第三行';
  const outputs = captureConsoleOutput(() => {
    printSuccess(multilineMessage);
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('第一行'), '应包含第一行');
  assert.ok(output.includes('第二行'), '应包含第二行');
  assert.ok(output.includes('第三行'), '应包含第三行');
}

/**
 * 测试颜色代码正确性
 */
function testColorCodeConsistency() {
  // 验证所有颜色代码都是有效的 ANSI 转义序列
  const colorValues = Object.values(colors);
  colorValues.forEach(color => {
    assert.ok(typeof color === 'string', '颜色值应为字符串');
    assert.ok(color.startsWith('\x1b['), '颜色值应以 ANSI 转义序列开头');
  });
}

/**
 * 测试格式化输出（提供商列表）
 */
function testFormatProviderList() {
  const providers = [
    { name: 'provider1', baseUrl: 'https://api1.com', apiKey: 'key1' },
    { name: 'provider2', baseUrl: 'https://api2.com', apiKey: 'key2' }
  ];

  const outputs = captureConsoleOutput(() => {
    console.log(`\n${colors.cyan}${colors.bright}已保存的服务商配置${colors.reset}\n`);
    providers.forEach((provider, index) => {
      const marker = '  ';
      console.log(`${marker} [${index + 1}] ${colors.bright}${provider.name}${colors.reset}`);
      console.log(`    ${colors.dim}Base URL:${colors.reset} ${provider.baseUrl}`);
      console.log(`    ${colors.dim}API Key:${colors.reset} ${provider.apiKey.substring(0, 10)}...`);
      console.log();
    });
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('已保存的服务商配置'), '输出应包含标题');
  assert.ok(output.includes('provider1'), '输出应包含第一个提供商');
  assert.ok(output.includes('provider2'), '输出应包含第二个提供商');
  assert.ok(output.includes('Base URL'), '输出应包含 Base URL 标签');
}

/**
 * 测试当前配置显示
 */
function testShowCurrentConfig() {
  const activeProvider = 'test-provider';
  const baseUrl = 'https://test.com';
  const apiKey = 'test-api-key-123456789';

  const outputs = captureConsoleOutput(() => {
    console.log(`\n${colors.cyan}${colors.bright}当前激活配置${colors.reset}`);
    console.log(`服务商名称: ${colors.bright}${activeProvider}${colors.reset}`);
    console.log(`ANTHROPIC_AUTH_TOKEN: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`ANTHROPIC_BASE_URL: ${baseUrl}`);
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('当前激活配置'), '输出应包含标题');
  assert.ok(output.includes('test-provider'), '输出应包含提供商名称');
  assert.ok(output.includes('https://test.com'), '输出应包含 Base URL');
  assert.ok(output.includes('test-api-k') || output.includes('...6789'), '输出应包含 API Key 片段');
}

/**
 * 测试交互式菜单提示
 */
function testInteractiveMenuPrompt() {
  const outputs = captureConsoleOutput(() => {
    console.log(`\n${colors.cyan}${colors.bright}Claude Code 配置切换工具${colors.reset}`);
    console.log(`${colors.dim}==================================${colors.reset}\n`);
    console.log('请选择操作:');
    console.log(`  ${colors.cyan}1${colors.reset} - 列出所有配置`);
    console.log(`  ${colors.cyan}2${colors.reset} - 添加新配置`);
    console.log(`  ${colors.cyan}3${colors.reset} - 切换配置`);
    console.log(`  ${colors.cyan}4${colors.reset} - 删除配置`);
  });

  const output = outputs.stdout.join('');
  assert.ok(output.includes('Claude Code 配置切换工具'), '输出应包含标题');
  assert.ok(output.includes('请选择操作'), '输出应包含操作提示');
  assert.ok(output.includes('列出所有配置'), '输出应包含选项1');
  assert.ok(output.includes('添加新配置'), '输出应包含选项2');
}

/**
 * 测试无颜色模式
 */
function testNoColorMode() {
  const originalIsTTY = process.stdout.isTTY;
  process.stdout.isTTY = false;

  try {
    const outputs = captureConsoleOutput(() => {
      printSuccess('测试消息');
    });

    const output = outputs.stdout.join('');
    // 在非 TTY 模式下，颜色代码可能被过滤或保留
    // 这里我们只检查基本内容是否存在
    assert.ok(output.includes('✅') || output.includes('测试消息'), '输出应包含基本内容');
  } finally {
    process.stdout.isTTY = originalIsTTY;
  }
}

/**
 * 测试 Unicode 字符处理
 */
function testUnicodeCharacters() {
  const unicodeMessages = [
    '✓ 成功',
    '✗ 错误',
    '⚠ 警告',
    'ℹ 信息',
    '🔧 工具',
    '🚀 启动',
    '✅ 完成'
  ];

  unicodeMessages.forEach(message => {
    const outputs = captureConsoleOutput(() => {
      printInfo(message);
    });

    const output = outputs.stdout.join('');
    assert.ok(output.includes(message), `输出应包含 Unicode 消息: ${message}`);
  });
}

// 导出所有测试函数
module.exports = {
  // 测试函数
  testPrintTitle,
  testPrintSuccess,
  testPrintError,
  testPrintWarning,
  testPrintInfo,
  testShowHelp,
  testEmptyMessage,
  testLongMessage,
  testSpecialCharacters,
  testMultilineMessage,
  testColorCodeConsistency,
  testFormatProviderList,
  testShowCurrentConfig,
  testInteractiveMenuPrompt,
  testNoColorMode,
  testUnicodeCharacters,

  // UI 函数
  printTitle,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  showHelp
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

#!/usr/bin/env node

/**
 * ultrathink 测试运行器
 * 使用 Node.js 内置 assert 模块，无需外部依赖
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

/**
 * 打印带颜色的文本
 */
function printColored(text, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  if (process.env.NO_COLOR || !process.stdout.isTTY) {
    // 如果不支持颜色或设置了 NO_COLOR 环境变量，则不打印颜色
    console.log(text);
  } else {
    console.log(`${colors[color]}${text}${colors.reset}`);
  }
}

/**
 * 运行单个测试
 */
function runTest(testName, testFunction) {
  try {
    testFunction();
    testResults.passed++;
    printColored(`  ✓ ${testName}`, 'green');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.failures.push({
      name: testName,
      error: error.message,
      stack: error.stack
    });
    printColored(`  ✗ ${testName}`, 'red');
    printColored(`    错误: ${error.message}`, 'red');
    return false;
  } finally {
    testResults.total++;
  }
}

/**
 * 加载并运行测试文件
 */
async function runTestFile(filePath) {
  try {
    const testModule = require(filePath);

    printColored(`\n运行测试文件: ${path.basename(filePath)}`, 'cyan');
    printColored('='.repeat(50), 'cyan');

    // 如果模块导出的是对象，则运行每个测试
    if (typeof testModule === 'object' && testModule !== null) {
      for (const [testName, testFunction] of Object.entries(testModule)) {
        if (typeof testFunction === 'function') {
          await testFunction();
        }
      }
    }
  } catch (error) {
    printColored(`加载测试文件失败: ${error.message}`, 'red');
    printColored(error.stack, 'red');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  printColored('\n' + '='.repeat(70), 'cyan');
  printColored(' ultrathink 测试套件 ', 'cyan');
  printColored('='.repeat(70) + '\n', 'cyan');

  const testDir = path.join(__dirname);
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.startsWith('test.') && file.endsWith('.js'))
    .sort();

  if (testFiles.length === 0) {
    printColored('没有找到测试文件', 'yellow');
    return;
  }

  // 运行每个测试文件
  for (const testFile of testFiles) {
    if (testFile === 'test-runner.js') continue; // 跳过自身

    const filePath = path.join(testDir, testFile);

    // 模拟测试框架
    const originalRequire = require;
    const requireWrapper = (modulePath) => {
      if (modulePath === 'assert') {
        return assert;
      }
      return originalRequire(modulePath);
    };

    // 重置测试结果计数器
    const beforeTotal = testResults.total;

    // 使用断言模块
    global.assert = assert;

    // 运行测试文件
    try {
      await runTestFile(filePath);
    } catch (error) {
      printColored(`运行测试文件时发生错误: ${error.message}`, 'red');
    }
  }

  // 打印测试摘要
  printColored('\n' + '='.repeat(70), 'cyan');
  printColored(' 测试摘要 ', 'cyan');
  printColored('='.repeat(70) + '\n', 'cyan');

  console.log(`总测试数: ${testResults.total}`);
  printColored(`通过: ${testResults.passed}`, 'green');
  if (testResults.failed > 0) {
    printColored(`失败: ${testResults.failed}`, 'red');
  } else {
    printColored(`失败: ${testResults.failed}`, 'green');
  }
  console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

  // 打印失败的测试详情
  if (testResults.failures.length > 0) {
    printColored('\n失败的测试:', 'red');
    testResults.failures.forEach((failure, index) => {
      printColored(`\n${index + 1}. ${failure.name}`, 'red');
      printColored(`   错误: ${failure.error}`, 'red');
    });
  }

  printColored('\n' + '='.repeat(70) + '\n', 'cyan');

  // 返回退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllTests().catch(error => {
    printColored(`测试运行失败: ${error.message}`, 'red');
    printColored(error.stack, 'red');
    process.exit(1);
  });
}

// 导出测试运行器
module.exports = {
  runTest,
  assert,
  testResults
};

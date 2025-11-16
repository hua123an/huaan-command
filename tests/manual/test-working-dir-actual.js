/**
 * 工作目录传递 - 实际测试代码
 *
 * 本文件包含可在应用中直接使用的测试代码
 * 可以复制到浏览器控制台或测试框架中执行
 */

// ============================================
// 方式1：使用 useToolExecutor Composable
// ============================================

/**
 * 在 Vue 组件中使用
 */
export const workingDirTests = {
  async runTests() {
    console.log('开始工作目录测试...\n');

    const tests = [
      {
        id: 1,
        name: '测试1：Home目录',
        cmd: 'pwd',
        workingDir: '/Users/huaan',
        expected: '/Users/huaan'
      },
      {
        id: 2,
        name: '测试2：Kero子目录',
        cmd: 'pwd',
        workingDir: '/Users/huaan/kero',
        expected: '/Users/huaan/kero'
      },
      {
        id: 3,
        name: '测试3：~ 展开',
        cmd: 'pwd',
        workingDir: '~/kero',
        expected: '/Users/huaan/kero'
      }
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`\n执行 ${test.name}...`);
        console.log(`  工作目录: ${test.workingDir}`);
        console.log(`  命令: ${test.cmd}`);

        // 这里需要在真实环境中替换为实际的执行方式
        // 方式A：直接调用 invoke
        const result = await window.__TAURI__.core.invoke('execute_command', {
          cmd: test.cmd,
          workingDir: test.workingDir
        });

        console.log(`  返回: ${result.stdout}`);

        const actual = result.stdout.trim();
        const passed = actual === test.expected;

        results.push({
          ...test,
          actual,
          passed,
          output: result
        });

        console.log(`  结果: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        if (!passed) {
          console.log(`    期望: ${test.expected}`);
          console.log(`    实际: ${actual}`);
        }

      } catch (error) {
        console.error(`  错误: ${error.message}`);
        results.push({
          ...test,
          error: error.message,
          passed: false
        });
      }
    }

    // 输出摘要
    console.log('\n' + '='.repeat(50));
    console.log('测试摘要：');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`\n通过: ${passed}/${total}`);

    if (passed === total) {
      console.log('\n✅ 所有测试通过！工作目录传递功能正常。\n');
    } else {
      console.log('\n❌ 部分测试失败。请参考 TEST_WORKING_DIR_GUIDE.md 进行排查。\n');
    }

    return results;
  }
};

// ============================================
// 方式2：使用 useToolExecutor 执行器
// ============================================

/**
 * 在 Vue 组件中使用的完整示例
 */
export const testWithExecutor = async () => {
  // 需要在 Vue 组件中导入
  // import { useToolExecutor } from '@/tools/executor'

  // const { executeTool } = useToolExecutor();

  const testCases = [
    { name: '测试1', cmd: 'pwd', workingDir: '/Users/huaan' },
    { name: '测试2', cmd: 'pwd', workingDir: '/Users/huaan/kero' },
    { name: '测试3', cmd: 'pwd', workingDir: '~/kero' }
  ];

  const results = [];

  for (const test of testCases) {
    try {
      const result = await executeTool('execute_command', {
        cmd: test.cmd,
        workingDir: test.workingDir
      });

      results.push({
        ...test,
        result,
        success: true
      });

    } catch (error) {
      results.push({
        ...test,
        error: error.message,
        success: false
      });
    }
  }

  return results;
};

// ============================================
// 方式3：直接调用 Tauri invoke
// ============================================

/**
 * 最原始的方式 - 直接调用 Tauri IPC
 * 可以在浏览器控制台中执行
 */
export const directTauriTest = async () => {
  const { invoke } = window.__TAURI__.core;

  console.log('工作目录直接测试（通过 Tauri invoke）\n');

  // 测试1
  console.log('测试1：/Users/huaan');
  const result1 = await invoke('execute_command', {
    cmd: 'pwd',
    workingDir: '/Users/huaan'
  });
  console.log(`结果: ${result1.stdout}`);
  console.log(`验证: ${result1.stdout.trim() === '/Users/huaan' ? '✅ PASS' : '❌ FAIL'}\n`);

  // 测试2
  console.log('测试2：/Users/huaan/kero');
  const result2 = await invoke('execute_command', {
    cmd: 'pwd',
    workingDir: '/Users/huaan/kero'
  });
  console.log(`结果: ${result2.stdout}`);
  console.log(`验证: ${result2.stdout.trim() === '/Users/huaan/kero' ? '✅ PASS' : '❌ FAIL'}\n`);

  // 测试3
  console.log('测试3：~/kero');
  const result3 = await invoke('execute_command', {
    cmd: 'pwd',
    workingDir: '~/kero'
  });
  console.log(`结果: ${result3.stdout}`);
  console.log(`验证: ${result3.stdout.trim() === '/Users/huaan/kero' ? '✅ PASS' : '❌ FAIL'}\n`);

  return [result1, result2, result3];
};

// ============================================
// 方式4：Vue 3 组件模板示例
// ============================================

/**
 * 可以创建一个测试组件
 */
export const testComponentCode = `
<template>
  <div class="test-container">
    <h2>工作目录传递测试</h2>

    <button @click="runTests" :disabled="testing">
      {{ testing ? '测试运行中...' : '运行测试' }}
    </button>

    <div v-if="testResults.length" class="results">
      <h3>测试结果：</h3>
      <table>
        <thead>
          <tr>
            <th>测试</th>
            <th>工作目录</th>
            <th>期望输出</th>
            <th>实际输出</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in testResults" :key="result.id" :class="result.passed ? 'pass' : 'fail'">
            <td>{{ result.name }}</td>
            <td><code>{{ result.workingDir }}</code></td>
            <td><code>{{ result.expected }}</code></td>
            <td><code>{{ result.actual }}</code></td>
            <td>{{ result.passed ? '✅' : '❌' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToolExecutor } from '@/tools/executor'

const testing = ref(false)
const testResults = ref([])
const { executeTool } = useToolExecutor()

const runTests = async () => {
  testing.value = true
  testResults.value = []

  const tests = [
    {
      id: 1,
      name: '测试1：Home目录',
      workingDir: '/Users/huaan',
      expected: '/Users/huaan'
    },
    {
      id: 2,
      name: '测试2：Kero子目录',
      workingDir: '/Users/huaan/kero',
      expected: '/Users/huaan/kero'
    },
    {
      id: 3,
      name: '测试3：~ 展开',
      workingDir: '~/kero',
      expected: '/Users/huaan/kero'
    }
  ]

  for (const test of tests) {
    try {
      const result = await executeTool('execute_command', {
        cmd: 'pwd',
        workingDir: test.workingDir
      })

      const actual = result.stdout.trim()
      testResults.value.push({
        ...test,
        actual,
        passed: actual === test.expected
      })
    } catch (error) {
      testResults.value.push({
        ...test,
        actual: 'Error',
        passed: false
      })
    }
  }

  testing.value = false
}
</script>

<style scoped>
.test-container {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

button {
  padding: 8px 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

table {
  width: 100%;
  margin-top: 16px;
  border-collapse: collapse;
}

th, td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f5f5f5;
  font-weight: bold;
}

code {
  background: #f0f0f0;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: monospace;
}

.pass {
  background: #f0fff0;
}

.fail {
  background: #fff0f0;
}
</style>
`;

// ============================================
// 方式5：Jest 测试框架示例
// ============================================

/**
 * 可以作为单元测试使用
 */
export const jestTestCode = `
import { describe, it, expect, beforeAll } from '@jest/globals'
import { useToolExecutor } from '@/tools/executor'

// Mock Tauri invoke（如果需要）
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(async (cmd, args) => {
    if (cmd === 'execute_command') {
      // 模拟执行结果
      return {
        success: true,
        stdout: args.workingDir || '/default',
        stderr: '',
        code: 0
      }
    }
  })
}))

describe('execute_command 工作目录测试', () => {
  let executor

  beforeAll(() => {
    executor = useToolExecutor()
  })

  it('测试1：在 /Users/huaan 执行 pwd', async () => {
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '/Users/huaan'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan')
  })

  it('测试2：在 /Users/huaan/kero 执行 pwd', async () => {
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '/Users/huaan/kero'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan/kero')
  })

  it('测试3：在 ~/kero 执行 pwd（~ 展开）', async () => {
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '~/kero'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan/kero')
  })

  it('工作目录参数应该被传递', async () => {
    const params = {
      cmd: 'pwd',
      workingDir: '/test/path'
    }
    const result = await executor.executeTool('execute_command', params)
    // 验证工作目录被正确传递
    expect(result.stdout.trim()).toBe('/test/path')
  })
})
`;

// ============================================
// 方式6：浏览器控制台快速测试
// ============================================

/**
 * 可以直接复制到浏览器控制台执行
 */
export const consoleTestCode = `
// 快速测试（复制到浏览器控制台执行）

(async () => {
  const { invoke } = window.__TAURI__.core;

  console.log('%c工作目录传递快速测试', 'font-size:16px;font-weight:bold');

  const tests = [
    { dir: '/Users/huaan', expected: '/Users/huaan' },
    { dir: '/Users/huaan/kero', expected: '/Users/huaan/kero' },
    { dir: '~/kero', expected: '/Users/huaan/kero' }
  ];

  let passed = 0;
  for (const [i, test] of tests.entries()) {
    try {
      const result = await invoke('execute_command', {
        cmd: 'pwd',
        workingDir: test.dir
      });
      const actual = result.stdout.trim();
      const success = actual === test.expected;
      console.log(
        \`%c测试\${i + 1}: \${success ? '✅' : '❌'}\`,
        \`color: \${success ? 'green' : 'red'}\`
      );
      console.log(\`  工作目录: \${test.dir}\`);
      console.log(\`  期望: \${test.expected}\`);
      console.log(\`  实际: \${actual}\`);
      if (success) passed++;
    } catch (e) {
      console.error(\`测试\${i + 1} 失败: \${e.message}\`);
    }
  }

  console.log(\`\\n结果: \${passed}/3 通过\`);
})();
`;

// 导出所有测试方式
export default {
  workingDirTests,
  testWithExecutor,
  directTauriTest,
  testComponentCode,
  jestTestCode,
  consoleTestCode,
  runAllTests: async () => {
    console.log('执行所有测试方式...');
    return {
      workingDirTest: await workingDirTests.runTests(),
      directTauriTest: await directTauriTest(),
    };
  }
};

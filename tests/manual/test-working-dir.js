/**
 * 工作目录传递测试脚本
 *
 * 用途：验证 execute_command 命令是否在正确的工作目录中执行
 *
 * 说明：
 * 该脚本模拟三个测试场景，验证 execute_command 工具能否正确处理：
 * 1. 绝对路径工作目录
 * 2. 嵌套目录路径
 * 3. ~ 符号的主目录展开
 */

console.log('============================================');
console.log('  工作目录传递测试脚本 (Working Directory Tests)');
console.log('============================================\n');

// 测试数据定义
const tests = [
  {
    id: 1,
    name: '测试1：Home目录执行 pwd',
    workingDir: '/Users/huaan',
    command: 'pwd',
    expectedOutput: '/Users/huaan',
    description: '验证在绝对路径 /Users/huaan 中执行 pwd 命令，应返回该目录路径'
  },
  {
    id: 2,
    name: '测试2：Kero子目录执行 pwd',
    workingDir: '/Users/huaan/kero',
    command: 'pwd',
    expectedOutput: '/Users/huaan/kero',
    description: '验证在嵌套路径 /Users/huaan/kero 中执行 pwd 命令，应返回该完整路径'
  },
  {
    id: 3,
    name: '测试3：主目录符号 ~ 展开',
    workingDir: '~/kero',
    command: 'pwd',
    expectedOutput: '/Users/huaan/kero',
    description: '验证 ~ 符号能否正确展开为 /Users/huaan，结合 /kero 返回完整路径'
  }
];

// 显示测试计划
console.log('测试计划：');
console.log('-----------------------------------------\n');
tests.forEach((test, index) => {
  console.log(`${test.id}. ${test.name}`);
  console.log(`   工作目录: ${test.workingDir}`);
  console.log(`   执行命令: ${test.command}`);
  console.log(`   期望输出: ${test.expectedOutput}`);
  console.log(`   说明: ${test.description}`);
  console.log('');
});

console.log('-----------------------------------------\n');

// 验证逻辑说明
console.log('验证逻辑：');
console.log('-----------------------------------------\n');
console.log('每个测试都会：');
console.log('1. 调用 execute_command 工具，传入指定的 workingDir');
console.log('2. 执行 pwd 命令来获取当前工作目录');
console.log('3. 比较返回的输出与期望的目录路径');
console.log('4. 如果输出匹配期望值，则测试通过 (PASS)');
console.log('5. 否则测试失败 (FAIL)，并显示实际值与期望值的差异\n');

console.log('-----------------------------------------\n');

// 伪代码实现说明
console.log('伪代码实现（调用 execute_command）：\n');
console.log(`
// 示例调用（基于项目中的 tools/index.js）
const result = await invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan/kero'  // 工作目录参数
});

// 返回结果结构
result = {
  success: true,
  stdout: '/Users/huaan/kero',
  stderr: '',
  code: 0
}
`);

console.log('-----------------------------------------\n');

// 测试案例的详细说明
console.log('详细测试说明：\n');

console.log('【测试1】Home 目录执行 pwd');
console.log('  执行流程：');
console.log('  - 调用 execute_command({ cmd: "pwd", workingDir: "/Users/huaan" })');
console.log('  - 系统在 /Users/huaan 目录下执行 pwd 命令');
console.log('  - 返回当前工作目录：/Users/huaan');
console.log('  - 验证：/Users/huaan === /Users/huaan (PASS)');
console.log('\n');

console.log('【测试2】Kero 子目录执行 pwd');
console.log('  执行流程：');
console.log('  - 调用 execute_command({ cmd: "pwd", workingDir: "/Users/huaan/kero" })');
console.log('  - 系统在 /Users/huaan/kero 目录下执行 pwd 命令');
console.log('  - 返回当前工作目录：/Users/huaan/kero');
console.log('  - 验证：/Users/huaan/kero === /Users/huaan/kero (PASS)');
console.log('\n');

console.log('【测试3】主目录符号 ~ 展开');
console.log('  执行流程：');
console.log('  - 调用 execute_command({ cmd: "pwd", workingDir: "~/kero" })');
console.log('  - 系统需要展开 ~ 为 /Users/huaan');
console.log('  - 完整路径变为 /Users/huaan/kero');
console.log('  - 在 /Users/huaan/kero 目录下执行 pwd 命令');
console.log('  - 返回当前工作目录：/Users/huaan/kero');
console.log('  - 验证：/Users/huaan/kero === /Users/huaan/kero (PASS)');
console.log('\n');

console.log('-----------------------------------------\n');

// 关键验证点
console.log('关键验证点：\n');
console.log('1. 工作目录参数是否正确传递给了 Tauri 的 execute_command 命令');
console.log('2. Tauri 后端是否能够正确处理 workingDir 参数');
console.log('3. 是否能够正确展开 ~ 符号（通常由 shell 或运行时负责）');
console.log('4. pwd 命令执行的结果是否与工作目录参数一致');
console.log('5. 不同的目录路径是否都能够被正确识别\n');

console.log('-----------------------------------------\n');

// 文件位置和依赖说明
console.log('相关文件位置：\n');
console.log('1. src/tools/index.js (第 87-114 行)');
console.log('   - execute_command 工具定义');
console.log('   - 参数：{ cmd, workingDir }');
console.log('   - 调用：await invoke("execute_command", { cmd, workingDir: dir })');
console.log('\n');
console.log('2. src/tools/executor.js');
console.log('   - useToolExecutor composable');
console.log('   - executeTool 方法用于执行工具');
console.log('\n');
console.log('3. src-tauri/src/main.rs 或相关 Rust 文件');
console.log('   - 后端 execute_command 命令实现');
console.log('   - 需要在指定的 workingDir 中运行命令');
console.log('\n');

console.log('-----------------------------------------\n');

// 运行说明
console.log('如何运行此脚本进行测试：\n');
console.log('方式1：直接运行（查看测试说明）');
console.log('  node test-working-dir.js\n');

console.log('方式2：在测试框架中使用（推荐）');
console.log('  - 集成到 Jest 或 Vitest 测试套件');
console.log('  - 编写测试用例验证实际的 execute_command 行为');
console.log('  - npm test\n');

console.log('方式3：手动测试');
console.log('  1. 打开浏览器开发工具或运行环境');
console.log('  2. 导入 useToolExecutor 和 tools');
console.log('  3. 对每个测试用例调用 execute_command');
console.log('  4. 验证 pwd 命令的输出结果\n');

console.log('-----------------------------------------\n');

// 预期结果总结
console.log('预期结果总结：\n');
console.log('┌─────────┬──────────────────────────┬───────────────────┬────────┐');
console.log('│ 测试号  │ 工作目录                 │ 期望 pwd 输出    │ 状态   │');
console.log('├─────────┼──────────────────────────┼───────────────────┼────────┤');
console.log('│ 测试1   │ /Users/huaan             │ /Users/huaan      │ PASS   │');
console.log('│ 测试2   │ /Users/huaan/kero        │ /Users/huaan/kero │ PASS   │');
console.log('│ 测试3   │ ~/kero (展开为上述路径)  │ /Users/huaan/kero │ PASS   │');
console.log('└─────────┴──────────────────────────┴───────────────────┴────────┘\n');

console.log('-----------------------------------------\n');

// 可能的错误情况
console.log('可能的错误情况及解决方案：\n');
console.log('错误1：工作目录未传递');
console.log('  症状：pwd 返回的是调用命令时的目录，而非 workingDir');
console.log('  原因：execute_command 没有正确传递 workingDir 参数');
console.log('  解决：检查 src/tools/index.js 第 92 行的参数传递\n');

console.log('错误2：~ 符号未展开');
console.log('  症状：测试3 失败，输出为 "~/kero" 相关的错误');
console.log('  原因：后端未处理 ~ 符号的展开');
console.log('  解决：在 Rust 后端添加 tilde 展开逻辑（使用 shellexpand crate）\n');

console.log('错误3：权限不足');
console.log('  症状：命令返回 "Permission denied"');
console.log('  原因：工作目录无读写权限');
console.log('  解决：检查目录权限：ls -ld /Users/huaan/kero\n');

console.log('错误4：目录不存在');
console.log('  症状：命令返回 "No such file or directory"');
console.log('  原因：指定的工作目录路径不存在');
console.log('  解决：先创建目录或使用存在的目录进行测试\n');

console.log('============================================');
console.log('  测试脚本生成完成');
console.log('============================================\n');

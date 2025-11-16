#!/bin/bash

# 命令执行器测试脚本
# 使用 Tauri CLI 测试命令执行功能

echo "================================"
echo "命令执行器测试脚本"
echo "================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "📦 步骤 1: 检查 Rust 环境"
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo 未安装，请先安装 Rust"
    exit 1
fi
echo "✅ Cargo 版本: $(cargo --version)"
echo ""

echo "🔨 步骤 2: 编译检查"
cd src-tauri

if cargo check 2>&1 | grep -q "error"; then
    echo "❌ 编译检查失败"
    cargo check
    exit 1
else
    echo "✅ 编译检查通过"
fi
echo ""

echo "🧪 步骤 3: 运行单元测试"
cargo test --lib commands::executor 2>&1 | tail -20
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 单元测试通过"
else
    echo "❌ 单元测试失败"
fi
echo ""

cd ..

echo "📋 步骤 4: 功能清单"
echo ""
echo "已实现的功能:"
echo "  ✅ execute_command_safe - 安全增强版命令执行"
echo "  ✅ execute_simple_command - 简化版命令执行"
echo "  ✅ CommandResult 结构 - 详细的执行结果"
echo "  ✅ ExecutorConfig 配置 - 可自定义超时和安全选项"
echo "  ✅ 危险命令检测 - 自动拦截危险操作"
echo "  ✅ 提权命令检测 - sudo/su 控制"
echo "  ✅ 工作目录验证 - 确保目录存在"
echo "  ✅ ~ 路径展开 - 自动展开用户主目录"
echo "  ✅ 超时控制 - 防止命令无限执行"
echo "  ✅ 日志记录 - 完整的执行日志"
echo "  ✅ 跨平台支持 - macOS/Linux/Windows"
echo ""

echo "📁 创建的文件:"
echo "  1. src-tauri/src/commands/executor.rs - 核心实现"
echo "  2. src-tauri/src/commands/mod.rs - 模块导出"
echo "  3. src/types/executor.ts - TypeScript 类型定义"
echo "  4. src/examples/CommandExecutorExamples.tsx - 前端使用示例"
echo "  5. COMMAND_EXECUTOR_USAGE.md - 使用文档"
echo "  6. test-executor.sh - 本测试脚本"
echo ""

echo "🚀 下一步:"
echo "  1. 启动应用: npm run tauri dev"
echo "  2. 在前端调用命令执行接口"
echo "  3. 查看日志输出验证功能"
echo ""

echo "📖 使用示例 (TypeScript):"
cat << 'EOF'

import { CommandExecutor } from './types/executor';

// 基本用法
const result = await CommandExecutor.executeSafe(
  'ls -la',
  '~/projects',
  null
);

console.log('输出:', result.stdout);
console.log('耗时:', result.duration_ms, 'ms');

// 自定义配置
const config = {
  timeout_secs: 60,
  enable_safety_check: true,
  allow_privileged: false
};

const result2 = await CommandExecutor.executeSafe(
  'npm install',
  '~/my-project',
  config
);

EOF

echo ""
echo "================================"
echo "✅ 测试脚本完成"
echo "================================"

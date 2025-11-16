#!/bin/bash

# Claude Config Switcher 演示脚本

set -e

NODE_PATH=$(which node || echo "node")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$NODE_PATH $SCRIPT_DIR/claude-config-switcher.js"

echo "================================"
echo "Claude Code 配置切换工具 - 演示"
echo "================================"
echo ""

# 测试 1: 显示帮助
echo "【测试 1】显示帮助信息..."
$TOOL help
echo ""
echo "按 Enter 继续..."
read -r

# 测试 2: 列表（应该是空的）
echo "【测试 2】列出配置（初始应该是空）..."
$TOOL list
echo ""
echo "按 Enter 继续..."
read -r

# 测试 3: 显示当前配置（应该没有）
echo "【测试 3】显示当前配置（初始应该没有）..."
$TOOL show
echo ""

echo "================================"
echo "演示完成！"
echo "================================"
echo ""
echo "现在你可以尝试："
echo "  1. 添加配置: claude-switcher add"
echo "  2. 列出配置: claude-switcher list"
echo "  3. 切换配置: claude-switcher switch <name>"
echo "  4. 交互模式: claude-switcher interactive"
echo ""

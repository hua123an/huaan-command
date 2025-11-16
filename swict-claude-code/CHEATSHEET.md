# Claude Config Switcher - 速查表

## 🚀 快速命令

```bash
# 添加配置
ccs add
claude-switcher add         # 完整方式

# 列出配置
ccs list

# 切换配置
ccs switch <name>

# 删除配置
ccs remove <name>

# 显示当前配置
ccs show

# 交互式模式
ccs interactive

# 帮助信息
ccs help
```

## 📝 实际例子

### 添加 Anthropic 官方 API
```
$ ccs add
服务商名称: anthropic
API Base URL: https://api.anthropic.com
API Key: sk-ant-...
模型名称: claude-sonnet-4-5-20250929
✅ 服务商 "anthropic" 已成功添加
```

### 添加本地开发服务
```
$ ccs add
服务商名称: local
API Base URL: http://localhost:8000/v1
API Key: dev-key-123
模型名称: claude-3-sonnet
✅ 服务商 "local" 已成功添加
```

### 列出所有配置
```
$ ccs list

--- 已保存的服务商配置 ---

✅ [1] anthropic
    Base URL: https://api.anthropic.com
    Model: claude-sonnet-4-5-20250929
    API Key: sk-ant-...20929
    Added: 2024/11/2 23:30:00

  [2] local
    Base URL: http://localhost:8000/v1
    Model: claude-3-sonnet
    API Key: dev-key...123
    Added: 2024/11/2 23:31:00
```

### 切换配置
```
$ ccs switch local

--- 配置已切换 ---

服务商: local
Model: claude-3-sonnet
Base URL: http://localhost:8000/v1
```

### 查看当前配置
```
$ ccs show

--- 当前激活配置 ---

服务商名称: local
Model: claude-3-sonnet
Base URL: http://localhost:8000/v1
API Key: dev-key...123

配置文件位置:
  /Users/huaan/.claude/settings.json
```

## 💾 配置文件

### 服务商配置位置
```
~/.claude/model-switcher.json
```

### Claude Code 配置位置
```
~/.claude/settings.json
```

## ⌨️ 交互模式菜单

```
Claude Code 配置切换工具
==================================

当前激活: local
Model: claude-3-sonnet

请选择操作:
  1 - 列出所有配置
  2 - 添加新配置
  3 - 切换配置
  4 - 删除配置
  5 - 显示当前配置
  6 - 退出

请输入选择 (1-6): _
```

## 🔒 安全操作

### 限制配置文件权限
```bash
chmod 600 ~/.claude/model-switcher.json
```

### 备份配置
```bash
cp ~/.claude/model-switcher.json ~/.claude/model-switcher.json.backup
```

### 恢复配置
```bash
cp ~/.claude/model-switcher.json.backup ~/.claude/model-switcher.json
```

## 🆘 常见问题

| 问题 | 解决方案 |
|------|---------|
| 命令未找到 | `npm install -g /path/to/tool` |
| 权限被拒绝 | `chmod +x /path/to/bin/claude-switcher` |
| 配置未生效 | 重启 Claude Code |
| 忘记配置名 | 运行 `claude-switcher list` |

## 📂 文件结构

```
claude-config-switcher/
├── claude-config-switcher.js  ← 主程序
├── bin/
│   └── claude-switcher        ← 可执行脚本
├── package.json               ← NPM 配置
├── README.md                  ← 完整说明
├── GETTING_STARTED.md         ← 快速开始
├── PROJECT_INFO.md            ← 项目信息
├── CHEATSHEET.md              ← 本文件（速查表）
├── FIX_CONFIG.md              ← 问题修复
├── CONTRIBUTING.md            ← 贡献指南
├── ARCHITECTURE.md            ← 架构说明
├── SECURITY.md                ← 安全说明
└── demo.sh                    ← 演示脚本
```

## 🎯 工作流

```
1. npm install -g /path/to/claude-config-switcher
   ↓
2. claude-switcher add          (添加配置)
   ↓
3. claude-switcher list         (验证配置)
   ↓
4. claude-switcher switch <name>(切换配置)
   ↓
5. Claude Code 自动使用新配置
```

## 🏃 3步快速上手

```bash
# 1️⃣ 安装
npm install -g /path/to/claude-config-switcher

# 2️⃣ 添加配置
claude-switcher interactive

# 3️⃣ 切换使用
claude-switcher switch <你的配置名>
```

## ✨ 核心特性

✅ 支持任何 Anthropic API 兼容服务  
✅ 一键快速切换  
✅ 零外部依赖  
✅ 彩色交互界面  
✅ 配置安全存储  
✅ 跨平台支持  

## 📞 更多帮助

```bash
# 查看完整帮助
claude-switcher help

# 查看快速开始
cat GETTING_STARTED.md

# 查看详细指南
cat README.md

# 查看项目信息
cat PROJECT_INFO.md

# 查看架构说明
cat ARCHITECTURE.md

# 查看安全说明
cat SECURITY.md
```

## 📚 相关文档

- **快速上手** → [GETTING_STARTED.md](./GETTING_STARTED.md)
- **完整说明** → [README.md](./README.md)
- **项目信息** → [PROJECT_INFO.md](./PROJECT_INFO.md)
- **架构说明** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **安全说明** → [SECURITY.md](./SECURITY.md)
- **问题修复** → [FIX_CONFIG.md](./FIX_CONFIG.md)
- **贡献指南** → [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**记住这 7 个命令就能完全掌握工具！** 🎉

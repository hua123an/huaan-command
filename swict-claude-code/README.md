# Claude Code 配置切换工具

一个简单而强大的命令行工具，用于管理和切换 Claude Code 中不同的 Anthropic API 兼容服务商配置。

## 📋 文档导航

根据你的需求选择合适的文档：

| 文档 | 用途 | 预计阅读时间 |
|------|------|------------|
| **[GETTING_STARTED.md](./GETTING_STARTED.md)** | 快速开始使用 | 5分钟 |
| **[README.md](./README.md)** | 完整功能说明（当前文档） | 10分钟 |
| **[CHEATSHEET.md](./CHEATSHEET.md)** | 命令速查表 | 3分钟 |
| **[PROJECT_INFO.md](./PROJECT_INFO.md)** | 项目全貌和文件导航 | 10分钟 |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 技术架构说明 | 10分钟 |
| **[SECURITY.md](./SECURITY.md)** | 安全说明 | 5分钟 |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | 贡献指南 | 5分钟 |
| **[FIX_CONFIG.md](./FIX_CONFIG.md)** | 特定问题修复 | 5分钟 |

---

## ✨ 主要特性

- 📝 **轻松管理多个服务商配置** - 支持任何兼容 Anthropic API 的服务商
- 🔄 **一键切换配置** - 快速在不同服务商之间切换
- 🎨 **彩色交互界面** - 友好的命令行界面，支持交互式模式
- 💾 **持久化存储** - 配置安全保存到本地文件
- 🔐 **敏感信息安全** - API Key 被存储但不会在日志中完整显示
- ⚡ **零外部依赖** - 仅使用 Node.js 内置模块
- 🌐 **跨平台** - 支持 macOS、Linux、Windows

---

## 🚀 快速开始

### 安装

#### 方式 1: 全局安装（推荐）

```bash
cd /Users/huaan/swict-claude-code
npm install -g .
```

安装后，可以直接在任何地方使用 `claude-switcher` 命令。

#### 方式 2: 本地使用

```bash
node /Users/huaan/swict-claude-code/claude-config-switcher.js <命令> [选项]
```

或

```bash
/Users/huaan/swict-claude-code/bin/claude-switcher <命令> [选项]
```

#### 方式 3: 创建别名

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias claude-switcher="/Users/huaan/swict-claude-code/bin/claude-switcher"

# 重新加载配置
source ~/.bashrc  # 或 source ~/.zshrc
```

---

## 📦 项目结构

```
.
├── claude-config-switcher.js    # 主工具脚本 (~600行代码)
├── bin/
│   └── claude-switcher          # 可执行命令包装脚本
├── package.json                 # NPM 包配置
├── GETTING_STARTED.md           # 快速开始指南
├── README.md                    # 完整使用说明（本文件）
├── PROJECT_INFO.md              # 项目信息和导航
├── CHEATSHEET.md                # 命令速查表
├── FIX_CONFIG.md                # 问题修复说明
├── CONTRIBUTING.md              # 贡献指南
├── ARCHITECTURE.md              # 架构说明
├── SECURITY.md                  # 安全说明
└── demo.sh                      # 演示脚本
```

---

## 🔧 使用方法

### 命令行模式

#### 添加新的服务商配置

```bash
claude-switcher add
```

交互式输入服务商信息：
- 服务商名称（例: openai, azure, custom）
- API Base URL（例: https://api.openai.com/v1）
- API Key
- 模型名称（例: claude-sonnet-4-5-20250929）

#### 列出所有配置

```bash
claude-switcher list
```

显示所有已保存的服务商配置，✅ 标记表示当前激活的配置。

#### 切换到指定的服务商

```bash
claude-switcher switch <服务商名称>
```

示例：
```bash
claude-switcher switch openai
```

#### 删除指定的服务商配置

```bash
claude-switcher remove <服务商名称>
```

示例：
```bash
claude-switcher remove azure
```

#### 显示当前激活配置

```bash
claude-switcher show
```

显示当前激活服务商的详细信息。

#### 交互式模式

```bash
claude-switcher interactive
# 或简写
claude-switcher inter
claude-switcher i
```

进入交互式菜单，支持以下操作：
1. 列出所有配置
2. 添加新配置
3. 切换配置
4. 删除配置
5. 显示当前配置
6. 退出

#### 显示帮助信息

```bash
claude-switcher help
claude-switcher --help
claude-switcher -h
```

---

## 💾 配置文件

工具使用两个配置文件：

### 1. 服务商配置 (model-switcher.json)

**位置：** `~/.claude/model-switcher.json`

**作用：** 存储所有已添加的服务商信息

**示例：**
```json
{
  "providers": [
    {
      "name": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "sk-ant-xxxxxxxxxxxx",
      "model": "claude-sonnet-4-5-20250929",
      "createdAt": "2024-11-02T23:30:00.000Z"
    }
  ]
}
```

### 2. Claude Code 配置 (settings.json)

**位置：** `~/.claude/settings.json`

**作用：** Claude Code 的全局配置文件，工具会自动更新此文件

**示例：**
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "activeProvider": "anthropic",
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-xxxxxxxxxxxx",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
  }
}
```

---

## ⚙️ 工作原理

### 配置流程

```
┌─────────────────────────────────────────────────────────┐
│  claude-switcher 工作流程                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 用户运行 add 命令                                    │
│     ↓                                                   │
│  2. 交互式输入服务商信息                                 │
│     ↓                                                   │
│  3. 保存到 ~/.claude/model-switcher.json                 │
│                                                         │
│  ─── 切换时 ───                                         │
│                                                         │
│  1. 用户运行 switch <name> 命令                         │
│     ↓                                                   │
│  2. 从 model-switcher.json 读取配置                      │
│     ↓                                                   │
│  3. 更新 ~/.claude/settings.json                         │
│     ├─ 设置 model 字段                                   │
│     ├─ 设置 activeProvider 字段                         │
│     └─ 设置 env.ANTHROPIC_API_KEY                       │
│        和 env.ANTHROPIC_BASE_URL                        │
│     ↓                                                   │
│  4. Claude Code 自动读取新配置                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 详细步骤

**添加配置时：**
1. 工具将服务商信息保存到 `~/.claude/model-switcher.json`

**切换配置时：**
1. 读取选定服务商的信息
2. 更新 `~/.claude/settings.json` 中的 `model` 字段
3. 设置环境变量 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_BASE_URL`
4. Claude Code 会立即使用新配置

---

## 📊 支持的服务商

任何兼容 Anthropic API 的服务商都可以使用此工具，包括但不限于：

- ✅ Anthropic 官方 API
- ✅ OpenAI (通过 Anthropic 兼容端点)
- ✅ Microsoft Azure OpenAI
- ✅ 自建 Anthropic API 兼容服务
- ✅ 其他第三方 API 代理服务

### 常见配置示例

#### Anthropic 官方 API
```
服务商名称: anthropic
API Base URL: https://api.anthropic.com
API Key: sk-ant-...
模型名称: claude-sonnet-4-5-20250929
```

#### 自建兼容服务
```
服务商名称: local
API Base URL: http://localhost:8000/v1
API Key: your-local-key
模型名称: claude-3-sonnet
```

#### 代理服务
```
服务商名称: proxy
API Base URL: https://your-proxy.com/v1
API Key: proxy-key
模型名称: claude-sonnet-4-5-20250929
```

---

## 💡 高级用法

### 手动编辑配置文件

如果需要手动编辑配置：

```bash
nano ~/.claude/model-switcher.json
```

### 导出/备份配置

```bash
# 备份配置
cp ~/.claude/model-switcher.json ~/.claude/model-switcher.json.backup

# 恢复配置
cp ~/.claude/model-switcher.json.backup ~/.claude/model-switcher.json
```

### 设置文件权限

为了安全起见，限制配置文件的访问权限：

```bash
chmod 600 ~/.claude/model-switcher.json
chmod 600 ~/.claude/settings.json
```

---

## 🎯 使用场景

### 场景 1: 在多个服务商之间快速切换

```bash
# 添加多个配置
claude-switcher add  # 添加 anthropic
claude-switcher add  # 添加 azure
claude-switcher add  # 添加自建服务

# 快速切换
claude-switcher switch azure     # 切换到 Azure
claude-switcher switch anthropic # 切换回 Anthropic
```

### 场景 2: 管理开发和生产配置

```bash
# 添加开发环境
claude-switcher add
# 名称: dev, URL: http://localhost:8000, ...

# 添加生产环境
claude-switcher add
# 名称: prod, URL: https://api.anthropic.com, ...

# 需要时快速切换
claude-switcher switch dev   # 开发时用
claude-switcher switch prod  # 部署前用
```

### 场景 3: 使用交互模式

```bash
claude-switcher interactive
# 进入菜单，逐步选择操作
```

---

## 🔍 常见问题

### Q: API Key 是否安全存储？
A: API Key 存储在 `~/.claude/model-switcher.json` 中。请确保此文件的访问权限受限。建议使用 `chmod 600` 来限制文件访问权限。

### Q: 如何手动编辑配置？
A: 配置文件是 JSON 格式，可以直接编辑：
```bash
nano ~/.claude/model-switcher.json
```

### Q: 如何清除当前配置？
A: 删除配置文件即可：
```bash
rm ~/.claude/model-switcher.json
```

### Q: 工具如何与 Claude Code 集成？
A: 当你切换配置时，工具会更新 `~/.claude/settings.json`。Claude Code 会自动读取此文件，因此配置会立即生效（可能需要重启 Claude Code）。

### Q: 命令未找到怎么办？
A:
```bash
# 重新安装
npm install -g /Users/huaan/swict-claude-code

# 或者检查 npm 全局目录
npm config get prefix
# 确保该目录在 PATH 中
```

### Q: 权限被拒绝怎么办？
A:
```bash
# 使脚本可执行
chmod +x /Users/huaan/swict-claude-code/bin/claude-switcher

# 或者用 node 直接运行
node /Users/huaan/swict-claude-code/claude-config-switcher.js
```

### Q: 配置没有立即生效怎么办？
A:
1. 确认 `settings.json` 已更新：`claude-switcher show`
2. 重启 Claude Code
3. 重新连接到 Claude Code

---

## 🔧 技术规格

- **语言**: JavaScript (Node.js)
- **依赖**: 仅使用 Node.js 内置模块 (fs, path, os, readline)
- **最低 Node 版本**: 14.0.0
- **支持平台**: macOS、Linux、Windows
- **文件大小**: ~13KB (主脚本)
- **性能**: <100ms 切换时间

---

## 📝 示例工作流

```bash
# 1. 添加 OpenAI 配置
claude-switcher add
# 输入: openai, https://api.openai.com/v1, your-api-key, gpt-4

# 2. 添加 Azure 配置
claude-switcher add
# 输入: azure, https://your-resource.openai.azure.com/v1, your-key, deployment-name

# 3. 列出所有配置
claude-switcher list
# 输出:
#   [1] openai
#       Base URL: https://api.openai.com/v1
#       Model: gpt-4
#
#   [2] azure
#       Base URL: https://your-resource.openai.azure.com/v1
#       Model: deployment-name

# 4. 切换到 Azure
claude-switcher switch azure

# 5. 验证当前配置
claude-switcher show
# 输出:
#   当前激活配置
#   服务商名称: azure
#   Model: deployment-name
#   Base URL: https://your-resource.openai.azure.com/v1
```

---

## 🛡️ 安全说明

### 安全最佳实践

1. **保护配置文件**
   ```bash
   chmod 600 ~/.claude/model-switcher.json
   chmod 600 ~/.claude/settings.json
   ```

2. **不要提交配置文件到版本控制**
   ```bash
   # 如果使用 git，添加到 .gitignore
   echo ".claude/" >> .gitignore
   ```

3. **使用 API Key 环境变量**
   对于自动化脚本，考虑使用环境变量而不是直接在配置中硬编码：
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   export ANTHROPIC_BASE_URL="https://api.anthropic.com"
   claude-switcher add
   ```

详细安全说明请参考 [SECURITY.md](./SECURITY.md)

---

## 💻 开发

```bash
# 查看源代码
cat /Users/huaan/swict-claude-code/claude-config-switcher.js

# 测试
node /Users/huaan/swict-claude-code/claude-config-switcher.js --help
```

---

## 🤝 贡献

欢迎提交 issue 和 PR！

详细贡献指南请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📚 相关资源

- [Claude Code 官方文档](https://docs.claude.com/en/docs/claude-code/)
- [Anthropic API 文档](https://docs.anthropic.com/)
- [Node.js 官方文档](https://nodejs.org/docs/)

---

## 📄 许可证

MIT License

---

## 🎓 需要帮助？

需要帮助？运行以下命令查看更多信息：

```bash
# 显示所有命令
claude-switcher help

# 查看快速开始
cat /Users/huaan/swict-claude-code/GETTING_STARTED.md

# 查看命令速查
cat /Users/huaan/swict-claude-code/CHEATSHEET.md

# 查看架构说明
cat /Users/huaan/swict-claude-code/ARCHITECTURE.md
```

---

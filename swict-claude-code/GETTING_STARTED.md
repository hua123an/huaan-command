# 🚀 Claude Code 配置切换工具 - 快速开始

一个简单而强大的命令行工具，用于管理 Claude Code 中的多个 API 服务商配置。

## ✨ 主要特性

- 📝 **轻松管理多个配置** - 支持任何兼容 Anthropic API 的服务商
- 🔄 **一键切换** - 快速在不同服务商之间切换
- 🎨 **彩色交互界面** - 支持命令行和交互式两种模式
- 💾 **持久化存储** - 配置安全保存到本地
- 🔐 **安全保护** - API Key 安全存储，敏感信息不外泄
- ⚡ **零依赖** - 仅使用 Node.js 内置模块
- 🌐 **跨平台** - 支持 macOS、Linux、Windows

---

## 📖 3分钟快速开始

### 第1步：安装工具

```bash
npm install -g /Users/huaan/swict-claude-code

# 验证安装
claude-switcher --help
```

### 第2步：添加配置

```bash
# 推荐新手使用交互模式
claude-switcher interactive

# 或者直接添加配置
claude-switcher add
```

按提示输入你的服务商信息：

```
服务商名称: anthropic
API Base URL: https://api.anthropic.com
API Key: sk-ant-xxxxxxxxxxxx
模型名称: claude-sonnet-4-5-20250929
```

### 第3步：使用工具

```bash
# 查看所有配置
claude-switcher list

# 切换到某个配置
claude-switcher switch anthropic

# 查看当前配置
claude-switcher show
```

**完成！现在你可以轻松切换不同的服务商配置了！** 🎉

---

## ⌨️ 7个核心命令

```bash
# 添加新的服务商配置（简写和完整方式）
ccs add
claude-switcher add

# 列出所有已保存的配置
ccs list

# 切换到指定的服务商
ccs switch <name>

# 删除指定的服务商
ccs remove <name>

# 显示当前激活的配置
ccs show

# 进入交互式菜单（推荐新手使用）
ccs interactive

# 显示帮助信息
ccs help
```

---

## 📋 完整命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `add` | 交互式添加新配置 | `claude-switcher add` |
| `list` | 列出所有配置 | `claude-switcher list` |
| `switch <name>` | 切换到指定配置 | `claude-switcher switch openai` |
| `remove <name>` | 删除配置 | `claude-switcher remove openai` |
| `show` | 显示当前配置 | `claude-switcher show` |
| `interactive` | 进入交互模式 | `claude-switcher interactive` |
| `help` | 显示帮助 | `claude-switcher help` |

---

## 💡 常见使用场景

### 场景1：在开发和生产之间切换

```bash
# 添加两个配置
claude-switcher add  # 开发环境
claude-switcher add  # 生产环境

# 快速切换
claude-switcher switch dev
# ... 开发和测试 ...
claude-switcher switch prod
# ... 生产环境 ...
```

### 场景2：支持多个 API 服务商

```bash
# 添加多个配置
claude-switcher add  # Anthropic 官方
claude-switcher add  # 自建服务
claude-switcher add  # 代理服务

# 根据需要切换
claude-switcher list
claude-switcher switch custom
```

### 场景3：团队协作

```bash
# 每个人添加自己的配置
claude-switcher add

# 快速切换到团队环境
claude-switcher switch team-dev
claude-switcher switch team-prod
```

---

## 🔧 配置文件

工具使用以下配置文件（自动创建）：

- **`~/.claude/model-switcher.json`** - 存储你添加的服务商配置
- **`~/.claude/settings.json`** - Claude Code 的全局配置文件

### 配置文件示例

**model-switcher.json**：
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

---

## 🛠️ 工作原理

```
你的操作                 工具处理              Claude Code
───────────           ─────────────         ──────────────
添加配置  ────→ 保存到 model-switcher.json
                (保存完成)

切换配置  ────→ 更新 settings.json  ────→  自动读取新配置
            → 设置环境变量
```

---

## 🆘 故障排除

### 问题：命令未找到

```bash
# 重新安装
npm install -g /Users/huaan/swict-claude-code
```

### 问题：权限被拒绝

```bash
# 使脚本可执行
chmod +x /Users/huaan/swict-claude-code/bin/claude-switcher
```

### 问题：配置没有立即生效

1. 确认配置已更新：`claude-switcher show`
2. 重启 Claude Code
3. 重新连接

### 问题：API Key 没有正确保存

**检查方法：**
```bash
cat ~/.claude/model-switcher.json
```

如果文件损坏，删除它并重新添加：
```bash
rm ~/.claude/model-switcher.json
claude-switcher add
```

### 问题：切换配置后 Claude Code 仍然使用旧配置

**解决方案：**
- 重启 Claude Code 或重新连接
- 确保 `~/.claude/settings.json` 已正确更新：
```bash
cat ~/.claude/settings.json
```

---

## 🔒 安全建议

### 保护配置文件

```bash
# 限制文件权限，只有当前用户可读写
chmod 600 ~/.claude/model-switcher.json
chmod 600 ~/.claude/settings.json
```

### 备份配置

```bash
# 备份配置
cp ~/.claude/model-switcher.json ~/.claude/model-switcher.json.backup

# 恢复配置
cp ~/.claude/model-switcher.json.backup ~/.claude/model-switcher.json
```

---

## 📚 支持的服务商

任何兼容 Anthropic API 的服务商都可以使用：

- ✅ Anthropic 官方 API
- ✅ OpenAI (兼容端点)
- ✅ Microsoft Azure OpenAI
- ✅ 自建 Anthropic API 兼容服务
- ✅ 第三方 API 代理服务

---

## 📖 相关文档

- **完整说明** → [README.md](./README.md)
- **命令速查** → [CHEATSHEET.md](./CHEATSHEET.md)
- **项目信息** → [PROJECT_INFO.md](./PROJECT_INFO.md)
- **问题修复** → [FIX_CONFIG.md](./FIX_CONFIG.md)

---

## 🎓 需要更多帮助？

- **快速参考** → 运行 `claude-switcher help`
- **安装指南** → 查看 [README.md](./README.md) 的安装部分
- **架构说明** → 查看 [ARCHITECTURE.md](./ARCHITECTURE.md)
- **贡献指南** → 查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🎉 现在就开始！

```bash
# 1. 安装
npm install -g /Users/huaan/swict-claude-code

# 2. 运行帮助
claude-switcher help

# 3. 添加你的第一个配置
claude-switcher interactive

# 4. 开始使用！
claude-switcher list
```

**祝你使用愉快！** 🚀

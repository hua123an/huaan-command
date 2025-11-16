# Claude Code 配置问题修复说明

## 问题描述

使用配置切换工具完成配置切换后，Claude Code 无法获取到配置信息，显示 "Missing API key" 错误。

## 问题原因

Claude Code 优先读取环境变量，如果环境变量不存在，才会读取配置文件 `~/.claude/settings.json`。原来的工具只更新了配置文件，但没有：

1. **在启动 Claude Code 时传递环境变量** - 当工具启动 Claude Code 时，没有将配置信息作为环境变量传递
2. **设置当前进程的环境变量** - 切换配置时没有设置当前 shell 的环境变量

## 解决方案

已修复以下问题：

### 1. 启动 Claude Code 时传递环境变量

修改了 `launchClaudeCode()` 函数，现在会在启动 Claude Code 时传递环境变量：

```javascript
const env = {
  ...process.env,
  ANTHROPIC_API_KEY: claudeSettings.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: claudeSettings.ANTHROPIC_BASE_URL || ''
};
execSync('claude --dangerously-skip-permissions', { stdio: 'inherit', env });
```

### 2. 切换配置时设置环境变量

修改了 `switchProvider()` 函数，现在会在切换配置时设置当前进程的环境变量：

```javascript
process.env.ANTHROPIC_API_KEY = provider.apiKey;
process.env.ANTHROPIC_BASE_URL = provider.baseUrl;
```

### 3. 支持 Model 字段

如果 provider 配置中包含 `model` 字段，现在也会保存到 `settings.json` 中。

## 使用方法

### 方式 1: 使用工具直接启动（推荐）

直接运行工具（无参数），选择配置后会自动启动 Claude Code，环境变量会自动传递：

```bash
claude-switcher
# 或
ccs
```

### 方式 2: 先切换配置，再手动启动

```bash
# 切换配置
claude-switcher switch <配置名>

# 手动启动 Claude Code（需要重启才能读取新配置）
claude --dangerously-skip-permissions
```

**注意**：如果使用方式 2，可能需要重启 Claude Code 才能读取新的配置文件。

### 方式 3: 手动设置环境变量

如果 Claude Code 仍然无法读取配置，可以手动设置环境变量：

```bash
# 查看当前配置
claude-switcher show

# 手动设置环境变量（根据输出结果）
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_BASE_URL="your-base-url"

# 启动 Claude Code
claude --dangerously-skip-permissions
```

## 验证配置

切换配置后，可以运行以下命令验证：

```bash
# 查看配置
claude-switcher show

# 检查配置文件
cat ~/.claude/settings.json

# 检查环境变量（如果使用方式 1 启动）
echo $ANTHROPIC_API_KEY
echo $ANTHROPIC_BASE_URL
```

## 故障排除

### 问题：Claude Code 仍然显示 "Missing API key"

**解决方案**：
1. 确认配置文件已正确更新：`cat ~/.claude/settings.json`
2. 重启 Claude Code
3. 使用方式 1（工具直接启动）以确保环境变量正确传递
4. 如果问题仍然存在，手动设置环境变量（方式 3）

### 问题：配置文件存在但 Claude Code 无法读取

**可能原因**：
- Claude Code 读取配置文件的优先级：环境变量 > 配置文件
- 如果环境变量存在但值不正确，Claude Code 会优先使用环境变量

**解决方案**：
1. 检查环境变量：`env | grep ANTHROPIC`
2. 清除可能冲突的环境变量
3. 确保配置文件格式正确（JSON 格式）

## 配置文件格式

正确的 `~/.claude/settings.json` 格式：

```json
{
  "ANTHROPIC_API_KEY": "your-api-key",
  "ANTHROPIC_BASE_URL": "https://api.example.com",
  "activeProvider": "provider-name",
  "model": "claude-sonnet-4-5-20250929"
}
```

## 更新日志

- **2025-11-03**: 修复环境变量传递问题，确保 Claude Code 能够正确读取配置

---

## 📚 相关文档

- **完整说明** → [README.md](./README.md)
- **快速开始** → [GETTING_STARTED.md](./GETTING_STARTED.md)
- **安全说明** → [SECURITY.md](./SECURITY.md)
- **架构说明** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **命令速查** → [CHEATSHEET.md](./CHEATSHEET.md)
- **项目信息** → [PROJECT_INFO.md](./PROJECT_INFO.md)


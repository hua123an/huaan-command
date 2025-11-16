# Claude Code 配置信息快速查看表

## 🔑 当前活跃配置

| 配置项       | 值                                 |
| ------------ | ---------------------------------- |
| **提供商**   | minimax (豆包)                     |
| **API 端点** | https://api.minimaxi.com/anthropic |
| **模型**     | doubao-seed-code-preview-latest    |
| **认证方式** | JWT Token                          |
| **深度思考** | ✅ 启用                            |
| **超时时间** | 3000000 ms (50分钟)                |

---

## 📋 环境变量

### env 对象内的变量

```
ANTHROPIC_AUTH_TOKEN      → JWT Token (认证令牌)
ANTHROPIC_BASE_URL        → https://api.minimaxi.com/anthropic
ANTHROPIC_MODEL           → doubao-seed-code-preview-latest
API_TIMEOUT_MS            → 3000000
```

### 顶级字段（向后兼容）

```
ANTHROPIC_API_KEY         → JWT Token (同上)
ANTHROPIC_BASE_URL        → https://api.minimaxi.com/anthropic (同上)
activeProvider            → minimax
```

---

## 📂 配置文件详情

| 属性         | 值                        |
| ------------ | ------------------------- |
| **文件路径** | ~/.claude/settings.json   |
| **位置**     | 用户主目录 .claude 文件夹 |
| **文件格式** | JSON                      |
| **大小**     | ~2KB                      |
| **编码**     | UTF-8                     |

---

## 🏗️ minimax 提供商

| 特性         | 说明                          |
| ------------ | ----------------------------- |
| **名称**     | minimax (豆包)                |
| **类型**     | 国内 API 服务                 |
| **兼容性**   | 完全兼容 Anthropic Claude API |
| **模型系列** | doubao (豆包)                 |
| **特性**     | 代码生成、流式输出、深度思考  |
| **优势**     | 国内高速访问、成本低          |

---

## 🎯 项目集成情况

### 后端集成

| 组件         | 文件                           | 说明           |
| ------------ | ------------------------------ | -------------- |
| **配置管理** | src-tauri/src/claude_config.rs | Rust 后端实现  |
| **命令注册** | src-tauri/src/lib.rs           | Tauri IPC 命令 |
| **数据模型** | ClaudeProvider                 | 提供商数据结构 |

### 前端集成

| 组件         | 文件                                 | 说明         |
| ------------ | ------------------------------------ | ------------ |
| **状态管理** | src/stores/claudeConfig.js           | Pinia Store  |
| **UI 组件**  | src/components/ClaudeConfigModal.vue | 配置管理界面 |
| **导航集成** | src/components/Navigation.vue        | 导航栏按钮   |

---

## 🛠️ 可用操作

| 操作     | Tauri 命令                    | 说明               |
| -------- | ----------------------------- | ------------------ |
| 加载配置 | `load_claude_providers`       | 获取所有提供商     |
| 获取当前 | `get_current_claude_provider` | 获取活跃提供商信息 |
| 添加配置 | `add_claude_provider`         | 添加新的提供商     |
| 切换配置 | `switch_claude_provider`      | 切换到指定提供商   |
| 删除配置 | `remove_claude_provider`      | 删除指定提供商     |
| 验证密钥 | `validate_claude_api_key`     | 验证 API Key 格式  |

---

## 📊 配置字段定义

### ClaudeProvider 结构 (Rust)

```rust
pub struct ClaudeProvider {
    pub name: String,              // 提供商名称
    pub base_url: String,          // API 基础 URL
    pub api_key: String,           // API 密钥
    pub model: String,             // 模型名称
    pub created_at: String,        // 创建时间 (RFC3339)
}
```

### 存储结构 (JSON)

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "string",
    "ANTHROPIC_BASE_URL": "string",
    "API_TIMEOUT_MS": "string",
    "ANTHROPIC_MODEL": "string"
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "alwaysThinkingEnabled": boolean,
  "ANTHROPIC_API_KEY": "string",
  "ANTHROPIC_BASE_URL": "string",
  "activeProvider": "string",
  "providers": [
    {
      "name": "string",
      "base_url": "string",
      "api_key": "string",
      "model": "string",
      "created_at": "string"
    }
  ]
}
```

---

## 🔐 安全建议

| 项           | 建议                              | 优先级 |
| ------------ | --------------------------------- | ------ |
| **文件权限** | chmod 600 ~/.claude/settings.json | 🔴 高  |
| **密钥管理** | 定期更新 JWT Token                | 🟡 中  |
| **备份**     | 定期备份 settings.json            | 🟡 中  |
| **加密**     | 考虑加密敏感字段                  | 🟢 低  |

---

## 📱 快速命令参考

### 查看配置

```bash
# 查看完整配置
cat ~/.claude/settings.json | jq '.'

# 只看活跃提供商
cat ~/.claude/settings.json | jq '.activeProvider'

# 看 API 信息
cat ~/.claude/settings.json | jq '.env'

# 看权限信息
cat ~/.claude/settings.json | jq '.permissions'
```

### 修改文件权限

```bash
# 提高安全性
chmod 600 ~/.claude/settings.json
```

### 更新配置

```bash
# 用 jq 修改 (示例)
cat ~/.claude/settings.json | jq '.alwaysThinkingEnabled = false' > /tmp/new.json
mv /tmp/new.json ~/.claude/settings.json
```

---

## 🎓 配置说明

### activeProvider

- **说明**：指定当前活跃的 Claude Code 提供商
- **当前值**：minimax
- **类型**：string

### ANTHROPIC_API_KEY

- **说明**：用于 API 认证的 JWT Token
- **类型**：string (加密或编码)
- **必需**：✅ 是

### ANTHROPIC_BASE_URL

- **说明**：API 服务的基础 URL
- **当前值**：https://api.minimaxi.com/anthropic
- **类型**：string (URL)
- **必需**：✅ 是

### alwaysThinkingEnabled

- **说明**：是否启用深度思考模式
- **当前值**：true
- **类型**：boolean
- **影响**：启用后会增加处理时间但可得到更深度的思考

### API_TIMEOUT_MS

- **说明**：API 请求超时时间（毫秒）
- **当前值**：3000000 (50分钟)
- **类型**：string (数字)
- **用途**：处理长时间的代码生成和思考任务

---

## 📈 配置演变

| 阶段   | 提供商  | 模型                            | 日期       |
| ------ | ------- | ------------------------------- | ---------- |
| 初始化 | minimax | doubao-seed-code-preview-latest | 2025-11-02 |

---

## ✨ 特殊信息

### minimax 模型特点

🎯 **doubao-seed-code-preview-latest**

- 专为代码生成优化
- 支持预览和 Seed 功能
- 最新的预览版本
- 提供持续更新和改进

### JWT Token 说明

当前的 JWT Token 包含信息：

- 用户组名称
- 用户名
- 账户 ID
- 电话号码
- 创建时间
- Token 类型：1 (标准类型)
- 签发者：minimax

### 深度思考模式

启用 `alwaysThinkingEnabled` 后：

- ✅ Claude 会进行深度思考
- ⏱️ 处理时间增加
- 📝 生成质量提升
- 💭 适合复杂问题解答

---

## 🔗 相关资源

- 📖 [Claude 配置详细指南](./CLAUDE_CONFIG_INVENTORY.md)
- 📖 [项目完成报告](./CLAUDE_CONFIG_PROJECT_COMPLETION_REPORT.md)
- 📖 [参数命名修复](./CLAUDE_CONFIG_PARAMETER_FIX.md)
- 📖 [测试指南](./CLAUDE_CONFIG_TEST_GUIDE.md)

---

**最后更新：** 2025-11-16  
**配置版本：** 1.0  
**状态：** ✅ 活跃

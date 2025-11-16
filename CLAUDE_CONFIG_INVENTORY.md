# Claude Code 配置信息清单

## 📋 系统当前配置

### 1️⃣ 主要信息

| 配置项              | 值                                 | 说明                              |
| ------------------- | ---------------------------------- | --------------------------------- |
| **活跃提供商**      | minimax                            | 当前正在使用的 Claude Code 提供商 |
| **API 基础 URL**    | https://api.minimaxi.com/anthropic | minimax 的 API 端点               |
| **模型**            | doubao-seed-code-preview-latest    | 当前使用的AI模型                  |
| **Always Thinking** | true                               | 启用深度思考功能                  |
| **API 超时**        | 3000000 ms (50分钟)                | API 请求超时设置                  |

---

## 🔐 认证信息

### 2️⃣ 环境变量 (env 字段)

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "JWT Token (已掩盖)",
    "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_MODEL": "doubao-seed-code-preview-latest"
  }
}
```

### 3️⃣ 顶级认证字段

```json
{
  "ANTHROPIC_API_KEY": "JWT Token (已掩盖)",
  "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
  "activeProvider": "minimax"
}
```

---

## 📦 配置文件位置

**文件位置：** `~/.claude/settings.json`

**文件大小：** ~2KB

**更新时间：** 2025-11-02 23:00:48

---

## 🔑 配置字段详解

### 必要字段

| 字段                 | 值      | 必需 | 说明                 |
| -------------------- | ------- | ---- | -------------------- |
| `activeProvider`     | minimax | ✅   | 指定当前活跃的提供商 |
| `ANTHROPIC_API_KEY`  | JWT     | ✅   | API 认证密钥         |
| `ANTHROPIC_BASE_URL` | URL     | ✅   | API 基础地址         |

### 可选字段

| 字段                    | 值      | 可选 | 说明             |
| ----------------------- | ------- | ---- | ---------------- |
| `ANTHROPIC_MODEL`       | 模型名  | ⭕   | 指定使用的模型   |
| `alwaysThinkingEnabled` | boolean | ⭕   | 启用深度思考模式 |
| `env`                   | 对象    | ⭕   | 环境变量集合     |
| `permissions`           | 对象    | ⭕   | 权限配置         |

---

## 🏢 提供商信息

### 当前提供商：minimax

- **提供商名称：** minimax
- **API 端点：** https://api.minimaxi.com/anthropic
- **模型：** doubao-seed-code-preview-latest
- **类型：** 兼容 Anthropic API 的第三方提供商

### Minimax 特性

✅ 兼容 Claude API  
✅ 国内高速访问  
✅ 支持流式输出  
✅ 支持思考模式

---

## 📝 配置文件完整结构

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "eyJhbGc...", // JWT 令牌
    "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
    "API_TIMEOUT_MS": "3000000", // 毫秒
    "ANTHROPIC_MODEL": "doubao-seed-code-preview-latest"
  },
  "permissions": {
    "allow": [], // 允许列表
    "deny": [] // 禁止列表
  },
  "alwaysThinkingEnabled": true, // 启用深度思考
  "ANTHROPIC_API_KEY": "eyJhbGc...", // 顶级 API Key
  "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic", // 顶级 URL
  "activeProvider": "minimax" // 活跃提供商
}
```

---

## 🛠️ 本项目配置集成

### Tauri 后端配置

**文件：** `src-tauri/src/claude_config.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeProvider {
    pub name: String,              // 提供商名称
    pub base_url: String,          // API 基础 URL
    pub api_key: String,           // API 密钥
    pub model: String,             // 模型名称
    pub created_at: String,        // 创建时间
}
```

### Pinia 前端状态管理

**文件：** `src/stores/claudeConfig.js`

```javascript
export const useClaudeConfigStore = defineStore('claudeConfig', () => {
  const providers = ref([]) // 所有提供商列表
  const activeProvider = ref(null) // 当前活跃提供商
  const isLoading = ref(false) // 加载状态
  const error = ref(null) // 错误信息

  // 方法
  async function loadProviders() {}
  async function addProvider(provider) {}
  async function switchProvider(name) {}
  async function removeProvider(name) {}
})
```

---

## 🔄 配置操作流程

### 1. 加载现有配置

```
~/.claude/settings.json
       ↓
  后端读取
       ↓
  解析为 ClaudeProvider
       ↓
  前端显示
```

### 2. 切换提供商

```
用户选择新提供商
       ↓
  后端验证
       ↓
  更新 settings.json
       ↓
  更新环境变量
       ↓
  生成 .env.claude
```

### 3. 添加新提供商

```
用户填写表单
       ↓
  前端验证
       ↓
  后端添加到 providers 数组
       ↓
  保存到 settings.json
       ↓
  重新加载配置
```

---

## 📊 minimax 模型信息

### 使用的模型

```
模型名称：doubao-seed-code-preview-latest
提供商：豆包 (MiniMax)
类型：代码补全和生成
特点：针对代码场景优化
```

### API 超时配置

```
超时时间：3000000 毫秒
= 3000 秒
= 50 分钟
```

用于处理长时间的代码生成和深度思考任务。

---

## ⚙️ 环保设置

### 权限配置

```json
"permissions": {
  "allow": [],  // 当前无具体允许项
  "deny": []    // 当前无具体禁止项
}
```

用于将来的权限管理扩展。

---

## 🎯 快速参考

### 查看当前配置

```bash
cat ~/.claude/settings.json | jq '.'
```

### 查看活跃提供商

```bash
cat ~/.claude/settings.json | jq '.activeProvider'
# 输出: "minimax"
```

### 查看 API 信息

```bash
cat ~/.claude/settings.json | jq '{
  provider: .activeProvider,
  baseUrl: .ANTHROPIC_BASE_URL,
  model: .env.ANTHROPIC_MODEL
}'
```

### 查看环境变量

```bash
cat ~/.claude/settings.json | jq '.env'
```

---

## 🔗 相关文件

| 文件                                   | 说明               |
| -------------------------------------- | ------------------ |
| `~/.claude/settings.json`              | Claude 配置文件    |
| `~/.claude/.env.claude`                | 生成的环保变量文件 |
| `src-tauri/src/claude_config.rs`       | 后端配置管理       |
| `src/stores/claudeConfig.js`           | 前端状态管理       |
| `src/components/ClaudeConfigModal.vue` | 配置管理 UI        |

---

## 📈 配置版本历史

| 时间       | 提供商  | 模型                            | 备注     |
| ---------- | ------- | ------------------------------- | -------- |
| 2025-11-02 | minimax | doubao-seed-code-preview-latest | 初始配置 |

---

## 🚀 本项目中的使用

### 前端调用

```javascript
// 加载所有提供商
const providers = await invoke('load_claude_providers')

// 获取当前配置
const current = await invoke('get_current_claude_provider')

// 切换提供商
await invoke('switch_claude_provider', { providerName: 'minimax' })
```

### 后端处理

```rust
// 加载配置
ClaudeConfigManager::load_providers()

// 切换配置
ClaudeConfigManager::switch_provider(provider_name)

// 添加配置
ClaudeConfigManager::add_provider(provider)
```

---

## ✨ 特殊说明

### JWT Token 格式

当前使用的是 minimax 的 JWT Token，包含：

- 用户组信息
- 用户名
- 账户 ID
- 电话号码
- 时间戳
- Token 类型

### API 兼容性

minimax 完全兼容 Anthropic Claude API，因此可以使用相同的 API 调用方式。

### 深度思考模式

`alwaysThinkingEnabled: true` 表示启用深度思考，Claude 会在回答前进行深层思考。

---

**最后更新：** 2025-11-16  
**配置状态：** ✅ 活跃  
**是否加密：** ⭕ 否（建议配置文件权限为 600）

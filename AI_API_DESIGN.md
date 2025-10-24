# 🤖 AI API 设计文档

## 概述

Huaan Command 的 AI 功能采用统一的 API 设计，基于 **OpenAI SDK**，支持多个 AI 服务商。

### ✨ 核心特性

- **统一接口** - 单一 `callAI()` 方法处理所有 AI 调用
- **OpenAI SDK** - 使用官方 SDK，稳定可靠
- **多服务商** - 支持 OpenAI、DeepSeek、Kimi 等
- **流式输出** - 原生支持 SSE 流式响应
- **自动重连** - 配置变更时自动重新初始化
- **类型安全** - 清晰的参数和返回类型

---

## 架构设计

### 三层架构

```
┌─────────────────────────────────────┐
│  应用层 (Application Layer)          │
│  - generateCommand()                 │
│  - diagnoseError()                   │
│  - chat()                            │
│  - analyzeProject()                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  核心层 (Core Layer)                 │
│  - callAI()  (统一接口)              │
│  - 流式处理                          │
│  - 错误处理                          │
│  - 统计收集                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  基础层 (Infrastructure Layer)       │
│  - OpenAI SDK                        │
│  - 客户端管理                        │
│  - 配置管理                          │
└─────────────────────────────────────┘
```

---

## 核心 API

### 1. `callAI()` - 统一 AI 调用接口

**签名**：
```javascript
async function callAI(messages, options = {})
```

**参数**：
```javascript
{
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: '...' }
  ],
  options: {
    stream: false,        // 是否流式输出
    onStream: null,       // 流式回调函数
    temperature: 0.7,     // 温度参数
    maxTokens: 2000,      // 最大 token 数
    model: 'gpt-4o-mini'  // 覆盖默认模型
  }
}
```

**返回值**：
```javascript
// 非流式
return 'AI 生成的内容'

// 流式（通过 onStream 回调）
onStream(delta, fullContent)
```

**示例**：
```javascript
// 简单调用
const response = await callAI([
  { role: 'system', content: '你是一个助手' },
  { role: 'user', content: '你好' }
])

// 流式调用
let fullText = ''
await callAI(messages, {
  stream: true,
  onStream: (delta, full) => {
    fullText = full
    console.log(delta) // 逐字输出
  }
})
```

---

## 应用层 API

### 2. `generateCommand()` - 命令生成

**用途**：根据自然语言描述生成 Shell 命令

**签名**：
```javascript
async function generateCommand(description, options = {})
```

**示例**：
```javascript
const command = await generateCommand('列出所有进程')
// 返回: "ps aux"

// 流式输出
await generateCommand('查找大文件', {
  stream: true,
  onStream: (delta, full) => {
    terminal.write(delta)
  }
})
```

**特点**：
- Temperature: 0.3（较低，保证准确性）
- MaxTokens: 200（命令通常较短）
- 系统提示：专注于命令生成，安全优先

---

### 3. `diagnoseError()` - 错误诊断

**用途**：分析错误信息并提供解决方案

**签名**：
```javascript
async function diagnoseError(errorMessage, context = '')
```

**示例**：
```javascript
const solution = await diagnoseError(
  'Error: ENOENT: no such file or directory',
  'npm install 时发生'
)
```

**返回格式**：
```
1. 错误原因（简短）
2. 解决方案（具体步骤）
3. 预防建议（可选）
```

**特点**：
- Temperature: 0.5（中等，平衡创造性和准确性）
- MaxTokens: 1000
- 包含上下文信息

---

### 4. `analyzeLogs()` - 日志分析

**用途**：分析日志文件，提取关键信息

**签名**：
```javascript
async function analyzeLogs(logs)
```

**示例**：
```javascript
const analysis = await analyzeLogs(terminalOutput)
```

**分析重点**：
- 错误和警告
- 性能问题
- 异常模式
- 优化建议

---

### 5. `chat()` - 聊天对话

**用途**：与 AI 进行多轮对话

**签名**：
```javascript
async function chat(userMessage, options = {})
```

**示例**：
```javascript
// 简单对话
const response = await chat('什么是 Docker?')

// 流式对话
await chat('解释一下 Rust 所有权', {
  onStream: (delta, full) => {
    updateUI(full)
  }
})
```

**特点**：
- 自动维护聊天历史（最近 10 条）
- 支持流式输出
- 自动添加消息到 chatMessages

---

### 6. `executeIntelligentTask()` - 智能任务执行

**用途**：AI Agent 模式，执行复杂的多步骤任务

**签名**：
```javascript
async function executeIntelligentTask(description, workingDir, onProgress)
```

**示例**：
```javascript
const result = await executeIntelligentTask(
  '熟悉这个项目',
  '/path/to/project',
  (progress) => console.log(progress)
)

// result.type === 'project_analysis'
// result.analysis === 'AI 生成的项目分析'
// result.structure === { files: [...] }
```

**任务类型**：
1. **项目分析** - 关键词：熟悉、了解、分析
2. **代码修改** - 关键词：修改、添加、删除
3. **简单命令** - 其他情况

---

## 配置管理

### 服务商配置

**预设服务商**：
```javascript
const AI_PROVIDERS = {
  openai: { ... },      // OpenAI 官方
  azure: { ... },       // Azure OpenAI
  deepseek: { ... },    // DeepSeek
  zhipu: { ... },       // 智谱 GLM
  moonshot: { ... },    // Moonshot (Kimi)
  qwen: { ... },        // 通义千问
  yi: { ... },          // 零一万物
  ollama: { ... },      // Ollama (本地)
  custom: { ... }       // 自定义
}
```

**配置结构**：
```javascript
{
  name: 'OpenAI 官方',
  endpoint: 'https://api.openai.com/v1',
  models: ['gpt-4o-mini', 'gpt-4o'],
  requiresKey: true,
  keyPlaceholder: 'sk-proj-...',
  docs: 'https://platform.openai.com'
}
```

### 客户端管理

**自动管理**：
```javascript
// 获取客户端（自动创建/复用）
const client = getClient()

// 配置变更时自动重置
saveConfig() → resetClient() → 下次调用重新创建
```

**OpenAI SDK 配置**：
```javascript
new OpenAI({
  baseURL: apiEndpoint.value,
  apiKey: apiKey.value,
  dangerouslyAllowBrowser: true  // 允许浏览器使用
})
```

---

## 流式输出实现

### 原理

使用 OpenAI SDK 的原生流式支持：

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stream: true  // 开启流式
})

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || ''
  onStream(delta, fullContent)
}
```

### 回调机制

```javascript
// 定义回调
const onStream = (delta, fullContent) => {
  console.log('新内容:', delta)
  console.log('完整内容:', fullContent)
}

// 传入 callAI
await callAI(messages, {
  stream: true,
  onStream
})
```

### 实际应用

**终端输出**：
```javascript
await generateCommand('列出文件', {
  stream: true,
  onStream: (delta) => {
    terminal.write(delta)  // 逐字显示
  }
})
```

**聊天界面**：
```javascript
await chat('解释 Docker', {
  onStream: (delta, full) => {
    messageBox.innerHTML = full  // 实时更新
  }
})
```

---

## 错误处理

### 统一错误处理

```javascript
try {
  const result = await callAI(messages)
} catch (error) {
  // 错误已经被包装成友好的消息
  console.error(error.message)
  // 例如: "AI 未配置，请先在设置中配置 API Key 和模型"
}
```

### 错误类型

1. **配置错误**
   - AI 未配置
   - API Key 缺失
   - Endpoint 无效

2. **网络错误**
   - 连接超时
   - 请求失败
   - 服务不可用

3. **API 错误**
   - Token 超限
   - 模型不存在
   - 权限不足

### 统计追踪

```javascript
stats.value = {
  totalCalls: 10,      // 总调用次数
  successCalls: 8,     // 成功次数
  failedCalls: 2,      // 失败次数
  totalTokens: 5000    // 总消耗 token
}
```

---

## 最佳实践

### 1. Temperature 参数选择

```javascript
// 命令生成 - 低温度（0.2-0.3）
generateCommand() → temperature: 0.3

// 错误诊断 - 中温度（0.4-0.6）
diagnoseError() → temperature: 0.5

// 聊天对话 - 中高温度（0.6-0.8）
chat() → temperature: 0.7

// 创意任务 - 高温度（0.8-1.0）
创意写作 → temperature: 0.9
```

### 2. MaxTokens 控制

```javascript
// 简单命令
generateCommand() → maxTokens: 200

// 错误诊断
diagnoseError() → maxTokens: 1000

// 项目分析
analyzeProject() → maxTokens: 2000

// 长对话
chat() → maxTokens: 2000
```

### 3. 流式 vs 非流式

**使用流式**：
- ✅ 终端实时输出
- ✅ 聊天界面
- ✅ 长文本生成
- ✅ 提升用户体验

**使用非流式**：
- ✅ 简单命令
- ✅ 需要完整结果再处理
- ✅ 后台任务

### 4. 系统提示设计

**好的系统提示**：
```javascript
{
  role: 'system',
  content: `你是一个专业的命令行助手。
规则：
1. 只返回命令本身，不要解释
2. 如果需要多个命令，用 && 连接
3. 优先使用常用、安全的命令`
}
```

**避免的系统提示**：
```javascript
// ❌ 太模糊
content: '你是一个助手'

// ❌ 太啰嗦
content: '你是一个非常专业的...(500字)'
```

---

## 使用示例

### 示例 1：简单命令生成

```javascript
import { useAIStore } from '@/stores/ai'

const aiStore = useAIStore()

// 生成命令
const command = await aiStore.generateCommand('查找大于100MB的文件')
console.log(command)
// 输出: find . -type f -size +100M
```

### 示例 2：流式聊天

```javascript
const aiStore = useAIStore()

await aiStore.chat('解释一下 Rust 所有权', {
  onStream: (delta, fullContent) => {
    // delta: 新增的文本片段
    // fullContent: 累积的完整内容
    updateChatUI(fullContent)
  }
})
```

### 示例 3：项目分析

```javascript
const aiStore = useAIStore()

const result = await aiStore.executeIntelligentTask(
  '熟悉这个项目',
  '/Users/xxx/project',
  (progress) => {
    console.log(progress)
    // 输出: "📂 正在读取项目结构..."
    // 输出: "📄 正在读取关键文件..."
    // 输出: "🤖 AI 正在分析项目..."
  }
)

console.log(result.type)       // 'project_analysis'
console.log(result.analysis)   // AI 生成的分析报告
console.log(result.structure)  // 项目结构
```

### 示例 4：错误诊断

```javascript
const aiStore = useAIStore()

const solution = await aiStore.diagnoseError(
  'Error: Cannot find module "express"',
  '运行 node index.js 时发生'
)

console.log(solution)
// 输出:
// 1. 错误原因：缺少 express 模块
// 2. 解决方案：运行 npm install express
// 3. 预防建议：检查 package.json 依赖项
```

---

## 对比旧版本

| 方面 | 旧版本 | 新版本 |
|------|--------|--------|
| HTTP 调用 | 手动 fetch | OpenAI SDK |
| 流式输出 | 手动解析 SSE | SDK 原生支持 |
| 错误处理 | 分散在各处 | 统一在 callAI |
| 代码复用 | 重复代码多 | 单一接口 |
| 类型安全 | 弱 | 强（SDK 类型） |
| 维护性 | 难 | 易 |
| 代码量 | ~800 行 | ~550 行 |

---

## API 速查表

| 功能 | 方法 | 用途 |
|------|------|------|
| 统一调用 | `callAI(messages, options)` | 所有 AI 调用的核心 |
| 命令生成 | `generateCommand(desc)` | 自然语言 → Shell 命令 |
| 错误诊断 | `diagnoseError(error, context)` | 分析错误并给出方案 |
| 日志分析 | `analyzeLogs(logs)` | 提取日志关键信息 |
| 聊天对话 | `chat(message, options)` | 多轮对话 |
| 智能任务 | `executeIntelligentTask(...)` | AI Agent 模式 |
| 获取模型 | `fetchAvailableModels()` | 获取可用模型列表 |
| 清空聊天 | `clearChat()` | 清空聊天历史 |
| 重置统计 | `resetStats()` | 重置调用统计 |

---

## 总结

### ✅ 优势

1. **统一接口** - 单一 `callAI()` 处理所有调用
2. **官方 SDK** - 稳定、可靠、类型安全
3. **流式原生** - 开箱即用的流式输出
4. **易于扩展** - 添加新功能只需在应用层实现
5. **错误友好** - 统一的错误处理和提示

### 🎯 关键设计

- **三层架构** - 应用/核心/基础 清晰分离
- **客户端复用** - 自动管理，配置变更自动重置
- **流式回调** - 灵活的 onStream 机制
- **配置驱动** - AI_PROVIDERS 集中配置

### 🚀 下一步

- [ ] 添加 Token 计数和成本估算
- [ ] 支持函数调用（Function Calling）
- [ ] 添加 AI 响应缓存
- [ ] 实现对话上下文压缩

---

**新的 AI API 设计 - 更简洁、更强大、更易用！** 🎉


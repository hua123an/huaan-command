# 🔄 动态模型加载 v2 - 基于 OpenAI SDK

## 概述

Huaan Command 现已采用 **OpenAI SDK** 实现真正的动态模型加载，不再依赖硬编码的模型列表。

---

## ✨ 核心改进

### 1. **移除硬编码模型列表**

**旧版本**：
```javascript
// ❌ 硬编码模型列表
openai: {
  name: 'OpenAI 官方',
  endpoint: 'https://api.openai.com/v1',
  models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],  // 硬编码
  ...
}
```

**新版本**：
```javascript
// ✅ 只保留默认模型
openai: {
  name: 'OpenAI 官方',
  endpoint: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o-mini',  // 仅作为后备
  ...
}
```

---

### 2. **使用 OpenAI SDK `/models` 端点**

**实现原理**：
```javascript
async function fetchAvailableModels() {
  const openai = getClient()  // OpenAI SDK 实例
  
  // 调用 /models API
  const response = await openai.models.list()
  
  // 提取和过滤模型
  const models = response.data
    .filter(m => {
      // 过滤聊天模型
      const id = m.id.toLowerCase()
      return id.includes('gpt') || 
             id.includes('chat') ||
             id.includes('deepseek') ||
             ...
    })
    .map(m => ({
      id: m.id,
      name: m.id,
      created: m.created,
      owned_by: m.owned_by
    }))
    .sort((a, b) => b.created - a.created)  // 最新在前
  
  return models
}
```

---

### 3. **智能后备机制**

当 API 调用失败时，自动使用默认模型：

```javascript
try {
  // 尝试从 API 获取
  const models = await openai.models.list()
  return models
} catch (error) {
  // 失败时使用默认模型
  return [{ 
    id: currentProvider.value.defaultModel, 
    name: currentProvider.value.defaultModel 
  }]
}
```

---

## 🎯 使用场景

### 场景 1: 设置界面

**加载流程**：
1. 用户打开设置
2. 组件 `onMounted` 触发 `loadModels()`
3. 调用 `aiStore.fetchAvailableModels()`
4. 从 `/models` API 获取最新列表
5. 渲染到下拉菜单

**代码示例** (`SettingsModal.vue`):
```vue
<script setup>
const availableModels = ref([])
const loadingModels = ref(false)

async function loadModels() {
  loadingModels.value = true
  try {
    const models = await aiStore.fetchAvailableModels()
    availableModels.value = models
  } finally {
    loadingModels.value = false
  }
}

onMounted(() => {
  if (aiStore.isConfigured) {
    loadModels()
  }
})
</script>

<template>
  <select v-model="aiStore.model" :disabled="loadingModels">
    <option v-if="loadingModels">⏳ 加载中...</option>
    <option 
      v-for="model in availableModels" 
      :key="model.id" 
      :value="model.id"
    >
      {{ model.name }}
    </option>
  </select>
</template>
```

---

### 场景 2: 终端 Warp 模式

**加载流程**：
1. 终端初始化
2. `WarpModeBar` 组件挂载
3. 自动调用 `loadModels()`
4. 实时获取可用模型
5. 显示在模型选择器中

**代码示例** (`WarpModeBar.vue`):
```vue
<script setup>
const availableModels = ref([])
const loadingModels = ref(false)

async function loadModels() {
  loadingModels.value = true
  try {
    const models = await aiStore.fetchAvailableModels()
    availableModels.value = models
  } catch (error) {
    // 使用默认模型
    const defaultModel = AI_PROVIDERS[aiStore.provider]?.defaultModel
    availableModels.value = [{ id: defaultModel, name: defaultModel }]
  } finally {
    loadingModels.value = false
  }
}

// 监听配置变化，自动重新加载
watch(() => [aiStore.provider, aiStore.apiKey], () => {
  loadModels()
})
</script>
```

---

## 🔧 技术细节

### OpenAI SDK 集成

**初始化客户端**：
```javascript
import OpenAI from 'openai'

function getClient() {
  return new OpenAI({
    baseURL: apiEndpoint.value,
    apiKey: apiKey.value,
    dangerouslyAllowBrowser: true
  })
}
```

**调用 Models API**：
```javascript
const openai = getClient()
const response = await openai.models.list()

// response.data 结构：
[
  {
    id: "gpt-4o-mini-2024-07-18",
    object: "model",
    created: 1721172717,
    owned_by: "system"
  },
  ...
]
```

---

### 模型过滤逻辑

**目标**：只显示聊天模型，过滤掉嵌入模型、音频模型等

**实现**：
```javascript
const chatModelKeywords = [
  'gpt',        // OpenAI
  'chat',       // 通用
  'turbo',      // OpenAI
  'deepseek',   // DeepSeek
  'glm',        // 智谱
  'moonshot',   // Kimi
  'qwen',       // 通义千问
  'yi',         // 零一万物
  'llama',      // Meta/Ollama
  'mistral'     // Mistral
]

const models = response.data.filter(m => {
  const id = m.id.toLowerCase()
  return chatModelKeywords.some(keyword => id.includes(keyword))
})
```

---

### 排序策略

**按创建时间倒序**（最新模型在最前）：
```javascript
models.sort((a, b) => (b.created || 0) - (a.created || 0))
```

**优点**：
- ✅ 新发布的模型自动出现在列表顶部
- ✅ 用户总能看到最新、最强大的模型
- ✅ 不需要手动更新代码

---

## 📊 数据流

```
用户打开设置/终端
    ↓
组件 onMounted()
    ↓
loadModels()
    ↓
aiStore.fetchAvailableModels()
    ↓
getClient() → OpenAI SDK 实例
    ↓
openai.models.list() → 调用 /models API
    ↓
response.data → 原始模型列表
    ↓
filter() → 过滤聊天模型
    ↓
sort() → 按时间排序
    ↓
availableModels.value = models
    ↓
UI 渲染模型列表
```

---

## 🎨 UI 交互

### 加载状态

**SettingsModal.vue**:
```vue
<select :disabled="loadingModels">
  <option v-if="loadingModels">⏳ 加载中...</option>
  <option v-for="model in modelOptions">{{ model.name }}</option>
</select>
```

**WarpModeBar.vue**:
```vue
<button :disabled="loadingModels">
  <span v-if="loadingModels">⏳</span>
  <span>{{ loadingModels ? '加载中...' : currentModelName }}</span>
</button>
```

---

### 配置变化监听

```vue
<script setup>
// 监听关键配置，自动重新加载模型
watch(() => [
  aiStore.provider,      // 服务商变化
  aiStore.apiKey,        // API Key 变化
  aiStore.apiEndpoint    // Endpoint 变化
], () => {
  loadModels()  // 自动刷新模型列表
}, { deep: true })
</script>
```

---

## ⚠️ 错误处理

### 1. API 调用失败

```javascript
try {
  const models = await aiStore.fetchAvailableModels()
} catch (error) {
  console.warn('获取模型列表失败:', error)
  // 使用默认模型
  availableModels.value = [{
    id: AI_PROVIDERS[aiStore.provider].defaultModel,
    name: AI_PROVIDERS[aiStore.provider].defaultModel
  }]
}
```

---

### 2. 配置未完成

```javascript
async function fetchAvailableModels() {
  if (!isConfigured.value) {
    console.warn('AI 未配置，返回默认模型')
    return [{ 
      id: currentProvider.value.defaultModel,
      name: currentProvider.value.defaultModel 
    }]
  }
  // ...
}
```

---

### 3. 无可用模型

```javascript
if (models.length === 0) {
  console.warn('未找到可用模型，返回默认模型')
  return [{ 
    id: currentProvider.value.defaultModel,
    name: currentProvider.value.defaultModel 
  }]
}
```

---

## 🚀 性能优化

### 1. 客户端复用

```javascript
let client = null

function getClient() {
  if (client) return client  // 复用已有客户端
  
  client = new OpenAI({...})  // 创建新客户端
  return client
}

function resetClient() {
  client = null  // 配置变更时重置
}
```

---

### 2. 按需加载

```javascript
// ❌ 不好：应用启动时就加载
mounted() {
  this.loadModels()
}

// ✅ 好：只在需要时加载
mounted() {
  if (aiStore.isConfigured) {  // 检查配置
    this.loadModels()
  }
}
```

---

### 3. 防重复请求

```javascript
let loadingPromise = null

async function loadModels() {
  if (loadingPromise) {
    return loadingPromise  // 复用正在进行的请求
  }
  
  loadingPromise = aiStore.fetchAvailableModels()
  try {
    const models = await loadingPromise
    availableModels.value = models
  } finally {
    loadingPromise = null
  }
}
```

---

## 📝 配置迁移

### 旧配置格式（v1）

```javascript
{
  provider: 'openai',
  models: ['gpt-4o-mini', 'gpt-4o'],  // ❌ 硬编码
  model: 'gpt-4o-mini'
}
```

### 新配置格式（v2）

```javascript
{
  provider: 'openai',
  defaultModel: 'gpt-4o-mini',  // ✅ 仅默认值
  model: 'gpt-4o-mini'           // 用户选择的模型
}
```

**无需迁移脚本**：
- 新版本向后兼容
- 自动忽略 `models` 字段
- 使用 `defaultModel` 作为后备

---

## 🎯 未来扩展

### 1. 模型元数据

```javascript
{
  id: 'gpt-4o-mini',
  name: 'GPT-4o Mini',
  description: '快速、经济的模型',
  context_window: 128000,
  max_tokens: 16384,
  pricing: { input: 0.00015, output: 0.0006 }
}
```

---

### 2. 模型分组

```javascript
{
  'GPT-4 系列': [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ],
  'GPT-3.5 系列': [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ]
}
```

---

### 3. 本地缓存

```javascript
// 缓存模型列表 5 分钟
const CACHE_TTL = 5 * 60 * 1000

let cachedModels = null
let cacheTime = 0

async function fetchAvailableModels() {
  const now = Date.now()
  if (cachedModels && (now - cacheTime < CACHE_TTL)) {
    return cachedModels
  }
  
  const models = await openai.models.list()
  cachedModels = models
  cacheTime = now
  return models
}
```

---

## 📊 对比总结

| 特性 | v1 (硬编码) | v2 (动态) |
|------|-------------|-----------|
| 模型来源 | 代码硬编码 | `/models` API |
| 更新方式 | 修改代码 | 自动获取 |
| 新模型支持 | 需要手动添加 | 自动出现 |
| 跨服务商 | 需要逐个配置 | 统一接口 |
| 错误处理 | 无 | 完整后备机制 |
| 性能 | 快（静态） | 好（缓存） |
| 维护成本 | 高 | 低 |

---

## ✅ 总结

### 核心优势

1. **零维护** - 不再需要手动更新模型列表
2. **自动发现** - 新模型发布后自动出现
3. **统一接口** - 所有 AI 服务商使用相同逻辑
4. **智能后备** - API 失败时自动降级
5. **用户友好** - 加载状态、错误提示完善

### 使用建议

- ✅ 首次加载时显示加载状态
- ✅ 配置变化时自动刷新模型
- ✅ API 失败时提供默认模型
- ✅ 定期检查新模型（可选）

---

**动态模型加载 v2 - 让 AI 集成更智能、更易用！** 🎉


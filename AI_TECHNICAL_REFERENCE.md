# 🔧 AI Technical Reference

## 🏗️ API Architecture

### 概述

Huaan Command 的 AI 功能采用统一的 API 设计，基于 **OpenAI SDK**，支持多个 AI 服务商。

### ✨ 核心特性

- **统一接口** - 单一 `callAI()` 方法处理所有 AI 调用
- **OpenAI SDK** - 使用官方 SDK，稳定可靠
- **多服务商** - 支持 OpenAI、DeepSeek、Kimi 等
- **流式输出** - 原生支持 SSE 流式响应
- **自动重连** - 配置变更时自动重新初始化
- **类型安全** - 清晰的参数和返回类型

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
│  - OpenAI SDK                       │
│  - HTTP 客户端                       │
│  - 配置管理                          │
│  - 本地存储                          │
└─────────────────────────────────────┘
```

## 📡 API 接口设计

### 核心函数

```javascript
// 统一的 AI 调用接口
async callAI({
  messages: Array,        // 对话消息
  stream: boolean,        // 是否流式输出
  tools?: Array,          // 工具调用
  temperature?: number    // 创造性参数
}) => Promise<string>
```

### 应用层接口

#### 1. 命令生成
```javascript
async generateCommand(description) {
  return await callAI({
    messages: [
      {
        role: "system",
        content: "你是一个 Shell 命令生成专家..."
      },
      {
        role: "user",
        content: `生成命令：${description}`
      }
    ],
    temperature: 0.3
  })
}
```

#### 2. 错误诊断
```javascript
async diagnoseError(command, output, error) {
  return await callAI({
    messages: [
      {
        role: "system",
        content: "你是一个错误诊断专家..."
      },
      {
        role: "user",
        content: `命令：${command}\n输出：${output}\n错误：${error}`
      }
    ],
    temperature: 0.2
  })
}
```

#### 3. 智能聊天
```javascript
async chat(message, history = []) {
  return await callAI({
    messages: [
      {
        role: "system",
        content: "你是 Huaan Command 的 AI 助手..."
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ],
    stream: true,
    temperature: 0.7
  })
}
```

## 🔄 流式输出实现

### Server-Sent Events

```javascript
async function* streamResponse(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          
          try {
            const parsed = JSON.parse(data)
            yield parsed.choices[0]?.delta?.content || ''
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

### 前端处理

```javascript
// Vue 3 Composition API
const { streaming, message } = useStreamingResponse()

async function handleStream(prompt) {
  streaming.value = true
  message.value = ''
  
  try {
    for await (const chunk of streamResponse(response)) {
      message.value += chunk
    }
  } finally {
    streaming.value = false
  }
}
```

## 🛠️ 服务商适配

### OpenAI 适配器

```javascript
class OpenAIAdapter {
  constructor(config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint
    })
  }
  
  async chat(params) {
    return await this.client.chat.completions.create({
      model: params.model || 'gpt-4o-mini',
      messages: params.messages,
      stream: params.stream,
      temperature: params.temperature
    })
  }
}
```

### DeepSeek 适配器

```javascript
class DeepSeekAdapter {
  constructor(config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    })
  }
  
  async chat(params) {
    return await this.client.chat.completions.create({
      model: params.model || 'deepseek-chat',
      messages: params.messages,
      stream: params.stream,
      temperature: params.temperature
    })
  }
}
```

### Ollama 适配器

```javascript
class OllamaAdapter {
  constructor(config) {
    this.endpoint = config.endpoint || 'http://localhost:11434/v1'
    this.apiKey = config.apiKey || 'ollama'
  }
  
  async chat(params) {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: params.model || 'llama3.1:8b',
        messages: params.messages,
        stream: params.stream,
        temperature: params.temperature
      })
    })
    
    return response
  }
}
```

## 📊 配置管理

### 配置结构

```javascript
const aiConfig = {
  // 基础配置
  enabled: true,
  provider: 'openai',
  
  // OpenAI 配置
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1'
  },
  
  // DeepSeek 配置
  deepseek: {
    apiKey: '',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1'
  },
  
  // Ollama 配置
  ollama: {
    apiKey: 'ollama',
    model: 'llama3.1:8b',
    endpoint: 'http://localhost:11434/v1'
  },
  
  // 高级配置
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 30000,
  
  // 统计配置
  enableStats: true,
  statsRetention: 30 // days
}
```

### 动态配置切换

```javascript
class AIManager {
  constructor() {
    this.adapters = new Map()
    this.currentProvider = 'openai'
  }
  
  async switchProvider(provider) {
    if (!this.adapters.has(provider)) {
      await this.initializeAdapter(provider)
    }
    this.currentProvider = provider
  }
  
  async initializeAdapter(provider) {
    const config = aiConfig[provider]
    switch (provider) {
      case 'openai':
        this.adapters.set(provider, new OpenAIAdapter(config))
        break
      case 'deepseek':
        this.adapters.set(provider, new DeepSeekAdapter(config))
        break
      case 'ollama':
        this.adapters.set(provider, new OllamaAdapter(config))
        break
    }
  }
}
```

## ✅ Implementation Checklist

### 核心功能检查

- [ ] **统一 API 接口**
  - [ ] `callAI()` 方法实现
  - [ ] 参数验证
  - [ ] 错误处理
  
- [ ] **流式输出**
  - [ ] SSE 解析
  - [ ] 前端渲染
  - [ ] 错误恢复
  
- [ ] **多服务商支持**
  - [ ] OpenAI 适配器
  - [ ] DeepSeek 适配器
  - [ ] Ollama 适配器
  - [ ] 动态切换
  
- [ ] **配置管理**
  - [ ] 配置验证
  - [ ] 热重载
  - [ ] 本地存储
  
- [ ] **性能优化**
  - [ ] 请求去重
  - [ ] 缓存机制
  - [ ] 批量处理
  
- [ ] **监控统计**
  - [ ] 使用量统计
  - [ ] 错误率监控
  - [ ] 性能指标

### 安全检查

- [ ] **API Key 安全**
  - [ ] 加密存储
  - [ ] 传输加密
  - [ ] 权限控制
  
- [ ] **输入验证**
  - [ ] 长度限制
  - [ ] 内容过滤
  - [ ] 注入防护
  
- [ ] **错误处理**
  - [ ] 敏感信息过滤
  - [ ] 错误日志记录
  - [ ] 用户友好提示

### 测试检查

- [ ] **单元测试**
  - [ ] API 接口测试
  - [ ] 适配器测试
  - [ ] 配置管理测试
  
- [ ] **集成测试**
  - [ ] 端到端流程测试
  - [ ] 多服务商切换测试
  - [ ] 错误场景测试
  
- [ ] **性能测试**
  - [ ] 并发请求测试
  - [ ] 内存使用测试
  - [ ] 响应时间测试

## 🔄 Dynamic Model Loading

### 模型配置

```javascript
const models = {
  openai: {
    'gpt-4o': {
      name: 'GPT-4o',
      maxTokens: 128000,
      cost: { input: 0.005, output: 0.015 }
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      maxTokens: 128000,
      cost: { input: 0.00015, output: 0.0006 }
    }
  },
  deepseek: {
    'deepseek-chat': {
      name: 'DeepSeek Chat',
      maxTokens: 64000,
      cost: { input: 0.0001, output: 0.0002 }
    }
  }
}
```

### 动态加载实现

```javascript
class DynamicModelLoader {
  async loadModel(provider, modelName) {
    const modelConfig = models[provider]?.[modelName]
    if (!modelConfig) {
      throw new Error(`Model ${modelName} not found for provider ${provider}`)
    }
    
    // 验证模型可用性
    const isAvailable = await this.checkModelAvailability(provider, modelName)
    if (!isAvailable) {
      throw new Error(`Model ${modelName} is not available`)
    }
    
    return modelConfig
  }
  
  async checkModelAvailability(provider, modelName) {
    try {
      const adapter = this.getAdapter(provider)
      const response = await adapter.models.list()
      return response.data.some(model => model.id === modelName)
    } catch (error) {
      return false
    }
  }
}
```

### 模型切换

```javascript
async function switchModel(newModel) {
  try {
    // 加载新模型配置
    const modelConfig = await modelLoader.loadModel(
      aiConfig.provider, 
      newModel
    )
    
    // 更新配置
    aiConfig[aiConfig.provider].model = newModel
    
    // 重新初始化适配器
    await aiManager.reinitializeAdapter()
    
    // 通知 UI 更新
    emit('model-changed', modelConfig)
    
  } catch (error) {
    console.error('Failed to switch model:', error)
    // 回滚到上一个可用模型
    await rollbackToPreviousModel()
  }
}
```

## 📈 性能优化

### 请求优化

```javascript
class RequestOptimizer {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }
  
  // 请求去重
  async deduplicateRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return await this.pendingRequests.get(key)
    }
    
    const promise = requestFn()
    this.pendingRequests.set(key, promise)
    
    try {
      const result = await promise
      this.cache.set(key, result)
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }
  
  // 智能缓存
  getCachedResponse(key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < 300000) { // 5分钟
      return cached.data
    }
    return null
  }
}
```

### 批量处理

```javascript
class BatchProcessor {
  constructor(batchSize = 5, delay = 100) {
    this.queue = []
    this.batchSize = batchSize
    this.delay = delay
    this.timer = null
  }
  
  add(request) {
    this.queue.push(request)
    this.scheduleBatch()
  }
  
  scheduleBatch() {
    if (this.timer) return
    
    this.timer = setTimeout(() => {
      this.processBatch()
      this.timer = null
    }, this.delay)
  }
  
  async processBatch() {
    const batch = this.queue.splice(0, this.batchSize)
    if (batch.length === 0) return
    
    const promises = batch.map(request => this.executeRequest(request))
    await Promise.allSettled(promises)
    
    // 如果还有待处理的请求，继续处理
    if (this.queue.length > 0) {
      this.scheduleBatch()
    }
  }
}
```

## 🔍 监控与调试

### 性能监控

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      errorRate: 0
    }
  }
  
  recordRequest(startTime, endTime, tokens, cost, error = null) {
    const latency = endTime - startTime
    this.metrics.requestCount++
    this.metrics.totalTokens += tokens
    this.metrics.totalCost += cost
    
    // 更新平均延迟
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.requestCount - 1) + latency) / 
      this.metrics.requestCount
    
    // 更新错误率
    if (error) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) / 
        this.metrics.requestCount
    }
  }
  
  getMetrics() {
    return { ...this.metrics }
  }
}
```

### 调试工具

```javascript
class AIDebugger {
  static logRequest(provider, model, messages, response) {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🤖 AI Request - ${provider}/${model}`)
      console.log('Messages:', messages)
      console.log('Response:', response)
      console.groupEnd()
    }
  }
  
  static logError(error, context) {
    if (process.env.NODE_ENV === 'development') {
      console.group('❌ AI Error')
      console.log('Error:', error)
      console.log('Context:', context)
      console.groupEnd()
    }
  }
}
```

---

## 📚 Additional Resources

- [🤖 AI Complete User Guide](./AI_COMPLETE_GUIDE.md)
- [🖥️ AI Terminal Integration](./AI_TERMINAL_INTEGRATION.md)
- [⚡ Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
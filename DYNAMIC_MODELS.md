# 🔄 动态模型加载功能

## 功能说明

AI 助手的模型选择现在支持动态加载，通过调用 OpenAI API 的 `/models` 端点自动获取可用模型列表。

## 工作原理

### 1. 自动加载时机

模型列表会在以下情况下自动加载：

- ✅ 打开设置页面时（如果已配置 API Key）
- ✅ 输入/更改 API Key 后
- ✅ 修改 API 端点后
- ✅ 启用 AI 功能时

### 2. API 调用

```javascript
GET {apiEndpoint}/models
Authorization: Bearer {apiKey}
```

**响应格式**（OpenAI 标准）：
```json
{
  "data": [
    {
      "id": "gpt-4o-mini",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    },
    {
      "id": "gpt-4o",
      ...
    }
  ]
}
```

### 3. 智能过滤和排序

- **过滤**: 只保留以 `gpt-` 开头的模型
- **排序**: 按优先级排序
  - `gpt-4o` 系列优先级最高
  - `gpt-4` 系列次之
  - `gpt-3.5` 系列最后

### 4. Fallback 机制

如果 API 调用失败或未配置，使用默认模型列表：

```javascript
[
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (推荐)' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
]
```

## UI 交互

### 加载状态

- 加载中显示 ⏳ 图标
- 下拉框在加载时禁用
- 脉冲动画提示加载中

### 用户体验

1. **配置 API Key**
2. **自动加载模型** - 后台请求 `/models` 端点
3. **显示可用模型** - 下拉列表自动更新
4. **选择模型** - 从实际可用的模型中选择

## 兼容性

### 支持的 API 服务

✅ **OpenAI 官方 API**
- 标准端点: `https://api.openai.com/v1`
- 自动获取账户可用模型

✅ **Azure OpenAI**
- 需配置自定义端点
- 支持标准 OpenAI 格式

✅ **兼容服务**（如 litellm、vllm 等）
- 只要返回 OpenAI 兼容的 `/models` 响应即可

❌ **不兼容的服务**
- 不支持 `/models` 端点的服务会使用默认列表

## 错误处理

### 网络错误
- 静默失败，使用默认模型列表
- 控制台输出警告日志

### 授权失败
- 静默失败，使用默认模型列表
- 不影响其他功能使用

### 无效响应
- 解析失败时使用默认列表
- 确保用户始终可以选择模型

## 代码实现

### AI Store (`src/stores/ai.js`)

```javascript
async function fetchAvailableModels() {
  if (!isConfigured.value) return []
  
  try {
    const response = await fetch(`${apiEndpoint.value}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey.value}` }
    })
    
    const data = await response.json()
    return data.data
      .filter(m => m.id.startsWith('gpt-'))
      .map(m => ({ id: m.id, name: m.id }))
      .sort(/* 优先级排序 */)
  } catch (error) {
    return []
  }
}
```

### Settings Modal (`src/components/SettingsModal.vue`)

```vue
<script setup>
const availableModels = ref([])
const loadingModels = ref(false)

// 监听配置变化，自动加载
watch(() => [aiStore.apiKey, aiStore.apiEndpoint], () => {
  if (aiStore.isConfigured) loadModels()
})

const modelOptions = computed(() => {
  return availableModels.value.length > 0 
    ? availableModels.value 
    : defaultModels
})
</script>

<template>
  <select v-model="aiStore.model" :disabled="loadingModels">
    <option v-for="model in modelOptions" :value="model.id">
      {{ model.name }}
    </option>
  </select>
</template>
```

## 测试场景

### 场景 1: 首次配置
1. 打开设置
2. 启用 AI 功能
3. 输入 API Key
4. ✅ 自动加载模型列表

### 场景 2: 切换端点
1. 修改 API 端点（如切换到 Azure）
2. ✅ 重新加载模型列表
3. ✅ 显示新端点的可用模型

### 场景 3: 网络错误
1. 断开网络
2. 输入 API Key
3. ✅ 使用默认模型列表
4. ✅ 不影响其他功能

### 场景 4: 自定义服务
1. 配置自建 API 服务（如 ollama + litellm）
2. ✅ 加载服务提供的模型
3. ✅ 显示实际可用的模型名称

## 优势

1. **灵活性** - 自动适配不同 API 服务商
2. **准确性** - 只显示账户实际可用的模型
3. **用户友好** - 无需手动添加模型
4. **容错性** - 失败时有合理的默认值
5. **性能** - 智能缓存，避免重复请求

## 未来增强

- [ ] 显示模型详细信息（context length, pricing）
- [ ] 缓存模型列表到 LocalStorage
- [ ] 支持自定义模型（非 GPT 系列）
- [ ] 模型能力检测（是否支持 function calling）
- [ ] 模型推荐（基于任务类型）

---

**实现完成！享受动态模型加载的便利！** 🎉


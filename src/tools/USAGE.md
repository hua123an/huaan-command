# 工具系统使用示例

## 基础用法

### 1. 导入工具系统

```javascript
import { useToolExecutor } from '@/tools/executor'
import { TOOL_CATEGORIES } from '@/tools/categories'

// 在组件中使用
const { executeTool, tools, getToolsByCategory } = useToolExecutor({
  currentDir: '/Users/project',
  sessionId: 'session-123'
})
```

### 2. 执行单个工具

```javascript
// 读取文件
const result = await executeTool('read_file', {
  path: '/Users/project/README.md'
})

console.log(result.output) // 文件内容

// 写入文件（需要批准）
try {
  await executeTool('write_file', {
    path: '/Users/project/config.json',
    content: JSON.stringify({ key: 'value' }, null, 2)
  }, {
    onApprovalRequired: async (tool, params) => {
      // 显示确认对话框
      return confirm(`确认要写入文件 ${params.path} 吗？`)
    }
  })
} catch (error) {
  console.error('写入失败：', error.message)
}
```

### 3. 执行命令

```javascript
// 安全命令（无需批准）
const result = await executeTool('execute_command', {
  cmd: 'ls -la',
  workingDir: '/Users/project'
})

console.log(result.output)

// 危险命令（需要批准）
await executeTool('execute_command', {
  cmd: 'rm -rf node_modules',
  workingDir: '/Users/project'
}, {
  onWarning: async (warnings) => {
    console.warn('警告：', warnings)
    return confirm('这是一个危险操作，确认继续？')
  },
  onApprovalRequired: async (tool, params) => {
    return confirm(`确认执行：${params.cmd}？`)
  }
})
```

### 4. Git 操作

```javascript
// 查看状态
const status = await executeTool('git_status', {
  workingDir: '/Users/project'
})

// 查看差异
const diff = await executeTool('git_diff', {
  workingDir: '/Users/project',
  file: 'src/App.vue' // 可选：查看特定文件
})

// 查看历史
const log = await executeTool('git_log', {
  workingDir: '/Users/project',
  limit: 20
})

// 切换分支（需要批准）
await executeTool('git_branch', {
  workingDir: '/Users/project',
  branch: 'develop'
}, {
  onApprovalRequired: async () => {
    return confirm('确认切换到 develop 分支？')
  }
})
```

### 5. 文件搜索

```javascript
// 搜索文件
const files = await executeTool('search_files', {
  pattern: '*.vue',
  dir: '/Users/project/src'
})

// 搜索内容
const matches = await executeTool('find_in_files', {
  pattern: 'TODO',
  dir: '/Users/project/src',
  filePattern: '*.js'
})
```

### 6. 批量执行

```javascript
import { useToolExecutor } from '@/tools/executor'

const { executeBatch } = useToolExecutor()

const results = await executeBatch([
  { tool: 'git_status', params: {} },
  { tool: 'git_diff', params: {} },
  { tool: 'list_files', params: { dir: '/Users/project/src' } }
], {
  stopOnError: false // 遇到错误继续执行
})

results.forEach(r => {
  if (r.success) {
    console.log(`${r.tool}:`, r.result.output)
  } else {
    console.error(`${r.tool} 失败:`, r.error)
  }
})
```

## 在 Vue 组件中使用

```vue
<template>
  <div>
    <h2>工具面板</h2>

    <!-- 按类别显示工具 -->
    <div v-for="category in categories" :key="category">
      <h3>{{ getCategoryName(category) }}</h3>
      <div>
        <button
          v-for="tool in getToolsByCategory(category)"
          :key="tool.name"
          @click="handleToolClick(tool)"
          :disabled="executingTool === tool.name"
        >
          {{ tool.icon }} {{ tool.name }}
        </button>
      </div>
    </div>

    <!-- 显示执行结果 -->
    <div v-if="lastResult" class="result">
      <h3>执行结果</h3>
      <pre>{{ lastResult.result.output }}</pre>
      <p>耗时: {{ lastResult.duration }}ms</p>
    </div>

    <!-- 执行历史 -->
    <div class="history">
      <h3>执行历史</h3>
      <div v-for="(record, idx) in executionHistory.slice(0, 10)" :key="idx">
        <span>{{ record.tool }}</span>
        <span :class="{ success: record.result.success, error: !record.result.success }">
          {{ record.result.success ? '✓' : '✗' }}
        </span>
        <span>{{ record.duration }}ms</span>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats">
      <h3>工具统计</h3>
      <table>
        <tr v-for="(stat, toolName) in toolStats" :key="toolName">
          <td>{{ toolName }}</td>
          <td>{{ stat.count }}次</td>
          <td>成功率: {{ (stat.successCount / stat.count * 100).toFixed(1) }}%</td>
          <td>平均耗时: {{ stat.avgDuration.toFixed(0) }}ms</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useToolExecutor } from '@/tools/executor'
import { TOOL_CATEGORIES, CATEGORY_NAMES } from '@/tools/categories'

const {
  executingTool,
  lastResult,
  executionHistory,
  toolStats,
  executeTool,
  getToolsByCategory
} = useToolExecutor({
  currentDir: '/Users/project',
  sessionId: 'session-123'
})

const categories = Object.values(TOOL_CATEGORIES)

const getCategoryName = (category) => {
  return CATEGORY_NAMES[category] || category
}

const handleToolClick = async (tool) => {
  // 这里可以显示参数输入对话框
  const params = getDefaultParams(tool.name)

  try {
    await executeTool(tool.name, params, {
      onApprovalRequired: async (tool, params) => {
        return confirm(`确认执行 ${tool.name}？\n参数：${JSON.stringify(params, null, 2)}`)
      },
      onWarning: async (warnings) => {
        console.warn(warnings)
        return confirm(`警告：\n${warnings.join('\n')}\n\n确认继续？`)
      }
    })
  } catch (error) {
    alert(`执行失败：${error.message}`)
  }
}

const getDefaultParams = (toolName) => {
  // 根据工具名称返回默认参数
  switch (toolName) {
    case 'list_files':
      return { dir: '/Users/project' }
    case 'git_status':
      return { workingDir: '/Users/project' }
    default:
      return {}
  }
}
</script>

<style scoped>
.result {
  margin: 20px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.history {
  margin: 20px 0;
}

.success { color: green; }
.error { color: red; }

.stats table {
  width: 100%;
  border-collapse: collapse;
}

.stats td {
  padding: 8px;
  border-bottom: 1px solid #eee;
}
</style>
```

## 与 AI 集成

```javascript
import { getToolsSchema, getTool } from '@/tools'
import { useToolExecutor } from '@/tools/executor'

// 获取工具的 JSON Schema，用于 AI function calling
const toolsSchema = getToolsSchema()

// 发送给 AI
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    tools: toolsSchema, // 传递工具定义
    messages: [
      { role: 'user', content: '请帮我查看当前目录的文件' }
    ]
  })
})

const data = await response.json()

// AI 返回的工具调用
if (data.stop_reason === 'tool_use') {
  const toolUse = data.content.find(c => c.type === 'tool_use')

  if (toolUse) {
    const { executeTool } = useToolExecutor()

    // 执行工具
    const result = await executeTool(
      toolUse.name,
      toolUse.input,
      {
        onApprovalRequired: async (tool, params) => {
          // 显示 AI 请求的操作
          return confirm(`AI 请求执行：${tool.name}\n${JSON.stringify(params, null, 2)}`)
        }
      }
    )

    // 将结果返回给 AI
    const followUp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        tools: toolsSchema,
        messages: [
          { role: 'user', content: '请帮我查看当前目录的文件' },
          { role: 'assistant', content: data.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result.output
              }
            ]
          }
        ]
      })
    })
  }
}
```

## 错误处理

```javascript
try {
  await executeTool('write_file', {
    path: '/root/protected.txt',
    content: 'data'
  })
} catch (error) {
  if (error.message.includes('Permission denied')) {
    console.error('权限不足')
  } else if (error.message.includes('未获批准')) {
    console.log('用户取消了操作')
  } else {
    console.error('未知错误：', error.message)
  }
}
```

## 自定义工具

```javascript
import { createTool, tools } from '@/tools'

// 添加自定义工具
const customTool = createTool(
  'compress_files',
  '压缩文件',
  async ({ files, output }, context) => {
    return await invoke('execute_command', {
      cmd: `tar -czf ${output} ${files.join(' ')}`,
      workingDir: context.currentDir
    })
  },
  {
    needsApproval: true,
    category: 'filesystem',
    icon: '📦'
  }
)

tools.push(customTool)
```

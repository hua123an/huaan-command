# 工具系统快速入门

## 5 分钟上手

### 1. 最简单的使用

```javascript
// 在任何 Vue 组件中
import { useToolExecutor } from '@/tools/executor'

const { executeTool } = useToolExecutor()

// 执行工具
const result = await executeTool('read_file', {
  path: '/path/to/file.txt'
})

console.log(result.output) // 文件内容
```

### 2. 常用场景

#### 读取文件
```javascript
const content = await executeTool('read_file', {
  path: '/Users/project/package.json'
})
```

#### 列出目录
```javascript
const files = await executeTool('list_files', {
  dir: '/Users/project/src'
})
```

#### 执行命令
```javascript
const result = await executeTool('execute_command', {
  cmd: 'npm run build',
  workingDir: '/Users/project'
})
```

#### 查看 Git 状态
```javascript
const status = await executeTool('git_status', {
  workingDir: '/Users/project'
})
```

### 3. 带权限控制

```javascript
await executeTool('write_file', {
  path: '/path/to/file.txt',
  content: 'Hello World'
}, {
  onApprovalRequired: async (tool, params) => {
    return confirm(`确认执行 ${tool.name}？`)
  }
})
```

### 4. 批量执行

```javascript
const { executeBatch } = useToolExecutor()

const results = await executeBatch([
  { tool: 'git_status', params: {} },
  { tool: 'git_diff', params: {} }
])
```

### 5. 查看执行历史

```javascript
const {
  executionHistory,
  toolStats,
  lastResult
} = useToolExecutor()

// 最新结果
console.log(lastResult.value)

// 历史记录
console.log(executionHistory.value)

// 统计信息
console.log(toolStats.value)
```

## 完整示例

```vue
<template>
  <div>
    <button @click="readPackageJson">读取 package.json</button>
    <button @click="runTests">运行测试</button>
    <button @click="checkGitStatus">查看 Git 状态</button>

    <div v-if="lastResult">
      <h3>结果</h3>
      <pre>{{ lastResult.result.output }}</pre>
    </div>
  </div>
</template>

<script setup>
import { useToolExecutor } from '@/tools/executor'

const { executeTool, lastResult } = useToolExecutor({
  currentDir: '/Users/project'
})

const readPackageJson = async () => {
  await executeTool('read_file', {
    path: '/Users/project/package.json'
  })
}

const runTests = async () => {
  await executeTool('execute_command', {
    cmd: 'npm test'
  })
}

const checkGitStatus = async () => {
  await executeTool('git_status', {})
}
</script>
```

## 可用工具速查

| 类别 | 工具 | 用途 |
|------|------|------|
| 📁 文件 | `read_file` | 读文件 |
| 📁 文件 | `write_file` | 写文件 |
| 📁 文件 | `list_files` | 列目录 |
| 📁 文件 | `search_files` | 搜索文件 |
| ⚡ 命令 | `execute_command` | 执行命令 |
| 🧭 导航 | `get_current_dir` | 当前目录 |
| 🧭 导航 | `change_directory` | 切换目录 |
| 🔀 Git | `git_status` | Git 状态 |
| 🔀 Git | `git_diff` | 查看改动 |
| 🔀 Git | `git_log` | 提交历史 |
| 🔀 Git | `git_branch` | 管理分支 |
| ⚙️ 系统 | `list_processes` | 列出进程 |
| ⚙️ 系统 | `kill_process` | 终止进程 |
| 🌐 网络 | `test_connection` | 测试连接 |
| 🌐 网络 | `check_port` | 检查端口 |

## 需要注意的

1. **危险操作会自动检测**
   - `rm -rf`, `sudo` 等命令需要批准
   - 写文件、终止进程需要批准

2. **参数会自动验证**
   - 缺少必需参数会报错
   - 提前捕获错误

3. **执行历史自动记录**
   - 最多保留 100 条
   - 包含时间、耗时、结果

## 更多信息

- 📖 完整文档: `src/tools/README.md`
- 📝 使用示例: `src/tools/USAGE.md`
- 🎯 实现总结: `src/tools/IMPLEMENTATION_SUMMARY.md`
- 🧪 测试文件: `src/tools/__tests__/tools.test.js`

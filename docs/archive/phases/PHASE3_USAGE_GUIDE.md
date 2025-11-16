# 🛡️ Phase 3 使用指南

**版本**: 1.0.0
**更新日期**: 2025-11-02

本指南介绍如何使用 Phase 3 实现的安全和体验功能。

---

## 📚 目录

1. [安全检查器](#安全检查器)
2. [撤销管理器](#撤销管理器)
3. [活动日志](#活动日志)
4. [UI 组件](#ui-组件)
5. [快捷键](#快捷键)
6. [最佳实践](#最佳实践)

---

## 🛡️ 安全检查器

### 基础用法

```javascript
import { checkCommand, checkFilePath, safetyChecker } from '@/security/SafetyChecker'

// 检查命令安全性
const cmdResult = checkCommand('sudo rm -rf /data')
console.log(cmdResult)
// {
//   isSafe: false,
//   level: 'critical',
//   risks: [
//     { category: 'PRIVILEGE', level: 'high', message: '需要管理员权限' },
//     { category: 'DELETE', level: 'critical', message: '递归删除文件/目录' }
//   ],
//   needsApproval: true
// }

// 检查文件路径安全性
const pathResult = checkFilePath('~/.ssh/id_rsa', 'write')
console.log(pathResult)
// {
//   isSafe: false,
//   level: 'critical',
//   risks: [...],
//   needsApproval: true
// }
```

### 添加待确认操作

```javascript
import { safetyChecker } from '@/security/SafetyChecker'

// 添加操作到待确认队列
const operationId = safetyChecker.addPendingOperation({
  type: 'execute_command',
  params: { cmd: 'sudo rm -rf /data' },
  riskLevel: 'critical',
  preview: {
    title: '⚡ 执行命令',
    command: 'sudo rm -rf /data',
    risks: [...]
  }
})

// 获取待确认的操作
const pending = safetyChecker.getPendingOperations()
console.log(pending)  // [{ id, type, params, ... }]

// 批准操作
safetyChecker.approveOperation(operationId)

// 拒绝操作
safetyChecker.denyOperation(operationId)

// 批量批准
safetyChecker.approveAll([id1, id2, id3])
```

### 生成操作预览

```javascript
// 文件写入预览
const preview = safetyChecker.generatePreview({
  type: 'write_file',
  params: {
    path: '/path/to/file.txt',
    content: 'new content',
    oldContent: 'old content'
  }
})
console.log(preview)
// {
//   title: '📝 写入文件',
//   path: '/path/to/file.txt',
//   description: '修改现有文件',
//   changes: [
//     { type: 'remove', line: 'old content', number: 1 },
//     { type: 'add', line: 'new content', number: 1 }
//   ],
//   stats: { oldLines: 1, newLines: 1, size: 11 }
// }
```

### 风险等级

- **SAFE**: 安全操作，无需确认
- **LOW**: 低风险，可以批量确认
- **MEDIUM**: 中等风险，需要单独确认
- **HIGH**: 高风险，需要仔细确认
- **CRITICAL**: 极高风险，需要二次确认

---

## 🔄 撤销管理器

### 基础用法

```javascript
import { undoManager, undo, redo } from '@/security/UndoManager'

// 记录文件写入操作
const opId = await undoManager.createFileWriteRecord(
  '/path/to/file.txt',
  'new content',
  'old content'
)

// 撤销最后一个操作
const result = await undo()
console.log(result)
// {
//   success: true,
//   operation: { id, type, ... },
//   result: { ... }
// }

// 重做
await redo()

// 获取操作历史
const history = undoManager.getHistory(20)
console.log(history)  // 最近 20 个操作
```

### 回滚到特定操作

```javascript
// 回滚到某个操作
const result = await undoManager.rollbackTo(operationId)
console.log(result)
// {
//   success: true,
//   completed: 5,
//   total: 5,
//   results: [...]
// }
```

### 查询统计信息

```javascript
const stats = undoManager.getStats()
console.log(stats)
// {
//   undoCount: 10,
//   redoCount: 3,
//   backupCount: 10,
//   oldestOperation: 1234567890000,
//   newestOperation: 1234567900000
// }
```

### 支持的操作类型

```javascript
import { OperationType } from '@/security/UndoManager'

// FILE_WRITE - 文件写入
await undoManager.createFileWriteRecord(path, newContent, oldContent)

// FILE_DELETE - 文件删除
await undoManager.createFileDeleteRecord(path)

// COMMAND_EXECUTE - 命令执行
await undoManager.createCommandRecord(command, workingDir, undoCommand)

// FILE_RENAME - 文件重命名（手动创建）
await undoManager.recordOperation({
  type: OperationType.FILE_RENAME,
  oldPath: '/old/path',
  newPath: '/new/path'
})

// DIRECTORY_CHANGE - 目录切换（手动创建）
await undoManager.recordOperation({
  type: OperationType.DIRECTORY_CHANGE,
  oldDir: '/old/dir',
  newDir: '/new/dir',
  sessionId: 'session_id'
})
```

---

## 📋 活动日志

### 基础用法

```javascript
import { activityLogger } from '@/security/ActivityLogger'

// 记录 AI 请求
activityLogger.logAIRequest(
  'Analyze this code',
  'gpt-4',
  { files: ['App.vue'] }
)

// 记录 AI 响应
activityLogger.logAIResponse(
  'Analysis result...',
  1500,  // duration in ms
  2000   // tokens
)

// 记录工具调用
activityLogger.logToolCall(
  'write_file',
  { path: '/path/to/file', content: 'content' },
  { currentDir: '/project' }
)

// 记录工具结果
activityLogger.logToolResult(
  'write_file',
  { success: true },
  true,   // success
  150     // duration
)

// 记录命令执行
activityLogger.logCommand(
  'npm install',
  '/project',
  { stdout: '...', stderr: '', exitCode: 0 }
)

// 记录文件操作
activityLogger.logFileOperation(
  'write',
  '/path/to/file.txt',
  { size: 1024, lines: 20 }
)

// 记录错误
activityLogger.logError(
  new Error('Something went wrong'),
  { context: 'file_write', path: '/path' }
)

// 记录用户操作
activityLogger.logUserAction(
  '点击撤销按钮',
  { operationId: 'op_123' }
)

// 记录系统事件
activityLogger.logSystem(
  '应用启动',
  { version: '1.0.0', platform: 'darwin' }
)
```

### 查询日志

```javascript
// 获取所有日志
const allLogs = activityLogger.getLogs()

// 获取最近的日志
const recent = activityLogger.getRecentLogs(50)

// 按类型查询
const toolLogs = activityLogger.getLogsByType('tool_call', 20)

// 按级别查询
const errors = activityLogger.getLogsByLevel('error')

// 搜索日志
const results = activityLogger.search('write_file')
```

### 过滤日志

```javascript
// 设置过滤器
activityLogger.setFilters({
  level: 'error',
  type: 'tool_result',
  search: 'failed',
  startDate: Date.now() - 3600000,  // 1 hour ago
  endDate: Date.now()
})

// 获取过滤后的日志
const filtered = activityLogger.getLogs()

// 清除过滤器
activityLogger.clearFilters()
```

### 导出日志

```javascript
// 导出为 JSON
const json = activityLogger.export('json')

// 导出为 CSV
const csv = activityLogger.export('csv')

// 导出为 TXT
const txt = activityLogger.export('txt')

// 下载日志文件
activityLogger.download('json')  // 自动下载 activity-log-{timestamp}.json
```

### 实时监听

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { activityLogger } from '@/security/ActivityLogger'

const handleNewLog = (log) => {
  console.log('新日志:', log)
  // 更新 UI
}

onMounted(() => {
  activityLogger.addListener(handleNewLog)
})

onUnmounted(() => {
  activityLogger.removeListener(handleNewLog)
})
</script>
```

### 统计信息

```javascript
const stats = activityLogger.getStats()
console.log(stats)
// {
//   total: 150,
//   byLevel: {
//     debug: 20,
//     info: 100,
//     warn: 20,
//     error: 10
//   },
//   byType: {
//     ai_request: 30,
//     tool_call: 50,
//     ...
//   },
//   errors: 10,
//   warnings: 20
// }
```

---

## 🎨 UI 组件

### OperationConfirmDialog

用于显示操作确认对话框。

```vue
<template>
  <OperationConfirmDialog
    :operation="currentOperation"
    :pending-operations="pendingOps"
    @approve="handleApprove"
    @deny="handleDeny"
    @approve-all="handleApproveAll"
    @cancel="handleCancel"
  />
</template>

<script setup>
import { ref } from 'vue'
import OperationConfirmDialog from '@/components/OperationConfirmDialog.vue'

const currentOperation = ref({
  id: 'op_123',
  type: 'write_file',
  riskLevel: 'medium',
  preview: {
    title: '📝 写入文件',
    path: '/path/to/file',
    description: '修改现有文件',
    changes: [...],
    stats: { ... }
  }
})

const pendingOps = ref([...])

const handleApprove = (opId) => {
  console.log('批准:', opId)
}

const handleDeny = (opId) => {
  console.log('拒绝:', opId)
}

const handleApproveAll = () => {
  console.log('批准所有')
}

const handleCancel = () => {
  console.log('取消')
}
</script>
```

### UndoHistoryPanel

用于显示操作历史和提供撤销/重做功能。

```vue
<template>
  <UndoHistoryPanel
    :collapsed="false"
    @undo="handleUndo"
    @redo="handleRedo"
    @rollback="handleRollback"
    @error="handleError"
  />
</template>

<script setup>
import UndoHistoryPanel from '@/components/UndoHistoryPanel.vue'

const handleUndo = (result) => {
  console.log('撤销成功:', result)
}

const handleRedo = (result) => {
  console.log('重做成功:', result)
}

const handleRollback = (result) => {
  console.log('回滚成功:', result)
}

const handleError = (error) => {
  console.error('操作失败:', error)
}
</script>
```

### ActivityLogPanel

用于显示和管理活动日志。

```vue
<template>
  <ActivityLogPanel
    :collapsed="false"
    :auto-scroll="true"
    @log-selected="handleLogSelected"
    @error="handleError"
  />
</template>

<script setup>
import ActivityLogPanel from '@/components/ActivityLogPanel.vue'

const handleLogSelected = (log) => {
  console.log('选中日志:', log)
}

const handleError = (error) => {
  console.error('错误:', error)
}
</script>
```

---

## ⌨️ 快捷键

### 全局快捷键

| 快捷键 | 功能 | 适用场景 |
|--------|------|----------|
| `Ctrl+Z` | 撤销 | 操作历史面板 |
| `Ctrl+Shift+Z` | 重做 | 操作历史面板 |
| `Enter` | 批准操作 | 确认对话框 |
| `Esc` | 拒绝/关闭 | 确认对话框 |
| `Ctrl+A` | 批准所有 | 确认对话框（有待确认操作时） |

### 自定义快捷键

```javascript
// 在组件中添加自定义快捷键
const handleKeydown = (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    // 自定义操作
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
```

---

## 💡 最佳实践

### 1. 安全检查

```javascript
// ✅ 推荐：在执行危险操作前进行安全检查
const executeDangerousCommand = async (cmd) => {
  const check = checkCommand(cmd)

  if (!check.isSafe) {
    // 添加到待确认队列
    const opId = safetyChecker.addPendingOperation({
      type: 'execute_command',
      params: { cmd },
      riskLevel: check.level,
      preview: safetyChecker.generatePreview({ type: 'execute_command', params: { cmd } })
    })

    // 等待用户确认
    await waitForApproval(opId)
  }

  // 执行命令
  return await invoke('execute_command', { cmd })
}

// ❌ 不推荐：直接执行危险命令
const executeDangerousCommand = async (cmd) => {
  return await invoke('execute_command', { cmd })
}
```

### 2. 撤销功能

```javascript
// ✅ 推荐：在修改文件前记录操作
const writeFile = async (path, content) => {
  // 读取旧内容
  const oldContent = await invoke('read_file', { path }).catch(() => null)

  // 记录操作
  await undoManager.createFileWriteRecord(path, content, oldContent)

  // 执行写入
  return await invoke('write_file', { path, content })
}

// ❌ 不推荐：直接写入文件，无法撤销
const writeFile = async (path, content) => {
  return await invoke('write_file', { path, content })
}
```

### 3. 日志记录

```javascript
// ✅ 推荐：记录关键操作和结果
const callTool = async (toolName, params) => {
  // 记录调用
  activityLogger.logToolCall(toolName, params)

  const startTime = Date.now()

  try {
    const result = await tool.execute(params)
    const duration = Date.now() - startTime

    // 记录成功结果
    activityLogger.logToolResult(toolName, result, true, duration)

    return result
  } catch (error) {
    // 记录错误
    activityLogger.logError(error, { toolName, params })
    throw error
  }
}

// ❌ 不推荐：不记录日志
const callTool = async (toolName, params) => {
  return await tool.execute(params)
}
```

### 4. 错误处理

```javascript
// ✅ 推荐：完善的错误处理和日志记录
const performOperation = async () => {
  try {
    // 执行操作
    await someOperation()
  } catch (error) {
    // 记录错误
    activityLogger.logError(error, {
      context: 'performOperation',
      details: { ... }
    })

    // 显示用户友好的错误消息
    showErrorNotification(error.message)

    // 可选：尝试恢复
    if (canRecover(error)) {
      await undoManager.undo()
    }
  }
}

// ❌ 不推荐：忽略错误
const performOperation = async () => {
  try {
    await someOperation()
  } catch (error) {
    console.log(error)
  }
}
```

### 5. 性能优化

```javascript
// ✅ 推荐：批量操作
const writeMultipleFiles = async (files) => {
  const operations = []

  for (const { path, content } of files) {
    // 批量记录操作
    operations.push(
      undoManager.createFileWriteRecord(path, content)
    )
  }

  await Promise.all(operations)

  // 批量写入
  return await Promise.all(
    files.map(f => invoke('write_file', f))
  )
}

// ❌ 不推荐：逐个处理
const writeMultipleFiles = async (files) => {
  for (const { path, content } of files) {
    await undoManager.createFileWriteRecord(path, content)
    await invoke('write_file', { path, content })
  }
}
```

---

## 🔧 配置选项

### SafetyChecker

```javascript
// 自定义危险模式（扩展）
import { DANGEROUS_PATTERNS } from '@/security/SafetyChecker'

DANGEROUS_PATTERNS.CUSTOM = {
  patterns: [/my-dangerous-pattern/],
  level: 'high',
  message: '自定义危险操作'
}

// 自定义敏感路径（扩展）
import { SENSITIVE_PATHS } from '@/security/SafetyChecker'

SENSITIVE_PATHS.push('/my/sensitive/path')
```

### UndoManager

```javascript
// 修改撤销栈大小（需修改源码）
const MAX_UNDO_STACK_SIZE = 100  // 默认 50
```

### ActivityLogger

```javascript
// 修改日志保留数量（需修改源码）
const MAX_LOG_ENTRIES = 2000  // 默认 1000
```

---

## 📖 API 参考

完整的 API 文档请参考各模块的源代码注释：

- `src/security/SafetyChecker.js` - 安全检查器
- `src/security/UndoManager.js` - 撤销管理器
- `src/security/ActivityLogger.js` - 活动日志

---

## 🆘 故障排除

### 问题：撤销操作失败

**原因**：备份不存在或已被清理

**解决方案**：
```javascript
// 检查撤销栈
const stats = undoManager.getStats()
console.log('可撤销操作数:', stats.undoCount)

// 查看操作历史
const history = undoManager.getHistory()
console.log('操作历史:', history)
```

### 问题：日志没有持久化

**原因**：localStorage 已满或被禁用

**解决方案**：
```javascript
// 清空旧日志
activityLogger.clear()

// 或导出后清空
activityLogger.download('json')
activityLogger.clear()
```

### 问题：安全检查不准确

**原因**：需要自定义规则

**解决方案**：
```javascript
// 添加自定义检查逻辑
const customCheck = (cmd) => {
  const baseCheck = checkCommand(cmd)

  // 自定义逻辑
  if (cmd.includes('my-custom-danger')) {
    return {
      ...baseCheck,
      level: 'critical',
      risks: [
        ...baseCheck.risks,
        { category: 'CUSTOM', level: 'critical', message: '自定义危险' }
      ]
    }
  }

  return baseCheck
}
```

---

## 🎓 教程

### 教程 1：实现完整的文件操作保护

```javascript
// 1. 创建包装函数
const safeWriteFile = async (path, content) => {
  // 安全检查
  const pathCheck = checkFilePath(path, 'write')

  if (!pathCheck.isSafe) {
    const opId = safetyChecker.addPendingOperation({
      type: 'write_file',
      params: { path, content },
      riskLevel: pathCheck.level,
      preview: safetyChecker.generatePreview({
        type: 'write_file',
        params: { path, content }
      })
    })

    // 等待确认
    const approved = await waitForApproval(opId)
    if (!approved) {
      throw new Error('操作被拒绝')
    }
  }

  // 记录撤销信息
  const oldContent = await invoke('read_file', { path }).catch(() => null)
  await undoManager.createFileWriteRecord(path, content, oldContent)

  // 记录日志
  activityLogger.logFileOperation('write', path, { size: content.length })

  // 执行操作
  try {
    const result = await invoke('write_file', { path, content })
    activityLogger.logToolResult('write_file', result, true)
    return result
  } catch (error) {
    activityLogger.logError(error, { path, content })
    throw error
  }
}

// 2. 使用
await safeWriteFile('/path/to/file.txt', 'new content')

// 3. 如果需要撤销
await undo()
```

### 教程 2：创建自定义日志类型

```javascript
// 1. 扩展 LogType
export const CustomLogType = {
  DEPLOYMENT: 'deployment',
  API_CALL: 'api_call'
}

// 2. 创建便捷函数
export const logDeployment = (target, version, status) => {
  return activityLogger.log(
    LogLevel.INFO,
    CustomLogType.DEPLOYMENT,
    `部署到 ${target}`,
    { target, version, status }
  )
}

// 3. 使用
logDeployment('production', 'v1.2.3', 'success')

// 4. 查询
const deployments = activityLogger.getLogsByType('deployment')
```

---

## 📞 支持

如有问题或建议，请：

1. 查看源代码注释
2. 阅读测试报告 `PHASE3_TEST_REPORT.md`
3. 查看总结文档 `PHASE3_SUMMARY.md`
4. 参考路线图 `AI_AGENT_ROADMAP.md`

---

**最后更新**: 2025-11-02
**版本**: Phase 3 Complete ✅

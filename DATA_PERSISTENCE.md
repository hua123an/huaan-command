# 💾 数据持久化说明

## 概述

Huaan Command 使用 `localStorage` 对所有关键数据进行持久化，确保应用重启后数据不丢失。

---

## 📊 持久化数据清单

### 1. **任务数据** (`task.js`)

#### 任务列表
- **Key**: `huaan-tasks`
- **内容**: 任务的基本信息（id, name, command, group, envVars）
- **保存时机**: 任务创建、更新、删除时（节流 1 秒）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
[
  {
    id: 'task-xxx',
    name: '任务名称',
    command: 'npm run build',
    group: '开发',
    envVars: { NODE_ENV: 'production' }
  }
]
```

#### 任务分组
- **Key**: `huaan-task-groups`
- **内容**: 所有自定义分组名称
- **保存时机**: 分组添加、删除时（自动监听）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
['默认分组', '开发', '测试', '部署']
```

#### 活动分组
- **Key**: `huaan-active-group`
- **内容**: 当前选中的分组
- **保存时机**: 切换分组时（自动监听）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
'开发'  // 或 '全部'
```

---

### 2. **应用设置** (`settings.js`)

- **Key**: `huaan-settings`
- **内容**: 应用配置
- **保存时机**: 设置更新时（立即保存）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
{
  theme: 'dark',                  // 主题
  maxConcurrent: 10,              // 最大并发数
  enableNotifications: true,      // 启用通知
  enableSound: true,              // 启用声音
  soundVolume: 0.5,               // 音量 (0-1)
  enableHistory: true,            // 启用历史记录
  maxHistoryItems: 100            // 最大历史记录数
}
```

---

### 3. **执行历史** (`history.js`)

- **Key**: `huaan-history`
- **内容**: 任务执行历史记录
- **保存时机**: 任务完成时（立即保存）
- **恢复时机**: Store 初始化时
- **限制**: 最多保存 `maxHistoryItems` 条记录
- **数据结构**:
```javascript
[
  {
    id: 'history-xxx',
    taskId: 'task-xxx',
    name: '任务名称',
    command: 'npm test',
    status: 'success',
    startTime: 1234567890,
    endTime: 1234567900,
    duration: 10000,
    output: '...',               // 前 1000 字符
    error: '...',                 // 前 1000 字符
    timestamp: 1234567890
  }
]
```

---

### 4. **工作流** (`workflow.js`)

- **Key**: `huaan-custom-workflows`
- **内容**: 用户自定义的工作流模板
- **保存时机**: 创建、删除工作流时（立即保存）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
[
  {
    id: 'custom-xxx',
    name: '我的工作流',
    icon: '🚀',
    description: '自定义工作流描述',
    isCustom: true,
    tasks: [
      { name: '任务1', command: 'npm install', group: '开发' },
      { name: '任务2', command: 'npm build', group: '开发' }
    ]
  }
]
```

**注意**: 预设工作流（非自定义）不会被持久化，每次从代码加载。

---

### 5. **终端会话** (`terminal.js`)

#### 终端标签页
- **Key**: `terminal-sessions`
- **内容**: 所有终端标签页的元数据
- **保存时机**: 标签页创建、关闭、切换、重命名时（自动监听）
- **恢复时机**: 应用启动时（如果启用自动恢复）
- **数据结构**:
```javascript
[
  {
    id: null,                    // 不保存，恢复时重新生成
    title: 'Shell',
    active: false
  },
  {
    id: null,
    title: 'Dev Server',
    active: true
  }
]
```

**注意**: 
- 终端进程本身无法持久化，只保存标签页结构
- 恢复时会创建新的终端进程

#### 自动恢复设置
- **Key**: `terminal-auto-restore`
- **内容**: 是否启用终端会话自动恢复
- **保存时机**: 设置更新时（自动监听）
- **恢复时机**: Store 初始化时
- **数据结构**:
```javascript
true  // 或 false
```

---

### 6. **AI 配置** (`ai.js`)

#### AI 服务商
- **Key**: `ai-provider`
- **内容**: 当前选择的 AI 服务商
- **数据结构**: `'openai' | 'deepseek' | 'moonshot' | ...`

#### API Key
- **Key**: `ai-api-key`
- **内容**: AI 服务的 API Key
- **数据结构**: `'sk-...'`

#### API 端点
- **Key**: `ai-endpoint`
- **内容**: AI API 的端点 URL
- **数据结构**: `'https://api.openai.com/v1'`

#### 模型
- **Key**: `ai-model`
- **内容**: 当前选择的模型
- **数据结构**: `'gpt-4o-mini'`

#### 启用状态
- **Key**: `ai-enabled`
- **内容**: AI 功能是否启用
- **数据结构**: `'true'` 或 `'false'` (字符串)

**保存时机**: 配置更改时（调用 `saveConfig()`）
**恢复时机**: Store 初始化时

---

## 🔄 持久化机制

### 自动保存策略

#### 1. **立即保存**
适用于：
- 设置更新
- 历史记录添加
- 工作流创建/删除

```javascript
function saveSettings() {
  localStorage.setItem('huaan-settings', JSON.stringify(settings.value))
}
```

#### 2. **节流保存** (1 秒)
适用于：
- 任务列表更新（频繁变动）

```javascript
const throttledSave = throttle(() => {
  localStorage.setItem('huaan-tasks', JSON.stringify(tasks.value))
}, 1000)
```

#### 3. **Watch 自动保存**
适用于：
- 分组变化
- 活动分组变化
- 终端会话变化

```javascript
watch(groups, () => {
  saveGroups()
}, { deep: true })
```

---

### 自动加载策略

所有 Store 在初始化时自动加载数据：

```javascript
// 在 defineStore 的 return 之前
loadTasks()
loadGroups()
loadActiveGroup()
loadSettings()
loadHistory()
// ...
```

---

## 🛡️ 错误处理

所有加载函数都包含错误处理：

```javascript
function loadTasks() {
  const saved = localStorage.getItem('huaan-tasks')
  if (saved) {
    try {
      tasks.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load tasks:', e)
      // 不抛出错误，使用默认值
    }
  }
}
```

---

## 📋 数据清理

### 用户主动清理

#### 1. 清空任务
```javascript
taskStore.clearTasks()
// 清空 Rust 后端 + localStorage
```

#### 2. 清空历史
```javascript
historyStore.clearHistory()
// 删除 localStorage 'huaan-history'
```

#### 3. 清空终端会话
```javascript
terminalStore.clearAllSessions()
// 删除 localStorage 'terminal-sessions'
```

#### 4. 重置设置
```javascript
settingsStore.resetSettings()
// 恢复默认设置并保存
```

### 自动清理

#### 历史记录限制
```javascript
if (history.value.length > maxHistoryItems) {
  history.value = history.value.slice(0, maxHistoryItems)
}
```

---

## 🔍 调试技巧

### 查看所有持久化数据

在浏览器开发者工具 Console 中：

```javascript
// 查看所有 huaan- 开头的 key
Object.keys(localStorage).filter(k => k.startsWith('huaan-'))

// 查看特定数据
JSON.parse(localStorage.getItem('huaan-tasks'))
JSON.parse(localStorage.getItem('huaan-settings'))
JSON.parse(localStorage.getItem('huaan-history'))

// 查看 AI 配置
localStorage.getItem('ai-provider')
localStorage.getItem('ai-api-key')
localStorage.getItem('ai-model')
```

### 清空所有数据

```javascript
// ⚠️ 慎用：清空所有 localStorage
Object.keys(localStorage)
  .filter(k => k.startsWith('huaan-') || k.startsWith('ai-') || k.startsWith('terminal-'))
  .forEach(k => localStorage.removeItem(k))
```

---

## 📊 存储大小估算

### 典型使用场景

| 数据类型 | 数量 | 平均大小 | 总大小 |
|---------|------|---------|--------|
| 任务 | 50 | 200 B | 10 KB |
| 历史记录 | 100 | 1.5 KB | 150 KB |
| 分组 | 10 | 20 B | 200 B |
| 工作流 | 5 | 500 B | 2.5 KB |
| 终端会话 | 5 | 50 B | 250 B |
| 设置 | 1 | 200 B | 200 B |
| AI 配置 | 1 | 300 B | 300 B |
| **总计** | - | - | **~163 KB** |

### localStorage 限制

- 大多数浏览器: **5-10 MB**
- Huaan Command 预估使用: **< 500 KB** (含大量数据)
- 安全范围: ✅

---

## ⚠️ 注意事项

### 1. 不持久化的数据

以下数据**不会**持久化：

- 任务运行状态（status, output, error, start_time, end_time）
- 终端进程实例（PTY）
- WebSocket 连接
- AI 聊天历史（仅内存）
- 临时 UI 状态（modal 显示、搜索查询等）

**原因**: 这些是运行时状态，重启后应重置。

---

### 2. 安全考虑

#### API Key 存储

- ✅ **当前**: 存储在 `localStorage`（明文）
- ⚠️ **风险**: XSS 攻击可读取
- 🔒 **建议**: 考虑使用 Tauri 的安全存储

```rust
// 未来改进：使用 Tauri Keychain
use tauri_plugin_keyring::KeyringExt;

#[tauri::command]
fn save_api_key(app: AppHandle, key: String) -> Result<(), String> {
    app.keyring().set("openai_api_key", &key)
        .map_err(|e| e.to_string())
}
```

---

### 3. 数据迁移

当数据结构变更时，需要添加迁移逻辑：

```javascript
function loadTasks() {
  const saved = localStorage.getItem('huaan-tasks')
  if (saved) {
    try {
      let tasks = JSON.parse(saved)
      
      // 数据迁移：添加 group 字段（v1.1.0）
      tasks = tasks.map(task => ({
        ...task,
        group: task.group || '默认分组'
      }))
      
      // 数据迁移：添加 envVars 字段（v1.2.0）
      tasks = tasks.map(task => ({
        ...task,
        envVars: task.envVars || {}
      }))
      
      tasks.value = tasks
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
  }
}
```

---

## ✅ 持久化验证清单

测试所有持久化功能：

- [ ] 创建任务 → 重启 → 任务仍存在
- [ ] 添加分组 → 重启 → 分组仍存在
- [ ] 切换分组 → 重启 → 保持选中
- [ ] 执行任务 → 重启 → 历史记录存在
- [ ] 修改设置 → 重启 → 设置生效
- [ ] 创建工作流 → 重启 → 工作流存在
- [ ] 创建终端标签 → 重启 → 标签恢复（如启用）
- [ ] 配置 AI → 重启 → 配置保留

---

## 🚀 性能优化

### 1. 节流保存

```javascript
// ❌ 不好：频繁写入
watch(tasks, () => {
  localStorage.setItem('huaan-tasks', JSON.stringify(tasks.value))
}, { deep: true })

// ✅ 好：节流写入
const throttledSave = throttle(() => {
  localStorage.setItem('huaan-tasks', JSON.stringify(tasks.value))
}, 1000)

watch(tasks, throttledSave, { deep: true })
```

### 2. 部分更新

```javascript
// ❌ 不好：保存所有字段
const toSave = tasks.value

// ✅ 好：只保存必要字段
const toSave = tasks.value.map(({ id, name, command, group, envVars }) => ({
  id, name, command, group, envVars
}))
```

### 3. 压缩数据（可选）

对于大数据集，可以考虑压缩：

```javascript
import pako from 'pako'

function saveCompressed(key, data) {
  const json = JSON.stringify(data)
  const compressed = pako.deflate(json)
  const base64 = btoa(String.fromCharCode(...compressed))
  localStorage.setItem(key, base64)
}

function loadCompressed(key) {
  const base64 = localStorage.getItem(key)
  if (!base64) return null
  
  const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const json = pako.inflate(compressed, { to: 'string' })
  return JSON.parse(json)
}
```

---

## 📚 相关文档

- [任务管理](./README_CN.md#任务管理)
- [终端持久化](./TERMINAL_PERSISTENCE.md)
- [AI 配置](./AI_API_DESIGN.md#配置管理)

---

**所有数据已完整持久化！重启无忧！** 💾✅


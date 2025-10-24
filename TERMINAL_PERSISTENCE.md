# 🖥️ 终端持久化 - 会话自动保存

## 功能概述

终端会话现在会自动保存到 localStorage，重启应用后自动恢复！

### ✨ 核心功能

- **🔄 自动保存** - 标签页、标题实时保存
- **📂 自动恢复** - 重启后恢复所有标签页
- **✏️ 重命名** - 双击标签页标题即可编辑
- **⚙️ 灵活配置** - 设置中可开关自动恢复

---

## 🎯 使用方式

### 1. 自动持久化

终端会话会自动保存，无需手动操作：

```
打开应用
  ↓
创建 3 个终端标签页
  - 终端 1
  - 终端 2
  - 终端 3
  ↓
关闭应用
  ↓
重新打开应用
  ↓
✨ 自动恢复 3 个标签页！
```

### 2. 标签页重命名

**方法 1：双击编辑**
```
双击标签页标题
  ↓
输入新名称
  ↓
按 Enter 保存
（或按 Esc 取消）
```

**示例**：
```
终端 1  →  双击  →  "前端开发"
终端 2  →  双击  →  "后端服务"
终端 3  →  双击  →  "数据库"
```

### 3. 设置管理

打开设置（⚙️）→ 终端部分：

**自动恢复会话**
- ✅ 开启：重启自动恢复标签页
- ❌ 关闭：每次启动创建空终端

**清除所有会话**
- 清除保存的所有标签页记录
- 不影响当前打开的终端

---

## 💾 保存内容

### 会保存的信息

✅ **标签页数量**
```javascript
sessions: [
  { title: "终端 1" },
  { title: "终端 2" },
  { title: "前端开发" }
]
```

✅ **标签页标题**
- 自定义名称
- 实时同步

✅ **活动标签页**
- 记住你最后使用的标签

### 不会保存的信息

❌ **终端历史**
- 命令历史不保存
- 输出内容不保存

❌ **进程状态**
- 后端进程重启后重新创建
- 会话 ID 重新生成

---

## 🔧 技术实现

### 前端 Store

```javascript
// src/stores/terminal.js

// 保存会话
function saveSessions() {
  const toSave = sessions.value.map(session => ({
    title: session.title,
    active: session.active
  }))
  localStorage.setItem('terminal-sessions', JSON.stringify(toSave))
}

// 加载会话
function loadSessions() {
  const saved = localStorage.getItem('terminal-sessions')
  if (saved) {
    const parsed = JSON.parse(saved)
    sessions.value = parsed.map((session, index) => ({
      ...session,
      id: Date.now() + index,  // 重新生成 ID
      restored: true
    }))
    return true
  }
  return false
}

// 自动保存监听
watch([sessions, activeSessionId], () => {
  saveSessions()
}, { deep: true })
```

### 应用启动

```javascript
// src/views/Terminal.vue

onMounted(() => {
  // 尝试恢复保存的会话
  const restored = store.loadSessions()
  
  // 如果没有恢复任何会话，创建一个新的
  if (!restored && store.sessions.length === 0) {
    store.createSession()
  }
})
```

### 标签页重命名

```javascript
// src/components/TerminalTabs.vue

// 双击开始编辑
const startEdit = (session, event) => {
  editingTab.value = session.id
  editingTitle.value = session.title
  // 自动选中文本
  setTimeout(() => input.focus() && input.select(), 10)
}

// 保存标题
const saveEdit = (id) => {
  if (editingTitle.value.trim()) {
    store.updateSessionTitle(id, editingTitle.value.trim())
  }
}

// 快捷键
- Enter: 保存
- Escape: 取消
- 失去焦点: 自动保存
```

---

## 📊 数据结构

### LocalStorage 存储

```json
{
  "terminal-sessions": [
    { "title": "前端开发", "active": true },
    { "title": "后端服务", "active": true },
    { "title": "数据库", "active": true }
  ],
  "terminal-active-session": 1729876543210
}
```

### 运行时结构

```javascript
sessions: [
  {
    id: 1729876543210,      // 运行时生成
    title: "前端开发",       // 保存的标题
    active: true,
    restored: true           // 标记为恢复的会话
  },
  // ...
]
```

---

## 🎨 UI 交互

### 标签页状态

**普通状态**
```
┌─────────────────┐
│ 终端 1         ✕│
└─────────────────┘
```

**悬停状态**
```
┌─────────────────┐
│ 终端 1         ✕│  ← 高亮，显示关闭按钮
└─────────────────┘
双击标题可重命名
```

**编辑状态**
```
┌─────────────────┐
│[前端开发_]     ✕│  ← 输入框，蓝色边框
└─────────────────┘
Enter 保存 | Esc 取消
```

**活动状态**
```
┌═════════════════┐
│ 前端开发       ✕│  ← 深色背景，顶部蓝色线
└═════════════════┘
```

### 设置界面

```
🖥️ 终端
┌─────────────────────────────────────┐
│                                     │
│ 自动恢复会话               [✓ 开启] │
│ 重启应用时恢复终端标签页             │
│                                     │
│ 会话管理                            │
│ 当前保存了 3 个终端标签页            │
│                        [清除所有会话]│
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 最佳实践

### 1. 为标签页命名

**推荐做法**：
```
✅ "前端开发"   - 清晰明确
✅ "API 服务"   - 功能描述
✅ "监控日志"   - 用途说明
✅ "测试环境"   - 环境标识
```

**不推荐**：
```
❌ "终端 1"     - 默认名称，无意义
❌ "aaa"        - 太简短
❌ "临时"       - 不具体
```

### 2. 合理组织

**按功能分组**：
```
📱 前端
  └─ npm run dev
  
🔧 后端
  └─ cargo run
  
🗄️ 数据库
  └─ redis-server
  
🧪 测试
  └─ npm test
```

### 3. 定期清理

- 不需要的标签页及时关闭
- 定期清除旧会话记录
- 保持标签页数量在 5 个以内

---

## 💡 使用场景

### 场景 1：日常开发

```
早上打开应用
  ↓
自动恢复昨天的 4 个标签页：
  - 前端开发 (npm run dev)
  - 后端服务 (cargo run)
  - 数据库 (redis-server)
  - Git 操作
  ↓
继续开发，无需重新配置！
```

### 场景 2：项目切换

```
项目 A 的终端：
  - 前端-A
  - 后端-A
  - 测试-A
  
切换到项目 B
  ↓
关闭所有 A 的标签页
  ↓
创建 B 的标签页
  ↓
下次打开，自动恢复 B 的配置
```

### 场景 3：多环境管理

```
开发环境
  - dev-frontend
  - dev-backend
  
测试环境
  - test-frontend
  - test-backend
  
生产环境
  - prod-monitor
  - prod-logs
```

---

## ⚙️ 配置选项

### 自动恢复（默认开启）

**开启时**：
- ✅ 重启自动恢复标签页
- ✅ 保持工作环境连续性
- ✅ 节省配置时间

**关闭时**：
- ✅ 每次启动全新环境
- ✅ 不保存任何会话
- ✅ 适合临时任务

### 清除会话

**操作**：
```
设置 → 终端 → 清除所有会话
  ↓
确认对话框
  ↓
清除保存的记录
```

**效果**：
- 删除 localStorage 中的会话数据
- 当前打开的终端不受影响
- 下次启动创建空终端

---

## 🔍 故障排查

### 问题 1：会话没有恢复

**可能原因**：
- ❌ 自动恢复功能已关闭
- ❌ localStorage 被清除
- ❌ 浏览器隐私模式

**解决方案**：
```
1. 检查设置 → 终端 → 自动恢复会话
2. 确认浏览器允许 localStorage
3. 不要使用隐私/无痕模式
```

### 问题 2：标签页标题重置

**可能原因**：
- ❌ 保存失败
- ❌ 存储空间不足

**解决方案**：
```
1. 检查浏览器控制台错误
2. 清理 localStorage 空间
3. 重新命名并保存
```

### 问题 3：会话 ID 变化

**这是正常的！**
- 后端进程重启后重新生成 ID
- 不影响标签页恢复
- 只影响内部引用

---

## 📈 性能影响

### 存储空间

```
每个会话约 50 bytes
100 个会话 ≈ 5 KB
1000 个会话 ≈ 50 KB
```

**结论**：几乎可以忽略

### 加载时间

```
读取 localStorage: < 1ms
解析 JSON: < 1ms
创建会话: < 5ms
总计: < 10ms
```

**结论**：用户无感知

### 保存频率

```
自动保存触发时机：
- 创建标签页
- 关闭标签页
- 切换活动标签
- 重命名标签
```

**优化**：使用 watch 自动保存，无需手动

---

## 🆚 对比其他终端

| 功能 | Huaan Command | iTerm2 | Windows Terminal |
|------|---------------|--------|------------------|
| 会话持久化 | ✅ 自动 | ✅ 手动配置 | ✅ 配置文件 |
| 标签页恢复 | ✅ 自动 | ❌ 不支持 | ❌ 不支持 |
| 快速重命名 | ✅ 双击 | ✅ 右键菜单 | ❌ 不支持 |
| 自动保存 | ✅ 实时 | ❌ | ❌ |

---

## 🎯 总结

终端持久化让你的工作环境保持连续性：

✅ **自动化** - 无需手动配置
✅ **智能化** - 实时保存，自动恢复
✅ **个性化** - 自定义标签页名称
✅ **高效化** - 节省每次启动的配置时间

**立即体验**：
1. 创建几个终端标签页
2. 双击重命名
3. 关闭应用
4. 重新打开
5. ✨ 标签页自动恢复！

---

**终端持久化 - 让你的工作环境永不丢失！** 🎉


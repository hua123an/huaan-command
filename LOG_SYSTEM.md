# 📋 应用日志系统

## 概述

应用现已集成通用日志系统，用于记录和展示应用运行时的重要信息、警告和错误。

## 功能特性

### 1. 日志级别

- **信息 (INFO)** - 一般性信息，如操作状态
- **成功 (SUCCESS)** - 成功完成的操作
- **警告 (WARN)** - 需要注意但不影响运行的情况
- **错误 (ERROR)** - 发生的错误和异常

### 2. 日志面板

- 📋 美观的浮动日志面板
- 🔍 按日志级别过滤
- 🧹 一键清空日志
- ⌨️ 快捷键 `Ctrl+Shift+L` 打开/关闭

### 3. 自动记录

系统已在关键位置自动记录日志：

- ✅ 应用启动
- 📁 终端会话创建/关闭/恢复
- ❌ 终端初始化错误
- 💾 会话持久化错误

## 使用方法

### 在组件中使用

```javascript
import { useLogsStore } from '../stores/logs'

const logsStore = useLogsStore()

// 记录信息
logsStore.info('这是一条信息')

// 记录成功
logsStore.success('操作成功完成')

// 记录警告
logsStore.warn('这是一个警告')

// 记录错误
logsStore.error('发生了一个错误')
```

### 打开日志面板

1. 点击右下角的 📋 浮动按钮
2. 或按快捷键 `Ctrl+Shift+L`

### 过滤日志

点击面板顶部的过滤按钮：

- **全部** - 显示所有日志
- **信息** - 只显示信息日志
- **成功** - 只显示成功日志
- **警告** - 只显示警告日志
- **错误** - 只显示错误日志

## 最佳实践

### 何时记录日志

✅ **应该记录：**
- 用户主动操作（创建、删除、保存等）
- 系统状态变化（启动、关闭、初始化等）
- 错误和异常
- 重要的业务逻辑执行结果

❌ **不应记录：**
- 频繁触发的事件（如鼠标移动、滚动等）
- 调试用的详细信息（除非是开发模式）
- 敏感信息（密码、令牌等）

### 日志消息格式

```javascript
// ✅ 好的格式：简洁、清晰
logsStore.success('创建新终端: 终端 3')
logsStore.error('终端初始化失败: 连接超时')

// ❌ 不好的格式：过于简单或冗长
logsStore.info('ok')
logsStore.error('Error: Cannot read property x of undefined at line 123...')
```

## 扩展性

### 添加新的日志来源

任何组件或 store 都可以使用日志系统：

1. 导入 `useLogsStore`
2. 在适当的位置调用相应的日志方法

### 自定义日志处理

可以在 `src/stores/logs.js` 中扩展日志系统：

- 添加日志持久化
- 集成远程日志服务
- 添加日志导出功能

## 技术细节

### 文件结构

```
src/
├── stores/
│   └── logs.js              # 日志管理 store
├── components/
│   └── DebugPanel.vue       # 日志面板组件
```

### Store API

```javascript
{
  logs,            // Ref<Log[]> - 日志数组
  LogLevel,        // 日志级别枚举
  addLog(level, message, context),  // 添加日志
  info(message, context),   // 添加信息日志
  warn(message, context),   // 添加警告日志
  error(message, context),  // 添加错误日志
  success(message, context), // 添加成功日志
  clear()          // 清空日志
}
```

## 常见问题

**Q: 日志会持久化吗？**  
A: 目前日志只在内存中，刷新页面后会清空。如需持久化，可以扩展 logs store。

**Q: 日志最多保存多少条？**  
A: 默认保存最近 200 条日志，超过会自动删除最旧的日志。

**Q: 如何在任务页面中使用？**  
A: 日志系统是全局的，在任何页面都可以通过 `useLogsStore()` 使用。

**Q: 可以导出日志吗？**  
A: 目前不支持，但可以通过扩展 logs store 添加此功能。


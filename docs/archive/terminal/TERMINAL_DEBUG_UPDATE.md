# 终端白屏调试更新

## 🔍 问题分析

用户报告新建终端仍然白屏，后端日志显示终端进程已成功启动，说明问题在前端渲染层面。

## 🛠️ 本次更新内容

### 1. 添加欢迎信息 (BlockTerminalPane.vue:97-104)

终端初始化时立即显示欢迎信息：

```javascript
// 显示欢迎信息
terminal.write('\x1b[36m🚀 终端已就绪\x1b[0m\r\n')
terminal.write('\x1b[90m等待 shell 初始化...\x1b[0m\r\n')
```

**效果**: 
- 即使 shell 还没有响应，用户也能立即看到终端已经渲染
- 帮助判断是否是渲染问题还是 shell 初始化问题

### 2. 增强的调试日志

添加了详细的控制台日志，追踪整个初始化流程：

```javascript
console.log('🟢 BlockTerminalPane 初始化开始 (会话:', props.session.id, ', visible:', props.visible, ')')
console.log('✅ 终端容器 DOM 元素存在:', terminalRef.value)
console.log('📝 创建 xterm.js 实例')
console.log('🔌 加载终端插件')
console.log('📺 打开终端到 DOM')
console.log('📏 调整终端大小')
console.log('✅ xterm.js 终端已创建，尺寸:', terminal.cols, 'x', terminal.rows)
console.log('📡 开始监听终端输出:', `terminal-output-${props.session.id}`)
console.log('📥 收到终端输出 (会话', props.session.id, '):', event.payload.substring(0, 50), '...')
console.log('📤 发送初始化命令到会话:', props.session.id)
console.log('👁️ 终端可见性变化 (会话', props.session.id, '):', newVisible)
```

### 3. DOM 元素检查

添加了对终端容器 DOM 元素的检查：

```javascript
if (!terminalRef.value) {
  console.error('❌ 终端容器 DOM 元素不存在！')
  return
}
```

### 4. 输出监听增强

在输出监听中添加日志和错误处理：

```javascript
unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
  console.log('📥 收到终端输出 (会话', props.session.id, '):', event.payload.substring(0, 50), '...')
  if (terminal) {
    terminal.write(event.payload)
  } else {
    console.warn('⚠️ 终端实例不存在，无法写入输出')
  }
})
```

### 5. 可见性监听

添加对 `visible` 属性变化的监听：

```javascript
watch(() => props.visible, (newVisible) => {
  console.log('👁️ 终端可见性变化 (会话', props.session.id, '):', newVisible)
  if (newVisible && terminal && fitAddon) {
    nextTick(() => {
      fitAddon.fit()
      // 调整 PTY 大小
    })
  }
})
```

### 6. 初始化错误处理

增强的错误提示和处理：

```javascript
try {
  await invoke('write_terminal', {
    sessionId: props.session.id,
    data: '\r'
  })
  console.log('✅ 初始化命令已发送')
} catch (err) {
  console.error('❌ 初始化失败:', err)
  terminal.write('\x1b[31m❌ 初始化失败: ' + err + '\x1b[0m\r\n')
  terminal.write('\x1b[33m💡 提示: 尝试手动输入命令\x1b[0m\r\n')
}
```

## 🧪 如何测试

### 1. 打开浏览器开发者工具

在应用中按 `Cmd+Option+I` (macOS) 打开开发者工具，切换到 Console 标签。

### 2. 创建新终端

点击 "+" 按钮创建新终端。

### 3. 查看控制台输出

你应该看到类似的日志序列：

```
🟢 BlockTerminalPane 初始化开始 (会话: 1234567890, visible: true)
✅ 终端容器 DOM 元素存在: div.terminal-area
📝 创建 xterm.js 实例
🔌 加载终端插件
📺 打开终端到 DOM
📏 调整终端大小
✅ xterm.js 终端已创建，尺寸: 80 x 24
📡 开始监听终端输出: terminal-output-1234567890
✅ 终端输出监听已设置
📤 发送初始化命令到会话: 1234567890
✅ 初始化命令已发送
📥 收到终端输出 (会话 1234567890): ...
```

### 4. 查看终端界面

你应该立即看到：

```
🚀 终端已就绪
等待 shell 初始化...
```

然后应该会出现 shell prompt（如 `user@hostname:~$`）

## 🔍 故障诊断

### 情况 1: 看到欢迎信息但没有 prompt

**说明**: xterm.js 正常工作，问题在于 shell 进程或通信

**检查项**:
- 控制台是否有 "📥 收到终端输出" 日志？
- 后端是否报错？
- 是否有环境变量相关的错误？

### 情况 2: 完全看不到任何内容

**说明**: 前端渲染问题

**检查项**:
- 控制台是否有 "❌ 终端容器 DOM 元素不存在" 错误？
- `visible` 属性是否为 `true`？（查看日志）
- CSS 是否正确加载？（检查 `.block-terminal-pane.visible` 的 opacity）

### 情况 3: 看到错误信息

**说明**: 初始化失败

**检查项**:
- 控制台显示的具体错误信息
- 后端日志中的错误详情
- Shell 是否正确配置？

## 📝 需要提供的调试信息

如果问题仍然存在，请提供：

1. **浏览器控制台的完整日志** - 从创建终端开始到结束
2. **终端界面截图** - 显示是否有欢迎信息
3. **后端日志** - 特别是 "Starting terminal with shell" 之后的内容
4. **系统信息**:
   - macOS 版本
   - 使用的 shell (bash/zsh/fish)
   - 终端会话 ID

## 🎯 预期结果

完成本次更新后：

1. ✅ 创建新终端时立即看到 "🚀 终端已就绪" 消息
2. ✅ 控制台有完整的初始化流程日志
3. ✅ 300ms 后看到 shell prompt
4. ✅ 可以正常输入和执行命令

如果任何一步失败，日志会清楚指出问题所在。

---

**更新时间**: 2025-01-26  
**状态**: 🔍 等待测试反馈


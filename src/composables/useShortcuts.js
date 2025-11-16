import { ref, onMounted, onUnmounted } from 'vue'

// 快捷键定义
export const SHORTCUTS = {
  // 全局快捷键
  GLOBAL: {
    'Ctrl+P': 'toggleTerminal',
    'Cmd+K': 'toggleCommandPalette',
    'Ctrl+Shift+P': 'toggleCommandPalette',
    'Ctrl+R': 'reverseHistorySearch',
    'Ctrl+L': 'clearTerminal',
    'Ctrl+T': 'newTerminalTab',
    'Ctrl+W': 'closeTerminalTab',
    'Ctrl+Tab': 'nextTerminalTab',
    'Ctrl+Shift+Tab': 'prevTerminalTab',
    'Ctrl+1': 'switchToTask1',
    'Ctrl+2': 'switchToTask2',
    'Ctrl+3': 'switchToTask3',
    'Ctrl+4': 'switchToTask4',
    'Ctrl+5': 'switchToTask5',
    'Ctrl+0': 'switchToTasks',
    'Ctrl+,': 'openSettings',
    'Ctrl+Shift+A': 'toggleAIMode',
    'Ctrl+/': 'toggleAIChat',
    'Escape': 'closeModalOrExitAI'
  },
  
  // 终端内快捷键
  TERMINAL: {
    'Ctrl+A': 'toggleAIMode',
    'Ctrl+C': 'interruptProcess',
    'Ctrl+D': 'exitShell',
    'Ctrl+Z': 'suspendProcess',
    'Ctrl+Shift+C': 'copyToClipboard',
    'Ctrl+Shift+V': 'pasteFromClipboard',
    'Ctrl+Shift+T': 'newTerminal',
    'Ctrl+Shift+W': 'closeTerminal',
    'Tab': 'autoComplete',
    'Shift+Tab': 'reverseAutoComplete',
    'Up': 'historyPrevious',
    'Down': 'historyNext',
    'Left': 'cursorLeft',
    'Right': 'cursorRight',
    'Home': 'cursorStart',
    'End': 'cursorEnd',
    'PageUp': 'scrollUp',
    'PageDown': 'scrollDown'
  },
  
  // AI 聊天快捷键
  AI_CHAT: {
    'Enter': 'sendMessage',
    'Shift+Enter': 'newLine',
    'Up': 'editPreviousMessage',
    'Down': 'editNextMessage',
    'Ctrl+Up': 'scrollChatUp',
    'Ctrl+Down': 'scrollChatDown',
    'Escape': 'closeChat'
  }
}

// 快捷键状态
const shortcuts = ref(new Map())
const isListening = ref(false)

// 快捷键管理 Composable
export function useShortcuts(options = {}) {
  const {
    onNewTab = () => {},
    onCloseTab = () => {},
    onSwitchTab = () => {},
    onClear = () => {},
    onToggleAI = () => {},
    onToggleTerminal = () => {},
    onOpenSettings = () => {},
    onToggleCommandPalette = () => {},
    onReverseHistorySearch = () => {},
    onClearTerminal = () => {},
    onNewTerminalTab = () => {},
    onCloseTerminalTab = () => {},
    onNextTerminalTab = () => {},
    onPrevTerminalTab = () => {},
    onSwitchToTasks = () => {},
    onCloseModalOrExitAI = () => {},
    onToggleAIChat = () => {},
    onSendMessage = () => {},
    onNewLine = () => {},
    onEditPreviousMessage = () => {},
    onEditNextMessage = () => {},
    onScrollChatUp = () => {},
    onScrollChatDown = () => {},
    onCloseChat = () => {}
  } = options

  // 将键盘事件转换为快捷键字符串
  const eventToShortcut = (event) => {
    const parts = []
    
    // 修饰键
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Cmd')
    if (event.shiftKey) parts.push('Shift')
    if (event.altKey) parts.push('Alt')
    
    // 特殊键
    const keyMap = {
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Space': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'Delete': 'Delete',
      'Backspace': 'Backspace'
    }
    
    const key = keyMap[event.key] || event.key
    if (key && !parts.includes(key)) {
      parts.push(key)
    }
    
    return parts.join('+')
  }

  // 处理键盘事件
  const handleKeyDown = (event) => {
    const shortcut = eventToShortcut(event)
    
    // 查找对应的动作
    for (const [category, shortcuts_map] of Object.entries(SHORTCUTS)) {
      const action = shortcuts_map[shortcut]
      if (action) {
        // 执行对应的动作
        executeAction(action, event, category)
        return
      }
    }
  }

  // 执行快捷键动作
  const executeAction = (action, event, category) => {
    // 防止默认行为
    if (category !== 'TERMINAL' || shouldPreventDefault(action)) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    // 执行动作
    switch (action) {
      case 'toggleTerminal':
        onToggleTerminal?.()
        break
      case 'toggleCommandPalette':
        onToggleCommandPalette?.()
        break
      case 'reverseHistorySearch':
        onReverseHistorySearch?.()
        break
      case 'clearTerminal':
        onClearTerminal?.()
        break
      case 'newTerminalTab':
        onNewTerminalTab?.()
        break
      case 'closeTerminalTab':
        onCloseTerminalTab?.()
        break
      case 'nextTerminalTab':
        onNextTerminalTab?.()
        break
      case 'prevTerminalTab':
        onPrevTerminalTab?.()
        break
      case 'switchToTasks':
        onSwitchToTasks?.()
        break
      case 'openSettings':
        onOpenSettings?.()
        break
      case 'toggleAIMode':
        onToggleAI?.()
        break
      case 'toggleAIChat':
        onToggleAIChat?.()
        break
      case 'closeModalOrExitAI':
        onCloseModalOrExitAI?.()
        break
      case 'sendMessage':
        onSendMessage?.()
        break
      case 'newLine':
        onNewLine?.()
        break
      case 'editPreviousMessage':
        onEditPreviousMessage?.()
        break
      case 'editNextMessage':
        onEditNextMessage?.()
        break
      case 'scrollChatUp':
        onScrollChatUp?.()
        break
      case 'scrollChatDown':
        onScrollChatDown?.()
        break
      case 'closeChat':
        onCloseChat?.()
        break
      default:
        console.log(`未处理的快捷键动作: ${action}`)
    }
  }

  // 判断是否应该阻止默认行为
  const shouldPreventDefault = (action) => {
    const preventDefaults = [
      'toggleTerminal', 'toggleCommandPalette', 'reverseHistorySearch',
      'clearTerminal', 'newTerminalTab', 'closeTerminalTab',
      'nextTerminalTab', 'prevTerminalTab', 'switchToTasks',
      'openSettings', 'toggleAIMode', 'toggleAIChat',
      'closeModalOrExitAI', 'sendMessage', 'closeChat'
    ]
    return preventDefaults.includes(action)
  }

  // 注册快捷键
  const registerShortcut = (shortcut, callback, options = {}) => {
    shortcuts.value.set(shortcut, {
      callback,
      preventDefault: options.preventDefault !== false,
      description: options.description || ''
    })
  }

  // 注销快捷键
  const unregisterShortcut = (shortcut) => {
    shortcuts.value.delete(shortcut)
  }

  // 开始监听
  const startListening = () => {
    if (isListening.value) return
    document.addEventListener('keydown', handleKeyDown)
    isListening.value = true
  }

  // 停止监听
  const stopListening = () => {
    document.removeEventListener('keydown', handleKeyDown)
    isListening.value = false
  }

  // 获取快捷键提示
  const getShortcutHint = (action) => {
    for (const [category, shortcuts_map] of Object.entries(SHORTCUTS)) {
      for (const [shortcut, shortcut_action] of Object.entries(shortcuts_map)) {
        if (shortcut_action === action) {
          return shortcut
        }
      }
    }
    return null
  }

  // 生成快捷键帮助面板数据
  const generateHelpData = () => {
    const helpData = []
    
    for (const [category, shortcuts_map] of Object.entries(SHORTCUTS)) {
      const categoryData = {
        name: category,
        shortcuts: []
      }
      
      for (const [shortcut, action] of Object.entries(shortcuts_map)) {
        categoryData.shortcuts.push({
          shortcut,
          action,
          description: getActionDescription(action)
        })
      }
      
      helpData.push(categoryData)
    }
    
    return helpData
  }

  // 获取动作描述
  const getActionDescription = (action) => {
    const descriptions = {
      'toggleTerminal': '切换终端',
      'toggleCommandPalette': '命令面板',
      'reverseHistorySearch': '历史搜索',
      'clearTerminal': '清空终端',
      'newTerminalTab': '新建终端标签',
      'closeTerminalTab': '关闭终端标签',
      'nextTerminalTab': '下一个终端',
      'prevTerminalTab': '上一个终端',
      'switchToTasks': '切换到任务',
      'openSettings': '打开设置',
      'toggleAIMode': '切换AI模式',
      'toggleAIChat': '切换AI聊天',
      'closeModalOrExitAI': '关闭弹窗/退出AI',
      'sendMessage': '发送消息',
      'newLine': '换行',
      'editPreviousMessage': '编辑上一条',
      'editNextMessage': '编辑下一条',
      'scrollChatUp': '向上滚动聊天',
      'scrollChatDown': '向下滚动聊天',
      'closeChat': '关闭聊天',
      'toggleAIMode': '切换AI模式',
      'interruptProcess': '中断进程',
      'exitShell': '退出Shell',
      'suspendProcess': '挂起进程',
      'copyToClipboard': '复制到剪贴板',
      'pasteFromClipboard': '从剪贴板粘贴',
      'newTerminal': '新建终端',
      'closeTerminal': '关闭终端',
      'autoComplete': '自动完成',
      'reverseAutoComplete': '反向自动完成',
      'historyPrevious': '上一条历史',
      'historyNext': '下一条历史',
      'cursorLeft': '光标左移',
      'cursorRight': '光标右移',
      'cursorStart': '光标到行首',
      'cursorEnd': '光标到行尾',
      'scrollUp': '向上滚动',
      'scrollDown': '向下滚动'
    }
    
    return descriptions[action] || action
  }

  // 生命周期
  onMounted(() => {
    startListening()
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    shortcuts,
    isListening,
    registerShortcut,
    unregisterShortcut,
    startListening,
    stopListening,
    getShortcutHint,
    generateHelpData,
    SHORTCUTS
  }
}
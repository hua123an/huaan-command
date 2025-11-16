<script setup>
/* eslint-env browser */
/* global ResizeObserver, navigator, Blob, URL, Notification */
import { ref, onMounted, onActivated, onDeactivated, watch, onUnmounted, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import { useTerminalStore } from '../stores/terminal'
import { useSettingsStore } from '../stores/settings'
import { useTheme } from '../composables/useTheme'
import { useCommandSuggestion } from '../composables/useCommandSuggestion'
import { useDirectoryTracker } from '../composables/useDirectoryTracker'
import WarpModeBar from './WarpModeBar.vue'
import FilePickerModal from './FilePickerModal.vue'
import AutocompleteMenu from './AutocompleteMenu.vue'
import GitStatusBar from './GitStatusBar.vue'
// AI 功能已移除
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  session: Object,
  visible: Boolean
})


const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
const { getTerminalTheme } = useTheme()

// 命令建议功能
const {
  suggestions,
  updateInput,
  acceptSuggestion,
  addToHistory,
  loadHistory
} = useCommandSuggestion()

// 目录追踪功能（使用后端接口）
const {
  currentDir,
  updateCurrentDir,
  startTracking,
  stopTracking
} = useDirectoryTracker(props.session.id)

// 自动补全菜单
const showAutocomplete = ref(false)
const autocompletePosition = ref({ x: 100, y: 100 })
const autocompleteMenuRef = ref(null)

const terminalRef = ref(null)
const bottomInputRef = ref(null)
const bottomInput = ref('')
const bottomInputSuggestion = ref('')
const showAIPanel = ref(false)
const aiPrompt = ref('')
const aiResponse = ref('')
const aiLoading = ref(false)
const terminalBuffer = ref([])  // 存储终端输出
const commandHistory = ref([])  // 存储命令历史
// AI 模式已移除
const currentInput = ref('')  // 当前输入缓存

// Warp 模式相关
const warpMode = ref('terminal')  // 'terminal'
const isModeSwitching = ref(false)  // 模式切换中的标志
const currentModel = ref('claude-3-5-sonnet-20241022')
const showFilePicker = ref(false)
const selectedFiles = ref([])  // 选中的文件列表
const conversationHistory = ref([])  // AI对话历史

let terminal = null
let fitAddon = null
let unlisten = null

// 使用 Map 存储每个会话的初始化状态
// 全局会话初始化状态管理，避免组件重新挂载时丢失状态
const sessionInitialized = (() => {
  const map = new Map()

  // 暴露方法用于外部访问
  return {
    get: (id) => map.get(id),
    set: (id, value) => map.set(id, value),
    delete: (id) => map.delete(id),
    has: (id) => map.has(id)
  }
})()

// 保存会话数据到 store
const saveSessionData = () => {
  if (!props.session) return

  terminalStore.updateSessionMode(props.session.id, warpMode.value)
  terminalStore.updateSessionModel(props.session.id, currentModel.value)
  terminalStore.updateSessionConversation(props.session.id, conversationHistory.value)
  terminalStore.updateSessionBuffer(props.session.id, terminalBuffer.value)
  terminalStore.updateSessionCommandHistory(props.session.id, commandHistory.value)
  terminalStore.updateSessionCurrentDir(props.session.id, currentDir.value)
  terminalStore.updateSessionInitialized(props.session.id, sessionInitialized.get(props.session.id))
}

// 从 store 恢复会话数据
const restoreSessionData = () => {
  if (!props.session) return

  const sessionData = terminalStore.getSessionData(props.session.id)
  if (sessionData) {
    warpMode.value = sessionData.warpMode || 'terminal'
    currentModel.value = sessionData.currentModel || 'claude-3-5-sonnet-20241022'
    conversationHistory.value = sessionData.conversationHistory || []
    terminalBuffer.value = sessionData.terminalBuffer || []
    commandHistory.value = sessionData.commandHistory || []
    currentDir.value = sessionData.currentDir || '~'
    
    // 恢复初始化状态
    if (sessionData.initialized) {
      sessionInitialized.set(props.session.id, sessionData.initialized)
    }

    // 如果有恢复的数据，说明已经初始化过
    if (sessionData.terminalBuffer && sessionData.terminalBuffer.length > 0) {
      sessionInitialized.set(props.session.id, true)
    }
    
    console.log(`✓ 恢复会话数据 (会话 ${props.session.id}):`, {
      mode: warpMode.value,
      model: currentModel.value,
      conversations: conversationHistory.value.length,
      bufferLines: terminalBuffer.value.length,
      commandHistory: commandHistory.value.length,
      currentDir: currentDir.value,
      hasInitialized: sessionInitialized.get(props.session.id) || false,
      storedInitialized: sessionData.initialized
    })
  }
}

onMounted(async () => {
  console.log('🟢 TerminalPane onMounted - 开始初始化')
  console.log('🟢 Session ID:', props.session?.id)

  // 先恢复会话数据
  restoreSessionData()

  // 加载命令历史到建议系统
  if (commandHistory.value.length > 0) {
    const historyCommands = commandHistory.value.map(h => h.command || h).filter(Boolean)
    loadHistory(historyCommands)
  }

  // 启动目录追踪（每2秒更新一次）
  startTracking(2000)

  console.log('🟢 创建 Terminal 实例')
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
    theme: getTerminalTheme(),
    allowTransparency: true,
    lineHeight: 1.2,
    letterSpacing: 0,
    scrollback: 10000
  })

  console.log('🟢 加载 Terminal 插件')
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  console.log('🟢 打开终端到 DOM')
  terminal.open(terminalRef.value)
  fitAddon.fit()

  console.log('🟢 聚焦终端')
  terminal.focus()

  console.log('🟢 注册 onData 回调')
  // 立即注册 onData 回调（在启动终端进程之前）
  terminal.onData(async (data) => {
    console.log('🔵 收到终端输入:', data, '(charCode:', data.charCodeAt(0), ')')

    try {
      // 如果正在切换模式，忽略所有输入
      if (isModeSwitching.value) {
        console.log('⚠️ 模式切换中，忽略输入')
        return
      }

      // 检测 Ctrl+A（切换 AI 模式）
      if (data === '\x01') {  // Ctrl+A
        console.log('🔵 检测到 Ctrl+A')
        // AI 模式已移除
        return  // 不发送到 shell
      }

      // 检测 Ctrl+I（手动初始化终端）
      if (data.charCodeAt(0) === 9) {  // Ctrl+I (ASCII 9)
        console.log('🔵 检测到 Ctrl+I，手动初始化终端')
        manualInitializeTerminal()
        return  // 不发送到 shell
      }

      // 如果在 AI 模式（Warp 模式），完全接管输入
      if (warpMode.value === 'ai') {
        console.log('🔵 AI 模式处理输入')
        // 更新输入缓存并显示在终端
        if (data === '\x7f' || data === '\b') {
          // 退格键
          if (currentInput.value.length > 0) {
            currentInput.value = currentInput.value.slice(0, -1)
            terminal.write('\b \b')  // 终端显示退格
          }
        } else if (data !== '\r') {
          // 所有非回车的字符（包括中文）
          currentInput.value += data
          terminal.write(data)  // 终端显示输入
        }

        // 检测回车键
        if (data === '\r') {
          if (currentInput.value.trim()) {
            terminal.write('\r\n')
            // AI 模式下不再处理命令，只显示工具选择界面
          } else {
            terminal.write('\r\n')
          }
          currentInput.value = ''
          updateInput('')  // 清空建议
          return
        }

        return  // AI 模式下不发送到 shell
      }

      // 终端模式：直接透传所有输入到 shell，不做任何拦截
      console.log('🔵 终端模式，发送到 shell:', data)
      await invoke('write_terminal', {
        sessionId: props.session.id,
        data
      })
      console.log('✅ 已发送到 shell')
    } catch (error) {
      console.error('❌ 写入终端失败:', error)
    }
  })
  console.log('🟢 onData 回调已注册')

  // 恢复历史终端内容（如果有）
  if (terminalBuffer.value.length > 0) {
    const historicalContent = terminalBuffer.value.slice(-100).join('\n') // 恢复最近100行
    if (historicalContent) {
      // 静默恢复，不显示分割线
      terminal.write(historicalContent.replace(/\n/g, '\r\n'))
      terminal.write('\r\n')
    }
  }

  // 启动终端进程
  console.log('🟢 启动终端进程')
  try {
    await invoke('start_terminal', {
      sessionId: props.session.id,
      shellType: settingsStore.settings.shell
    })
    console.log('🟢 终端进程已启动')

    // 首次输出标志（用于清除初始提示符）
    const firstOutput = true

    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
      terminal.write(event.payload)

      // 保存输出到 buffer（限制最多10000行）
      const lines = event.payload.split('\n')
      terminalBuffer.value.push(...lines)
      if (terminalBuffer.value.length > 10000) {
        terminalBuffer.value = terminalBuffer.value.slice(-10000)
      }
    })

    // 由于设置了 PS1 环境变量，shell 会自动显示提示符，无需手动初始化
    // 移除自动初始化逻辑，避免显示两次提示符

  } catch (error) {
    terminal.write(`\x1b[31m错误: ${error}\x1b[0m\r\n`)
  }

  // 窗口大小调整
  const resizeObserver = new ResizeObserver(() => {
    if (props.visible && fitAddon) {
      fitAddon.fit()
      invoke('resize_terminal', {
        sessionId: props.session.id,
        cols: terminal.cols,
        rows: terminal.rows
      }).catch(console.error)
    }
  })
  resizeObserver.observe(terminalRef.value)

  onUnmounted(() => {
    resizeObserver.disconnect()
  })

  // 监听主题变化
  watch(() => settingsStore.settings.theme, () => {
    if (terminal) {
      terminal.options.theme = getTerminalTheme()
    }
  })

  // 监听 shell 类型变化，重新初始化终端
  watch(() => settingsStore.settings.shell, async (newShell, oldShell) => {
    if (oldShell && newShell !== oldShell) {
      console.log(`🔄 Shell 类型从 ${oldShell} 变为 ${newShell}，重新初始化终端`)

      // 保存当前会话数据
      saveSessionData()

      // 重置初始化状态，以便重新初始化
      sessionInitialized.delete(props.session.id)

      // 关闭旧终端
      if (unlisten) unlisten()
      if (terminal) terminal.dispose()

      try {
        await invoke('close_terminal', { sessionId: props.session.id })
        console.log('✓ 已关闭旧终端会话')
      } catch (err) {
        console.error('关闭终端失败:', err)
      }

      // 重新初始化终端（延迟一下确保旧进程完全关闭）
      setTimeout(async () => {
        // 重新创建终端
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
          theme: getTerminalTheme(),
          allowTransparency: true,
          lineHeight: 1.2,
          letterSpacing: 0,
          scrollback: 10000
        })

        fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.loadAddon(new WebLinksAddon())

        terminal.open(terminalRef.value)
        fitAddon.fit()
        terminal.focus()

        // 重新注册 onData 回调
        terminal.onData(async (data) => {
          try {
            if (isModeSwitching.value) return

            if (data === '\x01') {
              // AI 模式已移除
              return
            }

            if (warpMode.value === 'ai') {
              if (data === '\x7f' || data === '\b') {
                if (currentInput.value.length > 0) {
                  currentInput.value = currentInput.value.slice(0, -1)
                  terminal.write('\b \b')
                }
              } else if (data !== '\r') {
                currentInput.value += data
                terminal.write(data)
              }

              if (data === '\r') {
                if (currentInput.value.trim()) {
                  terminal.write('\r\n')
                  // AI 模式下不再处理命令，只显示工具选择界面
                } else {
                  terminal.write('\r\n')
                }
                currentInput.value = ''
                updateInput('')
                return
              }

              return
            }

            await invoke('write_terminal', {
              sessionId: props.session.id,
              data
            })
          } catch (error) {
            console.error('❌ 写入终端失败:', error)
          }
        })

        // 启动终端进程
        try {
          await invoke('start_terminal', {
            sessionId: props.session.id,
            shellType: settingsStore.settings.shell
          })
          console.log('✓ 已重新启动终端会话')

          // 首次输出标志（用于清除初始提示符）
          const firstOutput = true

          // 重新监听输出
          unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
            terminal.write(event.payload)

            const lines = event.payload.split('\n')
            terminalBuffer.value.push(...lines)
            if (terminalBuffer.value.length > 10000) {
              terminalBuffer.value = terminalBuffer.value.slice(-10000)
            }
          })

          terminal.write(`\x1b[32m✓ 已切换到 ${newShell}\x1b[0m\r\n`)

          // shell 会自动显示提示符，无需手动初始化
          sessionInitialized.set(props.session.id, true)

        } catch (error) {
          terminal.write(`\x1b[31m错误: ${error}\x1b[0m\r\n`)
        }
      }, 200)
    }
  })

  // 监听系统主题变化（当主题为auto时）
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = () => {
    if (settingsStore.settings.theme === 'auto' && terminal) {
      terminal.options.theme = getTerminalTheme()
    }
  }
  darkModeQuery.addEventListener('change', handleSystemThemeChange)

  // 保存 darkModeQuery 引用到组件作用域，以便在 onUnmounted 中清理
  window._terminalDarkModeQuery = darkModeQuery
  window._terminalThemeHandler = handleSystemThemeChange
})

// 获取终端文本（去除 ANSI 转义符）
const getTerminalText = () => {
  return terminalBuffer.value
    .join('\n')
    // eslint-disable-next-line no-control-regex
    .replace(/\u001B\[[0-9;]*[mGKHf]/g, '') // 移除 ANSI 转义序列
    .trim()
}

// AI 功能：生成命令
const aiGenerateCommand = async () => {
  if (!aiPrompt.value.trim()) return
  
  aiLoading.value = true
  aiResponse.value = ''
  
  // AI 功能已移除，直接返回
  aiResponse.value = '❌ AI 功能已移除'
  aiLoading.value = false
}

// AI 功能：分析终端输出
const aiAnalyzeOutput = async () => {
  const output = getTerminalText()
  if (!output) {
    aiResponse.value = '❌ 终端输出为空'
    return
  }
  
  aiLoading.value = true
  aiResponse.value = ''
  aiPrompt.value = '分析终端输出'
  
  try {
    // AI 功能已移除，直接返回
    aiResponse.value = '❌ AI 功能已移除'
  } catch (error) {
    aiResponse.value = `❌ 错误: ${error.message}`
  } finally {
    aiLoading.value = false
  }
}

// AI 功能：诊断错误
const aiDiagnoseError = async () => {
  aiLoading.value = true
  aiResponse.value = ''
  
  // AI 功能已移除，直接返回
  aiResponse.value = '❌ AI 功能已移除'
  aiLoading.value = false
}

// 使用生成的命令
const useGeneratedCommand = () => {
  if (aiResponse.value && terminal) {
    // 移除可能的代码块标记
    const command = aiResponse.value
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/```$/, '')
      .trim()
    
    // 写入终端
    terminal.write(command)
  }
}

// 清空 AI 面板
const clearAI = () => {
  aiPrompt.value = ''
  aiResponse.value = ''
}

// AI 模式已移除

// AI 命令生成处理（从 AI 模式接收命令）
const handleAICommandGenerated = async (command) => {
  // 直接向终端输入命令并执行
  try {
    await invoke('write_terminal', {
      sessionId: props.session.id,
      data: command + '\r'
    })
  } catch (error) {
    console.error('执行命令失败:', error)
  }
}



// 格式化单行 Markdown（用于流式输出）
const formatMarkdownLine = (line) => {
  let formatted = line
  
  // 检测并处理代码块标记（保持原样，后续处理）
  if (formatted.match(/^```/)) {
    return `\x1b[90m${formatted}\x1b[0m`
  }
  
  // 处理标题
  if (formatted.match(/^### /)) {
    formatted = formatted.replace(/^### (.+)$/, '\x1b[1m\x1b[35m▸ $1\x1b[0m')
  } else if (formatted.match(/^## /)) {
    formatted = formatted.replace(/^## (.+)$/, '\x1b[1m\x1b[36m▶ $1\x1b[0m')
  } else if (formatted.match(/^# /)) {
    formatted = formatted.replace(/^# (.+)$/, '\x1b[1m\x1b[32m● $1\x1b[0m')
  }
  
  // 处理无序列表
  else if (formatted.match(/^(\s*)[-*+] /)) {
    formatted = formatted.replace(/^(\s*)[-*+] (.+)$/, '$1\x1b[36m●\x1b[0m $2')
  }
  
  // 处理有序列表
  else if (formatted.match(/^(\s*)(\d+)\. /)) {
    formatted = formatted.replace(/^(\s*)(\d+)\. (.+)$/, '$1\x1b[36m$2.\x1b[0m $3')
  }
  
  // 处理行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')
  
  // 处理粗体
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
  
  return formatted
}

// 格式化终端输出（处理换行和特殊字符）- 增强版
const formatTerminalOutput = (text) => {
  // 先处理代码块（避免被其他规则干扰）
  let formatted = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? `[${lang}]` : '[code]'
    return `\n\x1b[90m╭─ ${langLabel} ────────────────\x1b[0m\n\x1b[33m${code.trim()}\x1b[0m\n\x1b[90m╰────────────────────────────\x1b[0m\n`
  })
  
  // 处理行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')
  
  // 处理标题
  formatted = formatted.replace(/^### (.+)$/gm, '\x1b[1m\x1b[35m▸ $1\x1b[0m')
  formatted = formatted.replace(/^## (.+)$/gm, '\x1b[1m\x1b[36m▶ $1\x1b[0m')
  formatted = formatted.replace(/^# (.+)$/gm, '\x1b[1m\x1b[32m● $1\x1b[0m')
  
  // 处理粗体
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
  
  // 处理无序列表（支持多级缩进）
  formatted = formatted.replace(/^(\s*)[-*+] (.+)$/gm, (match, indent, text) => {
    return `${indent}\x1b[36m●\x1b[0m ${text}`
  })
  
  // 处理有序列表
  formatted = formatted.replace(/^(\s*)(\d+)\. (.+)$/gm, (match, indent, num, text) => {
    return `${indent}\x1b[36m${num}.\x1b[0m ${text}`
  })
  
  // 最后将所有 \n 替换为 \r\n（终端换行）
  formatted = formatted.replace(/\n/g, '\r\n')
  
  return formatted
}





// 格式化 AI 响应（支持 Markdown）
const formatResponse = (text) => {
  if (!text) return ''
  
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code>${code.trim()}</code></pre>`
  })
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 标题
  html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
  
  // 列表
  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // 换行
  html = html.replace(/\n/g, '<br>')
  
  return html
}

watch(() => props.visible, (newVisible) => {
  if (newVisible && fitAddon) {
    setTimeout(() => fitAddon.fit(), 10)
  }
})

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  if (terminal) {
    terminal.options.theme = getTerminalTheme()
  }
})

// 监听系统主题变化（当主题为auto时）
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleSystemThemeChange = () => {
  if (settingsStore.settings.theme === 'auto' && terminal) {
    terminal.options.theme = getTerminalTheme()
  }
}
darkModeQuery.addEventListener('change', handleSystemThemeChange)



// 监听数据变化，自动保存
watch([warpMode, currentModel, conversationHistory, terminalBuffer, commandHistory, currentDir], () => {
  saveSessionData()
}, { deep: true })

// 监听会话切换，保存当前会话数据
watch(() => props.session?.id, (newId, oldId) => {
  if (oldId) {
    // 切换前保存旧会话
    saveSessionData()
  }
  if (newId) {
    // 切换后恢复新会话
    restoreSessionData()
  }
})

// Warp 模式处理
const handleModeUpdate = async (mode) => {
  // 🔒 锁定输入，防止切换期间的输入泄露
  isModeSwitching.value = true

  // 清空输入缓存，防止输入泄露
  currentInput.value = ''
  updateInput('')  // 清空建议

  // 先更新模式状态（必须在发送任何内容到终端之前）
  warpMode.value = mode

  if (mode === 'ai') {
    // 切换到AI模式：先取消当前shell输入，再显示提示
    try {
      // 发送 Ctrl+C 取消当前输入，然后发送回车
      await invoke('write_terminal', {
        sessionId: props.session.id,
        data: '\x03\r'
      })
    } catch (error) {
      console.warn('Failed to clear terminal:', error)
    }

    // 等待一下让Ctrl+C生效
    await new Promise(resolve => setTimeout(resolve, 100))

    // 切换到 AI 模式时，从后端获取当前真实工作目录
    await updateCurrentDir()
    console.log('🎯 AI 模式启动，当前目录:', currentDir.value)

    // 显示AI模式启动信息
    terminal.write('\r\n\x1b[32m🤖 AI 模式已启用\x1b[0m\r\n')
    terminal.write('\x1b[36m💡 输入命令描述，AI 将为您生成相应的命令\x1b[0m\r\n')
    terminal.write('\x1b[90m按 Ctrl+C 退出 AI 模式\x1b[0m\r\n')
    terminal.write('\x1b[35m❯\x1b[0m ')  // 显示AI提示符
    terminal.scrollToBottom()
  } else {
    // 显示退出AI模式信息
    terminal.write('\r\n\x1b[33m🔧 已退出 AI 模式\x1b[0m\r\n')
    terminal.write('\r\n')
  }
  
  // 额外等待100ms确保所有提示信息都已显示
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 🔓 解锁输入
  isModeSwitching.value = false
  
  // 立即保存模式切换
  saveSessionData()
}

const handleModelUpdate = (model) => {
  currentModel.value = model
  // AI 功能已移除
  terminal.write(`\r\n\x1b[36m✓ 已切换模型: ${model}\x1b[0m\r\n`)
}

const handleMentionFile = () => {
  showFilePicker.value = true
}

// 处理文件选择
const handleFileSelect = (file) => {
  selectedFiles.value.push(file)
  
  // 如果选择的是目录，更新 currentDir
  if (file.isDir) {
    currentDir.value = file.path
  }
  
  const icon = file.isDir ? '📁' : '📄'
  const type = file.isDir ? '目录' : '文件'
  
  terminal.write(`\r\n\x1b[36m${icon} 已选择${type}: ${file.name}\x1b[0m\r\n`)
  terminal.write(`\x1b[90m路径: ${file.path}\x1b[0m\r\n`)
  
  // 如果在 AI 模式，可以直接提示用户可以使用这个文件/目录
  if (warpMode.value === 'ai') {
    terminal.write(`\r\n\x1b[90m提示: 现在可以在提示中引用此${type}\x1b[0m\r\n`)
  }
}

// 保存会话
const saveSession = () => {
  saveSessionData()
  terminal.write('\r\n\x1b[32m✓ 会话已保存\x1b[0m\r\n')
}

// 清空终端
const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
    terminalBuffer.value = []
    terminal.write('\x1b[32m✓ 终端已清空\x1b[0m\r\n')
  }
}

// 复制内容
const copyContent = () => {
  const content = getTerminalText()
  if (content) {
    navigator.clipboard.writeText(content).then(() => {
      terminal.write('\r\n\x1b[32m✓ 内容已复制到剪贴板\x1b[0m\r\n')
    }).catch(() => {
      terminal.write('\r\n\x1b[31m❌ 复制失败\x1b[0m\r\n')
    })
  } else {
    terminal.write('\r\n\x1b[33m⚠️ 没有内容可复制\x1b[0m\r\n')
  }
}

// 下载内容
const downloadContent = () => {
  const content = getTerminalText()
  if (content) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-${props.session.id}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    terminal.write('\r\n\x1b[32m✓ 内容已下载\x1b[0m\r\n')
  } else {
    terminal.write('\r\n\x1b[33m⚠️ 没有可下载的内容\x1b[0m\r\n')
  }
}

// 处理自动补全选择
const handleAutocompleteSelect = async (selectedCommand) => {
  showAutocomplete.value = false

  // 清除当前输入
  for (let i = 0; i < currentInput.value.length; i++) {
    terminal.write('\b \b')
  }

  // 写入选择的命令
  terminal.write(selectedCommand)

  // 更新输入状态
  currentInput.value = selectedCommand
  updateInput(selectedCommand)
  acceptSuggestion(selectedCommand)
}

// 处理底部输入框输入变化
const handleBottomInputChange = () => {
  // 更新建议系统
  updateInput(bottomInput.value)

  // 显示建议
  if (suggestions.value.length > 0) {
    bottomInputSuggestion.value = suggestions.value[0]
  } else {
    bottomInputSuggestion.value = ''
  }
}

// 处理底部输入框按键
const handleBottomInputKeydown = async (event) => {
  // Enter键：执行命令
  if (event.key === 'Enter') {
    event.preventDefault()

    const command = bottomInput.value.trim()
    if (command) {
      // 添加到历史
      addToHistory(command)

      // 聚焦到终端
      if (terminal) {
        terminal.focus()
      }

      // 发送命令到终端
      try {
        await invoke('write_terminal', {
          sessionId: props.session.id,
          data: command + '\r'
        })
      } catch (error) {
        console.error('发送命令失败:', error)
      }

      // 清空输入
      bottomInput.value = ''
      bottomInputSuggestion.value = ''
      updateInput('')
    }
  }
  // Tab键：接受建议
  else if (event.key === 'Tab') {
    event.preventDefault()

    if (bottomInputSuggestion.value) {
      bottomInput.value = bottomInputSuggestion.value
      bottomInputSuggestion.value = ''
      updateInput(bottomInput.value)
    }
  }
  // 右箭头键：接受建议
  else if (event.key === 'ArrowRight') {
    // 只有光标在末尾时才接受建议
    const input = event.target
    if (input.selectionStart === bottomInput.value.length && bottomInputSuggestion.value) {
      event.preventDefault()
      bottomInput.value = bottomInputSuggestion.value
      bottomInputSuggestion.value = ''
      updateInput(bottomInput.value)
    }
  }
  // 上箭头键：从历史中选择上一条命令
  else if (event.key === 'ArrowUp') {
    event.preventDefault()

    if (commandHistory.value.length > 0) {
      const lastCommand = commandHistory.value[0]
      if (typeof lastCommand === 'object' && lastCommand.command) {
        bottomInput.value = lastCommand.command
      } else {
        bottomInput.value = lastCommand
      }
      updateInput(bottomInput.value)
    }
  }
}

// 聚焦终端
const focusTerminal = () => {
  if (terminal) {
    // 检查终端是否有选中的文本
    const selection = terminal.getSelection()
    if (selection && selection.length > 0) {
      // 有选中文本时不聚焦，避免干扰文本选择
      return
    }

    terminal.focus()
  }
}

// 发送通知
const sendNotification = () => {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Huaan Command', {
        body: '终端通知已发送',
        icon: '/icon.png'
      })
      terminal.write('\r\n\x1b[32m✓ 通知已发送\x1b[0m\r\n')
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Huaan Command', {
            body: '终端通知已发送',
            icon: '/icon.png'
          })
          terminal.write('\r\n\x1b[32m✓ 通知已发送\x1b[0m\r\n')
        } else {
          terminal.write('\r\n\x1b[33m⚠️ 通知权限被拒绝\x1b[0m\r\n')
        }
      })
    } else {
      terminal.write('\r\n\x1b[33m⚠️ 通知权限被拒绝\x1b[0m\r\n')
    }
  } else {
    terminal.write('\r\n\x1b[31m❌ 浏览器不支持通知\x1b[0m\r\n')
  }
}

// 手动初始化终端
const manualInitializeTerminal = async () => {
  if (sessionInitialized.get(props.session.id)) {
    terminal.write('\x1b[33m⚠️ 终端已经初始化过了\x1b[0m\r\n')
    return
  }

  try {
    terminal.write('\x1b[36m🔄 手动初始化终端...\x1b[0m\r\n')
    await new Promise(resolve => setTimeout(resolve, 500))

    await invoke('write_terminal', {
      sessionId: props.session.id,
      data: '\r'
    })
    sessionInitialized.set(props.session.id, true)
    terminal.write('\x1b[32m✓ 终端手动初始化成功\x1b[0m\r\n')
  } catch (error) {
    terminal.write(`\x1b[31m❌ 手动初始化失败: ${error.message}\x1b[0m\r\n`)
    console.error('Manual initialization failed:', error)
  }
}

// keep-alive 激活时（从其他页面切换回来）
onActivated(() => {
  if (terminal && fitAddon) {
    // 恢复终端尺寸
    setTimeout(() => fitAddon.fit(), 10)

    // 如果终端还没有初始化，尝试重新初始化
    if (!sessionInitialized.get(props.session.id)) {
      setTimeout(() => {
        terminal.write('\x1b[36m🔄 检测到终端未初始化，尝试重新初始化...\x1b[0m\r\n')
        manualInitializeTerminal()
      }, 1000)
    }
  }
})

// keep-alive 失活时（切换到其他页面）
onDeactivated(() => {
  // 保存会话数据
  saveSessionData()
})

// Git 状态栏相关
const commandSuggestion = ref('')

// 处理 Git 命令执行
const handleGitCommand = (command) => {
  if (terminal && command) {
    // 清除当前输入
    if (currentInput.value) {
      for (let i = 0; i < currentInput.value.length; i++) {
        terminal.write('\b \b')
      }
    }

    // 写入命令
    terminal.write(command)
    currentInput.value = command

    // 回车执行
    setTimeout(async () => {
      try {
        await invoke('write_terminal', {
          sessionId: props.session.id,
          data: command + '\r'
        })
      } catch (error) {
        console.error('执行命令失败:', error)
      }
    }, 100)
  }
}

// 应用命令建议
const applyGitSuggestion = (suggestion) => {
  bottomInput.value = suggestion
  handleBottomInputChange()
  // 聚焦到输入框
  if (bottomInputRef.value) {
    bottomInputRef.value.focus()
  }
}

onUnmounted(async () => {
  // 保存会话数据
  saveSessionData()
  
  // 清理系统主题监听器
  if (window._terminalDarkModeQuery && window._terminalThemeHandler) {
    window._terminalDarkModeQuery.removeEventListener('change', window._terminalThemeHandler)
    delete window._terminalDarkModeQuery
    delete window._terminalThemeHandler
  }
  
  if (unlisten) {
    unlisten()
  }
  if (terminal) {
    terminal.dispose()
  }
  try {
    await invoke('close_terminal', { sessionId: props.session.id })
  } catch (error) {
    console.error('关闭终端失败:', error)
  }
})
</script>

<template>
  <div :class="['terminal-container', { visible }]">
    <!-- 上部：Git状态栏 -->
    <GitStatusBar
      :current-dir="currentDir"
      @execute-command="handleGitCommand"
    />

    <!-- 中部：终端显示区域 -->
    <div
      ref="terminalRef"
      class="terminal-pane"
      @click="focusTerminal"
    />

    <!-- 下部：Warp模式栏 -->
    <WarpModeBar
      :mode="warpMode"
      :current-model="currentModel"
      :session-id="session.id"
      @update:mode="handleModeUpdate"
      @update:current-model="handleModelUpdate"
      @mention-file="handleMentionFile"
    />

    
    
    

    <!-- 文件选择器模态框 -->
    <FilePickerModal
      :show="showFilePicker"
      :current-dir="currentDir"
      :session-id="session.id"
      @close="showFilePicker = false"
      @select="handleFileSelect"
    />

    <!-- 自动补全菜单 -->
    <AutocompleteMenu
      ref="autocompleteMenuRef"
      :visible="showAutocomplete"
      :suggestions="suggestions"
      :position="autocompletePosition"
      @select="handleAutocompleteSelect"
      @close="showAutocomplete = false"
    />
  </div>
</template>

<style scoped>
.terminal-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.terminal-container.visible {
  opacity: 1;
  pointer-events: auto;
}

.terminal-pane {
  flex: 1;
  position: relative;
  padding: 16px;
  overflow: hidden;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: #1a1a1a;
  background: #ffffff;
}

/* AI 模式指示器 */
.ai-mode-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, rgba(32, 32, 34, 0.95) 0%, rgba(28, 28, 30, 0.95) 100%);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 50;
  animation: slideInRight 0.3s ease;
  max-width: 400px;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-right: 8px;
}

.mode-badge.ai-active {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.2) 0%, rgba(10, 132, 255, 0.1) 100%);
  border: 1px solid rgba(10, 132, 255, 0.4);
  color: var(--accent-color);
  animation: pulse 2s ease-in-out infinite;
}


@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.mode-hint {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

/* AI 触发按钮 */
.ai-trigger-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(10, 132, 255, 0.4);
  transition: all 0.3s ease;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-trigger-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.6);
}

.ai-trigger-btn.active {
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  box-shadow: 0 4px 16px rgba(255, 149, 0, 0.4);
}

.ai-trigger-btn.ai-mode-active {
  background: linear-gradient(135deg, #32d74b 0%, #30d158 100%);
  box-shadow: 0 4px 16px rgba(50, 215, 75, 0.5);
  animation: aiPulse 2s ease-in-out infinite;
}

@keyframes aiPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(50, 215, 75, 0.5);
  }
  50% {
    box-shadow: 0 6px 24px rgba(50, 215, 75, 0.7);
  }
}

/* AI 面板 */
.ai-panel {
  position: absolute;
  bottom: 90px;
  right: 24px;
  width: 420px;
  max-height: 500px;
  background: linear-gradient(135deg, rgba(32, 32, 34, 0.98) 0%, rgba(28, 28, 30, 0.98) 100%);
  border-radius: 16px;
  box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  z-index: 99;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.ai-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.95);
}

.ai-quick-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.quick-action-btn {
  flex: 1;
  padding: 8px 12px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.quick-action-btn:hover:not(:disabled) {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.4);
  transform: translateY(-1px);
}

.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-input-section {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.ai-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.ai-input:focus {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.ai-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-generate-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ai-generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);
}

.ai-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-response-section {
  padding: 16px 20px;
  max-height: 280px;
  overflow-y: auto;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.response-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.use-command-btn {
  padding: 4px 10px;
  background: rgba(50, 215, 75, 0.15);
  border: 1px solid rgba(50, 215, 75, 0.3);
  border-radius: 6px;
  color: var(--success-color);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.use-command-btn:hover {
  background: rgba(50, 215, 75, 0.25);
  border-color: rgba(50, 215, 75, 0.5);
}

.ai-response {
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-placeholder {
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  line-height: 1.6;
}

.ai-response-section::-webkit-scrollbar {
  width: 6px;
}

.ai-response-section::-webkit-scrollbar-track {
  background: transparent;
}

.ai-response-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* Markdown 样式 */
:deep(.code-block) {
  background: rgba(0, 0, 0, 0.5);
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 12px;
}

:deep(.inline-code) {
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 12px;
  color: #64d2ff;
}

:deep(h3) {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 12px 0 8px 0;
}

:deep(h4) {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 10px 0 6px 0;
}

:deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

:deep(li) {
  margin: 4px 0;
}

:deep(strong) {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
}

:deep(.xterm) {
  height: 100%;
  padding: 0;
  background: #ffffff;
}

:deep(.xterm-viewport) {
  background: #ffffff !important;
}

:deep(.xterm-screen) {
  padding-right: 8px;
  background: #ffffff;
}

:deep(.xterm-rows) {
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
  color: #1a1a1a !important;
}

:deep(.xterm-row) {
  background: #ffffff !important;
}

:deep(.xterm-cursor) {
  background: #1a1a1a !important;
  color: #ffffff !important;
}
</style>


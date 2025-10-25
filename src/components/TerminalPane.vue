<script setup>
import { ref, onMounted, onActivated, onDeactivated, watch, onUnmounted, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAIStore } from '../stores/ai'
import { useTerminalStore } from '../stores/terminal'
import { useSettingsStore } from '../stores/settings'
import { useTheme } from '../composables/useTheme'
import { useCommandSuggestion } from '../composables/useCommandSuggestion'
import WarpModeBar from './WarpModeBar.vue'
import FilePickerModal from './FilePickerModal.vue'
import AutocompleteMenu from './AutocompleteMenu.vue'
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  session: Object,
  visible: Boolean
})

const aiStore = useAIStore()
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
const aiMode = ref(false)  // AI 模式开关（已废弃，使用 warpMode）
const currentInput = ref('')  // 当前输入缓存

// Warp 模式相关
const warpMode = ref('terminal')  // 'terminal' | 'ai'
const isModeSwitching = ref(false)  // 模式切换中的标志
const currentModel = ref(aiStore.model || 'gpt-4o-mini')
const showFilePicker = ref(false)
const currentDir = ref('~')
const selectedFiles = ref([])  // 选中的文件列表
const conversationHistory = ref([])  // AI对话历史

let terminal = null
let fitAddon = null
let unlisten = null

// 使用 Map 存储每个会话的初始化状态
const sessionInitialized = new Map()

// 保存会话数据到 store
const saveSessionData = () => {
  if (!props.session) return
  
  terminalStore.updateSessionMode(props.session.id, warpMode.value)
  terminalStore.updateSessionModel(props.session.id, currentModel.value)
  terminalStore.updateSessionConversation(props.session.id, conversationHistory.value)
  terminalStore.updateSessionBuffer(props.session.id, terminalBuffer.value)
  terminalStore.updateSessionCommandHistory(props.session.id, commandHistory.value)
  terminalStore.updateSessionCurrentDir(props.session.id, currentDir.value)
}

// 从 store 恢复会话数据
const restoreSessionData = () => {
  if (!props.session) return
  
  const sessionData = terminalStore.getSessionData(props.session.id)
  if (sessionData) {
    warpMode.value = sessionData.warpMode || 'terminal'
    currentModel.value = sessionData.currentModel || aiStore.model || 'gpt-4o-mini'
    conversationHistory.value = sessionData.conversationHistory || []
    terminalBuffer.value = sessionData.terminalBuffer || []
    commandHistory.value = sessionData.commandHistory || []
    currentDir.value = sessionData.currentDir || '~'
    
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
      hasInitialized: sessionInitialized.get(props.session.id) || false
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
        toggleAIMode()
        return  // 不发送到 shell
      }

      // 如果在 AI 模式（Warp 模式或旧的 aiMode），完全接管输入
      if (warpMode.value === 'ai' || aiMode.value) {
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
            await handleAICommand(currentInput.value.trim())
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
      terminal.write('\x1b[90m━━━━ 会话历史 ━━━━\x1b[0m\r\n')
      terminal.write(historicalContent.replace(/\n/g, '\r\n'))
      terminal.write('\r\n\x1b[90m━━━━━━━━━━━━━━━━\x1b[0m\r\n')
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

    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
      terminal.write(event.payload)
      
      // 尝试从 prompt 中提取当前目录（简化后的 prompt 格式）
      // 现在只匹配简单的命令输出，不包含用户名主机名
      // 如果需要检测目录变化，通过 cd 命令来处理
      
      // 保存输出到 buffer（最近1000行）
      const lines = event.payload.split('\n')
      terminalBuffer.value.push(...lines)
      if (terminalBuffer.value.length > 1000) {
        terminalBuffer.value = terminalBuffer.value.slice(-1000)
      }
    })
    
    // 自动初始化：仅在首次创建且未初始化过的会话时发送回车触发 prompt
    if (!sessionInitialized.get(props.session.id)) {
      setTimeout(async () => {
        try {
          await invoke('write_terminal', { 
            sessionId: props.session.id, 
            data: '\r' 
          })
          sessionInitialized.set(props.session.id, true)
          console.log('✓ 终端已自动初始化 (会话', props.session.id, ')')
        } catch (error) {
          console.warn('Failed to initialize terminal:', error)
        }
      }, 300)  // 300ms 延迟确保终端完全就绪
    }

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

      // 关闭旧终端
      if (unlisten) unlisten()
      if (terminal) terminal.dispose()

      try {
        await invoke('close_terminal', { sessionId: props.session.id })
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
              toggleAIMode()
              return
            }

            if (warpMode.value === 'ai' || aiMode.value) {
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
                  await handleAICommand(currentInput.value.trim())
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

          // 重新监听输出
          unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
            terminal.write(event.payload)

            const lines = event.payload.split('\n')
            terminalBuffer.value.push(...lines)
            if (terminalBuffer.value.length > 1000) {
              terminalBuffer.value = terminalBuffer.value.slice(-1000)
            }
          })

          terminal.write(`\x1b[32m✓ 已切换到 ${newShell}\x1b[0m\r\n`)
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
    .replace(/\x1B\[[0-9;]*[mGKHf]/g, '') // 移除 ANSI 转义序列
    .trim()
}

// AI 功能：生成命令
const aiGenerateCommand = async () => {
  if (!aiPrompt.value.trim()) return
  
  aiLoading.value = true
  aiResponse.value = ''
  
  try {
    const command = await aiStore.generateCommand(aiPrompt.value)
    aiResponse.value = command
  } catch (error) {
    aiResponse.value = `❌ 错误: ${error.message}`
  } finally {
    aiLoading.value = false
  }
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
    const analysis = await aiStore.analyzeLogs(output.slice(-3000)) // 最近3000字符
    aiResponse.value = analysis
  } catch (error) {
    aiResponse.value = `❌ 错误: ${error.message}`
  } finally {
    aiLoading.value = false
  }
}

// AI 功能：诊断错误
const aiDiagnoseError = async () => {
  const output = getTerminalText()
  if (!output) {
    aiResponse.value = '❌ 终端输出为空'
    return
  }
  
  aiLoading.value = true
  aiResponse.value = ''
  aiPrompt.value = '诊断错误'
  
  try {
    const diagnosis = await aiStore.diagnoseError(
      props.session.title || '终端会话',
      '终端命令',
      output.slice(-3000) // 最近3000字符
    )
    aiResponse.value = diagnosis
  } catch (error) {
    aiResponse.value = `❌ 错误: ${error.message}`
  } finally {
    aiLoading.value = false
  }
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

// 切换 AI 模式
const toggleAIMode = () => {
  if (!aiStore.enabled || !aiStore.isConfigured) {
    terminal.write('\r\n\x1b[31m⚠️  请先在设置中配置 AI\x1b[0m\r\n')
    return
  }
  
  aiMode.value = !aiMode.value
  
  if (aiMode.value) {
    terminal.write('\r\n\x1b[32m🤖 AI 模式已启用\x1b[0m - 输入自然语言描述，AI 将生成命令\r\n')
    terminal.write('\x1b[36m提示: 再按 Ctrl+A 退出 AI 模式\x1b[0m\r\n')
  } else {
    terminal.write('\r\n\x1b[33m✓ AI 模式已关闭\x1b[0m\r\n')
  }
}

// 处理 AI 命令（支持流式输出和智能任务）
const handleAICommand = async (prompt) => {
  if (!aiStore.enabled || !aiStore.isConfigured) {
    terminal.write('\x1b[31m⚠️  请先在设置中配置 AI\x1b[0m\r\n')
    return
  }
  
  // 检测是否是复杂任务（项目分析、代码修改等）
  const isComplexTask = /(熟悉|了解|分析|查看|理解).*(项目|代码|这个)|修改|添加.*文件|重构/.test(prompt)
  
  console.log('🔍 输入分析:', { prompt, isComplexTask })
  
  if (isComplexTask) {
    // 执行智能任务
    await handleIntelligentTask(prompt)
  } else {
    // 执行简单命令
    await handleSimpleCommand(prompt)
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

// 处理简单命令（对话模式）
const handleSimpleCommand = async (prompt) => {
  // 添加用户消息到历史
  conversationHistory.value.push({
    role: 'user',
    content: prompt
  })
  
  terminal.write(`\r\n\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n`)
  terminal.write(`\x1b[36m🤖 AI:\x1b[0m\r\n\r\n`)
  
  let response = ''
  let lastLength = 0
  let isCommandOnly = false
  const startRow = terminal.buffer.active.cursorY // 记录开始位置
  
  try {
    // 构建带上下文的提示
    const contextPrompt = conversationHistory.value.length > 2 
      ? `[对话上下文]\n${conversationHistory.value.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}\n\n[当前问题]\n${prompt}`
      : prompt
    
    // 使用流式输出（实时格式化）
    let buffer = '' // 缓冲区用于处理跨chunk的Markdown
    let inCodeBlock = false // 代码块状态标记
    
    response = await aiStore.generateCommand(contextPrompt, {
      onStream: (chunk, fullContent) => {
        // 只处理新增的内容
        const newContent = fullContent.substring(lastLength)
        if (newContent) {
          buffer += newContent
          
          // 检测是否有完整的行可以格式化
          const lines = buffer.split('\n')
          
          // 保留最后一个不完整的行（可能跨chunk）
          const incompleteLine = lines.pop()
          
          // 格式化并输出完整的行
          for (const line of lines) {
            // 检测代码块标记
            if (line.trim().startsWith('```')) {
              if (!inCodeBlock) {
                // 代码块开始
                const lang = line.trim().substring(3).trim()
                const langLabel = lang ? `[${lang}]` : '[code]'
                terminal.write(`\x1b[90m╭─ ${langLabel} ────────────────\x1b[0m\r\n`)
                inCodeBlock = true
              } else {
                // 代码块结束
                terminal.write(`\x1b[90m╰────────────────────────────\x1b[0m\r\n`)
                inCodeBlock = false
              }
            } else if (inCodeBlock) {
              // 代码块内容（使用黄色）
              terminal.write(`\x1b[33m${line}\x1b[0m\r\n`)
            } else {
              // 普通行，应用 Markdown 格式化
              const formatted = formatMarkdownLine(line)
              terminal.write(formatted + '\r\n')
            }
          }
          
          // 将不完整的行放回缓冲区
          buffer = incompleteLine || ''
          
          lastLength = fullContent.length
          
          // 🔥 自动滚动到底部
          terminal.scrollToBottom()
        }
      }
    })
    
    // 输出最后的不完整行（如果有）
    if (buffer) {
      if (inCodeBlock) {
        terminal.write(`\x1b[33m${buffer}\x1b[0m`)
      } else {
        const formatted = formatMarkdownLine(buffer)
        terminal.write(formatted)
      }
    }
    
    // 流式输出完成，确保滚动到底部
    terminal.write('\r\n')
    terminal.scrollToBottom()
    
    // 添加AI回复到历史
    conversationHistory.value.push({
      role: 'assistant',
      content: response
    })
    
    // 保存对话历史
    saveSessionData()
    
    // 检查是否是纯命令（需要执行）
    const commandPattern = /^[a-z][\w\-]*(\s+[\w\-\.\/\@]+)*$/i
    isCommandOnly = commandPattern.test(response.trim()) && !response.includes('\n') && response.length < 100
    
    // 如果是纯命令，提供执行选项
    if (isCommandOnly) {
      terminal.write(`\r\n\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n`)
      terminal.write(`\x1b[32m✨ 执行中...\x1b[0m\r\n`)
      
      // 直接执行命令
      await invoke('write_terminal', {
        sessionId: props.session.id,
        data: response.trim() + '\r'
      })
      
      // 等待命令执行
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 显示继续提问的提示符（只在AI模式下）
    if (warpMode.value === 'ai' || aiMode.value) {
      terminal.write(`\r\n\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n`)
      terminal.write(`\x1b[35m❯\x1b[0m `)
      terminal.scrollToBottom()
    }
    
  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ AI 错误: ${error.message}\x1b[0m\r\n`)
    if (warpMode.value === 'ai' || aiMode.value) {
      terminal.write(`\x1b[35m❯\x1b[0m `)
    }
    terminal.scrollToBottom()
  }
}

// 处理智能任务
const handleIntelligentTask = async (prompt) => {
  // 添加到对话历史
  conversationHistory.value.push({
    role: 'user',
    content: prompt
  })
  
  // 简洁模式：不显示冗余提示和分割线
  terminal.write(`\r\n`)
  
  try {
    // 获取终端当前工作目录
    let workingDir
    
    // 如果已经有记录的目录（通过 @ 选择或 cd 命令），优先使用
    if (currentDir.value && currentDir.value !== '~') {
      workingDir = currentDir.value
      terminal.write(`\x1b[90m💡 终端已准备就绪\x1b[0m\r\n`)
    } else {
      // 否则初始化为主目录
      try {
        workingDir = await invoke('get_home_dir')
        currentDir.value = workingDir  // 初始化 currentDir
        terminal.write(`\x1b[90m💡 终端已准备就绪\x1b[0m\r\n`)
      } catch {
        terminal.write(`\x1b[31m❌ 无法获取工作目录，请用 @ 选择项目目录\x1b[0m\r\n`)
        if (warpMode.value === 'ai') {
          terminal.write(`\x1b[35m❯\x1b[0m `)
        }
        terminal.scrollToBottom()
        return
      }
    }
    
    // 显示简洁提示
    terminal.write(`\x1b[36m📂 分析目录: ${workingDir}\x1b[0m\r\n`)
    terminal.write(`\x1b[90m🔍 正在分析项目...\x1b[0m\r\n\r\n`)
    terminal.scrollToBottom()
    
    // 执行智能任务，静默执行命令不显示过程
    const result = await aiStore.executeIntelligentTask(prompt, workingDir, async (cmd, purpose) => {
      // 静默执行命令
      const output = await invoke('execute_command', { command: cmd, workingDir })
      return output
    })
    
    terminal.write(`\x1b[36m🤖 AI 分析:\x1b[0m\r\n\r\n`)
    terminal.scrollToBottom()
    
    if (result.type === 'project_analysis') {
      // 流式显示项目分析结果（逐行，保持格式完整）
      const lines = result.analysis.split('\n')
      let isInCodeBlock = false
      
      for (const line of lines) {
        // 检测代码块开始/结束
        if (line.trim().startsWith('```')) {
          isInCodeBlock = !isInCodeBlock
        }
        
        // 格式化并输出行
        const formatted = formatMarkdownLine(line)
        terminal.write(formatted + '\r\n')
        terminal.scrollToBottom()
        
        // 添加延迟产生明显的流式效果
        // 代码块和空行快速跳过，正文慢一些
        if (line.trim() === '') {
          await new Promise(resolve => setTimeout(resolve, 10))
        } else if (isInCodeBlock) {
          await new Promise(resolve => setTimeout(resolve, 20))
        } else {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      conversationHistory.value.push({
        role: 'assistant',
        content: result.analysis
      })
      
      // 保存对话历史
      saveSessionData()
    } else if (result.type === 'code_modification') {
      // 显示代码修改方案
      const formatted = formatTerminalOutput(result.plan.explanation)
      terminal.write(formatted)
      terminal.write(`\r\n\r\n\x1b[33m⚠️  代码修改功能开发中...\x1b[0m\r\n`)
      
      conversationHistory.value.push({
        role: 'assistant',
        content: result.plan.explanation
      })
      
      // 保存对话历史
      saveSessionData()
    } else {
      // 简单命令，执行
      const formatted = formatTerminalOutput(result)
      terminal.write(formatted)
      terminal.write(`\r\n\r\n\x1b[32m✨ 执行中...\x1b[0m\r\n`)
      await invoke('write_terminal', {
        sessionId: props.session.id,
        data: result + '\r'
      })
      
      conversationHistory.value.push({
        role: 'assistant',
        content: result
      })
      
      // 保存对话历史
      saveSessionData()
      
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 显示继续提问的提示符
    if (warpMode.value === 'ai' || aiMode.value) {
      terminal.write(`\r\n\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n`)
      terminal.write(`\x1b[35m❯\x1b[0m `)
      terminal.scrollToBottom()
    }
    
  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ 智能任务失败: ${error.message}\x1b[0m\r\n`)
    if (warpMode.value === 'ai' || aiMode.value) {
      terminal.write(`\r\n\x1b[35m❯\x1b[0m `)
    }
    terminal.scrollToBottom()
  }
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
    
    // 简洁模式：只显示AI提示符，不显示冗余信息
    terminal.write('\r\n')
    terminal.write('\x1b[35m❯\x1b[0m ')  // 显示AI提示符
    terminal.scrollToBottom()
  } else {
    // 不清空对话历史，保留用于下次切换回 AI 模式
    
    // 简洁模式：不显示切换提示
    terminal.write('\r\n')
    // 自动初始化：发送回车触发新的 prompt
    try {
      await invoke('write_terminal', { 
        sessionId: props.session.id, 
        data: '\r' 
      })
    } catch (error) {
      console.warn('Failed to initialize terminal:', error)
    }
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
  aiStore.model = model
  aiStore.saveConfig()
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
  
  terminal.write(`
\x1b[36m${icon} 已选择${type}: ${file.name}\x1b[0m
`)
  terminal.write(`\x1b[90m路径: ${file.path}\x1b[0m
`)
  
  // 如果在 AI 模式，可以直接提示用户可以使用这个文件/目录
  if (warpMode.value === 'ai') {
    terminal.write(`\x1b[90m提示: 现在可以在提示中引用此${type}\x1b[0m
`)
  }
}

// 保存会话
const saveSession = () => {
  saveSessionData()
  terminal.write('
\x1b[32m✓ 会话已保存\x1b[0m
')
}

// 清空终端
const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
    terminalBuffer.value = []
    terminal.write('\x1b[32m✓ 终端已清空\x1b[0m
')
  }
}

// 复制内容
const copyContent = () => {
  const content = getTerminalText()
  if (content) {
    navigator.clipboard.writeText(content).then(() => {
      terminal.write('
\x1b[32m✓ 内容已复制到剪贴板\x1b[0m
')
    }).catch(() => {
      terminal.write('
\x1b[31m❌ 复制失败\x1b[0m
')
    })
  } else {
    terminal.write('
\x1b[33m⚠️ 没有可复制的内容\x1b[0m
')
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
    a.download = `terminal-${session.id}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    terminal.write('
\x1b[32m✓ 内容已下载\x1b[0m
')
  } else {
    terminal.write('
\x1b[33m⚠️ 没有可下载的内容\x1b[0m
')
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
      terminal.write('
\x1b[32m✓ 通知已发送\x1b[0m
')
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Huaan Command', {
            body: '终端通知已发送',
            icon: '/icon.png'
          })
          terminal.write('
\x1b[32m✓ 通知已发送\x1b[0m
')
        } else {
          terminal.write('
\x1b[33m⚠️ 通知权限被拒绝\x1b[0m
')
        }
      })
    } else {
      terminal.write('
\x1b[33m⚠️ 通知权限被拒绝\x1b[0m
')
    }
  } else {
    terminal.write('
\x1b[31m❌ 浏览器不支持通知\x1b[0m
')
  }
}

// keep-alive 激活时（从其他页面切换回来）
onActivated(() => {
  if (terminal && fitAddon) {
    // 恢复终端尺寸
    setTimeout(() => fitAddon.fit(), 10)
  }
})

// keep-alive 失活时（切换到其他页面）
onDeactivated(() => {
  // 保存会话数据
  saveSessionData()
})

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
    <!-- Warp模式栏 -->
    <WarpModeBar 
      :mode="warpMode"
      :current-model="currentModel"
      :session-id="session.id"
      @update:mode="handleModeUpdate"
      @update:current-model="handleModelUpdate"
      @mention-file="handleMentionFile"
    />
    
    <!-- 终端 -->
    <div
      class="terminal-pane"
      ref="terminalRef"
      @click="focusTerminal"
    />
    
    <!-- iFlow风格输入栏 -->
    <div class="iflow-input-bar">
      <div class="input-actions">
        <button class="action-btn" title="对话">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5.5 7.5L8 10L10.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <button class="action-btn" @click="handleMentionFile" title="文件">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3H13V13H3V3Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 6H10M6 8H10M6 10H8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
          <span class="action-text">~</span>
        </button>
        
        <button class="action-btn" title="执行">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3L13 8L3 13V3Z" fill="currentColor"/>
          </svg>
          <span class="action-text">→</span>
        </button>
        
        <button class="action-btn" title="表情">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="7" r="1" fill="currentColor"/>
            <circle cx="10" cy="7" r="1" fill="currentColor"/>
            <path d="M5 10C5 10 6.5 11.5 8 11.5C9.5 11.5 11 10 11 10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
        </button>
        
        <button class="action-btn" @click="sendNotification" title="邮件">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 5L8 9L14 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div class="input-area">
        <div class="prompt-arrow">></div>
        <input
          ref="bottomInputRef"
          v-model="bottomInput"
          type="text"
          class="input-field-active"
          placeholder="输入命令..."
          @keydown="handleBottomInputKeydown"
          @input="handleBottomInputChange"
        />
        <div v-if="bottomInputSuggestion" class="bottom-suggestion">
          {{ bottomInputSuggestion }}
        </div>
      </div>
    </div>
    
    <!-- AI 助手面板 -->
    <div v-if="showAIPanel" class="ai-panel">
      <div class="ai-header">
        <span class="ai-title">🤖 终端 AI 助手</span>
        <button class="ai-close" @click="showAIPanel = false">✕</button>
      </div>
      
      <div class="ai-quick-actions">
        <button 
          class="quick-action-btn"
          @click="aiAnalyzeOutput"
          :disabled="aiLoading"
          title="分析当前终端输出"
        >
          📊 分析输出
        </button>
        <button 
          class="quick-action-btn"
          @click="aiDiagnoseError"
          :disabled="aiLoading"
          title="诊断错误信息"
        >
          🔍 诊断错误
        </button>
        <button 
          class="quick-action-btn"
          @click="clearAI"
          :disabled="aiLoading"
          title="清空"
        >
          🗑️ 清空
        </button>
      </div>
      
      <div class="ai-input-section">
        <input
          v-model="aiPrompt"
          type="text"
          placeholder="描述你想执行的命令..."
          class="ai-input"
          @keyup.enter="aiGenerateCommand"
          :disabled="aiLoading"
        />
        <button 
          class="ai-generate-btn"
          @click="aiGenerateCommand"
          :disabled="!aiPrompt.trim() || aiLoading"
        >
          {{ aiLoading ? '⏳' : '✨' }} 生成
        </button>
      </div>
      
      <div v-if="aiResponse" class="ai-response-section">
        <div class="response-header">
          <span class="response-label">AI 回复:</span>
          <button 
            v-if="aiPrompt && !aiPrompt.includes('分析') && !aiPrompt.includes('诊断')"
            class="use-command-btn"
            @click="useGeneratedCommand"
            title="将命令写入终端"
          >
            📝 使用命令
          </button>
        </div>
        <div class="ai-response" v-html="formatResponse(aiResponse)"></div>
      </div>
      
      <div v-else-if="aiLoading" class="ai-loading">
        <div class="loading-spinner"></div>
        <span>AI 思考中...</span>
      </div>
      
      <div v-else class="ai-placeholder">
        💡 输入命令描述并生成，或使用快捷按钮分析终端输出
      </div>
    </div>
    
    <!-- 文件选择器模态框 -->
    <FilePickerModal
      :show="showFilePicker"
      :currentDir="currentDir"
      :sessionId="session.id"
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
  padding-bottom: 80px; /* 为iFlow风格输入栏留出空间 */
  overflow: hidden;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: #1a1a1a;
  background: #ffffff;
}

/* iFlow风格输入栏 */
.iflow-input-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #ffffff;
  border-top: 1px solid #e5e5e5;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #8e8e93;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}

.action-text {
  font-size: 12px;
  font-weight: 500;
}

.input-area {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  background: #ffffff;
  border: 2px solid #0071e3;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  transition: all 0.2s ease;
}

.input-area:hover {
  border-color: #005bb5;
}

.prompt-arrow {
  color: #0071e3;
  font-weight: bold;
  font-size: 14px;
}

.input-field-active {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  color: #1a1a1a;
  padding: 0;
  min-height: 20px;
}

.input-field-active::placeholder {
  color: #8e8e93;
}

.bottom-suggestion {
  position: absolute;
  left: 52px; /* 箭头宽度 + 间距 */
  color: #8e8e93;
  pointer-events: none;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
}

.input-field {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 20px;
  position: relative;
}

.cursor {
  width: 8px;
  height: 16px;
  background: #1a1a1a;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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


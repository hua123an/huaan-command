<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import FixedInput from './FixedInput.vue'
import WarpModeBar from './WarpModeBar.vue'
import FilePickerModal from './FilePickerModal.vue'
import { useAIStore } from '../stores/ai'
import { useTerminalStore } from '../stores/terminal'
import { useSettingsStore } from '../stores/settings'
import { useTheme } from '../composables/useTheme'
import { useBuiltinCommands } from '../composables/useBuiltinCommands'
import { useDirectoryTracking } from '../composables/useDirectoryTracking'

const props = defineProps({
  session: Object,
  visible: Boolean
})

const aiStore = useAIStore()
const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
const { getTerminalTheme } = useTheme()
const { isBuiltinCommand, getCommandPrompt, getHelpMessage } = useBuiltinCommands()
const { currentDir, updateFromOutput } = useDirectoryTracking()

// 状态
const warpMode = ref('terminal')
const currentModel = ref(aiStore.model || 'gpt-4o-mini')
const showFilePicker = ref(false)
const terminalRef = ref(null)
const inputComponent = ref(null)
const currentInput = ref('') // 跟踪当前输入的命令

// 终端实例
let terminal = null
let fitAddon = null
let unlisten = null

// 初始化终端
const initTerminal = async () => {
  console.log('🟢 BlockTerminalPane 初始化开始')
  try {
    // 如果已经有终端实例，先清理
    if (terminal) {
      terminal.dispose()
      terminal = null
    }

    if (unlisten) {
      unlisten()
      unlisten = null
    }

    // 创建 xterm.js 实例（支持直接输入）
    terminal = new Terminal({
      cursorBlink: true,  // 启用光标闪烁
      fontSize: 14,
      fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
      theme: getTerminalTheme(),
      allowTransparency: true,
      scrollback: 10000,
      disableStdin: false  // 启用标准输入，支持直接在终端输入
    })

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(terminalRef.value)
    fitAddon.fit()

    // 启动 PTY 终端（传递 shell 类型）
    await invoke('start_terminal', {
      sessionId: props.session.id,
      shellType: settingsStore.settings.shell
    })

    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
      if (terminal) {
        terminal.write(event.payload)
      }
    })

    // 自动初始化：发送回车触发 prompt
    setTimeout(() => {
      invoke('write_terminal', {
        sessionId: props.session.id,
        data: '\r'
      }).catch(err => console.error('初始化失败:', err))
    }, 300)

    // 监听终端输入并发送到 PTY
    terminal.onData((data) => {
      invoke('write_terminal', {
        sessionId: props.session.id,
        data: data
      })
    })

    // 恢复会话数据
    const sessionData = terminalStore.getSessionData(props.session.id)
    if (sessionData) {
      warpMode.value = sessionData.warpMode || 'terminal'
      currentModel.value = sessionData.currentModel || aiStore.model
      currentDir.value = sessionData.currentDir || '~'
    } else {
      // 新会话，确保 currentDir 有初始值
      currentDir.value = '~'
    }

    // 聚焦终端
    nextTick(() => {
      terminal.focus()
    })

    console.log('🟢 初始化完成')
  } catch (error) {
    console.error('❌ 初始化终端失败:', error)
  }
}

onMounted(async () => {
  // 初始化终端
  await initTerminal()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  if (terminal) {
    terminal.options.theme = getTerminalTheme()
  }
})

// 监听 shell 类型变化，重新初始化终端
watch(() => settingsStore.settings.shell, async () => {
  console.log('🔄 Shell 类型变化，重新初始化终端')
  // 先关闭旧终端
  await invoke('close_terminal', {
    sessionId: props.session.id
  }).catch(err => console.error('关闭终端失败:', err))

  // 重新初始化
  await initTerminal()
})

// 监听系统主题变化（当主题为auto时）
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleSystemThemeChange = () => {
  if (settingsStore.settings.theme === 'auto' && terminal) {
    terminal.options.theme = getTerminalTheme()
  }
}
darkModeQuery.addEventListener('change', handleSystemThemeChange)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  if (unlisten) {
    unlisten()
  }
  if (terminal) {
    terminal.dispose()
  }
  // 关闭 PTY 终端
  invoke('close_terminal', {
    sessionId: props.session.id
  }).catch(err => console.error('关闭终端失败:', err))
})

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
    // 通知 PTY 调整大小
    const { cols, rows } = terminal
    invoke('resize_terminal', {
      sessionId: props.session.id,
      cols,
      rows
    }).catch(err => console.error('调整终端大小失败:', err))
  }
}

// 处理命令提交
const handleSubmit = async (command) => {
  // 检查是否是内置命令
  if (isBuiltinCommand(command)) {
    terminal.write(`\r\n`)
    await handleBuiltinCommand(command)
    return
  }

  if (warpMode.value === 'ai') {
    // AI 模式
    await handleAICommand(command)
  } else {
    // 终端模式：将命令发送到 PTY
    if (terminal) {
      // 发送命令到 PTY（模拟用户输入 + 回车）
      invoke('write_terminal', {
        sessionId: props.session.id,
        data: command + '\n'
      })
    }
  }
}

// 聚焦终端（直接聚焦终端区域）
const focusTerminal = () => {
  nextTick(() => {
    if (terminal) {
      terminal.focus()
    }
  })
}

// 处理内置命令
const handleBuiltinCommand = async (command) => {
  try {
    // 特殊处理 :help 和 :list
    if (command === ':help' || command === ':list') {
      const helpMessage = getHelpMessage()
      terminal.write(helpMessage.replace(/\n/g, '\r\n'))
      // 确保终端重新获得焦点
      setTimeout(() => terminal.focus(), 50)
      return
    }

    // 获取命令对应的 AI 提示词
    const prompt = getCommandPrompt(command)

    if (!prompt) {
      terminal.write(`\x1b[33m⚠️  未知的内置命令: ${command}\x1b[0m\r\n`)
      terminal.write(`\x1b[90m输入 :help 查看所有可用命令\x1b[0m\r\n`)
      // 确保终端重新获得焦点
      setTimeout(() => terminal.focus(), 50)
      return
    }

    // 显示命令执行提示
    terminal.write(`\x1b[36m🤖 ${command}\x1b[0m\r\n\r\n`)

    // 直接调用 callAI，使用通用的助手角色
    let response = ''
    let lastLength = 0

    // 为了增加随机性，在提示词中添加随机元素
    const randomSeed = Date.now()
    const enhancedPrompt = `${prompt} (请给出新的、不同的回答，随机种子: ${randomSeed})`

    const messages = [
      {
        role: 'system',
        content: '你是一个友好、幽默的 AI 助手。请用简洁、自然的语言回答用户的问题。每次回答都要有创意，避免重复相同的内容。'
      },
      {
        role: 'user',
        content: enhancedPrompt
      }
    ]

    response = await aiStore.callAI(messages, {
      stream: true,
      temperature: 0.9, // 提高创造性
      maxTokens: 500,   // 限制长度
      onStream: (chunk, fullContent) => {
        // 只处理新增的内容
        const newContent = fullContent.substring(lastLength)
        if (newContent) {
          // 简单处理：直接输出，将 \n 替换为 \r\n
          const formatted = newContent.replace(/\n/g, '\r\n')
          terminal.write(formatted)
          lastLength = fullContent.length
          terminal.scrollToBottom()
        }
      }
    })

    // 完成后换行
    terminal.write('\r\n\r\n')
    terminal.scrollToBottom()

  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ 执行失败: ${error.message}\x1b[0m\r\n`)
    terminal.scrollToBottom()
  }
}

// Markdown 转终端格式渲染
const renderMarkdownToTerminal = (text) => {
  let rendered = text
  
  // 代码块 ```language\ncode\n```
  rendered = rendered.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const lines = code.split('\n')
    const formatted = lines.map(line => `  ${line}`).join('\r\n')
    return `\x1b[90m╭─ ${lang || 'code'}\x1b[0m\r\n\x1b[33m${formatted}\x1b[0m\r\n\x1b[90m╰─\x1b[0m`
  })
  
  // 行内代码 `code`
  rendered = rendered.replace(/`([^`]+)`/g, '\x1b[33m$1\x1b[0m')
  
  // 标题
  rendered = rendered.replace(/^### (.+)$/gm, '\x1b[35m▸ $1\x1b[0m')
  rendered = rendered.replace(/^## (.+)$/gm, '\x1b[35m\x1b[1m▸▸ $1\x1b[0m')
  rendered = rendered.replace(/^# (.+)$/gm, '\x1b[36m\x1b[1m▸▸▸ $1\x1b[0m')
  
  // 列表
  rendered = rendered.replace(/^\s*[-*+] (.+)$/gm, '  \x1b[32m•\x1b[0m $1')
  rendered = rendered.replace(/^\s*(\d+)\. (.+)$/gm, '  \x1b[32m$1.\x1b[0m $2')
  
  // 粗体 **text**
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
  
  // 斜体 *text*
  rendered = rendered.replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m')
  
  // 链接 [text](url)
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x1b[34m\x1b[4m$1\x1b[0m')
  
  // 引用 > text
  rendered = rendered.replace(/^> (.+)$/gm, '\x1b[90m│ $1\x1b[0m')
  
  // 分隔线
  rendered = rendered.replace(/^---+$/gm, '\x1b[90m─────────────────────────────────────────\x1b[0m')
  
  // 转换换行符
  rendered = rendered.replace(/\n/g, '\r\n')
  
  return rendered
}

// 处理 AI 命令
const handleAICommand = async (prompt) => {
  // 在终端显示用户输入
  terminal.write(`\r\n\x1b[36m🤖 ${prompt}\x1b[0m\r\n\r\n`)
  
  let accumulatedText = ''
  
  try {
    // 调用 AI 生成响应
    const response = await aiStore.generateCommand(prompt, {
      stream: true,
      onStream: (delta) => {
        accumulatedText += delta
        
        // 实时渲染 markdown
        const rendered = renderMarkdownToTerminal(delta)
        terminal.write(rendered)
      }
    })
    
    terminal.write('\r\n\r\n')
  } catch (error) {
    terminal.write(`\r\n\x1b[31mAI 错误: ${error.message}\x1b[0m\r\n`)
  }
}

// 模式切换
const handleModeUpdate = (mode) => {
  warpMode.value = mode
  terminalStore.updateSessionMode(props.session.id, mode)
  inputComponent.value?.focus()
}

// 模型切换
const handleModelUpdate = (model) => {
  currentModel.value = model
  aiStore.model = model
  terminalStore.updateSessionModel(props.session.id, model)
}

// 文件选择
const handleMentionFile = () => {
  showFilePicker.value = true
}

const handleFileSelect = async (file) => {
  if (file.isDir) {
    // 只更新当前目录状态即可
    currentDir.value = file.path
    console.log('✅ 已切换到目录:', file.path)
  }
  // 如果是文件，可以在这里处理插入文件路径到输入框
}
</script>

<template>
  <div class="block-terminal-pane" :class="{ visible }">
    <!-- 终端输出区域（xterm.js） -->
    <div class="terminal-area" ref="terminalRef" @click="focusTerminal"></div>
    
    <!-- 底部区域：模式切换 + 输入框 -->
    <div class="bottom-area">
      <!-- Warp 模式栏 -->
      <WarpModeBar
        :mode="warpMode"
        :currentModel="currentModel"
        :sessionId="session.id"
        @update:mode="handleModeUpdate"
        @update:currentModel="handleModelUpdate"
        @mention-file="handleMentionFile"
      />
      
      <!-- 固定底部输入框 -->
      <FixedInput
        ref="inputComponent"
        :mode="warpMode"
        :currentModel="currentModel"
        :currentDir="currentDir"
        @submit="handleSubmit"
        @update:mode="handleModeUpdate"
        @mention-file="handleMentionFile"
      />
    </div>
    
    <!-- 文件选择器 -->
    <FilePickerModal
      :show="showFilePicker"
      :currentDir="currentDir"
      @select="handleFileSelect"
      @close="showFilePicker = false"
    />
  </div>
</template>

<style scoped>
.block-terminal-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--terminal-bg);
  opacity: 0;
  transition: opacity 0.2s, background-color 0.3s ease;
}

.block-terminal-pane.visible {
  opacity: 1;
}

.terminal-area {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: hidden;
}

.terminal-area :deep(.xterm) {
  height: 100%;
}

.terminal-area :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar {
  width: 8px;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.bottom-area {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-color);
}
</style>


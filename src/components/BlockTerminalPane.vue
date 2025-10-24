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

const props = defineProps({
  session: Object,
  visible: Boolean
})

const aiStore = useAIStore()
const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
const { getTerminalTheme } = useTheme()

// 状态
const warpMode = ref('terminal')
const currentModel = ref(aiStore.model || 'gpt-4o-mini')
const currentDir = ref('~')
const showFilePicker = ref(false)
const terminalRef = ref(null)
const inputComponent = ref(null)

// 终端实例
let terminal = null
let fitAddon = null
let unlisten = null

// 初始化终端
onMounted(async () => {
  try {
    // 创建 xterm.js 实例
    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
      theme: getTerminalTheme(),
      allowTransparency: true,
      scrollback: 10000,
      disableStdin: true // 禁用终端内输入，使用底部输入框
    })

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    
    terminal.open(terminalRef.value)
    fitAddon.fit()
    
    // 启动终端进程
    await invoke('start_terminal', { sessionId: props.session.id })
    
    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
      terminal.write(event.payload)
    })
    
    // 恢复会话数据
    const sessionData = terminalStore.getSessionData(props.session.id)
    if (sessionData) {
      warpMode.value = sessionData.warpMode || 'terminal'
      currentModel.value = sessionData.currentModel || aiStore.model
      currentDir.value = sessionData.currentDir || '~'
      if (sessionData.buffer) {
        terminal.write(sessionData.buffer)
      }
    }
    
    // 聚焦输入框
    nextTick(() => {
      inputComponent.value?.focus()
    })
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
  } catch (error) {
    console.error('初始化终端失败:', error)
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

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  if (unlisten) {
    unlisten()
  }
  if (terminal) {
    terminal.dispose()
  }
})

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
  }
}

// 处理命令提交
const handleSubmit = async (command) => {
  if (warpMode.value === 'ai') {
    // AI 模式
    await handleAICommand(command)
  } else {
    // 终端模式
    await executeCommand(command)
  }
}

// 执行终端命令
const executeCommand = async (command) => {
  try {
    // 发送命令到终端
    await invoke('write_terminal', {
      sessionId: props.session.id,
      data: command + '\r'
    })
  } catch (error) {
    terminal.write(`\r\n\x1b[31m错误: ${error.message}\x1b[0m\r\n`)
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

const handleFileSelect = (file) => {
  if (file.isDir) {
    currentDir.value = file.path
  }
  // TODO: 在输入框中插入文件路径
}
</script>

<template>
  <div class="block-terminal-pane" :class="{ visible }">
    <!-- 终端输出区域（xterm.js） -->
    <div class="terminal-area" ref="terminalRef"></div>
    
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
        @submit="handleSubmit"
        @update:mode="handleModeUpdate"
        @mention-file="handleMentionFile"
      />
    </div>
    
    <!-- 文件选择器 -->
    <FilePickerModal
      v-if="showFilePicker"
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


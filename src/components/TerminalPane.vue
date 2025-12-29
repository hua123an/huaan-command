<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useTheme } from '../composables/useTheme'
import { useErrorHandler } from '../composables/useErrorHandler'
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  visible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['output', 'error', 'resize'])

// 组合式函数
const { getTerminalTheme } = useTheme()
const { handleError } = useErrorHandler()

// 响应式数据
const terminalRef = ref(null)
const terminal = ref(null)
const fitAddon = ref(null)
const unlisten = ref(null)
const isInitialized = ref(false)

// 初始化终端
const initTerminal = async () => {
  try {
    console.log(`[TerminalPane] Initializing terminal for session ${props.session.id}`)

    if (!terminalRef.value) {
      console.error('[TerminalPane] Terminal container not found')
      throw new Error('Terminal container not found')
    }

    // 清理现有实例
    cleanup()

    // 创建终端实例
    terminal.value = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
      theme: getTerminalTheme(),
      allowProposedApi: true
    })

    console.log(`[TerminalPane] Terminal instance created for session ${props.session.id}`)

    // 添加插件
    fitAddon.value = new FitAddon()
    terminal.value.loadAddon(fitAddon.value)
    terminal.value.loadAddon(new WebLinksAddon())

    // 挂载到 DOM
    terminal.value.open(terminalRef.value)
    fitAddon.value.fit()

    console.log(`[TerminalPane] Terminal opened and fitted for session ${props.session.id}`)

    // 注册数据处理
    terminal.value.onData(handleTerminalInput)

    // 启动后端终端进程
    await startTerminalProcess()

    isInitialized.value = true
    console.log(`[TerminalPane] Terminal initialization complete for session ${props.session.id}`)
  } catch (error) {
    console.error(`[TerminalPane] Initialization failed for session ${props.session.id}:`, error)
    handleError(error, 'Terminal initialization failed')
  }
}

// 处理终端输入
const handleTerminalInput = async data => {
  try {
    await invoke('write_terminal', {
      sessionId: props.session.id,
      data
    })
  } catch (error) {
    handleError(error, 'Failed to write to terminal')
  }
}

// 启动终端进程
const startTerminalProcess = async () => {
  try {
    await invoke('start_terminal', {
      sessionId: props.session.id,
      shellType: 'zsh' // 可配置
    })

    // 监听输出
    unlisten.value = await listen(`terminal-output-${props.session.id}`, event => {
      if (terminal.value) {
        terminal.value.write(event.payload)
        emit('output', event.payload)
      }
    })
  } catch (error) {
    handleError(error, 'Failed to start terminal process')
  }
}

// 调整大小
const resize = () => {
  if (fitAddon.value && props.visible) {
    fitAddon.value.fit()

    if (terminal.value) {
      invoke('resize_terminal', {
        sessionId: props.session.id,
        cols: terminal.value.cols,
        rows: terminal.value.rows
      }).catch(error => handleError(error, 'Failed to resize terminal'))
    }
  }
}

// 清理资源
const cleanup = () => {
  if (unlisten.value) {
    unlisten.value()
    unlisten.value = null
  }

  if (terminal.value) {
    terminal.value.dispose()
    terminal.value = null
  }

  fitAddon.value = null
  isInitialized.value = false
}

// 生命周期
onMounted(() => {
  initTerminal()
})

onUnmounted(() => {
  cleanup()
})

// 监听可见性变化
watch(
  () => props.visible,
  visible => {
    if (visible && isInitialized.value) {
      nextTick(() => {
        // 延迟调整大小，确保 DOM 完全渲染
        setTimeout(() => resize(), 100)
      })
    }
  }
)

// 暴露方法
defineExpose({
  resize,
  cleanup,
  isInitialized: () => isInitialized.value
})
</script>

<template>
  <div class="terminal-core" :class="{ 'terminal-visible': visible }">
    <div ref="terminalRef" class="terminal-container" :class="{ 'terminal-hidden': !visible }" />
  </div>
</template>

<style scoped>
.terminal-core {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.terminal-core.terminal-visible {
  position: relative;
  z-index: 1;
}

.terminal-container {
  width: 100%;
  height: 100%;
  background: var(--terminal-bg, #1a1a1a);
}

.terminal-hidden {
  visibility: hidden;
  pointer-events: none;
}

/* 终端样式覆盖 */
:deep(.xterm) {
  padding: 10px;
}

:deep(.xterm-viewport) {
  background: transparent !important;
}

:deep(.xterm-screen) {
  background: transparent !important;
}
</style>

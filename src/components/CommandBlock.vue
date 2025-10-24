<script setup>
import { ref, onMounted, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useTheme } from '../composables/useTheme'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  command: String,
  output: String,
  timestamp: Number,
  status: String, // 'running' | 'success' | 'error'
  exitCode: Number
})

const { getTerminalTheme } = useTheme()
const settingsStore = useSettingsStore()
const terminalRef = ref(null)
let terminal = null

onMounted(() => {
  // 创建只读的终端实例用于显示输出
  terminal = new Terminal({
    cursorBlink: false,
    disableStdin: true,
    fontSize: 14,
    fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
    theme: getTerminalTheme(),
    allowTransparency: true,
    rows: 10,
    scrollback: 1000
  })

  terminal.open(terminalRef.value)
  
  // 写入输出内容
  if (props.output) {
    terminal.write(props.output)
  }
})

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  if (terminal) {
    terminal.options.theme = getTerminalTheme()
  }
})

// 监听系统主题变化
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleSystemThemeChange = () => {
  if (settingsStore.settings.theme === 'auto' && terminal) {
    terminal.options.theme = getTerminalTheme()
  }
}
darkModeQuery.addEventListener('change', handleSystemThemeChange)

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const getStatusIcon = () => {
  switch (props.status) {
    case 'running': return '⏳'
    case 'success': return '✓'
    case 'error': return '✗'
    default: return '•'
  }
}

const getStatusColor = () => {
  switch (props.status) {
    case 'running': return '#ffd60a'
    case 'success': return '#32d74b'
    case 'error': return '#ff453a'
    default: return '#636366'
  }
}
</script>

<template>
  <div class="command-block" :class="`status-${status}`">
    <div class="command-header">
      <div class="command-info">
        <span class="status-icon" :style="{ color: getStatusColor() }">{{ getStatusIcon() }}</span>
        <span class="command-text">{{ command }}</span>
      </div>
      <div class="command-meta">
        <span class="timestamp">{{ formatTime(timestamp) }}</span>
        <span v-if="exitCode !== undefined" class="exit-code" :class="{ error: exitCode !== 0 }">
          退出码: {{ exitCode }}
        </span>
      </div>
    </div>
    <div class="command-output" ref="terminalRef"></div>
  </div>
</template>

<style scoped>
.command-block {
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.2s;
}

.command-block:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.command-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.status-icon {
  font-size: 16px;
  line-height: 1;
}

.command-text {
  color: var(--text-primary);
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 14px;
  font-weight: 500;
}

.command-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timestamp {
  color: var(--text-secondary);
  font-size: 12px;
}

.exit-code {
  color: var(--success-color);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(50, 215, 75, 0.1);
}

.exit-code.error {
  color: var(--error-color);
  background: rgba(255, 69, 58, 0.1);
}

.command-output {
  min-height: 60px;
  max-height: 400px;
  overflow: auto;
}

.status-running .command-header {
  background: rgba(255, 214, 10, 0.1);
}

.status-success .command-header {
  background: rgba(50, 215, 75, 0.05);
}

.status-error .command-header {
  background: rgba(255, 69, 58, 0.05);
}
</style>


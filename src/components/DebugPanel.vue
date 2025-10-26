<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLogsStore } from '../stores/logs'

const logsStore = useLogsStore()
const isVisible = ref(false)
const selectedFilter = ref('all') // all, info, warn, error, success

// 过滤日志
const filteredLogs = computed(() => {
  if (selectedFilter.value === 'all') {
    return logsStore.logs
  }
  return logsStore.logs.filter(log => log.level === selectedFilter.value)
})

const clearLogs = () => {
  logsStore.clear()
}

const toggleVisibility = () => {
  isVisible.value = !isVisible.value
}

// 全局快捷键 Ctrl+Shift+L 切换日志面板
onMounted(() => {
  const handleKeydown = (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault()
      toggleVisibility()
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})

defineExpose({ toggleVisibility })
</script>

<template>
  <div v-if="isVisible" class="log-panel">
    <div class="log-header">
      <span class="log-title">📋 应用日志</span>
      <div class="log-actions">
        <button @click="clearLogs" class="log-btn">清空</button>
        <button @click="toggleVisibility" class="log-btn close">✕</button>
      </div>
    </div>
    
    <!-- 过滤器 -->
    <div class="log-filters">
      <button 
        :class="['filter-btn', { active: selectedFilter === 'all' }]"
        @click="selectedFilter = 'all'"
      >
        全部 ({{ logsStore.logs.length }})
      </button>
      <button 
        :class="['filter-btn', 'filter-info', { active: selectedFilter === 'info' }]"
        @click="selectedFilter = 'info'"
      >
        信息
      </button>
      <button 
        :class="['filter-btn', 'filter-success', { active: selectedFilter === 'success' }]"
        @click="selectedFilter = 'success'"
      >
        成功
      </button>
      <button 
        :class="['filter-btn', 'filter-warn', { active: selectedFilter === 'warn' }]"
        @click="selectedFilter = 'warn'"
      >
        警告
      </button>
      <button 
        :class="['filter-btn', 'filter-error', { active: selectedFilter === 'error' }]"
        @click="selectedFilter = 'error'"
      >
        错误
      </button>
    </div>
    
    <div class="log-content">
      <div 
        v-for="(log, index) in filteredLogs" 
        :key="index"
        :class="['log-entry', `log-${log.level}`]"
      >
        <span class="log-time">{{ log.timestamp }}</span>
        <span class="log-icon">
          <span v-if="log.level === 'info'">ℹ️</span>
          <span v-else-if="log.level === 'success'">✅</span>
          <span v-else-if="log.level === 'warn'">⚠️</span>
          <span v-else-if="log.level === 'error'">❌</span>
        </span>
        <span class="log-message">{{ log.message }}</span>
      </div>
      
      <div v-if="filteredLogs.length === 0" class="no-logs">
        <span v-if="logsStore.logs.length === 0">暂无日志</span>
        <span v-else>该级别暂无日志</span>
      </div>
    </div>
    
    <div class="log-footer">
      <span class="log-hint">按 Ctrl+Shift+L 切换面板 | 显示 {{ filteredLogs.length }} / {{ logsStore.logs.length }} 条</span>
    </div>
  </div>
  
  <!-- 浮动按钮 - 始终显示 -->
  <button 
    @click="toggleVisibility" 
    :class="['log-fab', { active: isVisible }]"
    :title="isVisible ? '关闭日志面板 (Ctrl+Shift+L)' : '打开日志面板 (Ctrl+Shift+L)'"
  >
    📋
  </button>
</template>

<style scoped>
.log-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 650px;
  height: 500px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 12px 12px 0 0;
}

.log-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.log-btn {
  padding: 4px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.log-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  border-color: var(--border-hover);
}

.log-btn.close {
  padding: 4px 8px;
  font-size: 14px;
}

/* 过滤器 */
.log-filters {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.filter-btn {
  padding: 4px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  border-color: var(--border-hover);
}

.filter-btn.active {
  background: rgba(74, 158, 255, 0.2);
  border-color: #4a9eff;
  color: #4a9eff;
}

.filter-btn.filter-info.active {
  background: rgba(74, 158, 255, 0.2);
  border-color: #4a9eff;
  color: #4a9eff;
}

.filter-btn.filter-success.active {
  background: rgba(52, 199, 89, 0.2);
  border-color: #34c759;
  color: #34c759;
}

.filter-btn.filter-warn.active {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffa500;
  color: #ffa500;
}

.filter-btn.filter-error.active {
  background: rgba(255, 68, 68, 0.2);
  border-color: #ff4444;
  color: #ff4444;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: var(--bg-primary);
}

.log-entry {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
  word-break: break-all;
}

.log-entry:hover {
  background: var(--bg-hover);
}

.log-time {
  color: var(--text-tertiary);
  min-width: 70px;
  flex-shrink: 0;
  font-size: 11px;
}

.log-icon {
  flex-shrink: 0;
  width: 20px;
}

.log-message {
  color: var(--text-primary);
  flex: 1;
}

.log-info {
  border-left: 3px solid #4a9eff;
}

.log-success {
  border-left: 3px solid #34c759;
}

.log-success .log-message {
  color: #34c759;
}

.log-warn {
  border-left: 3px solid #ffa500;
}

.log-warn .log-message {
  color: #ffa500;
}

.log-error {
  border-left: 3px solid #ff4444;
  background: rgba(255, 68, 68, 0.15);
}

.log-error .log-message {
  color: #ff4444;
}

.no-logs {
  text-align: center;
  color: var(--text-tertiary);
  padding: 60px 20px;
  font-size: 13px;
}

.log-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 0 0 12px 12px;
}

.log-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.log-content::-webkit-scrollbar {
  width: 8px;
}

.log-content::-webkit-scrollbar-track {
  background: transparent;
}

.log-content::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 浮动按钮 - 与设置按钮齐平 */
.log-fab {
  position: fixed;
  top: 10px;
  right: 66px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  z-index: 10000;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-fab:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--border-hover);
}

.log-fab:active {
  transform: translateY(0);
}

/* 激活状态 - 面板打开时 */
.log-fab.active {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  color: white;
  box-shadow: 
    0 4px 16px rgba(10, 132, 255, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.25);
}

.log-fab.active:hover {
  background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-color) 100%);
  box-shadow: 
    0 6px 20px rgba(10, 132, 255, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
</style>


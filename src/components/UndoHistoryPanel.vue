<template>
  <div class="undo-history-panel" :class="{ collapsed: isCollapsed }">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="panel-icon">🔄</span>
        <h3>操作历史</h3>
        <span class="history-count">{{ historyCount }}</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" title="刷新" :disabled="isLoading" @click="refresh">
          <span :class="{ spinning: isLoading }">🔄</span>
        </button>
        <button class="icon-btn" title="折叠/展开" @click="toggleCollapse">
          {{ isCollapsed ? '▼' : '▲' }}
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div v-show="!isCollapsed" class="panel-content">
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button
          class="btn btn-sm"
          :disabled="!canUndo"
          title="撤销最后一个操作 (Ctrl+Z)"
          @click="handleUndo"
        >
          ↶ 撤销
        </button>
        <button
          class="btn btn-sm"
          :disabled="!canRedo"
          title="重做 (Ctrl+Shift+Z)"
          @click="handleRedo"
        >
          ↷ 重做
        </button>
        <button
          class="btn btn-sm btn-danger"
          :disabled="historyCount === 0"
          title="清空历史"
          @click="handleClear"
        >
          🗑️ 清空
        </button>
      </div>

      <!-- 统计信息 -->
      <div v-if="stats" class="stats-section">
        <div class="stat-item">
          <span class="stat-label">可撤销:</span>
          <span class="stat-value">{{ stats.undoCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">可重做:</span>
          <span class="stat-value">{{ stats.redoCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">备份:</span>
          <span class="stat-value">{{ stats.backupCount }}</span>
        </div>
      </div>

      <!-- 历史记录列表 -->
      <div class="history-list">
        <div v-if="history.length === 0" class="empty-state">
          <p>暂无操作历史</p>
        </div>

        <div
          v-for="(item, index) in history"
          :key="item.id"
          class="history-item"
          :class="{ selected: selectedItem?.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-header">
            <span class="item-icon">{{ getOperationIcon(item.type) }}</span>
            <span class="item-description">{{ item.description }}</span>
            <span class="item-time">{{ formatTime(item.timestamp) }}</span>
          </div>

          <div v-if="item.type === 'file_write'" class="item-details">
            <code class="file-path">{{ item.path }}</code>
          </div>

          <div v-if="item.type === 'command_execute'" class="item-details">
            <code class="command">{{ item.command }}</code>
          </div>

          <!-- 操作按钮 -->
          <div class="item-actions">
            <button class="action-btn" title="回滚到此操作" @click.stop="rollbackTo(item.id)">
              ⏪ 回滚到此
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="cancelConfirm">
      <div class="confirm-dialog">
        <h4>{{ confirmTitle }}</h4>
        <p>{{ confirmMessage }}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancelConfirm">取消</button>
          <button class="btn btn-danger" @click="executeConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { undoManager } from '../security/UndoManager'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['undo', 'redo', 'rollback', 'error'])

const isCollapsed = ref(props.collapsed)
const isLoading = ref(false)
const history = ref([])
const stats = ref(null)
const selectedItem = ref(null)
const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref(null)

const historyCount = computed(() => history.value.length)
const canUndo = computed(() => stats.value?.undoCount > 0)
const canRedo = computed(() => stats.value?.redoCount > 0)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const refresh = async () => {
  isLoading.value = true
  try {
    history.value = undoManager.getHistory(50)
    stats.value = undoManager.getStats()
  } catch (error) {
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

const handleUndo = async () => {
  try {
    const result = await undoManager.undo()
    emit('undo', result)
    await refresh()
  } catch (error) {
    emit('error', error)
  }
}

const handleRedo = async () => {
  try {
    const result = await undoManager.redo()
    emit('redo', result)
    await refresh()
  } catch (error) {
    emit('error', error)
  }
}

const handleClear = () => {
  confirmTitle.value = '清空历史'
  confirmMessage.value = '确定要清空所有操作历史吗？此操作不可撤销。'
  confirmAction.value = async () => {
    undoManager.clear()
    await refresh()
  }
  showConfirm.value = true
}

const rollbackTo = operationId => {
  const operation = history.value.find(op => op.id === operationId)
  if (!operation) return

  confirmTitle.value = '回滚操作'
  confirmMessage.value = `确定要回滚到「${operation.description}」吗？这将撤销之后的所有操作。`
  confirmAction.value = async () => {
    try {
      const result = await undoManager.rollbackTo(operationId)
      emit('rollback', result)
      await refresh()
    } catch (error) {
      emit('error', error)
    }
  }
  showConfirm.value = true
}

const executeConfirm = async () => {
  if (confirmAction.value) {
    await confirmAction.value()
  }
  cancelConfirm()
}

const cancelConfirm = () => {
  showConfirm.value = false
  confirmTitle.value = ''
  confirmMessage.value = ''
  confirmAction.value = null
}

const selectItem = item => {
  selectedItem.value = item
}

const getOperationIcon = type => {
  const icons = {
    file_write: '📝',
    file_delete: '🗑️',
    file_rename: '✏️',
    command_execute: '⚡',
    directory_change: '📁'
  }
  return icons[type] || '🔧'
}

const formatTime = timestamp => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 键盘快捷键
const handleKeydown = e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault()
    handleUndo()
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
    e.preventDefault()
    handleRedo()
  }
}

onMounted(() => {
  refresh()
  document.addEventListener('keydown', handleKeydown)

  // 定期刷新
  const interval = setInterval(refresh, 10000)
  onUnmounted(() => {
    clearInterval(interval)
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<style scoped>
.undo-history-panel {
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
}

.undo-history-panel.collapsed {
  max-height: 48px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #404040);
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
}

.history-count {
  background: var(--primary-color, #007aff);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #999);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #404040);
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border-color, #404040);
}

.btn-sm:hover:not(:disabled) {
  background: var(--bg-hover, #353535);
}

.btn-danger {
  background: transparent;
  color: #ff3b30;
  border-color: #ff3b30;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.1);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stats-section {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-tertiary, #2a2a2a);
  font-size: 12px;
}

.stat-item {
  display: flex;
  gap: 4px;
}

.stat-label {
  color: var(--text-secondary, #999);
}

.stat-value {
  color: var(--primary-color, #007aff);
  font-weight: 600;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #999);
  font-size: 13px;
}

.history-item {
  background: var(--bg-tertiary, #2a2a2a);
  border: 1px solid var(--border-color, #404040);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--bg-hover, #353535);
  border-color: var(--primary-color, #007aff);
}

.history-item.selected {
  border-color: var(--primary-color, #007aff);
  background: rgba(0, 122, 255, 0.1);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.item-icon {
  font-size: 16px;
}

.item-description {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #e0e0e0);
  font-weight: 500;
}

.item-time {
  font-size: 11px;
  color: var(--text-secondary, #999);
}

.item-details {
  margin: 6px 0;
}

.file-path,
.command {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #4ec9b0;
  overflow-x: auto;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  background: none;
  border: 1px solid var(--border-color, #404040);
  color: var(--text-secondary, #999);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--primary-color, #007aff);
  border-color: var(--primary-color, #007aff);
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-dialog {
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.confirm-dialog h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary, #e0e0e0);
}

.confirm-dialog p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--text-secondary, #b0b0b0);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-secondary {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border-color, #404040);
  padding: 8px 16px;
}
</style>

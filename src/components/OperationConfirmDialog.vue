<template>
  <div v-if="isVisible" class="operation-confirm-overlay" @click.self="handleCancel">
    <div class="operation-confirm-dialog">
      <!-- 标题栏 -->
      <div class="dialog-header">
        <div class="header-left">
          <span class="risk-badge" :class="`risk-${operation?.riskLevel || 'low'}`">
            {{ getRiskIcon(operation?.riskLevel) }}
          </span>
          <h3>{{ operation?.preview?.title || 'AI 想要执行操作' }}</h3>
        </div>
        <button class="close-btn" title="取消 (Esc)" @click="handleCancel">✕</button>
      </div>

      <!-- 内容区 -->
      <div class="dialog-content">
        <!-- 操作描述 -->
        <div class="operation-description">
          <p>{{ operation?.preview?.description }}</p>
          <div v-if="operation?.preview?.warning" class="warning-box">
            ⚠️ {{ operation?.preview?.warning }}
          </div>
        </div>

        <!-- 命令预览 (如果是命令执行) -->
        <div v-if="operation?.type === 'execute_command'" class="command-preview">
          <div class="preview-label">命令:</div>
          <code class="command-code">{{ operation?.preview?.command }}</code>
          <div v-if="operation?.preview?.workingDir" class="working-dir">
            <span class="preview-label">工作目录:</span>
            <code>{{ operation?.preview?.workingDir }}</code>
          </div>
        </div>

        <!-- 文件写入预览 -->
        <div v-if="operation?.type === 'write_file'" class="file-preview">
          <div class="preview-label">
            文件: <code>{{ operation?.preview?.path }}</code>
          </div>

          <!-- 文件统计 -->
          <div v-if="operation?.preview?.stats" class="file-stats">
            <span v-if="operation.preview.stats.oldLines > 0">
              {{ operation.preview.stats.oldLines }} → {{ operation.preview.stats.newLines }} 行
            </span>
            <span v-else> {{ operation.preview.stats.newLines }} 行 </span>
            <span class="divider">|</span>
            <span>{{ formatSize(operation.preview.stats.size) }}</span>
          </div>

          <!-- Diff 预览 -->
          <div v-if="operation?.preview?.changes?.length > 0" class="diff-preview">
            <div class="preview-label">变更预览:</div>
            <div class="diff-container">
              <div
                v-for="(change, index) in operation.preview.changes.slice(0, 20)"
                :key="index"
                class="diff-line"
                :class="`diff-${change.type}`"
              >
                <span class="line-number">{{ change.number }}</span>
                <span class="line-content">{{ change.line }}</span>
              </div>
              <div v-if="operation.preview.changes.length > 20" class="diff-more">
                ... 还有 {{ operation.preview.changes.length - 20 }} 行变更
              </div>
            </div>
          </div>
        </div>

        <!-- 文件删除预览 -->
        <div v-if="operation?.type === 'delete_file'" class="delete-preview">
          <div class="preview-label">文件:</div>
          <code class="file-path">{{ operation?.preview?.path }}</code>
        </div>

        <!-- 风险列表 -->
        <div v-if="operation?.preview?.risks?.length > 0" class="risks-section">
          <div class="preview-label">⚠️ 检测到的风险:</div>
          <ul class="risk-list">
            <li
              v-for="(risk, index) in operation.preview.risks"
              :key="index"
              class="risk-item"
              :class="`risk-${risk.level}`"
            >
              <span class="risk-level-badge">{{ risk.level }}</span>
              <span class="risk-message">{{ risk.message }}</span>
              <code v-if="risk.matched" class="risk-matched">{{ risk.matched }}</code>
            </li>
          </ul>
        </div>

        <!-- 批量操作提示 -->
        <div v-if="hasPendingOperations" class="batch-operations">
          <p>
            还有 {{ pendingCount }} 个操作等待确认
            <button class="text-btn" @click="showPendingList = !showPendingList">
              {{ showPendingList ? '隐藏' : '查看' }}
            </button>
          </p>
          <div v-if="showPendingList" class="pending-list">
            <div v-for="op in pendingOperations" :key="op.id" class="pending-item">
              {{ op.preview?.title || op.type }}
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="dialog-actions">
        <button class="btn btn-danger" @click="handleDeny">✗ 拒绝</button>

        <div class="action-right">
          <button
            v-if="hasPendingOperations"
            class="btn btn-secondary"
            title="批准所有待确认操作"
            @click="handleApproveAll"
          >
            ✓ 全部批准 ({{ pendingCount + 1 }})
          </button>

          <button
            class="btn btn-primary"
            :class="{ 'btn-warning': operation?.riskLevel === 'critical' }"
            @click="handleApprove"
          >
            ✓ 批准
          </button>
        </div>
      </div>

      <!-- 快捷键提示 -->
      <div class="keyboard-hints">
        <span><kbd>Enter</kbd> 批准</span>
        <span><kbd>Esc</kbd> 拒绝</span>
        <span v-if="hasPendingOperations"><kbd>Ctrl+A</kbd> 全部批准</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  operation: {
    type: Object,
    default: null
  },
  pendingOperations: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['approve', 'deny', 'approve-all', 'cancel'])

const isVisible = ref(false)
const showPendingList = ref(false)

const hasPendingOperations = computed(() => props.pendingOperations.length > 0)
const pendingCount = computed(() => props.pendingOperations.length)

watch(
  () => props.operation,
  newOp => {
    isVisible.value = !!newOp
  },
  { immediate: true }
)

const getRiskIcon = level => {
  const icons = {
    safe: '✅',
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
    critical: '🔥'
  }
  return icons[level] || 'ℹ️'
}

const formatSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const handleApprove = () => {
  emit('approve', props.operation.id)
  isVisible.value = false
}

const handleDeny = () => {
  emit('deny', props.operation.id)
  isVisible.value = false
}

const handleApproveAll = () => {
  emit('approve-all')
  isVisible.value = false
}

const handleCancel = () => {
  emit('cancel')
  isVisible.value = false
}

// 键盘快捷键
const handleKeydown = e => {
  if (!isVisible.value) return

  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    handleApprove()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleDeny()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && hasPendingOperations.value) {
    e.preventDefault()
    handleApproveAll()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.operation-confirm-overlay {
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
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.operation-confirm-dialog {
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
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

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #404040);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.risk-badge {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--bg-tertiary, #2a2a2a);
}

.risk-badge.risk-critical {
  background: rgba(255, 59, 48, 0.2);
}

.risk-badge.risk-high {
  background: rgba(255, 149, 0, 0.2);
}

.risk-badge.risk-medium {
  background: rgba(255, 204, 0, 0.2);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #e0e0e0);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #999);
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.operation-description {
  margin-bottom: 16px;
}

.operation-description p {
  margin: 0 0 12px 0;
  color: var(--text-secondary, #b0b0b0);
}

.warning-box {
  background: rgba(255, 149, 0, 0.1);
  border-left: 3px solid #ff9500;
  padding: 12px;
  border-radius: 4px;
  color: #ff9500;
  font-size: 14px;
}

.preview-label {
  font-size: 13px;
  color: var(--text-secondary, #999);
  margin-bottom: 8px;
  font-weight: 500;
}

.command-preview,
.file-preview,
.delete-preview {
  background: var(--bg-tertiary, #2a2a2a);
  border: 1px solid var(--border-color, #404040);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.command-code,
.file-path {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #4ec9b0;
  overflow-x: auto;
  margin: 8px 0;
}

.working-dir {
  margin-top: 8px;
  font-size: 12px;
}

.file-stats {
  font-size: 13px;
  color: var(--text-secondary, #999);
  margin: 8px 0;
}

.file-stats .divider {
  margin: 0 8px;
  opacity: 0.5;
}

.diff-preview {
  margin-top: 12px;
}

.diff-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.diff-line {
  display: flex;
  padding: 2px 8px;
  line-height: 1.5;
}

.diff-line.diff-add {
  background: rgba(40, 167, 69, 0.15);
  color: #50fa7b;
}

.diff-line.diff-remove {
  background: rgba(220, 53, 69, 0.15);
  color: #ff5555;
}

.line-number {
  display: inline-block;
  width: 40px;
  color: var(--text-secondary, #666);
  text-align: right;
  margin-right: 12px;
  user-select: none;
}

.line-content {
  flex: 1;
}

.diff-more {
  padding: 8px;
  text-align: center;
  color: var(--text-secondary, #999);
  font-style: italic;
  background: rgba(255, 255, 255, 0.02);
}

.risks-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #404040);
}

.risk-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}

.risk-item {
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.risk-item.risk-critical {
  background: rgba(255, 59, 48, 0.1);
  border-left: 3px solid #ff3b30;
}

.risk-item.risk-high {
  background: rgba(255, 149, 0, 0.1);
  border-left: 3px solid #ff9500;
}

.risk-item.risk-medium {
  background: rgba(255, 204, 0, 0.1);
  border-left: 3px solid #ffcc00;
}

.risk-level-badge {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
}

.risk-matched {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-left: auto;
}

.batch-operations {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 6px;
  font-size: 13px;
}

.text-btn {
  background: none;
  border: none;
  color: var(--primary-color, #007aff);
  cursor: pointer;
  text-decoration: underline;
  padding: 0 4px;
}

.pending-list {
  margin-top: 8px;
  max-height: 100px;
  overflow-y: auto;
}

.pending-item {
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin: 4px 0;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #404040);
}

.action-right {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color, #007aff);
  color: white;
}

.btn-primary:hover {
  background: #0066dd;
}

.btn-warning {
  background: #ff9500;
}

.btn-warning:hover {
  background: #e08600;
}

.btn-secondary {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border-color, #404040);
}

.btn-secondary:hover {
  background: var(--bg-hover, #353535);
}

.btn-danger {
  background: transparent;
  color: #ff3b30;
  border: 1px solid #ff3b30;
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.1);
}

.keyboard-hints {
  display: flex;
  gap: 16px;
  padding: 8px 20px;
  background: var(--bg-tertiary, #2a2a2a);
  border-top: 1px solid var(--border-color, #404040);
  font-size: 12px;
  color: var(--text-secondary, #999);
  border-radius: 0 0 12px 12px;
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
  border: 1px solid var(--border-color, #404040);
}
</style>

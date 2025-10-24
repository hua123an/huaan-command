<script setup>
import { ref, computed } from 'vue'
import { useTaskStore } from '../stores/task'
import TaskDetail from './TaskDetail.vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit', 'clone'])

const taskStore = useTaskStore()
const selectedTask = ref(null)

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    const statusOrder = { running: 0, pending: 1, failed: 2, success: 3, cancelled: 4 }
    return statusOrder[a.status] - statusOrder[b.status]
  })
})

const selectTask = (task) => {
  selectedTask.value = task
}

const closeDetail = () => {
  selectedTask.value = null
}

const handleRunTask = async (task) => {
  try {
    await taskStore.runTask(task.id)
  } catch (error) {
    console.error('Failed to run task:', error)
  }
}

const handleCancelTask = async (task) => {
  try {
    await taskStore.cancelTask(task.id)
  } catch (error) {
    console.error('Failed to cancel task:', error)
  }
}

const handleDeleteTask = async (task) => {
  if (confirm(`确定要删除任务"${task.name}"吗？`)) {
    try {
      await taskStore.deleteTask(task.id)
      if (selectedTask.value?.id === task.id) {
        selectedTask.value = null
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }
}

const showContextMenu = (event, task) => {
  event.preventDefault()
  // 简单实现：使用浏览器原生菜单，后续可以改成自定义菜单
}

const getStatusIcon = (status) => {
  const icons = {
    pending: '○',
    running: '◉',
    success: '✓',
    failed: '✗',
    cancelled: '⊘'
  }
  return icons[status] || '?'
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const getDuration = (task) => {
  if (!task.start_time) return '-'
  const end = task.end_time || Math.floor(Date.now() / 1000)
  const duration = end - task.start_time
  if (duration < 60) return `${duration}秒`
  if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`
  return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分`
}
</script>

<template>
  <div class="task-list-container">
    <div class="task-list">
      <div v-if="sortedTasks.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无任务</p>
        <p class="empty-hint">点击右上角"新建任务"来创建第一个任务</p>
      </div>

      <div
        v-for="task in sortedTasks"
        :key="task.id"
        :class="['task-item', task.status, { selected: selectedTask?.id === task.id }]"
        @click="selectTask(task)"
        @dblclick="emit('edit', task)"
      >
        <div class="task-header">
          <div class="task-info">
            <span class="task-icon">{{ getStatusIcon(task.status) }}</span>
            <div class="task-details">
              <h3 class="task-name">{{ task.name }}</h3>
              <code class="task-command">{{ task.command }}</code>
            </div>
          </div>
          <div class="task-actions" @click.stop>
            <button
              class="action-btn edit"
              @click="emit('edit', task)"
              title="编辑"
            >
              ✏️
            </button>
            <button
              class="action-btn clone"
              @click="emit('clone', task)"
              title="克隆"
            >
              📋
            </button>
            <button
              v-if="task.status === 'pending' || task.status === 'failed'"
              class="action-btn run"
              @click="handleRunTask(task)"
              title="运行"
            >
              ▶
            </button>
            <button
              v-if="task.status === 'running'"
              class="action-btn cancel"
              @click="handleCancelTask(task)"
              title="取消"
            >
              ■
            </button>
            <button
              class="action-btn delete"
              @click="handleDeleteTask(task)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="task-meta">
          <span class="meta-item">
            <span class="meta-label">状态:</span>
            <span :class="['meta-value', task.status]">
              {{ { pending: '待运行', running: '运行中', success: '成功', failed: '失败', cancelled: '已取消' }[task.status] }}
            </span>
          </span>
          <span class="meta-item" v-if="task.start_time">
            <span class="meta-label">开始:</span>
            <span class="meta-value">{{ formatTime(task.start_time) }}</span>
          </span>
          <span class="meta-item" v-if="task.start_time">
            <span class="meta-label">耗时:</span>
            <span class="meta-value">{{ getDuration(task) }}</span>
          </span>
        </div>

        <div v-if="task.status === 'running'" class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>

    <TaskDetail
      v-if="selectedTask"
      :task="selectedTask"
      @close="closeDetail"
    />
  </div>
</template>

<style scoped>
.task-list-container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 4px 0;
  font-size: 16px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-tertiary);
}

.task-item {
  background: var(--bg-tertiary) 100%);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.task-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top left, rgba(10, 132, 255, 0.05) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.task-item:hover {
  background: var(--bg-hover) 100%);
  border-color: var(--border-hover);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--border-color);
}

.task-item:hover::before {
  opacity: 1;
}

.task-item.selected {
  border-color: rgba(10, 132, 255, 0.5);
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.15) 0%, rgba(10, 132, 255, 0.08) 100%);
  box-shadow: 
    0 8px 24px rgba(10, 132, 255, 0.2),
    0 0 0 1px rgba(10, 132, 255, 0.3);
}

.task-item.running {
  border-left: 3px solid var(--accent-color);
  box-shadow: 
    0 4px 16px rgba(10, 132, 255, 0.15),
    0 0 0 1px rgba(10, 132, 255, 0.1);
}

.task-item.success {
  border-left: 3px solid var(--success-color);
  box-shadow: 
    0 4px 16px rgba(50, 215, 75, 0.1),
    0 0 0 1px rgba(50, 215, 75, 0.08);
}

.task-item.failed {
  border-left: 3px solid var(--error-color);
  box-shadow: 
    0 4px 16px rgba(255, 69, 58, 0.15),
    0 0 0 1px rgba(255, 69, 58, 0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.task-info {
  display: flex;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.task-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.task-item.running .task-icon {
  color: var(--accent-color);
  animation: spin 2s linear infinite;
}

.task-item.success .task-icon {
  color: var(--success-color);
}

.task-item.failed .task-icon {
  color: var(--error-color);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.task-details {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  letter-spacing: -0.2px;
}

.task-command {
  display: block;
  font-size: 12px;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--bg-secondary);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.task-item:hover .task-command {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
  color: rgba(255, 255, 255, 0.75);
}

.task-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn.run:hover {
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  border-color: rgba(10, 132, 255, 0.5);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);
}

.action-btn.edit:hover {
  background: rgba(10, 132, 255, 0.2);
}

.action-btn.clone:hover {
  background: rgba(50, 215, 75, 0.2);
}

.action-btn.delete:hover {
  background: linear-gradient(135deg, #ff453a 0%, #cc3a30 100%);
  border-color: rgba(255, 69, 58, 0.5);
  box-shadow: 0 4px 12px rgba(255, 69, 58, 0.4);
}

.task-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-item:hover .task-actions {
  opacity: 1;
}

.task-meta {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
}

.meta-item {
  display: flex;
  gap: 6px;
}

.meta-label {
  color: var(--text-tertiary);
}

.meta-value {
  color: var(--text-secondary);
  font-weight: 500;
}

.meta-value.running {
  color: var(--accent-color);
}

.meta-value.success {
  color: var(--success-color);
}

.meta-value.failed {
  color: var(--error-color);
}

.meta-value.cancelled {
  color: var(--text-tertiary);
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bg-tertiary);
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    #0a84ff 25%,
    #0066cc 50%,
    #0a84ff 75%,
    transparent
  );
  background-size: 200% 100%;
  animation: progress 1.5s linear infinite;
  box-shadow: 0 0 10px rgba(10, 132, 255, 0.6);
}

@keyframes progress {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.task-list::-webkit-scrollbar {
  width: 8px;
}

.task-list::-webkit-scrollbar-track {
  background: transparent;
}

.task-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

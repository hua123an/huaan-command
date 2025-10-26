<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '../stores/task'
import TaskList from '../components/TaskList.vue'
import TaskForm from '../components/TaskForm.vue'
import StatsPanel from '../components/StatsPanel.vue'
import WorkflowModal from '../components/WorkflowModal.vue'
import AIChatPanel from '../components/AIChatPanel.vue'

const taskStore = useTaskStore()
const showForm = ref(false)
const editingTask = ref(null)
const searchQuery = ref('')
const showStats = ref(false)
const showWorkflows = ref(false)
const showAIChat = ref(false)

const stats = computed(() => taskStore.getTaskStats())

// 防抖搜索 (300ms)
const debouncedSearch = ref('')
let searchTimeout = null

const updateSearch = (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = value
  }, 300)
}

const filteredTasks = computed(() => {
  let filtered = taskStore.tasks
  
  // 分组过滤
  if (taskStore.activeGroup !== '全部') {
    filtered = filtered.filter(task => task.group === taskStore.activeGroup)
  }
  
  // 搜索过滤
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    filtered = filtered.filter(task =>
      task.name.toLowerCase().includes(query) ||
      task.command.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

// 监听搜索输入
const handleSearchInput = (e) => {
  searchQuery.value = e.target.value
  updateSearch(e.target.value)
}

onMounted(async () => {
  await taskStore.initListeners()
  await taskStore.refreshTasks()
  
  // 键盘快捷键
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  taskStore.cleanup()
  window.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(e) {
  // Cmd/Ctrl + N: 新建任务
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    editingTask.value = null
    showForm.value = true
  }
  // Cmd/Ctrl + R: 运行所有
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
    e.preventDefault()
    handleRunAll()
  }
  // Cmd/Ctrl + K: 清空
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    handleClearAll()
  }
  // Cmd/Ctrl + E: 导出
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
    e.preventDefault()
    taskStore.exportTasks()
  }
  // Cmd/Ctrl + F: 聚焦搜索
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    const searchInput = document.querySelector('.search-input')
    if (searchInput) searchInput.focus()
  }
  // Escape: 关闭模态框
  if (e.key === 'Escape') {
    showForm.value = false
    editingTask.value = null
  }
}

const handleCreateTask = async (taskData) => {
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, taskData)
      editingTask.value = null
    } else {
      await taskStore.createTask(taskData.name, taskData.command)
    }
    showForm.value = false
  } catch (error) {
    console.error('Failed to save task:', error)
  }
}

const handleEditTask = (task) => {
  // 只允许编辑未运行的任务
  if (task.status === 'running') {
    alert('无法编辑正在运行的任务，请先停止任务')
    return
  }
  editingTask.value = task
  showForm.value = true
}

const handleCloneTask = async (task) => {
  try {
    await taskStore.cloneTask(task.id)
  } catch (error) {
    console.error('Failed to clone task:', error)
  }
}

const handleRunAll = async () => {
  if (taskStore.tasks.length === 0) return
  try {
    await taskStore.runAllTasks()
  } catch (error) {
    console.error('Failed to run all tasks:', error)
  }
}

const handleClearAll = async () => {
  if (taskStore.tasks.length === 0) return
  if (confirm('确定要清空所有任务吗？此操作无法撤销。')) {
    await taskStore.clearTasks()
  }
}

const handleImport = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      const count = await taskStore.importTasks(file)
      alert(`成功导入 ${count} 个任务！`)
      event.target.value = ''
    } catch (error) {
      alert('导入失败：' + error.message)
      event.target.value = ''
    }
  }
}
</script>

<template>
  <div class="tasks-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>📋 分组</h2>
      </div>
      <div class="sidebar-groups">
        <button 
          v-for="group in ['全部', ...taskStore.groups]" 
          :key="group"
          :class="['group-item', { active: taskStore.activeGroup === group }]"
          @click="taskStore.setActiveGroup(group)"
        >
          <span class="group-icon">
            {{ group === '全部' ? '🏠' : group === '默认分组' ? '📌' : group === '开发' ? '💻' : group === '测试' ? '🧪' : group === '部署' ? '🚀' : '📁' }}
          </span>
          <span class="group-name">{{ group }}</span>
          <span class="group-badge">
            {{ group === '全部' ? taskStore.tasks.length : taskStore.getTasksByGroup(group).length }}
          </span>
        </button>
      </div>
      
      <!-- 快速统计 -->
      <div class="sidebar-stats">
        <div class="stat-card">
          <div class="stat-icon running">▶</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.running }}</div>
            <div class="stat-label">运行中</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">✓</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.success }}</div>
            <div class="stat-label">成功</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon failed">✕</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.failed }}</div>
            <div class="stat-label">失败</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <h1 class="page-title">
            {{ taskStore.activeGroup }}
            <span class="title-badge">{{ filteredTasks.length }}</span>
          </h1>
          <input
            :value="searchQuery"
            type="text"
            placeholder="🔍 搜索任务... (Cmd+F)"
            class="search-input"
            @input="handleSearchInput"
          />
        </div>
        
        <div class="toolbar-right">
          <div class="btn-group">
            <button 
              class="btn btn-icon" 
              :class="{ active: showAIChat }"
              title="AI 助手"
              @click="showAIChat = !showAIChat"
            >
              🤖
            </button>
            <button 
              class="btn btn-icon" 
              :class="{ active: showStats }"
              title="统计面板"
              @click="showStats = !showStats"
            >
              📊
            </button>
          </div>
          
          <button 
            class="btn btn-outline" 
            title="工作流模板"
            @click="showWorkflows = true"
          >
            📋 工作流
          </button>
          
          <div class="btn-group">
            <label class="btn btn-outline import-btn">
              📥
              <input type="file" accept=".json" style="display: none" @change="handleImport" />
            </label>
            <button 
              class="btn btn-outline" 
              :disabled="taskStore.tasks.length === 0"
              title="导出 (Cmd+E)"
              @click="taskStore.exportTasks()"
            >
              📤
            </button>
            <button 
              class="btn btn-outline" 
              :disabled="taskStore.tasks.length === 0"
              title="清空 (Cmd+K)"
              @click="handleClearAll"
            >
              🗑️
            </button>
          </div>
          
          <button 
            class="btn btn-run" 
            :disabled="taskStore.tasks.length === 0 || taskStore.isRunningAll"
            title="运行所有 (Cmd+R)"
            @click="handleRunAll"
          >
            {{ taskStore.isRunningAll ? '⏸ 运行中...' : '▶ 运行' }}
          </button>
          
          <button class="btn btn-primary" title="新建 (Cmd+N)" @click="showForm = true">
            + 新建
          </button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content">
        <div class="main-area" :class="{ 'with-stats': showStats, 'with-ai': showAIChat }">
          <TaskList 
            :tasks="filteredTasks"
            @edit="handleEditTask"
            @clone="handleCloneTask"
          />
        </div>
        <StatsPanel v-if="showStats" class="stats-sidebar" />
        <AIChatPanel v-if="showAIChat" @close="showAIChat = false" />
      </div>
    </div>

    <TaskForm 
      v-if="showForm" 
      :initial-data="editingTask"
      @submit="handleCreateTask" 
      @cancel="showForm = false; editingTask = null" 
    />

    <WorkflowModal
      v-if="showWorkflows"
      @close="showWorkflows = false"
    />
  </div>
</template>

<style scoped>
/* 容器布局 */
.tasks-container {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-groups {
  flex: 1;
  padding: 8px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  font-family: inherit;
}

.group-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.group-item.active {
  background: var(--bg-active);
  color: var(--accent-color);
  box-shadow: 0 0 0 1px var(--accent-color);
}

.group-icon {
  font-size: 16px;
  line-height: 1;
}

.group-name {
  flex: 1;
  text-align: left;
}

.group-badge {
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.group-item.active .group-badge {
  background: var(--bg-active);
  color: var(--accent-color);
}

/* 侧边栏统计 */
.sidebar-stats {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}

.stat-icon.running {
  background: rgba(10, 132, 255, 0.15);
  color: #0a84ff;
}

.stat-icon.success {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.stat-icon.failed {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 300px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.title-badge {
  padding: 2px 10px;
  background: var(--bg-active);
  color: var(--accent-color);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-group {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid var(--border-color);
}

/* 按钮样式 */
.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  letter-spacing: 0.2px;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 12px rgba(10, 132, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0077ed 0%, #0055bb 100%);
  box-shadow: 0 4px 20px rgba(10, 132, 255, 0.5);
  transform: translateY(-1px);
}

.btn-run {
  background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 12px rgba(52, 199, 89, 0.3);
}

.btn-run:hover:not(:disabled) {
  background: linear-gradient(135deg, #30b350 0%, #28c948 100%);
  box-shadow: 0 4px 20px rgba(52, 199, 89, 0.5);
  transform: translateY(-1px);
}

.btn-outline {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-icon.active {
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 12px rgba(10, 132, 255, 0.4);
}

/* 搜索框 */
.search-input {
  flex: 1;
  max-width: 300px;
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  transition: all 0.25s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  background: var(--bg-secondary);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

/* 内容区 */
.content {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.main-area {
  flex: 1;
  transition: all 0.3s ease;
}

.main-area.with-stats {
  flex: 0 0 calc(100% - 350px);
}

.main-area.with-ai {
  flex: 0 0 calc(100% - 420px);
}

.main-area.with-stats.with-ai {
  flex: 0 0 calc(100% - 770px);
}

.stats-sidebar {
  width: 350px;
  border-left: 1px solid var(--border-color);
  background: var(--bg-secondary);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.import-btn {
  cursor: pointer;
}
</style>

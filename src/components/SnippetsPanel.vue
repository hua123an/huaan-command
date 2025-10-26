<script setup>
import { ref, computed } from 'vue'
import { useSnippetsStore } from '../stores/snippets'

const emit = defineEmits(['use-snippet', 'close'])
const snippetsStore = useSnippetsStore()

const searchQuery = ref('')
const selectedCategory = ref('all')
const showAddDialog = ref(false)
const editingSnippet = ref(null)

// 新片段表单
const newSnippet = ref({
  name: '',
  description: '',
  command: '',
  variables: [],
  category: 'custom'
})

// 过滤后的片段
const filteredSnippets = computed(() => {
  let result = snippetsStore.snippets
  
  if (selectedCategory.value !== 'all') {
    result = result.filter(s => s.category === selectedCategory.value)
  }
  
  if (searchQuery.value) {
    result = snippetsStore.searchSnippets(searchQuery.value)
  }
  
  return result
})

// 分类统计
const categoryStats = computed(() => {
  const stats = { all: snippetsStore.snippets.length }
  snippetsStore.categories.forEach(cat => {
    stats[cat] = snippetsStore.getSnippetsByCategory(cat).length
  })
  return stats
})

// 使用片段
const useSnippet = (snippet) => {
  if (snippet.variables && snippet.variables.length > 0) {
    // 需要输入变量
    const values = []
    for (const varName of snippet.variables) {
      const value = prompt(`请输入${varName}:`)
      if (value === null) return // 取消
      values.push(value)
    }
    const command = snippetsStore.parseSnippet(snippet, values)
    emit('use-snippet', command)
  } else {
    emit('use-snippet', snippet.command)
  }
}

// 添加/编辑片段
const saveSnippet = () => {
  if (editingSnippet.value) {
    snippetsStore.updateSnippet(editingSnippet.value.id, newSnippet.value)
  } else {
    snippetsStore.addSnippet(newSnippet.value)
  }
  closeDialog()
}

// 删除片段
const deleteSnippet = (id) => {
  if (confirm('确定要删除这个代码片段吗？')) {
    snippetsStore.deleteSnippet(id)
  }
}

// 编辑片段
const editSnippet = (snippet) => {
  editingSnippet.value = snippet
  newSnippet.value = { ...snippet }
  showAddDialog.value = true
}

const closeDialog = () => {
  showAddDialog.value = false
  editingSnippet.value = null
  newSnippet.value = {
    name: '',
    description: '',
    command: '',
    variables: [],
    category: 'custom'
  }
}
</script>

<template>
  <div class="snippets-panel">
    <div class="panel-header">
      <h2>🚀 代码片段</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="panel-toolbar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索片段..." 
        class="search-input"
      />
      <button class="add-btn" @click="showAddDialog = true">+ 新建</button>
    </div>

    <div class="category-tabs">
      <button 
        v-for="cat in ['all', ...snippetsStore.categories]" 
        :key="cat"
        :class="['category-tab', { active: selectedCategory === cat }]"
        @click="selectedCategory = cat"
      >
        {{ cat === 'all' ? '全部' : cat }}
        <span class="count">{{ categoryStats[cat] || 0 }}</span>
      </button>
    </div>

    <div class="snippets-list">
      <div 
        v-for="snippet in filteredSnippets" 
        :key="snippet.id"
        class="snippet-card"
      >
        <div class="snippet-header">
          <h3>{{ snippet.name }}</h3>
          <div class="snippet-actions">
            <button class="action-btn" title="编辑" @click="editSnippet(snippet)">✎</button>
            <button class="action-btn delete" title="删除" @click="deleteSnippet(snippet.id)">🗑</button>
          </div>
        </div>
        <p class="snippet-description">{{ snippet.description }}</p>
        <pre class="snippet-command">{{ snippet.command }}</pre>
        <div class="snippet-footer">
          <span class="category-badge">{{ snippet.category }}</span>
          <button class="use-btn" @click="useSnippet(snippet)">使用</button>
        </div>
      </div>

      <div v-if="filteredSnippets.length === 0" class="empty-state">
        <p>没有找到代码片段</p>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog" @click.stop>
        <h3>{{ editingSnippet ? '编辑片段' : '新建片段' }}</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newSnippet.name" type="text" placeholder="片段名称" />
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="newSnippet.description" type="text" placeholder="简短描述" />
        </div>
        <div class="form-group">
          <label>命令</label>
          <textarea v-model="newSnippet.command" placeholder="命令内容 (使用 $1, $2 等作为变量)" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>分类</label>
          <select v-model="newSnippet.category">
            <option v-for="cat in snippetsStore.categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn" @click="closeDialog">取消</button>
          <button class="save-btn" @click="saveSnippet">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snippets-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 800px;
  height: 80%;
  background: var(--bg-secondary) 100%);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(40px);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h2 {
  font-size: 18px;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 18px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.panel-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  outline: none;
}

.add-btn {
  padding: 10px 20px;
  background: var(--accent-color);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
}

.category-tab {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-tab.active {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.5);
  color: var(--accent-color);
}

.count {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.snippets-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.snippet-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.snippet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.snippet-header h3 {
  margin: 0;
  font-size: 16px;
}

.snippet-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.action-btn.delete:hover {
  background: rgba(255, 59, 48, 0.3);
}

.snippet-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin-bottom: 8px;
}

.snippet-command {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.snippet-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-badge {
  padding: 4px 12px;
  background: rgba(10, 132, 255, 0.2);
  border-radius: 6px;
  font-size: 11px;
  color: var(--accent-color);
}

.use-btn {
  padding: 8px 16px;
  background: #32d74b;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: rgba(28, 28, 30, 0.98);
  padding: 24px;
  border-radius: 16px;
  width: 500px;
  max-width: 90%;
}

.dialog h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  outline: none;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
}

.save-btn {
  padding: 10px 20px;
  background: #0a84ff;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
</style>


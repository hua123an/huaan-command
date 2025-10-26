<script setup>
import { ref } from 'vue'
import { useTerminalStore } from '../stores/terminal'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import ConfirmDialog from './ConfirmDialog.vue'

const store = useTerminalStore()
const emit = defineEmits(['new-tab'])

const editingTab = ref(null)
const editingTitle = ref('')

// 确认对话框
const { showDialog, dialogTitle, dialogMessage, dialogType, confirm, handleConfirm, handleCancel } = useConfirmDialog()

const selectTab = (id) => {
  store.setActiveSession(id)
}

const closeTab = async (id, event) => {
  event.stopPropagation()

  // 如果只有一个标签,不显示确认
  if (store.sessions.length === 1) {
    return
  }

  // 显示确认对话框
  const confirmed = await confirm(
    '关闭终端标签',
    '确定要关闭这个终端标签吗？所有未保存的内容将会丢失。',
    'warning'
  )

  if (confirmed) {
    store.closeSession(id)
  }
}

const newTab = () => {
  emit('new-tab')
}

const startEdit = (session, event) => {
  event.stopPropagation()
  editingTab.value = session.id
  editingTitle.value = session.title
  
  // 使用 nextTick 确保输入框已渲染
  setTimeout(() => {
    const input = document.getElementById(`edit-input-${session.id}`)
    if (input) {
      input.focus()
      input.select()
    }
  }, 10)
}

const saveEdit = (id) => {
  if (editingTitle.value.trim()) {
    store.updateSessionTitle(id, editingTitle.value.trim())
  }
  editingTab.value = null
  editingTitle.value = ''
}

const cancelEdit = () => {
  editingTab.value = null
  editingTitle.value = ''
}

const handleKeydown = (event, id) => {
  if (event.key === 'Enter') {
    saveEdit(id)
  } else if (event.key === 'Escape') {
    cancelEdit()
  }
}
</script>

<template>
  <div class="tabs-container">
    <div class="tabs">
      <div
        v-for="session in store.sessions"
        :key="session.id"
        :class="['tab', { active: session.id === store.activeSessionId }]"
        @click="selectTab(session.id)"
      >
        <span 
          v-if="editingTab !== session.id"
          class="tab-title"
          @dblclick="startEdit(session, $event)"
          :title="'双击重命名：' + session.title"
        >
          {{ session.title }}
        </span>
        <input
          v-else
          :id="`edit-input-${session.id}`"
          v-model="editingTitle"
          class="tab-title-input"
          @blur="saveEdit(session.id)"
          @keydown="handleKeydown($event, session.id)"
          @click.stop
        />
        <button class="close-btn" @click="closeTab(session.id, $event)">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <button class="new-tab-btn" @click="newTab">+</button>
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 16px 0;
  -webkit-app-region: drag;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  transition: all 0.3s ease;
}

.tabs {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-hover);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  -webkit-app-region: no-drag;
  min-width: 140px;
  max-width: 220px;
  border: 1px solid var(--border-color);
  border-bottom: none;
  position: relative;
}

.tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.tab:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 
    0 -2px 10px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--accent-color);
  border-color: var(--accent-color);
}

.tab.active::before {
  opacity: 1;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.tab-title-input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  padding: 2px 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  min-width: 80px;
}

.tab-title-input:focus {
  background: var(--bg-hover);
  border-color: var(--accent-hover);
  box-shadow: 0 0 0 2px var(--accent-color);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  opacity: 0;
}

.tab:hover .close-btn {
  opacity: 1;
}

.close-btn:hover {
  background: var(--error-color);
  color: white;
  transform: scale(1.1);
}

.new-tab-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
  margin-bottom: 2px;
  border: 1px solid var(--border-color);
}

.new-tab-btn:hover {
  background: var(--accent-color);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}
</style>

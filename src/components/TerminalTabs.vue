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
const { showDialog, dialogTitle, dialogMessage, dialogType, confirm, handleConfirm, handleCancel } =
  useConfirmDialog()

const selectTab = id => {
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

const saveEdit = id => {
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
          :title="'双击重命名：' + session.title"
          @dblclick="startEdit(session, $event)"
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
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
      <button class="new-tab-btn" @click="newTab">+</button>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :show="showDialog"
      :title="dialogTitle"
      :message="dialogMessage"
      :type="dialogType"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.tabs-container {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 12px 0;
  -webkit-app-region: drag;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

.tabs {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-hover);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  -webkit-app-region: no-drag;
  min-width: 100px;
  max-width: 180px;
  border: 1px solid var(--border-color);
  border-bottom: none;
}

.tab:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}

.tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--accent-color);
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
  font-size: 12px;
  outline: none;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  padding: 0;
  font-size: 12px;
}

.tab:hover .close-btn {
  opacity: 1;
  background: rgba(255, 59, 48, 0.2);
  color: #ff3b30;
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.3);
}

.new-tab-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
  margin-bottom: 1px;
  border: 1px solid var(--border-color);
}

.new-tab-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}
</style>

<script setup>
import { ref, computed } from 'vue'
import { useSSHStore } from '../stores/ssh'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import ConfirmDialog from './ConfirmDialog.vue'

const emit = defineEmits(['connect', 'close'])

const sshStore = useSSHStore()
const showNewConnectionForm = ref(false)
const editingConnectionId = ref(null)

// 表单数据
const formData = ref({
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  keyPath: '',
  password: '' // 添加密码字段
})

// 确认对话框
const { showDialog, dialogTitle, dialogMessage, dialogType, confirm, handleConfirm, handleCancel } =
  useConfirmDialog()

// 排序后的连接列表（最近连接的在前）
const sortedConnections = computed(() => {
  return [...sshStore.connections].sort((a, b) => {
    if (!a.lastConnected) return 1
    if (!b.lastConnected) return -1
    return b.lastConnected - a.lastConnected
  })
})

// 打开新建连接表单
const openNewConnectionForm = () => {
  resetForm()
  showNewConnectionForm.value = true
  editingConnectionId.value = null
}

// 编辑连接
const editConnection = connection => {
  formData.value = { ...connection }
  showNewConnectionForm.value = true
  editingConnectionId.value = connection.id
}

// 保存连接（改为保存后直接连接）
const saveConnection = () => {
  if (!formData.value.host || !formData.value.username) {
    alert('请填写主机地址和用户名')
    return
  }

  // 如果是密码认证，需要检查密码
  if (formData.value.authType === 'password' && !formData.value.password) {
    alert('请输入密码')
    return
  }

  if (editingConnectionId.value) {
    // 更新现有连接
    sshStore.updateConnection(editingConnectionId.value, formData.value)
    // 更新后直接连接
    const connection = sshStore.getConnection(editingConnectionId.value)
    connectToSSH(connection)
  } else {
    // 创建新连接
    const connectionId = sshStore.createConnection(formData.value)
    // 创建后直接连接
    const connection = sshStore.getConnection(connectionId)
    connectToSSH(connection)
  }

  closeForm()
}

// 删除连接
const deleteConnection = async id => {
  const connection = sshStore.getConnection(id)
  const confirmed = await confirm(
    '删除 SSH 连接',
    `确定要删除连接 "${connection.name}" 吗？`,
    'warning'
  )

  if (confirmed) {
    sshStore.deleteConnection(id)
  }
}

// 连接到 SSH
const connectToSSH = connection => {
  sshStore.updateLastConnected(connection.id)
  emit('connect', connection)
}

// 重置表单
const resetForm = () => {
  formData.value = {
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    keyPath: '',
    password: '' // 重置密码字段
  }
}

// 关闭表单
const closeForm = () => {
  showNewConnectionForm.value = false
  editingConnectionId.value = null
  resetForm()
}

// 格式化时间
const formatTime = timestamp => {
  if (!timestamp) return '从未连接'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString()
}
</script>

<template>
  <div class="ssh-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2" />
        </svg>
        <h2>SSH 连接</h2>
      </div>
      <button class="close-panel-btn" @click="$emit('close')">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path
            d="M2 2L14 14M14 2L2 14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- 连接列表 -->
    <div class="connections-list">
      <div v-if="sortedConnections.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
          <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <p>还没有 SSH 连接</p>
        <p class="empty-hint">点击下方按钮添加第一个连接</p>
      </div>

      <div v-for="connection in sortedConnections" :key="connection.id" class="connection-card">
        <div class="card-header">
          <div class="card-info">
            <h3 class="card-title">{{ connection.name }}</h3>
            <p class="card-subtitle">{{ connection.username }}@{{ connection.host }}:{{ connection.port }}</p>
          </div>
          <div class="card-badge">
            <span class="badge-icon">🔑</span>
            <span class="badge-text">{{ connection.authType === 'password' ? '密码' : '密钥' }}</span>
          </div>
        </div>

        <div class="card-meta">
          <span class="meta-time">{{ formatTime(connection.lastConnected) }}</span>
        </div>

        <div class="card-actions">
          <button class="action-btn primary" @click="connectToSSH(connection)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
              <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
            </svg>
            连接
          </button>
          <button class="action-btn" @click="editConnection(connection)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            编辑
          </button>
          <button class="action-btn danger" @click="deleteConnection(connection.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 新建连接按钮 -->
    <div class="panel-footer">
      <button class="new-connection-btn" @click="openNewConnectionForm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        新建 SSH 连接
      </button>
    </div>

    <!-- 新建/编辑连接表单 -->
    <Teleport to="body">
      <div v-if="showNewConnectionForm" class="modal-overlay" @click.self="closeForm">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingConnectionId ? '编辑' : '新建' }} SSH 连接</h2>
            <button class="modal-close-btn" @click="closeForm">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  d="M2 2L14 14M14 2L2 14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>连接名称</label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="例如：生产服务器"
                class="form-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>主机地址 *</label>
                <input
                  v-model="formData.host"
                  type="text"
                  placeholder="例如：192.168.1.100"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group form-group-small">
                <label>端口</label>
                <input v-model.number="formData.port" type="number" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label>用户名 *</label>
              <input
                v-model="formData.username"
                type="text"
                placeholder="例如：root"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label>认证方式</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input v-model="formData.authType" type="radio" value="password" />
                  <span>密码认证</span>
                </label>
                <label class="radio-label">
                  <input v-model="formData.authType" type="radio" value="key" />
                  <span>密钥认证</span>
                </label>
              </div>
            </div>

            <div v-if="formData.authType === 'password'" class="form-group">
              <label>密码 *</label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="请输入 SSH 密码"
                class="form-input"
                required
              />
            </div>

            <div v-if="formData.authType === 'key'" class="form-group">
              <label>密钥路径</label>
              <input
                v-model="formData.keyPath"
                type="text"
                placeholder="例如：~/.ssh/id_rsa"
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeForm">取消</button>
            <button class="btn btn-primary" @click="saveConnection">
              {{ editingConnectionId ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
.ssh-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  width: 320px;
  border-left: 1px solid var(--border-color);
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-title svg {
  color: var(--accent-color);
}

.close-panel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-panel-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 连接列表 */
.connections-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  text-align: center;
  padding: 32px;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 4px 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

/* 连接卡片 */
.connection-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.connection-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.card-info {
  flex: 1;
}

.card-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'SF Mono', monospace;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--bg-hover);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.badge-icon {
  font-size: 10px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.meta-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 卡片操作 */
.card-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  border-color: var(--border-hover);
}

.action-btn.primary {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.action-btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border-color: #ff3b30;
}

/* 面板底部 */
.panel-footer {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.new-connection-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-connection-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.25);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group-small {
  width: 100px;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
}

.radio-label input[type='radio'] {
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.25);
}
</style>

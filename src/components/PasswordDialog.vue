<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '输入密码'
  },
  message: {
    type: String,
    default: '请输入 SSH 连接密码'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const password = ref('')
const showPassword = ref(false)

// 当对话框显示时，清空密码
watch(() => props.show, (newVal) => {
  if (newVal) {
    password.value = ''
    showPassword.value = false
  }
})

const handleConfirm = () => {
  if (password.value) {
    emit('confirm', password.value)
    password.value = ''
  }
}

const handleCancel = () => {
  emit('cancel')
  password.value = ''
}

const handleKeydown = (e) => {
  if (e.key === 'Enter') {
    handleConfirm()
  } else if (e.key === 'Escape') {
    handleCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="password-overlay" @click.self="handleCancel">
        <div class="password-dialog">
          <div class="dialog-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="handleCancel">
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

          <div class="dialog-body">
            <p class="dialog-message">{{ message }}</p>
            <div class="password-input-wrapper">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="password-input"
                placeholder="请输入密码"
                autofocus
                @keydown="handleKeydown"
              />
              <button class="toggle-password-btn" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" />
                </svg>
              </button>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-cancel" @click="handleCancel">取消</button>
            <button class="btn btn-confirm" @click="handleConfirm" :disabled="!password">
              确认
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.password-overlay {
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
  z-index: 2000;
}

.password-dialog {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 12px 12px 0 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
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

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dialog-body {
  padding: 20px;
}

.dialog-message {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'SF Mono', monospace;
  transition: all 0.2s ease;
}

.password-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.toggle-password-btn {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.toggle-password-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 0 0 12px 12px;
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

.btn-cancel {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.25);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .password-dialog,
.fade-leave-active .password-dialog {
  transition: transform 0.3s ease;
}

.fade-enter-from .password-dialog {
  transform: translateY(-20px);
}

.fade-leave-to .password-dialog {
  transform: translateY(-20px);
}
</style>

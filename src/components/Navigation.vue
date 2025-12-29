<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['open-settings', 'toggle-ssh'])

const handleSettingsClick = () => {
  emit('open-settings')
}

const handleSSHClick = () => {
  emit('toggle-ssh')
}
</script>

<template>
  <nav class="mac-navbar">
    <!-- 左侧：标题 -->
    <div class="navbar-title">
      <span class="title-icon">⌘</span>
      <span class="title-text">Huaan Terminal</span>
    </div>

    <!-- 中间：状态 -->
    <div class="navbar-center">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span class="status-text">就绪</span>
      </div>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="navbar-actions">
      <button class="mac-btn" title="SSH 连接" @click="handleSSHClick">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
      <button class="mac-btn" title="设置" @click="handleSettingsClick">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <path d="M8 2v1M8 13v1M14 8h-1M3 8h-1" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.mac-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

/* 标题区域 */
.navbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.title-icon {
  font-size: 20px;
  line-height: 1;
  opacity: 0.8;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

/* 中间状态区域 */
.navbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  -webkit-app-region: no-drag;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.3);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 6px rgba(52, 199, 89, 0.6);
}

.status-text {
  font-weight: 500;
}

/* 右侧操作按钮 */
.navbar-actions {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.mac-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  line-height: 1;
}

.mac-btn svg {
  width: 16px;
  height: 16px;
}

.mac-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--border-hover);
}

.mac-btn.active {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.25);
}

.mac-btn.active:hover {
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.35);
}
</style>

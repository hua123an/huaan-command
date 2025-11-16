<script setup>
import { defineEmits } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const emit = defineEmits(['open-settings'])
const router = useRouter()
const route = useRoute()

const handleSettingsClick = () => {
  emit('open-settings')
}

const navigateToGit = () => {
  router.push({ name: 'GitVisualization' })
}

const isGitPage = () => {
  return route.name === 'GitVisualization'
}
</script>

<template>
  <div class="navigation">
    <!-- 左侧品牌区 -->
    <div class="nav-left">
      <div class="app-brand">
        <span class="brand-icon">⌘</span>
        <span class="brand-text">Huaan Terminal</span>
      </div>
    </div>

    <!-- 中间区域 -->
    <div class="nav-center">
      <div class="status-indicator">
        <span class="status-dot"></span>
        <span class="status-text">就绪</span>
      </div>
    </div>

    <!-- 右侧按钮组 -->
    <div class="nav-right">
      <!-- Git 按钮 -->
      <button class="nav-btn git-btn" :class="{ active: isGitPage() }" title="Git 可视化" @click="navigateToGit">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1C4.58 1 1 4.58 1 9s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"
            fill="currentColor" />
          <path d="M9 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" />
        </svg>
        <span class="btn-label">Git</span>
      </button>

      <!-- 设置按钮 -->
      <button class="nav-btn settings-btn" title="设置" @click="handleSettingsClick">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 11.5C10.3807 11.5 11.5 10.3807 11.5 9C11.5 7.61929 10.3807 6.5 9 6.5C7.61929 6.5 6.5 7.61929 6.5 9C6.5 10.3807 7.61929 11.5 9 11.5Z"
            stroke="currentColor" stroke-width="1.5" />
          <path
            d="M14.5 9C14.5 9.3 14.48 9.59 14.44 9.88L16.39 11.38C16.57 11.52 16.62 11.76 16.51 11.96L14.61 15.04C14.5 15.24 14.26 15.31 14.06 15.24L11.76 14.35C11.29 14.71 10.78 15.01 10.22 15.23L9.89 17.64C9.86 17.86 9.66 18 9.44 18H5.56C5.34 18 5.14 17.86 5.11 17.64L4.78 15.23C4.22 15.01 3.71 14.71 3.24 14.35L0.94 15.24C0.74 15.31 0.5 15.24 0.39 15.04L-1.51 11.96C-1.62 11.76 -1.57 11.52 -1.39 11.38L0.56 9.88C0.52 9.59 0.5 9.3 0.5 9C0.5 8.7 0.52 8.41 0.56 8.12L-1.39 6.62C-1.57 6.48 -1.62 6.24 -1.51 6.04L0.39 2.96C0.5 2.76 0.74 2.69 0.94 2.76L3.24 3.65C3.71 3.29 4.22 2.99 4.78 2.77L5.11 0.36C5.14 0.14 5.34 0 5.56 0H9.44C9.66 0 9.86 0.14 9.89 0.36L10.22 2.77C10.78 2.99 11.29 3.29 11.76 3.65L14.06 2.76C14.26 2.69 14.5 2.76 14.61 2.96L16.51 6.04C16.62 6.24 16.57 6.48 16.39 6.62L14.44 8.12C14.48 8.41 14.5 8.7 14.5 9Z"
            stroke="currentColor" stroke-width="1.5" />
        </svg>
        <span class="btn-label">设置</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  transition: all 0.3s ease;
  min-height: 60px;
}

.nav-left,
.nav-center,
.nav-right {
  display: flex;
  gap: 12px;
  -webkit-app-region: no-drag;
  align-items: center;
}

.nav-center {
  flex: 1;
  justify-content: center;
}

/* 品牌区域 */
.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.brand-icon {
  font-size: 22px;
  line-height: 1;
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  border: 1px solid var(--border-color);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 8px rgba(52, 199, 89, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* 导航按钮 */
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
}

.nav-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--border-hover);
}

.nav-btn.active {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  color: white;
  box-shadow:
    0 4px 16px rgba(10, 132, 255, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.25);
}

.nav-btn.active:hover {
  background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-color) 100%);
  box-shadow:
    0 6px 20px rgba(10, 132, 255, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.nav-btn svg {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn:hover svg {
  transform: scale(1.05);
}

.nav-btn.git-btn:hover svg {
  transform: rotate(-15deg) scale(1.05);
}

.btn-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* 设置按钮 */
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
}

.settings-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  transform: translateY(-1px) rotate(90deg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: var(--border-hover);
}

.settings-btn.active {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  color: white;
  box-shadow:
    0 4px 16px rgba(10, 132, 255, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.25);
}

.settings-btn.active:hover {
  background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-color) 100%);
  box-shadow:
    0 6px 20px rgba(10, 132, 255, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.settings-btn svg {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>

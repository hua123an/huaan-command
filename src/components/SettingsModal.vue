<script setup>
import { ref, computed } from 'vue'
import { useTheme } from '../composables/useTheme'

defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const { currentTheme, setTheme } = useTheme()

// 可用主题
const availableThemes = [
  { key: 'system', name: '跟随系统', description: '自动跟随系统主题' },
  { key: 'dark', name: '深色模式', description: '适合夜间使用' },
  { key: 'light', name: '浅色模式', description: '适合白天使用' },
  { key: 'ocean', name: '海洋蓝', description: '清新的海洋主题' },
  { key: 'forest', name: '森林绿', description: '护眼的绿色主题' },
  { key: 'sunset', name: '夕阳橙', description: '温暖的橙色主题' }
]

// 方法
const selectTheme = (themeKey) => {
  setTheme(themeKey)
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 -->
      <div class="modal-header">
        <h2 class="modal-title">设置</h2>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- 主题设置 -->
      <div class="modal-body">
        <div class="section">
          <h3 class="section-title">主题选择</h3>
          <div class="theme-grid">
            <div
              v-for="theme in availableThemes"
              :key="theme.key"
              class="theme-card"
              :class="{ active: currentTheme === theme.key }"
              @click="selectTheme(theme.key)"
            >
              <div class="theme-preview" :data-theme="theme.key">
                <div class="preview-bar"></div>
                <div class="preview-content">
                  <div class="preview-line"></div>
                  <div class="preview-line short"></div>
                </div>
              </div>
              <div class="theme-info">
                <h4 class="theme-name">{{ theme.name }}</h4>
                <p class="theme-desc">{{ theme.description }}</p>
              </div>
              <div v-if="currentTheme === theme.key" class="theme-badge">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.5 4L6 11.5L2.5 8"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}

/* 主体 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.theme-card {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-card:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-card.active {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.theme-preview {
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
}

.theme-preview[data-theme='dark'] {
  background: #1e1e1e;
}

.theme-preview[data-theme='light'] {
  background: #ffffff;
}

.theme-preview[data-theme='ocean'] {
  background: #1a2332;
}

.theme-preview[data-theme='forest'] {
  background: #1a2820;
}

.theme-preview[data-theme='sunset'] {
  background: #2a1e1a;
}

.theme-preview[data-theme='system'] {
  background: linear-gradient(135deg, #1e1e1e 50%, #ffffff 50%);
}

.preview-bar {
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-content {
  padding: 12px;
}

.preview-line {
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  margin-bottom: 8px;
}

.preview-line.short {
  width: 60%;
}

.theme-info {
  margin-bottom: 8px;
}

.theme-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.theme-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.theme-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: var(--accent-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* 滚动条 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>

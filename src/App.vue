<script setup>
import { ref, onMounted, onErrorCaptured, provide } from 'vue'
import Navigation from './components/Navigation.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useTheme } from './composables/useTheme'

const { initTheme } = useTheme()

// 设置弹窗状态
const showSettings = ref(false)
const showSSHPanel = ref(false)

const handleOpenSettings = () => {
  showSettings.value = true
}

const handleCloseSettings = () => {
  showSettings.value = false
}

const handleToggleSSH = () => {
  showSSHPanel.value = !showSSHPanel.value
}

// 通过 provide 将 SSH 面板状态传递给子组件
provide('showSSHPanel', showSSHPanel)
provide('toggleSSHPanel', handleToggleSSH)

onMounted(() => {
  // 初始化主题
  initTheme()
  console.log('Huaan Terminal 启动成功')
})

// 全局错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('组件错误:', err, info)
  return false // 阻止错误继续传播
})
</script>

<template>
  <div class="app-layout">
    <Navigation @open-settings="handleOpenSettings" @toggle-ssh="handleToggleSSH" />
    <div class="app-content">
      <router-view v-slot="{ Component }">
        <!-- 为 Terminal 组件启用 keep-alive 以保持终端状态，避免导航时重新初始化 -->
        <keep-alive include="Terminal">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <!-- 设置弹窗 -->
    <SettingsModal :show="showSettings" @close="handleCloseSettings" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* 主题切换平滑过渡 */
:root.theme-transitioning,
:root.theme-transitioning * {
  transition:
    background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

/* macOS 风格滚动条 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

:root.dark::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

:root.dark::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* 性能优化：使用 GPU 加速 */
.app-layout,
.app-content {
  transform: translateZ(0);
  will-change: transform;
}
</style>

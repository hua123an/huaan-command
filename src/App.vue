<script setup>
import { ref, onMounted, onErrorCaptured } from 'vue'
import Navigation from './components/Navigation.vue'
import DebugPanel from './components/DebugPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useTheme } from './composables/useTheme'
import { useLogsStore } from './stores/logs'

const { initTheme } = useTheme()
const logsStore = useLogsStore()

// 设置弹窗状态
const showSettings = ref(false)

const handleOpenSettings = () => {
  showSettings.value = true
}

const handleCloseSettings = () => {
  showSettings.value = false
}

onMounted(() => {
  // 初始化主题
  initTheme()

  // 启动日志
  logsStore.success('Huaan Terminal 启动成功')
  logsStore.info('按 Ctrl+Shift+L 打开日志面板')

  // 性能监控
  if (import.meta.env.DEV && window.performance) {
    const perfData = window.performance.getEntriesByType('navigation')[0]
    if (perfData) {
      logsStore.info(`应用加载耗时: ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`)
    }
  }
})// 全局错误捕获
onErrorCaptured((err, instance, info) => {
  logsStore.error(`组件错误: ${err.message}`, { info })
  return false // 阻止错误继续传播
})
</script>

<template>
  <div class="app-layout">
    <Navigation @open-settings="handleOpenSettings" />
    <div class="app-content">
      <router-view v-slot="{ Component }">
        <!-- 移除 keep-alive 以减少内存占用，终端会话由 store 管理 -->
        <component :is="Component" />
      </router-view>
    </div>

    <!-- 调试面板 -->
    <DebugPanel />

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
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
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
}

/* 优化滚动条 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}

::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 5px;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 性能优化：使用 GPU 加速 */
.app-layout,
.app-content {
  transform: translateZ(0);
  will-change: transform;
}
</style>

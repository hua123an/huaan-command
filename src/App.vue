<script setup>
import { onMounted } from 'vue'
import Navigation from './components/Navigation.vue'
import DebugPanel from './components/DebugPanel.vue'
import { useTheme } from './composables/useTheme'
import { useLogsStore } from './stores/logs'

const { initTheme } = useTheme()
const logsStore = useLogsStore()

onMounted(() => {
  initTheme()
  logsStore.success('应用启动成功')
  logsStore.info(`日志系统已就绪 - 按 Ctrl+Shift+L 打开日志面板`)
})
</script>

<template>
  <div class="app-layout">
    <Navigation />
    <div class="app-content">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
    
    <!-- 日志面板 -->
    <DebugPanel />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
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
}

.app-content {
  flex: 1;
  overflow: hidden;
}
</style>

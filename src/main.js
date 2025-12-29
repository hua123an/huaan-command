import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useTerminalStore } from './stores/terminal'

// 性能优化：延迟加载非关键资源
const app = createApp(App)
const pinia = createPinia()

// 立即挂载核心功能
app.use(pinia)
app.use(router)

// 性能监控（仅开发环境）
if (import.meta.env.DEV) {
  app.config.performance = true
}

// 错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err, info)
}

app.mount('#app')

// 暴露调试函数到 window（开发模式）
if (import.meta.env.DEV) {
  window.__resetTerminal = () => {
    const terminalStore = useTerminalStore()
    terminalStore.resetTerminalState()
    console.log('✅ 终端状态已重置，请刷新页面')
  }
}

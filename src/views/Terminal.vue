<script setup>
import { ref, onMounted, onActivated, inject } from 'vue'
import { useTerminalStore } from '../stores/terminal'
import TerminalTabs from '../components/TerminalTabs.vue'
import TerminalPane from '../components/TerminalPane.vue'
import SSHPanel from '../components/SSHPanel.vue'

const store = useTerminalStore()
const currentTerminalRef = ref(null)
const isFirstMount = ref(true)

// 从父组件注入 SSH 面板状态
const showSSHPanel = inject('showSSHPanel')
const toggleSSHPanel = inject('toggleSSHPanel')

onMounted(() => {
  // 只在首次挂载时初始化
  if (isFirstMount.value) {
    isFirstMount.value = false
    // 尝试恢复保存的会话
    const restored = store.loadSessions()

    // 如果没有恢复任何会话，创建一个新的
    if (!restored && store.sessions.length === 0) {
      store.createSession()
    }
  }
})

// 从 keep-alive 恢复时不重新初始化，只确保有活动会话
onActivated(() => {
  // 确保有活动会话，但不重新初始化
  if (store.sessions.length > 0 && !store.activeSessionId) {
    store.setActiveSession(store.sessions[0].id)
  }
})

const handleNewTab = () => {
  store.createSession()
}

const handleSSHConnect = async connection => {
  console.log('Connecting to SSH:', connection)

  // 直接使用保存的密码或密钥连接
  await connectSSH(connection, connection.password || null)
}

const connectSSH = async (connection, password) => {
  // 创建新的终端标签页
  const sessionId = store.createSession(`SSH: ${connection.name}`)

  try {
    // 调用 Tauri 后端启动 SSH 连接
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('start_ssh_terminal', {
      sessionId,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: password
    })

    console.log('SSH connection started successfully')
    toggleSSHPanel()
  } catch (error) {
    console.error('Failed to start SSH connection:', error)
    alert(`SSH 连接失败: ${error}`)
    // 如果连接失败，关闭创建的标签页
    store.closeSession(sessionId)
  }
}
</script>

<template>
  <div class="terminal-container">
    <TerminalTabs @new-tab="handleNewTab" />

    <div class="terminal-main">
      <!-- 终端内容 -->
      <div class="terminal-content">
        <TerminalPane
          v-for="session in store.sessions"
          :key="session.id"
          ref="currentTerminalRef"
          :session="session"
          :visible="session.id === store.activeSessionId"
        />
      </div>

      <!-- SSH 侧边栏（右侧） -->
      <Transition name="slide">
        <SSHPanel
          v-if="showSSHPanel"
          @connect="handleSSHConnect"
          @close="toggleSSHPanel"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.terminal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.terminal-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.terminal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* SSH 面板从右侧滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

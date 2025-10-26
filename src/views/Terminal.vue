<script setup>
import { ref, onMounted } from 'vue'
import { useTerminalStore } from '../stores/terminal'
import { useShortcuts } from '../composables/useShortcuts'
import TerminalTabs from '../components/TerminalTabs.vue'
import BlockTerminalPane from '../components/BlockTerminalPane.vue'
import SnippetsPanel from '../components/SnippetsPanel.vue'

const store = useTerminalStore()
const showSnippets = ref(false)
const currentTerminalRef = ref(null)

onMounted(() => {
  // 尝试恢复保存的会话
  const restored = store.loadSessions()
  
  // 如果没有恢复任何会话，创建一个新的
  if (!restored && store.sessions.length === 0) {
    store.createSession()
  }
})

const handleNewTab = () => {
  store.createSession()
}

// 设置快捷键
useShortcuts({
  onNewTab: () => {
    store.createSession()
  },
  onCloseTab: () => {
    if (store.activeSessionId) {
      store.closeSession(store.activeSessionId)
    }
  },
  onSwitchTab: (index) => {
    if (store.sessions[index]) {
      store.setActiveSession(store.sessions[index].id)
    }
  },
  onClear: () => {
    // 清空当前终端
    const activeSession = store.sessions.find(s => s.id === store.activeSessionId)
    if (activeSession) {
      store.updateSessionBuffer(activeSession.id, [])
    }
  },
  onToggleAI: () => {
    // 切换 AI 模式
    // 已在 TerminalPane 中通过 Warp 模式栏实现
  }
})

const useSnippet = (command) => {
  // 将命令发送到当前活动的终端
  const activeSession = store.sessions.find(s => s.id === store.activeSessionId)
  if (activeSession && currentTerminalRef.value && currentTerminalRef.value.length > 0) {
    const terminal = currentTerminalRef.value.find(t => t?.session?.id === activeSession.id)
    if (terminal?.executeCommand) {
      terminal.executeCommand(command)
    }
  }
  showSnippets.value = false
}
</script>

<template>
  <div class="terminal-container">
    <TerminalTabs @new-tab="handleNewTab" />
    
    <div class="terminal-content">
      <!-- Block 模式（默认且唯一模式） -->
      <BlockTerminalPane
        v-for="session in store.sessions"
        :key="session.id"
        :session="session"
        :visible="session.id === store.activeSessionId"
        ref="currentTerminalRef"
      />
    </div>
    
    <!-- 代码片段面板 -->
    <SnippetsPanel 
      v-if="showSnippets"
      @use-snippet="useSnippet"
      @close="showSnippets = false"
    />
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

.terminal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>

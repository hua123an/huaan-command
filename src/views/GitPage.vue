<script setup>
import { ref, onMounted } from 'vue'
import GitDashboard from '@/components/GitDashboard.vue'

const currentDir = ref('/Users/huaan/huaan-command-dev')
const sessionId = ref('git-session')

onMounted(() => {
  // 如果需要，可以在这里动态获取项目路径
  // 但通常项目路径应该是固定的
})
</script>

<template>
  <div class="git-page">
    <GitDashboard :current-dir="currentDir" :session-id="sessionId" />
  </div>
</template>

<style scoped>
.git-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--terminal-bg, #1c1c1e);
  color: var(--terminal-fg, #e4e4e7);
}
</style>

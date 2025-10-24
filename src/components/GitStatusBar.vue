<script setup>
import { computed } from 'vue'
import { useGitStore } from '../stores/git'

const gitStore = useGitStore()

const statusText = computed(() => {
  const { branch, ahead, behind, modified, staged, untracked } = gitStore.gitStatus
  if (!branch) return null
  
  let text = `🌿 ${branch}`
  if (ahead > 0) text += ` ↑${ahead}`
  if (behind > 0) text += ` ↓${behind}`
  
  const changes = []
  if (staged > 0) changes.push(`+${staged}`)
  if (modified > 0) changes.push(`~${modified}`)
  if (untracked > 0) changes.push(`?${untracked}`)
  
  if (changes.length > 0) {
    text += ` (${changes.join(' ')})`
  }
  
  return text
})

const statusColor = computed(() => {
  if (gitStore.gitStatus.hasChanges) return '#ffd60a' // 黄色 - 有变更
  if (gitStore.gitStatus.ahead > 0) return '#0a84ff' // 蓝色 - 需要推送
  if (gitStore.gitStatus.behind > 0) return '#ff453a' // 红色 - 需要拉取
  return '#32d74b' // 绿色 - 干净
})
</script>

<template>
  <div v-if="gitStore.isGitRepo && statusText" class="git-status-bar">
    <div class="status-indicator" :style="{ background: statusColor }"></div>
    <span class="status-text">{{ statusText }}</span>
  </div>
</template>

<style scoped>
.git-status-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-primary);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-family: 'SF Mono', monospace;
  white-space: nowrap;
}
</style>


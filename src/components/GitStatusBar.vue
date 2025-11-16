<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useGit } from '../composables/useGit'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
  currentDir: {
    type: String,
    default: '~'
  }
})

const emit = defineEmits(['execute-command', 'open-git-panel'])

const currentDir = computed(() => props.currentDir)
const git = useGit(currentDir)

// 运行环境版本
const nodeVersion = ref('')

// 显示的目录（缩短）
const displayDir = computed(() => {
  const dir = props.currentDir.replace(/^\/Users\/[^/]+/, '~')
  if (dir.length > 20) {
    const parts = dir.split('/')
    if (parts.length > 2) {
      return '~/' + parts.slice(-1).join('/')
    }
  }
  return dir
})

// Git 变更统计
const gitStats = computed(() => {
  if (!git.statusSummary.value || git.statusSummary.value.total === 0) {
    return null
  }

  return {
    files: git.statusSummary.value.total,
    staged: git.statusSummary.value.staged,
    unstaged: git.statusSummary.value.unstaged,
    untracked: git.statusSummary.value.untracked
  }
})

// 检测 Node 版本
const detectNodeVersion = async () => {
  try {
    const result = await invoke('execute_command', {
      command: 'node --version',
      working_dir: props.currentDir
    })
    if (result && !result.includes('not found')) {
      nodeVersion.value = result.trim()
    }
  } catch {
    nodeVersion.value = ''
  }
}

// 执行命令
const executeCommand = cmd => {
  emit('execute-command', cmd)
}

// 刷新状态
const refreshStatus = () => {
  detectNodeVersion()
  git.fetchStatus()
}

watch(() => props.currentDir, refreshStatus, { immediate: true })

onMounted(() => {
  refreshStatus()
  setInterval(refreshStatus, 30000)
})
</script>

<template>
  <div class="git-status-bar">
    <!-- 左侧：功能按钮 -->
    <div class="left-section">
      <button class="icon-btn" title="附件">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 3H13V13H3V3Z" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>

      <button class="icon-btn" title="@提及">
        <span>@</span>
      </button>

      <button class="icon-btn" title="代码">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M5 4L2 8L5 12M11 4L14 8L11 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>

      <button class="icon-btn" title="表情">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5" />
          <circle cx="6" cy="7" r="0.8" fill="currentColor" />
          <circle cx="10" cy="7" r="0.8" fill="currentColor" />
          <path d="M5 10C5 10 6.5 11 8 11C9.5 11 11 10 11 10" stroke="currentColor" stroke-width="1"
            stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- 中间：命令建议 -->
    <div class="center-section">
      <button v-if="gitStats" class="cmd-suggestion" @click="executeCommand('scl --add')">
        <span>scl --add</span>
        <span class="arrow">→</span>
      </button>
    </div>

    <!-- 右侧：状态信息 -->
    <div class="right-section">
      <!-- Node 版本 -->
      <div v-if="nodeVersion" class="status-badge version">
        <span class="icon">⬢</span>
        <span>{{ nodeVersion }}</span>
      </div>

      <!-- 目录 -->
      <div class="status-badge dir">
        <span class="icon">📁</span>
        <span>{{ displayDir }}</span>
      </div>

      <!-- Git 分支 -->
      <div v-if="gitStore.gitStatus.branch" class="status-badge branch">
        <span class="icon">⎇</span>
        <span>{{ gitStore.gitStatus.branch }}</span>
      </div>

      <!-- 变更统计 -->
      <div v-if="gitStats" class="status-badge changes">
        <span class="count">{{ gitStats.files }}</span>
        <span class="add">+{{ gitStats.additions }}</span>
        <span class="del">-{{ gitStats.deletions }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.git-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  gap: 12px;
  flex-shrink: 0;
  color: var(--text-primary);
}

.left-section,
.center-section,
.right-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.left-section {
  flex: 0 0 auto;
}

.center-section {
  flex: 1;
  justify-content: center;
}

.right-section {
  flex: 0 0 auto;
}

/* 图标按钮 */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn:active {
  background: rgba(var(--accent-rgb, 10, 132, 255), 0.15);
}

/* 命令建议按钮 */
.cmd-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.cmd-suggestion:hover {
  border-color: var(--accent-color);
  background: var(--bg-hover);
  color: var(--accent-color);
}

.cmd-suggestion .arrow {
  opacity: 0.6;
  font-size: 12px;
}

/* 状态徽章 */
.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  white-space: nowrap;
}

.status-badge .icon {
  font-size: 12px;
  opacity: 0.7;
}

/* 版本徽章 */
.status-badge.version {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color, #22c55e);
}

/* 目录徽章 */
.status-badge.dir {
  background: rgba(10, 132, 255, 0.1);
  color: var(--accent-color);
}

/* 分支徽章 */
.status-badge.branch {
  background: rgba(251, 146, 60, 0.1);
  color: var(--warning-color, #fb923c);
}

/* 变更徽章 */
.status-badge.changes {
  background: var(--bg-secondary);
  gap: 6px;
}

.status-badge.changes .count {
  color: var(--text-secondary);
}

.status-badge.changes .add {
  color: var(--success-color, #22c55e);
}

.status-badge.changes .del {
  color: var(--error-color, #ef4444);
}
</style>

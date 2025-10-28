<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useGitStore } from '../stores/git'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
  currentDir: {
    type: String,
    default: '~'
  }
})

const emit = defineEmits(['execute-command'])

const gitStore = useGitStore()

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
  const { modified, staged, untracked, additions, deletions } = gitStore.gitStatus
  const files = modified + staged + untracked

  if (files === 0) return null

  return {
    files,
    additions: additions || 0,
    deletions: deletions || 0
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
  } catch (_e) {
    nodeVersion.value = ''
  }
}

// 执行命令
const executeCommand = (cmd) => {
  emit('execute-command', cmd)
}

// 刷新状态
const refreshStatus = () => {
  detectNodeVersion()
  gitStore.refreshStatus(props.currentDir)
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
          <path d="M3 3H13V13H3V3Z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>

      <button class="icon-btn" title="@提及">
        <span>@</span>
      </button>

      <button class="icon-btn" title="代码">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M5 4L2 8L5 12M11 4L14 8L11 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>

      <button class="icon-btn" title="表情">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="6" cy="7" r="0.8" fill="currentColor"/>
          <circle cx="10" cy="7" r="0.8" fill="currentColor"/>
          <path d="M5 10C5 10 6.5 11 8 11C9.5 11 11 10 11 10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
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
  background: #f7f7f7;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  gap: 12px;
  flex-shrink: 0;
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
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.icon-btn:hover {
  background: #e5e5e5;
  color: #333;
}

.icon-btn:active {
  background: #d5d5d5;
}

/* 命令建议按钮 */
.cmd-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.cmd-suggestion:hover {
  border-color: #999;
  background: #fafafa;
}

.cmd-suggestion .arrow {
  opacity: 0.5;
  font-size: 12px;
}

/* 状态徽章 */
.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #e8e8e8;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  white-space: nowrap;
}

.status-badge .icon {
  font-size: 12px;
  opacity: 0.8;
}

/* 版本徽章 */
.status-badge.version {
  background: #d4f4dd;
  color: #2d6a3e;
}

/* 目录徽章 */
.status-badge.dir {
  background: #d4e4f4;
  color: #2d4a6a;
}

/* 分支徽章 */
.status-badge.branch {
  background: #f4e4d4;
  color: #6a4a2d;
}

/* 变更徽章 */
.status-badge.changes {
  background: #e0e0e0;
  gap: 6px;
}

.status-badge.changes .count {
  color: #666;
}

.status-badge.changes .add {
  color: #28a745;
}

.status-badge.changes .del {
  color: #d73a49;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .git-status-bar {
    background: #2d2d2d;
    border-top-color: #404040;
  }

  .icon-btn {
    color: #aaa;
  }

  .icon-btn:hover {
    background: #3d3d3d;
    color: #fff;
  }

  .icon-btn:active {
    background: #4d4d4d;
  }

  .cmd-suggestion {
    border-color: #555;
    background: #383838;
    color: #ddd;
  }

  .cmd-suggestion:hover {
    border-color: #666;
    background: #404040;
  }

  .status-badge {
    background: #383838;
    color: #ddd;
  }

  .status-badge.version {
    background: #2d4a3d;
    color: #68d391;
  }

  .status-badge.dir {
    background: #2d3a4a;
    color: #63b3ed;
  }

  .status-badge.branch {
    background: #4a3a2d;
    color: #f6ad55;
  }

  .status-badge.changes {
    background: #383838;
  }

  .status-badge.changes .count {
    color: #aaa;
  }
}
</style>

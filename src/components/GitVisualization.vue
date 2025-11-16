<script setup>
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
  currentDir: String
})

// 图表数据
const gitStats = ref({
  totalCommits: 0,
  totalBranches: 0,
  contributors: [],
  commitsPerDay: [],
  topAuthors: [],
  fileChanges: []
})

const activeChart = ref('history') // history, stats, contributors, timeline
const loading = ref(false)
const branches = ref([])

// 获取统计信息
const fetchStats = async () => {
  if (!props.currentDir) return

  try {
    loading.value = true

    // 总提交数
    const commitsResult = await invoke('execute_command', {
      command: 'git rev-list --count HEAD',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '0' }))
    gitStats.value.totalCommits = parseInt(commitsResult?.stdout?.trim?.() || '0') || 0

    // 分支数
    const branchesResult = await invoke('execute_command', {
      command: 'git branch -a | wc -l',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '0' }))
    gitStats.value.totalBranches = parseInt(branchesResult?.stdout?.trim?.() || '0') || 0

    // 获取所有分支
    const allBranchesResult = await invoke('execute_command', {
      command: 'git branch -a',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '' }))
    branches.value = (allBranchesResult?.stdout || '')
      .split('\n')
      .map(b => b.replace(/^\*?\s+/, '').trim())
      .filter(b => b && !b.includes('HEAD'))

    // 贡献者统计
    const contributorsResult = await invoke('execute_command', {
      command: 'git log --format="%an" | sort | uniq -c | sort -rn | head -10',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '' }))
    gitStats.value.contributors = (contributorsResult?.stdout || '')
      .split('\n')
      .filter(l => l.trim())
      .map(line => {
        const [count, ...nameParts] = line.trim().split(/\s+/)
        return { author: nameParts.join(' '), commits: parseInt(count) }
      })

    // 每日提交
    const dailyResult = await invoke('execute_command', {
      command: 'git log --date=short --format="%ad" | sort | uniq -c | tail -30',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '' }))
    gitStats.value.commitsPerDay = (dailyResult?.stdout || '')
      .split('\n')
      .filter(l => l.trim())
      .map(line => {
        const [count, date] = line.trim().split(/\s+/)
        return { date, commits: parseInt(count) }
      })

    // 文件变更最多的文件
    const filesResult = await invoke('execute_command', {
      command: 'git log --format="" --name-only | sort | uniq -c | sort -rn | head -10',
      workingDir: props.currentDir
    }).catch(() => ({ stdout: '' }))
    gitStats.value.fileChanges = (filesResult?.stdout || '')
      .split('\n')
      .filter(l => l.trim() && l.trim() !== '')
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const count = parts[0]
        const file = parts.slice(1).join(' ')
        return { file, changes: parseInt(count) }
      })
  } catch (err) {
    console.error('Stats error:', err)
  } finally {
    loading.value = false
  }
}

// 生成分支树
const branchTree = computed(() => {
  const tree = {}
  branches.value.forEach(branch => {
    const parts = branch.split('/')
    let current = tree
    parts.forEach((part, idx) => {
      if (!current[part]) {
        current[part] = {}
      }
      if (idx === parts.length - 1) {
        current[part]._isLeaf = true
      }
      current = current[part]
    })
  })
  return tree
})

// 计算图表高度
const maxCommits = computed(() => {
  return Math.max(...(gitStats.value.commitsPerDay.map(d => d.commits) || [1]))
})

// 监听目录变化
watch(
  () => props.currentDir,
  () => {
    fetchStats()
  },
  { immediate: true }
)

// 渲染分支树
const renderBranchTree = (tree, depth = 0) => {
  return Object.entries(tree)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => {
      const isLeaf = value._isLeaf
      const indent = depth * 20
      return {
        name: key,
        indent,
        isLeaf,
        children: isLeaf ? [] : renderBranchTree(value, depth + 1)
      }
    })
}
</script>

<template>
  <div class="git-visualization">
    <!-- 头部统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ gitStats.totalCommits }}</div>
        <div class="stat-label">Commits</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ gitStats.totalBranches }}</div>
        <div class="stat-label">Branches</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ gitStats.contributors.length }}</div>
        <div class="stat-label">Contributors</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ gitStats.fileChanges.length }}</div>
        <div class="stat-label">Changed Files</div>
      </div>
    </div>

    <!-- 选项卡 -->
    <div class="chart-tabs">
      <button
        v-for="tab in ['history', 'stats', 'contributors', 'timeline']"
        :key="tab"
        :class="['tab-btn', { active: activeChart === tab }]"
        @click="activeChart = tab"
      >
        {{
          tab === 'history'
            ? '🌳 History'
            : tab === 'stats'
              ? '📊 Stats'
              : tab === 'contributors'
                ? '👥 Contributors'
                : '📈 Timeline'
        }}
      </button>
    </div>

    <!-- 图表内容 -->
    <div class="chart-content">
      <!-- 历史图表 -->
      <div v-if="activeChart === 'history'" class="chart-section">
        <h3>Branch Tree</h3>
        <div class="branch-tree">
          <div
            v-for="(branch, idx) in renderBranchTree(branchTree)"
            :key="idx"
            class="branch-node"
            :style="{ paddingLeft: branch.indent + 'px' }"
          >
            <span v-if="!branch.isLeaf" class="branch-icon">📁</span>
            <span v-else class="branch-icon">🔀</span>
            <span class="branch-name">{{ branch.name }}</span>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="activeChart === 'stats'" class="chart-section">
        <h3>File Changes</h3>
        <div class="file-changes-list">
          <div v-for="(file, idx) in gitStats.fileChanges" :key="idx" class="file-change-item">
            <div class="file-name">{{ file.file }}</div>
            <div class="file-bar-container">
              <div
                class="file-bar"
                :style="{
                  width:
                    (file.changes / Math.max(...gitStats.fileChanges.map(f => f.changes))) * 100 +
                    '%'
                }"
              ></div>
              <span class="file-count">{{ file.changes }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 贡献者 -->
      <div v-if="activeChart === 'contributors'" class="chart-section">
        <h3>Top Contributors</h3>
        <div class="contributors-list">
          <div v-for="(contrib, idx) in gitStats.contributors" :key="idx" class="contributor-item">
            <div class="contributor-rank">{{ idx + 1 }}</div>
            <div class="contributor-info">
              <div class="contributor-name">{{ contrib.author }}</div>
              <div
                class="contributor-bar"
                :style="{ width: (contrib.commits / gitStats.contributors[0].commits) * 100 + '%' }"
              ></div>
            </div>
            <div class="contributor-count">{{ contrib.commits }}</div>
          </div>
        </div>
      </div>

      <!-- 时间线 -->
      <div v-if="activeChart === 'timeline'" class="chart-section">
        <h3>Daily Commits Timeline</h3>
        <div class="timeline-chart">
          <div
            v-for="(day, idx) in gitStats.commitsPerDay"
            :key="idx"
            class="timeline-day"
            :title="`${day.date}: ${day.commits} commits`"
          >
            <div
              class="timeline-bar"
              :style="{ height: (day.commits / maxCommits) * 60 + 'px' }"
            ></div>
            <div class="timeline-date">{{ day.date.split('-')[2] }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.git-visualization {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--terminal-bg, #1c1c1e);
  color: var(--text-primary, #e4e4e7);
  padding: 16px;
  gap: 16px;
  overflow-y: auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  background: linear-gradient(135deg, rgba(0, 122, 204, 0.1), rgba(0, 180, 255, 0.1));
  border: 1px solid rgba(0, 122, 204, 0.3);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #00b4ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #999);
  text-transform: uppercase;
}

.chart-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #333);
  padding-bottom: 0;
}

.tab-btn {
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary, #999);
  cursor: pointer;
  font-size: 12px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: var(--text-primary, #e0e0e0);
}

.tab-btn.active {
  color: #00b4ff;
  border-bottom-color: #00b4ff;
}

.chart-content {
  flex: 1;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  padding: 12px;
}

.chart-section {
  height: 100%;
}

.chart-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

/* Branch Tree */
.branch-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: monospace;
  font-size: 12px;
}

.branch-node {
  padding: 6px 8px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.branch-node:hover {
  background: rgba(0, 180, 255, 0.1);
}

.branch-icon {
  min-width: 16px;
}

.branch-name {
  color: #00b4ff;
}

/* File Changes */
.file-changes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  min-width: 200px;
  font-size: 11px;
  color: var(--text-secondary, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-bar-container {
  flex: 1;
  position: relative;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.file-bar {
  height: 100%;
  background: linear-gradient(90deg, #00b4ff, #00ff88);
  transition: width 0.3s;
}

.file-count {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #e0e0e0;
  z-index: 1;
}

/* Contributors */
.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contributor-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contributor-rank {
  min-width: 24px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #00b4ff, #0088ff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
}

.contributor-info {
  flex: 1;
}

.contributor-name {
  font-size: 12px;
  margin-bottom: 4px;
}

.contributor-bar {
  height: 6px;
  background: linear-gradient(90deg, #ff6b6b, #ff8e72);
  border-radius: 3px;
  transition: width 0.3s;
}

.contributor-count {
  min-width: 40px;
  text-align: right;
  font-weight: bold;
  color: #00b4ff;
}

/* Timeline */
.timeline-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  gap: 2px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.timeline-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  max-width: 30px;
}

.timeline-bar {
  width: 100%;
  background: linear-gradient(180deg, #00ff88, #00b4ff);
  border-radius: 2px 2px 0 0;
  transition: all 0.2s;
  cursor: pointer;
}

.timeline-bar:hover {
  opacity: 0.8;
}

.timeline-date {
  font-size: 9px;
  color: var(--text-tertiary, #666);
}
</style>

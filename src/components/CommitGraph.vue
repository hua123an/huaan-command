<script setup>
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
    currentDir: String
})

// 数据
const commitHistory = ref([])
const selectedCommits = ref(new Set())
const filterAuthor = ref('')
const filterKeyword = ref('')
const sortBy = ref('date') // date, author, message
const loading = ref(false)
const error = ref(null)

// 获取提交历史（更详细）
const fetchCommitHistory = async () => {
    if (!props.currentDir) return

    try {
        loading.value = true
        error.value = null

        const result = await invoke('execute_command', {
            command: 'git log --pretty=format:"%H|%h|%an|%ae|%ar|%s|%b" --all --graph',
            workingDir: props.currentDir
        })

        const lines = result.stdout.split('\n')
        commitHistory.value = lines
            .map((line, idx) => {
                if (!line.trim() || line.startsWith('*')) return null

                const [hash, shortHash, author, email, date, subject, body] = line.split('|')
                if (!hash) return null

                return {
                    id: hash,
                    shortHash: shortHash || hash.substring(0, 7),
                    author: author || 'Unknown',
                    email: email || '',
                    date: date || '',
                    subject: subject || '',
                    body: body || '',
                    changes: 0,
                    insertions: 0,
                    deletions: 0,
                    files: 0,
                    idx
                }
            })
            .filter(Boolean)

        // 获取每个提交的详细信息
        for (let i = 0; i < Math.min(commitHistory.value.length, 20); i++) {
            const commit = commitHistory.value[i]
            try {
                const statsResult = await invoke('execute_command', {
                    command: `git show --stat ${commit.id} | tail -1`,
                    workingDir: props.currentDir
                })
                const stats = statsResult.stdout.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/)
                if (stats) {
                    commit.files = parseInt(stats[1]) || 0
                    commit.insertions = parseInt(stats[2]) || 0
                    commit.deletions = parseInt(stats[3]) || 0
                }
            } catch (e) {
                // Ignore error getting stats for individual commits
                void e
            }
        }
    } catch (err) {
        error.value = `Failed to fetch commits: ${err}`
    } finally {
        loading.value = false
    }
}

// 过滤提交
const filteredCommits = computed(() => {
    return commitHistory.value
        .filter(commit => {
            if (filterAuthor.value && !commit.author.toLowerCase().includes(filterAuthor.value.toLowerCase())) {
                return false
            }
            if (filterKeyword.value && !commit.subject.toLowerCase().includes(filterKeyword.value.toLowerCase())) {
                return false
            }
            return true
        })
        .sort((a, b) => {
            if (sortBy.value === 'author') {
                return a.author.localeCompare(b.author)
            } else if (sortBy.value === 'message') {
                return a.subject.localeCompare(b.subject)
            }
            return 0
        })
})

// 选择/取消选择提交
const toggleSelect = (id) => {
    if (selectedCommits.value.has(id)) {
        selectedCommits.value.delete(id)
    } else {
        selectedCommits.value.add(id)
    }
}

// 显示提交详情
const showCommitDetail = async (commit) => {
    try {
        const result = await invoke('execute_command', {
            command: `git show ${commit.id}`,
            workingDir: props.currentDir
        })
        console.log('Commit detail:', result.stdout)
    } catch (err) {
        error.value = `Failed to show commit: ${err}`
    }
}

// 撤销提交
const revertCommit = async (commit) => {
    if (!confirm(`Are you sure you want to revert commit ${commit.shortHash}?`)) {
        return
    }

    try {
        loading.value = true
        await invoke('execute_command', {
            command: `git revert ${commit.id} --no-edit`,
            workingDir: props.currentDir
        })
        await fetchCommitHistory()
        error.value = null
    } catch (err) {
        error.value = `Failed to revert commit: ${err}`
    } finally {
        loading.value = false
    }
}

// 复制到剪贴板
const copyToClipboard = (text) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard) {
        window.navigator.clipboard.writeText(text)
    }
}

// 监听目录变化
watch(() => props.currentDir, () => {
    fetchCommitHistory()
}, { immediate: true })

// 统计信息
const stats = computed(() => {
    const commits = filteredCommits.value
    return {
        total: commits.length,
        insertions: commits.reduce((acc, c) => acc + c.insertions, 0),
        deletions: commits.reduce((acc, c) => acc + c.deletions, 0),
        filesChanged: new Set(commits.map(c => c.files)).size
    }
})
</script>

<template>
    <div class="commit-graph">
        <!-- 头部统计 -->
        <div class="header">
            <h3>📊 Commit History</h3>
            <div class="stats">
                <span class="stat-item">
                    <span class="stat-label">Total:</span>
                    <span class="stat-value">{{ stats.total }}</span>
                </span>
                <span class="stat-item">
                    <span class="stat-label">+{{ stats.insertions }}</span>
                    <span class="insertions">insertions</span>
                </span>
                <span class="stat-item">
                    <span class="stat-label">-{{ stats.deletions }}</span>
                    <span class="deletions">deletions</span>
                </span>
            </div>
        </div>

        <!-- 错误显示 -->
        <div v-if="error" class="error-banner">
            ❌ {{ error }}
            <button class="close-btn" @click="error = null">×</button>
        </div>

        <!-- 过滤和排序 -->
        <div class="controls">
            <div class="filter-group">
                <input
                    v-model="filterAuthor"
                    type="text"
                    placeholder="Filter by author..."
                    class="filter-input"
                />
                <input
                    v-model="filterKeyword"
                    type="text"
                    placeholder="Search message..."
                    class="filter-input"
                />
                <select v-model="sortBy" class="filter-select">
                    <option value="date">Sort by Date</option>
                    <option value="author">Sort by Author</option>
                    <option value="message">Sort by Message</option>
                </select>
            </div>
        </div>

        <!-- 提交列表 -->
        <div v-if="loading" class="loading">
            Loading commits...
        </div>

        <div v-else-if="filteredCommits.length === 0" class="empty">
            No commits found
        </div>

        <div v-else class="commit-list">
            <div
                v-for="commit in filteredCommits"
                :key="commit.id"
                :class="['commit-item', { selected: selectedCommits.has(commit.id) }]"
                @click.ctrl="toggleSelect(commit.id)"
                @click.meta="toggleSelect(commit.id)"
            >
                <!-- 左侧选择框 -->
                <div class="commit-checkbox">
                    <input
                        type="checkbox"
                        :checked="selectedCommits.has(commit.id)"
                        @change="toggleSelect(commit.id)"
                    />
                </div>

                <!-- 提交信息 -->
                <div class="commit-info">
                    <div class="commit-header">
                        <span
                            class="commit-hash"
                            title="Click to copy"
                            @click="copyToClipboard(commit.id)"
                        >
                            {{ commit.shortHash }}
                        </span>
                        <span class="commit-message">{{ commit.subject }}</span>
                    </div>
                    <div class="commit-meta">
                        <span class="author" :title="commit.email">{{ commit.author }}</span>
                        <span class="date">{{ commit.date }}</span>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="commit-stats">
                    <div v-if="commit.files > 0" class="stat-badge">
                        {{ commit.files }} files
                    </div>
                    <div v-if="commit.insertions > 0" class="stat-badge insertions">
                        +{{ commit.insertions }}
                    </div>
                    <div v-if="commit.deletions > 0" class="stat-badge deletions">
                        -{{ commit.deletions }}
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="commit-actions">
                    <button
                        class="action-btn"
                        title="Show commit details"
                        @click.stop="showCommitDetail(commit)"
                    >
                        👁️
                    </button>
                    <button
                        class="action-btn"
                        title="Revert this commit"
                        @click.stop="revertCommit(commit)"
                    >
                        ↩️
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.commit-graph {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--terminal-bg, #1e1e1e);
    color: var(--text-primary, #e0e0e0);
    font-size: 12px;
    overflow: hidden;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--panel-bg, #252526);
}

.header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
}

.stat-label {
    color: var(--text-secondary, #999);
}

.stat-value {
    font-weight: bold;
    color: #00b4ff;
}

.insertions {
    color: #4caf50;
}

.deletions {
    color: #ff6b6b;
}

.error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 107, 107, 0.1);
    border-bottom: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
}

.close-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 16px;
}

.controls {
    padding: 12px;
    background: var(--panel-bg, #252526);
    border-bottom: 1px solid var(--border-color, #333);
    display: flex;
    gap: 8px;
}

.filter-group {
    display: flex;
    gap: 8px;
    flex: 1;
}

.filter-input {
    flex: 1;
    padding: 6px 8px;
    background: var(--input-bg, #333);
    border: 1px solid var(--border-color, #444);
    border-radius: 3px;
    color: var(--text-primary, #e0e0e0);
    font-size: 11px;
}

.filter-input:focus {
    outline: none;
    border-color: #00b4ff;
}

.filter-select {
    padding: 6px 8px;
    background: var(--input-bg, #333);
    border: 1px solid var(--border-color, #444);
    border-radius: 3px;
    color: var(--text-primary, #e0e0e0);
    font-size: 11px;
}

.filter-select:focus {
    outline: none;
    border-color: #00b4ff;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    font-size: 14px;
}

.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--text-secondary, #999);
}

.commit-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.commit-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    transition: all 0.2s;
    cursor: pointer;
}

.commit-item:hover {
    background: rgba(0, 180, 255, 0.05);
}

.commit-item.selected {
    background: rgba(0, 180, 255, 0.1);
}

.commit-checkbox {
    flex-shrink: 0;
}

.commit-checkbox input {
    cursor: pointer;
}

.commit-info {
    flex: 1;
    min-width: 0;
}

.commit-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.commit-hash {
    flex-shrink: 0;
    padding: 2px 6px;
    background: rgba(0, 180, 255, 0.1);
    border-radius: 3px;
    color: #00b4ff;
    font-family: monospace;
    cursor: pointer;
    font-weight: bold;
}

.commit-hash:hover {
    background: rgba(0, 180, 255, 0.2);
}

.commit-message {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.commit-meta {
    display: flex;
    gap: 8px;
    font-size: 10px;
    color: var(--text-secondary, #999);
}

.author {
    font-weight: 500;
}

.commit-stats {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.stat-badge {
    padding: 2px 6px;
    background: rgba(100, 100, 100, 0.3);
    border-radius: 2px;
    font-size: 10px;
    white-space: nowrap;
}

.stat-badge.insertions {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
}

.stat-badge.deletions {
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
}

.commit-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
}

.commit-item:hover .commit-actions {
    opacity: 1;
}

.action-btn {
    padding: 2px 6px;
    background: transparent;
    border: 1px solid var(--border-color, #444);
    border-radius: 2px;
    color: var(--text-secondary, #999);
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s;
}

.action-btn:hover {
    background: var(--border-color, #444);
    color: var(--text-primary, #e0e0e0);
}
</style>

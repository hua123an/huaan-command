<script setup>
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps({
    sessionId: String,
    currentDir: String
})

// Git 状态
const gitStatus = ref(null)
const branches = ref([])
const commits = ref([])
const isGitRepo = ref(false)
const loading = ref(false)
const error = ref(null)
const activeTab = ref('status') // status, branches, commits, settings

// 操作模式
const showCommitModal = ref(false)
const commitMessage = ref('')

// 初始化数据
const initGit = async () => {
    if (!props.currentDir) return

    try {
        loading.value = true

        // 检查是否是 Git 仓库
        const checkResult = await invoke('execute_command', {
            command: 'git rev-parse --is-inside-work-tree',
            workingDir: props.currentDir
        })

        isGitRepo.value = checkResult.stdout.trim() === 'true'

        if (isGitRepo.value) {
            await fetchStatus()
            await fetchBranches()
            await fetchCommits()
        }
    } catch {
        isGitRepo.value = false
    } finally {
        loading.value = false
    }
}

// 获取 Git 状态
const fetchStatus = async () => {
    try {
        const result = await invoke('execute_command', {
            command: 'git status --porcelain --branch',
            workingDir: props.currentDir
        })

        // 后端返回字符串，直接使用
        const stdout = typeof result === 'string' ? result : result.stdout
        if (!stdout) {
            throw new Error('No output from git status command')
        }

        const lines = stdout.split('\n').filter(l => l.trim())
        const branchLine = lines[0] || ''
        const files = lines.slice(1)

        // 解析分支
        const branchMatch = branchLine.match(/## (.+?)(?:\.\.\.)?/)
        const branch = branchMatch ? branchMatch[1] : 'unknown'

        // 解析文件
        const staged = []
        const unstaged = []
        const untracked = []

        files.forEach(line => {
            if (line.length < 3) return
            const status = line.substring(0, 2)
            const filename = line.substring(3)

            if (status === '??') {
                untracked.push(filename)
            } else if (status[0] !== ' ') {
                staged.push({ name: filename, status: status[0] })
            }
            if (status[1] !== ' ') {
                unstaged.push({ name: filename, status: status[1] })
            }
        })

        gitStatus.value = {
            branch,
            staged,
            unstaged,
            untracked,
            clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0
        }
    } catch (err) {
        error.value = `Failed to fetch status: ${err}`
    }
}

// 获取分支列表
const fetchBranches = async () => {
    try {
        const result = await invoke('execute_command', {
            command: 'git branch -a',
            workingDir: props.currentDir
        })

        // 后端返回字符串，直接使用
        const stdout = typeof result === 'string' ? result : result.stdout
        if (!stdout) {
            throw new Error('No output from git branch command')
        }

        branches.value = stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const isCurrent = line.startsWith('*')
                const name = line.replace(/^\*?\s+/, '').trim()
                return { name, isCurrent }
            })
    } catch (err) {
        error.value = `Failed to fetch branches: ${err}`
    }
}

// 获取提交历史
const fetchCommits = async () => {
    try {
        const result = await invoke('execute_command', {
            command: 'git log --pretty=format:"%h|%an|%ar|%s" -20',
            workingDir: props.currentDir
        })

        // 后端返回字符串，直接使用
        const stdout = typeof result === 'string' ? result : result.stdout
        if (!stdout) {
            throw new Error('No output from git log command')
        }

        commits.value = stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [hash, author, time, message] = line.split('|')
                return { hash, author, time, message }
            })
    } catch (err) {
        error.value = `Failed to fetch commits: ${err}`
    }
}

// Git Add 所有
const addAll = async () => {
    try {
        await invoke('execute_command', {
            command: 'git add .',
            workingDir: props.currentDir
        })
        await fetchStatus()
    } catch (err) {
        error.value = `Add failed: ${err}`
    }
}

// Git Commit
const doCommit = async () => {
    if (!commitMessage.value.trim()) {
        error.value = '提交信息不能为空'
        return
    }

    try {
        const msg = commitMessage.value.replace(/"/g, '\\"')
        await invoke('execute_command', {
            command: `git commit -m "${msg}"`,
            workingDir: props.currentDir
        })
        commitMessage.value = ''
        showCommitModal.value = false
        await fetchStatus()
        await fetchCommits()
    } catch (err) {
        error.value = `Commit failed: ${err}`
    }
}

// Git Push
const doPush = async () => {
    try {
        loading.value = true
        const branch = gitStatus.value?.branch || 'main'
        await invoke('execute_command', {
            command: `git push origin ${branch}`,
            workingDir: props.currentDir
        })
        error.value = null
    } catch (err) {
        error.value = `Push failed: ${err}`
    } finally {
        loading.value = false
    }
}

// Git Pull
const doPull = async () => {
    try {
        loading.value = true
        const branch = gitStatus.value?.branch || 'main'
        await invoke('execute_command', {
            command: `git pull origin ${branch}`,
            workingDir: props.currentDir
        })
        await fetchStatus()
        await fetchCommits()
        error.value = null
    } catch (err) {
        error.value = `Pull failed: ${err}`
    } finally {
        loading.value = false
    }
}

// 切换分支
const switchBranch = async branchName => {
    try {
        loading.value = true
        await invoke('execute_command', {
            command: `git checkout ${branchName}`,
            workingDir: props.currentDir
        })
        await fetchStatus()
        await fetchBranches()
    } catch (err) {
        error.value = `Switch branch failed: ${err}`
    } finally {
        loading.value = false
    }
}

// 初始化仓库
const initRepo = async () => {
    try {
        loading.value = true
        await invoke('execute_command', {
            command: 'git init',
            workingDir: props.currentDir
        })
        await initGit()
    } catch (err) {
        error.value = `Init failed: ${err}`
    } finally {
        loading.value = false
    }
}

watch(() => props.currentDir, initGit, { immediate: true })

// 计算属性
const totalChanges = computed(() => {
    if (!gitStatus.value) return 0
    return (
        gitStatus.value.staged.length +
        gitStatus.value.unstaged.length +
        gitStatus.value.untracked.length
    )
})

const canCommit = computed(() => {
    return gitStatus.value && gitStatus.value.staged.length > 0
})
</script>

<template>
    <div class="git-panel">
        <!-- 头部 -->
        <div class="panel-header">
            <h3>📚 Git Management</h3>
            <div v-if="isGitRepo" class="header-info">
                <span class="branch">{{ gitStatus?.branch || '?' }}</span>
                <span v-if="totalChanges > 0" class="changes">{{ totalChanges }} changes</span>
            </div>
        </div>

        <!-- 错误消息 -->
        <div v-if="error" class="error-message">
            ❌ {{ error }}
            <button class="close-btn" @click="error = null">×</button>
        </div>

        <!-- 未初始化 Git -->
        <div v-if="!isGitRepo" class="no-git">
            <p>This directory is not a Git repository</p>
            <button class="btn btn-primary" :disabled="loading" @click="initRepo">
                {{ loading ? 'Initializing...' : 'Initialize Git' }}
            </button>
        </div>

        <!-- Git 面板内容 -->
        <div v-else class="panel-content">
            <!-- 标签页 -->
            <div class="tabs">
                <button v-for="tab in ['status', 'branches', 'commits', 'settings']" :key="tab"
                    :class="['tab-btn', { active: activeTab === tab }]" @click="activeTab = tab">
                    {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                </button>
            </div>

            <!-- 状态标签页 -->
            <div v-if="activeTab === 'status'" class="tab-content">
                <!-- 快速操作 -->
                <div class="quick-actions">
                    <button class="btn btn-sm" :disabled="totalChanges === 0" @click="addAll">
                        ➕ Add All
                    </button>
                    <button class="btn btn-sm" :disabled="!canCommit" @click="showCommitModal = true">
                        💾 Commit
                    </button>
                    <button class="btn btn-sm" :disabled="loading" @click="doPush">⬆️ Push</button>
                    <button class="btn btn-sm" :disabled="loading" @click="doPull">⬇️ Pull</button>
                </div>

                <!-- Staged 文件 -->
                <div v-if="gitStatus?.staged.length > 0" class="file-section">
                    <h4>📝 Staged ({{ gitStatus.staged.length }})</h4>
                    <div class="file-list">
                        <div v-for="file in gitStatus.staged" :key="file.name" class="file-item staged">
                            {{ file.status }} {{ file.name }}
                        </div>
                    </div>
                </div>

                <!-- Unstaged 文件 -->
                <div v-if="gitStatus?.unstaged.length > 0" class="file-section">
                    <h4>⚠️ Unstaged ({{ gitStatus.unstaged.length }})</h4>
                    <div class="file-list">
                        <div v-for="file in gitStatus.unstaged" :key="file.name" class="file-item unstaged">
                            {{ file.status }} {{ file.name }}
                        </div>
                    </div>
                </div>

                <!-- Untracked 文件 -->
                <div v-if="gitStatus?.untracked.length > 0" class="file-section">
                    <h4>❓ Untracked ({{ gitStatus.untracked.length }})</h4>
                    <div class="file-list">
                        <div v-for="file in gitStatus.untracked" :key="file" class="file-item untracked">
                            ? {{ file }}
                        </div>
                    </div>
                </div>

                <div v-if="gitStatus?.clean" class="status-clean">✅ Working directory is clean</div>
            </div>

            <!-- 分支标签页 -->
            <div v-if="activeTab === 'branches'" class="tab-content">
                <div class="branches-list">
                    <div v-for="branch in branches" :key="branch.name"
                        :class="['branch-item', { current: branch.isCurrent }]" @click="switchBranch(branch.name)">
                        {{ branch.isCurrent ? '✓' : '○' }} {{ branch.name }}
                    </div>
                </div>
            </div>

            <!-- 提交历史标签页 -->
            <div v-if="activeTab === 'commits'" class="tab-content">
                <div class="commits-list">
                    <div v-for="commit in commits" :key="commit.hash" class="commit-item">
                        <div class="commit-hash">{{ commit.hash }}</div>
                        <div class="commit-message">{{ commit.message }}</div>
                        <div class="commit-meta">{{ commit.author }} · {{ commit.time }}</div>
                    </div>
                </div>
            </div>

            <!-- 设置标签页 -->
            <div v-if="activeTab === 'settings'" class="tab-content">
                <div class="settings-group">
                    <label>Git 用户名</label>
                    <input type="text" placeholder="Your name" class="input" />
                </div>
                <div class="settings-group">
                    <label>Git 邮箱</label>
                    <input type="email" placeholder="your@email.com" class="input" />
                </div>
                <button class="btn btn-primary">保存设置</button>
            </div>
        </div>

        <!-- Commit 模态框 -->
        <div v-if="showCommitModal" class="modal-overlay">
            <div class="modal">
                <h3>Commit Message</h3>
                <textarea v-model="commitMessage" placeholder="Enter commit message..." class="commit-textarea"
                    @keydown.ctrl.enter="doCommit" @keydown.meta.enter="doCommit"></textarea>
                <div class="modal-actions">
                    <button class="btn btn-primary" @click="doCommit">Commit</button>
                    <button class="btn" @click="showCommitModal = false">Cancel</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.git-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    overflow: hidden;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.header-info {
    display: flex;
    gap: 12px;
    font-size: 11px;
}

.branch {
    padding: 2px 6px;
    background: #0e639c;
    border-radius: 3px;
}

.changes {
    padding: 2px 6px;
    background: #cd7f32;
    border-radius: 3px;
}

.error-message {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--error-bg, rgba(239, 68, 68, 0.1));
    color: var(--error-color, #ef4444);
    border-bottom: 1px solid var(--border-color, #333);
}

.close-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 16px;
}

.no-git {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
    padding: 24px;
    text-align: center;
    background: var(--bg-primary);
    color: var(--text-secondary);
}

.panel-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background: var(--bg-primary);
}

.tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    padding: 0 12px;
}

.tab-btn {
    flex: 1;
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
}

.tab-btn:hover {
    color: var(--text-primary);
}

.tab-btn.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
}

.tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--bg-primary);
}

.quick-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.btn {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
}

.btn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-hover);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    opacity: 0.9;
}

.btn-sm {
    padding: 2px 6px;
    font-size: 10px;
}

.file-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.file-section h4 {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 100px;
    overflow-y: auto;
}

.file-item {
    padding: 4px 6px;
    border-radius: 2px;
    font-family: monospace;
    font-size: 10px;
    color: var(--text-primary);
}

.file-item.staged {
    background: var(--success-bg, rgba(34, 197, 94, 0.1));
    color: var(--success-color, #22c55e);
}

.file-item.unstaged {
    background: var(--warning-bg, rgba(251, 146, 60, 0.1));
    color: var(--warning-color, #fb923c);
}

.file-item.untracked {
    background: rgba(156, 163, 175, 0.1);
    color: var(--text-secondary);
}

.status-clean {
    padding: 12px;
    text-align: center;
    background: var(--success-bg, rgba(34, 197, 94, 0.1));
    border-radius: 3px;
    color: var(--success-color, #22c55e);
}

.branches-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.branch-item {
    padding: 6px 8px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: monospace;
    color: var(--text-primary);
}

.branch-item:hover {
    background: rgba(var(--accent-rgb, 10, 132, 255), 0.1);
}

.branch-item.current {
    background: rgba(var(--accent-rgb, 10, 132, 255), 0.2);
    color: var(--accent-color);
    font-weight: 600;
}

.commits-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.commit-item {
    padding: 6px;
    background: var(--bg-secondary);
    border-radius: 3px;
    border-left: 2px solid var(--accent-color);
}

.commit-hash {
    font-family: monospace;
    font-size: 10px;
    color: var(--accent-color);
}

.commit-message {
    font-size: 11px;
    margin-top: 2px;
    color: var(--text-primary);
}

.commit-meta {
    font-size: 9px;
    color: var(--text-secondary);
    margin-top: 2px;
}

.settings-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.settings-group label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
}

.input {
    padding: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    color: var(--text-primary);
    font-size: 11px;
}

.input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb, 10, 132, 255), 0.1);
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 16px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text-primary);
}

.commit-textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    color: var(--text-primary);
    font-family: monospace;
    font-size: 11px;
    resize: vertical;
}

.commit-textarea:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb, 10, 132, 255), 0.1);
}

.modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: flex-end;
}
</style>

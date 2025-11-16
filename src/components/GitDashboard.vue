<script setup>
import { ref } from 'vue'
import GitPanel from './GitPanel.vue'
import GitVisualization from './GitVisualization.vue'
import CommitGraph from './CommitGraph.vue'

defineProps({
    currentDir: String,
    sessionId: String
})

const activeView = ref('panel') // panel, visualization, commits
const viewOptions = [
    { id: 'panel', label: '📚 Git Panel', icon: '🎮' },
    { id: 'visualization', label: '📊 Statistics', icon: '📈' },
    { id: 'commits', label: '📜 Commits', icon: '📜' }
]
</script>

<template>
    <div class="git-dashboard">
        <!-- 视图切换 -->
        <div class="view-switcher">
            <button
                v-for="option in viewOptions"
                :key="option.id"
                :class="['view-btn', { active: activeView === option.id }]"
                :title="option.label"
                @click="activeView = option.id"
            >
                {{ option.icon }} {{ option.label }}
            </button>
        </div>

        <!-- 内容区域 -->
        <div class="content-area">
            <GitPanel
                v-show="activeView === 'panel'"
                :current-dir="currentDir"
                :session-id="sessionId"
                class="view-container"
            />

            <GitVisualization
                v-show="activeView === 'visualization'"
                :current-dir="currentDir"
                class="view-container"
            />

            <CommitGraph
                v-show="activeView === 'commits'"
                :current-dir="currentDir"
                class="view-container"
            />
        </div>
    </div>
</template>

<style scoped>
.git-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--terminal-bg, #1e1e1e);
    color: var(--text-primary, #e0e0e0);
    overflow: hidden;
}

.view-switcher {
    display: flex;
    gap: 4px;
    padding: 8px;
    background: var(--panel-bg, #252526);
    border-bottom: 1px solid var(--border-color, #333);
    overflow-x: auto;
}

.view-btn {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--border-color, #444);
    border-radius: 3px;
    color: var(--text-secondary, #999);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
}

.view-btn:hover {
    color: var(--text-primary, #e0e0e0);
    border-color: var(--border-color, #555);
}

.view-btn.active {
    background: #007acc;
    border-color: #007acc;
    color: white;
}

.content-area {
    flex: 1;
    overflow: hidden;
    display: flex;
}

.view-container {
    flex: 1;
    overflow: hidden;
}
</style>

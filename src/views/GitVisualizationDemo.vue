<script setup>
import { ref } from 'vue'
import GitDashboard from '@/components/GitDashboard.vue'

const currentDir = ref('/Users/huaan/huaan-command-dev')
const sessionId = ref('git-demo')
const showDashboard = ref(false)
</script>

<template>
    <div class="git-demo-container">
        <!-- 侧边栏说明 -->
        <div class="sidebar">
            <h2>🎨 Git 可视化演示</h2>
            
            <div class="demo-section">
                <h3>📋 功能概览</h3>
                <div class="feature-list">
                    <div class="feature-item">
                        <div class="feature-icon">🎮</div>
                        <div class="feature-name">Git Panel</div>
                        <div class="feature-desc">基础操作面板</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div class="feature-name">Visualization</div>
                        <div class="feature-desc">统计图表</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📜</div>
                        <div class="feature-name">Commits</div>
                        <div class="feature-desc">提交历史</div>
                    </div>
                </div>
            </div>

            <div class="demo-section">
                <h3>✨ 核心特性</h3>
                <ul class="feature-checklist">
                    <li>✅ 实时 Git 状态</li>
                    <li>✅ 文件分类管理</li>
                    <li>✅ 快速操作按钮</li>
                    <li>✅ 分支树形展示</li>
                    <li>✅ 贡献者排行</li>
                    <li>✅ 提交时间线</li>
                    <li>✅ 高级搜索过滤</li>
                    <li>✅ 提交撤销功能</li>
                </ul>
            </div>

            <div class="demo-section">
                <h3>📚 关键组件</h3>
                <div class="component-list">
                    <div class="component-item">
                        <code>GitDashboard.vue</code>
                        <span class="badge">综合</span>
                    </div>
                    <div class="component-item">
                        <code>GitPanel.vue</code>
                        <span class="badge">操作</span>
                    </div>
                    <div class="component-item">
                        <code>GitVisualization.vue</code>
                        <span class="badge">图表</span>
                    </div>
                    <div class="component-item">
                        <code>CommitGraph.vue</code>
                        <span class="badge">历史</span>
                    </div>
                </div>
            </div>

            <div class="demo-section">
                <h3>🚀 快速开始</h3>
                <button class="start-btn" @click="showDashboard = !showDashboard">
                    {{ showDashboard ? '隐藏仪表板' : '打开仪表板' }}
                </button>
            </div>

            <div class="demo-section">
                <h3>📖 使用示例</h3>
                <pre><code>// 导入组件
import GitDashboard from '@/components/GitDashboard.vue'

// 在模板中使用
&lt;GitDashboard 
  :current-dir="currentDir"
  :session-id="sessionId"
/&gt;</code></pre>
            </div>
        </div>

        <!-- 主要展示区域 -->
        <div class="main-content">
            <div v-if="!showDashboard" class="welcome">
                <div class="welcome-content">
                    <h1>🎨 Git 可视化系统</h1>
                    <p class="subtitle">完整的 Git 操作和可视化管理平台</p>

                    <div class="features-grid">
                        <!-- Git Panel -->
                        <div class="feature-card">
                            <div class="card-icon">🎮</div>
                            <h3>Git Panel</h3>
                            <p>基础操作面板，包含：</p>
                            <ul>
                                <li>文件状态管理</li>
                                <li>快速操作按钮</li>
                                <li>分支管理</li>
                                <li>提交历史查看</li>
                            </ul>
                        </div>

                        <!-- Visualization -->
                        <div class="feature-card">
                            <div class="card-icon">📊</div>
                            <h3>Statistics</h3>
                            <p>统计和数据可视化：</p>
                            <ul>
                                <li>分支树形结构</li>
                                <li>文件变更图表</li>
                                <li>贡献者排行</li>
                                <li>每日提交时间线</li>
                            </ul>
                        </div>

                        <!-- Commits -->
                        <div class="feature-card">
                            <div class="card-icon">📜</div>
                            <h3>Commit History</h3>
                            <p>详细提交历史管理：</p>
                            <ul>
                                <li>高级搜索和过滤</li>
                                <li>多种排序方式</li>
                                <li>提交撤销功能</li>
                                <li>快速复制 hash</li>
                            </ul>
                        </div>

                        <!-- Dashboard -->
                        <div class="feature-card">
                            <div class="card-icon">🎯</div>
                            <h3>Dashboard</h3>
                            <p>综合仪表板：</p>
                            <ul>
                                <li>统一界面</li>
                                <li>快速视图切换</li>
                                <li>集成所有功能</li>
                                <li>响应式设计</li>
                            </ul>
                        </div>
                    </div>

                    <button class="open-btn" @click="showDashboard = true">
                        打开 Git 仪表板 →
                    </button>
                </div>
            </div>

            <!-- Git Dashboard -->
            <div v-else class="dashboard-container">
                <GitDashboard
                    :current-dir="currentDir"
                    :session-id="sessionId"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.git-demo-container {
    display: flex;
    height: 100vh;
    background: #1e1e1e;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, sans-serif;
}

.sidebar {
    width: 320px;
    background: #252526;
    border-right: 1px solid #3e3e42;
    overflow-y: auto;
    padding: 20px;
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.5);
}

.sidebar h2 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #00b4ff;
    padding-bottom: 10px;
    border-bottom: 2px solid #00b4ff;
}

.demo-section {
    margin-bottom: 24px;
}

.demo-section h3 {
    margin: 0 0 12px 0;
    font-size: 13px;
    font-weight: 600;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.feature-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: rgba(0, 180, 255, 0.1);
    border-radius: 4px;
    border-left: 2px solid #00b4ff;
}

.feature-icon {
    font-size: 20px;
}

.feature-name {
    font-size: 12px;
    font-weight: 600;
    color: #e0e0e0;
}

.feature-desc {
    font-size: 10px;
    color: #999;
    margin-top: 2px;
}

.feature-checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.feature-checklist li {
    font-size: 12px;
    padding: 4px 0;
    color: #b4b4b4;
}

.component-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.component-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
}

.component-item code {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    color: #ce9178;
    flex: 1;
}

.badge {
    font-size: 10px;
    padding: 2px 6px;
    background: #007acc;
    color: white;
    border-radius: 2px;
}

.start-btn {
    width: 100%;
    padding: 8px;
    background: #00b4ff;
    border: none;
    border-radius: 3px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.start-btn:hover {
    background: #00d4ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 180, 255, 0.3);
}

pre {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px;
    border-radius: 3px;
    overflow-x: auto;
    margin: 0;
}

pre code {
    font-size: 10px;
    color: #ce9178;
    font-family: 'Monaco', 'Courier New', monospace;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.welcome {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.welcome-content {
    max-width: 900px;
    width: 100%;
}

.welcome h1 {
    margin: 0 0 10px 0;
    font-size: 48px;
    background: linear-gradient(135deg, #00b4ff, #00ff88);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.subtitle {
    margin: 0 0 40px 0;
    font-size: 16px;
    color: #999;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.feature-card {
    background: linear-gradient(135deg, rgba(0, 180, 255, 0.1), rgba(0, 100, 200, 0.1));
    border: 1px solid rgba(0, 180, 255, 0.3);
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s;
}

.feature-card:hover {
    border-color: rgba(0, 180, 255, 0.6);
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 180, 255, 0.2);
}

.card-icon {
    font-size: 36px;
    margin-bottom: 12px;
}

.feature-card h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #00b4ff;
}

.feature-card p {
    margin: 0 0 12px 0;
    font-size: 12px;
    color: #999;
}

.feature-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 11px;
    color: #b4b4b4;
}

.feature-card ul li {
    padding: 2px 0;
}

.feature-card ul li::before {
    content: '▸ ';
    color: #00ff88;
    margin-right: 4px;
}

.open-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #00b4ff, #00ff88);
    border: none;
    border-radius: 6px;
    color: #1e1e1e;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    width: 100%;
    max-width: 300px;
}

.open-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 180, 255, 0.4);
}

.dashboard-container {
    flex: 1;
    overflow: hidden;
}

/* 滚动条美化 */
.sidebar::-webkit-scrollbar {
    width: 8px;
}

.sidebar::-webkit-scrollbar-track {
    background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
    background: #777;
}

.welcome::-webkit-scrollbar {
    width: 8px;
}

.welcome::-webkit-scrollbar-track {
    background: transparent;
}

.welcome::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
}

.welcome::-webkit-scrollbar-thumb:hover {
    background: #777;
}
</style>

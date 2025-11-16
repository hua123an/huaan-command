<template>
    <div v-if="visible" class="claude-config-modal">
        <div class="modal-overlay" @click="closeModal"></div>

        <div class="modal-content">
            <!-- 标题栏 -->
            <div class="modal-header">
                <h2>🤖 Claude Code 配置管理</h2>
                <button class="close-btn" @click="closeModal">✕</button>
            </div>

            <!-- 标签页 -->
            <div class="modal-tabs">
                <button
v-for="tab in tabs" :key="tab" :class="['tab-btn', { active: activeTab === tab }]"
                    @click="activeTab = tab">
                    {{ getTabLabel(tab) }}
                </button>
            </div>

            <!-- 内容区 -->
            <div class="modal-body">
                <!-- 配置列表 -->
                <div v-if="activeTab === 'list'" class="providers-list">
                    <div v-if="store.isLoading" class="loading">
                        <span class="spinner"></span>
                        加载中...
                    </div>

                    <div v-else-if="!store.hasProviders" class="empty-state">
                        <p>🚀 还没有配置</p>
                        <p class="hint">请先添加一个 Claude Code API 配置</p>
                    </div>

                    <div v-else class="providers">
                        <div
v-for="provider in store.providersList" :key="provider.name"
                            :class="['provider-item', { active: provider.isActive }]">
                            <div class="provider-info">
                                <h3 class="provider-name">
                                    {{ provider.isActive ? '✓' : '' }} {{ provider.name }}
                                </h3>
                                <p class="model">📦 {{ provider.model }}</p>
                                <p class="url">🔗 {{ provider.baseUrl }}</p>
                                <p class="key">🔑 {{ provider.maskKey }}</p>
                            </div>

                            <div class="provider-actions">
                                <button
v-if="!provider.isActive" class="btn btn-switch" :disabled="store.isLoading"
                                    @click="handleSwitch(provider.name)">
                                    切换
                                </button>
                                <button v-else class="btn btn-active" disabled>✓ 已激活</button>

                                <button
class="btn btn-delete" :disabled="store.isLoading"
                                    @click="handleDelete(provider.name)">
                                    删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 添加配置 -->
                <div v-else-if="activeTab === 'add'" class="add-provider">
                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label for="name">配置名称 *</label>
                            <input
id="name" v-model="form.name" type="text" placeholder="例: anthropic, azure, custom"
                                required />
                            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
                        </div>

                        <div class="form-group">
                            <label for="baseUrl">API Base URL *</label>
                            <input
id="baseUrl" v-model="form.baseUrl" type="url"
                                placeholder="例: https://api.anthropic.com" required />
                            <span v-if="errors.baseUrl" class="error-text">{{ errors.baseUrl }}</span>
                        </div>

                        <div class="form-group">
                            <label for="apiKey">API Key *</label>
                            <input
id="apiKey" v-model="form.apiKey" type="password" placeholder="输入你的 API Key"
                                required />
                            <span v-if="errors.apiKey" class="error-text">{{ errors.apiKey }}</span>
                            <span class="hint-text">🔒 API Key 不会被保存到日志中</span>
                        </div>

                        <div class="form-group">
                            <label for="model">模型名称 *</label>
                            <input
id="model" v-model="form.model" type="text"
                                placeholder="例: claude-sonnet-4-5-20250929" required />
                            <span v-if="errors.model" class="error-text">{{ errors.model }}</span>
                        </div>

                        <!-- 预设配置快捷选择 -->
                        <div class="presets">
                            <p class="presets-label">快速预设:</p>
                            <div class="preset-buttons">
                                <button type="button" class="preset-btn" @click="() => loadPreset('anthropic')">
                                    Anthropic
                                </button>
                                <button type="button" class="preset-btn" @click="() => loadPreset('azure')">
                                    Azure
                                </button>
                                <button type="button" class="preset-btn" @click="() => loadPreset('openai')">
                                    OpenAI
                                </button>
                            </div>
                        </div>

                        <!-- 消息提示 -->
                        <div v-if="store.error" class="message error-message">⚠️ {{ store.error }}</div>

                        <div v-if="store.successMessage" class="message success-message">
                            ✓ {{ store.successMessage }}
                        </div>

                        <button type="submit" class="btn btn-submit" :disabled="store.isLoading">
                            {{ store.isLoading ? '保存中...' : '保存配置' }}
                        </button>
                    </form>
                </div>
            </div>

            <!-- 底部状态 -->
            <div class="modal-footer">
                <div v-if="store.currentProvider" class="current-provider">
                    📍 当前: <strong>{{ store.currentProvider.name }}</strong>
                </div>
                <div v-else class="current-provider">📍 当前: <strong>无</strong></div>
                <button class="btn-refresh" :disabled="store.isLoading" @click="handleRefresh">
                    🔄 刷新
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useClaudeConfigStore } from '@/stores/claudeConfig'
import * as validators from '@/tools/claude-manager/validators'
import * as constants from '@/tools/claude-manager/constants'

defineProps({
    visible: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close'])

const store = useClaudeConfigStore()
const activeTab = ref('list')
const tabs = ['list', 'add']

const form = ref({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: ''
})

const errors = ref({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: ''
})

// ==================== 生命周期 ====================
onMounted(async () => {
    await store.loadProviders()
})

// ==================== 方法 ====================
function getTabLabel(tab) {
    const labels = {
        list: `📋 配置列表 (${store.providers.length})`,
        add: '➕ 添加配置'
    }
    return labels[tab] || tab
}

async function handleSwitch(name) {
    const success = await store.switchProvider(name)
    if (success) {
        setTimeout(() => store.clearSuccess(), 3000)
    }
}

async function handleDelete(name) {
    if (confirm(`确定要删除配置 "${name}" 吗？此操作无法撤销。`)) {
        const success = await store.removeProvider(name)
        if (success) {
            setTimeout(() => store.clearSuccess(), 3000)
        }
    }
}

async function handleSubmit() {
    // 清除之前的错误
    Object.keys(errors.value).forEach(key => {
        errors.value[key] = ''
    })

    // 验证表单
    const validation = validators.validateProvider(form.value)
    if (!validation.valid) {
        validation.errors.forEach(error => {
            // 简单的错误映射
            if (error.includes('名称')) errors.value.name = error
            else if (error.includes('URL')) errors.value.baseUrl = error
            else if (error.includes('Key')) errors.value.apiKey = error
            else if (error.includes('模型')) errors.value.model = error
        })
        return
    }

    // 检查是否已存在
    if (validators.providerNameExists(form.value.name, store.providers)) {
        errors.value.name = `配置 "${form.value.name}" 已存在`
        return
    }

    // 提交
    const success = await store.addProvider(form.value)
    if (success) {
        // 重置表单
        form.value = { name: '', baseUrl: '', apiKey: '', model: '' }
        activeTab.value = 'list'
        setTimeout(() => store.clearSuccess(), 3000)
    }
}

function loadPreset(presetName) {
    const preset = constants.PROVIDER_PRESETS[presetName]
    if (preset) {
        form.value.baseUrl = preset.baseUrl
        form.value.model = preset.model
    }
}

async function handleRefresh() {
    await store.refreshProviders()
}

function closeModal() {
    store.clearMessages()
    emit('close')
}
</script>

<style scoped>
.claude-config-modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    transition: background 0.2s;
}

.modal-overlay:hover {
    background: rgba(0, 0, 0, 0.6);
}

.modal-content {
    position: relative;
    background: var(--bg-primary);
    border-radius: 12px;
    width: 90%;
    max-width: 700px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    overflow: hidden;
}

/* 标题栏 */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.modal-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
    padding: 4px;
    border-radius: 4px;
}

.close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

/* 标签页 */
.modal-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    padding: 0 4px;
}

.tab-btn {
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    color: var(--text-secondary);
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: -1px;
}

.tab-btn:hover {
    color: var(--text-primary);
}

.tab-btn.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
}

/* 内容区 */
.modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
}

/* 配置列表 */
.providers-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 14px;
}

.spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    gap: 8px;
    color: var(--text-secondary);
    text-align: center;
}

.empty-state p {
    margin: 0;
}

.empty-state p:first-child {
    font-size: 24px;
}

.hint {
    font-size: 13px;
    color: var(--text-tertiary);
}

.providers {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.provider-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
}

.provider-item:hover {
    border-color: var(--border-hover);
    background: var(--bg-hover);
}

.provider-item.active {
    border-color: var(--accent-color);
    background: rgba(10, 132, 255, 0.08);
}

.provider-info {
    flex: 1;
    min-width: 0;
}

.provider-name {
    margin: 0 0 6px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.provider-info p {
    margin: 3px 0;
    font-size: 12px;
    color: var(--text-secondary);
    word-break: break-all;
    white-space: normal;
}

.provider-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

/* 按钮样式 */
.btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-switch {
    background: var(--accent-color);
    color: white;
}

.btn-switch:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
}

.btn-delete {
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
}

.btn-delete:hover:not(:disabled) {
    background: rgba(255, 59, 48, 0.2);
}

.btn-active {
    background: rgba(52, 199, 89, 0.1);
    color: #34c759;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 添加配置表单 */
.add-provider form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.form-group label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.form-group input {
    padding: 8px 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
    transition: all 0.2s;
}

.form-group input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.error-text {
    font-size: 12px;
    color: #ff3b30;
}

.hint-text {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* 预设按钮 */
.presets {
    padding-top: 4px;
}

.presets-label {
    margin: 0 0 6px 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
}

.preset-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.preset-btn {
    padding: 6px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.preset-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent-color);
    color: var(--accent-color);
}

/* 消息提示 */
.message {
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
}

.error-message {
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: #ff3b30;
}

.success-message {
    background: rgba(52, 199, 89, 0.1);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: #34c759;
}

.btn-submit {
    padding: 10px;
    background: var(--accent-color);
    color: white;
    margin-top: 8px;
}

.btn-submit:hover:not(:disabled) {
    opacity: 0.9;
}

/* 底部状态 */
.modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary);
    font-size: 12px;
}

.current-provider {
    color: var(--text-secondary);
}

.btn-refresh {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 12px;
    transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
    border-color: var(--accent-color);
    color: var(--accent-color);
}

.btn-refresh:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 640px) {
    .modal-content {
        width: 95%;
        max-height: 90vh;
    }

    .provider-item {
        flex-direction: column;
    }

    .provider-actions {
        width: 100%;
    }

    .preset-buttons {
        flex-direction: column;
    }

    .preset-btn {
        flex: 1;
    }
}
</style>

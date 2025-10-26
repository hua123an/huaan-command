<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useAIStore, AI_PROVIDERS } from '../stores/ai'
import { useTerminalStore } from '../stores/terminal'

const router = useRouter()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const terminalStore = useTerminalStore()

const showApiKey = ref(false)
const availableModels = ref([])
const loadingModels = ref(false)

// 服务商列表
const providerOptions = computed(() => {
  return Object.entries(AI_PROVIDERS).map(([key, config]) => ({
    id: key,
    name: config.name
  }))
})

// 当前服务商的默认模型（作为后备）
const defaultModels = computed(() => {
  const currentConfig = AI_PROVIDERS[aiStore.provider]
  if (currentConfig && currentConfig.defaultModel) {
    return [{ id: currentConfig.defaultModel, name: currentConfig.defaultModel }]
  }
  return [
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini' }
  ]
})

// 合并的模型列表
const modelOptions = computed(() => {
  if (availableModels.value.length > 0) {
    return availableModels.value
  }
  return defaultModels.value
})

// 切换服务商
const handleProviderChange = () => {
  aiStore.switchProvider(aiStore.provider)
  // 切换后重新加载模型
  if (aiStore.isConfigured) {
    loadModels()
  }
}

// 加载可用模型
const loadModels = async () => {
  if (!aiStore.isConfigured) {
    availableModels.value = []
    return
  }
  
  loadingModels.value = true
  try {
    const models = await aiStore.fetchAvailableModels()
    if (models.length > 0) {
      availableModels.value = models
    }
  } catch (error) {
    console.error('Failed to load models:', error)
  } finally {
    loadingModels.value = false
  }
}

// 监听 API Key 或端点变化，重新加载模型
watch(() => [aiStore.apiKey, aiStore.apiEndpoint, aiStore.enabled], () => {
  if (aiStore.enabled && aiStore.isConfigured) {
    loadModels()
  } else {
    availableModels.value = []
  }
}, { deep: true })

// 组件挂载时加载
onMounted(() => {
  if (aiStore.enabled && aiStore.isConfigured) {
    loadModels()
  }
})

const handleReset = () => {
  if (confirm('确定要重置所有设置吗？')) {
    settingsStore.resetSettings()
  }
}

const saveAIConfig = () => {
  aiStore.saveConfig()
}

const testAI = async () => {
  if (!aiStore.isConfigured) {
    alert('请先配置 API Key')
    return
  }
  
  try {
    const result = await aiStore.generateCommand('测试命令：显示当前目录')
    alert(`✅ AI 连接成功！\n\n测试命令：\n${result}`)
  } catch (error) {
    alert(`❌ AI 连接失败：\n${error.message}`)
  }
}

const handleClearTerminalSessions = () => {
  if (confirm(`确定要清除所有保存的终端会话吗？\n\n这将删除 ${terminalStore.sessions.length} 个标签页的记录。\n当前打开的终端不会受影响。`)) {
    terminalStore.clearAllSessions()
    alert('✓ 已清除所有保存的终端会话')
  }
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <button class="back-btn" title="返回" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1>⚙️ 设置</h1>
      <div style="width: 40px"></div> <!-- 占位 -->
    </div>

    <div class="page-content">
      <!-- 外观设置 -->
      <div class="setting-section">
        <h3>🎨 外观</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>主题</label>
            <p>选择应用的外观主题</p>
          </div>
          <select v-model="settingsStore.settings.theme" @change="settingsStore.saveSettings()">
            <option value="dark">深色模式</option>
            <option value="light">浅色模式</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
      </div>

      <div class="setting-section">
        <h3>性能</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>最大并发任务数</label>
            <p>同时运行的最大任务数量</p>
          </div>
          <select v-model.number="settingsStore.settings.maxConcurrent" @change="settingsStore.saveSettings()">
            <option :value="5">5 个</option>
            <option :value="10">10 个</option>
            <option :value="20">20 个</option>
            <option :value="50">50 个</option>
          </select>
        </div>
      </div>

      <div class="setting-section">
        <h3>通知</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>桌面通知</label>
            <p>任务完成时显示系统通知</p>
          </div>
          <label class="switch">
            <input
              v-model="settingsStore.settings.enableNotifications"
              type="checkbox"
              @change="settingsStore.saveSettings()"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>声音提示</label>
            <p>任务完成时播放提示音</p>
          </div>
          <label class="switch">
            <input
              v-model="settingsStore.settings.enableSound"
              type="checkbox"
              @change="settingsStore.saveSettings()"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div v-if="settingsStore.settings.enableSound" class="setting-item">
          <div class="setting-info">
            <label>音量</label>
            <p>提示音音量大小</p>
          </div>
          <input
            v-model.number="settingsStore.settings.soundVolume"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="volume-slider"
            @change="settingsStore.saveSettings()"
          />
        </div>
      </div>

      <div class="setting-section">
        <h3>历史记录</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>启用历史记录</label>
            <p>保存任务执行历史</p>
          </div>
          <label class="switch">
            <input
              v-model="settingsStore.settings.enableHistory"
              type="checkbox"
              @change="settingsStore.saveSettings()"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div v-if="settingsStore.settings.enableHistory" class="setting-item">
          <div class="setting-info">
            <label>最大记录数</label>
            <p>保留的历史记录数量</p>
          </div>
          <select v-model.number="settingsStore.settings.maxHistoryItems" @change="settingsStore.saveSettings()">
            <option :value="50">50 条</option>
            <option :value="100">100 条</option>
            <option :value="500">500 条</option>
            <option :value="1000">1000 条</option>
          </select>
        </div>
      </div>

      <!-- 终端设置 -->
      <div class="setting-section">
        <h3>🖥️ 终端</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>终端类型</label>
            <p>切换终端类型将重新初始化所有终端会话</p>
          </div>
          <select v-model="settingsStore.settings.shell" @change="settingsStore.saveSettings()">
            <option value="bash">Bash</option>
            <option value="zsh">Zsh</option>
            <option value="fish">Fish</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>自动恢复会话</label>
            <p>重启应用时恢复终端标签页</p>
          </div>
          <label class="switch">
            <input
              v-model="terminalStore.autoRestore"
              type="checkbox"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>会话管理</label>
            <p>当前保存了 {{ terminalStore.sessions.length }} 个终端标签页</p>
          </div>
          <button class="btn-danger" @click="handleClearTerminalSessions">
            清除所有会话
          </button>
        </div>
      </div>

      <div class="setting-section">
        <h3>🤖 AI 助手</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>启用 AI 功能</label>
            <p>使用 AI 生成命令、诊断错误</p>
          </div>
          <label class="switch">
            <input
              v-model="aiStore.enabled"
              type="checkbox"
              @change="saveAIConfig"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div v-if="aiStore.enabled" class="ai-config-panel">
          <div class="config-row">
            <label class="config-label">AI 服务商</label>
            <select 
              v-model="aiStore.provider" 
              class="provider-select" 
              @change="handleProviderChange"
            >
              <option 
                v-for="provider in providerOptions" 
                :key="provider.id" 
                :value="provider.id"
              >
                {{ provider.name }}
              </option>
            </select>
            <a 
              v-if="aiStore.currentProvider.docs" 
              :href="aiStore.currentProvider.docs" 
              target="_blank"
              class="provider-link"
            >
              📖 查看文档
            </a>
          </div>

          <div class="config-row">
            <label class="config-label">API Key</label>
            <div class="config-input-group">
              <input
                v-model="aiStore.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                :placeholder="aiStore.currentProvider.keyPlaceholder"
                class="api-key-input"
                :disabled="!aiStore.currentProvider.requiresKey"
                @change="saveAIConfig"
              />
              <button 
                class="btn-toggle-key" 
                :title="showApiKey ? '隐藏' : '显示'" 
                :disabled="!aiStore.currentProvider.requiresKey"
                @click="showApiKey = !showApiKey"
              >
                {{ showApiKey ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            <span v-if="!aiStore.currentProvider.requiresKey" class="config-hint">
              💡 {{ aiStore.currentProvider.name }} 无需 API Key
            </span>
          </div>

          <div class="config-row-compact">
            <div class="config-col">
              <label class="config-label-sm">
                模型
                <span v-if="loadingModels" class="loading-indicator">⏳</span>
              </label>
              <select 
                v-model="aiStore.model" 
                class="select-compact" 
                :disabled="loadingModels"
                @change="saveAIConfig"
              >
                <option 
                  v-for="model in modelOptions" 
                  :key="model.id" 
                  :value="model.id"
                >
                  {{ model.name }}
                </option>
              </select>
            </div>
            <div class="config-col-grow">
              <label class="config-label-sm">API 端点（可选）</label>
              <input
                v-model="aiStore.apiEndpoint"
                type="text"
                class="input-compact"
                placeholder="https://api.openai.com/v1"
                @change="saveAIConfig"
              />
            </div>
          </div>

          <div class="config-actions">
            <button class="btn btn-primary btn-compact" @click="testAI">
              🧪 测试连接
            </button>
            <div v-if="aiStore.stats.totalCalls > 0" class="stats-inline">
              <span class="stat-badge">📊 {{ aiStore.stats.totalCalls }} 次</span>
              <span class="stat-badge">✅ {{ ((aiStore.stats.successCalls / aiStore.stats.totalCalls) * 100).toFixed(0) }}%</span>
              <span class="stat-badge">🔢 {{ (aiStore.stats.totalTokens / 1000).toFixed(1) }}K</span>
            </div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <button class="btn btn-secondary" @click="handleReset">
          重置设置
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 36px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.back-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.setting-section {
  margin-bottom: 40px;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.setting-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.setting-info p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

select {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

select:hover {
  border-color: var(--border-hover);
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-hover);
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: var(--text-primary);
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.volume-slider {
  width: 140px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0a84ff;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0a84ff;
  cursor: pointer;
  border: none;
}

.page-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 0 0 0;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0077ed 0%, #0055bb 100%);
  box-shadow: 0 4px 16px rgba(10, 132, 255, 0.4);
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-active);
  border-color: var(--border-hover);
}

.btn-danger {
  padding: 10px 16px;
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.25);
  border-color: rgba(255, 59, 48, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

/* AI 配置面板 - 紧凑设计 */
.ai-config-panel {
  background: rgba(10, 132, 255, 0.05);
  border: 1px solid rgba(10, 132, 255, 0.15);
  border-radius: 10px;
  padding: 20px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-label-sm {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}

.loading-indicator {
  font-size: 11px;
  margin-left: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.config-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.api-key-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  outline: none;
  transition: all 0.2s ease;
}

.api-key-input:focus {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.api-key-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-toggle-key {
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle-key:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.btn-toggle-key:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.provider-select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.provider-select:focus {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.provider-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 12px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.2);
  border-radius: 6px;
  color: #0a84ff;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.provider-link:hover {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.4);
}

.config-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.config-row-compact {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px;
}

.config-col {
  display: flex;
  flex-direction: column;
}

.config-col-grow {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.select-compact,
.input-compact {
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.select-compact {
  cursor: pointer;
}

.select-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-compact {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
}

.select-compact:focus,
.input-compact:focus {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.config-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.btn-compact {
  padding: 10px 18px;
  font-size: 13px;
  white-space: nowrap;
}

.stats-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-badge {
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>


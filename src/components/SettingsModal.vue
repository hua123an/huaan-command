<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useThemeCustomizer } from '../composables/useThemeCustomizer'
import { useShortcuts } from '../composables/useShortcuts'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

// Stores
const settingsStore = useSettingsStore()
const { 
  currentTheme, 
  customColors, 
  availableThemes: themeCustomizerThemes,
  applyTheme, 
  updateCustomColor, 
  resetCustomColors,
  exportTheme: exportThemeConfig,
  importTheme: importThemeConfig
} = useThemeCustomizer()

// 状态
const activeTab = ref('theme')
const showApiKey = ref(false)
const fileInput = ref(null)

// 标签页
const tabs = [
  { key: 'theme', label: '主题' },
  { key: 'ai', label: 'AI' },
  { key: 'terminal', label: '终端' },
  { key: 'shortcuts', label: '快捷键' }
]

// AI 设置
const aiSettings = ref({
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  enabled: true
})

// 终端设置
const terminalSettings = ref({
  fontSize: 14,
  fontFamily: "'SF Mono', Menlo, Monaco, monospace",
  autoRestore: true,
  enableBlink: true
})

// 可用主题
const availableThemes = computed(() => [
  { key: 'system', name: '跟随系统', description: '自动跟随系统主题' },
  { key: 'dark', name: '深色模式', description: '适合夜间使用' },
  { key: 'light', name: '浅色模式', description: '适合白天使用' },
  { key: 'ocean', name: '海洋蓝', description: '清新的海洋主题' },
  { key: 'forest', name: '森林绿', description: '护眼的绿色主题' },
  { key: 'sunset', name: '夕阳橙', description: '温暖的橙色主题' }
])

// AI 服务商
const aiProviders = [
  { key: 'openai', name: 'OpenAI 官方' },
  { key: 'deepseek', name: 'DeepSeek' },
  { key: 'moonshot', name: 'Moonshot (Kimi)' },
  { key: 'zhipu', name: '智谱 GLM' },
  { key: 'qwen', name: '通义千问' }
]

// 可用模型
const availableModels = ref([
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
])

// 快捷键
const shortcuts = ref([
  { action: '新建终端', keys: ['Ctrl', 'T'] },
  { action: '关闭终端', keys: ['Ctrl', 'W'] },
  { action: '切换 AI 模式', keys: ['Ctrl', 'Shift', 'A'] },
  { action: '打开设置', keys: ['Ctrl', ','] },
  { action: '命令面板', keys: ['Ctrl', 'K'] }
])

// 颜色变量
const colorVariables = [
  { key: '--bg-primary', name: '主背景', description: '应用主要背景颜色' },
  { key: '--text-primary', name: '主要文字', description: '主要文本颜色' },
  { key: '--accent-color', name: '强调色', description: '按钮和链接颜色' },
  { key: '--success-color', name: '成功色', description: '成功状态颜色' },
  { key: '--error-color', name: '错误色', description: '错误状态颜色' }
]

// 方法
const selectTheme = (themeKey) => {
  applyTheme(themeKey)
}

const resetTheme = () => {
  applyTheme('system')
  resetCustomColors()
}

const exportTheme = () => {
  exportThemeConfig()
}

const importTheme = () => {
  fileInput.value?.click()
}

const handleFileImport = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      await importThemeConfig(file)
      console.log('主题导入成功')
    } catch (error) {
      console.error('主题导入失败:', error)
    }
  }
}

const getThemePreviewStyle = (theme) => {
  // 简化的主题预览样式
  const previewStyles = {
    system: {
      background: 'linear-gradient(135deg, #f0f0f0 0%, #2c2c2e 100%)',
      color: '#333'
    },
    dark: {
      background: '#1c1c1e',
      color: '#e4e4e7'
    },
    light: {
      background: '#ffffff',
      color: '#1d1d1f'
    },
    ocean: {
      background: '#0a192f',
      color: '#ccd6f6'
    },
    forest: {
      background: '#0d1117',
      color: '#f0f6fc'
    },
    sunset: {
      background: '#2d1b69',
      color: '#f7f3ff'
    }
  }
  
  return previewStyles[theme.key] || previewStyles.system
}

const getColorValue = (colorKey) => {
  return customColors.value[colorKey] || getComputedStyle(document.documentElement).getPropertyValue(colorKey)
}

const updateColor = (colorKey, value) => {
  updateCustomColor(colorKey, value)
}

const updateProvider = () => {
  // 更新 AI 提供商相关的模型列表
  console.log('更新 AI 提供商:', aiSettings.value.provider)
}

const toggleApiKeyVisibility = () => {
  showApiKey.value = !showApiKey.value
}

const editShortcut = (shortcut) => {
  console.log('编辑快捷键:', shortcut)
}

const saveSettings = () => {
  // 保存所有设置
  settingsStore.updateSetting('theme', currentTheme.value)
  settingsStore.updateSetting('aiProvider', aiSettings.value.provider)
  settingsStore.updateSetting('apiKey', aiSettings.value.apiKey)
  settingsStore.updateSetting('model', aiSettings.value.model)
  settingsStore.updateSetting('aiEnabled', aiSettings.value.enabled)
  
  emit('close')
}

// 初始化
onMounted(() => {
  // 加载当前设置
  aiSettings.value.provider = settingsStore.settings.aiProvider || 'openai'
  aiSettings.value.apiKey = settingsStore.settings.apiKey || ''
  aiSettings.value.model = settingsStore.settings.model || 'gpt-4o-mini'
  aiSettings.value.enabled = settingsStore.settings.aiEnabled !== false
})
</script>

<template>
  <div class="settings-modal" v-if="show">
    <div class="modal-overlay" @click="$emit('close')"></div>
    
    <div class="modal-content">
      <div class="modal-header">
        <h2>设置</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="settings-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <div class="settings-content">
          <!-- 主题设置 -->
          <div v-if="activeTab === 'theme'" class="settings-section">
            <h3>主题设置</h3>
            
            <div class="theme-selector">
              <div class="theme-options">
                <div 
                  v-for="theme in availableThemes" 
                  :key="theme.key"
                  :class="['theme-option', { active: currentTheme === theme.key }]"
                  @click="selectTheme(theme.key)"
                >
                  <div class="theme-preview" :style="getThemePreviewStyle(theme)">
                    <div class="preview-header"></div>
                    <div class="preview-content">
                      <div class="preview-line"></div>
                      <div class="preview-line short"></div>
                      <div class="preview-line"></div>
                    </div>
                  </div>
                  <div class="theme-info">
                    <div class="theme-name">{{ theme.name }}</div>
                    <div class="theme-description">{{ theme.description }}</div>
                  </div>
                  <div class="theme-indicator" v-if="currentTheme === theme.key">
                    ✓
                  </div>
                </div>
              </div>
              
              <div class="theme-actions">
                <button class="btn-secondary" @click="resetTheme">
                  重置为默认
                </button>
                <button class="btn-secondary" @click="exportTheme">
                  导出主题
                </button>
                <button class="btn-secondary" @click="importTheme">
                  导入主题
                </button>
              </div>
            </div>
            
            <!-- 自定义颜色 -->
            <div class="custom-colors">
              <h4>自定义颜色</h4>
              <div class="color-grid">
                <div 
                  v-for="color in colorVariables" 
                  :key="color.key"
                  class="color-item"
                >
                  <label :for="color.key">{{ color.name }}</label>
                  <div class="color-input-wrapper">
                    <input 
                      :id="color.key"
                      type="color" 
                      :value="getColorValue(color.key)"
                      @input="updateColor(color.key, $event.target.value)"
                    />
                    <input 
                      type="text" 
                      :value="getColorValue(color.key)"
                      @input="updateColor(color.key, $event.target.value)"
                      class="color-text"
                    />
                  </div>
                  <div class="color-description">{{ color.description }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- AI 设置 -->
          <div v-if="activeTab === 'ai'" class="settings-section">
            <h3>AI 设置</h3>
            
            <div class="config-group">
              <label>AI 服务商</label>
              <select v-model="aiSettings.provider" @change="updateProvider">
                <option v-for="provider in aiProviders" :key="provider.key" :value="provider.key">
                  {{ provider.name }}
                </option>
              </select>
            </div>
            
            <div class="config-group">
              <label>API Key</label>
              <div class="api-key-input-group">
                <input 
                  v-model="aiSettings.apiKey" 
                  type="password" 
                  placeholder="输入 API Key"
                  class="api-key-input"
                />
                <button 
                  class="btn-toggle-key" 
                  @click="toggleApiKeyVisibility"
                  :disabled="!aiSettings.apiKey"
                >
                  {{ showApiKey ? '隐藏' : '显示' }}
                </button>
              </div>
            </div>
            
            <div class="config-group">
              <label>模型</label>
              <select v-model="aiSettings.model">
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
            </div>
            
            <div class="config-group">
              <label>
                <input type="checkbox" v-model="aiSettings.enabled" />
                启用 AI 功能
              </label>
            </div>
          </div>
          
          <!-- 终端设置 -->
          <div v-if="activeTab === 'terminal'" class="settings-section">
            <h3>终端设置</h3>
            
            <div class="config-group">
              <label>字体大小</label>
              <input type="range" min="10" max="24" v-model="terminalSettings.fontSize" />
              <span>{{ terminalSettings.fontSize }}px</span>
            </div>
            
            <div class="config-group">
              <label>字体族</label>
              <select v-model="terminalSettings.fontFamily">
                <option value="'SF Mono', Menlo, Monaco, monospace">SF Mono</option>
                <option value="'Consolas', 'Courier New', monospace">Consolas</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
            </div>
            
            <div class="config-group">
              <label>
                <input type="checkbox" v-model="terminalSettings.autoRestore" />
                自动恢复会话
              </label>
            </div>
            
            <div class="config-group">
              <label>
                <input type="checkbox" v-model="terminalSettings.enableBlink" />
                光标闪烁
              </label>
            </div>
          </div>
          
          <!-- 快捷键设置 -->
          <div v-if="activeTab === 'shortcuts'" class="settings-section">
            <h3>快捷键设置</h3>
            
            <div class="shortcuts-list">
              <div v-for="shortcut in shortcuts" :key="shortcut.action" class="shortcut-item">
                <div class="shortcut-info">
                  <div class="shortcut-action">{{ shortcut.description }}</div>
                  <div class="shortcut-keys">{{ shortcut.keys.join(' + ') }}</div>
                </div>
                <button class="btn-secondary" @click="editShortcut(shortcut)">
                  编辑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-primary" @click="saveSettings">保存设置</button>
        <button class="btn-secondary" @click="$emit('close')">取消</button>
      </div>
    </div>
    
    <!-- 文件输入（隐藏） -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".json" 
      style="display: none" 
      @change="handleFileImport"
    />
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.settings-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 75vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bg-tertiary);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.95);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.setting-section {
  margin-bottom: 32px;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.setting-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 4px;
}

.setting-info p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

select {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  cursor: pointer;
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
  background-color: rgba(255, 255, 255, 0.15);
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
  background-color: white;
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
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
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

/* 主题选择器 */
.theme-selector {
  margin-bottom: 32px;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.theme-option:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(10, 132, 255, 0.15);
}

.theme-option.active {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.theme-preview {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.preview-header {
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
}

.preview-content {
  padding: 4px;
}

.preview-line {
  height: 3px;
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 2px;
  border-radius: 1px;
}

.preview-line.short {
  width: 60%;
}

.theme-info {
  flex: 1;
}

.theme-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.theme-description {
  font-size: 12px;
  color: var(--text-secondary);
}

.theme-indicator {
  width: 24px;
  height: 24px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.theme-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 自定义颜色 */
.custom-colors {
  margin-top: 32px;
}

.custom-colors h4 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-item label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
}

.color-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input-wrapper input[type="color"] {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.color-text {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'SF Mono', monospace;
  font-size: 12px;
}

.color-description {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* 标签页 */
.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}

.tab-btn {
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  top: 1px;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-btn.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
  background: var(--bg-secondary);
}

/* 快捷键列表 */
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.shortcut-info {
  flex: 1;
}

.shortcut-action {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.shortcut-keys {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'SF Mono', monospace;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
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
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}

.btn-danger {
  background: rgba(255, 59, 48, 0.15);
  color: var(--error-color);
  border: 1px solid rgba(255, 59, 48, 0.3);
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.25);
  border-color: rgba(255, 59, 48, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* AI 配置面板 - 紧凑设计 */
.ai-config-panel {
  background: rgba(10, 132, 255, 0.05);
  border: 1px solid rgba(10, 132, 255, 0.15);
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.config-label-sm {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: block;
}

.loading-indicator {
  font-size: 10px;
  margin-left: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.config-input-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.api-key-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
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
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 14px;
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
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.provider-select:focus {
  border-color: rgba(10, 132, 255, 0.6);
  background: rgba(0, 0, 0, 0.4);
}

.provider-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 4px 10px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.2);
  border-radius: 4px;
  color: var(--accent-color);
  font-size: 11px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.provider-link:hover {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.4);
}

.config-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.config-row-compact {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
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
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
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
  padding: 8px 16px;
  font-size: 12px;
  white-space: nowrap;
}

.stats-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-badge {
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>

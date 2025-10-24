<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAIStore, AI_PROVIDERS } from '../stores/ai'

const props = defineProps({
  mode: String, // 'terminal' or 'ai'
  currentModel: String,
  sessionId: Number
})

const emit = defineEmits(['update:mode', 'update:currentModel', 'mention-file'])

const aiStore = useAIStore()
const showModelPicker = ref(false)
const availableModels = ref([])
const loadingModels = ref(false)

// 当前工作目录
const currentDir = ref('~')

// 模式选项
const modes = [
  { id: 'terminal', name: '终端模式', icon: '⌨️', color: '#34C759' },
  { id: 'ai', name: 'AI 模式', icon: '🤖', color: '#0A84FF' }
]

// 加载可用模型
async function loadModels() {
  if (!aiStore.isConfigured) {
    // 未配置时使用默认模型
    const defaultModel = AI_PROVIDERS[aiStore.provider]?.defaultModel || 'gpt-4o-mini'
    availableModels.value = [{ id: defaultModel, name: defaultModel }]
    return
  }

  loadingModels.value = true
  try {
    const models = await aiStore.fetchAvailableModels()
    availableModels.value = models
  } catch (error) {
    console.warn('加载模型列表失败:', error)
    // 使用默认模型作为后备
    const defaultModel = AI_PROVIDERS[aiStore.provider]?.defaultModel || 'gpt-4o-mini'
    availableModels.value = [{ id: defaultModel, name: defaultModel }]
  } finally {
    loadingModels.value = false
  }
}

// 初始化时加载模型
onMounted(() => {
  loadModels()
})

// 监听配置变化，重新加载模型
watch(() => [aiStore.provider, aiStore.apiKey, aiStore.apiEndpoint], () => {
  loadModels()
}, { deep: true })

// 获取当前工作目录
const getCurrentDir = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    // 通过执行 pwd 命令获取当前目录
    // 这需要终端支持
    return currentDir.value
  } catch (error) {
    return '~'
  }
}

// 防止重复触发
const isSwitching = ref(false)

// 切换模式（带防抖保护）
const switchMode = (modeId) => {
  // 如果已经是当前模式，忽略
  if (modeId === props.mode) return
  
  // 如果正在切换中，忽略
  if (isSwitching.value) return
  
  // 标记为切换中
  isSwitching.value = true
  
  // 发出切换事件
  emit('update:mode', modeId)
  
  // 600ms 后解除锁定（足够完成初始化）
  setTimeout(() => {
    isSwitching.value = false
  }, 600)
}

// 选择模型
const selectModel = (modelId) => {
  emit('update:currentModel', modelId)
  showModelPicker.value = false
}

// 触发文件选择
const triggerFilePicker = () => {
  emit('mention-file')
}

// 当前模式配置
const currentModeConfig = computed(() => {
  return modes.find(m => m.id === props.mode) || modes[0]
})

// 当前模型名称
const currentModelName = computed(() => {
  // 如果有 currentModel，直接显示
  if (props.currentModel) {
    return props.currentModel
  }
  // 否则显示第一个可用模型
  return availableModels.value[0]?.id || 'gpt-4o-mini'
})
</script>

<template>
  <div class="warp-mode-bar">
    <!-- 左侧：模式切换器 -->
    <div class="mode-switcher">
      <div
        v-for="mode in modes"
        :key="mode.id"
        :class="['mode-btn', { active: mode.id === props.mode, disabled: isSwitching }]"
        @click="switchMode(mode.id)"
        :style="{ '--mode-color': mode.color }"
      >
        <span class="mode-icon">{{ mode.icon }}</span>
        <span class="mode-name">{{ mode.name }}</span>
      </div>
    </div>

    <!-- 中间：功能按钮 -->
    <div class="actions" v-if="props.mode === 'ai'">
      <button class="action-btn" @click="triggerFilePicker" title="@ 选择文件">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C9.1 2 10 2.9 10 4C10 5.1 9.1 6 8 6C6.9 6 6 5.1 6 4C6 2.9 6.9 2 8 2ZM8 12C6.9 12 6 11.1 6 10C6 8.9 6.9 8 8 8C9.1 8 10 8.9 10 10C10 11.1 9.1 12 8 12ZM8 7C9.66 7 11 8.34 11 10C11 11.66 9.66 13 8 13C6.34 13 5 11.66 5 10C5 8.34 6.34 7 8 7Z" fill="currentColor"/>
        </svg>
        <span>@ 文件</span>
      </button>
      
      <div class="divider"></div>
      
      <!-- 模型选择器 -->
      <div class="model-selector">
        <button 
          class="model-btn" 
          @click="showModelPicker = !showModelPicker"
          :disabled="!aiStore.isConfigured || loadingModels"
        >
          <svg v-if="!loadingModels" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 1V3M7 11V13M13 7H11M3 7H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span v-if="loadingModels" class="loading-indicator">⏳</span>
          <span class="model-name">{{ loadingModels ? '加载中...' : currentModelName }}</span>
          <svg v-if="!loadingModels" width="10" height="10" viewBox="0 0 10 10" fill="none" class="chevron">
            <path d="M2 4L5 7L8 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <!-- 模型下拉菜单 -->
        <div v-if="showModelPicker" class="model-picker" @click.stop>
          <div class="picker-header">
            <span>选择模型 - {{ aiStore.currentProvider.name }}</span>
            <button class="close-btn" @click="showModelPicker = false">✕</button>
          </div>
          <div class="model-list">
            <div
              v-for="model in availableModels"
              :key="model.id"
              :class="['model-item', { active: model.id === props.currentModel }]"
              @click="selectModel(model.id)"
            >
              <span class="model-item-name">{{ model.id }}</span>
              <svg v-if="model.id === props.currentModel" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 5" stroke="#0A84FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：状态指示器 -->
    <div class="status">
      <div class="status-indicator" :class="{ active: aiStore.isConfigured && props.mode === 'ai' }">
        <span class="dot"></span>
        <span class="text">{{ aiStore.isConfigured ? 'AI 就绪' : '未配置' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warp-mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  gap: 12px;
  position: relative;
  z-index: 10;
}

/* 模式切换器 */
.mode-switcher {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 3px;
  border-radius: 8px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.mode-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--mode-color, var(--accent-color));
  color: white;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.3);
}

.mode-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.mode-icon {
  font-size: 16px;
  line-height: 1;
}

.mode-name {
  font-size: 13px;
}

/* 功能按钮区域 */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.action-btn svg {
  opacity: 0.8;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
}

/* 模型选择器 */
.model-selector {
  position: relative;
}

.model-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--accent-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.model-btn:hover:not(:disabled) {
  background: var(--bg-active);
  border-color: var(--accent-hover);
}

.model-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-btn .chevron {
  transition: transform 0.2s ease;
}

.model-btn:hover .chevron {
  transform: translateY(1px);
}

/* 模型选择器下拉菜单 */
.model-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  z-index: 1000;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--error-color);
  color: white;
}

.model-list {
  max-height: 320px;
  overflow-y: auto;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.model-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.model-item.active {
  background: var(--bg-active);
  color: var(--accent-color);
}

.model-item-name {
  font-size: 13px;
  font-weight: 500;
}

/* 状态指示器 */
.status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-indicator.active {
  background: rgba(52, 199, 89, 0.15);
  color: var(--success-color);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.status-indicator.active .dot {
  background: var(--success-color);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.text {
  font-weight: 500;
}
</style>


<script setup>
import { ref, watch } from 'vue'
import { useTaskStore } from '../stores/task'
import { useAIStore } from '../stores/ai'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const taskStore = useTaskStore()
const aiStore = useAIStore()

const form = ref({
  name: props.initialData?.name || '',
  command: props.initialData?.command || '',
  group: props.initialData?.group || '默认分组'
})

// AI 功能状态
const showAIGenerator = ref(false)
const aiDescription = ref('')
const aiGenerating = ref(false)
const aiSuggestion = ref('')

watch(() => props.initialData, (newData) => {
  if (newData) {
    form.value = {
      name: newData.name,
      command: newData.command,
      group: newData.group || '默认分组'
    }
  } else {
    form.value = { name: '', command: '', group: '默认分组' }
  }
}, { immediate: true })

const showNewGroupInput = ref(false)
const newGroupName = ref('')

const handleAddGroup = () => {
  if (newGroupName.value.trim()) {
    taskStore.addGroup(newGroupName.value.trim())
    form.value.group = newGroupName.value.trim()
    newGroupName.value = ''
    showNewGroupInput.value = false
  }
}

const templates = [
  { name: 'NPM 安装', command: 'npm install' },
  { name: 'NPM 构建', command: 'npm run build' },
  { name: 'NPM 测试', command: 'npm test' },
  { name: '列出文件', command: 'ls -la' },
  { name: '磁盘使用', command: 'df -h' },
  { name: 'Git 状态', command: 'git status' },
  { name: 'Git 拉取', command: 'git pull' },
  { name: 'Ping 测试', command: 'ping -c 5 google.com' },
]

const useTemplate = (template) => {
  form.value.name = template.name
  form.value.command = template.command
}

// AI 生成命令
const generateAICommand = async () => {
  if (!aiDescription.value.trim()) {
    alert('请描述你想做什么')
    return
  }
  
  if (!aiStore.isConfigured) {
    alert('请先在设置中配置 OpenAI API Key')
    return
  }
  
  aiGenerating.value = true
  aiSuggestion.value = ''
  
  try {
    const command = await aiStore.generateCommand(aiDescription.value)
    aiSuggestion.value = command
  } catch (error) {
    alert(`AI 生成失败: ${error.message}`)
  } finally {
    aiGenerating.value = false
  }
}

// 使用 AI 建议的命令
const useAISuggestion = () => {
  form.value.command = aiSuggestion.value
  if (!form.value.name) {
    form.value.name = aiDescription.value.slice(0, 30)
  }
  aiSuggestion.value = ''
  aiDescription.value = ''
  showAIGenerator.value = false
}

const handleSubmit = () => {
  if (!form.value.name.trim() || !form.value.command.trim()) {
    alert('请填写任务名称和命令')
    return
  }
  emit('submit', form.value)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleCancel">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ initialData ? '编辑任务' : '新建任务' }}</h2>
        <button class="close-btn" @click="handleCancel">✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="task-name">任务名称</label>
          <input
            id="task-name"
            v-model="form.name"
            type="text"
            placeholder="例如: 安装依赖"
            class="input"
            autofocus
          />
        </div>

        <div class="form-group">
          <div class="label-with-ai">
            <label for="task-command">命令</label>
            <button 
              type="button"
              class="ai-toggle-btn"
              @click="showAIGenerator = !showAIGenerator"
              :class="{ active: showAIGenerator }"
            >
              ✨ AI 生成
            </button>
          </div>
          
          <!-- AI 生成器 -->
          <div v-if="showAIGenerator" class="ai-generator">
            <input
              v-model="aiDescription"
              type="text"
              placeholder="用自然语言描述你想做什么，例如：列出所有 Docker 容器"
              class="ai-input"
              @keyup.enter="generateAICommand"
            />
            <button
              type="button"
              @click="generateAICommand"
              :disabled="!aiDescription.trim() || aiGenerating"
              class="btn btn-primary btn-sm"
            >
              {{ aiGenerating ? '生成中...' : '生成' }}
            </button>
            
            <div v-if="aiSuggestion" class="ai-suggestion">
              <div class="suggestion-header">
                <span>🤖 AI 建议:</span>
                <button type="button" @click="useAISuggestion" class="btn btn-primary btn-xs">
                  使用此命令
                </button>
              </div>
              <code class="suggestion-code">{{ aiSuggestion }}</code>
            </div>
          </div>
          
          <textarea
            id="task-command"
            v-model="form.command"
            placeholder="例如: npm install"
            class="textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="task-group">分组</label>
          <div class="group-selector">
            <select 
              id="task-group" 
              v-model="form.group" 
              class="input"
            >
              <option v-for="group in taskStore.groups" :key="group" :value="group">
                {{ group }}
              </option>
            </select>
            <button 
              class="btn-add-group" 
              @click="showNewGroupInput = !showNewGroupInput"
              type="button"
            >
              {{ showNewGroupInput ? '✕' : '+' }}
            </button>
          </div>
          <div v-if="showNewGroupInput" class="new-group-input">
            <input
              v-model="newGroupName"
              type="text"
              placeholder="新分组名称"
              class="input"
              @keyup.enter="handleAddGroup"
            />
            <button class="btn btn-primary" @click="handleAddGroup" type="button">
              添加
            </button>
          </div>
        </div>

        <div class="templates">
          <div class="templates-label">快速模板:</div>
          <div class="template-buttons">
            <button
              v-for="template in templates"
              :key="template.name"
              class="template-btn"
              @click="useTemplate(template)"
            >
              {{ template.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleCancel">
          取消
        </button>
        <button class="btn btn-primary" @click="handleSubmit">
          创建
        </button>
      </div>
    </div>
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
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 640px;
  box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--bg-tertiary);
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.9);
  color: white;
  transform: scale(1.05) rotate(90deg);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.input,
.textarea {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.15);
}

.textarea {
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  resize: vertical;
  min-height: 90px;
  line-height: 1.6;
}

.input:hover,
.textarea:hover {
  border-color: var(--border-hover);
  background: var(--bg-secondary);
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: rgba(10, 132, 255, 0.7);
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(10, 132, 255, 0.15);
}

.templates {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.templates-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

.template-btn:hover {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.2) 0%, rgba(10, 132, 255, 0.15) 100%);
  border-color: rgba(10, 132, 255, 0.4);
  color: var(--text-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.2);
}

.template-btn:active {
  transform: translateY(0);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: #0a84ff;
  color: white;
}

.btn-primary:hover {
  background: #0077ed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.group-selector {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.group-selector select {
  flex: 1;
}

.btn-add-group {
  width: 40px;
  height: 42px;
  border: 1px solid var(--border-color);
  background: rgba(10, 132, 255, 0.15);
  color: var(--accent-color);
  border-radius: 10px;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add-group:hover {
  background: rgba(10, 132, 255, 0.25);
  border-color: rgba(10, 132, 255, 0.4);
  transform: scale(1.05);
}

.new-group-input {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.new-group-input input {
  flex: 1;
}

.new-group-input .btn {
  padding: 10px 16px;
  white-space: nowrap;
}

/* AI 生成器样式 */
.label-with-ai {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ai-toggle-btn {
  padding: 6px 12px;
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.2);
  border-radius: 6px;
  color: var(--accent-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-toggle-btn:hover {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.4);
}

.ai-toggle-btn.active {
  background: rgba(10, 132, 255, 0.25);
  border-color: rgba(10, 132, 255, 0.5);
}

.ai-generator {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(10, 132, 255, 0.05);
  border: 1px solid rgba(10, 132, 255, 0.15);
  border-radius: 10px;
  margin-bottom: 12px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.ai-input:focus {
  border-color: rgba(10, 132, 255, 0.6);
  background: var(--bg-secondary);
}

.ai-suggestion {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  animation: slideDown 0.3s ease;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

.suggestion-code {
  display: block;
  background: var(--bg-secondary);
  padding: 10px 12px;
  border-radius: 6px;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 13px;
  color: #64d2ff;
  word-break: break-all;
  white-space: pre-wrap;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 12px;
}
</style>

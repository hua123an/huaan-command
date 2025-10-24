<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useAIStore } from '../stores/ai'

const aiStore = useAIStore()
const userInput = ref('')
const chatContainer = ref(null)
const inputRef = ref(null)

const emit = defineEmits(['close'])

// 自动滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) return
  
  const message = userInput.value.trim()
  userInput.value = ''
  
  try {
    await aiStore.chat(message)
    scrollToBottom()
  } catch (error) {
    console.error('Chat error:', error)
  }
}

// 快捷问题
const quickQuestions = [
  '如何列出所有 Docker 容器？',
  '怎么清理 node_modules？',
  '推荐一个部署流程',
  '查看端口占用情况'
]

const askQuick = (question) => {
  userInput.value = question
  sendMessage()
}

onMounted(() => {
  scrollToBottom()
  inputRef.value?.focus()
})
</script>

<template>
  <div class="ai-chat-panel">
    <div class="chat-header">
      <div class="header-left">
        <span class="ai-icon">🤖</span>
        <h3>AI 助手</h3>
        <span class="status" :class="{ online: aiStore.isConfigured }">
          {{ aiStore.isConfigured ? '在线' : '未配置' }}
        </span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="aiStore.clearChat()" title="清空对话">
          🗑️
        </button>
        <button class="icon-btn" @click="emit('close')" title="关闭">
          ✕
        </button>
      </div>
    </div>

    <div class="chat-body">
      <div v-if="aiStore.chatMessages.length === 0" class="welcome">
        <div class="welcome-icon">✨</div>
        <h4>你好！我是 AI 助手</h4>
        <p>我可以帮你生成命令、诊断错误、推荐工作流...</p>
        
        <div class="quick-questions">
          <div class="quick-label">试试这些问题：</div>
          <button
            v-for="question in quickQuestions"
            :key="question"
            class="quick-btn"
            @click="askQuick(question)"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <div v-else ref="chatContainer" class="chat-messages">
        <div
          v-for="message in aiStore.chatMessages"
          :key="message.id"
          :class="['message', message.role, { error: message.isError }]"
        >
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-time">
              {{ new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) }}
            </div>
          </div>
        </div>

        <div v-if="aiStore.isGenerating" class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-footer">
      <div class="input-container">
        <input
          ref="inputRef"
          v-model="userInput"
          type="text"
          placeholder="输入消息... (Enter 发送)"
          @keyup.enter="sendMessage"
          :disabled="!aiStore.isConfigured || aiStore.isGenerating"
          class="chat-input"
        />
        <button
          @click="sendMessage"
          :disabled="!userInput.trim() || !aiStore.isConfigured || aiStore.isGenerating"
          class="send-btn"
        >
          {{ aiStore.isGenerating ? '⏳' : '📤' }}
        </button>
      </div>
      
      <div v-if="!aiStore.isConfigured" class="config-hint">
        ⚠️ 请先在设置中配置 OpenAI API Key
      </div>
    </div>
  </div>
</template>

<script>
// 格式化消息内容（支持代码块）
function formatMessage(content) {
  if (!content) return ''
  
  // 转义 HTML
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 代码块高亮
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code>${code.trim()}</code></pre>`
  })
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 换行
  html = html.replace(/\n/g, '<br>')
  
  return html
}

export default {
  methods: {
    formatMessage
  }
}
</script>

<style scoped>
.ai-chat-panel {
  width: 420px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon {
  font-size: 24px;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.status.online {
  background: rgba(50, 215, 75, 0.2);
  color: var(--success-color);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: var(--bg-hover);
}

.chat-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.welcome h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.welcome p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 300px;
}

.quick-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.quick-btn {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.quick-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: translateX(4px);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: rgba(10, 132, 255, 0.2);
}

.message.assistant .message-avatar {
  background: rgba(50, 215, 75, 0.2);
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message.user .message-text {
  background: rgba(10, 132, 255, 0.15);
  color: var(--text-primary);
  border: 1px solid rgba(10, 132, 255, 0.2);
}

.message.assistant .message-text {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.message.error .message-text {
  background: rgba(255, 69, 58, 0.15);
  border-color: rgba(255, 69, 58, 0.3);
  color: var(--error-color);
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
  padding-left: 16px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

.chat-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.input-container {
  display: flex;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input:focus {
  border-color: var(--accent-color);
  background: var(--bg-primary);
}

.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  border-radius: 50%;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.config-hint {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(255, 214, 10, 0.1);
  border: 1px solid rgba(255, 214, 10, 0.2);
  border-radius: 8px;
  color: #ffd60a;
  font-size: 12px;
  text-align: center;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 3px;
}

/* 代码块样式 */
:deep(.code-block) {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid var(--border-color);
}

:deep(.inline-code) {
  background: var(--bg-active);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 12px;
  color: var(--accent-color);
}

:deep(strong) {
  font-weight: 600;
  color: var(--text-primary);
}
</style>


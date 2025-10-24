<script setup>
import { ref } from 'vue'
import { useWorkflowStore } from '../stores/workflow'
import { useTaskStore } from '../stores/task'

const emit = defineEmits(['close'])

const workflowStore = useWorkflowStore()
const taskStore = useTaskStore()

const selectedWorkflow = ref(null)

const applyWorkflow = async (workflow) => {
  selectedWorkflow.value = workflow
  
  // 为工作流中的每个任务创建实际任务
  for (const task of workflow.tasks) {
    await taskStore.createTask(task.name, task.command, task.group)
  }
  
  // 显示成功提示
  alert(`成功应用工作流 "${workflow.name}"，已创建 ${workflow.tasks.length} 个任务！`)
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>工作流模板</h2>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="workflow-grid">
          <div
            v-for="workflow in workflowStore.allWorkflows"
            :key="workflow.id"
            class="workflow-card"
            @click="applyWorkflow(workflow)"
          >
            <div class="workflow-icon">{{ workflow.icon }}</div>
            <div class="workflow-info">
              <h3 class="workflow-name">{{ workflow.name }}</h3>
              <p class="workflow-description">{{ workflow.description }}</p>
              <div class="workflow-tasks">
                <span class="task-count">{{ workflow.tasks.length }} 个任务</span>
              </div>
            </div>
            <div class="workflow-preview">
              <div v-for="(task, index) in workflow.tasks.slice(0, 3)" :key="index" class="preview-task">
                {{ index + 1 }}. {{ task.name }}
              </div>
              <div v-if="workflow.tasks.length > 3" class="preview-more">
                +{{ workflow.tasks.length - 3 }} 更多...
              </div>
            </div>
          </div>
        </div>
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
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.workflow-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.workflow-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top left, rgba(10, 132, 255, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.workflow-card:hover {
  background: var(--bg-hover);
  border-color: rgba(10, 132, 255, 0.4);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(10, 132, 255, 0.2);
}

.workflow-card:hover::before {
  opacity: 1;
}

.workflow-icon {
  font-size: 48px;
  margin-bottom: 16px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.workflow-info {
  margin-bottom: 16px;
}

.workflow-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  letter-spacing: -0.2px;
}

.workflow-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.workflow-tasks {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-count {
  font-size: 12px;
  color: rgba(10, 132, 255, 0.9);
  background: rgba(10, 132, 255, 0.15);
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
  border: 1px solid rgba(10, 132, 255, 0.2);
}

.workflow-preview {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-task {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
}

.preview-more {
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
  margin-top: 4px;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>


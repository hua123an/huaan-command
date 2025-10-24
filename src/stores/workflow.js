import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWorkflowStore = defineStore('workflow', () => {
  const workflows = ref([
    {
      id: 'frontend-deploy',
      name: '前端部署',
      icon: '📦',
      description: 'NPM 安装、构建和部署流程',
      tasks: [
        { name: '安装依赖', command: 'npm install', group: '部署' },
        { name: '运行测试', command: 'npm test', group: '部署' },
        { name: '构建项目', command: 'npm run build', group: '部署' },
        { name: '部署到服务器', command: 'npm run deploy', group: '部署' }
      ]
    },
    {
      id: 'full-test',
      name: '完整测试套件',
      icon: '🧪',
      description: '运行所有类型的测试',
      tasks: [
        { name: '单元测试', command: 'npm run test:unit', group: '测试' },
        { name: '集成测试', command: 'npm run test:integration', group: '测试' },
        { name: 'E2E 测试', command: 'npm run test:e2e', group: '测试' }
      ]
    },
    {
      id: 'git-workflow',
      name: 'Git 工作流',
      icon: '🔀',
      description: 'Git 拉取、检查状态和推送',
      tasks: [
        { name: 'Git 拉取', command: 'git pull origin main', group: '开发' },
        { name: 'Git 状态', command: 'git status', group: '开发' },
        { name: 'Git 日志', command: 'git log --oneline -10', group: '开发' }
      ]
    },
    {
      id: 'docker-build',
      name: 'Docker 构建和部署',
      icon: '🐳',
      description: 'Docker 镜像构建和容器运行',
      tasks: [
        { name: '构建镜像', command: 'docker build -t myapp:latest .', group: '部署' },
        { name: '停止旧容器', command: 'docker stop myapp || true', group: '部署' },
        { name: '删除旧容器', command: 'docker rm myapp || true', group: '部署' },
        { name: '运行新容器', command: 'docker run -d --name myapp -p 3000:3000 myapp:latest', group: '部署' }
      ]
    },
    {
      id: 'code-quality',
      name: '代码质量检查',
      icon: '✨',
      description: 'Lint、格式化和类型检查',
      tasks: [
        { name: 'ESLint 检查', command: 'npm run lint', group: '开发' },
        { name: '代码格式化', command: 'npm run format', group: '开发' },
        { name: '类型检查', command: 'npm run type-check', group: '开发' }
      ]
    },
    {
      id: 'database-backup',
      name: '数据库备份',
      icon: '💾',
      description: '数据库备份和验证流程',
      tasks: [
        { name: '创建备份目录', command: 'mkdir -p backups', group: '默认分组' },
        { name: '导出数据库', command: 'mongodump --out=backups/$(date +%Y%m%d)', group: '默认分组' },
        { name: '压缩备份', command: 'tar -czf backups/db-$(date +%Y%m%d).tar.gz backups/$(date +%Y%m%d)', group: '默认分组' }
      ]
    },
    {
      id: 'local-dev',
      name: '本地开发环境',
      icon: '💻',
      description: '启动本地开发服务',
      tasks: [
        { name: '安装依赖', command: 'npm install', group: '开发' },
        { name: '启动数据库', command: 'docker-compose up -d db', group: '开发' },
        { name: '运行开发服务器', command: 'npm run dev', group: '开发' }
      ]
    },
    {
      id: 'security-audit',
      name: '安全审计',
      icon: '🔒',
      description: '依赖安全检查和更新',
      tasks: [
        { name: 'NPM 审计', command: 'npm audit', group: '开发' },
        { name: '检查过时依赖', command: 'npm outdated', group: '开发' },
        { name: '更新依赖', command: 'npm update', group: '开发' }
      ]
    }
  ])

  // 自定义工作流
  const customWorkflows = ref([])

  // 从 localStorage 加载
  function loadWorkflows() {
    const saved = localStorage.getItem('huaan-custom-workflows')
    if (saved) {
      try {
        customWorkflows.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load custom workflows:', e)
      }
    }
  }

  // 保存到 localStorage
  function saveWorkflows() {
    localStorage.setItem('huaan-custom-workflows', JSON.stringify(customWorkflows.value))
  }

  // 创建自定义工作流
  function createWorkflow(workflow) {
    const newWorkflow = {
      id: `custom-${Date.now()}`,
      ...workflow,
      isCustom: true
    }
    customWorkflows.value.push(newWorkflow)
    saveWorkflows()
    return newWorkflow
  }

  // 删除自定义工作流
  function deleteWorkflow(workflowId) {
    const index = customWorkflows.value.findIndex(w => w.id === workflowId)
    if (index > -1) {
      customWorkflows.value.splice(index, 1)
      saveWorkflows()
    }
  }

  // 获取所有工作流（包括预设和自定义）
  const allWorkflows = computed(() => {
    return [...workflows.value, ...customWorkflows.value]
  })

  // 初始化
  loadWorkflows()

  return {
    workflows,
    customWorkflows,
    allWorkflows,
    createWorkflow,
    deleteWorkflow
  }
})


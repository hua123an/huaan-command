import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnippetsStore = defineStore('snippets', () => {
  const snippets = ref([])
  
  // 默认代码片段
  const defaultSnippets = [
    {
      id: 'git-commit-push',
      name: 'Git 提交并推送',
      description: '添加所有更改，提交并推送到远程',
      command: 'git add . && git commit -m "$1" && git push',
      variables: ['提交信息'],
      category: 'git',
      hotkey: null
    },
    {
      id: 'npm-fresh-install',
      name: 'NPM 全新安装',
      description: '删除 node_modules 并重新安装',
      command: 'rm -rf node_modules package-lock.json && npm install',
      variables: [],
      category: 'npm',
      hotkey: null
    },
    {
      id: 'docker-cleanup',
      name: 'Docker 清理',
      description: '清理所有未使用的 Docker 资源',
      command: 'docker system prune -af && docker volume prune -f',
      variables: [],
      category: 'docker',
      hotkey: null
    },
    {
      id: 'find-port',
      name: '查找端口占用',
      description: '查找占用指定端口的进程',
      command: 'lsof -ti:$1',
      variables: ['端口号'],
      category: 'system',
      hotkey: null
    },
    {
      id: 'kill-port',
      name: '杀死端口进程',
      description: '杀死占用指定端口的进程',
      command: 'lsof -ti:$1 | xargs kill -9',
      variables: ['端口号'],
      category: 'system',
      hotkey: null
    },
    {
      id: 'git-undo-commit',
      name: 'Git 撤销最后一次提交',
      description: '撤销最后一次提交但保留更改',
      command: 'git reset --soft HEAD~1',
      variables: [],
      category: 'git',
      hotkey: null
    },
    {
      id: 'create-react-component',
      name: '创建 React 组件',
      description: '创建一个新的 React 函数组件',
      command: 'mkdir -p src/components/$1 && cat > src/components/$1/$1.jsx << EOF\nimport React from \'react\';\n\nexport default function $1() {\n  return (\n    <div>\n      <h1>$1</h1>\n    </div>\n  );\n}\nEOF',
      variables: ['组件名'],
      category: 'react',
      hotkey: null
    },
    {
      id: 'git-branch-cleanup',
      name: 'Git 清理本地分支',
      description: '删除所有已合并的本地分支',
      command: 'git branch --merged | grep -v "\\*" | grep -v "main" | grep -v "master" | xargs -n 1 git branch -d',
      variables: [],
      category: 'git',
      hotkey: null
    }
  ]
  
  // 分类列表
  const categories = ['git', 'npm', 'docker', 'system', 'react', 'custom']
  
  // 加载代码片段
  function loadSnippets() {
    try {
      const saved = localStorage.getItem('huaan-snippets')
      if (saved) {
        snippets.value = JSON.parse(saved)
      } else {
        // 首次使用，加载默认片段
        snippets.value = [...defaultSnippets]
        saveSnippets()
      }
    } catch (error) {
      console.error('加载代码片段失败:', error)
      snippets.value = [...defaultSnippets]
    }
  }
  
  // 保存代码片段
  function saveSnippets() {
    try {
      localStorage.setItem('huaan-snippets', JSON.stringify(snippets.value))
    } catch (error) {
      console.error('保存代码片段失败:', error)
    }
  }
  
  // 添加代码片段
  function addSnippet(snippet) {
    const newSnippet = {
      ...snippet,
      id: snippet.id || `snippet-${Date.now()}`,
      category: snippet.category || 'custom'
    }
    snippets.value.push(newSnippet)
    saveSnippets()
    return newSnippet
  }
  
  // 更新代码片段
  function updateSnippet(id, updates) {
    const index = snippets.value.findIndex(s => s.id === id)
    if (index !== -1) {
      snippets.value[index] = { ...snippets.value[index], ...updates }
      saveSnippets()
    }
  }
  
  // 删除代码片段
  function deleteSnippet(id) {
    const index = snippets.value.findIndex(s => s.id === id)
    if (index !== -1) {
      snippets.value.splice(index, 1)
      saveSnippets()
    }
  }
  
  // 获取代码片段
  function getSnippet(id) {
    return snippets.value.find(s => s.id === id)
  }
  
  // 按分类获取代码片段
  function getSnippetsByCategory(category) {
    return snippets.value.filter(s => s.category === category)
  }
  
  // 搜索代码片段
  function searchSnippets(query) {
    const lowerQuery = query.toLowerCase()
    return snippets.value.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.command.toLowerCase().includes(lowerQuery)
    )
  }
  
  // 解析变量并生成最终命令
  function parseSnippet(snippet, values = []) {
    let command = snippet.command
    values.forEach((value, index) => {
      command = command.replace(new RegExp(`\\$${index + 1}`, 'g'), value)
    })
    return command
  }
  
  // 重置为默认片段
  function resetToDefaults() {
    snippets.value = [...defaultSnippets]
    saveSnippets()
  }
  
  // 初始化
  loadSnippets()
  
  return {
    snippets,
    categories,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    getSnippet,
    getSnippetsByCategory,
    searchSnippets,
    parseSnippet,
    resetToDefaults
  }
})


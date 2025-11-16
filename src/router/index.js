import { createRouter, createWebHistory } from 'vue-router'

// 路由懒加载优化 - 只保留核心功能
const Terminal = () => import('../views/Terminal.vue')
const GitPage = () => import('../views/GitPage.vue')

const routes = [
  {
    path: '/',
    name: 'Terminal',
    component: Terminal
  },
  {
    path: '/git',
    name: 'GitVisualization',
    component: GitPage,
    meta: {
      title: 'Git 可视化',
      icon: '📚'
    }
  },
  // 重定向旧的任务路由到终端
  {
    path: '/tasks',
    redirect: '/'
  },
  // 重定向旧的设置路由到终端（设置现在是弹窗模式）
  {
    path: '/settings',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

import { createRouter, createWebHistory } from 'vue-router'

// 路由懒加载优化
const Terminal = () => import('../views/Terminal.vue')
const Tasks = () => import('../views/Tasks.vue')
const Settings = () => import('../views/Settings.vue')

const routes = [
  {
    path: '/',
    name: 'Tasks',
    component: Tasks
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: Terminal
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

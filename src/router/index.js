import { createRouter, createWebHistory } from 'vue-router'

// 路由懒加载优化 - 只保留核心功能
const Terminal = () => import('../views/Terminal.vue')

const routes = [
  {
    path: '/',
    name: 'Terminal',
    component: Terminal
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

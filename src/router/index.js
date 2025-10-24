import { createRouter, createWebHistory } from 'vue-router'
import Terminal from '../views/Terminal.vue'
import Tasks from '../views/Tasks.vue'
import Settings from '../views/Settings.vue'

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

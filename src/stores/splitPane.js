import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSplitPaneStore = defineStore('splitPane', () => {
  const panes = ref([])
  const activePane = ref(null)
  const layout = ref('single') // 'single' | 'horizontal' | 'vertical' | 'grid'

  // 创建新面板
  function createPane(config = {}) {
    const pane = {
      id: `pane-${Date.now()}`,
      sessionId: config.sessionId || null,
      position: config.position || 'center',
      size: config.size || 50, // 百分比
      ...config
    }
    panes.value.push(pane)
    if (!activePane.value) {
      activePane.value = pane.id
    }
    return pane
  }

  // 删除面板
  function removePane(id) {
    const index = panes.value.findIndex(p => p.id === id)
    if (index !== -1) {
      panes.value.splice(index, 1)
      if (activePane.value === id) {
        activePane.value = panes.value[0]?.id || null
      }
    }
  }

  // 设置布局
  function setLayout(newLayout) {
    layout.value = newLayout
    if (newLayout === 'single' && panes.value.length > 1) {
      // 切换到单面板模式时，只保留第一个
      panes.value = [panes.value[0]]
    }
  }

  // 水平分割
  function splitHorizontal() {
    if (layout.value === 'single') {
      createPane({ position: 'bottom', size: 50 })
      layout.value = 'horizontal'
    }
  }

  // 垂直分割
  function splitVertical() {
    if (layout.value === 'single') {
      createPane({ position: 'right', size: 50 })
      layout.value = 'vertical'
    }
  }

  // 调整面板大小
  function resizePane(id, size) {
    const pane = panes.value.find(p => p.id === id)
    if (pane) {
      pane.size = size
    }
  }

  // 设置活动面板
  function setActivePane(id) {
    activePane.value = id
  }

  return {
    panes,
    activePane,
    layout,
    createPane,
    removePane,
    setLayout,
    splitHorizontal,
    splitVertical,
    resizePane,
    setActivePane
  }
})


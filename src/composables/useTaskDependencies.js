import { ref, computed, watch } from 'vue'
import { useTaskStore } from '../stores/task'

// 任务依赖关系管理
export function useTaskDependencies() {
  const taskStore = useTaskStore()
  
  // 状态
  const dependencies = ref(new Map()) // taskId -> Set of dependencyIds
  const dependents = ref(new Map()) // taskId -> Set of dependentIds
  const executionOrder = ref([])
  
  // 添加依赖关系
  const addDependency = (taskId, dependsOnId) => {
    if (taskId === dependsOnId) {
      throw new Error('任务不能依赖自己')
    }
    
    // 检查循环依赖
    if (wouldCreateCycle(taskId, dependsOnId)) {
      throw new Error('会创建循环依赖')
    }
    
    // 添加依赖
    if (!dependencies.value.has(taskId)) {
      dependencies.value.set(taskId, new Set())
    }
    dependencies.value.get(taskId).add(dependsOnId)
    
    // 添加反向依赖
    if (!dependents.value.has(dependsOnId)) {
      dependents.value.set(dependsOnId, new Set())
    }
    dependents.value.get(dependsOnId).add(taskId)
    
    updateExecutionOrder()
  }
  
  // 移除依赖关系
  const removeDependency = (taskId, dependsOnId) => {
    if (dependencies.value.has(taskId)) {
      dependencies.value.get(taskId).delete(dependsOnId)
      if (dependencies.value.get(taskId).size === 0) {
        dependencies.value.delete(taskId)
      }
    }
    
    if (dependents.value.has(dependsOnId)) {
      dependents.value.get(dependsOnId).delete(taskId)
      if (dependents.value.get(dependsOnId).size === 0) {
        dependents.value.delete(dependsOnId)
      }
    }
    
    updateExecutionOrder()
  }
  
  // 检查是否会产生循环依赖
  const wouldCreateCycle = (taskId, dependsOnId) => {
    const visited = new Set()
    const stack = [dependsOnId]
    
    while (stack.length > 0) {
      const current = stack.pop()
      
      if (current === taskId) {
        return true
      }
      
      if (visited.has(current)) {
        continue
      }
      
      visited.add(current)
      
      const deps = dependencies.value.get(current)
      if (deps) {
        deps.forEach(dep => stack.push(dep))
      }
    }
    
    return false
  }
  
  // 更新执行顺序（拓扑排序）
  const updateExecutionOrder = () => {
    const visited = new Set()
    const order = []
    const allTasks = new Set()
    
    // 收集所有任务
    dependencies.value.forEach((deps, taskId) => {
      allTasks.add(taskId)
      deps.forEach(dep => allTasks.add(dep))
    })
    
    // 拓扑排序
    const visit = (taskId) => {
      if (visited.has(taskId)) return
      
      visited.add(taskId)
      
      const deps = dependencies.value.get(taskId)
      if (deps) {
        deps.forEach(dep => visit(dep))
      }
      
      order.push(taskId)
    }
    
    allTasks.forEach(taskId => visit(taskId))
    executionOrder.value = order
  }
  
  // 获取任务的直接依赖
  const getDependencies = (taskId) => {
    return Array.from(dependencies.value.get(taskId) || [])
  }
  
  // 获取依赖此任务的任务
  const getDependents = (taskId) => {
    return Array.from(dependents.value.get(taskId) || [])
  }
  
  // 检查任务是否可以执行
  const canExecute = (taskId) => {
    const deps = dependencies.value.get(taskId)
    if (!deps || deps.size === 0) return true
    
    // 检查所有依赖是否已完成
    for (const depId of deps) {
      const depTask = taskStore.tasks.find(t => t.id === depId)
      if (!depTask || depTask.status !== 'success') {
        return false
      }
    }
    
    return true
  }
  
  // 获取可执行的任务
  const getExecutableTasks = () => {
    return taskStore.tasks.filter(task => 
      task.status === 'pending' && canExecute(task.id)
    )
  }
  
  // 获取阻塞的任务
  const getBlockedTasks = () => {
    return taskStore.tasks.filter(task => 
      task.status === 'pending' && !canExecute(task.id)
    )
  }
  
  // 获取依赖链
  const getDependencyChain = (taskId) => {
    const chain = []
    const visited = new Set()
    
    const buildChain = (currentId) => {
      if (visited.has(currentId)) return
      
      visited.add(currentId)
      const deps = dependencies.value.get(currentId)
      
      if (deps && deps.size > 0) {
        deps.forEach(dep => {
          chain.push({ from: currentId, to: dep })
          buildChain(dep)
        })
      }
    }
    
    buildChain(taskId)
    return chain
  }
  
  // 批量操作
  const executeWithDependencies = async () => {
    const executableTasks = getExecutableTasks()
    
    // 按执行顺序排序
    const sortedTasks = executableTasks.sort((a, b) => {
      const aIndex = executionOrder.value.indexOf(a.id)
      const bIndex = executionOrder.value.indexOf(b.id)
      
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      
      return aIndex - bIndex
    })
    
    // 并发执行可执行的任务
    const promises = sortedTasks.map(task => taskStore.runTask(task.id))
    await Promise.allSettled(promises)
  }
  
  // 清理所有依赖关系
  const clearAllDependencies = () => {
    dependencies.value.clear()
    dependents.value.clear()
    executionOrder.value = []
  }
  
  // 导出依赖关系
  const exportDependencies = () => {
    const deps = {}
    dependencies.value.forEach((depSet, taskId) => {
      deps[taskId] = Array.from(depSet)
    })
    return deps
  }
  
  // 导入依赖关系
  const importDependencies = (deps) => {
    clearAllDependencies()
    
    Object.entries(deps).forEach(([taskId, depIds]) => {
      depIds.forEach(depId => {
        try {
          addDependency(taskId, depId)
        } catch (error) {
          console.warn(`无法添加依赖 ${taskId} -> ${depId}:`, error.message)
        }
      })
    })
  }
  
  return {
    dependencies,
    dependents,
    executionOrder,
    addDependency,
    removeDependency,
    getDependencies,
    getDependents,
    canExecute,
    getExecutableTasks,
    getBlockedTasks,
    getDependencyChain,
    executeWithDependencies,
    clearAllDependencies,
    exportDependencies,
    importDependencies
  }
}

// 任务批量操作
export function useTaskBatchOperations() {
  const taskStore = useTaskStore()
  const selectedTasks = ref(new Set())
  
  // 选择任务
  const selectTask = (taskId) => {
    if (selectedTasks.value.has(taskId)) {
      selectedTasks.value.delete(taskId)
    } else {
      selectedTasks.value.add(taskId)
    }
  }
  
  // 全选
  const selectAll = () => {
    taskStore.tasks.forEach(task => selectedTasks.value.add(task.id))
  }
  
  // 清空选择
  const clearSelection = () => {
    selectedTasks.value.clear()
  }
  
  // 批量运行
  const batchRun = async () => {
    const promises = Array.from(selectedTasks.value).map(taskId => 
      taskStore.runTask(taskId)
    )
    await Promise.allSettled(promises)
    clearSelection()
  }
  
  // 批量取消
  const batchCancel = async () => {
    const promises = Array.from(selectedTasks.value).map(taskId => 
      taskStore.cancelTask(taskId)
    )
    await Promise.allSettled(promises)
    clearSelection()
  }
  
  // 批量删除
  const batchDelete = async () => {
    for (const taskId of selectedTasks.value) {
      await taskStore.deleteTask(taskId)
    }
    clearSelection()
  }
  
  // 批量分组
  const batchGroup = (groupName) => {
    Array.from(selectedTasks.value).forEach(taskId => {
      const task = taskStore.tasks.find(t => t.id === taskId)
      if (task) {
        task.group = groupName
      }
    })
    clearSelection()
  }
  
  // 获取选中任务
  const getSelectedTasks = () => {
    return taskStore.tasks.filter(task => selectedTasks.value.has(task.id))
  }
  
  // 检查是否选中
  const isSelected = (taskId) => {
    return selectedTasks.value.has(taskId)
  }
  
  return {
    selectedTasks,
    selectTask,
    selectAll,
    clearSelection,
    batchRun,
    batchCancel,
    batchDelete,
    batchGroup,
    getSelectedTasks,
    isSelected
  }
}
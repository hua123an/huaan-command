import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '../../src/stores/task'

describe('Task Store', () => {
  let taskStore
  
  beforeEach(() => {
    setActivePinia(createPinia())
    taskStore = useTaskStore()
  })
  
  it('creates task correctly', async () => {
    const task = await taskStore.createTask('Test Task', 'echo hello')
    
    expect(task.name).toBe('Test Task')
    expect(task.command).toBe('echo hello')
    expect(task.status).toBe('pending')
  })
  
  it('runs task correctly', async () => {
    const task = await taskStore.createTask('Test Task', 'echo hello')
    await taskStore.runTask(task.id)
    
    expect(task.status).toBe('running')
  })
  
  it('gets task stats correctly', () => {
    const stats = taskStore.getTaskStats()
    
    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('pending')
    expect(stats).toHaveProperty('running')
    expect(stats).toHaveProperty('success')
    expect(stats).toHaveProperty('failed')
  })
  
  it('handles task groups correctly', () => {
    taskStore.addGroup('Development')
    taskStore.addGroup('Testing')
    
    expect(taskStore.groups).toContain('Development')
    expect(taskStore.groups).toContain('Testing')
  })
  
  it('filters tasks by status correctly', () => {
    const pendingTasks = taskStore.getTasksByStatus('pending')
    const runningTasks = taskStore.getTasksByStatus('running')
    
    expect(Array.isArray(pendingTasks)).toBe(true)
    expect(Array.isArray(runningTasks)).toBe(true)
  })
})
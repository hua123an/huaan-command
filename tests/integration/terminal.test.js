import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import Terminal from '../views/Terminal.vue'
import { useTerminalStore } from '../../src/stores/terminal'

describe('Terminal Integration', () => {
  let wrapper
  let pinia
  let terminalStore
  
  beforeEach(async () => {
    pinia = createPinia()
    terminalStore = useTerminalStore()
    
    wrapper = mount(Terminal, {
      global: {
        plugins: [pinia]
      }
    })
    
    await nextTick()
  })
  
  it('renders terminal tabs correctly', () => {
    expect(wrapper.find('.terminal-container').exists()).toBe(true)
    expect(wrapper.find('.terminal-tabs').exists()).toBe(true)
  })
  
  it('creates new terminal session', async () => {
    const initialCount = terminalStore.sessions.length
    wrapper.vm.handleNewTab()
    
    await nextTick()
    expect(terminalStore.sessions.length).toBe(initialCount + 1)
  })
  
  it('switches between terminal sessions', async () => {
    // Create multiple sessions
    terminalStore.createSession()
    terminalStore.createSession()
    
    const sessions = terminalStore.sessions
    if (sessions.length >= 2) {
      const firstSession = sessions[0]
      const secondSession = sessions[1]
      
      terminalStore.setActiveSession(firstSession.id)
      expect(terminalStore.activeSessionId).toBe(firstSession.id)
      
      terminalStore.setActiveSession(secondSession.id)
      expect(terminalStore.activeSessionId).toBe(secondSession.id)
    }
  })
  
  it('handles session title editing', async () => {
    const session = terminalStore.createSession('Test Terminal')
    
    terminalStore.updateSessionTitle(session.id, 'Updated Terminal')
    
    const updatedSession = terminalStore.getSessionData(session.id)
    expect(updatedSession.title).toBe('Updated Terminal')
  })
  
  it('closes terminal sessions', async () => {
    const session = terminalStore.createSession()
    const sessionId = session.id
    
    terminalStore.closeSession(sessionId)
    
    const closedSession = terminalStore.getSessionData(sessionId)
    expect(closedSession).toBeUndefined()
  })
})
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import FixedInput from '../components/FixedInput.vue'

describe('FixedInput', () => {
  let wrapper
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    wrapper = mount(FixedInput, {
      global: {
        plugins: [pinia]
      },
      props: {
        mode: 'terminal',
        placeholder: '输入命令...'
      }
    })
  })
  
  it('renders correctly', () => {
    expect(wrapper.find('.fixed-input').exists()).toBe(true)
    expect(wrapper.find('.command-input').exists()).toBe(true)
    expect(wrapper.find('.submit-btn').exists()).toBe(true)
  })
  
  it('emits submit event on enter', async () => {
    const input = wrapper.find('.command-input')
    await input.setValue('test command')
    await input.trigger('keydown.enter')
    
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')[0]).toEqual(['test command'])
  })
  
  it('handles keyboard shortcuts', async () => {
    const input = wrapper.find('.command-input')
    
    // Test escape key
    await input.trigger('keydown', { key: 'Escape' })
    expect(input.element.value).toBe('')
    
    // Test Ctrl+R for reverse search
    await input.trigger('keydown', { key: 'r', ctrlKey: true })
    expect(wrapper.vm.isReverseSearching).toBe(true)
  })
  
  it('disables submit button when empty', () => {
    const submitBtn = wrapper.find('.submit-btn')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })
  
  it('enables submit button with text', async () => {
    const input = wrapper.find('.command-input')
    const submitBtn = wrapper.find('.submit-btn')
    
    await input.setValue('test')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })
})
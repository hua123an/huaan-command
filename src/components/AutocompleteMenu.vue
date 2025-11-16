<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  suggestions: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['select', 'close'])

const selectedIndex = ref(0)

// 监听建议列表变化，重置选中索引
watch(() => props.suggestions, () => {
  selectedIndex.value = 0
}, { deep: true })

// 选择上一项
const selectPrevious = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

// 选择下一项
const selectNext = () => {
  if (selectedIndex.value < props.suggestions.length - 1) {
    selectedIndex.value++
  }
}

// 确认选择
const confirmSelection = () => {
  if (props.suggestions[selectedIndex.value]) {
    emit('select', props.suggestions[selectedIndex.value])
  }
}

// 点击选择
const handleClick = (index) => {
  selectedIndex.value = index
  confirmSelection()
}

// 暴露方法给父组件
defineExpose({
  selectPrevious,
  selectNext,
  confirmSelection
})
</script>

<template>
  <div
    v-if="visible && suggestions.length > 0"
    class="autocomplete-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <div class="autocomplete-header">
      <span class="header-icon">💡</span>
      <span class="header-text">命令建议</span>
      <span class="header-hint">↑↓ 选择 • Enter 确认 • Esc 关闭</span>
    </div>
    <div class="autocomplete-list">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :class="['autocomplete-item', { selected: index === selectedIndex }]"
        @click="handleClick(index)"
      >
        <span class="item-icon">⚡</span>
        <span class="item-text">{{ suggestion }}</span>
        <span v-if="index === selectedIndex" class="item-badge">Enter</span>
      </div>
    </div>
    <div class="autocomplete-footer">
      {{ suggestions.length }} 个建议
    </div>
  </div>
</template>

<style scoped>
.autocomplete-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-width: 500px;
  max-height: 300px;
  z-index: 1000;
  overflow: hidden;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
}

.autocomplete-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f8fa;
  border-bottom: 1px solid #e5e5e5;
  font-size: 12px;
}

.header-icon {
  font-size: 14px;
}

.header-text {
  font-weight: 600;
  color: #1a1a1a;
}

.header-hint {
  margin-left: auto;
  color: #8e8e93;
  font-size: 11px;
}

.autocomplete-list {
  max-height: 220px;
  overflow-y: auto;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
}

.autocomplete-item:hover {
  background: #f5f5f5;
}

.autocomplete-item.selected {
  background: #0071e3;
  color: #ffffff;
}

.autocomplete-item.selected .item-icon {
  filter: brightness(0) invert(1);
}

.item-icon {
  font-size: 14px;
}

.item-text {
  flex: 1;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
}

.item-badge {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.autocomplete-footer {
  padding: 6px 12px;
  background: #f8f8fa;
  border-top: 1px solid #e5e5e5;
  font-size: 11px;
  color: #8e8e93;
  text-align: center;
}

.autocomplete-list::-webkit-scrollbar {
  width: 6px;
}

.autocomplete-list::-webkit-scrollbar-track {
  background: transparent;
}

.autocomplete-list::-webkit-scrollbar-thumb {
  background: #d1d1d6;
  border-radius: 3px;
}

.autocomplete-list::-webkit-scrollbar-thumb:hover {
  background: #b8b8bd;
}
</style>

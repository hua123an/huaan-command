#!/usr/bin/env node

/**
 * 工具系统验证脚本
 * 用于验证所有工具是否正确注册
 */

import { tools, getTool, getToolsByCategory, getToolsDescription, getToolsSchema } from './index.js'
import { TOOL_CATEGORIES } from './categories.js'
import { validateToolParams } from './validator.js'

console.log('🔧 工具系统验证\n')

// 1. 验证工具总数
console.log(`✓ 已注册工具: ${tools.length} 个`)

// 2. 按类别统计
console.log('\n📊 分类统计:')
Object.values(TOOL_CATEGORIES).forEach(category => {
  const categoryTools = getToolsByCategory(category)
  console.log(`  ${category}: ${categoryTools.length} 个`)
})

// 3. 验证每个工具的结构
console.log('\n🔍 工具结构验证:')
let errors = 0
tools.forEach(tool => {
  const issues = []

  if (!tool.name) issues.push('缺少 name')
  if (!tool.description) issues.push('缺少 description')
  if (!tool.execute) issues.push('缺少 execute')
  if (!tool.category) issues.push('缺少 category')
  if (!tool.icon) issues.push('缺少 icon')

  if (issues.length > 0) {
    console.log(`  ✗ ${tool.name || 'Unknown'}: ${issues.join(', ')}`)
    errors++
  }
})

if (errors === 0) {
  console.log('  ✓ 所有工具结构正确')
}

// 4. 验证工具可以被正确获取
console.log('\n🔎 工具查询验证:')
const testTools = ['read_file', 'write_file', 'execute_command', 'git_status']
testTools.forEach(name => {
  const tool = getTool(name)
  if (tool) {
    console.log(`  ✓ ${name}: 找到`)
  } else {
    console.log(`  ✗ ${name}: 未找到`)
  }
})

// 5. 验证参数验证器
console.log('\n✅ 参数验证器测试:')
const readFileTool = getTool('read_file')
const validResult = validateToolParams(readFileTool, { path: '/test.txt' })
const invalidResult = validateToolParams(readFileTool, {})

console.log(`  ✓ 有效参数: ${validResult.valid ? '通过' : '失败'}`)
console.log(`  ✓ 无效参数: ${!invalidResult.valid ? '正确拒绝' : '应该失败'}`)

// 6. 验证 JSON Schema 生成
console.log('\n📋 JSON Schema 生成:')
const schemas = getToolsSchema()
console.log(`  ✓ 生成了 ${schemas.length} 个工具的 Schema`)

// 7. 验证工具描述生成
console.log('\n📝 工具描述生成:')
const description = getToolsDescription()
const lines = description.split('\n').length
console.log(`  ✓ 生成了 ${lines} 行描述`)

// 8. 权限控制验证
console.log('\n🔒 权限控制验证:')
const writeFileTool = getTool('write_file')
const killProcessTool = getTool('kill_process')
console.log(`  ✓ write_file 需要批准: ${writeFileTool.needsApproval ? '是' : '否'}`)
console.log(`  ✓ kill_process 需要批准: ${killProcessTool.needsApproval ? '是' : '否'}`)

// 总结
console.log('\n' + '='.repeat(50))
console.log('✅ 工具系统验证完成！')
console.log('='.repeat(50))

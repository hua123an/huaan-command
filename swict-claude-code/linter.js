#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 开始代码检查...\n');

const files = [
  'src/configManager.js',
  'src/validators.js', 
  'src/ui.js',
  'src/constants.js',
  'src/updateChecker.js',
  'claude-config-switcher.js'
];

let totalIssues = 0;

for (const file of files) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // 基本语法检查
      try {
        new Function(content);
        console.log(`✅ ${file} - 语法正确`);
      } catch (err) {
        console.log(`❌ ${file} - 语法错误: ${err.message}`);
        totalIssues++;
      }
    } else {
      console.log(`⚠️  文件不存在: ${file}`);
    }
  } catch (err) {
    console.log(`❌ ${file} - 读取失败: ${err.message}`);
    totalIssues++;
  }
}

console.log('');

if (totalIssues === 0) {
  console.log('✅ 代码检查通过！');
} else {
  console.log(`❌ 发现 ${totalIssues} 个问题`);
  process.exit(1);
}
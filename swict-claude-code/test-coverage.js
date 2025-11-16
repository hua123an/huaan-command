#!/usr/bin/env node

/**
 * 测试覆盖率工具
 * 分析代码覆盖率并生成报告
 */

const fs = require('fs');
const path = require('path');

// 要分析覆盖率的文件
const SOURCE_FILES = [
  'src/configManager.js',
  'src/validators.js', 
  'src/ui.js',
  'src/constants.js',
  'src/updateChecker.js'
];

// 测试文件映射
const TEST_FILES = {
  'src/configManager.js': 'tests/test.configManager.js',
  'src/validators.js': 'tests/test.validators.js',
  'src/ui.js': 'tests/test.ui.js',
  'src/constants.js': null, // 常量文件通常不需要单独测试
  'src/updateChecker.js': null // 新模块，暂时没有测试
};

/**
 * 分析单个文件的覆盖率
 */
function analyzeFileCoverage(sourceFile, testFile) {
  const coverage = {
    file: sourceFile,
    functions: { total: 0, tested: 0 },
    lines: { total: 0, tested: 0 },
    coverage: 0
  };

  try {
    // 读取源文件
    const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
    const sourceLines = sourceContent.split('\n');

    // 计算函数数量（简单检测）
    const functionMatches = sourceContent.match(/function\s+\w+|async\s+function\s+\w+|\w+\s*:\s*function|\w+\s*=>\s*{/g) || [];
    coverage.functions.total = functionMatches.length;

    // 计算有效代码行数（排除空行和注释）
    coverage.lines.total = sourceLines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
    }).length;

    // 如果有对应的测试文件，分析测试覆盖情况
    if (testFile && fs.existsSync(testFile)) {
      const testContent = fs.readFileSync(testFile, 'utf-8');
      
      // 简单的覆盖率分析：检查函数名是否在测试中出现
      functionMatches.forEach(funcMatch => {
        const funcNameMatch = funcMatch.match(/function\s+(\w+)|async\s+function\s+(\w+)|(\w+)\s*:\s*function|(\w+)\s*=>\s*{/);
        if (funcNameMatch) {
          const funcName = funcNameMatch[1] || funcNameMatch[2] || funcNameMatch[3] || funcNameMatch[4];
          if (funcName && testContent.includes(funcName)) {
            coverage.functions.tested++;
          }
        }
      });

      // 估算行覆盖率（基于测试文件大小和复杂度）
      const testLines = testContent.split('\n').length;
      const testToSourceRatio = Math.min(testLines / coverage.lines.total, 1);
      coverage.lines.tested = Math.round(coverage.lines.total * testToSourceRatio);
    }

    // 计算总体覆盖率
    const functionCoverage = coverage.functions.total > 0 ? coverage.functions.tested / coverage.functions.total : 0;
    const lineCoverage = coverage.lines.total > 0 ? coverage.lines.tested / coverage.lines.total : 0;
    coverage.coverage = Math.round((functionCoverage + lineCoverage) / 2 * 100);

  } catch (err) {
    console.error(`分析 ${sourceFile} 时出错: ${err.message}`);
  }

  return coverage;
}

/**
 * 生成覆盖率报告
 */
function generateCoverageReport() {
  console.log('📊 测试覆盖率报告\n');
  console.log('='.repeat(80));

  const coverages = [];
  const totalFunctions = { total: 0, tested: 0 };
  const totalLines = { total: 0, tested: 0 };

  for (const sourceFile of SOURCE_FILES) {
    const testFile = TEST_FILES[sourceFile];
    const coverage = analyzeFileCoverage(sourceFile, testFile);
    coverages.push(coverage);

    totalFunctions.total += coverage.functions.total;
    totalFunctions.tested += coverage.functions.tested;
    totalLines.total += coverage.lines.total;
    totalLines.tested += coverage.lines.tested;

    // 输出单个文件覆盖率
    console.log(`\n📄 ${path.basename(sourceFile)}`);
    console.log(`   函数: ${coverage.functions.tested}/${coverage.functions.total} (${Math.round(coverage.functions.total > 0 ? coverage.functions.tested / coverage.functions.total * 100 : 0)}%)`);
    console.log(`   行数: ${coverage.lines.tested}/${coverage.lines.total} (${Math.round(coverage.lines.total > 0 ? coverage.lines.tested / coverage.lines.total * 100 : 0)}%)`);
    console.log(`   覆盖率: ${coverage.coverage}%`);
    
    if (coverage.coverage < 50) {
      console.log(`   ⚠️  覆盖率偏低，建议增加测试`);
    } else if (coverage.coverage < 80) {
      console.log(`   📝 覆盖率一般，可以进一步优化`);
    } else {
      console.log(`   ✅ 覆盖率良好`);
    }
  }

  // 总体覆盖率
  const overallFunctionCoverage = totalFunctions.total > 0 ? totalFunctions.tested / totalFunctions.total : 0;
  const overallLineCoverage = totalLines.total > 0 ? totalLines.tested / totalLines.total : 0;
  const overallCoverage = Math.round((overallFunctionCoverage + overallLineCoverage) / 2 * 100);

  console.log('\n' + '='.repeat(80));
  console.log('📈 总体覆盖率');
  console.log(`   函数: ${totalFunctions.tested}/${totalFunctions.total} (${Math.round(overallFunctionCoverage * 100)}%)`);
  console.log(`   行数: ${totalLines.tested}/${totalLines.total} (${Math.round(overallLineCoverage * 100)}%)`);
  console.log(`   总体: ${overallCoverage}%`);

  // 建议
  console.log('\n💡 改进建议:');
  const lowCoverageFiles = coverages.filter(c => c.coverage < 50);
  if (lowCoverageFiles.length > 0) {
    console.log('   以下文件需要增加测试:');
    lowCoverageFiles.forEach(file => {
      console.log(`   - ${path.basename(file.file)} (当前: ${file.coverage}%)`);
    });
  }

  const untestedFiles = Object.entries(TEST_FILES).filter(([_, testFile]) => !testFile || !fs.existsSync(testFile));
  if (untestedFiles.length > 0) {
    console.log('   以下文件缺少测试:');
    untestedFiles.forEach(([sourceFile, _]) => {
      console.log(`   - ${path.basename(sourceFile)}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  return overallCoverage;
}

// 如果直接运行此脚本
if (require.main === module) {
  const coverage = generateCoverageReport();
  process.exit(coverage < 50 ? 1 : 0); // 覆盖率低于50%时返回非零退出码
}

module.exports = { generateCoverageReport, analyzeFileCoverage };

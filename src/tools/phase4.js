/**
 * 🔧 Phase 4 工具集成
 *
 * 将 Phase 4 的高级功能集成到工具系统中
 */

import { createTool } from './index'
import { codeAnalyzer } from '../agents/CodeAnalyzer'
import { gitIntegration } from '../agents/GitIntegration'
import { testRunner } from '../agents/TestRunner'
import { smartCompletion } from '../agents/SmartCompletion'
import { projectTemplate } from '../agents/ProjectTemplate'

/**
 * Phase 4 工具列表
 */
export const phase4Tools = [
  // 代码分析工具
  createTool(
    'analyze_file',
    '分析代码文件结构',
    async ({ path }, context) => {
      return await codeAnalyzer.analyzeFile(path)
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '🔬'
    }
  ),

  createTool(
    'find_function',
    '查找函数定义',
    async ({ path, name }, context) => {
      return await codeAnalyzer.findFunction(path, name)
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '🔍'
    }
  ),

  createTool(
    'analyze_dependencies',
    '分析文件依赖关系',
    async ({ path }, context) => {
      return await codeAnalyzer.analyzeDependencies(path)
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '📊'
    }
  ),

  createTool(
    'analyze_project',
    '分析整个项目结构',
    async ({ projectPath }, context) => {
      return await codeAnalyzer.analyzeProject(projectPath || context.currentDir)
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '🔬'
    }
  ),

  createTool(
    'check_code_quality',
    '检查代码质量',
    async ({ path }, context) => {
      return await codeAnalyzer.checkQuality(path)
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '✨'
    }
  ),

  // Git 集成工具
  createTool(
    'git_smart_commit',
    '智能生成提交消息并提交',
    async ({ detailed, autoCommit }, context) => {
      gitIntegration.setWorkingDir(context.currentDir)
      return await gitIntegration.smartCommit({ detailed, autoCommit })
    },
    {
      needsApproval: true,
      category: 'git',
      icon: '💾'
    }
  ),

  createTool(
    'git_review',
    '代码审查',
    async ({ base, head }, context) => {
      gitIntegration.setWorkingDir(context.currentDir)
      return await gitIntegration.reviewCode(base, head)
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '👀'
    }
  ),

  createTool(
    'git_generate_pr',
    '生成 PR 描述',
    async ({ base, head }, context) => {
      gitIntegration.setWorkingDir(context.currentDir)
      return await gitIntegration.generatePRDescription(base, head)
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '📝'
    }
  ),

  createTool(
    'git_detect_conflicts',
    '检测合并冲突',
    async ({}, context) => {
      gitIntegration.setWorkingDir(context.currentDir)
      return await gitIntegration.detectConflicts()
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '⚠️'
    }
  ),

  createTool(
    'git_resolve_conflict',
    '冲突解决建议',
    async ({ file }, context) => {
      gitIntegration.setWorkingDir(context.currentDir)
      return await gitIntegration.suggestConflictResolution(file)
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '🔧'
    }
  ),

  // 测试运行工具
  createTool(
    'detect_test_framework',
    '检测测试框架',
    async ({}, context) => {
      testRunner.setWorkingDir(context.currentDir)
      return await testRunner.detectFramework()
    },
    {
      needsApproval: false,
      category: 'testing',
      icon: '🔍'
    }
  ),

  createTool(
    'run_tests',
    '运行测试',
    async ({ file, test, watch }, context) => {
      testRunner.setWorkingDir(context.currentDir)

      if (file) {
        return await testRunner.runFile(file, { watch })
      } else if (test) {
        return await testRunner.runTest(test, { watch })
      } else {
        return await testRunner.runAll({ watch })
      }
    },
    {
      needsApproval: false,
      category: 'testing',
      icon: '🧪'
    }
  ),

  createTool(
    'run_coverage',
    '运行测试覆盖率',
    async ({}, context) => {
      testRunner.setWorkingDir(context.currentDir)
      return await testRunner.runCoverage()
    },
    {
      needsApproval: false,
      category: 'testing',
      icon: '📊'
    }
  ),

  createTool(
    'generate_test',
    '生成测试用例',
    async ({ file }, context) => {
      testRunner.setWorkingDir(context.currentDir)
      return await testRunner.generateTestCase(file)
    },
    {
      needsApproval: false,
      category: 'testing',
      icon: '✨'
    }
  ),

  createTool(
    'find_test_files',
    '查找测试文件',
    async ({}, context) => {
      testRunner.setWorkingDir(context.currentDir)
      return await testRunner.findTestFiles()
    },
    {
      needsApproval: false,
      category: 'testing',
      icon: '📁'
    }
  ),

  // 智能补全工具
  createTool(
    'get_completions',
    '获取智能补全建议',
    async ({ input }, context) => {
      return await smartCompletion.getCompletions(input, context)
    },
    {
      needsApproval: false,
      category: 'completion',
      icon: '💡'
    }
  ),

  // 项目模板工具
  createTool(
    'detect_project_type',
    '识别项目类型',
    async ({ projectPath }, context) => {
      return await projectTemplate.detectProjectType(projectPath || context.currentDir)
    },
    {
      needsApproval: false,
      category: 'project',
      icon: '🔍'
    }
  ),

  createTool(
    'analyze_project_structure',
    '分析项目结构',
    async ({ projectPath }, context) => {
      return await projectTemplate.analyzeStructure(projectPath || context.currentDir)
    },
    {
      needsApproval: false,
      category: 'project',
      icon: '📊'
    }
  ),

  createTool(
    'init_project',
    '初始化项目',
    async ({ projectPath, type, options }, context) => {
      return await projectTemplate.initializeProject(
        projectPath || context.currentDir,
        type,
        options
      )
    },
    {
      needsApproval: true,
      category: 'project',
      icon: '🚀'
    }
  ),

  createTool(
    'get_best_practices',
    '获取最佳实践建议',
    async ({ type }, context) => {
      return projectTemplate.getBestPractices(type)
    },
    {
      needsApproval: false,
      category: 'project',
      icon: '📖'
    }
  )
]

/**
 * 注册 Phase 4 工具到主工具列表
 */
export const registerPhase4Tools = (toolRegistry) => {
  phase4Tools.forEach(tool => {
    toolRegistry.push(tool)
  })

  console.log(`✅ 已注册 ${phase4Tools.length} 个 Phase 4 工具`)
}

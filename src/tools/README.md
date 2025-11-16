# 前端工具系统

完整的工具注册和执行系统，为 AI Agent 提供强大的文件操作、命令执行和代码分析能力。

## 目录结构

```
src/tools/
├── index.js         # 工具定义和注册
├── categories.js    # 工具分类常量
├── validator.js     # 参数验证和安全检查
├── executor.js      # 工具执行器（Composable）
├── USAGE.md        # 详细使用文档
└── README.md       # 本文件
```

## 快速开始

```javascript
import { useToolExecutor } from '@/tools/executor'

const { executeTool } = useToolExecutor({
  currentDir: '/Users/project',
  sessionId: 'session-123'
})

// 执行工具
const result = await executeTool('read_file', {
  path: '/Users/project/README.md'
})

console.log(result.output)
```

## 已实现的工具

### 文件系统 (filesystem)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `read_file` | 读取文件内容 | 否 | `path` |
| `write_file` | 写入文件（自动备份） | 是 | `path`, `content` |
| `list_files` | 列出目录内容 | 否 | `dir` (可选) |
| `search_files` | 搜索文件（glob） | 否 | `pattern`, `dir` (可选) |

### 命令执行 (execution)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `execute_command` | 执行 shell 命令 | 动态检测* | `cmd`, `workingDir` (可选) |

*危险命令（rm, sudo, mv 等）需要批准

### 导航 (navigation)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `get_current_dir` | 获取当前工作目录 | 否 | `sessionId` |
| `change_directory` | 切换工作目录 | 否 | `path`, `sessionId` |

### 代码分析 (analysis)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `analyze_code` | 分析代码结构 | 否 | `path` |
| `find_in_files` | 在文件中搜索内容 | 否 | `pattern`, `dir` (可选), `filePattern` (可选) |

### Git 操作 (git)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `git_status` | 查看 Git 状态 | 否 | `workingDir` (可选) |
| `git_diff` | 查看代码改动 | 否 | `workingDir` (可选), `file` (可选) |
| `git_log` | 查看提交历史 | 否 | `workingDir` (可选), `limit` (可选) |
| `git_branch` | 查看或切换分支 | 切换时需要 | `workingDir` (可选), `branch` (可选) |

### 系统管理 (system)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `list_processes` | 列出运行中的进程 | 否 | `filter` (可选) |
| `kill_process` | 终止进程 | 是 | `pid`, `signal` (可选) |
| `get_env_info` | 获取系统环境信息 | 否 | 无 |

### 网络工具 (network)

| 工具名 | 描述 | 需要批准 | 参数 |
|--------|------|----------|------|
| `test_connection` | 测试网络连接 | 否 | `host` (可选) |
| `check_port` | 检查端口占用 | 否 | `port` |

## 核心特性

### 1. 权限控制

```javascript
// 自动检测危险操作
await executeTool('execute_command', {
  cmd: 'rm -rf node_modules'
}, {
  onApprovalRequired: async (tool, params) => {
    return confirm(`确认执行：${params.cmd}？`)
  }
})
```

### 2. 参数验证

```javascript
// 自动验证必需参数
try {
  await executeTool('read_file', {}) // 缺少 path
} catch (error) {
  console.error(error.message) // "参数验证失败：缺少 path 参数"
}
```

### 3. 危险操作警告

```javascript
await executeTool('execute_command', {
  cmd: 'sudo rm -rf /'
}, {
  onWarning: async (warnings) => {
    // warnings: ['警告：使用超级用户权限', '警告：尝试删除根目录！']
    return confirm('这是一个危险操作，确认继续？')
  }
})
```

### 4. 执行历史

```javascript
const { executionHistory, toolStats } = useToolExecutor()

// 查看历史
console.log(executionHistory.value)

// 查看统计
console.log(toolStats.value)
// {
//   read_file: {
//     count: 10,
//     successCount: 9,
//     failureCount: 1,
//     avgDuration: 25.5
//   }
// }
```

### 5. 批量执行

```javascript
const results = await executeBatch([
  { tool: 'git_status', params: {} },
  { tool: 'git_diff', params: {} },
  { tool: 'list_files', params: {} }
])
```

## AI 集成

工具系统专为 AI Agent 设计，支持 Function Calling：

```javascript
import { getToolsSchema } from '@/tools'

// 获取工具的 JSON Schema
const schema = getToolsSchema()

// 发送给 AI API
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  tools: schema,
  messages: [{ role: 'user', content: '帮我查看项目文件' }]
})
```

## 安全机制

1. **权限分级**
   - 只读操作：无需批准
   - 写入操作：需要批准
   - 危险操作：动态检测 + 批准

2. **参数验证**
   - 必需参数检查
   - 类型验证
   - 范围验证

3. **危险操作检测**
   - 文件删除（rm -rf）
   - 超级用户权限（sudo）
   - 磁盘操作（format, mkfs）
   - 强制进程终止（kill -9）

4. **执行审计**
   - 完整的执行历史
   - 时间戳记录
   - 成功/失败状态
   - 执行耗时统计

## 扩展工具

### 添加新工具

```javascript
import { createTool, tools } from '@/tools'

const newTool = createTool(
  'tool_name',
  '工具描述',
  async (params, context) => {
    // 实现逻辑
    return result
  },
  {
    needsApproval: false,
    category: 'general',
    icon: '🔧'
  }
)

tools.push(newTool)
```

### 自定义验证

```javascript
const customTool = createTool(
  'custom_tool',
  '自定义工具',
  async (params) => { /* ... */ },
  {
    needsApproval: (params) => {
      // 动态判断是否需要批准
      return params.level === 'dangerous'
    }
  }
)
```

## 后续扩展建议

### 高优先级

1. **代码分析工具**
   - `parse_ast` - AST 解析
   - `find_references` - 查找引用
   - `find_definitions` - 查找定义
   - `analyze_dependencies` - 依赖分析

2. **项目管理工具**
   - `npm_install` - 安装依赖
   - `npm_run_script` - 运行脚本
   - `docker_build` - 构建镜像
   - `docker_run` - 运行容器

3. **测试工具**
   - `run_tests` - 运行测试
   - `coverage_report` - 覆盖率报告
   - `lint_code` - 代码检查

### 中优先级

4. **数据库工具**
   - `query_database` - 数据库查询
   - `backup_database` - 数据库备份
   - `migrate_database` - 数据库迁移

5. **部署工具**
   - `deploy_app` - 部署应用
   - `rollback_deployment` - 回滚部署
   - `check_deployment` - 检查部署状态

6. **监控工具**
   - `get_metrics` - 获取指标
   - `check_logs` - 查看日志
   - `alert_status` - 告警状态

### 低优先级

7. **协作工具**
   - `create_issue` - 创建 Issue
   - `comment_pr` - 评论 PR
   - `send_notification` - 发送通知

8. **文档工具**
   - `generate_docs` - 生成文档
   - `update_readme` - 更新 README
   - `create_changelog` - 创建变更日志

## 性能优化

1. **缓存机制**
   - 文件内容缓存
   - 命令输出缓存
   - 分析结果缓存

2. **并行执行**
   - 批量工具并行执行
   - 独立操作异步处理

3. **资源限制**
   - 执行超时控制
   - 内存使用限制
   - 并发数量控制

## 测试

```bash
# 运行单元测试
npm test src/tools

# 运行集成测试
npm run test:integration

# 性能测试
npm run test:performance
```

## 许可证

MIT

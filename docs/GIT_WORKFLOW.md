# Git 工作流集成指南

## 📚 概述

Huaan Command 现已集成完整的 Git 工作流，支持在终端应用中直接进行 Git 操作。

## 🎯 核心功能

### 1. Git 状态管理

- ✅ 实时显示 Git 状态
- ✅ Staged 文件追踪
- ✅ Unstaged 文件追踪
- ✅ Untracked 文件追踪
- ✅ 分支信息显示

### 2. 基本操作

- ✅ `git add` - 暂存文件
- ✅ `git commit` - 提交更改
- ✅ `git push` - 推送到远程
- ✅ `git pull` - 拉取远程更新
- ✅ `git checkout` - 切换分支
- ✅ `git branch` - 分支管理

### 3. 高级功能

- ✅ 提交历史查看
- ✅ 分支管理
- ✅ 变更差异查看
- ✅ 暂存管理 (stash)
- ✅ 仓库初始化

## 🔧 使用方式

### 在应用中使用 Git 面板

```vue
<script setup>
import GitPanel from '@/components/GitPanel.vue'

const currentDir = ref('/path/to/repo')
</script>

<template>
  <GitPanel :currentDir="currentDir" />
</template>
```

### 使用 useGit Composable

```javascript
import { useGit } from '@/composables/useGit'
import { ref } from 'vue'

const currentDir = ref('/path/to/repo')
const git = useGit(currentDir)

// 获取状态
await git.fetchStatus()

// 提交
await git.commit('feat: add new feature')

// 推送
await git.push()
```

## 📋 API 文档

### 状态检查

```javascript
// 检查是否是 Git 仓库
await git.checkGitRepo()

// 获取状态
await git.fetchStatus()
// gitStatus.value 包含: branch, staged, unstaged, untracked, clean
```

### 文件操作

```javascript
// 添加文件
await git.add('.') // 添加所有
await git.add('src/main.js') // 添加单个文件

// 提交
await git.commit('Initial commit')

// 查看差异
const { diff } = await git.diff('src/main.js')
```

### 远程操作

```javascript
// 推送
await git.push('origin', 'main')

// 拉取
await git.pull('origin', 'main')

// 克隆
await git.clone('https://github.com/user/repo', './local-repo')
```

### 分支管理

```javascript
// 获取分支列表
await git.fetchBranches()

// 创建分支
await git.createBranch('feature/new-feature', true) // true 表示创建后切换

// 切换分支
await git.checkout('develop')

// 删除分支
await git.deleteBranch('feature/old-feature')
```

### 暂存操作

```javascript
// 暂存更改
await git.stash('work in progress')

// 恢复暂存
await git.stashPop()
```

## 🎨 UI 组件

### GitPanel 组件

完整的 Git 管理面板，包含：

- **状态标签页**: 显示所有更改的文件
- **分支标签页**: 分支列表和切换
- **提交标签页**: 查看提交历史
- **设置标签页**: Git 配置

### GitStatusBar 组件

在终端状态栏中显示：

- 当前分支
- 更改数量统计
- 快速 Git 操作按钮

## 🚀 工作流示例

### 典型开发流程

```javascript
// 1. 初始化或检查仓库
const git = useGit(currentDir)
await git.checkGitRepo()

// 2. 查看状态
await git.fetchStatus()
console.log(git.gitStatus.value)

// 3. 添加更改
await git.add('.')

// 4. 提交
await git.commit('feat: implement new feature')

// 5. 推送
await git.push('origin', 'main')
```

### 分支工作流 (Git Flow)

```javascript
// 1. 创建功能分支
await git.createBranch('feature/awesome-feature')

// 2. 进行开发...

// 3. 提交更改
await git.add('.')
await git.commit('feat: awesome feature')

// 4. 推送分支
await git.push('origin', 'feature/awesome-feature')

// 5. 切换回 main
await git.checkout('main')

// 6. 拉取最新更改
await git.pull('origin', 'main')

// 7. 清理本地分支
await git.deleteBranch('feature/awesome-feature')
```

## 🔒 安全考虑

1. **凭证管理**
   - 使用 SSH keys 而不是密码
   - 配置 git credential.helper

2. **提交消息**
   - 遵循 Conventional Commits 规范
   - 使用模板约束

3. **分支保护**
   - 主分支应有 PR 审查要求
   - 不要直接推送到 main

## 📝 最佳实践

### 提交消息格式

遵循 Conventional Commits:

```
type(scope): subject

body

footer
```

例子：

```
feat(terminal): add git integration support

- Implemented git status display
- Added commit dialog
- Integrated with terminal commands

Fixes #123
```

### 分支命名

```
feature/描述           # 新功能
bugfix/问题描述       # Bug 修复
hotfix/紧急问题       # 紧急修复
docs/文档描述         # 文档更新
refactor/重构描述     # 代码重构
```

### 提交频率

- 每个逻辑功能一次提交
- 不要混合不相关的更改
- 保持提交历史清晰

## 🐛 故障排除

### 问题：Git 命令执行失败

**解决方案：**

- 检查目录是否是有效的 Git 仓库
- 检查 Git 是否已安装
- 查看错误消息获取详细信息

### 问题：无法推送/拉取

**解决方案：**

- 检查网络连接
- 验证 SSH/HTTPS 凭证
- 检查权限设置

### 问题：合并冲突

**解决方案：**

- 手动编辑冲突文件
- 使用 `git mergetool`
- 或使用第三方合并工具

## 🔗 相关文件

- `/src/composables/useGit.js` - Git 功能 Composable
- `/src/components/GitPanel.vue` - Git 管理面板
- `/src/components/GitStatusBar.vue` - 状态栏组件

## 📚 参考资源

- [Git 官方文档](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow 工作流](https://nvie.com/posts/a-successful-git-branching-model/)

---

**上次更新**: 2025-11-16

# 🎨 Git 可视化功能说明

## 📋 概述

Huaan Terminal 现已支持 **完整的 Git 可视化管理系统**！包含以下三大可视化模块：

## 🎮 功能模块

### 1. **Git Panel** - 基础 Git 操作面板

📚 文件位置: `src/components/GitPanel.vue`

**功能特性:**

- ✅ 实时 Git 状态显示
- ✅ 文件分类管理（Staged / Unstaged / Untracked）
- ✅ 快速操作按钮（Add All, Commit, Push, Pull）
- ✅ 分支管理和切换
- ✅ 提交历史查看
- ✅ 仓库初始化
- ✅ Git 用户配置

**UI 标签页:**

- **Status** - 文件状态和操作
- **Branches** - 分支列表和切换
- **Commits** - 提交历史
- **Settings** - Git 配置

---

### 2. **Git Visualization** - 统计和图表可视化

📚 文件位置: `src/components/GitVisualization.vue`

**功能特性:**

- 📊 **Branch Tree** - 分支树形结构展示
- 📈 **File Changes** - 文件变更频率柱状图
- 👥 **Contributors** - 贡献者排行榜
- 📅 **Timeline** - 每日提交时间线

**图表类型:**

#### 🌳 分支树

```
├── main
│   └── develop
│       ├── feature/ui-redesign
│       └── feature/git-integration
└── hotfix/critical-bug
```

#### 📊 文件变更图表

显示最常修改的文件及其修改次数：

```
src/main.js      ████████ 45 changes
src/App.vue      ██████ 32 changes
package.json     ████ 18 changes
```

#### 👥 贡献者排行

```
🥇 John (128 commits)
🥈 Alice (89 commits)
🥉 Bob (56 commits)
```

#### 📈 日提交时间线

基于日期的提交数量可视化柱状图

---

### 3. **Commit Graph** - 提交历史可视化编辑器

📚 文件位置: `src/components/CommitGraph.vue`

**功能特性:**

- 📜 详细提交历史列表
- 🔍 高级搜索过滤
  - 按作者搜索
  - 按提交信息搜索
- 🔀 多种排序方式
  - 按日期排序
  - 按作者排序
  - 按信息排序
- ✅ 多选提交（Ctrl/Cmd + Click）
- 👁️ 查看提交详情
- ↩️ 撤销提交
- 📊 提交统计信息
  - 修改文件数
  - 新增行数
  - 删除行数
- 🖱️ 快速复制 commit hash

**交互方式:**

```
提交项目 = [复选框] [Hash] [信息] [作者] [日期] [统计] [操作按钮]

操作按钮:
  👁️  - 查看详情
  ↩️  - 撤销提交
```

---

### 4. **Git Dashboard** - 综合仪表板

📚 文件位置: `src/components/GitDashboard.vue`

集成上述三个组件的统一仪表板，支持快速切换不同视图：

```
┌─────────────────────────────────────────────┐
│  🎮 Git Panel | 📈 Statistics | 📜 Commits  │ <- 视图切换
├─────────────────────────────────────────────┤
│                                             │
│         显示对应视图的内容                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🚀 使用方式

### 在你的组件中导入

```vue
<script setup>
import GitDashboard from '@/components/GitDashboard.vue'
import { ref } from 'vue'

const currentDir = ref('/path/to/repo')
const sessionId = ref('session-123')
</script>

<template>
  <!-- 完整仪表板 -->
  <GitDashboard :current-dir="currentDir" :session-id="sessionId" />

  <!-- 或者单独使用某个组件 -->
  <GitPanel :current-dir="currentDir" :session-id="sessionId" />
  <GitVisualization :current-dir="currentDir" />
  <CommitGraph :current-dir="currentDir" />
</template>
```

### 关键特性示例

#### Git Panel 快速操作

```javascript
// 暂存所有文件
await git.add('.')

// 创建提交
await git.commit('feat: add new feature')

// 推送到远程
await git.push('origin', 'main')

// 切换分支
await git.checkout('develop')
```

#### 获取统计信息

```javascript
// 自动收集的统计数据
gitStats.value = {
  totalCommits: 42,           // 总提交数
  totalBranches: 5,           // 分支总数
  contributors: [...],        // 贡献者列表
  commitsPerDay: [...],       // 每日提交数
  topAuthors: [...],          // 顶级作者
  fileChanges: [...]          // 文件变更统计
}
```

---

## 🎨 可视化设计

### 配色方案

- 🔵 **Primary Blue** - `#0099ff` / `#00b4ff`
- 🟢 **Success Green** - `#4caf50`
- 🔴 **Error Red** - `#ff6b6b`
- 🟠 **Warning Orange** - `#ff9800`
- ⚪ **Neutral Gray** - `#999`

### 响应式设计

- 📱 移动端适配
- 🖥️ 桌面端优化
- ♿ 可访问性支持

---

## 🔧 技术架构

### 数据流

```
Git 命令 (via Tauri)
    ↓
useGit.js (Composable)
    ↓
组件状态管理 (ref/reactive)
    ↓
UI 渲染 (Vue 3 SFC)
```

### 关键文件

```
src/
├── composables/
│   └── useGit.js                    # Git 操作 API
├── components/
│   ├── GitPanel.vue                 # 基础操作面板
│   ├── GitVisualization.vue         # 统计可视化
│   ├── CommitGraph.vue              # 提交图表
│   ├── GitDashboard.vue             # 综合仪表板
│   └── GitStatusBar.vue             # 状态栏
└── stores/
    └── git.js                       # Git 状态存储
```

---

## 📊 数据结构

### Git 状态

```typescript
interface GitStatus {
  branch: string // 当前分支
  staged: Array<{ name; status }> // 暂存文件
  unstaged: Array<{ name; status }> // 未暂存文件
  untracked: string[] // 未追踪文件
  clean: boolean // 是否干净
}
```

### 提交信息

```typescript
interface Commit {
  id: string // 完整 hash
  shortHash: string // 缩短 hash
  author: string // 作者名
  email: string // 作者邮箱
  date: string // 相对时间
  subject: string // 提交标题
  body: string // 提交详情
  files: number // 修改文件数
  insertions: number // 新增行数
  deletions: number // 删除行数
}
```

---

## ⚙️ 配置

### Git 用户配置

在 GitPanel 的设置标签页中配置：

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### 命令执行

所有 Git 命令都通过 Tauri 的 `invoke` API 执行，支持：

- 本地仓库操作
- 远程仓库同步
- 分支管理
- 提交历史查询

---

## 🚨 错误处理

### 常见错误

| 错误                   | 原因              | 解决                       |
| ---------------------- | ----------------- | -------------------------- |
| "Not a git repository" | 目录不是 Git 仓库 | 点击"Initialize Git"初始化 |
| "Push failed"          | 网络或凭证问题    | 检查网络和 SSH/HTTPS 凭证  |
| "Merge conflict"       | 有冲突需要解决    | 手动编辑文件后重新提交     |

### 错误提示

- ❌ 错误信息显示在顶部红色横幅
- ⚠️ 禁用按钮表示操作不可用
- 🔄 加载状态显示进行中的操作

---

## 🎯 最佳实践

### 提交工作流

1. 📝 编辑文件
2. ➕ 使用 "Add All" 暂存
3. 💾 填写提交信息
4. 📤 推送到远程
5. 🔍 在统计中查看历史

### 分支管理

1. 🌳 查看分支树结构
2. 🔀 创建功能分支
3. 📝 进行开发和提交
4. 🔄 定期查看贡献者统计
5. 🧹 完成后删除分支

### 监控项目健康

- 查看 📊 **Statistics** 了解项目活跃度
- 查看 👥 **Contributors** 了解团队贡献
- 查看 📈 **Timeline** 了解开发进度

---

## 📚 相关资源

- [Git 官方文档](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Vue 3 文档](https://vuejs.org/)

---

**版本**: 1.0.0
**最后更新**: 2025-11-16
**状态**: ✅ 完全功能

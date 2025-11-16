# 🎓 Git 可视化系统 - 快速入门教程

## 👋 欢迎！

本教程将引导你快速掌握 Huaan Terminal 的 Git 可视化系统。

## ⏱️ 预计时间: 10-15 分钟

---

## 📚 目录

1. [基础概念](#基础概念)
2. [打开 Git 仪表板](#打开-git-仪表板)
3. [第一步：暂存和提交](#第一步暂存和提交)
4. [第二步：查看统计](#第二步查看统计)
5. [第三步：浏览历史](#第三步浏览历史)
6. [高级技巧](#高级技巧)

---

## 基础概念

### 什么是 Git 可视化？

传统的 Git 操作需要在终端输入命令，而我们的可视化系统提供了一个 **图形界面**，让你可以：

- 🎨 **直观看到** 文件状态
- 📊 **图表展示** 项目统计
- 📜 **浏览** 完整提交历史
- 🚀 **快速执行** 常见操作

### 四大组件简介

| 组件 | 功能 | 适用场景 |
|-----|------|--------|
| **Git Panel** | 基础操作 | 日常开发工作 |
| **Visualization** | 数据图表 | 项目分析和报告 |
| **Commit History** | 提交浏览 | 代码审查和回溯 |
| **Dashboard** | 统一界面 | 完整 Git 管理 |

---

## 打开 Git 仪表板

### 方式 1: 通过应用菜单
```
1. 打开 Huaan Terminal 应用
2. 找到 "Git" 菜单或按钮
3. 点击 "Open Dashboard"
4. 仪表板加载完成！
```

### 方式 2: 通过代码导入
```vue
<script setup>
import GitDashboard from '@/components/GitDashboard.vue'
import { ref } from 'vue'

const currentDir = ref('/Users/huaan/my-project')
</script>

<template>
  <GitDashboard :current-dir="currentDir" />
</template>
```

---

## 第一步：暂存和提交

### 场景：你修改了几个文件，想要提交

**步骤：**

```
1️⃣ 打开 Git Dashboard
   └─ 点击 "🎮 Git Panel" 标签页

2️⃣ 查看文件状态
   ├─ 📝 Staged    (已暂存，可提交)
   ├─ ⚠️  Unstaged  (已修改，未暂存)
   └─ ❓ Untracked (新文件，未追踪)

3️⃣ 暂存所有文件
   └─ 点击 "➕ Add All" 按钮
      所有文件会移到 "Staged" 区域

4️⃣ 提交
   ├─ 点击 "💾 Commit" 按钮
   ├─ 填写提交信息 (e.g., "feat: add new feature")
   └─ 按 Cmd+Enter 或点击 "Commit" 提交

5️⃣ 推送
   └─ 点击 "⬆️ Push" 按钮
      文件同步到远程仓库
```

### 示例：提交信息格式

遵循 Conventional Commits 规范：

```
feat: 添加用户登录功能        # 新功能
fix: 修复导航栏显示问题       # Bug 修复
docs: 更新 README             # 文档更新
refactor: 重构登录模块        # 代码重构
test: 添加用户测试用例        # 测试用例
chore: 更新依赖包             # 其他更改
```

---

## 第二步：查看统计

### 场景：想要了解项目的开发情况

**步骤：**

```
1️⃣ 打开 Git Dashboard
   └─ 点击 "📈 Statistics" 标签页

2️⃣ 查看顶部统计卡片
   ├─ 📊 42 Commits     (总提交数)
   ├─ 🌳 5 Branches     (分支数)
   ├─ 👥 3 Contributors (贡献人数)
   └─ 📁 15 Changed Files (修改文件数)

3️⃣ 选择要查看的图表
   ├─ 🌳 History    → 分支树形结构
   │   ├── main
   │   ├── develop
   │   ├── feature/ui-redesign
   │   └── hotfix/critical-bug
   │
   ├─ 📊 Stats     → 文件变更频率
   │   ├── src/main.js        45 changes
   │   ├── src/App.vue        32 changes
   │   └── package.json       18 changes
   │
   ├─ 👥 Contributors → 贡献者排行
   │   🥇 Alice (128 commits)
   │   🥈 Bob (89 commits)
   │   🥉 Charlie (56 commits)
   │
   └─ 📈 Timeline  → 每日提交数量
       (展示过去 30 天的提交趋势)
```

### 如何解读数据

**文件变更图表** - 识别项目的 "热点" 文件
- 修改最频繁的文件 = 关键代码
- 需要特别注意代码质量

**贡献者排行** - 了解团队工作分布
- 贡献排名 = 工作量参考
- 帮助识别关键代码所有者

**日提交时间线** - 评估开发进度
- 峰值高 = 活跃开发期
- 峰值低 = 维护或等待期

---

## 第三步：浏览历史

### 场景：想要查看项目的开发历程或找到特定提交

**步骤：**

```
1️⃣ 打开 Git Dashboard
   └─ 点击 "📜 Commits" 标签页

2️⃣ 查看提交列表
   每条提交包含：
   ├─ ☑️  选择框     (支持多选)
   ├─ 7c9726e 短 hash (可点击复制)
   ├─ commit message   (提交说明)
   ├─ John 2 hours ago (作者和时间)
   ├─ 📊 统计信息      (文件数、增删行数)
   └─ 👁️  ↩️ 操作按钮  (查看详情、撤销)
```

### 搜索和过滤

**按作者过滤：**
```
输入框：Filter by author...
└─ 输入 "Alice"
   └─ 只显示 Alice 提交的内容
```

**按信息搜索：**
```
输入框：Search message...
└─ 输入 "fix bug"
   └─ 只显示包含 "fix bug" 的提交
```

**排序方式：**
```
下拉框：Sort by...
├─ Date    (时间倒序)
├─ Author  (按作者字母序)
└─ Message (按提交信息字母序)
```

### 提交统计解读

```
Hash     Message              Author    Time        Stats
7c9726e  feat: add git ui     John      2h ago  ✅ 4 files  +145  -32

含义：
- 4 files   : 修改了 4 个文件
- +145      : 新增 145 行代码
- -32       : 删除 32 行代码
- 净增长    : 113 行代码
```

### 高级操作

**查看提交详情：**
```
1. 点击提交项右侧的 "👁️" 按钮
2. 显示完整的提交信息和代码差异
3. 可以看到具体修改了哪些文件
```

**撤销提交：**
```
1. 点击提交项右侧的 "↩️" 按钮
2. 确认撤销操作
3. 系统会自动创建反向提交
   (注意：这会创建新提交，不是删除历史)
```

**多选提交：**
```
1. Ctrl + Click (或 Cmd + Click) 选择多个提交
2. 选中的提交会高亮显示
3. 可用于批量操作或分析
```

---

## 高级技巧

### 🎯 技巧 1: 快速切换分支

```
Git Panel → Branches 标签页

┌─ main (✓ 当前分支)
├─ develop
├─ feature/new-ui
└─ hotfix/bug-fix

点击任何分支即可切换！
```

### 🎯 技巧 2: 一键同步

```
顺序执行：
1. ➕ Add All     (暂存所有)
2. 💾 Commit      (提交更改)
3. ⬆️ Push        (推送到远程)

完全同步只需 3 步！
```

### 🎯 技巧 3: 对比贡献

在 **Statistics → Contributors** 标签页：

```
对比看板：
🥇 Alice (128 commits)  ████████████████
🥈 Bob   (89 commits)   ███████████
🥉 Charlie (56 commits) ███████

一眼看出谁贡献最多！
```

### 🎯 技巧 4: 追踪关键文件

在 **Statistics → Stats** 标签页：

```
频繁修改的文件 = 高优先级文件

例如：src/main.js 修改 45 次
→ 这是核心业务逻辑
→ 需要重点关注代码质量
→ 需要完整的测试覆盖
```

### 🎯 技巧 5: 快速定位问题

```
需要找 Bug 提交？

1. Commits 标签页
2. 搜索 "fix"
3. 按日期排序
4. 找到相关的所有修复
```

---

## 🐛 常见问题

### Q: 如何查看一个提交修改了哪些文件？

A: 点击提交项右侧的 👁️ 按钮，或查看提交项右侧的统计信息。

### Q: 我不小心提交了错误的代码，怎么办？

A: 
```
方案 1: 撤销提交 (推荐)
└─ 点击提交项的 ↩️ 按钮
   系统创建反向提交，代码回到之前状态

方案 2: 强制推送 (谨慎使用)
└─ 必须确保没有其他人依赖此提交
```

### Q: 为什么我的提交历史很长？

A: 这是正常的！长历史记录意味着：
- ✅ 项目活跃度高
- ✅ 有完整的代码记录
- ✅ 可追踪所有更改

### Q: 如何查看两个分支的差异？

A: 
```
1. Branches 标签页
2. 选择第一个分支
3. 查看其提交历史
4. 与另一个分支对比
```

---

## 📚 更多资源

### 相关文档
- 📖 [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) - 工作流指南
- 📖 [GIT_VISUALIZATION.md](./GIT_VISUALIZATION.md) - 功能详解

### 外部资源
- [Git 官方文档](https://git-scm.com/doc)
- [Github 帮助文档](https://docs.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🎉 完成！

你已经学会了如何使用 Git 可视化系统！

### 下一步建议

1. **实践** - 在真实项目中尝试
2. **探索** - 点击各个按钮，熟悉界面
3. **分享** - 告诉团队成员这个强大的工具
4. **反馈** - 提出改进建议

### 需要帮助？

```
常见操作快速查询：

暂存文件          ➕ Add All
提交更改          💾 Commit
推送到远程        ⬆️ Push
从远程拉取        ⬇️ Pull
切换分支          🔀 Checkout
查看统计          📊 Statistics
浏览历史          📜 Commits
```

---

**祝你开发愉快！** 🚀

---

*最后更新: 2025-11-16*

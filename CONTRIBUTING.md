# 贡献指南

感谢你对 Huaan Command 的关注！我们欢迎任何形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)

## 🤝 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们作为贡献者和维护者承诺:

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 专注于对社区最有利的事情
- 对其他社区成员表现出同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 其他不道德或不专业的行为

## 💡 如何贡献

### 报告 Bug

如果你发现了 bug，请创建一个 issue 并提供:

1. **清晰的标题**: 简洁描述问题
2. **重现步骤**: 详细的操作步骤
3. **期望行为**: 应该发生什么
4. **实际行为**: 实际发生了什么
5. **环境信息**: 操作系统、版本号等
6. **截图/日志**: 如果可能的话

**Bug 报告模板:**

```markdown
## Bug 描述
[简洁描述 bug]

## 重现步骤
1. 打开应用
2. 点击...
3. 输入...
4. 看到错误...

## 期望行为
[应该发生什么]

## 实际行为
[实际发生了什么]

## 环境
- 操作系统: macOS 14.0
- 应用版本: 1.1.0
- Node.js: 18.0.0
- Rust: 1.90.0

## 截图
[如果适用，添加截图]

## 额外信息
[其他相关信息]
```

### 建议新功能

我们欢迎新功能建议！请创建一个 issue 并说明:

1. **功能描述**: 清晰描述功能
2. **使用场景**: 为什么需要这个功能
3. **期望实现**: 你期望如何实现
4. **替代方案**: 你考虑过的其他方案

**功能请求模板:**

```markdown
## 功能描述
[清晰简洁地描述功能]

## 使用场景
作为 [用户角色]，我想要 [功能]，以便 [好处]

## 期望实现
[描述你期望的实现方式]

## 替代方案
[描述你考虑过的其他方案]

## 额外信息
[其他相关信息]
```

## 🛠️ 开发流程

### 1. Fork 项目

点击页面右上角的 "Fork" 按钮

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/huaan-command.git
cd huaan-command
```

### 3. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范:**
- `feature/功能名`: 新功能
- `fix/问题描述`: Bug 修复
- `docs/文档名`: 文档更新
- `refactor/模块名`: 代码重构
- `perf/优化描述`: 性能优化
- `test/测试名`: 测试相关

### 4. 安装依赖

```bash
npm install
```

### 5. 开发

```bash
# 启动开发服务器
npm run tauri dev

# 或使用便捷脚本
./run.sh
```

### 6. 测试

```bash
# 运行测试
npm run test

# 代码检查
npm run lint
```

### 7. 提交更改

```bash
git add .
git commit -m "feat: 添加新功能"
```

### 8. 推送到 GitHub

```bash
git push origin feature/your-feature-name
```

### 9. 创建 Pull Request

在 GitHub 上创建 Pull Request

## 📝 代码规范

### JavaScript/Vue 规范

我们使用 ESLint + Prettier 进行代码规范检查:

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix
```

**关键规范:**

- 使用 2 空格缩进
- 使用单引号
- 使用分号
- 每行最多 100 字符
- 使用 Composition API (Vue 3)
- 优先使用 const，必要时使用 let，避免 var

**Vue 组件规范:**

```vue
<script setup>
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import { useStore } from './stores/myStore'

// 2. Props & Emits
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 }
})

const emit = defineEmits(['update', 'close'])

// 3. Composables
const store = useStore()

// 4. 响应式状态
const isOpen = ref(false)
const items = ref([])

// 5. 计算属性
const filteredItems = computed(() => {
  return items.value.filter(item => item.active)
})

// 6. 方法
function handleClick() {
  emit('update', items.value)
}

// 7. 生命周期
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 作用域样式 */
</style>
```

### Rust 规范

使用 `cargo fmt` 和 `cargo clippy`:

```bash
# 格式化代码
cargo fmt

# 代码检查
cargo clippy
```

**关键规范:**

- 使用 `rustfmt` 默认配置
- 遵循 Rust API 设计指南
- 添加文档注释
- 处理所有错误情况
- 避免 `unwrap()`，使用 `?` 或 `match`

## 📋 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整 (不影响功能)
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例

```bash
# 简单提交
git commit -m "feat: 添加终端分屏功能"

# 带作用域
git commit -m "fix(terminal): 修复会话恢复失败的问题"

# 带详细说明
git commit -m "feat(ai): 添加 AI 响应缓存

- 实现基于 LRU 的缓存机制
- 缓存大小限制为 100 条
- 缓存过期时间为 1 小时

Closes #123"
```

## 🔄 Pull Request 流程

### 创建 PR

1. **标题**: 清晰描述改动
2. **描述**: 详细说明改动内容和原因
3. **关联 Issue**: 如果有的话
4. **截图**: 如果是 UI 改动
5. **测试**: 说明如何测试

**PR 模板:**

```markdown
## 改动类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 改动描述
[清晰描述你的改动]

## 关联 Issue
Closes #123

## 测试
[描述如何测试你的改动]

## 截图
[如果是 UI 改动，添加截图]

## Checklist
- [ ] 代码遵循项目规范
- [ ] 已添加必要的测试
- [ ] 文档已更新
- [ ] 所有测试通过
- [ ] 代码检查通过
```

### 代码审查

提交 PR 后:

1. 自动检查会运行 (CI/CD)
2. 维护者会审查你的代码
3. 可能会有修改建议
4. 完成所有讨论后会被合并

### 合并要求

- ✅ 所有 CI 检查通过
- ✅ 至少一个维护者批准
- ✅ 没有冲突
- ✅ 代码符合规范
- ✅ 有必要的测试

## 🎯 优先级

我们根据以下优先级处理 Issue 和 PR:

1. **P0 - 紧急**: 严重 Bug、安全问题
2. **P1 - 高**: 重要功能、影响多人的 Bug
3. **P2 - 中**: 功能增强、小 Bug
4. **P3 - 低**: 优化、文档改进

## 📚 资源

- [Vue 3 文档](https://vuejs.org/)
- [Tauri 文档](https://tauri.app/)
- [Rust 文档](https://doc.rust-lang.org/)
- [项目文档](./README.md)

## 💬 联系我们

- 📧 邮箱: support@huaan-command.com
- 🐛 Issues: [GitHub Issues](https://github.com/hua123an/huaan-command/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/hua123an/huaan-command/discussions)

## 🙏 感谢

感谢所有贡献者！你们的贡献让这个项目变得更好。

---

<div align="center">
  <p>用 ❤️ 制作</p>
</div>

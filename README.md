# Huaan Command - 智能终端命令管理工具

<div align="center">

![Huaan Command Logo](icon.svg)

**一个现代化的终端命令管理工具，集成 AI 助手，支持并发任务执行和多终端管理**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/vue-3.5-green.svg)](https://vuejs.org/)
[![Tauri 2](https://img.shields.io/badge/tauri-2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/rust-1.90-orange.svg)](https://www.rust-lang.org/)

</div>

## ✨ 核心特性

### 🖥️ 智能终端系统
- **多标签终端管理** - 支持多个并发终端会话
- **会话持久化** - 重启应用后自动恢复终端状态
- **AI 模式集成** - 终端内直接使用 AI 助手
- **虚拟滚动优化** - 高效处理大量输出
- **命令历史搜索** - Ctrl+R 快速查找历史命令

### 🤖 AI 助手功能
- **多 AI 服务商支持** - OpenAI、DeepSeek、Kimi、智谱等
- **自然语言命令生成** - 用中文描述生成 Shell 命令
- **流式响应** - 实时显示 AI 回复，打字机效果
- **智能错误诊断** - 自动分析并解决命令错误
- **项目分析** - AI Agent 模式，智能理解项目结构

### 📋 任务管理系统
- **并发执行** - 真正的异步并发，效率提升 600%
- **任务依赖关系** - 拓扑排序，智能调度
- **批量操作** - 多选任务，批量执行/取消/删除
- **实时监控** - 任务状态、输出、错误实时显示
- **历史记录** - 完整的执行历史和统计

### 🎨 用户体验设计
- **多主题支持** - 深色、浅色、海洋蓝、森林绿、夕阳橙
- **自定义颜色** - 完全可定制的主题色彩系统
- **平滑动画** - 主题切换、界面交互的流畅过渡
- **快捷键系统** - 全局快捷键管理，提升操作效率
- **响应式设计** - 适配不同屏幕尺寸

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- macOS / Linux / Windows

### 安装和运行

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/huaan-command.git
cd huaan-command

# 2. 安装依赖
NODE_ENV=development npm install

# 3. 启动应用
npm run tauri dev
# 或者使用便捷脚本
./run.sh
```

### 一键启动

```bash
./run.sh
```

## 📖 使用指南

### 终端操作

#### 基础命令
```bash
# 创建新终端标签
点击 "+" 按钮或按 Ctrl+T

# 切换终端标签
点击标签或使用 Ctrl+Tab/Ctrl+Shift+Tab

# 重命名终端
双击标签标题进行编辑

# AI 模式切换
按 Ctrl+A 或点击 AI 模式按钮
```

#### AI 模式使用
```bash
# 方式 1: 快捷命令
$ /ai 查找大于100MB的文件
🤖 AI 正在生成命令...
find . -type f -size +100M  [流式显示]
✨ 执行中...

# 方式 2: AI 模式
$ [按 Ctrl+A]
🤖 AI 模式已启用
$ 压缩dist目录
🤖 AI 正在生成命令...
tar -czf dist.tar.gz dist/  [实时显示]
✨ 执行中...
```

#### 反向历史搜索
```bash
# 启动反向搜索
按 Ctrl+R

# 搜索历史命令
(reverse-i-search)`find`: 显示匹配结果

# 导航搜索结果
↑/↓: 选择历史命令
Enter: 执行命令
Esc: 退出搜索
```

### 任务管理

#### 创建任务
```bash
# 单个任务
1. 点击 "+ 新建任务"
2. 输入任务名称和命令
3. 选择分组（可选）

# 批量任务
1. 创建多个任务
2. 点击 "运行所有"
3. 所有任务并发执行
```

#### 任务依赖
```bash
# 设置依赖关系
1. 在任务详情中设置依赖
2. 系统自动计算执行顺序
3. 依赖完成后自动执行
```

### 设置配置

#### AI 配置
- **服务商选择**: OpenAI、DeepSeek、Kimi 等
- **API Key**: 安全存储，支持显示/隐藏
- **模型选择**: GPT-4o、GPT-3.5 等
- **功能开关**: 启用/禁用 AI 功能

#### 主题定制
- **预设主题**: 6 个精心设计的主题
- **自定义颜色**: 完全可定制的色彩系统
- **实时预览**: 主题切换即时预览
- **导入导出**: 主题配置的备份和分享

#### 终端设置
- **字体配置**: 大小、字体系列
- **会话管理**: 自动恢复开关
- **交互设置**: 光标闪烁、快捷键等

## ⌨️ 快捷键大全

### 全局快捷键
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+T` | 新建终端标签 |
| `Ctrl+W` | 关闭当前标签 |
| `Ctrl+Tab` | 下一个标签 |
| `Ctrl+Shift+Tab` | 上一个标签 |
| `Ctrl+K` | 打开命令面板 |
| `Ctrl+,` | 打开设置 |
| `Ctrl+Shift+A` | 切换 AI 模式 |
| `Ctrl+/` | 切换 AI 聊天 |
| `Escape` | 关闭弹窗/退出 AI |

### 终端内快捷键
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+A` | 切换 AI 模式 |
| `Ctrl+R` | 反向历史搜索 |
| `Ctrl+C` | 中断进程 |
| `Ctrl+L` | 清空终端 |
| `↑/↓` | 历史命令导航 |
| `Tab` | 自动补全 |

### AI 模式快捷键
| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 |
| `Shift+Enter` | 换行 |
| `↑/↓` | 编辑历史消息 |
| `Escape` | 退出 AI 模式 |

## 🛠️ 开发指南

### 技术栈

**前端**
- Vue 3 (Composition API)
- Pinia (状态管理)
- Vue Router (路由)
- xterm.js (终端模拟)
- Vite (构建工具)

**后端**
- Rust (系统编程)
- Tauri 2.0 (桌面应用框架)
- Tokio (异步运行时)
- portable-pty (终端模拟)

### 项目结构

```
huaan-command/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── composables/        # 组合式函数
│   ├── stores/             # Pinia 状态管理
│   ├── views/               # 页面组件
│   └── router/             # 路由配置
├── src-tauri/              # Rust 后端
│   ├── src/                # Rust 源码
│   └── Cargo.toml          # Rust 依赖
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   └── integration/        # 集成测试
└── docs/                   # 文档
```

### 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建应用
npm run tauri build

# 运行测试
npm run test

# 代码检查
npm run lint
```

### 调试技巧

**前端调试**
- 使用 Vue DevTools
- 检查 Pinia 状态
- 查看组件生命周期

**后端调试**
- 查看 Rust 日志
- 使用 `println!` 输出
- 检查 Tauri 事件

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 测试覆盖率
npm run test:coverage
```

### 测试结构

- **单元测试**: 组件和函数测试
- **集成测试**: 功能模块测试
- **E2E 测试**: 端到端用户流程

## 📦 构建和部署

### 构建选项

```bash
# 开发构建
npm run tauri build

# 生产构建
npm run tauri build --release

# 特定平台构建
npm run tauri build --target x86_64-apple-darwin
```

### 分发配置

编辑 `src-tauri/tauri.conf.json` 配置构建选项。

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request
5. 代码审查
6. 合并主分支

### 代码规范

- 使用 ESLint 检查代码
- 遵循 Vue 3 最佳实践
- Rust 代码使用 `cargo fmt` 格式化
- 编写单元测试

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源项目：

- [Tauri](https://tauri.app/) - 跨平台应用框架
- [Vue.js](https://vuejs.org/) - 响应式前端框架
- [xterm.js](https://xterm.js/) - 终端模拟器
- [Rust](https://www.rust-lang.org/) - 系统编程语言
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理

## 📚 文档

- [🤖 AI Complete User Guide](./AI_COMPLETE_GUIDE.md) - AI 功能完整使用指南
- [🔧 AI Technical Reference](./AI_TECHNICAL_REFERENCE.md) - AI 技术实现文档
- [🖥️ AI Terminal Integration](./AI_TERMINAL_INTEGRATION.md) - AI 终端集成详解
- [⚡ Performance Optimization](./PERFORMANCE_OPTIMIZATION.md) - 性能优化指南
- [✨ Complete Features Documentation](./FEATURES_COMPLETE.md) - 完整功能文档
- [🛠️ Development Guide](./DEVELOPMENT_GUIDE.md) - 开发者指南
- [Warp 模式详解](./WARP_MODE.md) - Warp 模式使用说明
- [终端持久化](./TERMINAL_PERSISTENCE.md) - 终端会话管理

## 📞 支持

- 📧 邮箱: support@huaan-command.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/hua123an/huaan-command/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/hua123an/huaan-command/discussions)

---

<div align="center">
  <p>用 ❤️ 和 ☕ 制作</p>
</div>

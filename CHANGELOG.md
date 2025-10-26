# Changelog

All notable changes to Huaan Command will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-10-26

### Added
- 🎨 **调试面板系统**: 实时日志查看、分级日志管理
- 📊 **统一日志系统**: `logsStore` 替代分散的 console.log
- 🔒 **API Key 加密存储**: 使用 Tauri secure storage 保护敏感信息
- ⚡ **性能优化**: 终端 buffer 限制、组件懒加载、AI 响应缓存
- ✅ **代码规范**: ESLint + Prettier 配置
- 📝 **完善文档**: CHANGELOG、CONTRIBUTING、环境变量示例
- 🛡️ **安全增强**: CORS 配置、关闭标签确认对话框
- 🤖 **AI 功能增强**: 错误重试机制、友好的错误提示

### Fixed
- 🐛 修复终端初始化问题
- 🐛 完成 Terminal.vue 中的 TODO 功能
- 🐛 优化终端 buffer 内存占用

### Changed
- 🔄 路由组件改为懒加载
- 🔄 优化 AI 错误处理逻辑
- 🔄 改进用户体验细节

### Performance
- ⚡ 终端 buffer 限制为 10000 行
- ⚡ AI 响应本地缓存
- ⚡ 代码分割和懒加载优化

## [1.0.0] - 2024-10-25

### Added
- 🖥️ **智能终端系统**
  - 多标签终端管理
  - 会话持久化
  - 命令历史搜索 (Ctrl+R)
  - Warp 模式界面

- 🤖 **AI 助手功能**
  - 支持 8+ AI 服务商
  - 自然语言命令生成
  - 流式响应显示
  - 智能错误诊断
  - 项目分析 (AI Agent 模式)

- 📋 **任务管理系统**
  - 并发任务执行 (600% 性能提升)
  - 任务依赖关系管理
  - 实时状态监控
  - 批量操作支持

- 🎨 **用户体验**
  - 5 种主题支持
  - 自定义颜色系统
  - 全局快捷键
  - 响应式设计
  - @ 文件选择器

### Technical
- 🏗️ 基于 Vue 3 + Tauri 2.0
- 🦀 Rust 后端高性能处理
- 📦 Vite 构建优化
- 🔐 本地优先的数据存储

---

## 版本说明

### 版本号规则
- **主版本号 (Major)**: 重大架构变更、不兼容更新
- **次版本号 (Minor)**: 新功能添加、功能增强
- **修订号 (Patch)**: Bug 修复、小优化

### 发布周期
- **稳定版**: 每月发布
- **测试版**: 每周更新
- **热修复**: 按需发布

---

## 未来计划

### v1.2.0 (计划中)
- [ ] 插件系统完善
- [ ] 云端同步功能
- [ ] 更多 AI 模型支持
- [ ] 性能监控面板
- [ ] 自动化测试覆盖

### v2.0.0 (规划中)
- [ ] 多窗口支持
- [ ] SSH 远程连接
- [ ] Docker 集成
- [ ] Git 可视化
- [ ] 团队协作功能

---

[1.1.0]: https://github.com/hua123an/huaan-command/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/hua123an/huaan-command/releases/tag/v1.0.0

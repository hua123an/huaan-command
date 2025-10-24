# Huaan Command - 构建说明

## 📦 打包说明

### Intel 版本 (x86_64)
```bash
npm run tauri:build:intel
```

打包产物位置：
- DMG: `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/`

### 通用版本
```bash
npm run tauri:build
```

## 🔧 配置要求

### AI 功能配置
应用需要配置 AI 服务才能使用 AI 功能：

1. 启动应用后，点击右上角设置图标
2. 在"AI 设置"中配置：
   - API Key（OpenAI 或兼容服务）
   - API Base URL（可选，默认使用 OpenAI）
   - 选择模型（如 gpt-4o-mini, deepseek-chat 等）

### 终端会话持久化
- 终端会话自动保存到本地存储
- 支持多标签页管理
- 应用重启后自动恢复上次的终端会话

## 🚀 功能特性

### 1. 任务管理
- 创建、编辑、删除任务
- 任务状态管理（待处理/进行中/已完成）
- 任务历史记录

### 2. 智能终端
- **Warp 模式**：类 Warp 终端体验
  - 终端模式/AI 模式快速切换
  - `@` 符号选择文件/目录
  - 动态模型切换
  
- **AI 对话模式**：
  - 连续对话，自动保持上下文
  - 流式输出 + Markdown 渲染
  - 支持代码块、列表、标题等格式

- **AI Agent 模式**：
  - 项目分析：理解项目结构和架构
  - 代码修改：智能建议和修改方案
  - 命令生成：自然语言转命令

### 3. 终端会话管理
- 多标签页支持
- 会话自动保存和恢复
- 独立的终端进程管理

## 📋 系统要求

- macOS 10.15+
- Intel 处理器

## 🔐 权限说明

应用需要以下权限：
- 终端访问：用于执行命令和管理终端会话
- 网络访问：用于 AI 功能（调用 AI API）
- 文件系统访问：用于项目文件分析和任务数据存储

## 🛠️ 开发环境

### 依赖
- Node.js 16+
- Rust 1.70+
- macOS 开发工具

### 开发模式
```bash
npm install
npm run tauri dev
```

### 构建前端
```bash
npm run build
```

### 清理构建
```bash
rm -rf dist
rm -rf src-tauri/target
```

## 📝 版本说明

**Version 1.0.0**
- 首个正式版本
- 完整的任务管理功能
- AI 驱动的智能终端
- Warp 模式体验
- 终端会话持久化

## 📄 License

MIT License - Copyright © 2024 Huaan


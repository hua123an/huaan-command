# 运行 Huaan Command 应用

## 当前状态
✅ Rust 后端已编译完成
✅ Tauri 应用可以启动
⚠️  npm 依赖需要完整安装

## 快速启动

由于 npm 依赖安装遇到缓存权限问题，使用以下两种方法之一启动应用：

### 方法 1: 修复 npm 并正常启动（推荐）

```bash
# 1. 修复 npm 缓存权限
sudo chown -R $(whoami) ~/.npm

# 2. 完全重装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 正常启动
npm run tauri dev
```

### 方法 2: 使用 npx 临时依赖（当前可用）

应用已经在运行！如果需要重启：

```bash
# Terminal 1: 启动 Vite
npx vite@7 --port 1420

# Terminal 2: 启动 Tauri  
npx @tauri-apps/cli@2 dev
```

## 功能说明

应用包含两个主要页面：

### 1. 任务管理页面（默认）
- 创建多个命令任务
- 点击"运行所有"按钮并发执行所有任务
- 实时查看任务状态和输出
- macOS 风格的简约界面

### 2. 终端页面
- 多标签终端
- 完整的 shell 功能

## 测试并发执行

1. 点击"新建任务"
2. 创建几个测试任务：
   - 任务1: `echo "Task 1" && sleep 3 && echo "Task 1 done"`
   - 任务2: `echo "Task 2" && sleep 2 && echo "Task 2 done"`
   - 任务3: `echo "Task 3" && sleep 1 && echo "Task 3 done"`
3. 点击"运行所有"按钮
4. 观察三个任务同时开始执行并独立完成

## 技术细节

- 后端: Rust + Tauri 2 + Tokio (真正的并发)
- 前端: Vue 3 + Pinia + Vue Router
- 终端: xterm.js + portable-pty
- 设计: macOS 原生风格


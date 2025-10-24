# 测试指南

## ✅ 应用已成功启动！

### 当前状态
- ✅ Vite 开发服务器运行在 http://localhost:1420
- ✅ Tauri 应用窗口已打开
- ✅ Rust 后端编译成功
- ✅ 所有依赖已正确安装

### 问题根源与解决
**问题**: `NODE_ENV=production` 导致 npm 不安装 devDependencies

**解决**: 使用 `NODE_ENV=development npm install`

## 测试并发任务功能

### 1. 基础测试 - 3个并发任务

在应用界面中：

1. **点击 "新建任务"**
2. **创建任务 1**:
   - 名称: `任务1 - 2秒`
   - 命令: `echo "开始任务 1" && sleep 2 && echo "任务 1 完成"`

3. **创建任务 2**:
   - 名称: `任务2 - 1秒`
   - 命令: `echo "开始任务 2" && sleep 1 && echo "任务 2 完成"`

4. **创建任务 3**:
   - 名称: `任务3 - 3秒`
   - 命令: `echo "开始任务 3" && sleep 3 && echo "任务 3 完成"`

5. **点击 "运行所有" 按钮**

**预期结果**:
- ✓ 三个任务同时显示为"运行中"状态
- ✓ 任务 2 最先完成（约1秒）→ 绿色勾号
- ✓ 任务 1 其次完成（约2秒）→ 绿色勾号
- ✓ 任务 3 最后完成（约3秒）→ 绿色勾号
- ✓ 总耗时约3秒（而非6秒）

### 2. 实用测试 - 模拟真实场景

#### 场景1: 并行安装依赖
```bash
任务1: cd /tmp && mkdir -p test1 && cd test1 && npm init -y
任务2: cd /tmp && mkdir -p test2 && cd test2 && npm init -y
任务3: cd /tmp && mkdir -p test3 && cd test3 && npm init -y
```

#### 场景2: 并行文件处理
```bash
任务1: find /Users -name "*.txt" -type f | head -100 > /tmp/txt_files.log
任务2: find /Users -name "*.md" -type f | head -100 > /tmp/md_files.log
任务3: find /Users -name "*.js" -type f | head -100 > /tmp/js_files.log
```

#### 场景3: 并行网络请求
```bash
任务1: curl -s https://api.github.com/users/github > /tmp/github.json
任务2: curl -s https://api.github.com/users/npm > /tmp/npm.json
任务3: curl -s https://api.github.com/users/rust-lang > /tmp/rust.json
```

### 3. 失败测试 - 错误处理

创建会失败的任务：

```bash
任务1: ls /nonexistent/directory
任务2: echo "成功的任务"
任务3: invalid_command_xyz
```

**预期结果**:
- ✓ 任务1 和 任务3 显示红色叉号（失败）
- ✓ 任务2 显示绿色勾号（成功）
- ✓ 点击失败的任务可以查看错误信息

### 4. 取消测试 - 中断长任务

```bash
任务1: sleep 30 && echo "完成"
任务2: sleep 30 && echo "完成"
```

**操作**:
1. 点击"运行所有"
2. 等待2秒
3. 点击任一任务的停止按钮 ■

**预期结果**:
- ✓ 被取消的任务显示为"已取消"状态
- ✓ 其他任务继续运行

## 界面功能检查清单

### 任务管理页面
- [ ] 创建任务按钮工作正常
- [ ] 任务表单显示模板选项
- [ ] 任务列表显示所有任务
- [ ] 任务状态颜色正确（蓝色=运行中，绿色=成功，红色=失败）
- [ ] 运行按钮(▶)工作
- [ ] 取消按钮(■)工作
- [ ] 点击任务卡片显示详情面板
- [ ] 详情面板显示完整输出
- [ ] "运行所有"按钮并发执行所有任务
- [ ] "清空"按钮清除所有任务
- [ ] 统计数字实时更新

### 终端页面
- [ ] 点击"终端"标签切换页面
- [ ] 终端可以输入命令
- [ ] 新建标签按钮(+)工作
- [ ] 关闭标签按钮(×)工作
- [ ] 多标签切换正常

### macOS 设计风格
- [ ] 毛玻璃背景效果
- [ ] SF 字体渲染
- [ ] 圆角按钮和卡片
- [ ] 平滑动画过渡
- [ ] 颜色系统（蓝/绿/红）符合 macOS
- [ ] 暗色主题一致性

## 性能测试

### 10个并发任务
创建10个任务，每个运行 `sleep 2 && echo "done"`

**预期**: 全部在约2秒内完成（非20秒）

### 大量输出
任务命令: `for i in {1..1000}; do echo "Line $i"; done`

**预期**: 
- 输出流畅显示
- 界面不卡顿
- 可以滚动查看

## 重启应用

```bash
# 方法1: 直接运行（推荐）
cd /Users/huaaan/huaan-command
NODE_ENV=development npm run tauri dev

# 方法2: 如果需要重装依赖
rm -rf node_modules package-lock.json
NODE_ENV=development npm install
NODE_ENV=development npm run tauri dev
```

## 故障排除

### 如果 npm install 只安装了 43 个包
```bash
# 确保 NODE_ENV 不是 production
echo $NODE_ENV
NODE_ENV=development npm install
```

### 如果应用无法启动
```bash
# 重新编译 Rust
cd src-tauri
cargo clean
cargo build
cd ..
NODE_ENV=development npm run tauri dev
```

### 如果看不到任务页面
检查浏览器控制台（在 Tauri 窗口按 Cmd+Option+I）

## 技术实现细节

### 后端并发机制
- 使用 Tokio 异步运行时
- 每个任务在独立的 `tokio::spawn` 中运行
- 通过 `tokio::process::Command` 执行 shell 命令
- 实时捕获 stdout 和 stderr
- 通过 Tauri 事件系统推送更新到前端

### 前端状态管理
- Pinia store 管理任务状态
- 监听 `task-updated` 事件更新任务
- 监听 `task-output` 和 `task-error` 事件显示输出
- Vue Router 管理页面切换

### 数据流
```
用户点击"运行所有" 
  → 前端调用 run_all_tasks() 
  → 后端并发启动所有任务
  → 每个任务独立输出到 stdout/stderr
  → 后端通过事件推送更新
  → 前端实时更新 UI
```

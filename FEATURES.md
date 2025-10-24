# 任务并发执行功能

## 已实现的功能

### 后端 (Rust/Tauri)

1. **任务管理模块** (`src-tauri/src/task.rs`)
   - ✅ 任务创建、运行、取消、清空
   - ✅ 并发执行所有任务
   - ✅ 实时输出捕获 (stdout/stderr)
   - ✅ 任务状态跟踪 (pending, running, success, failed, cancelled)
   - ✅ 任务时间记录 (开始时间、结束时间、耗时)
   - ✅ 支持 Windows/macOS/Linux 多平台

2. **Tauri 命令**
   - `create_task` - 创建任务
   - `run_task` - 运行单个任务
   - `run_all_tasks` - **并发运行所有任务**
   - `get_task` - 获取任务详情
   - `get_all_tasks` - 获取所有任务
   - `cancel_task` - 取消任务
   - `clear_tasks` - 清空所有任务

3. **事件系统**
   - `task-updated` - 任务状态更新
   - `task-output` - 任务输出
   - `task-error` - 任务错误输出

### 前端 (Vue 3)

1. **任务管理界面** (`src/views/Tasks.vue`)
   - ✅ 任务统计面板 (总数、运行中、成功、失败)
   - ✅ 批量操作按钮 (运行所有、清空)
   - ✅ 简约 macOS 设计风格
   - ✅ 毛玻璃效果背景

2. **任务列表** (`src/components/TaskList.vue`)
   - ✅ 任务卡片展示 (名称、命令、状态)
   - ✅ 状态指示器 (颜色、图标、动画)
   - ✅ 任务操作 (运行、取消)
   - ✅ 任务详情查看
   - ✅ 按状态智能排序
   - ✅ 空状态提示

3. **任务表单** (`src/components/TaskForm.vue`)
   - ✅ 创建任务弹窗
   - ✅ 快速命令模板 (npm、git、系统命令等)
   - ✅ 表单验证

4. **任务详情面板** (`src/components/TaskDetail.vue`)
   - ✅ 任务信息展示
   - ✅ 输出/错误日志查看
   - ✅ 实时更新
   - ✅ 复制命令功能

5. **状态管理** (`src/stores/task.js`)
   - ✅ Pinia store
   - ✅ 事件监听和处理
   - ✅ 状态统计
   - ✅ 任务筛选

6. **导航** (`src/components/Navigation.vue`)
   - ✅ 任务/终端切换
   - ✅ macOS 风格按钮

## 核心特性

### 并发执行
- 使用 Tokio 异步运行时实现真正的并发
- 每个任务在独立的 tokio task 中运行
- 不会相互阻塞，完全并行执行

### 实时监控
- 通过 Tauri 事件系统实时推送任务状态
- 输出实时显示在控制台和详情面板
- 动画效果显示运行状态

### macOS 设计风格
- 毛玻璃效果 (backdrop-filter)
- SF Pro 字体
- 原生颜色系统 (蓝色、绿色、红色等)
- 圆角、阴影、过渡动画
- 暗色主题

## 使用方法

1. **创建任务**
   - 点击 "新建任务" 按钮
   - 输入任务名称和命令
   - 或选择快速模板

2. **单独运行任务**
   - 点击任务卡片上的播放按钮 ▶

3. **并发运行所有任务**
   - 点击右上角 "运行所有" 按钮
   - 所有待运行和失败的任务将同时开始执行

4. **查看任务详情**
   - 点击任务卡片
   - 右侧展开详情面板
   - 可查看完整输出和错误日志

5. **取消任务**
   - 运行中的任务可点击停止按钮 ■

## 启动应用

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建应用
npm run tauri build
```

## 技术栈

- **前端**: Vue 3, Pinia, Vue Router
- **后端**: Rust, Tauri 2, Tokio
- **UI**: 原生 CSS (macOS 风格)
- **终端**: xterm.js, portable-pty

## 示例场景

1. **批量项目构建**
   ```
   任务1: npm install --prefix project1
   任务2: npm install --prefix project2
   任务3: npm install --prefix project3
   点击 "运行所有" → 三个项目同时安装依赖
   ```

2. **并行测试**
   ```
   任务1: npm test -- unit
   任务2: npm test -- integration
   任务3: npm test -- e2e
   点击 "运行所有" → 所有测试同时运行
   ```

3. **多服务部署**
   ```
   任务1: docker-compose up service1
   任务2: docker-compose up service2
   任务3: docker-compose up service3
   点击 "运行所有" → 所有服务同时启动
   ```

## 未来增强

- [ ] 任务依赖关系 (A完成后运行B)
- [ ] 任务模板保存和导入
- [ ] 任务执行历史记录
- [ ] 环境变量配置
- [ ] 工作目录设置
- [ ] 任务超时设置
- [ ] 失败自动重试
- [ ] 任务分组管理

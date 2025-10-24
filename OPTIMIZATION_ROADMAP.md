# Huaan Command - 优化与新功能路线图

## 🔧 需要优化的问题

### 1. 代码质量
**优先级: 高**

#### 当前问题
- ✗ Rust 警告: `field 'id' is never read` in terminal.rs
- ✗ 缺少错误处理的一致性
- ✗ 没有日志系统
- ✗ 缺少单元测试

#### 建议优化
```rust
// 修复未使用的字段警告
#[allow(dead_code)]
pub id: u64,

// 添加日志系统
use tracing::{info, error, debug};

// 统一错误类型
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Terminal error: {0}")]
    Terminal(String),
    #[error("Task error: {0}")]
    Task(String),
}
```

### 2. 性能优化
**优先级: 中**

#### 问题
- ✗ 大量任务输出时可能卡顿
- ✗ 没有输出缓冲和限制
- ✗ 内存可能无限增长

#### 建议
- 实现输出行数限制（如保留最后 10,000 行）
- 添加输出节流（throttle）机制
- 实现虚拟滚动显示大量输出
- 添加任务数量限制（防止创建过多任务）

```rust
const MAX_OUTPUT_LINES: usize = 10_000;
const MAX_TASKS: usize = 50;

// 输出缓冲
let mut lines: VecDeque<String> = VecDeque::with_capacity(MAX_OUTPUT_LINES);
if lines.len() >= MAX_OUTPUT_LINES {
    lines.pop_front();
}
```

### 3. 用户体验
**优先级: 高**

#### 问题
- ✗ 没有键盘快捷键
- ✗ 无法拖拽调整任务顺序
- ✗ 缺少任务搜索/过滤功能
- ✗ 没有任务执行历史

#### 建议
- 添加快捷键支持 (Cmd+N: 新建, Cmd+R: 运行全部)
- 实现任务拖拽排序
- 添加搜索栏
- 保存历史记录到本地存储

### 4. 数据持久化
**优先级: 中**

#### 问题
- ✗ 关闭应用后所有任务丢失
- ✗ 没有配置保存
- ✗ 无法导入/导出任务

#### 建议
```rust
// 使用 tauri-plugin-store 持久化
use tauri_plugin_store::StoreBuilder;

// 保存任务模板
{
  "tasks": [...],
  "settings": {
    "theme": "dark",
    "maxConcurrent": 10
  }
}
```

## 🚀 建议的新功能

### 1. 任务依赖系统
**优先级: 高 | 难度: 中**

#### 功能描述
允许任务之间定义依赖关系，实现复杂的工作流。

#### 实现方案
```typescript
interface Task {
  id: string;
  name: string;
  command: string;
  dependencies: string[]; // 依赖的任务 ID
  runOnSuccess?: boolean; // 仅在依赖成功后运行
}

// 拓扑排序执行任务
function executeDependencyGraph(tasks: Task[]) {
  // 1. 构建依赖图
  // 2. 拓扑排序
  // 3. 按顺序并发执行
}
```

#### 用途
- 构建流程: 安装依赖 → 编译 → 测试 → 部署
- 数据处理: 下载 → 解压 → 处理 → 上传

### 2. 任务模板和工作流
**优先级: 高 | 难度: 低**

#### 功能描述
保存常用任务组合为模板，一键执行整个工作流。

#### UI 设计
```
工作流列表:
├─ 📦 前端部署
│   ├─ npm install
│   ├─ npm run build
│   └─ npm run deploy
├─ 🧪 完整测试
│   ├─ npm run test:unit
│   ├─ npm run test:integration
│   └─ npm run test:e2e
```

#### 数据结构
```json
{
  "workflows": [
    {
      "id": "deploy-frontend",
      "name": "前端部署",
      "icon": "📦",
      "tasks": [
        {"name": "安装依赖", "command": "npm install"},
        {"name": "构建", "command": "npm run build"},
        {"name": "部署", "command": "npm run deploy"}
      ]
    }
  ]
}
```

### 3. 环境变量管理
**优先级: 中 | 难度: 低**

#### 功能描述
为每个任务或全局设置环境变量。

#### UI 界面
```
任务设置 > 环境变量:
┌─────────────────────────────┐
│ 键              值          │
├─────────────────────────────┤
│ NODE_ENV     production     │
│ API_KEY      ***********    │
│ PORT         3000           │
└─────────────────────────────┘
[+ 添加变量]
```

#### 实现
```rust
// 后端
let mut cmd = Command::new(shell);
cmd.env("NODE_ENV", "production");
cmd.env("API_KEY", api_key);
```

### 4. 任务调度器
**优先级: 中 | 难度: 中**

#### 功能描述
支持定时执行任务（Cron 表达式）。

#### 界面
```
调度设置:
├─ 一次性: 在 2024-01-01 10:00 运行
├─ 重复: 每天 9:00
├─ Cron: 0 */6 * * * (每 6 小时)
└─ 间隔: 每 30 分钟
```

#### 实现
```rust
use tokio_cron_scheduler::{JobScheduler, Job};

let scheduler = JobScheduler::new().await?;
scheduler.add(
    Job::new_async("0 0 9 * * *", |_uuid, _l| {
        Box::pin(async move {
            // 执行任务
        })
    })?
).await?;
```

### 5. 任务监控和统计
**优先级: 中 | 难度: 低**

#### 功能描述
显示任务执行统计和趋势图表。

#### 展示内容
- 任务成功率趋势图
- 平均执行时间
- 最常用的任务
- 失败任务分析

#### UI 组件
```vue
<template>
  <div class="stats-dashboard">
    <div class="stat-card">
      <h3>总执行次数</h3>
      <div class="stat-value">1,234</div>
    </div>
    <div class="stat-card">
      <h3>成功率</h3>
      <div class="stat-value">95.6%</div>
    </div>
    <div class="chart">
      <!-- 使用 Chart.js 或 echarts -->
    </div>
  </div>
</template>
```

### 6. 远程任务执行
**优先级: 低 | 难度: 高**

#### 功能描述
通过 SSH 在远程服务器执行任务。

#### 配置界面
```
远程服务器:
├─ 服务器 1 (production)
│   ├─ 地址: server.example.com
│   ├─ 用户: deploy
│   └─ 密钥: ~/.ssh/id_rsa
```

#### 实现
```rust
use ssh2::Session;

async fn execute_remote(host: &str, command: &str) -> Result<String> {
    let tcp = TcpStream::connect(host)?;
    let mut sess = Session::new()?;
    sess.set_tcp_stream(tcp);
    sess.handshake()?;
    // 执行命令
}
```

### 7. 任务输出高亮
**优先级: 低 | 难度: 低**

#### 功能描述
对输出内容进行语法高亮和智能解析。

#### 功能点
- 错误信息高亮（红色）
- 警告信息高亮（黄色）
- 成功信息高亮（绿色）
- URL 可点击
- 文件路径可跳转

#### 实现
```typescript
function highlightOutput(text: string): string {
  return text
    .replace(/ERROR:.*/g, '<span class="error">$&</span>')
    .replace(/WARNING:.*/g, '<span class="warning">$&</span>')
    .replace(/SUCCESS:.*/g, '<span class="success">$&</span>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
}
```

### 8. 并发控制
**优先级: 中 | 难度: 低**

#### 功能描述
限制同时运行的任务数量。

#### UI 设置
```
设置 > 并发控制:
┌──────────────────────────┐
│ 最大并发任务数: [5] ▼   │
│                          │
│ ○ 无限制                 │
│ ● 限制为 5 个任务        │
└──────────────────────────┘
```

#### 实现
```rust
use tokio::sync::Semaphore;

let semaphore = Arc::new(Semaphore::new(max_concurrent));
for task in tasks {
    let permit = semaphore.clone().acquire_owned().await?;
    tokio::spawn(async move {
        execute_task(task).await;
        drop(permit);
    });
}
```

### 9. 任务分组
**优先级: 中 | 难度: 低**

#### 功能描述
将任务组织到不同的分组中。

#### UI 界面
```
📁 前端项目
  ├─ 任务1
  └─ 任务2
📁 后端项目
  ├─ 任务3
  └─ 任务4
📁 测试
  └─ 任务5
```

### 10. 任务克隆和编辑
**优先级: 高 | 难度: 低**

#### 功能描述
- 快速克隆现有任务
- 编辑任务而不删除重建
- 任务历史版本

#### UI 操作
```
任务卡片右键菜单:
├─ ✏️  编辑
├─ 📋 克隆
├─ 🗑️  删除
└─ 📊 查看历史
```

## 📊 优先级矩阵

### 第一阶段（立即实施）
1. ✅ 修复代码警告
2. ✅ 添加键盘快捷键
3. ✅ 任务克隆和编辑功能
4. ✅ 任务模板系统

### 第二阶段（1-2周）
1. 🔄 数据持久化（本地存储）
2. 🔄 任务依赖系统
3. 🔄 环境变量管理
4. 🔄 输出高亮

### 第三阶段（1个月）
1. 📅 任务调度器
2. 📅 并发控制设置
3. 📅 任务分组
4. 📅 监控统计

### 第四阶段（长期）
1. 🔮 远程任务执行
2. 🔮 工作流可视化编辑器
3. 🔮 插件系统

## 🎨 UI/UX 改进建议

### 1. 深色/浅色主题切换
- 添加主题切换器
- 支持系统自动切换

### 2. 窗口布局自定义
- 可调整面板大小
- 保存布局偏好设置

### 3. 通知系统
- 任务完成桌面通知
- 失败任务警报
- 声音提示（可选）

### 4. 拖拽优化
- 拖拽文件到任务创建
- 拖拽调整任务顺序
- 拖拽任务到分组

## 🔒 安全性增强

1. **敏感信息处理**
   - 环境变量加密存储
   - API 密钥隐藏显示
   - 命令历史清理功能

2. **权限管理**
   - 危险命令警告
   - 需要确认的命令列表
   - 沙箱执行选项

## 🧪 测试建议

1. **单元测试**
   - Rust: cargo test
   - Vue: Vitest

2. **集成测试**
   - Tauri 测试框架
   - E2E 测试

3. **性能测试**
   - 100 个任务并发测试
   - 内存泄漏检测
   - 输出性能测试

## �� 打包和分发

1. **多平台支持**
   - macOS (Intel + Apple Silicon)
   - Windows
   - Linux (AppImage, deb, rpm)

2. **自动更新**
   - tauri-plugin-updater
   - 版本检查
   - 增量更新

3. **应用商店**
   - Mac App Store
   - Microsoft Store
   - Flathub

## 📝 文档完善

1. **用户文档**
   - 快速开始指南
   - 常见问题 FAQ
   - 视频教程

2. **开发者文档**
   - API 文档
   - 架构设计
   - 贡献指南

3. **国际化**
   - 英文界面
   - 多语言支持


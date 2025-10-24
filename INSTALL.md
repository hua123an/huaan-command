# Huaan Command - 安装指南

## 📦 安装包信息

- **文件**: `Huaan Command_1.0.0_x64.dmg`
- **大小**: 3.5 MB
- **架构**: Intel x86_64
- **位置**: `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/`

## 🚀 安装步骤

### 1. 打开 DMG 文件
双击 `Huaan Command_1.0.0_x64.dmg` 文件

### 2. 拖入 Applications
将 `Huaan Command.app` 拖入 `Applications` 文件夹

### 3. 首次启动
从 Applications 文件夹或 Launchpad 启动应用

### 4. 处理安全提示（如果出现）

如果 macOS 提示"无法验证开发者"：

**方法 1: 系统设置**
1. 打开 `系统设置` > `隐私与安全性`
2. 找到 "Huaan Command" 被阻止的提示
3. 点击 `仍要打开`

**方法 2: 右键打开**
1. 在 Finder 中右键点击 `Huaan Command.app`
2. 选择 `打开`
3. 在弹窗中点击 `打开`

**方法 3: 终端命令**
```bash
xattr -cr /Applications/Huaan\ Command.app
```

## ⚙️ 初始配置

### 配置 AI 功能（必需）

1. 点击右上角的设置图标（⚙️）
2. 找到 "AI 设置" 部分
3. 配置以下信息：

#### OpenAI 配置
```
API Key: sk-your-openai-api-key
Base URL: (留空使用默认)
Model: gpt-4o-mini
```

#### DeepSeek 配置
```
API Key: sk-your-deepseek-api-key
Base URL: https://api.deepseek.com
Model: deepseek-chat
```

#### 自定义 API 配置
```
API Key: your-api-key
Base URL: https://your-api-endpoint.com
Model: your-model-name
```

4. 点击 `保存配置`
5. 测试 AI 功能是否正常

## 🎯 快速开始

### 1. 创建第一个终端标签
- 点击 "终端" 标签页
- 点击 "+" 按钮创建新标签
- 开始使用终端

### 2. 使用 Warp 模式
- 在终端底部找到模式切换栏
- 点击 "AI 模式" 按钮
- 输入自然语言问题
- 按 Enter 发送

### 3. 创建任务
- 点击 "任务" 标签页
- 点击 "新建任务" 按钮
- 填写任务信息
- 保存并执行

### 4. AI 对话技巧
```
示例问题：
- "列出当前目录的所有文件"
- "查看系统内存使用情况"
- "创建一个名为 test 的目录"
- "熟悉这个项目的架构"
```

## 🔧 常见问题

### Q: 应用无法打开
**A**: 检查系统设置中的安全性设置，允许打开该应用

### Q: AI 功能不工作
**A**: 
1. 检查是否配置了 API Key
2. 检查网络连接
3. 验证 API Key 是否有效
4. 查看 Base URL 是否正确

### Q: 终端无法输入
**A**: 
1. 确保终端模式为 "终端模式"（非 AI 模式）
2. 点击终端区域确保获得焦点
3. 尝试创建新的终端标签

### Q: 如何切换模型
**A**: 
1. 在终端底部的 Warp 模式栏
2. 点击模型选择器
3. 选择想要的模型

### Q: 终端会话丢失
**A**: 
- 终端会话会自动保存
- 重启应用后会自动恢复
- 如果丢失，可以创建新标签

### Q: 卸载应用
**A**: 
1. 将应用从 Applications 文件夹删除
2. 删除配置文件（可选）：
   ```bash
   rm -rf ~/Library/Application\ Support/com.huaaan.command
   ```

## 📊 系统要求

### 最低要求
- macOS 10.15 (Catalina) 或更高
- Intel 处理器 (x86_64)
- 100 MB 可用磁盘空间
- 网络连接（AI 功能需要）

### 推荐配置
- macOS 12.0 (Monterey) 或更高
- 8GB RAM
- 稳定的网络连接

## 🔐 隐私说明

### 数据存储
- 任务数据：本地存储在用户目录
- 终端会话：本地存储，不上传
- AI 对话：仅发送到配置的 API 服务器

### 网络访问
- AI 功能需要访问配置的 API 端点
- 不会收集或上传用户数据
- 不会跟踪用户行为

## 📞 支持

如有问题，请查看：
- README.md - 项目说明
- BUILD.md - 构建说明
- RELEASE_NOTES.md - 版本说明

## 🎉 开始使用

安装完成后，享受 Huaan Command 带来的高效开发体验！

**Happy Coding! 🚀**


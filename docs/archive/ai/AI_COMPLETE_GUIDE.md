# 🤖 AI Complete User Guide

## 🚀 Quick Start

### 第一步：配置 API Key

1. 打开应用
2. 点击右上角 **⚙️ 设置**
3. 找到 **🤖 AI 助手** 部分
4. 启用 AI 功能开关
5. 粘贴你的 OpenAI API Key
6. 点击 **🧪 测试 AI 连接**

**获取 API Key**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 第二步：开始使用

#### ✨ 生成命令（TaskForm）

1. 点击 **+ 新建任务**
2. 点击"命令"输入框旁的 **✨ AI 生成**
3. 输入："列出所有 Docker 容器"
4. 按 Enter
5. 点击 **使用此命令**

#### 💬 聊天助手（侧边栏）

1. 点击顶部 **🤖** 按钮
2. 试试这些问题：
   - "如何查看端口占用情况？"
   - "推荐一个 Node.js 部署流程"
   - "git rebase 和 merge 的区别？"

#### 🔍 错误诊断（TaskDetail）

1. 运行一个会失败的任务
2. 点击任务打开详情
3. 切换到"错误输出"标签
4. 点击 **🔍 AI 诊断**
5. 查看诊断结果和解决方案

---

## ✨ Features Overview

Huaan Command 现在集成了强大的 AI 助手功能，帮助你更高效地管理任务和解决问题。

### 核心功能

1. **AI 命令生成器** - 自然语言生成 Shell 命令
2. **AI 错误诊断** - 智能分析和解决任务错误
3. **AI 聊天助手** - 随时解答技术问题
4. **智能工作流推荐** - 基于项目自动推荐
5. **日志智能分析** - 提取关键信息和优化建议

### 支持的 AI 服务商

- 🌍 **OpenAI 官方** - GPT-4o、GPT-4 Turbo
- 🇨🇳 **DeepSeek** - 性价比之王，编程能力强
- 🌙 **Moonshot (Kimi)** - 超长上下文（128K）
- 🧠 **智谱 GLM** - 中文理解优秀
- 🔮 **通义千问** - 阿里云生态
- 🏆 **零一万物** - 李开复团队
- ☁️ **Azure OpenAI** - 企业级服务
- 🏠 **Ollama** - 本地部署，完全免费

---

## 📖 详细功能说明

### 1️⃣ AI 命令生成器

**位置**: 新建/编辑任务表单

**使用方法**:
1. 点击"命令"输入框旁的 **✨ AI 生成** 按钮
2. 用自然语言描述你想做什么
3. 按 Enter 或点击"生成"
4. AI 会返回对应的 Shell 命令
5. 点击"使用此命令"自动填充

**示例**:

| 描述 | AI 生成的命令 |
|------|--------------|
| "查找大于 100MB 的文件" | `find . -size +100M -type f` |
| "清理 Docker 未使用的镜像" | `docker image prune -a` |
| "统计代码行数，排除 node_modules" | `find . -name "*.js" ! -path "*/node_modules/*" | xargs wc -l` |

### 2️⃣ AI 错误诊断

**位置**: 任务详情面板

**功能**:
- 自动分析错误输出
- 提供解决方案
- 推荐相关命令

**使用场景**:
- 编译错误
- 权限问题
- 网络超时
- 配置错误

### 3️⃣ AI 聊天助手

**位置**: 右侧面板

**特点**:
- 上下文记忆
- 代码高亮
- 历史记录
- 多轮对话

**推荐问题**:
✅ **好的问题**:
- "如何在 Docker 中设置环境变量？"
- "npm install 和 npm ci 有什么区别？"
- "推荐一个 Git 工作流"

❌ **避免太宽泛**:
- "Docker"
- "Git"
- "部署"

### 4️⃣ 智能工作流推荐

基于当前项目类型和文件结构，AI 会自动推荐：
- 开发环境设置
- 常用命令组合
- 最佳实践建议

### 5️⃣ 日志智能分析

自动从日志中提取：
- 错误模式
- 性能瓶颈
- 优化建议
- 关键指标

---

## 🌐 Provider Configuration

### OpenAI 配置

```javascript
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o-mini",
  "endpoint": "https://api.openai.com/v1"
}
```

### DeepSeek 配置

```javascript
{
  "provider": "deepseek",
  "apiKey": "sk-...",
  "model": "deepseek-chat",
  "endpoint": "https://api.deepseek.com/v1"
}
```

### 本地 Ollama 配置

```javascript
{
  "provider": "ollama",
  "apiKey": "ollama",
  "model": "llama3.1:8b",
  "endpoint": "http://localhost:11434/v1"
}
```

### 配置步骤

1. 打开 **设置 → AI 助手**
2. 选择服务商
3. 输入 API Key
4. 选择模型
5. 自定义端点（可选）
6. 测试连接

---

## 💰 费用参考

### OpenAI GPT-4o-mini

- **命令生成**: ~$0.0001 / 次
- **错误诊断**: ~$0.0005 / 次
- **聊天对话**: ~$0.0003 / 轮

**月度估算**: 中度使用 < $1

### DeepSeek (更经济)

- **所有功能**: ~$0.0001 / 次
- **月度估算**: 重度使用 < $0.5

### 本地 Ollama

- **完全免费**（仅硬件成本）

---

## 🛠️ 高级技巧

### 提升生成质量

1. **描述更具体**
   - ❌ "删除文件"
   - ✅ "删除 7 天前的临时文件，保留重要配置"

2. **提供上下文**
   - ❌ "启动服务"
   - ✅ "在 Docker 容器中启动 Node.js 应用，端口 3000"

3. **指定格式**
   - ❌ "列出进程"
   - ✅ "以表格形式列出占用 CPU 最高的 10 个进程"

### 批量操作

1. **生成多个相关命令**
2. **创建命令模板**
3. **保存常用提示词**

### 集成到工作流

1. **项目初始化** - 使用 AI 生成项目设置命令
2. **日常开发** - 快速查询 API 和最佳实践
3. **问题解决** - 错误诊断 + 解决方案
4. **代码审查** - AI 分析代码质量

---

## 🐛 故障排查

### 无法连接 AI

1. ✅ 检查 API Key 是否正确
2. ✅ 检查网络连接
3. ✅ 查看浏览器控制台（F12）
4. ✅ 尝试切换到其他模型

### 生成结果不理想

1. ✅ 描述更具体
2. ✅ 提供更多上下文
3. ✅ 多试几次
4. ✅ 手动调整结果

### 常见错误

| 错误 | 解决方案 |
|------|----------|
| "Invalid API key" | 检查 API Key 是否正确复制 |
| "Rate limit exceeded" | 等待 1 分钟后重试或升级计划 |
| "Model not found" | 检查模型名称是否正确 |
| "Connection timeout" | 检查网络或尝试其他端点 |

---

## 📚 Additional Resources

- [🔧 AI Technical Reference](./AI_TECHNICAL_REFERENCE.md)
- [🖥️ AI Terminal Integration](./AI_TERMINAL_INTEGRATION.md)
- [📋 Complete Features Documentation](./FEATURES_COMPLETE.md)
- [🛠️ Development Guide](./DEVELOPMENT_GUIDE.md)

---

**祝使用愉快！** 🎉
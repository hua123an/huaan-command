# 🌐 AI 服务商配置指南

## 支持的服务商

Huaan Command 现在支持多个 AI 服务商，让你可以根据需求灵活选择。

---

## 🌍 国际服务商

### 1. OpenAI 官方 ⭐ 推荐

**特点**：
- ✅ 最强大的模型（GPT-4o、GPT-4 Turbo）
- ✅ 稳定可靠
- ✅ 文档完善
- ❌ 需要国际信用卡
- ❌ 中国大陆需要代理

**配置**：
```yaml
服务商: OpenAI 官方
API Key: sk-proj-...
端点: https://api.openai.com/v1
模型: gpt-4o-mini (推荐) / gpt-4o / gpt-3.5-turbo
```

**获取 API Key**：
1. 访问 [https://platform.openai.com](https://platform.openai.com)
2. 注册并登录
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 Key（只显示一次）

**费用参考**（2024）：
- gpt-4o-mini: $0.15/1M 输入 tokens
- gpt-4o: $5/1M 输入 tokens
- gpt-3.5-turbo: $0.50/1M 输入 tokens

---

### 2. Azure OpenAI

**特点**：
- ✅ 企业级稳定性
- ✅ 中国区可用
- ✅ 与 Microsoft 生态集成
- ❌ 需要企业认证
- ❌ 配置复杂

**配置**：
```yaml
服务商: Azure OpenAI
API Key: your-azure-api-key
端点: https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT
模型: gpt-4 / gpt-35-turbo
```

**注意**：需要替换 `YOUR-RESOURCE` 和 `YOUR-DEPLOYMENT` 为你的实际资源名称。

---

## 🇨🇳 国内服务商

### 3. DeepSeek ⭐ 性价比之王

**特点**：
- ✅ 国产大模型
- ✅ 价格极低（$0.14/1M tokens）
- ✅ 编程能力强
- ✅ 无需代理
- ✅ 支持长上下文

**配置**：
```yaml
服务商: DeepSeek
API Key: sk-...
端点: https://api.deepseek.com/v1
模型: deepseek-chat / deepseek-coder
```

**获取 API Key**：
1. 访问 [https://platform.deepseek.com](https://platform.deepseek.com)
2. 注册登录
3. 进入 API Keys 管理
4. 创建新 Key

**推荐场景**：
- 🔧 编程任务（deepseek-coder）
- 💰 成本敏感项目
- 🚀 高频调用

---

### 4. 智谱 GLM

**特点**：
- ✅ 清华团队研发
- ✅ 中文理解优秀
- ✅ 支持多模态
- ✅ 价格友好

**配置**：
```yaml
服务商: 智谱 GLM
API Key: your-api-key
端点: https://open.bigmodel.cn/api/paas/v4
模型: glm-4 / glm-3-turbo
```

**获取 API Key**：
- 访问 [https://open.bigmodel.cn](https://open.bigmodel.cn)

---

### 5. Moonshot (Kimi) ⭐ 长文本专家

**特点**：
- ✅ 超长上下文（128K tokens）
- ✅ 阅读长文档能力强
- ✅ 中文优化
- ✅ 价格合理

**配置**：
```yaml
服务商: Moonshot (Kimi)
API Key: sk-...
端点: https://api.moonshot.cn/v1
模型: moonshot-v1-8k / moonshot-v1-32k / moonshot-v1-128k
```

**推荐场景**：
- 📄 长文档分析
- 📚 代码库理解
- 🔍 深度研究

**获取 API Key**：
- 访问 [https://platform.moonshot.cn](https://platform.moonshot.cn)

---

### 6. 通义千问

**特点**：
- ✅ 阿里云生态
- ✅ 企业级服务
- ✅ 多模态支持
- ✅ 中文优化

**配置**：
```yaml
服务商: 通义千问
API Key: sk-...
端点: https://dashscope.aliyuncs.com/compatible-mode/v1
模型: qwen-turbo / qwen-plus / qwen-max
```

**获取 API Key**：
- 访问 [https://dashscope.console.aliyun.com](https://dashscope.console.aliyun.com)

---

### 7. 零一万物

**特点**：
- ✅ 李开复团队
- ✅ 性能优秀
- ✅ 价格友好
- ✅ 中文理解强

**配置**：
```yaml
服务商: 零一万物
API Key: your-api-key
端点: https://api.lingyiwanwu.com/v1
模型: yi-lightning / yi-large / yi-medium
```

**获取 API Key**：
- 访问 [https://platform.lingyiwanwu.com](https://platform.lingyiwanwu.com)

---

## 🏠 本地部署

### 8. Ollama ⭐ 完全免费

**特点**：
- ✅ 完全免费
- ✅ 本地运行，隐私保护
- ✅ 无需 API Key
- ✅ 支持多种开源模型
- ❌ 需要较好的硬件（GPU）
- ❌ 速度相对较慢

**配置**：
```yaml
服务商: Ollama (本地)
API Key: （无需配置）
端点: http://localhost:11434/v1
模型: llama3.1 / qwen2.5 / mistral
```

**安装步骤**：

1. 安装 Ollama：
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

2. 启动服务：
```bash
ollama serve
```

3. 下载模型：
```bash
ollama pull llama3.1
ollama pull qwen2.5
```

4. 在应用中选择 "Ollama (本地)"

**推荐模型**：
- `llama3.1` - Meta 的开源模型，通用性强
- `qwen2.5` - 阿里的千问模型，中文优秀
- `deepseek-coder` - 编程专用
- `mistral` - 效率和质量平衡

**硬件要求**：
- 7B 模型：8GB+ RAM
- 13B 模型：16GB+ RAM
- 34B 模型：32GB+ RAM

---

## 🔧 自定义服务

### 配置说明

如果你有自己的 AI 服务（如通过 LiteLLM 代理），可以选择"自定义服务"：

```yaml
服务商: 自定义服务
API Key: 根据你的服务要求
端点: http://your-server:port/v1
模型: 你的模型名称
```

---

## 💰 价格对比（按 1M tokens 计算）

| 服务商 | 主力模型 | 输入价格 | 输出价格 | 性价比 |
|--------|---------|---------|---------|--------|
| OpenAI | gpt-4o-mini | $0.15 | $0.60 | ⭐⭐⭐⭐ |
| DeepSeek | deepseek-chat | $0.14 | $0.28 | ⭐⭐⭐⭐⭐ |
| Moonshot | moonshot-v1-8k | ¥12 | ¥12 | ⭐⭐⭐⭐ |
| 智谱 | glm-4 | ¥50 | ¥50 | ⭐⭐⭐ |
| Ollama | llama3.1 | 免费 | 免费 | ⭐⭐⭐⭐⭐ |

---

## 🎯 选择建议

### 按使用场景

**编程任务**：
1. DeepSeek Coder （性价比）
2. GPT-4o （质量）
3. Qwen Coder （国产）

**中文内容**：
1. 智谱 GLM-4
2. 通义千问
3. 零一万物

**长文档**：
1. Moonshot 128K
2. GPT-4 Turbo
3. Qwen-Long

**成本优先**：
1. DeepSeek （$0.14/1M）
2. Ollama （免费）
3. GPT-4o-mini （$0.15/1M）

**隐私优先**：
1. Ollama 本地部署
2. 私有化部署 LiteLLM

**企业用户**：
1. Azure OpenAI
2. 通义千问
3. 智谱 GLM

---

## 🔄 快速切换

在设置中选择不同的服务商，系统会自动：
- ✅ 更新 API 端点
- ✅ 切换默认模型
- ✅ 调整参数配置
- ✅ 重新加载可用模型

---

## ⚠️ 注意事项

### OpenAI 及国际服务
- 需要稳定的国际网络
- 建议使用代理
- API Key 妥善保管

### 国内服务
- 需要实名认证
- 有内容审核机制
- 某些敏感话题可能被拒绝

### 本地部署
- 需要足够的硬件资源
- 首次下载模型需要时间
- 响应速度取决于硬件

---

## 🆘 故障排查

### 连接失败
1. 检查 API Key 是否正确
2. 确认网络连接（国际服务需代理）
3. 验证 API 端点格式
4. 查看服务商状态页面

### 模型加载失败
1. 检查模型名称是否正确
2. 确认账户余额充足
3. 验证模型访问权限
4. 尝试使用默认模型

### Ollama 无法连接
1. 确认 Ollama 服务正在运行：`ollama serve`
2. 检查端口：`lsof -i:11434`
3. 测试连接：`curl http://localhost:11434/api/tags`

---

## 📚 更多资源

- [OpenAI 文档](https://platform.openai.com/docs)
- [DeepSeek 文档](https://platform.deepseek.com/docs)
- [Moonshot 文档](https://platform.moonshot.cn/docs)
- [Ollama 模型库](https://ollama.com/library)

---

**享受多样化的 AI 服务选择！** 🎉


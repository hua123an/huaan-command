# Claude Code 配置切换工具 - 项目信息

## 📚 文档导航

根据你的需求选择相应的文档：

### 🏃 时间紧张？
→ 读 **[GETTING_STARTED.md](./GETTING_STARTED.md)** (5分钟)
- 快速安装
- 基本用法
- 常见场景

### 🔰 第一次使用？
→ 读 **[CHEATSHEET.md](./CHEATSHEET.md)** (3分钟)
- 7个核心命令
- 实际例子
- 快速参考

### 📖 想要全面了解？
→ 读 **[README.md](./README.md)** (10分钟)
- 完整功能说明
- 常见问题解答
- 工作原理说明
- 使用示例

### 🛠️ 需要详细指南？
→ 读 **[ARCHITECTURE.md](./ARCHITECTURE.md)** (15分钟)
- 详细安装步骤
- 配置文件说明
- 高级用法
- 故障排除

### 📊 了解项目全貌？
→ 读 **[PROJECT_INFO.md](./PROJECT_INFO.md)** (当前文档)
- 项目完成清单
- 技术架构
- 功能总结
- 未来规划

---

## 📦 项目文件清单

```
claude-config-switcher/
│
├── 📄 核心程序
│   └── claude-config-switcher.js     (主程序，~600行)
│       ├─ 配置管理
│       ├─ 命令行接口
│       ├─ 交互式菜单
│       └─ Claude Code 集成
│
├── 🔧 工具文件
│   ├── bin/claude-switcher           (可执行包装脚本)
│   ├── package.json                  (NPM 配置)
│   └── demo.sh                       (演示脚本)
│
├── 📚 文档
│   ├── GETTING_STARTED.md            (快速开始)
│   ├── README.md                     (完整说明)
│   ├── PROJECT_INFO.md               (项目信息-本文件)
│   ├── CHEATSHEET.md                 (速查表)
│   ├── FIX_CONFIG.md                 (问题修复)
│   ├── CONTRIBUTING.md               (贡献指南)
│   ├── ARCHITECTURE.md               (架构说明)
│   └── SECURITY.md                   (安全说明)
│
└── 📁 配置存储位置
    └── ~/.claude/
        ├── model-switcher.json       (服务商配置)
        └── settings.json             (Claude Code 配置)
```

---

## ✅ 项目完成清单

### 已完成的功能

#### 核心功能
- [x] 添加多个服务商配置（支持任何 Anthropic API 兼容服务）
- [x] 列出所有已保存的配置
- [x] 一键切换服务商配置
- [x] 删除不需要的配置
- [x] 显示当前激活配置
- [x] 交互式菜单模式

#### 用户体验
- [x] 彩色化命令行界面
- [x] 详细的帮助信息
- [x] 友好的错误提示
- [x] 隐藏敏感信息（API Key 只显示头尾）
- [x] 验证信息完整性

#### 集成功能
- [x] 自动更新 Claude Code 配置文件
- [x] 环境变量设置（ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL）
- [x] 配置持久化存储

#### 工具化
- [x] NPM 包配置
- [x] 全局命令安装支持
- [x] 可执行脚本包装
- [x] 完整的文档

---

## 🚀 快速开始三步走

### 1️⃣ 安装
```bash
npm install -g /Users/huaan/swict-claude-code
```

### 2️⃣ 添加配置
```bash
claude-switcher add
# 或交互式模式
claude-switcher interactive
```

### 3️⃣ 切换使用
```bash
claude-switcher switch <配置名>
```

---

## 📋 命令快速查询

| 命令 | 功能 | 使用场景 |
|------|------|---------|
| `add` | 添加配置 | 第一次设置或添加新服务商 |
| `list` | 列出配置 | 查看所有可用配置 |
| `switch` | 切换配置 | 在服务商之间快速切换 |
| `remove` | 删除配置 | 清理不需要的配置 |
| `show` | 显示当前 | 验证当前配置 |
| `interactive` | 交互模式 | 新手推荐 |
| `help` | 帮助信息 | 查看所有命令 |

详细用法请参考 [CHEATSHEET.md](./CHEATSHEET.md)

---

## ✨ 主要特性

✅ **简单易用** - 直观的命令行界面
✅ **功能完整** - 添加、删除、查看、切换一应俱全
✅ **零依赖** - 仅使用 Node.js 内置模块
✅ **即插即用** - 安装后即可使用
✅ **安全可靠** - 配置安全存储，敏感信息保护
✅ **跨平台** - 支持 macOS、Linux、Windows
✅ **彩色交互** - 友好的用户界面
✅ **持久化** - 配置自动保存

---

## 🎯 使用场景

### 场景 1: 在开发和生产之间快速切换
```bash
claude-switcher switch dev
# ... 开发和测试 ...
claude-switcher switch prod
# ... 部署前验证 ...
```

### 场景 2: 支持多个 API 服务商
```bash
# 添加不同服务商
claude-switcher add  # anthropic 官方
claude-switcher add  # 自建服务
claude-switcher add  # 代理服务

# 根据需要切换
claude-switcher switch anthropic
claude-switcher switch custom
```

### 场景 3: 团队协作
```bash
# 每个团队成员添加自己的配置
claude-switcher add

# 快速切换团队不同环境
claude-switcher switch team-dev
claude-switcher switch team-prod
```

---

## 💡 技术细节

- **语言**: JavaScript (Node.js)
- **依赖**: 仅内置模块 (fs, path, os, readline)
- **文件大小**: ~13KB
- **启动速度**: <100ms
- **支持版本**: Node.js 14.0.0+
- **平台支持**: macOS、Linux、Windows

---

## 💡 工作原理简图

```
┌─────────────────────────────────┐
│   用户运行 claude-switcher      │
└──────────────┬──────────────────┘
               │
         ┌─────▼─────┐
         │   读取    │
         │ 配置文件  │
         └─────┬─────┘
               │
      ┌────────▼────────┐
      │   执行指定命令   │
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │  更新配置文件   │
      └────────┬────────┘
               │
      ┌────────▼─────────────┐
      │ Claude Code 自动应用  │
      └──────────────────────┘
```

详细工作原理请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🏗️ 架构设计

### 数据存储结构

```
~/.claude/
├── model-switcher.json       (工具配置)
└── settings.json             (Claude Code 配置)
```

### 配置流程

```
用户操作
  ↓
claude-switcher 验证输入
  ↓
读取/写入 model-switcher.json
  ↓
更新 settings.json
  ↓
Claude Code 自动应用
```

---

## 💡 技术亮点

1. **零外部依赖**
   - 仅使用 Node.js 内置模块
   - 文件大小小，启动速度快

2. **智能配置管理**
   - 自动创建配置目录
   - 验证配置完整性
   - 防止配置覆盖

3. **用户友好**
   - 彩色输出增强可读性
   - 交互式和命令行两种模式
   - 详细的错误提示

4. **安全性**
   - API Key 安全存储
   - 日志中隐藏敏感信息
   - 支持文件权限配置

详细安全说明请参考 [SECURITY.md](./SECURITY.md)

---

## 📊 支持的服务商

任何兼容 Anthropic API 的服务都可以使用，包括：

- ✅ Anthropic 官方 API
- ✅ OpenAI (兼容端点)
- ✅ Azure OpenAI
- ✅ 自建服务
- ✅ API 代理服务

---

## 🎯 使用示例

### 基本工作流

```bash
# 1. 安装
npm install -g /Users/huaan/swict-claude-code

# 2. 添加服务商配置
claude-switcher add
# 输入：anthropic, https://api.anthropic.com, sk-ant-xxx, claude-sonnet-4-5-20250929

# 3. 添加第二个配置
claude-switcher add
# 输入：custom, http://localhost:8000, local-key, claude-3-sonnet

# 4. 查看所有配置
claude-switcher list
# 输出：列出已保存的所有配置

# 5. 切换配置
claude-switcher switch custom
# Claude Code 自动使用新配置

# 6. 验证
claude-switcher show
# 显示当前活跃配置
```

### 交互模式

```bash
claude-switcher interactive
# 进入菜单，可以：
# 1. 列出所有配置
# 2. 添加新配置
# 3. 切换配置
# 4. 删除配置
# 5. 显示当前配置
# 6. 退出
```

---

## ✨ 主要优势

1. **简单易用** - 直观的命令和交互界面
2. **功能完整** - 添加、删除、查看、切换一应俱全
3. **即插即用** - 安装后即可使用，无需配置
4. **跨平台** - 支持 macOS、Linux、Windows
5. **可靠安全** - 配置持久化存储，敏感信息保护
6. **扩展性强** - 易于添加新功能

---

## 🔮 未来增强方向

### 短期
- [ ] 配置验证（测试 API 连接）
- [ ] 配置备份和恢复
- [ ] 快捷键支持

### 中期
- [ ] Web UI 管理面板
- [ ] 配置导入/导出
- [ ] 更详细的日志记录

### 长期
- [ ] VS Code 扩展集成
- [ ] 企业级权限管理
- [ ] 云同步功能

---

## 📞 获取帮助

### 快速问题
→ 查看 **[CHEATSHEET.md](./CHEATSHEET.md)**

### 安装问题
→ 查看 **[ARCHITECTURE.md](./ARCHITECTURE.md)** 的故障排除部分

### 功能问题
→ 查看 **[README.md](./README.md)** 的常见问题部分

### 全面学习
→ 按顺序阅读所有文档

---

## 🎓 学习资源

这个项目是学习以下内容的好例子：

- Node.js 文件系统操作 (fs 模块)
- readline 交互式编程
- JSON 数据管理
- 命令行工具开发
- 配置文件管理
- ANSI 颜色代码

---

## 📝 下一步建议

1. ✅ 安装工具
2. ✅ 添加至少一个服务商配置
3. 📖 查看 [CHEATSHEET.md](./CHEATSHEET.md) 了解所有命令
4. 📚 根据需求查看其他文档

---

## 📄 许可证

MIT License - 自由使用和修改

---

## 📌 文档更新信息

- **最后更新**: 2025-11-03
- **版本**: 2.0.0 (文档精简版)
- **文档总数**: 8个核心文档

---

## 🎉 现在就开始吧！

```bash
# 1. 查看快速开始
cat GETTING_STARTED.md

# 2. 安装工具
npm install -g /Users/huaan/swict-claude-code

# 3. 添加你的第一个配置
claude-switcher interactive

# 4. 开始使用！
claude-switcher list
```

**祝你使用愉快！** 🚀

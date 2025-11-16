# 贡献指南

感谢你对 Claude Code 配置切换工具的兴趣！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 💻 提交代码修复或新功能
- 🎨 优化用户体验

---

## 🚀 快速开始

### 开发环境设置

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 此仓库
   # 然后 clone 到本地
   git clone https://github.com/YOUR_USERNAME/claude-config-switcher.git
   cd claude-config-switcher
   ```

2. **创建开发分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **安装依赖（无需）**
   ```bash
   # 本项目零外部依赖，仅使用 Node.js 内置模块
   # 可以直接运行
   node claude-config-switcher.js --help
   ```

### 本地测试

```bash
# 测试主程序
node claude-config-switcher.js help

# 测试可执行脚本
./bin/claude-switcher help

# 运行演示
bash demo.sh
```

---

## 💻 开发指南

### 代码规范

#### JavaScript 编码风格

- **缩进**: 使用 2 个空格
- **引号**: 使用单引号 `'`
- **分号**: 总是使用分号
- **变量声明**: 使用 `const` 和 `let`，避免 `var`
- **函数**: 使用箭头函数和函数表达式
- **字符串**: 优先使用模板字符串

#### 示例

```javascript
// ✅ 正确的写法
const addProvider = (providerData) => {
  const config = readConfig();
  config.providers.push({
    name: providerData.name,
    baseUrl: providerData.baseUrl,
    apiKey: providerData.apiKey,
    model: providerData.model,
    createdAt: new Date().toISOString()
  });
  writeConfig(config);
  return true;
};

// ❌ 避免的写法
function addProvider(providerData) {
  var config = readConfig();
  config.providers.push({"name": providerData.name});
  return true
}
```

### 文件结构

```
claude-config-switcher.js
│
├── 📋 头部注释
│   ├── 文件描述
│   ├── 作者信息
│   └── 许可证
│
├── 🔧 常量定义
│   ├── 配置文件路径
│   ├── 颜色代码
│   └── 默认配置
│
├── 🛠️ 工具函数
│   ├── 文件读写操作
│   ├── 配置验证
│   ├── 格式化输出
│   └── 错误处理
│
├── 📥 输入处理
│   ├── 命令行参数解析
│   ├── readline 交互
│   └── 参数验证
│
└── 🎯 命令实现
    ├── add 命令
    ├── list 命令
    ├── switch 命令
    ├── remove 命令
    ├── show 命令
    ├── interactive 模式
    └── help 命令
```

### 核心模块说明

#### 1. 文件操作模块
```javascript
// 读取配置文件
const readConfig = () => {
  // 实现
};

// 写入配置文件
const writeConfig = (config) => {
  // 实现
};

// 确保配置文件存在
const ensureConfig = () => {
  // 实现
};
```

#### 2. 配置管理模块
```javascript
// 添加配置
const addProvider = (data) => {
  // 实现
};

// 获取所有配置
const getAllProviders = () => {
  // 实现
};

// 切换配置
const switchProvider = (name) => {
  // 实现
};
```

#### 3. 用户界面模块
```javascript
// 彩色输出
const printMessage = (message, color) => {
  // 实现
};

// 交互式菜单
const interactiveMenu = () => {
  // 实现
};

// 显示帮助
const showHelp = () => {
  // 实现
};
```

---

## 🐛 报告 Bug

如果你发现了 Bug，请按照以下模板创建 Issue：

### Bug 报告模板

```markdown
**Bug 描述**
简洁清楚地描述 Bug 是什么

**复现步骤**
1. 运行 '...'
2. 使用参数 '...'
3. 看到错误 '...'

**预期行为**
简洁清楚地描述你预期发生什么

**实际行为**
简洁清楚地描述实际发生了什么

**屏幕截图**
如果适用，添加屏幕截图

**环境信息**
- OS: [e.g. macOS 13.0]
- Node.js 版本: [e.g. 18.17.0]
- 工具版本: [e.g. 1.0.0]

**额外上下文**
添加关于问题的任何其他上下文
```

---

## 💡 提出新功能

### 功能请求模板

```markdown
**功能描述**
简洁清楚地描述你希望的功能

**问题背景**
这个功能解决了什么问题？

**期望解决方案**
你希望这个功能如何工作？

**替代方案**
你考虑过其他替代方案吗？

**额外上下文**
添加关于功能请求的任何其他上下文或截图
```

---

## 🔄 提交流程

### Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

#### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 代码重构
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

#### 示例

```bash
# 新功能
git commit -m "feat: add configuration export feature"

# Bug 修复
git commit -m "fix: resolve API key not saving issue"

# 文档更新
git commit -m "docs: update installation guide"

# 重构
git commit -m "refactor: simplify config validation logic"
```

### Pull Request 流程

1. **确保代码质量**
   ```bash
   # 测试所有功能
   node claude-config-switcher.js help
   ./bin/claude-switcher --help
   ```

2. **更新文档**
   - 更新相关文档
   - 添加必要的注释

3. **提交 PR**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **创建 PR**
   - 使用清晰的标题
   - 详细描述变更内容
   - 链接相关 Issue

### PR 模板

```markdown
## 📝 变更说明

简要描述本次 PR 的变更内容

## ✅ 测试

- [ ] 已本地测试所有相关功能
- [ ] 测试了新增功能
- [ ] 测试了边界情况

## 🔗 相关 Issue

Closes #(issue 编号)

## 📋 检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 没有破坏现有功能
- [ ] 所有测试通过

## 📸 截图（如适用）

添加截图展示功能或修复效果
```

---

## 🧪 测试指南

### 手动测试

#### 测试配置添加
```bash
# 添加测试配置
claude-switcher add
# 输入测试数据

# 验证配置
claude-switcher list
```

#### 测试配置切换
```bash
# 添加多个配置后
claude-switcher switch test-provider
claude-switcher show
```

#### 测试交互模式
```bash
# 进入交互模式
claude-switcher interactive
# 测试所有菜单选项
```

### 测试场景

1. **新用户场景**
   - 首次安装
   - 第一次添加配置
   - 切换到新配置

2. **多配置场景**
   - 添加 3+ 个配置
   - 在配置间快速切换
   - 删除中间配置

3. **错误处理场景**
   - 输入无效 URL
   - 使用空 API Key
   - 切换不存在的配置

---

## 🎯 优先贡献领域

### 高优先级

1. **配置验证**
   - 验证 API Key 格式
   - 测试 Base URL 可达性
   - 验证模型名称

2. **用户体验优化**
   - 更友好的错误提示
   - 更好的彩色输出
   - 快捷键支持

3. **安全性增强**
   - 配置文件加密
   - 安全权限检查
   - API Key 验证

### 中优先级

4. **功能扩展**
   - 配置导入/导出
   - 配置模板
   - 批量操作

5. **工具集成**
   - VS Code 扩展
   - 插件系统
   - CI/CD 集成

### 低优先级

6. **UI 增强**
   - Web 管理界面
   - 图形化配置工具
   - 可视化切换界面

---

## 📚 学习资源

### 相关技术

- [Node.js 官方文档](https://nodejs.org/docs/)
- [Node.js fs 模块](https://nodejs.org/api/fs.html)
- [Node.js readline 模块](https://nodejs.org/api/readline.html)
- [JavaScript 最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

### 社区资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git 基础指南](https://git-scm.com/book/zh/v2)
- [Pull Request 指南](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests)

---

## ❓ 有问题？

如果你有任何疑问，可以通过以下方式获取帮助：

1. 📖 查看现有文档
   - [README.md](./README.md)
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [PROJECT_INFO.md](./PROJECT_INFO.md)

2. 🔍 搜索现有 Issue
   - 在 GitHub Issues 中搜索

3. 💬 创建讨论
   - 创建新的 Discussion 讨论

4. 📧 发送邮件
   - 联系维护者

---

## 🎉 致谢

感谢所有为本项目做出贡献的开发者和用户！你们的贡献让这个工具变得更好。

### 贡献者

- 初始开发团队
- Bug 报告者
- 功能建议者
- 文档贡献者
- 代码贡献者

---

## 📄 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下授权。

---

**再次感谢你的贡献！** 🚀

# 安全说明

## 🔒 安全概览

Claude Code 配置切换工具处理敏感的 API 密钥和配置信息。本文档详细说明了安全设计、潜在风险和最佳实践，以确保用户数据安全。

---

## ⚠️ 安全警告

### 🔑 敏感信息
本工具会处理以下敏感信息：
- **API Key** - 用于访问 Claude Code 的认证密钥
- **Base URL** - API 服务地址
- **模型配置** - 可能包含商业敏感信息

### ⚡ 重要提醒
- 永远不要将包含 API Key 的配置文件提交到版本控制系统
- 定期轮换 API Key
- 使用最小权限原则
- 保护好你的配置文件

---

## 🛡️ 安全设计

### 1. 数据存储安全

#### 文件位置
```
~/.claude/
├── model-switcher.json  (敏感)
├── settings.json        (敏感)
└── ...
```

#### 文件权限
```bash
# 推荐权限：仅所有者可读写
-rw------- (600)
```

#### 权限设置脚本
```bash
#!/bin/bash
# 设置安全的文件权限

CONFIG_DIR="$HOME/.claude"

# 确保目录存在
mkdir -p "$CONFIG_DIR"

# 设置目录权限
chmod 700 "$CONFIG_DIR"

# 设置文件权限
if [ -f "$CONFIG_DIR/model-switcher.json" ]; then
  chmod 600 "$CONFIG_DIR/model-switcher.json"
fi

if [ -f "$CONFIG_DIR/settings.json" ]; then
  chmod 600 "$CONFIG_DIR/settings.json"
fi

echo "✅ 文件权限设置完成"
```

### 2. API Key 处理

#### 脱敏显示
```javascript
// 显示时只显示前4位和后4位
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}...${end}`;
}

// 使用示例
console.log(`API Key: ${maskApiKey('sk-ant-xxxxxxxxxxxx')}`);
// 输出: API Key: sk-a...xxxx
```

#### 输入时隐藏
```javascript
// 使用 readline 的隐藏输入
const rl = readline.createInterface({
  input: process.stdin,
  output: null
});

// 对于 API Key 输入，使用隐藏模式
const getPassword = (prompt) => new Promise((resolve) => {
  rl.question(prompt, (answer) => {
    resolve(answer);
  });
});
```

### 3. 日志安全

#### 敏感信息过滤
```javascript
function sanitizeForLog(data) {
  const sensitiveFields = ['apiKey', 'api_key', 'password', 'token'];

  const sanitized = JSON.parse(JSON.stringify(data));
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = maskApiKey(sanitized[field]);
    }
  });

  return sanitized;
}

// 使用示例
const config = { name: 'test', apiKey: 'sk-ant-1234567890' };
console.log('配置:', sanitizeForLog(config));
// 输出: 配置: { name: 'test', apiKey: 'sk-a...7890' }
```

#### 日志输出策略
```javascript
// 根据日志级别决定是否输出敏感信息
const logLevels = {
  DEBUG: 0,    // 详细日志（不输出敏感信息）
  INFO: 1,     // 一般信息（脱敏输出）
  WARN: 2,     // 警告（脱敏输出）
  ERROR: 3     // 错误（不输出敏感信息）
};

function printLog(level, message, data) {
  if (level >= currentLogLevel) {
    const logMessage = data ? `${message} ${JSON.stringify(sanitizeForLog(data))}` : message;
    console[getConsoleMethod(level)](logMessage);
  }
}
```

---

## ⚠️ 安全风险

### 1. 配置文件泄露

#### 风险描述
如果 `~/.claude/` 目录被未授权访问，攻击者可能获取到所有 API Key。

#### 影响等级: 🔴 高
- API Key 被盗用
- 额度被消耗
- 可能导致经济损失

#### 防护措施
```bash
# 1. 设置严格权限
chmod 600 ~/.claude/*.json

# 2. 不使用共享目录
# ❌ 避免：使用 /tmp、/var/tmp 等共享目录
# ✅ 推荐：使用 ~/.claude/ (仅当前用户可访问)

# 3. 定期检查权限
#!/bin/bash
# 检查脚本
CONFIG_DIR="$HOME/.claude"
ls -la "$CONFIG_DIR"/*.json | awk '{print $1, $9}'
# 应该显示 -rw-------
```

### 2. 命令历史泄露

#### 风险描述
如果使用 `history` 或终端记录功能，API Key 可能被保存在命令历史中。

#### 影响等级: 🟡 中
- API Key 泄露到历史记录
- 其他用户可能通过历史命令看到

#### 防护措施
```bash
# 1. 使用环境变量（避免在命令中直接输入）
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_BASE_URL="your-base-url"
claude-switcher add

# 2. 清理敏感命令历史
# 对于 bash
echo 'export HISTCONTROL=ignorecommand:erasedups' >> ~/.bashrc

# 对于 zsh
echo 'HISTCONTROL=ignorecommand:erasedups' >> ~/.zshrc

# 3. 手动清理历史
history -c
history -w

# 4. 使用临时环境变量
# 在脚本中使用
set -a
source .env  # 包含 API Key
set +a
claude-switcher add
rm .env  # 清理
```

### 3. 进程内存泄露

#### 风险描述
敏感数据可能留在进程内存中，被其他程序读取。

#### 影响等级: 🟡 中
- 内存转储可能包含敏感信息
- 调试信息可能泄露

#### 防护措施
```javascript
// 1. 及时清理敏感变量
function processApiKey(apiKey) {
  try {
    // 使用后立即清理
    const result = useApiKey(apiKey);
    return result;
  } finally {
    // 确保即使出错也清理
    apiKey = null;
  }
}

// 2. 使用时加密
const crypto = require('crypto');
function encryptSensitive(data, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### 4. 网络传输风险

#### 风险描述
如果配置中包含远程 URL，传输过程中可能被窃听。

#### 影响等级: 🟡 中
- Base URL 被窃听
- 可能暴露服务提供商

#### 防护措施
```bash
# 1. 优先使用 HTTPS
# ✅ 推荐
baseUrl: "https://api.anthropic.com"

# ❌ 避免
baseUrl: "http://api.example.com"

# 2. 使用自定义域名
# 可以通过自定义域名隐藏真实的服务提供商
baseUrl: "https://custom-domain.com/v1"
```

### 5. 版本控制系统泄露

#### 风险描述
配置文件被意外提交到 Git 等版本控制系统。

#### 影响等级: 🔴 高
- API Key 永久保存在历史记录中
- 即使删除文件，历史记录仍可恢复

#### 防护措施
```bash
# 1. 使用 .gitignore
cat >> .gitignore << 'EOF'
# Claude Code 配置
.claude/
model-switcher.json
settings.json

# 环境变量文件
.env
.env.local
.env.*.local

# 备份文件
*.backup
*.bak
EOF

# 2. 清理已提交的文件
git rm --cached ~/.claude/model-switcher.json
git commit -m "Remove sensitive config from repository"

# 3. 重写历史（需要谨慎）
# 使用 git-filter-branch 或 BFG Repo-Cleaner
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch ~/.claude/model-switcher.json' \
  --prune-empty --tag-name-filter cat -- --all

# 4. 使用 git-secrets 防止提交敏感信息
brew install git-secrets
git secrets --install
```

---

## 🛠️ 安全最佳实践

### 1. 用户级别

#### 日常使用
```bash
# 1. 定期轮换 API Key
# 每 3-6 个月更换一次

# 2. 最小权限原则
# 只给 API Key 需要的最小权限

# 3. 监控使用情况
# 定期检查 API 使用记录

# 4. 使用专用配置
# 为不同环境使用不同的 API Key
```

#### 团队协作
```bash
# 1. 使用个人 API Key
# 每个团队成员使用自己的配置

# 2. 共享配置使用模板
# 创建配置模板，不包含真实 API Key

# 3. 使用环境变量
# 在 CI/CD 中使用环境变量而不是配置文件
```

### 2. 系统级别

#### 权限管理
```bash
# 1. 文件权限
chmod 700 ~/.claude/
chmod 600 ~/.claude/*.json

# 2. 目录访问控制
# 确保 ~/.claude/ 目录只有当前用户可访问

# 3. 备份加密
# 备份配置文件前先加密
gpg --cipher-algo AES256 --compress-algo 1 \
  --s2k-mode 3 --s2k-digest-algo SHA512 \
  --symmetric ~/.claude/model-switcher.json
```

#### 加密存储
```javascript
// 可选：添加配置文件加密功能
const crypto = require('crypto');

class SecureConfig {
  constructor(password) {
    this.key = crypto.scryptSync(password, 'salt', 32);
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(encryptedData) {
    const data = Buffer.from(encryptedData, 'base64');
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const text = data.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(text);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  }
}
```

### 3. 网络级别

#### HTTPS 优先
```bash
# ✅ 始终使用 HTTPS
baseUrl: "https://api.anthropic.com"

# ✅ 验证 SSL 证书
# 确保 Node.js 验证 SSL 证书

# ❌ 避免自签名证书（除非本地测试）
# ❌ 避免忽略 SSL 错误
```

#### 代理使用
```bash
# 如果需要使用代理，确保代理本身安全
export HTTPS_PROXY="https://secure-proxy.example.com:8080"
export HTTP_PROXY="http://secure-proxy.example.com:8080"
```

---

## 🚨 安全事件响应

### 1. API Key 泄露

#### 立即行动
```bash
# 1. 立即撤销 API Key
# 登录服务提供商控制台撤销泄露的 API Key

# 2. 生成新的 API Key
# 在控制台生成新的 API Key

# 3. 更新本地配置
claude-switcher remove <old-config-name>
claude-switcher add
# 输入新的 API Key

# 4. 检查使用记录
# 查看是否有异常使用

# 5. 检查历史命令
history | grep -i api
# 清理敏感命令历史
```

#### 清理脚本
```bash
#!/bin/bash
# 清理可能泄露敏感信息的文件

# 清理 bash 历史
rm ~/.bash_history
touch ~/.bash_history

# 清理 zsh 历史
rm ~/.zsh_history
touch ~/.zsh_history

# 清理临时文件
rm -f /tmp/claude-*
rm -f ~/.claude/*.tmp

echo "✅ 清理完成"
```

### 2. 配置被篡改

#### 检查完整性
```bash
# 1. 检查文件权限
ls -la ~/.claude/

# 2. 检查文件完整性
# 比较当前配置与备份
diff ~/.claude/model-switcher.json ~/.claude/model-switcher.json.backup

# 3. 检查修改时间
stat ~/.claude/model-switcher.json
```

#### 恢复步骤
```bash
# 1. 从备份恢复
cp ~/.claude/model-switcher.json.backup ~/.claude/model-switcher.json

# 2. 重新设置权限
chmod 600 ~/.claude/model-switcher.json

# 3. 验证配置
claude-switcher list

# 4. 检查当前配置
claude-switcher show
```

### 3. 报告安全漏洞

如果你发现安全漏洞，请通过以下方式联系：

```markdown
## 安全漏洞报告

**严重等级**: [高/中/低]

**漏洞描述**:
详细描述安全漏洞

**复现步骤**:
1. 步骤1
2. 步骤2
3. ...

**预期行为**:
描述应该发生什么

**实际行为**:
描述实际发生了什么

**影响范围**:
描述可能的影响

**建议修复**:
如果可以，提供修复建议

**联系方式**:
你的邮箱
```

---

## 📋 安全检查清单

### 部署前检查
- [ ] API Key 不在代码中硬编码
- [ ] 配置文件权限设置为 600
- [ ] 添加 .gitignore 规则
- [ ] 移除测试 API Key
- [ ] 设置安全的环境变量

### 日常使用检查
- [ ] 定期轮换 API Key
- [ ] 监控 API 使用情况
- [ ] 清理命令历史
- [ ] 检查文件权限
- [ ] 更新工具版本

### 团队协作检查
- [ ] 每人使用独立 API Key
- [ ] 配置文件不共享
- [ ] 使用环境变量模板
- [ ] 定期安全培训

---

## 🔐 加密选项

### 配置文件加密

如果需要额外的安全层，可以启用配置文件加密：

```bash
# 安装加密工具
npm install -g node-file-encrypt

# 加密配置文件
file-encrypt --encrypt --key your-password ~/.claude/model-switcher.json

# 解密配置文件
file-encrypt --decrypt --key your-password ~/.claude/model-switcher.json.encrypted

# 工具会自动检测并处理加密文件
```

### 环境变量管理

#### 使用密码管理器
```bash
# 从密码管理器获取 API Key
API_KEY=$(security find-generic-password -s "claude-api-key" -w)

# 使用环境变量
export ANTHROPIC_API_KEY="$API_KEY"

# 添加配置（从环境变量读取）
claude-switcher add
```

#### 使用 HashiCorp Vault
```bash
# 从 Vault 获取秘钥
API_KEY=$(vault kv get -field=api_key secret/claude)

# 设置环境变量
export ANTHROPIC_API_KEY="$API_KEY"
```

---

## 📚 安全资源

### 官方文档
- [Anthropic API 安全指南](https://docs.anthropic.com/)
- [Claude Code 安全最佳实践](https://docs.claude.com/security/)

### 安全工具
- [git-secrets](https://github.com/awslabs/git-secrets) - 防止提交敏感信息
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - 扫描 Git 仓库中的敏感信息
- [detect-secrets](https://github.com/Yelp/detect-secrets) - 敏感信息检测

### 安全标准
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## ❓ 常见问题

### Q: API Key 存储安全吗？
A: 工具采用多种安全措施，包括文件权限、敏感信息脱敏等。但最重要的是用户需要：
- 设置正确的文件权限 (600)
- 不将配置文件提交到版本控制
- 定期轮换 API Key
- 使用环境变量作为补充

### Q: 如何安全地分享配置？
A: **不要直接分享配置文件**。推荐方式：
- 分享配置模板（不包含 API Key）
- 让接收者自行添加 API Key
- 使用环境变量传递敏感信息

### Q: 如何检查配置是否泄露？
A:
```bash
# 1. 搜索 Git 历史
git log -p --all | grep -i "sk-ant"

# 2. 搜索整个系统
grep -r "sk-ant" ~/

# 3. 使用工具扫描
git secrets --scan-history
```

### Q: 工具会发送我的 API Key 吗？
A: **不会**。工具完全本地运行：
- 不发送网络请求（除了你配置的 API）
- 不收集遥测数据
- 不访问远程服务器
- 所有数据仅保存在本地

---

## 📄 许可证

本安全文档遵循 MIT 许可证。

---

## 🔗 相关文档

- [README.md](./README.md) - 完整使用说明
- [GETTING_STARTED.md](./GETTING_STARTED.md) - 快速开始
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南

---

## 📞 安全联系

如果你发现安全漏洞或有任何安全问题，请：

1. 不要创建公开的 Issue
2. 发送邮件至安全团队
3. 等待确认和修复

**你的安全是我们的首要任务！** 🔒

---

**保持安全，享受开发！** 🚀

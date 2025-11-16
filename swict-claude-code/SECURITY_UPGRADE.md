# Claude Config Switcher 安全升级指南

## 升级概述

本次升级为 `claude-config-switcher.js` 添加了重要的安全功能，解决了 API Key 以明文存储的高危安全问题。

## 新增安全功能

### 1. API Key 加密存储
- **加密算法**: AES-256-GCM（业界标准的安全加密算法）
- **密钥长度**: 256 位（32 字节）
- **IV 长度**: 96 位（12 字节，GCM 推荐）
- **认证标签**: 128 位（16 字节），确保数据完整性
- **存储格式**: `base64(iv):base64(authTag):base64(encrypted_data)`

### 2. 文件权限自动设置
- 配置文件 `model-switcher.json`: 权限设置为 600（仅所有者可读写）
- Claude 设置文件 `settings.json`: 权限设置为 600（仅所有者可读写）
- 配置目录 `.claude/`: 权限设置为 700（仅所有者可读写执行）
- 加密密钥文件 `.claude/.key`: 权限设置为 600（仅所有者可读写）

### 3. 安全的密钥管理
- **自动生成**: 首次运行时自动生成 32 字节随机密钥
- **密钥存储**: 保存在 `~/.claude/.key` 文件中（隐藏文件）
- **环境变量支持**: 可通过 `CLAUDE_SWITCHER_KEY` 环境变量指定自定义密钥
- **密钥格式**: 支持 base64 编码或任意字符串（会自动 hash 到 32 字节）

## 修改详情

### 新增函数

#### `getEncryptionKey()`
- 获取或生成 32 字节加密密钥
- 优先级：环境变量 `CLAUDE_SWITCHER_KEY` > 密钥文件 > 自动生成
- 生成的密钥会自动保存到 `.key` 文件

#### `encryptText(text, key)`
- 使用 AES-256-GCM 加密文本
- 参数:
  - `text`: 要加密的明文
  - `key`: 32 字节加密密钥
- 返回: 加密后的字符串（包含 iv 和 authTag）

#### `decryptText(encryptedText, key)`
- 解密 AES-256-GCM 加密的文本
- 参数:
  - `encryptedText`: 加密的字符串
  - `key`: 32 字节解密密钥
- 返回: 解密后的明文

#### `getSecureApiKeyDisplay(apiKey)`
- 安全显示 API Key（仅显示前后部分）
- 格式: `prefix***suffix`
- 用于列表和状态显示，避免完整密钥泄露

### 修改的函数

#### `ensureConfigDir()`
- 添加目录权限设置（700）
- 确保配置目录安全

#### `loadConfig()`
- 添加加密密钥读取逻辑
- 自动检测并解密已加密的 API Key
- 向后兼容：自动处理未加密的旧配置文件
- 添加配置文件权限设置（600）

#### `saveConfig()`
- 添加 API Key 加密逻辑
- 自动加密保存的 API Key
- 避免重复加密（检查是否已加密）
- 添加配置文件权限设置（600）

#### `saveClaudeSettings()`
- 添加配置文件权限设置（600）
- 防止其他用户访问敏感的 API Key

#### `listProviders()`
- 使用安全的 API Key 显示方式
- 添加 "(已加密存储)" 标识

#### `showCurrentConfig()`
- 使用安全的 API Key 显示方式

#### `showHelp()`
- 添加安全功能说明
- 添加配置位置信息
- 添加安全提示

## 使用说明

### 首次使用
1. 升级后首次运行工具，程序会自动：
   - 创建 `.claude` 目录（权限 700）
   - 生成随机加密密钥并保存到 `.key` 文件（权限 600）
   - 加密所有新增的 API Key

### 使用自定义密钥
```bash
# 生成 base64 编码的 32 字节密钥
export CLAUDE_SWITCHER_KEY=$(openssl rand -base64 32)

# 然后运行工具
claude-switcher add
```

### 从旧版本升级
1. 现有配置文件无需修改，程序会自动检测并解密
2. 首次保存时会自动重新加密
3. 建议升级后删除旧的未加密备份

### 备份和恢复
```bash
# 备份配置和密钥
cp ~/.claude/model-switcher.json ~/backup-config.json
cp ~/.claude/.key ~/backup-key.key

# 恢复配置
cp ~/backup-config.json ~/.claude/model-switcher.json
cp ~/backup-key.key ~/.claude/.key
chmod 600 ~/.claude/.key
chmod 600 ~/.claude/model-switcher.json
```

## 安全最佳实践

1. **定期备份加密密钥**
   - 加密密钥丢失将导致无法解密配置文件
   - 建议将密钥保存在安全的地方（如密码管理器）

2. **使用环境变量**
   - 在多用户环境中，使用 `CLAUDE_SWITCHER_KEY` 环境变量
   - 避免密钥文件被其他用户访问

3. **文件权限检查**
   - 定期检查配置文件权限：`ls -la ~/.claude/`
   - 确保只有所有者可读写文件

4. **密钥轮换**
   - 必要时可以更换加密密钥：
   ```bash
   # 1. 导出配置
   claude-switcher list > backup.txt

   # 2. 设置新密钥
   export CLAUDE_SWITCHER_KEY=$(openssl rand -base64 32)

   # 3. 重新添加配置（新密钥会自动加密）
   ```

## 兼容性说明

- ✅ 完全向后兼容：支持读取未加密的旧配置文件
- ✅ 自动迁移：旧配置文件会在首次保存时自动加密
- ✅ 无需手动操作：升级后无需额外配置

## 配置文件结构

### model-switcher.json（加密后）
```json
{
  "providers": [
    {
      "name": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "base64(iv):base64(authTag):base64(encrypted_data)",
      "createdAt": "2025-11-03T12:00:00.000Z"
    }
  ]
}
```

### .key（加密密钥文件）
```
base64编码的32字节密钥
```

## 故障排除

### 问题：提示"解密 API Key 失败"
**原因**: 密钥文件损坏或密钥不匹配
**解决**:
1. 检查 `.key` 文件是否存在且权限正确
2. 如果使用环境变量，确认 `CLAUDE_SWITCHER_KEY` 设置正确
3. 如果无法恢复，需要重新添加配置

### 问题：配置文件权限不正确
**解决**:
```bash
chmod 700 ~/.claude
chmod 600 ~/.claude/model-switcher.json
chmod 600 ~/.claude/.key
chmod 600 ~/.claude/settings.json
```

## 总结

本次升级显著提高了工具的安全性：
- 🔒 API Key 使用业界标准 AES-256-GCM 加密
- 🔐 文件权限自动设置为最严格模式
- 🔑 密钥管理安全可靠，支持环境变量
- 🔄 完全向后兼容，无需手动迁移
- 📊 安全的密钥显示，防止泄露

建议所有用户尽快升级到此版本，以确保 API Key 的安全。

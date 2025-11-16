# 快速测试指南

## 测试环境准备

确保 Node.js 已安装：
```bash
node --version  # 应显示 v12.0.0 或更高版本
```

## 基础功能测试

### 1. 测试帮助信息
```bash
node claude-config-switcher.js help
```
**预期结果**: 应显示安全功能说明，包括加密提示

### 2. 添加配置（加密测试）
```bash
node claude-config-switcher.js add
```
**输入示例**:
- 服务商名称: `test-provider`
- API Base URL: `https://api.test.com/v1`
- API Key: `sk-test-1234567890abcdef`

**预期结果**:
- 显示 "✅ 服务商已成功添加"
- 配置文件应被加密

### 3. 查看配置文件（加密验证）
```bash
cat ~/.claude/model-switcher.json
```
**预期结果**: API Key 应显示为加密格式（包含冒号分隔的 base64 数据）

### 4. 列出配置（安全显示）
```bash
node claude-config-switcher.js list
```
**预期结果**:
- API Key 应显示为掩码格式（类似 `sk-test***5678 (已加密存储)`）
- 不应显示完整密钥

### 5. 切换配置
```bash
node claude-config-switcher.js switch test-provider
```
**预期结果**: 应成功切换并显示配置信息

### 6. 显示当前配置
```bash
node claude-config-switcher.js show
```
**预期结果**: 应显示当前配置，API Key 为掩码格式

## 文件权限测试

### 检查权限设置
```bash
ls -la ~/.claude/
```

**预期结果**:
```
drwx------   2 user group  4096  ./
-rw-------   1 user group  4096  .key
-rw-------   1 user group  4096  model-switcher.json
-rw-------   1 user group  4096  settings.json
```

## 向后兼容测试

### 创建未加密的旧格式配置
```bash
# 手动创建旧格式配置（仅用于测试）
cat > ~/.claude/model-switcher.json << EOF
{
  "providers": [
    {
      "name": "old-provider",
      "baseUrl": "https://api.old.com/v1",
      "apiKey": "sk-old-plaintext-key-1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
EOF
```

### 测试读取旧配置
```bash
node claude-config-switcher.js list
```
**预期结果**:
- 应能正常读取旧配置（显示警告但不影响功能）
- 显示的 API Key 应为掩码格式

### 测试保存（自动加密）
```bash
# 添加相同名称的配置（会覆盖）
node claude-config-switcher.js add
# 输入: old-provider, https://api.old.com/v1, sk-old-plaintext-key-1234567890
```
**预期结果**:
- 重新保存后，配置文件中的 API Key 应变为加密格式

## 环境变量测试

### 设置自定义密钥
```bash
export CLAUDE_SWITCHER_KEY=$(openssl rand -base64 32)
echo $CLAUDE_SWITCHER_KEY  # 应显示 base64 编码的密钥
```

### 重新测试功能
```bash
# 清除旧配置
rm ~/.claude/model-switcher.json

# 添加新配置
node claude-config-switcher.js add
```
**预期结果**:
- 使用自定义密钥加密
- 配置文件内容与之前不同（不同的加密结果）

## 交互模式测试

```bash
node claude-config-switcher.js interactive
```
**测试步骤**:
1. 选择 "2" - 添加新配置
2. 添加配置后，选择 "1" - 列出配置
3. 验证显示格式
4. 选择 "5" - 显示当前配置
5. 选择 "6" - 退出

## 安全性测试

### 1. 密钥文件内容
```bash
cat ~/.claude/.key
```
**预期结果**:
- 应显示 base64 编码的字符串
- 文件长度约 44 字符（32 字节 base64 编码）

### 2. 配置文件内容（model-switcher.json）
```bash
cat ~/.claude/model-switcher.json
```
**预期结果**:
- `apiKey` 字段应包含冒号分隔的三部分 base64 数据
- 示例: `MDEyMzQ1Njc4OTA=:a1b2c3d4e5f6=:xJ3h2G...`

### 3. 无法直接读取密钥
```bash
node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync(process.env.HOME+'/.claude/model-switcher.json')).providers[0].apiKey)"
```
**预期结果**:
- 输出应为加密格式，而非明文密钥
- 格式: `base64:base64:base64`

## 错误处理测试

### 1. 测试无效加密数据
```bash
# 创建包含无效加密数据的配置文件
cat > ~/.claude/model-switcher.json << EOF
{
  "providers": [
    {
      "name": "invalid-encrypt",
      "baseUrl": "https://api.test.com/v1",
      "apiKey": "invalid-encrypted-data",
      "createdAt": "2025-11-03T00:00:00.000Z"
    }
  ]
}
EOF

node claude-config-switcher.js list
```
**预期结果**:
- 应显示警告信息："解密 API Key 失败，保持未加密状态"
- 程序不应崩溃

### 2. 测试目录权限（可选）
```bash
# 临时修改权限（需要 sudo）
sudo chmod 777 ~/.claude/model-switcher.json

# 运行程序
node claude-config-switcher.js list

# 恢复权限
node claude-config-switcher.js save  # 或重新添加配置
```
**预期结果**:
- 程序运行后，权限应自动恢复为 600

## 性能测试（可选）

```bash
# 创建大量配置
node claude-config-switcher.js add
# 重复 50 次...

# 测试加载
time node claude-config-switcher.js list
```
**预期结果**:
- 加载时间应在秒级
- 不应有明显性能问题

## 清理测试数据

```bash
# 删除配置目录
rm -rf ~/.claude/

# 运行程序测试重新初始化
node claude-config-switcher.js help
```
**预期结果**:
- 应重新创建目录和密钥文件
- 权限设置正确

---

## 测试通过标准

✅ 所有基础功能正常工作
✅ API Key 正确加密存储
✅ 文件权限正确设置（600/700）
✅ 安全显示不泄露完整密钥
✅ 向后兼容旧配置文件
✅ 错误处理正确
✅ 环境变量支持正常

## 常见问题

### Q: 提示 "权限被拒绝"
**A**: 检查文件所有者是否正确，运行 `chown -R $USER:$USER ~/.claude/`

### Q: 解密失败但不影响功能
**A**: 这是正常行为，旧配置文件首次保存时会自动加密

### Q: 自定义密钥不生效
**A**: 确保环境变量在运行前已设置，使用 `echo $CLAUDE_SWITCHER_KEY` 验证

### Q: 配置文件格式错误
**A**: 删除配置文件让程序重新生成，或从备份恢复

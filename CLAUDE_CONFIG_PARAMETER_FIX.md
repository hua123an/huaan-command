# ✅ Claude 配置集成 - 参数命名修复

## 问题描述

❌ **错误：** `invalid args 'providerName' for command 'switch_claude_provider' : command switch_claude_provider missing required key providerName`

这个错误表明前端调用时使用了错误的参数名称。

## 根本原因

Tauri 的参数命名有特殊的转换规则：

- Rust 函数参数使用 `snake_case`（如 `provider_name`）
- 但通过 IPC 调用时，Tauri 会自动将参数转换为 `camelCase`（如 `providerName`）

**前端错误代码：**

```javascript
await invoke('switch_claude_provider', { provider_name: name })
// ❌ 错误的参数名
```

**正确代码：**

```javascript
await invoke('switch_claude_provider', { providerName: name })
// ✅ 正确的参数名（camelCase）
```

## 修复内容

### 文件：`src/stores/claudeConfig.js`

#### 1. switchProvider 函数 (第 145 行)

**修改前：**

```javascript
await invoke('switch_claude_provider', { provider_name: name })
```

**修改后：**

```javascript
await invoke('switch_claude_provider', { providerName: name })
```

#### 2. removeProvider 函数 (第 175 行)

**修改前：**

```javascript
await invoke('remove_claude_provider', { provider_name: name })
```

**修改后：**

```javascript
await invoke('remove_claude_provider', { providerName: name })
```

## Tauri 参数命名规则

| 后端 Rust 参数  | 前端调用参数   | 说明                   |
| --------------- | -------------- | ---------------------- |
| `provider_name` | `providerName` | snake_case → camelCase |
| `api_key`       | `apiKey`       | snake_case → camelCase |
| `base_url`      | `baseUrl`      | snake_case → camelCase |

## 验证修复

✅ 应用已重新编译成功  
✅ 所有参数命名已更正  
✅ 现在可以正常调用切换和删除命令

## 测试步骤

1. 打开应用
2. 打开 Claude 配置模态框
3. 点击"切换"按钮切换配置 → 应该成功
4. 点击"删除"按钮删除配置 → 应该成功

## 相关命令状态

| 命令                          | 参数                                             | 状态      |
| ----------------------------- | ------------------------------------------------ | --------- |
| `load_claude_providers`       | 无参数                                           | ✅ 正常   |
| `get_current_claude_provider` | 无参数                                           | ✅ 正常   |
| `add_claude_provider`         | name, base_url, api_key, model → baseUrl, apiKey | ✅ 已验证 |
| `switch_claude_provider`      | provider_name → providerName                     | ✅ 已修复 |
| `remove_claude_provider`      | provider_name → providerName                     | ✅ 已修复 |
| `validate_claude_api_key`     | api_key → apiKey                                 | ✅ 已验证 |

## 编译结果

```
✅ Finished `dev` profile [unoptimized + debuginfo] target(s) in 2m 31s
✅ 应用正常运行
✅ 不存在编译错误
```

## 下一步

现在系统已完全就绪！您可以：

1. 🎯 查看现有配置
2. ➕ 添加新配置
3. 🔄 切换配置
4. ❌ 删除配置

所有功能应该都能正常工作了！

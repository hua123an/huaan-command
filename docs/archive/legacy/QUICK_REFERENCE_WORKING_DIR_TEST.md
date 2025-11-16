# 工作目录传递测试 - 快速参考卡

## 快速概览

| 项目 | 说明 |
|-----|------|
| 目标 | 验证 `execute_command` 是否在正确的目录中执行 |
| 文件 | `/Users/huaan/Downloads/huaan-command-dev/test-working-dir.js` |
| 测试数 | 3 个关键测试用例 |
| 依赖 | `src/tools/index.js` + Tauri 后端 |

---

## 三个核心测试

### 测试1：绝对路径 (Home)
```javascript
// 输入
{ cmd: 'pwd', workingDir: '/Users/huaan' }

// 期望输出
'/Users/huaan'
```

### 测试2：嵌套路径 (子目录)
```javascript
// 输入
{ cmd: 'pwd', workingDir: '/Users/huaan/kero' }

// 期望输出
'/Users/huaan/kero'

// 前置条件
mkdir -p /Users/huaan/kero
```

### 测试3：主目录展开 (~)
```javascript
// 输入
{ cmd: 'pwd', workingDir: '~/kero' }

// 期望输出
'/Users/huaan/kero'  // ~ 已展开

// 关键点：必须支持 ~ 符号
```

---

## 快速运行

### 方式1：查看测试说明
```bash
node test-working-dir.js
```

### 方式2：浏览器控制台
```javascript
// 直接在浏览器控制台运行
const result = await window.__TAURI__.core.invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan'
});
console.log(result);
```

### 方式3：Vue 组件
```javascript
import { useToolExecutor } from '@/tools/executor'

const { executeTool } = useToolExecutor()
const result = await executeTool('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan/kero'
})
```

---

## 验证清单

- [ ] 测试1 返回 `/Users/huaan`
- [ ] 测试2 返回 `/Users/huaan/kero`
- [ ] 测试3 返回 `/Users/huaan/kero`（~ 已展开）
- [ ] 所有命令 exit code = 0
- [ ] 无 stderr 输出

---

## 常见问题排查

### 问题：测试失败，返回错误的目录
**原因**：workingDir 参数未传递给后端
**检查**：`src/tools/index.js` 第 92 行
```javascript
return await invoke('execute_command', { cmd, workingDir: dir })
```

### 问题：~ 符号不展开
**原因**：后端未处理 ~ 符号
**检查**：Tauri 后端中的 tilde 展开逻辑
```rust
use shellexpand;
let expanded = shellexpand::tilde(&workingDir);
```

### 问题：目录不存在错误
**解决**：创建测试目录
```bash
mkdir -p /Users/huaan/kero
```

---

## 文件清单

| 文件 | 用途 |
|-----|------|
| `test-working-dir.js` | 测试说明脚本（本地运行） |
| `test-working-dir-actual.js` | 实际测试代码（6种方式） |
| `TEST_WORKING_DIR_GUIDE.md` | 详细测试文档 |
| `src/tools/index.js` | execute_command 工具定义 |
| `src-tauri/src/main.rs` | 后端实现（预期位置） |

---

## 关键代码位置

### 前端：工具定义
**文件**：`src/tools/index.js` (第 87-114 行)
```javascript
createTool(
  'execute_command',
  '执行 shell 命令',
  async ({ cmd, workingDir }, context) => {
    const dir = workingDir || context.currentDir
    return await invoke('execute_command', { cmd, workingDir: dir })
  },
  // ...
)
```

### 前端：执行器
**文件**：`src/tools/executor.js`
```javascript
const result = await tool.execute(params, context)
```

### 后端：Tauri 命令（需要验证）
**预期位置**：`src-tauri/src/main.rs`
```rust
#[tauri::command]
pub async fn execute_command(cmd: String, working_dir: Option<String>) -> Result<...> {
    // 设置 working_dir 并执行命令
}
```

---

## 验证成功的标志

✅ **全部测试通过意味着**：
- 工作目录参数正确传递
- 后端正确处理 workingDir
- ~ 符号正确展开
- 命令在正确的目录中执行

---

## 下一步

1. **运行基础测试**
   ```bash
   node test-working-dir.js
   ```

2. **在浏览器中测试**
   - 打开应用
   - 打开开发者工具 (F12)
   - 复制 `test-working-dir-actual.js` 中的代码运行

3. **检查后端实现**
   - 验证 Tauri 命令签名
   - 检查 workingDir 参数处理
   - 添加 ~ 符号展开逻辑

4. **集成到测试套件**
   - 参考 `test-working-dir-actual.js` 中的 Jest 代码
   - 添加到项目的自动化测试中

---

## 关键参数说明

| 参数 | 说明 | 示例 |
|-----|------|------|
| `cmd` | 要执行的 shell 命令 | `'pwd'`, `'ls -la'` |
| `workingDir` | 工作目录（可选） | `/Users/huaan`, `~/kero` |
| 返回值 | 命令执行结果 | `{ success, stdout, stderr, code }` |

---

## 成功示例

```javascript
// 调用
const result = await invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan/kero'
});

// 返回
{
  success: true,
  stdout: '/Users/huaan/kero\n',
  stderr: '',
  code: 0
}

// 验证
result.stdout.trim() === '/Users/huaan/kero'  // true
```

---

## 常用命令

```bash
# 查看测试说明
node test-working-dir.js

# 创建测试目录
mkdir -p /Users/huaan/kero

# 验证目录存在
ls -ld /Users/huaan/kero

# 直接测试（bash）
cd /Users/huaan/kero && pwd
```

---

**更多信息**：查看 `TEST_WORKING_DIR_GUIDE.md` 详细文档

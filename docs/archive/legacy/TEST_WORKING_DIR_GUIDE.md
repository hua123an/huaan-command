# 工作目录传递测试说明文档

## 目标

验证 `execute_command` 工具是否能够正确处理和传递工作目录参数，确保命令在指定的目录中正确执行。

## 测试概览

本测试包含 **3 个关键测试用例**，验证工作目录传递的三个主要场景：

| 测试号 | 场景 | 工作目录 | 执行命令 | 期望输出 |
|--------|------|---------|---------|---------|
| 测试1 | 绝对路径（Home目录） | `/Users/huaan` | `pwd` | `/Users/huaan` |
| 测试2 | 嵌套路径（子目录） | `/Users/huaan/kero` | `pwd` | `/Users/huaan/kero` |
| 测试3 | 主目录展开（~ 符号） | `~/kero` | `pwd` | `/Users/huaan/kero` |

## 详细测试用例说明

### 测试1：Home 目录执行 pwd

**目的**：验证在 home 目录中执行命令时，工作目录参数是否被正确传递和使用

**执行步骤**：
1. 调用 `execute_command` 工具
2. 设置 `workingDir` 为 `/Users/huaan`
3. 执行 `pwd` 命令
4. 比较返回结果

**代码示例**：
```javascript
// 调用方式
const result = await invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan'
});

// 期望结果
{
  success: true,
  stdout: '/Users/huaan',
  stderr: '',
  code: 0
}
```

**验证方法**：
- 检查 stdout 是否为 `/Users/huaan`
- 检查 code 是否为 0（成功）
- 确认没有错误信息

**通过条件**：`result.stdout.trim() === '/Users/huaan'`

---

### 测试2：子目录执行 pwd

**目的**：验证在嵌套目录中执行命令时，工作目录是否被正确应用

**执行步骤**：
1. 调用 `execute_command` 工具
2. 设置 `workingDir` 为 `/Users/huaan/kero`
3. 执行 `pwd` 命令
4. 比较返回结果

**代码示例**：
```javascript
// 调用方式
const result = await invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '/Users/huaan/kero'
});

// 期望结果
{
  success: true,
  stdout: '/Users/huaan/kero',
  stderr: '',
  code: 0
}
```

**验证方法**：
- 检查 stdout 是否为 `/Users/huaan/kero`
- 检查 code 是否为 0（成功）
- 确保目录存在

**通过条件**：`result.stdout.trim() === '/Users/huaan/kero'`

**前置条件**：目录 `/Users/huaan/kero` 必须存在，否则需要先创建：
```bash
mkdir -p /Users/huaan/kero
```

---

### 测试3：主目录符号展开

**目的**：验证系统是否能够正确处理 `~` 符号，将其展开为用户主目录

**执行步骤**：
1. 调用 `execute_command` 工具
2. 设置 `workingDir` 为 `~/kero` （包含 ~ 符号）
3. 执行 `pwd` 命令
4. 比较返回结果

**代码示例**：
```javascript
// 调用方式
const result = await invoke('execute_command', {
  cmd: 'pwd',
  workingDir: '~/kero'
});

// 期望结果
{
  success: true,
  stdout: '/Users/huaan/kero',  // ~ 已展开
  stderr: '',
  code: 0
}
```

**验证方法**：
- 检查 stdout 是否为 `/Users/huaan/kero`（~ 已展开）
- 检查 code 是否为 0（成功）
- 确保 ~ 符号被正确展开

**通过条件**：`result.stdout.trim() === '/Users/huaan/kero'`

**关键点**：
- `~` 必须被展开为 `/Users/huaan`（当前用户的主目录）
- `~/kero` 应等同于 `/Users/huaan/kero`

---

## 技术实现细节

### 工具定义位置

**文件**：`/Users/huaan/Downloads/huaan-command-dev/src/tools/index.js`

**相关代码** (第 87-114 行)：
```javascript
createTool(
  'execute_command',
  '执行 shell 命令',
  async ({ cmd, workingDir }, context) => {
    const dir = workingDir || context.currentDir
    return await invoke('execute_command', { cmd, workingDir: dir })
  },
  {
    needsApproval: (params) => {
      const dangerous = ['rm', 'sudo', 'mv', 'dd', 'mkfs', 'format', 'del']
      return dangerous.some(d => params.cmd.includes(d))
    },
    category: 'execution',
    icon: '⚡',
    safetyCheck: ({ cmd, workingDir }) => {
      const cmdCheck = checkCommand(cmd)
      return {
        ...cmdCheck,
        operation: {
          type: 'execute_command',
          params: { cmd, workingDir }
        }
      }
    }
  }
)
```

**关键参数说明**：
- `cmd`：要执行的 shell 命令
- `workingDir`：工作目录（可选，默认使用 context.currentDir）

### 工具执行流程

**文件**：`/Users/huaan/Downloads/huaan-command-dev/src/tools/executor.js`

**执行流程**：
1. 参数验证：确保参数符合工具定义
2. 危险操作检测：检查是否是危险命令
3. 安全检查：运行 safetyCheck 函数
4. 批准检查：如需要批准则等待用户确认
5. 工具执行：调用工具的 execute 方法
6. 结果格式化：将结果转换为标准格式
7. 历史记录：保存执行历史

### 后端实现（Tauri）

**预期位置**：`/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/main.rs` 或相关模块

**关键要求**：
1. 接收 `cmd` 和 `workingDir` 参数
2. 将当前工作目录切换到 `workingDir`
3. 在该目录中执行命令
4. 返回执行结果（stdout, stderr, exit code）

**伪代码**：
```rust
#[tauri::command]
pub async fn execute_command(cmd: String, working_dir: Option<String>) -> Result<CommandResult, String> {
    // 处理工作目录
    let dir = if let Some(wd) = working_dir {
        // 展开 ~ 符号
        let expanded = shellexpand::tilde(&wd);
        std::path::Path::new(expanded.as_ref())
    } else {
        std::env::current_dir()?
    };

    // 执行命令
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .current_dir(dir)  // 关键：设置工作目录
        .output()?;

    Ok(CommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}
```

## 运行测试的方法

### 方法1：查看测试说明（快速）

```bash
node /Users/huaan/Downloads/huaan-command-dev/test-working-dir.js
```

**输出**：
- 测试计划和验证逻辑
- 详细的测试说明
- 错误诊断指南

### 方法2：手动测试（推荐）

#### 步骤1：确保前置条件

```bash
# 创建测试目录
mkdir -p /Users/huaan/kero

# 验证目录存在
ls -ld /Users/huaan
ls -ld /Users/huaan/kero
```

#### 步骤2：在应用中测试

1. 打开应用的测试界面或控制台
2. 导入工具执行器：
   ```javascript
   import { useToolExecutor } from './src/tools/executor'
   const executor = useToolExecutor()
   ```

3. 执行测试用例：
   ```javascript
   // 测试1
   const result1 = await executor.executeTool('execute_command', {
     cmd: 'pwd',
     workingDir: '/Users/huaan'
   })
   console.log(result1)

   // 测试2
   const result2 = await executor.executeTool('execute_command', {
     cmd: 'pwd',
     workingDir: '/Users/huaan/kero'
   })
   console.log(result2)

   // 测试3
   const result3 = await executor.executeTool('execute_command', {
     cmd: 'pwd',
     workingDir: '~/kero'
   })
   console.log(result3)
   ```

4. 验证结果

### 方法3：自动化测试（完整）

可以创建一个测试文件集成到项目的测试套件：

```javascript
// tests/execute-command.test.js
import { describe, it, expect } from 'vitest'
import { useToolExecutor } from '../src/tools/executor'

describe('execute_command 工作目录测试', () => {
  it('测试1：在 /Users/huaan 执行 pwd', async () => {
    const executor = useToolExecutor()
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '/Users/huaan'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan')
  })

  it('测试2：在 /Users/huaan/kero 执行 pwd', async () => {
    const executor = useToolExecutor()
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '/Users/huaan/kero'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan/kero')
  })

  it('测试3：在 ~/kero 执行 pwd（~ 展开）', async () => {
    const executor = useToolExecutor()
    const result = await executor.executeTool('execute_command', {
      cmd: 'pwd',
      workingDir: '~/kero'
    })
    expect(result.stdout.trim()).toBe('/Users/huaan/kero')
  })
})
```

## 故障排查指南

### 问题1：测试1 失败 - 工作目录未传递

**症状**：
```
预期: /Users/huaan
实际: /Users/huaan/Downloads/huaan-command-dev  (或其他目录)
```

**原因**：`workingDir` 参数未正确传递给 Tauri 后端

**检查清单**：
1. [ ] 检查 `src/tools/index.js` 第 92 行：
   ```javascript
   return await invoke('execute_command', { cmd, workingDir: dir })
   ```
   确保 `workingDir` 被正确传递

2. [ ] 检查 `src-tauri/src/main.rs` 中的 `execute_command` 函数签名
   ```rust
   pub async fn execute_command(cmd: String, working_dir: Option<String>) -> ...
   ```

3. [ ] 确认参数名称匹配（`workingDir` vs `working_dir`）

**解决方案**：
- 在 Tauri IPC 调用时，确保参数名称与后端函数签名匹配
- 检查 Tauri 配置中是否启用了命令

---

### 问题2：测试2 失败 - 嵌套路径未生效

**症状**：
```
预期: /Users/huaan/kero
实际: /Users/huaan (或其他目录)
```

**原因**：目录不存在或路径解析错误

**检查清单**：
1. [ ] 确认目录存在：
   ```bash
   ls -ld /Users/huaan/kero
   ```
   如果不存在，创建目录：
   ```bash
   mkdir -p /Users/huaan/kero
   ```

2. [ ] 检查路径是否被正确处理
   ```bash
   cd /Users/huaan/kero && pwd
   ```

3. [ ] 验证权限：
   ```bash
   ls -ld /Users/huaan
   ls -ld /Users/huaan/kero
   ```

**解决方案**：
- 创建必要的目录结构
- 确保路径字符串没有被截断或修改

---

### 问题3：测试3 失败 - ~ 符号未展开

**症状**：
```
预期: /Users/huaan/kero
实际: 错误信息包含 "~" 或 "No such file or directory"
```

**原因**：后端未处理 `~` 符号展开

**检查清单**：
1. [ ] 确认后端是否有 tilde 展开逻辑
   - 查找 `shellexpand` 或类似库的使用
   - 检查是否实现了主目录展开

2. [ ] 测试 shell 本身是否处理 ~：
   ```bash
   sh -c "cd ~/kero && pwd"
   ```

3. [ ] 检查路径处理代码：
   ```rust
   // 应该包含类似代码
   let expanded = shellexpand::tilde(&working_dir);
   ```

**解决方案**：
- 在 Rust 代码中添加 `shellexpand` crate：
  ```toml
  [dependencies]
  shellexpand = "3.0"
  ```

- 使用 `shellexpand::tilde()` 或 `dirs::home_dir()` 处理 ~：
  ```rust
  use shellexpand;

  let expanded = shellexpand::tilde(&working_dir).to_string();
  ```

---

### 问题4：权限被拒绝

**症状**：
```
错误: "Permission denied"
```

**原因**：工作目录无访问权限

**解决方案**：
```bash
# 检查权限
ls -ld /Users/huaan/kero

# 修改权限（如果需要）
chmod 755 /Users/huaan/kero

# 确认当前用户可以访问
ls /Users/huaan/kero
```

---

### 问题5：命令超时或挂起

**症状**：
- 测试无响应
- 等待很长时间没有结果

**原因**：命令执行时间过长或陷入死循环

**解决方案**：
1. 确保 `pwd` 命令很快完成
2. 检查后端是否有超时设置
3. 添加执行超时限制：
   ```rust
   let output = std::process::Command::new("sh")
       .arg("-c")
       .arg(&cmd)
       .current_dir(dir)
       .output()
       .timeout(Duration::from_secs(5))?;
   ```

## 验证成功的标准

### 全部测试通过的标志：

- [ ] 测试1 返回 `/Users/huaan`
- [ ] 测试2 返回 `/Users/huaan/kero`
- [ ] 测试3 返回 `/Users/huaan/kero`（~ 已展开）
- [ ] 所有命令的 exit code 都是 0
- [ ] 没有 stderr 输出（或仅有预期的警告）
- [ ] 执行时间合理（< 1秒）

### 相关代码验证：

- [ ] `src/tools/index.js` 中 `workingDir` 参数被正确传递
- [ ] Tauri 后端正确处理 `working_dir` 参数
- [ ] 后端实现了 `~` 符号展开
- [ ] 工作目录被正确应用于命令执行

## 相关文件清单

| 文件 | 说明 |
|-----|------|
| `/Users/huaan/Downloads/huaan-command-dev/test-working-dir.js` | 本测试脚本 |
| `/Users/huaan/Downloads/huaan-command-dev/src/tools/index.js` | execute_command 工具定义 |
| `/Users/huaan/Downloads/huaan-command-dev/src/tools/executor.js` | 工具执行器 |
| `/Users/huaan/Downloads/huaan-command-dev/src/tools/validator.js` | 参数验证器 |
| `/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/main.rs` | Tauri 后端实现（预期位置） |
| `/Users/huaan/Downloads/huaan-command-dev/package.json` | 项目配置 |

## 结论

本测试套件全面验证了 `execute_command` 工具的工作目录传递功能，确保：

1. **绝对路径**能够被正确识别和使用
2. **嵌套路径**能够被正确解析
3. **~ 符号**能够被正确展开为用户主目录
4. **命令执行**发生在正确的目录中

通过遵循本文档的步骤和指南，可以系统地验证和调试工作目录传递功能，确保应用的命令执行功能正常工作。

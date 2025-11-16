# 命令执行器使用指南

## 概述

本项目实现了安全的命令执行接口，提供了两个主要的 Tauri 命令：

1. `execute_command_safe` - 增强安全版本，包含详细的结果和安全检查
2. `execute_simple_command` - 简化版本，兼容旧接口

## 创建的文件

### 1. `/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/commands/executor.rs`
核心命令执行模块，包含：
- `CommandResult` 结构体：详细的命令执行结果
- `ExecutorConfig` 结构体：命令执行配置
- `execute_command_safe` 命令：安全的命令执行接口
- `execute_simple_command` 命令：简化的命令执行接口
- 安全检查功能：危险命令检测、提权命令检测

### 2. `/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/commands/mod.rs`
命令模块的导出文件

### 3. `/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/lib.rs` (已更新)
在主应用中注册了新的命令

## 使用示例

### 1. 基本用法（JavaScript/TypeScript）

```typescript
import { invoke } from '@tauri-apps/api/core';

// 使用增强安全版本
async function executeCommand() {
  try {
    const result = await invoke('execute_command_safe', {
      cmd: 'ls -la',
      workingDir: '/Users/username/projects',
      config: null  // 使用默认配置
    });

    console.log('命令执行成功:', result);
    console.log('标准输出:', result.stdout);
    console.log('标准错误:', result.stderr);
    console.log('退出码:', result.exit_code);
    console.log('执行时长:', result.duration_ms, 'ms');
  } catch (error) {
    console.error('命令执行失败:', error);
  }
}

// 使用简化版本（兼容旧接口）
async function executeSimpleCommand() {
  try {
    const output = await invoke('execute_simple_command', {
      command: 'pwd',
      workingDir: '/Users/username'
    });

    console.log('命令输出:', output);
  } catch (error) {
    console.error('命令执行失败:', error);
  }
}
```

### 2. 自定义配置

```typescript
interface ExecutorConfig {
  timeout_secs: number;      // 超时时间（秒）
  enable_safety_check: boolean;  // 是否启用安全检查
  allow_privileged: boolean;     // 是否允许提权命令
}

async function executeWithConfig() {
  const config: ExecutorConfig = {
    timeout_secs: 60,           // 60秒超时
    enable_safety_check: true,  // 启用安全检查
    allow_privileged: false     // 不允许 sudo/su
  };

  try {
    const result = await invoke('execute_command_safe', {
      cmd: 'npm install',
      workingDir: '~/my-project',
      config: config
    });

    console.log('安装完成:', result.success);
  } catch (error) {
    console.error('安装失败:', error);
  }
}
```

### 3. 支持 ~ 展开

```typescript
// 自动展开 ~ 为用户主目录
async function executeInHome() {
  const result = await invoke('execute_command_safe', {
    cmd: 'ls -la',
    workingDir: '~',  // 自动展开为 /Users/username 或 /home/username
    config: null
  });

  console.log('主目录内容:', result.stdout);
}

// 使用 ~/子目录
async function executeInSubdir() {
  const result = await invoke('execute_command_safe', {
    cmd: 'git status',
    workingDir: '~/projects/myapp',
    config: null
  });
}
```

### 4. 长时间运行的命令

```typescript
async function buildProject() {
  const config: ExecutorConfig = {
    timeout_secs: 600,  // 10分钟超时
    enable_safety_check: true,
    allow_privileged: false
  };

  try {
    const result = await invoke('execute_command_safe', {
      cmd: 'npm run build',
      workingDir: '~/my-project',
      config: config
    });

    console.log(`构建完成，耗时: ${result.duration_ms}ms`);
  } catch (error) {
    if (error.includes('超时')) {
      console.error('构建超时，请增加 timeout_secs');
    }
  }
}
```

## 命令结果结构

```typescript
interface CommandResult {
  stdout: string;        // 标准输出
  stderr: string;        // 标准错误输出
  exit_code: number;     // 退出代码 (0 表示成功)
  success: boolean;      // 是否成功执行
  duration_ms: number;   // 执行时长（毫秒）
  working_dir: string;   // 实际工作目录（展开后）
}
```

## 安全措施

### 1. 危险命令检测

以下命令模式会被自动拦截：
- `rm -rf /` - 删除根目录
- `rm -rf /*` - 删除根目录所有文件
- `rm -rf ~` - 删除用户主目录
- `mkfs` - 格式化磁盘
- `dd if=` - 磁盘克隆/覆盖
- `> /dev/sda` - 直接写入磁盘设备
- `:(){ :|:& };:` - Fork 炸弹
- `chmod -R 777 /` - 危险的权限修改

示例：
```typescript
// 这个命令会被拒绝
try {
  await invoke('execute_command_safe', {
    cmd: 'rm -rf /',
    workingDir: '/',
    config: null
  });
} catch (error) {
  // 错误: "安全检查失败: 检测到危险命令模式: rm -rf /"
}
```

### 2. 提权命令限制

默认情况下，以下提权命令会被拦截：
- `sudo` - 超级用户权限
- `su` - 切换用户
- `doas` - OpenBSD 提权工具

如需使用提权命令，必须显式设置 `allow_privileged: true`：

```typescript
const config: ExecutorConfig = {
  timeout_secs: 60,
  enable_safety_check: true,
  allow_privileged: true  // 允许提权命令
};

const result = await invoke('execute_command_safe', {
  cmd: 'sudo apt-get update',
  workingDir: '/tmp',
  config: config
});
```

### 3. 工作目录验证

- 自动验证工作目录是否存在
- 确保工作路径是目录而非文件
- 支持 `~` 符号自动展开

### 4. 超时控制

- 默认超时时间：300 秒（5分钟）
- 可通过配置自定义超时时间
- 超时后命令会被终止

### 5. 日志记录

所有命令执行都会被记录，包括：
- 执行的命令内容
- 工作目录
- 执行时长
- 成功/失败状态
- 错误信息（如果有）

## 跨平台支持

### macOS / Linux
```typescript
// 使用 sh -c 执行命令
const result = await invoke('execute_command_safe', {
  cmd: 'ls -la | grep .txt',
  workingDir: '/tmp',
  config: null
});
```

### Windows
```typescript
// 使用 cmd /C 执行命令
const result = await invoke('execute_command_safe', {
  cmd: 'dir /B',
  workingDir: 'C:\\Users\\username',
  config: null
});
```

## 测试方法

### 1. 单元测试

在 `/Users/huaan/Downloads/huaan-command-dev/src-tauri/src/commands/executor.rs` 中已包含基础单元测试。

运行测试：
```bash
cd src-tauri
cargo test commands::executor
```

### 2. 集成测试示例

创建测试文件 `src-tauri/tests/executor_integration_test.rs`：

```rust
#[cfg(test)]
mod integration_tests {
    use your_app::commands::executor::*;

    #[tokio::test]
    async fn test_simple_command() {
        let result = execute_command_safe(
            "echo 'Hello World'".to_string(),
            "/tmp".to_string(),
            None
        ).await;

        assert!(result.is_ok());
        let cmd_result = result.unwrap();
        assert!(cmd_result.success);
        assert!(cmd_result.stdout.contains("Hello World"));
    }

    #[tokio::test]
    async fn test_dangerous_command() {
        let result = execute_command_safe(
            "rm -rf /".to_string(),
            "/tmp".to_string(),
            None
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("危险命令"));
    }

    #[tokio::test]
    async fn test_timeout() {
        let config = ExecutorConfig {
            timeout_secs: 1,
            enable_safety_check: true,
            allow_privileged: false,
        };

        let result = execute_command_safe(
            "sleep 10".to_string(),
            "/tmp".to_string(),
            Some(config)
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("超时"));
    }
}
```

### 3. 前端测试

```typescript
// tests/executor.test.ts
import { invoke } from '@tauri-apps/api/core';

describe('Command Executor', () => {
  test('execute simple command', async () => {
    const result = await invoke('execute_command_safe', {
      cmd: 'echo "test"',
      workingDir: '/tmp',
      config: null
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('test');
  });

  test('reject dangerous command', async () => {
    await expect(
      invoke('execute_command_safe', {
        cmd: 'rm -rf /',
        workingDir: '/tmp',
        config: null
      })
    ).rejects.toThrow();
  });
});
```

## 常见问题

### 1. 命令执行失败但没有错误信息

检查 `stderr` 字段，某些程序将错误输出到 stderr。

### 2. 相对路径不工作

确保传入绝对路径作为 `workingDir`，或使用 `~` 展开。

### 3. 命令超时

增加 `timeout_secs` 配置值，或优化命令执行速度。

### 4. 无法执行 sudo 命令

设置 `allow_privileged: true`，但请注意安全风险。

### 5. Windows 路径问题

Windows 使用反斜杠路径，记得转义：`C:\\Users\\username`。

## 性能建议

1. **避免执行耗时命令**：使用后台任务系统（task.rs）替代
2. **合理设置超时**：根据命令特性设置合适的超时时间
3. **批量命令**：使用脚本文件而非多次调用
4. **日志监控**：定期检查日志，发现潜在问题

## 安全最佳实践

1. **永远启用安全检查**：除非有充分理由，否则保持 `enable_safety_check: true`
2. **避免用户输入直接执行**：对用户输入进行验证和清理
3. **最小权限原则**：避免使用 `allow_privileged: true`
4. **审计日志**：定期审查命令执行日志
5. **白名单机制**：在前端层面限制可执行的命令类型

## 下一步扩展

可考虑添加的功能：
- [ ] 命令白名单机制
- [ ] 实时输出流（而非等待完成）
- [ ] 命令历史记录
- [ ] 资源使用限制（CPU、内存）
- [ ] 并发执行控制
- [ ] 命令队列系统

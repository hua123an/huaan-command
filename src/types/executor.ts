/**
 * 命令执行器 TypeScript 类型定义
 *
 * 这个文件提供了与 Rust 后端命令执行接口对应的 TypeScript 类型定义
 */

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 标准输出 */
  stdout: string;
  /** 标准错误输出 */
  stderr: string;
  /** 退出代码 (0 表示成功) */
  exit_code: number;
  /** 是否成功执行 */
  success: boolean;
  /** 执行时长（毫秒） */
  duration_ms: number;
  /** 实际工作目录（~ 展开后的路径） */
  working_dir: string;
}

/**
 * 命令执行配置
 */
export interface ExecutorConfig {
  /** 命令执行超时时间（秒），默认 300 秒 */
  timeout_secs: number;
  /** 是否启用危险命令检测，默认 true */
  enable_safety_check: boolean;
  /** 是否允许提权命令（sudo/su），默认 false */
  allow_privileged: boolean;
}

/**
 * 命令执行器类
 *
 * 封装了与 Tauri 后端的命令执行交互
 */
export class CommandExecutor {
  /**
   * 执行命令（安全增强版）
   *
   * @param cmd 要执行的命令
   * @param workingDir 工作目录（支持 ~ 展开）
   * @param config 执行配置（可选）
   * @returns 命令执行结果
   * @throws 命令执行失败时抛出错误
   *
   * @example
   * ```typescript
   * const result = await CommandExecutor.executeSafe(
   *   'ls -la',
   *   '/Users/username/projects'
   * );
   * console.log(result.stdout);
   * ```
   */
  static async executeSafe(
    cmd: string,
    workingDir: string,
    config?: ExecutorConfig | null
  ): Promise<CommandResult> {
    const { invoke } = await import('@tauri-apps/api/core');

    return invoke<CommandResult>('execute_command_safe', {
      cmd,
      working_dir: workingDir,  // 注意：Rust 后端参数名是 working_dir
      config: config || null
    });
  }

  /**
   * 执行简单命令（兼容旧接口）
   *
   * @param command 要执行的命令
   * @param workingDir 工作目录（可选）
   * @returns 命令输出（stdout + stderr）
   * @throws 命令执行失败时抛出错误
   *
   * @example
   * ```typescript
   * const output = await CommandExecutor.executeSimple('pwd', '~');
   * console.log(output);
   * ```
   */
  static async executeSimple(
    command: string,
    workingDir?: string | null
  ): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');

    return invoke<string>('execute_simple_command', {
      command,
      working_dir: workingDir || null  // 注意：Rust 后端参数名是 working_dir
    });
  }

  /**
   * 创建默认配置
   *
   * @returns 默认的执行器配置
   */
  static defaultConfig(): ExecutorConfig {
    return {
      timeout_secs: 300,
      enable_safety_check: true,
      allow_privileged: false
    };
  }

  /**
   * 创建自定义配置
   *
   * @param overrides 要覆盖的配置项
   * @returns 自定义配置
   *
   * @example
   * ```typescript
   * const config = CommandExecutor.createConfig({
   *   timeout_secs: 60,
   *   allow_privileged: true
   * });
   * ```
   */
  static createConfig(overrides: Partial<ExecutorConfig>): ExecutorConfig {
    return {
      ...this.defaultConfig(),
      ...overrides
    };
  }

  /**
   * 展开路径中的 ~ 符号（前端预处理，可选）
   *
   * 注意：后端也会自动展开 ~，这个方法用于前端需要知道展开后路径的场景
   *
   * @param path 可能包含 ~ 的路径
   * @param homeDir 用户主目录
   * @returns 展开后的路径
   */
  static expandTilde(path: string, homeDir: string): string {
    if (path === '~') {
      return homeDir;
    }
    if (path.startsWith('~/')) {
      return path.replace('~', homeDir);
    }
    return path;
  }

  /**
   * 检查命令结果是否成功
   *
   * @param result 命令执行结果
   * @returns 是否成功
   */
  static isSuccess(result: CommandResult): boolean {
    return result.success && result.exit_code === 0;
  }

  /**
   * 获取命令的完整输出（stdout + stderr）
   *
   * @param result 命令执行结果
   * @returns 完整输出
   */
  static getFullOutput(result: CommandResult): string {
    return result.stdout + result.stderr;
  }
}

/**
 * 命令执行错误类型
 */
export enum CommandErrorType {
  /** 命令不存在 */
  CommandNotFound = 'command_not_found',
  /** 工作目录不存在 */
  WorkingDirNotFound = 'working_dir_not_found',
  /** 命令执行超时 */
  Timeout = 'timeout',
  /** 危险命令被拦截 */
  DangerousCommand = 'dangerous_command',
  /** 提权命令被拒绝 */
  PrivilegedDenied = 'privileged_denied',
  /** 其他错误 */
  Unknown = 'unknown'
}

/**
 * 命令执行错误类
 */
export class CommandExecutionError extends Error {
  public readonly type: CommandErrorType;
  public readonly originalError: string;

  constructor(message: string, originalError?: string) {
    super(message);
    this.name = 'CommandExecutionError';
    this.originalError = originalError || message;
    this.type = this.detectErrorType(message);
  }

  private detectErrorType(message: string): CommandErrorType {
    if (message.includes('command not found') || message.includes('找不到命令')) {
      return CommandErrorType.CommandNotFound;
    }
    if (message.includes('工作目录不存在') || message.includes('does not exist')) {
      return CommandErrorType.WorkingDirNotFound;
    }
    if (message.includes('超时') || message.includes('timeout')) {
      return CommandErrorType.Timeout;
    }
    if (message.includes('危险命令') || message.includes('dangerous command')) {
      return CommandErrorType.DangerousCommand;
    }
    if (message.includes('提权命令') || message.includes('privileged')) {
      return CommandErrorType.PrivilegedDenied;
    }
    return CommandErrorType.Unknown;
  }
}

/**
 * 命令执行辅助函数
 */
export const commandHelpers = {
  /**
   * 安全地执行命令并处理错误
   *
   * @param cmd 要执行的命令
   * @param workingDir 工作目录
   * @param config 配置（可选）
   * @returns 命令执行结果或 null（如果失败）
   */
  async executeSafely(
    cmd: string,
    workingDir: string,
    config?: ExecutorConfig | null
  ): Promise<CommandResult | null> {
    try {
      return await CommandExecutor.executeSafe(cmd, workingDir, config);
    } catch (error) {
      console.error('Command execution failed:', error);
      return null;
    }
  },

  /**
   * 执行命令并仅返回标准输出
   *
   * @param cmd 要执行的命令
   * @param workingDir 工作目录
   * @returns 标准输出或空字符串
   */
  async getStdout(cmd: string, workingDir: string): Promise<string> {
    const result = await this.executeSafely(cmd, workingDir);
    return result?.stdout || '';
  },

  /**
   * 检查命令是否可执行
   *
   * @param commandName 命令名称
   * @param workingDir 工作目录
   * @returns 命令是否存在
   */
  async commandExists(commandName: string, workingDir: string): Promise<boolean> {
    const checkCmd = process.platform === 'win32'
      ? `where ${commandName}`
      : `which ${commandName}`;

    const result = await this.executeSafely(checkCmd, workingDir);
    return result?.success || false;
  },

  /**
   * 在多个目录中执行相同命令
   *
   * @param cmd 要执行的命令
   * @param workingDirs 工作目录列表
   * @param config 配置（可选）
   * @returns 所有结果的数组
   */
  async executeInMultipleDirs(
    cmd: string,
    workingDirs: string[],
    config?: ExecutorConfig | null
  ): Promise<CommandResult[]> {
    const promises = workingDirs.map(dir =>
      CommandExecutor.executeSafe(cmd, dir, config)
    );

    return Promise.all(promises);
  },

  /**
   * 顺序执行多个命令
   *
   * @param commands 命令列表
   * @param workingDir 工作目录
   * @param config 配置（可选）
   * @param stopOnError 遇到错误是否停止（默认 true）
   * @returns 所有结果的数组
   */
  async executeSequentially(
    commands: string[],
    workingDir: string,
    config?: ExecutorConfig | null,
    stopOnError: boolean = true
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      try {
        const result = await CommandExecutor.executeSafe(cmd, workingDir, config);
        results.push(result);

        if (stopOnError && !result.success) {
          break;
        }
      } catch (error) {
        if (stopOnError) {
          throw error;
        }
      }
    }

    return results;
  }
};

/**
 * React Hook for command execution
 */
export function useCommandExecutor() {
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<CommandResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const execute = async (
    cmd: string,
    workingDir: string,
    config?: ExecutorConfig | null
  ): Promise<CommandResult | null> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await CommandExecutor.executeSafe(cmd, workingDir, config);
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      return null;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    execute,
    isExecuting,
    lastResult,
    error
  };
}

// 如果不使用 React，忽略 React import
declare const React: any;

/**
 * 命令执行器前端使用示例
 *
 * 演示如何在 React/TypeScript 前端中使用命令执行接口
 */

import React, { useState } from 'react';
import { CommandExecutor, CommandResult, ExecutorConfig, commandHelpers } from './types/executor';

/**
 * 示例 1: 基本命令执行组件
 */
export function BasicCommandExample() {
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await CommandExecutor.executeSafe(
        'ls -la',
        '~/projects',
        null
      );

      setResult(result);
      console.log('命令执行成功:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('命令执行失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="command-executor">
      <h2>基本命令执行</h2>

      <button onClick={handleExecute} disabled={loading}>
        {loading ? '执行中...' : '执行 ls -la'}
      </button>

      {error && (
        <div className="error">
          <strong>错误:</strong> {error}
        </div>
      )}

      {result && (
        <div className="result">
          <h3>执行结果</h3>
          <p>
            <strong>状态:</strong>{' '}
            {result.success ? '✅ 成功' : '❌ 失败'}
          </p>
          <p>
            <strong>退出码:</strong> {result.exit_code}
          </p>
          <p>
            <strong>耗时:</strong> {result.duration_ms}ms
          </p>
          <p>
            <strong>工作目录:</strong> {result.working_dir}
          </p>

          {result.stdout && (
            <div>
              <strong>标准输出:</strong>
              <pre>{result.stdout}</pre>
            </div>
          )}

          {result.stderr && (
            <div>
              <strong>标准错误:</strong>
              <pre>{result.stderr}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 示例 2: 使用自定义配置
 */
export function CustomConfigExample() {
  const executeWithTimeout = async () => {
    const config: ExecutorConfig = {
      timeout_secs: 60,           // 60秒超时
      enable_safety_check: true,  // 启用安全检查
      allow_privileged: false     // 不允许 sudo
    };

    try {
      const result = await CommandExecutor.executeSafe(
        'npm install',
        '~/my-project',
        config
      );

      if (result.success) {
        console.log('安装成功!');
      } else {
        console.error('安装失败:', result.stderr);
      }
    } catch (err) {
      console.error('执行错误:', err);
    }
  };

  return (
    <button onClick={executeWithTimeout}>
      执行 npm install (60秒超时)
    </button>
  );
}

/**
 * 示例 3: 交互式命令执行器
 */
export function InteractiveCommandExecutor() {
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('~');
  const [timeout, setTimeout] = useState(300);
  const [enableSafety, setEnableSafety] = useState(true);
  const [allowPrivileged, setAllowPrivileged] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const config: ExecutorConfig = {
      timeout_secs: timeout,
      enable_safety_check: enableSafety,
      allow_privileged: allowPrivileged
    };

    try {
      const result = await CommandExecutor.executeSafe(
        command,
        workingDir,
        config
      );
      setResult(result);
    } catch (err) {
      console.error('执行失败:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interactive-executor">
      <h2>交互式命令执行器</h2>

      <form onSubmit={handleExecute}>
        <div>
          <label>命令:</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="例如: ls -la"
            required
          />
        </div>

        <div>
          <label>工作目录:</label>
          <input
            type="text"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            placeholder="例如: ~/projects"
            required
          />
        </div>

        <div>
          <label>超时时间 (秒):</label>
          <input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(Number(e.target.value))}
            min="1"
            max="3600"
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={enableSafety}
              onChange={(e) => setEnableSafety(e.target.checked)}
            />
            启用安全检查
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={allowPrivileged}
              onChange={(e) => setAllowPrivileged(e.target.checked)}
            />
            允许提权命令 (sudo/su)
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '执行中...' : '执行命令'}
        </button>
      </form>

      {result && (
        <div className="result">
          <h3>执行结果</h3>
          <div className={result.success ? 'success' : 'error'}>
            状态: {result.success ? '成功' : '失败'} (退出码: {result.exit_code})
          </div>
          <div>耗时: {result.duration_ms}ms</div>
          {result.stdout && <pre>标准输出:\n{result.stdout}</pre>}
          {result.stderr && <pre>标准错误:\n{result.stderr}</pre>}
        </div>
      )}
    </div>
  );
}

/**
 * 示例 4: 使用 React Hook
 */
export function HookExample() {
  const { execute, isExecuting, lastResult, error } = useCommandExecutor();

  const handleGitStatus = async () => {
    await execute('git status', '~/my-project');
  };

  return (
    <div>
      <button onClick={handleGitStatus} disabled={isExecuting}>
        {isExecuting ? '执行中...' : '检查 Git 状态'}
      </button>

      {error && <div className="error">{error}</div>}

      {lastResult && (
        <pre>{lastResult.stdout}</pre>
      )}
    </div>
  );
}

/**
 * 示例 5: 批量执行命令
 */
export function BatchCommandExample() {
  const [results, setResults] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleBatchExecute = async () => {
    setLoading(true);

    const commands = [
      'git status',
      'npm run test',
      'npm run build'
    ];

    try {
      const results = await commandHelpers.executeSequentially(
        commands,
        '~/my-project',
        null,
        false  // 即使出错也继续执行
      );

      setResults(results);
    } catch (err) {
      console.error('批量执行失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>批量命令执行</h2>

      <button onClick={handleBatchExecute} disabled={loading}>
        {loading ? '执行中...' : '执行构建流程'}
      </button>

      {results.map((result, index) => (
        <div key={index} className="batch-result">
          <h4>命令 {index + 1}</h4>
          <p>状态: {result.success ? '✅' : '❌'}</p>
          <p>耗时: {result.duration_ms}ms</p>
          {result.stdout && <pre>{result.stdout.substring(0, 200)}...</pre>}
        </div>
      ))}
    </div>
  );
}

/**
 * 示例 6: 命令存在性检查
 */
export function CommandCheckExample() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const checkCommands = async () => {
    const commandsToCheck = ['git', 'node', 'npm', 'cargo', 'python'];
    const results: Record<string, boolean> = {};

    for (const cmd of commandsToCheck) {
      results[cmd] = await commandHelpers.commandExists(cmd, '~');
    }

    setChecks(results);
  };

  React.useEffect(() => {
    checkCommands();
  }, []);

  return (
    <div>
      <h2>命令可用性检查</h2>

      <ul>
        {Object.entries(checks).map(([cmd, exists]) => (
          <li key={cmd}>
            {cmd}: {exists ? '✅ 已安装' : '❌ 未安装'}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 示例 7: 实时日志查看
 */
export function LogViewerExample() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const startLogStream = async () => {
    setIsRunning(true);

    const config: ExecutorConfig = {
      timeout_secs: 3600,  // 1小时超时
      enable_safety_check: true,
      allow_privileged: false
    };

    try {
      const result = await CommandExecutor.executeSafe(
        'tail -f /var/log/system.log',
        '/',
        config
      );

      // 处理输出
      const lines = result.stdout.split('\n');
      setLogs(lines);
    } catch (err) {
      console.error('日志流错误:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <h2>实时日志查看</h2>

      <button onClick={startLogStream} disabled={isRunning}>
        {isRunning ? '运行中...' : '开始查看日志'}
      </button>

      <div className="log-container">
        {logs.map((log, index) => (
          <div key={index} className="log-line">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 示例 8: 项目初始化工作流
 */
export function ProjectInitWorkflow() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const initializeProject = async (projectPath: string, projectName: string) => {
    const steps = [
      { cmd: `mkdir -p ${projectName}`, desc: '创建项目目录' },
      { cmd: `cd ${projectName} && git init`, desc: '初始化 Git' },
      { cmd: `cd ${projectName} && npm init -y`, desc: '初始化 npm' },
      { cmd: `cd ${projectName} && npm install react react-dom`, desc: '安装依赖' },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setStatus(step.desc);
      setProgress(((i + 1) / steps.length) * 100);

      try {
        const result = await CommandExecutor.executeSafe(
          step.cmd,
          projectPath,
          null
        );

        if (!result.success) {
          throw new Error(`步骤失败: ${step.desc}`);
        }
      } catch (err) {
        setStatus(`❌ 失败: ${step.desc}`);
        return;
      }
    }

    setStatus('✅ 项目初始化完成!');
  };

  return (
    <div>
      <h2>项目初始化工作流</h2>

      <button onClick={() => initializeProject('~', 'my-new-project')}>
        创建新项目
      </button>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <p>{status}</p>
    </div>
  );
}

// 简化的 useCommandExecutor hook 定义（如果 executor.ts 中没有）
function useCommandExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

/**
 * 示例 9: 错误处理
 */
export function ErrorHandlingExample() {
  const handleSafeExecution = async () => {
    try {
      // 尝试执行危险命令（会被拦截）
      await CommandExecutor.executeSafe(
        'rm -rf /',
        '/tmp',
        null
      );
    } catch (err) {
      // 错误: "安全检查失败: 检测到危险命令模式: rm -rf /"
      console.error('命令被安全系统拦截:', err);
      alert('危险命令已被阻止!');
    }

    try {
      // 尝试执行不存在的命令
      await CommandExecutor.executeSafe(
        'nonexistentcommand',
        '~',
        null
      );
    } catch (err) {
      console.error('命令不存在:', err);
    }

    try {
      // 尝试在不存在的目录执行命令
      await CommandExecutor.executeSafe(
        'ls',
        '/nonexistent/path',
        null
      );
    } catch (err) {
      // 错误: "工作目录不存在: /nonexistent/path"
      console.error('工作目录错误:', err);
    }
  };

  return (
    <button onClick={handleSafeExecution}>
      测试错误处理
    </button>
  );
}

/**
 * 示例 10: 跨平台命令
 */
export function CrossPlatformExample() {
  const listFiles = async (directory: string) => {
    // 根据平台选择不同的命令
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const command = isWindows ? 'dir /B' : 'ls -1';

    const result = await CommandExecutor.executeSafe(
      command,
      directory,
      null
    );

    if (result.success) {
      const files = result.stdout.split('\n').filter(f => f.trim());
      console.log('文件列表:', files);
    }
  };

  return (
    <button onClick={() => listFiles('~')}>
      列出主目录文件（跨平台）
    </button>
  );
}

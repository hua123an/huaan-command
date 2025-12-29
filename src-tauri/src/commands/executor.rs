use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{Duration, Instant};
use tokio::process::Command;
use tokio::time::timeout;
use tracing::{error, info, warn};

/// 命令执行结果
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CommandResult {
    /// 标准输出
    pub stdout: String,
    /// 标准错误输出
    pub stderr: String,
    /// 退出代码
    pub exit_code: i32,
    /// 是否成功执行
    pub success: bool,
    /// 执行时长（毫秒）
    pub duration_ms: u64,
    /// 工作目录
    pub working_dir: String,
}

/// 危险命令模式列表
const DANGEROUS_PATTERNS: &[&str] = &[
    "rm -rf /",
    "rm -rf /*",
    "rm -rf ~",
    "rm -rf ~/*",
    "mkfs",
    "dd if=",
    "> /dev/sda",
    "> /dev/hda",
    ":(){ :|:& };:", // Fork bomb
    "chmod -R 777 /",
    "chown -R",
];

/// 需要提权的命令（高风险）
const PRIVILEGED_COMMANDS: &[&str] = &["sudo", "su", "doas"];

/// 命令执行配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    /// 命令执行超时时间（秒）
    pub timeout_secs: u64,
    /// 是否启用危险命令检测
    pub enable_safety_check: bool,
    /// 是否允许提权命令
    pub allow_privileged: bool,
}

impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            timeout_secs: 300, // 5分钟默认超时
            enable_safety_check: true,
            allow_privileged: false,
        }
    }
}

/// 检查命令是否包含危险模式
fn check_dangerous_command(cmd: &str) -> Option<String> {
    let cmd_lower = cmd.to_lowercase();

    for pattern in DANGEROUS_PATTERNS {
        if cmd_lower.contains(pattern) {
            return Some(format!("检测到危险命令模式: {}", pattern));
        }
    }

    None
}

/// 检查命令是否需要提权
fn check_privileged_command(cmd: &str) -> bool {
    let cmd_lower = cmd.to_lowercase();

    for priv_cmd in PRIVILEGED_COMMANDS {
        if cmd_lower.trim_start().starts_with(priv_cmd) {
            return true;
        }
    }

    false
}

/// 展开路径中的 ~ 符号为用户主目录
fn expand_tilde(path: &str) -> Result<String, String> {
    if path == "~" || path.starts_with("~/") {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map_err(|e| format!("无法获取用户主目录: {}", e))?;

        if path == "~" {
            Ok(home)
        } else {
            Ok(path.replacen("~", &home, 1))
        }
    } else {
        Ok(path.to_string())
    }
}

/// 执行 shell 命令（安全增强版）
///
/// # 参数
/// * `cmd` - 要执行的命令
/// * `working_dir` - 工作目录
/// * `config` - 执行配置（可选）
///
/// # 返回
/// * `Ok(CommandResult)` - 命令执行结果
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn execute_command_safe(
    cmd: String,
    working_dir: String,
    config: Option<ExecutorConfig>,
) -> Result<CommandResult, String> {
    let config = config.unwrap_or_default();
    let start_time = Instant::now();

    println!("🔍 [execute_command_safe] 开始执行");
    println!("🔍 [execute_command_safe] 接收到的命令: {}", cmd);
    println!(
        "🔍 [execute_command_safe] 接收到的 working_dir 参数: {}",
        working_dir
    );
    info!("执行命令: {} (工作目录: {})", cmd, working_dir);

    // 安全检查
    if config.enable_safety_check {
        // 检查危险命令
        if let Some(danger_msg) = check_dangerous_command(&cmd) {
            error!("命令被拒绝: {}", danger_msg);
            return Err(format!("安全检查失败: {}", danger_msg));
        }

        // 检查提权命令
        if !config.allow_privileged && check_privileged_command(&cmd) {
            error!("命令被拒绝: 不允许使用提权命令");
            return Err("安全检查失败: 不允许使用 sudo/su 等提权命令".to_string());
        }
    }

    // 展开并验证工作目录
    let expanded_dir = expand_tilde(&working_dir)?;
    let working_path = Path::new(&expanded_dir);

    println!(
        "🔍 [execute_command_safe] 展开后的工作目录: {}",
        expanded_dir
    );

    if !working_path.exists() {
        error!("工作目录不存在: {}", expanded_dir);
        println!("❌ [execute_command_safe] 工作目录不存在: {}", expanded_dir);
        return Err(format!("工作目录不存在: {}", expanded_dir));
    }

    if !working_path.is_dir() {
        error!("工作路径不是目录: {}", expanded_dir);
        println!(
            "❌ [execute_command_safe] 工作路径不是目录: {}",
            expanded_dir
        );
        return Err(format!("工作路径不是目录: {}", expanded_dir));
    }

    println!(
        "✅ [execute_command_safe] 工作目录验证通过: {}",
        expanded_dir
    );

    // 构建命令
    let mut command = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &cmd]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &cmd]);
        c
    };

    println!(
        "🔍 [execute_command_safe] 设置 current_dir 为: {}",
        working_path.display()
    );
    command.current_dir(working_path);
    println!("✅ [execute_command_safe] current_dir 已设置");

    // 执行命令（带超时）
    let timeout_duration = Duration::from_secs(config.timeout_secs);
    let output_result = timeout(timeout_duration, command.output()).await;

    let output = match output_result {
        Ok(Ok(output)) => output,
        Ok(Err(e)) => {
            error!("命令执行失败: {}", e);
            return Err(format!("命令执行失败: {}", e));
        }
        Err(_) => {
            error!("命令执行超时 (超过 {} 秒)", config.timeout_secs);
            return Err(format!("命令执行超时 (超过 {} 秒)", config.timeout_secs));
        }
    };

    let duration = start_time.elapsed();
    let exit_code = output.status.code().unwrap_or(-1);
    let success = output.status.success();

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if success {
        info!(
            "命令执行成功 (退出码: {}, 耗时: {}ms)",
            exit_code,
            duration.as_millis()
        );
    } else {
        warn!(
            "命令执行失败 (退出码: {}, 耗时: {}ms)",
            exit_code,
            duration.as_millis()
        );
    }

    Ok(CommandResult {
        stdout,
        stderr,
        exit_code,
        success,
        duration_ms: duration.as_millis() as u64,
        working_dir: expanded_dir,
    })
}

/// 执行简单命令（兼容旧版本接口）
///
/// # 参数
/// * `command` - 要执行的命令
/// * `working_dir` - 工作目录（可选）
///
/// # 返回
/// * `Ok(String)` - 命令输出
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn execute_simple_command(
    command: String,
    working_dir: Option<String>,
) -> Result<String, String> {
    println!("🔍 [execute_simple_command] 开始执行");
    println!("🔍 [execute_simple_command] 接收到的命令: {}", command);
    println!(
        "🔍 [execute_simple_command] 接收到的 working_dir 参数: {:?}",
        working_dir
    );

    let work_dir = working_dir.unwrap_or_else(|| {
        let default_dir = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string());
        println!(
            "🔍 [execute_simple_command] 使用默认工作目录: {}",
            default_dir
        );
        default_dir
    });

    println!("🔍 [execute_simple_command] 最终工作目录: {}", work_dir);

    let result = execute_command_safe(command, work_dir, None).await?;

    if result.success {
        Ok(format!("{}{}", result.stdout, result.stderr))
    } else {
        Err(format!("命令执行失败: {}", result.stderr))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dangerous_command_detection() {
        assert!(check_dangerous_command("rm -rf /").is_some());
        assert!(check_dangerous_command("sudo rm -rf /").is_some());
        assert!(check_dangerous_command("ls -la").is_none());
        assert!(check_dangerous_command("echo 'hello'").is_none());
    }

    #[test]
    fn test_privileged_command_detection() {
        assert!(check_privileged_command("sudo apt-get update"));
        assert!(check_privileged_command("su root"));
        assert!(!check_privileged_command("ls -la"));
        assert!(!check_privileged_command("echo 'sudo'"));
    }

    #[test]
    fn test_expand_tilde() {
        // 这个测试在有 HOME 环境变量的情况下才能通过
        if std::env::var("HOME").is_ok() || std::env::var("USERPROFILE").is_ok() {
            assert!(expand_tilde("~/test").is_ok());
            assert!(expand_tilde("~").is_ok());
            assert_eq!(expand_tilde("/tmp/test").unwrap(), "/tmp/test");
        }
    }
}

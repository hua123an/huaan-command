use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct TerminalSession {
    #[allow(dead_code)]
    pub id: u64,
    pub pair: PtyPair,
    pub writer: Box<dyn Write + Send>,
}

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<u64, TerminalSession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_terminal(&self, session_id: u64, shell_type: Option<String>, app_handle: AppHandle) -> Result<()> {
        let pty_system = native_pty_system();

        // 创建 PTY pair
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // 严格按照用户设置选择 shell，不做 fallback
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            match shell_type.as_deref() {
                Some("bash") => {
                    // 优先使用 Homebrew 安装的新版 bash，它在 PTY 环境下更稳定
                    if std::path::Path::new("/opt/homebrew/bin/bash").exists() {
                        "/opt/homebrew/bin/bash".to_string()
                    } else if std::path::Path::new("/usr/local/bin/bash").exists() {
                        "/usr/local/bin/bash".to_string()
                    } else {
                        "/bin/bash".to_string()
                    }
                },
                Some("zsh") => "/bin/zsh".to_string(),
                Some("fish") => {
                    // 优先使用 Homebrew 安装的 fish
                    if std::path::Path::new("/opt/homebrew/bin/fish").exists() {
                        "/opt/homebrew/bin/fish".to_string()
                    } else if std::path::Path::new("/usr/local/bin/fish").exists() {
                        "/usr/local/bin/fish".to_string()
                    } else {
                        "/usr/bin/fish".to_string()
                    }
                },
                _ => {
                    // 未指定时使用系统默认 shell
                    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
                }
            }
        };

        // 检查 shell 是否存在
        if !std::path::Path::new(&shell).exists() {
            eprintln!("Error: Shell not found at path: {}", shell);
            return Err(anyhow::anyhow!("Shell not found: {}", shell));
        }

        println!("Starting terminal with shell: {}", shell);

        // 创建命令（交互式 shell）
        let mut cmd = CommandBuilder::new(&shell);

        // 设置必要的环境变量
        cmd.env("TERM", "xterm-256color");  // 设置终端类型
        cmd.env("COLORTERM", "truecolor");   // 支持真彩色

        // 设置极简提示符（只显示 > ）
        cmd.env("PS1", "> ");  // bash/sh/zsh 提示符
        cmd.env("SIMPLE_PROMPT", "1");  // 启用简洁提示符（zsh 通过 .zshrc 检测）

        // 禁用 zsh 的各种提示和警告信息
        cmd.env("BASH_SILENCE_DEPRECATION_WARNING", "1");  // 禁用 bash 弃用警告

        // 确保 zsh 使用简洁提示符（禁用主题）
        cmd.env("ZSH_THEME", "");  // 禁用 oh-my-zsh 主题
        cmd.env("PROMPT", "> ");  // zsh 额外设置

        // 保留现有环境变量
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }
        if let Ok(user) = std::env::var("USER") {
            cmd.env("USER", user);
        }
        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", home.clone());
        }
        if let Ok(shell_env) = std::env::var("SHELL") {
            cmd.env("SHELL", shell_env);
        }
        if let Ok(lang) = std::env::var("LANG") {
            cmd.env("LANG", lang);
        } else {
            cmd.env("LANG", "en_US.UTF-8");  // 默认语言环境
        }

        // ⚠️ 重要：传递所有环境变量，确保 npm, nvm 等工具可用
        // 遍历所有当前环境变量并传递给子进程
        for (key, value) in std::env::vars() {
            // 跳过 Tauri 内部变量和特殊变量
            if !key.starts_with("TAURI_")
                && !key.starts_with("__CF")
                && key != "PATH"  // PATH 已经在上面单独处理
                && key != "HOME"  // HOME 已经在上面单独处理
                && key != "USER"  // USER 已经在上面单独处理
                && key != "SHELL" // SHELL 已经在上面单独处理
                && key != "LANG"  // LANG 已经在上面单独处理
            {
                cmd.env(&key, &value);
            }
        }

        // 获取 home 目录用于配置文件路径
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());

        // 配置为交互式 shell 并自动加载所有配置文件
        if !cfg!(target_os = "windows") {
            if shell.contains("bash") {
                // 新版 bash (Homebrew) 需要 -i 参数才能正常工作
                cmd.arg("-i");  // 交互式 shell
            } else if shell.contains("zsh") {
                // zsh: 使用 -i 交互式模式会自动加载 .zshrc
                cmd.arg("-i");  // 交互式 shell
            } else if shell.contains("fish") {
                // fish: 交互式模式会自动加载配置
                cmd.arg("-i");
            } else {
                // 其他 shell：使用交互模式
                cmd.arg("-i");
            }
        }

        // 设置工作目录
        println!("Setting working directory to: {}", home_dir);
        cmd.cwd(home_dir);

        // 启动子进程
        let _child = pair.slave.spawn_command(cmd)?;
        println!("Successfully spawned shell process for session {}", session_id);

        // 获取读写器
        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        // 存储会话
        let is_fish = shell.contains("fish");
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(session_id, TerminalSession {
                id: session_id,
                pair,
                writer,
            });
        }

        // Fish 需要一个初始化命令来显示提示符
        if is_fish {
            // 等待 fish 完全启动
            std::thread::sleep(std::time::Duration::from_millis(200));
            // 发送一个空行来触发提示符显示
            let _ = self.write_terminal(session_id, "\r".to_string());
        }

        // 启动读取任务
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        println!("Terminal session {} closed (EOF)", session_id);
                        break;
                    },
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        if let Err(e) = app_handle_clone.emit(&format!("terminal-output-{}", session_id), data) {
                            eprintln!("Failed to emit terminal output for session {}: {}", session_id, e);
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading from terminal session {}: {}", session_id, e);
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub fn write_terminal(&self, session_id: u64, data: String) -> Result<()> {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get_mut(&session_id) {
            // 尝试写入，如果失败则静默忽略（PTY 可能已关闭）
            if let Err(e) = session.writer.write_all(data.as_bytes()) {
                eprintln!("Warning: Failed to write to terminal {}: {}", session_id, e);
                // 不要抛出错误，因为 PTY 可能已经正常关闭
                return Ok(());
            }
            if let Err(e) = session.writer.flush() {
                eprintln!("Warning: Failed to flush terminal {}: {}", session_id, e);
                return Ok(());
            }
        }
        Ok(())
    }

    pub fn resize_terminal(&self, session_id: u64, cols: u16, rows: u16) -> Result<()> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(&session_id) {
            session.pair.master.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })?;
        }
        Ok(())
    }

    pub fn close_terminal(&self, session_id: u64) -> Result<()> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(&session_id);
        Ok(())
    }
}

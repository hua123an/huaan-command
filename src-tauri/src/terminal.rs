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

        // 获取 shell（优先使用指定的 shell 类型）
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            match shell_type.as_deref() {
                Some("bash") => {
                    // 检查 bash 是否存在
                    if std::path::Path::new("/bin/bash").exists() {
                        "/bin/bash".to_string()
                    } else if std::path::Path::new("/usr/bin/bash").exists() {
                        "/usr/bin/bash".to_string()
                    } else {
                        eprintln!("Warning: bash not found, falling back to sh");
                        "/bin/sh".to_string()
                    }
                }
                Some("zsh") => {
                    // 检查 zsh 是否存在
                    if std::path::Path::new("/bin/zsh").exists() {
                        "/bin/zsh".to_string()
                    } else if std::path::Path::new("/usr/bin/zsh").exists() {
                        "/usr/bin/zsh".to_string()
                    } else {
                        eprintln!("Warning: zsh not found, falling back to bash");
                        "/bin/bash".to_string()
                    }
                },
                Some("fish") => {
                    // 检查 fish 是否存在
                    if std::path::Path::new("/bin/fish").exists() {
                        "/bin/fish".to_string()
                    } else if std::path::Path::new("/usr/bin/fish").exists() {
                        "/usr/bin/fish".to_string()
                    } else {
                        eprintln!("Warning: fish not found, falling back to bash");
                        "/bin/bash".to_string()
                    }
                }
                _ => {
                    // 默认 shell 选择逻辑
                    if std::path::Path::new("/bin/bash").exists() {
                        "/bin/bash".to_string()
                    } else if std::path::Path::new("/bin/sh").exists() {
                        "/bin/sh".to_string()
                    } else {
                        eprintln!("Error: No suitable shell found");
                        return Err(anyhow::anyhow!("No suitable shell found"));
                    }
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
        cmd.env("PS1", "> ");  // bash/sh 提示符
        cmd.env("PROMPT", "> ");  // zsh 提示符

        // 禁用 zsh 的各种提示和警告信息
        cmd.env("BASH_SILENCE_DEPRECATION_WARNING", "1");  // 禁用 bash 弃用警告

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

        // 配置为交互式 shell（不使用登录模式，避免显示欢迎信息）
        if !cfg!(target_os = "windows") {
            if shell.contains("bash") {
                // bash: 只使用 -i (interactive)，不用 -l (login) 避免欢迎信息
                cmd.arg("-i");
            } else if shell.contains("zsh") {
                // zsh: 只使用 -i (interactive)，不用 -l (login) 避免欢迎信息
                cmd.arg("-i");
            } else if shell.contains("fish") {
                // fish: 只使用 --interactive，不用 --login 避免欢迎信息
                cmd.arg("--interactive");
            } else {
                // 其他 shell：仅使用交互式模式
                cmd.arg("-i");
            }
        }

        // 设置工作目录
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        println!("Setting working directory to: {}", home_dir);
        cmd.cwd(home_dir);

        // 启动子进程
        let _child = pair.slave.spawn_command(cmd)?;
        println!("Successfully spawned shell process for session {}", session_id);

        // 获取读写器
        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        // 存储会话
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(session_id, TerminalSession {
                id: session_id,
                pair,
                writer,
            });
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

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
                Some("bash") => "/bin/bash".to_string(),
                Some("zsh") => {
                    // 检查 zsh 是否存在
                    if std::path::Path::new("/bin/zsh").exists() {
                        "/bin/zsh".to_string()
                    } else {
                        "/bin/bash".to_string() // 回退到 bash
                    }
                },
                _ => "/bin/bash".to_string() // 默认使用 bash
            }
        };

        // 创建命令（交互式 shell）
        let mut cmd = CommandBuilder::new(&shell);

        // 对于 bash 和 zsh，分别配置交互式模式
        if !cfg!(target_os = "windows") {
            if shell.contains("bash") {
                // bash: 使用交互式模式，允许加载配置
                cmd.arg("-i");
            } else if shell.contains("zsh") {
                // zsh: 使用交互式模式，允许加载配置
                cmd.arg("-i");
            } else {
                // 其他 shell：仅使用交互式模式
                cmd.arg("-i");
            }
        }

        cmd.cwd(std::env::var("HOME").unwrap_or_else(|_| ".".to_string()));

        // 启动子进程
        let _child = pair.slave.spawn_command(cmd)?;
        
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
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_handle_clone.emit(&format!("terminal-output-{}", session_id), data);
                    }
                    Err(_) => break,
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

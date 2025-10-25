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

    pub fn start_terminal(&self, session_id: u64, app_handle: AppHandle) -> Result<()> {
        let pty_system = native_pty_system();
        
        // 创建 PTY pair
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // 获取 shell
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        };

        // 创建命令（交互式 shell）
        let mut cmd = CommandBuilder::new(&shell);

        // 设置为交互式登录 shell，确保加载配置文件和启用补全功能
        if !cfg!(target_os = "windows") {
            cmd.arg("-i");  // 交互式模式
            cmd.arg("-l");  // 登录 shell

            // 设置自定义初始化脚本路径
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            let init_script = format!("{}/.huaan-terminal-init", home);
            cmd.env("HUAAN_INIT_SCRIPT", init_script);
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
            session.writer.write_all(data.as_bytes())?;
            session.writer.flush()?;
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

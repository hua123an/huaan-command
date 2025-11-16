use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct TerminalSession {
    #[allow(dead_code)]
    pub id: u64,
    pub pair: PtyPair,
    pub writer: Box<dyn Write + Send>,
    pub current_dir: Arc<Mutex<PathBuf>>,
}

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<u64, TerminalSession>>>,
}

impl Clone for TerminalManager {
    fn clone(&self) -> Self {
        Self {
            sessions: Arc::clone(&self.sessions),
        }
    }
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn clone_for_reader(&self) -> Self {
        self.clone()
    }

    pub fn start_terminal(
        &self,
        session_id: u64,
        _shell_type: Option<String>, // 忽略此参数，始终使用 zsh
        app_handle: AppHandle,
    ) -> Result<()> {
        let pty_system = native_pty_system();

        // 创建 PTY pair
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // 默认使用 zsh（macOS 默认 shell）
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            "/bin/zsh".to_string()
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
        cmd.env("TERM", "xterm-256color"); // 设置终端类型
        cmd.env("COLORTERM", "truecolor"); // 支持真彩色

        // 设置极简提示符
        // 注意：不在这里设置 PROMPT_COMMAND，因为会被 .bashrc 覆盖
        // 我们将在终端启动后通过 writer 注入
        cmd.env("PS1", "> ");
        cmd.env("PROMPT", "> "); // zsh
        cmd.env("SIMPLE_PROMPT", "1"); // 启用简洁提示符（zsh 通过 .zshrc 检测）

        // 禁用 zsh 的各种提示和警告信息
        cmd.env("BASH_SILENCE_DEPRECATION_WARNING", "1"); // 禁用 bash 弃用警告

        // 确保 zsh 使用简洁提示符（禁用主题）
        cmd.env("ZSH_THEME", ""); // 禁用 oh-my-zsh 主题

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
            cmd.env("LANG", "en_US.UTF-8"); // 默认语言环境
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
                && key != "LANG"
            // LANG 已经在上面单独处理
            {
                cmd.env(&key, &value);
            }
        }

        // 获取 home 目录用于配置文件路径
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let initial_dir = PathBuf::from(&home_dir);

        // 配置为交互式 shell 并自动加载所有配置文件
        if !cfg!(target_os = "windows") {
            if shell.contains("bash") {
                // 新版 bash (Homebrew) 需要 -i 参数才能正常工作
                cmd.arg("-i"); // 交互式 shell
            } else if shell.contains("zsh") {
                // zsh: 使用 -i 交互式模式会自动加载 .zshrc
                cmd.arg("-i"); // 交互式 shell
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
        println!(
            "Successfully spawned shell process for session {}",
            session_id
        );

        // 获取读写器
        let mut reader = pair.master.try_clone_reader()?;
        let mut writer = pair.master.take_writer()?;

        // 注入 OSC 7  cwd-reporting 功能
        let osc7_command = if shell.contains("zsh") {
            // For zsh, add a function to the precmd_functions array.
            // This is executed before each prompt.
            Some("precmd_functions+=('() { printf \"\\x1b]7;file://%s%s\\x07\" \"$(hostname)\" \"$PWD\" } ')\n".to_string())
        } else if shell.contains("bash") {
            // For bash, append to the PROMPT_COMMAND variable.
            let cmd = "printf \"\\x1b]7;file://%s%s\\x07\" \"$(hostname)\" \"$PWD\"";
            Some(format!("PROMPT_COMMAND=\"{};${{PROMPT_COMMAND}}\"\n", cmd))
        } else {
            None
        };

        if let Some(command) = osc7_command {
            if let Err(e) = writer.write_all(command.as_bytes()) {
                eprintln!("Failed to write OSC7 command to PTY: {}", e);
            }
        }

        // zsh 会自动加载 ~/.zshrc，无需手动执行

        // 存储会话
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(
                session_id,
                TerminalSession {
                    id: session_id,
                    pair,
                    writer: Box::new(writer),
                    current_dir: Arc::new(Mutex::new(initial_dir)),
                },
            );
        }

        // 等待 zsh 完全启动
        std::thread::sleep(std::time::Duration::from_millis(300));

        // 清除启动时的任何残留输出
        let _ = self.write_terminal(session_id, "clear\n".to_string());
        std::thread::sleep(std::time::Duration::from_millis(100));

        // 启动读取任务
        let app_handle_clone = app_handle.clone();
        let terminal_manager_clone = Arc::new(self.clone_for_reader());
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        println!("Terminal session {} closed (EOF)", session_id);
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();

                        // 解析 OSC 7 序列来更新当前目录
                        // OSC 7 格式: \x1b]7;file://hostname/path\x07 或 \x1b]7;file://hostname/path\x1b\\
                        if data.contains("\x1b]7;") {
                            if let Some(path) = parse_osc7_sequence(&data) {
                                println!("Detected directory change via OSC 7: {}", path);
                                let _ = terminal_manager_clone
                                    .update_current_dir(session_id, PathBuf::from(&path));
                            }
                        }

                        if let Err(e) =
                            app_handle_clone.emit(&format!("terminal-output-{}", session_id), data)
                        {
                            eprintln!(
                                "Failed to emit terminal output for session {}: {}",
                                session_id, e
                            );
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

    pub fn get_current_dir(&self, session_id: u64) -> Result<String> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(&session_id) {
            let current_dir = session.current_dir.lock().unwrap();
            Ok(current_dir.to_string_lossy().to_string())
        } else {
            Err(anyhow::anyhow!("Session not found"))
        }
    }

    pub fn update_current_dir(&self, session_id: u64, new_dir: PathBuf) -> Result<()> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(&session_id) {
            let mut current_dir = session.current_dir.lock().unwrap();
            *current_dir = new_dir;
            println!(
                "Updated current_dir for session {} to: {:?}",
                session_id, *current_dir
            );
            Ok(())
        } else {
            Err(anyhow::anyhow!("Session not found"))
        }
    }
}

// 辅助函数：解析 OSC 7 序列
// OSC 7 格式: \x1b]7;file://hostname/path\x07 或 \x1b]7;file://hostname/path\x1b\\
fn parse_osc7_sequence(data: &str) -> Option<String> {
    // 查找 OSC 7 序列的开始
    if let Some(start_idx) = data.find("\x1b]7;") {
        let after_osc = &data[start_idx + 4..]; // 跳过 "\x1b]7;"

        // 查找终止符 (BEL \x07 或 ST \x1b\\)
        let end_idx = after_osc.find('\x07').or_else(|| after_osc.find("\x1b\\"));

        if let Some(end) = end_idx {
            let url = &after_osc[..end];
            println!("🔍 DEBUG: OSC 7 URL = '{}'", url);

            // 解析 file:// URL
            // 格式: file://hostname/path
            if let Some(file_start) = url.find("file://") {
                let path_part = &url[file_start + 7..]; // 跳过 "file://"
                println!("🔍 DEBUG: path_part after 'file://' = '{}'", path_part);

                // 跳过 hostname，找到第一个 /
                if let Some(slash_idx) = path_part.find('/') {
                    let path = &path_part[slash_idx..];
                    println!("🔍 DEBUG: extracted path = '{}'", path);

                    // URL 解码路径（处理 %20 等）
                    if let Ok(decoded) = urlencoding::decode(path) {
                        println!("🔍 DEBUG: decoded path = '{}'", decoded);
                        return Some(decoded.to_string());
                    } else {
                        return Some(path.to_string());
                    }
                }
            }
        }
    }
    None
}

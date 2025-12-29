mod claude_config;
mod commands;
mod task;
mod terminal;

use claude_config::{ClaudeConfigManager, ClaudeProvider};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use task::{Task, TaskManager};
use tauri::{AppHandle, State};
use terminal::TerminalManager;
use tokio::sync::Mutex;
use tracing::info;

struct AppState {
    terminal_manager: Arc<TerminalManager>,
    task_manager: Arc<Mutex<TaskManager>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct FileInfo {
    path: String,
    name: String,
    is_dir: bool,
    size: Option<u64>,
}

#[derive(Serialize, Deserialize)]
struct ProjectStructure {
    root: String,
    files: Vec<FileInfo>,
}

#[tauri::command]
fn start_terminal(
    session_id: u64,
    shell_type: Option<String>,
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    state
        .terminal_manager
        .start_terminal(session_id, shell_type, app_handle)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_terminal(session_id: u64, data: String, state: State<AppState>) -> Result<(), String> {
    state
        .terminal_manager
        .write_terminal(session_id, data)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_terminal(
    session_id: u64,
    cols: u16,
    rows: u16,
    state: State<AppState>,
) -> Result<(), String> {
    state
        .terminal_manager
        .resize_terminal(session_id, cols, rows)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn close_terminal(session_id: u64, state: State<AppState>) -> Result<(), String> {
    state
        .terminal_manager
        .close_terminal(session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_current_dir(session_id: u64, state: State<AppState>) -> Result<String, String> {
    state
        .terminal_manager
        .get_current_dir(session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_ssh_terminal(
    session_id: u64,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    state
        .terminal_manager
        .start_ssh_terminal(session_id, host, port, username, password, app_handle)
        .map_err(|e| e.to_string())
}

// 执行命令并返回结果（用于 AI 分析）
#[tauri::command]
async fn execute_command(
    command: String,
    #[allow(non_snake_case)] workingDir: Option<String>,
) -> Result<String, String> {
    use tokio::process::Command;

    println!("🔍 [execute_command] 开始执行");
    println!("🔍 [execute_command] 接收到的命令: {}", command);
    println!(
        "🔍 [execute_command] 接收到的 workingDir 参数: {:?}",
        workingDir
    );

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &command]);
        c
    };

    // 设置工作目录 (处理 ~ 展开)
    if let Some(dir) = workingDir {
        println!("🔍 [execute_command] 原始工作目录: {}", dir);

        let expanded_dir = if dir == "~" || dir.starts_with("~/") {
            // 展开 ~ 为用户主目录
            let home = std::env::var("HOME")
                .or_else(|_| std::env::var("USERPROFILE"))
                .map_err(|e| {
                    println!("❌ [execute_command] 无法获取 HOME 目录: {}", e);
                    e.to_string()
                })?;

            let result = if dir == "~" {
                home
            } else {
                dir.replacen("~", &home, 1)
            };

            println!("🔍 [execute_command] ~ 展开后的目录: {}", result);
            result
        } else {
            println!("🔍 [execute_command] 使用原始目录（无需展开）: {}", dir);
            dir
        };

        println!("🔍 [execute_command] 最终工作目录: {}", expanded_dir);
        println!("🔍 [execute_command] 设置 current_dir 为: {}", expanded_dir);

        // 验证目录是否存在
        if !std::path::Path::new(&expanded_dir).exists() {
            println!("❌ [execute_command] 工作目录不存在: {}", expanded_dir);
            return Err(format!("工作目录不存在: {}", expanded_dir));
        }

        if !std::path::Path::new(&expanded_dir).is_dir() {
            println!("❌ [execute_command] 路径不是目录: {}", expanded_dir);
            return Err(format!("路径不是目录: {}", expanded_dir));
        }

        println!("✅ [execute_command] 工作目录验证通过，准备切换");
        cmd.current_dir(&expanded_dir);
        println!("✅ [execute_command] current_dir 已设置");
    } else {
        println!("⚠️ [execute_command] workingDir 参数为 None，使用默认工作目录");
        let current_dir = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "未知".to_string());
        println!("🔍 [execute_command] 默认工作目录: {}", current_dir);
    }

    // 执行命令
    println!("🔍 [execute_command] 开始执行命令...");
    let output = cmd.output().await.map_err(|e| {
        println!("❌ [execute_command] 命令执行出错: {}", e);
        e.to_string()
    })?;

    println!("🔍 [execute_command] 命令执行完成");
    println!("🔍 [execute_command] 退出码: {:?}", output.status.code());

    // 返回输出
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        println!("✅ [execute_command] 命令执行成功");
        println!("🔍 [execute_command] stdout 长度: {} 字节", stdout.len());
        println!("🔍 [execute_command] stderr 长度: {} 字节", stderr.len());
        Ok(format!("{}{}", stdout, stderr))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        println!("❌ [execute_command] 命令执行失败: {}", stderr);
        Err(format!("命令执行失败: {}", stderr))
    }
}

// 获取当前工作目录
#[tauri::command]
fn get_working_directory() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

// 获取用户主目录
#[tauri::command]
fn get_home_directory() -> Result<String, String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_task(
    id: String,
    name: String,
    command: String,
    env_vars: Option<HashMap<String, String>>,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    state
        .task_manager
        .lock()
        .await
        .create_task(id, name, command, env_vars)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_task(
    task_id: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .task_manager
        .lock()
        .await
        .run_task(task_id, app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_all_tasks(app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state
        .task_manager
        .lock()
        .await
        .run_all_tasks(app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_task(task_id: String, state: State<'_, AppState>) -> Result<Option<Task>, String> {
    Ok(state.task_manager.lock().await.get_task(&task_id).await)
}

#[tauri::command]
async fn get_all_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    Ok(state.task_manager.lock().await.get_all_tasks().await)
}

#[tauri::command]
async fn cancel_task(task_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .task_manager
        .lock()
        .await
        .cancel_task(&task_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_tasks(state: State<'_, AppState>) -> Result<(), String> {
    state
        .task_manager
        .lock()
        .await
        .clear_tasks()
        .await
        .map_err(|e| e.to_string())
}

// 文件操作命令

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("无法获取 HOME 目录: {}", e))
}

// Claude 配置管理命令

#[tauri::command]
fn load_claude_providers() -> Result<Vec<ClaudeProvider>, String> {
    ClaudeConfigManager::load_providers()
}

#[tauri::command]
fn get_current_claude_provider() -> Result<Option<ClaudeProvider>, String> {
    ClaudeConfigManager::get_current_provider()
}

#[tauri::command]
fn add_claude_provider(
    name: String,
    base_url: String,
    api_key: String,
    model: String,
) -> Result<(), String> {
    let provider = ClaudeProvider {
        name,
        base_url,
        api_key,
        model,
        created_at: chrono::Local::now().to_rfc3339(),
    };
    ClaudeConfigManager::add_provider(provider)
}

#[tauri::command]
fn switch_claude_provider(provider_name: String) -> Result<(), String> {
    ClaudeConfigManager::switch_provider(provider_name)
}

#[tauri::command]
fn remove_claude_provider(provider_name: String) -> Result<(), String> {
    ClaudeConfigManager::remove_provider(provider_name)
}

#[tauri::command]
fn validate_claude_api_key(api_key: String) -> Result<bool, String> {
    ClaudeConfigManager::validate_api_key(&api_key)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("无法读取文件 {}: {}", path, e))
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("无法写入文件 {}: {}", path, e))
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("无法读取目录 {}: {}", path, e))?;

    let mut files = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let metadata = entry.metadata().ok();
        let file_info = FileInfo {
            path: path.to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: path.is_dir(),
            size: metadata.and_then(|m| if m.is_file() { Some(m.len()) } else { None }),
        };
        files.push(file_info);
    }

    Ok(files)
}

#[tauri::command]
fn get_project_structure(root_path: String, max_depth: usize) -> Result<ProjectStructure, String> {
    fn scan_dir(
        path: &PathBuf,
        current_depth: usize,
        max_depth: usize,
        files: &mut Vec<FileInfo>,
    ) -> Result<(), String> {
        if current_depth > max_depth {
            return Ok(());
        }

        let entries = fs::read_dir(path).map_err(|e| format!("无法读取目录: {}", e))?;

        for entry in entries.flatten() {
            let entry_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            // 跳过隐藏文件和 node_modules, target 等目录
            if file_name.starts_with('.')
                || file_name == "node_modules"
                || file_name == "target"
                || file_name == "dist"
            {
                continue;
            }

            let metadata = entry.metadata().ok();
            let is_dir = entry_path.is_dir();

            let file_info = FileInfo {
                path: entry_path.to_string_lossy().to_string(),
                name: file_name,
                is_dir,
                size: metadata.and_then(|m| if m.is_file() { Some(m.len()) } else { None }),
            };

            files.push(file_info);

            if is_dir {
                scan_dir(&entry_path, current_depth + 1, max_depth, files)?;
            }
        }

        Ok(())
    }

    let mut files = Vec::new();
    let root = PathBuf::from(&root_path);
    scan_dir(&root, 0, max_depth, &mut files)?;

    Ok(ProjectStructure {
        root: root_path,
        files,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志系统
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("🚀 Starting Huaan Command application");

    let terminal_manager = Arc::new(TerminalManager::new());
    let task_manager = Arc::new(Mutex::new(TaskManager::new()));

    info!("✓ Initialized managers");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            terminal_manager,
            task_manager,
        })
        .invoke_handler(tauri::generate_handler![
            start_terminal,
            write_terminal,
            resize_terminal,
            close_terminal,
            get_current_dir,
            start_ssh_terminal,
            execute_command,
            get_working_directory,
            get_home_directory,
            create_task,
            run_task,
            run_all_tasks,
            get_task,
            get_all_tasks,
            cancel_task,
            clear_tasks,
            get_home_dir,
            read_file_content,
            write_file_content,
            list_directory,
            get_project_structure,
            commands::executor::execute_command_safe,
            commands::executor::execute_simple_command,
            // 新的安全文件系统命令
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::list_files,
            commands::filesystem::create_directory,
            commands::filesystem::delete_file,
            commands::filesystem::delete_directory,
            commands::filesystem::copy_file,
            commands::filesystem::move_file,
            commands::filesystem::path_exists,
            commands::filesystem::get_file_metadata,
            // Claude 配置管理命令
            load_claude_providers,
            get_current_claude_provider,
            add_claude_provider,
            switch_claude_provider,
            remove_claude_provider,
            validate_claude_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

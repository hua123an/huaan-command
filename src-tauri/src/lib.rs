mod terminal;
mod task;

use std::collections::HashMap;
use std::sync::Arc;
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, State};
use terminal::TerminalManager;
use task::{Task, TaskManager};
use tokio::sync::Mutex;
use tracing::info;
use serde::{Serialize, Deserialize};

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
fn start_terminal(session_id: u64, shell_type: Option<String>, app_handle: AppHandle, state: State<AppState>) -> Result<(), String> {
    state.terminal_manager
        .start_terminal(session_id, shell_type, app_handle)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_terminal(session_id: u64, data: String, state: State<AppState>) -> Result<(), String> {
    state.terminal_manager
        .write_terminal(session_id, data)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_terminal(session_id: u64, cols: u16, rows: u16, state: State<AppState>) -> Result<(), String> {
    state.terminal_manager
        .resize_terminal(session_id, cols, rows)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn close_terminal(session_id: u64, state: State<AppState>) -> Result<(), String> {
    state.terminal_manager
        .close_terminal(session_id)
        .map_err(|e| e.to_string())
}

// 执行命令并返回结果（用于 AI 分析）
#[tauri::command]
async fn execute_command(command: String, working_dir: Option<String>) -> Result<String, String> {
    use tokio::process::Command;

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(&["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(&["-c", &command]);
        c
    };

    // 设置工作目录 (处理 ~ 展开)
    if let Some(dir) = working_dir {
        let expanded_dir = if dir == "~" || dir.starts_with("~/") {
            // 展开 ~ 为用户主目录
            let home = std::env::var("HOME")
                .or_else(|_| std::env::var("USERPROFILE"))
                .map_err(|e| e.to_string())?;

            if dir == "~" {
                home
            } else {
                dir.replacen("~", &home, 1)
            }
        } else {
            dir
        };

        cmd.current_dir(&expanded_dir);
    }

    // 执行命令
    let output = cmd.output().await.map_err(|e| e.to_string())?;

    // 返回输出
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(format!("{}{}", stdout, stderr))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
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

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("无法读取文件 {}: {}", path, e))
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("无法写入文件 {}: {}", path, e))
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("无法读取目录 {}: {}", path, e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
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
    }
    
    Ok(files)
}

#[tauri::command]
fn get_project_structure(root_path: String, max_depth: usize) -> Result<ProjectStructure, String> {
    fn scan_dir(path: &PathBuf, current_depth: usize, max_depth: usize, files: &mut Vec<FileInfo>) -> Result<(), String> {
        if current_depth > max_depth {
            return Ok(());
        }
        
        let entries = fs::read_dir(path)
            .map_err(|e| format!("无法读取目录: {}", e))?;
        
        for entry in entries {
            if let Ok(entry) = entry {
                let entry_path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();
                
                // 跳过隐藏文件和 node_modules, target 等目录
                if file_name.starts_with('.') || 
                   file_name == "node_modules" || 
                   file_name == "target" ||
                   file_name == "dist" {
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
        .manage(AppState {
            terminal_manager,
            task_manager,
        })
        .invoke_handler(tauri::generate_handler![
            start_terminal,
            write_terminal,
            resize_terminal,
            close_terminal,
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
            get_project_structure
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

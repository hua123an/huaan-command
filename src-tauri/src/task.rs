use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinHandle;
use tokio::time::{interval, Duration};
use tracing::{info, error, debug, warn};

const MAX_OUTPUT_LINES: usize = 10_000;
const MAX_CONCURRENT_TASKS: usize = 10;
const OUTPUT_BUFFER_MS: u64 = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub command: String,
    pub status: TaskStatus,
    pub output: String,
    pub error: String,
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
    #[serde(default)]
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    Running,
    Success,
    Failed,
    Cancelled,
}

struct TaskOutput {
    lines: VecDeque<String>,
}

impl TaskOutput {
    fn new() -> Self {
        Self {
            lines: VecDeque::with_capacity(MAX_OUTPUT_LINES),
        }
    }

    fn append(&mut self, line: String) {
        if self.lines.len() >= MAX_OUTPUT_LINES {
            self.lines.pop_front();
        }
        self.lines.push_back(line);
    }

    fn to_string(&self) -> String {
        self.lines.iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    }
}

pub struct TaskManager {
    tasks: Arc<Mutex<HashMap<String, Task>>>,
    handles: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
    semaphore: Arc<Semaphore>,
    outputs: Arc<Mutex<HashMap<String, TaskOutput>>>,
    errors: Arc<Mutex<HashMap<String, TaskOutput>>>,
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            handles: Arc::new(Mutex::new(HashMap::new())),
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_TASKS)),
            outputs: Arc::new(Mutex::new(HashMap::new())),
            errors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_task(&self, id: String, name: String, command: String, env_vars: Option<HashMap<String, String>>) -> Result<Task> {
        info!("Creating task: {} ({})", name, id);
        
        let task = Task {
            id: id.clone(),
            name,
            command,
            status: TaskStatus::Pending,
            output: String::new(),
            error: String::new(),
            start_time: None,
            end_time: None,
            env_vars: env_vars.unwrap_or_default(),
        };

        let mut tasks = self.tasks.lock().await;
        tasks.insert(id, task.clone());
        Ok(task)
    }

    pub async fn run_task(&self, task_id: String, app_handle: AppHandle) -> Result<()> {
        info!("Starting task: {}", task_id);
        
        let task = {
            let mut tasks = self.tasks.lock().await;
            let task = tasks.get_mut(&task_id).ok_or_else(|| {
                error!("Task not found: {}", task_id);
                anyhow::anyhow!("Task not found")
            })?;
            task.status = TaskStatus::Running;
            task.start_time = Some(chrono::Utc::now().timestamp());
            task.clone()
        };

        // 初始化输出缓冲区
        {
            let mut outputs = self.outputs.lock().await;
            outputs.insert(task_id.clone(), TaskOutput::new());
            let mut errors = self.errors.lock().await;
            errors.insert(task_id.clone(), TaskOutput::new());
        }

        // 发送状态更新
        let _ = app_handle.emit("task-updated", task.clone());

        let tasks = Arc::clone(&self.tasks);
        let outputs = Arc::clone(&self.outputs);
        let errors = Arc::clone(&self.errors);
        let task_id_clone = task_id.clone();
        let command = task.command.clone();
        let semaphore = Arc::clone(&self.semaphore);

        let env_vars = task.env_vars.clone();
        
        let handle = tokio::spawn(async move {
            // 获取信号量许可
            let _permit = semaphore.acquire().await.unwrap();
            debug!("Acquired semaphore for task: {}", task_id_clone);
            
            let result = Self::execute_command(
                &command,
                &task_id_clone,
                &app_handle,
                &tasks,
                &outputs,
                &errors,
                &env_vars,
            ).await;

            let mut tasks_lock = tasks.lock().await;
            if let Some(task) = tasks_lock.get_mut(&task_id_clone) {
                task.end_time = Some(chrono::Utc::now().timestamp());
                
                // 更新最终输出
                let outputs_lock = outputs.lock().await;
                if let Some(output) = outputs_lock.get(&task_id_clone) {
                    task.output = output.to_string();
                }
                drop(outputs_lock);
                
                let errors_lock = errors.lock().await;
                if let Some(error) = errors_lock.get(&task_id_clone) {
                    task.error = error.to_string();
                }
                drop(errors_lock);
                
                match result {
                    Ok(_) => task.status = TaskStatus::Success,
                    Err(e) => {
                        task.status = TaskStatus::Failed;
                        task.error.push_str(&format!("\nError: {}", e));
                    }
                }
                let _ = app_handle.emit("task-updated", task.clone());
            }
        });

        let mut handles = self.handles.lock().await;
        handles.insert(task_id, handle);

        Ok(())
    }

    async fn execute_command(
        command: &str,
        task_id: &str,
        app_handle: &AppHandle,
        _tasks: &Arc<Mutex<HashMap<String, Task>>>,
        outputs: &Arc<Mutex<HashMap<String, TaskOutput>>>,
        errors: &Arc<Mutex<HashMap<String, TaskOutput>>>,
        env_vars: &HashMap<String, String>,
    ) -> Result<()> {
        info!("Executing command for task {}: {}", task_id, command);
        
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe"
        } else {
            "sh"
        };

        let shell_arg = if cfg!(target_os = "windows") { "-Command" } else { "-c" };

        let mut cmd = Command::new(shell);
        cmd.arg(shell_arg)
            .arg(command)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        
        // 应用环境变量
        for (key, value) in env_vars {
            debug!("Setting env var for task {}: {}={}", task_id, key, value);
            cmd.env(key, value);
        }
        
        let mut child = cmd.spawn()?;

        let stdout = child.stdout.take().ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
        let stderr = child.stderr.take().ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;

        let task_id_clone = task_id.to_string();
        let outputs_clone = Arc::clone(outputs);
        let app_handle_clone = app_handle.clone();

        // 输出缓冲发送器
        let stdout_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut buffer = Vec::new();
            let mut interval = interval(Duration::from_millis(OUTPUT_BUFFER_MS));

            loop {
                tokio::select! {
                    line = lines.next_line() => {
                        match line {
                            Ok(Some(line)) => {
                                let mut outputs = outputs_clone.lock().await;
                                if let Some(output) = outputs.get_mut(&task_id_clone) {
                                    output.append(line.clone());
                                }
                                buffer.push(line);
                            }
                            Ok(None) => break,
                            Err(_) => break,
                        }
                    }
                    _ = interval.tick() => {
                        if !buffer.is_empty() {
                            let output = buffer.join("\n");
                            let _ = app_handle_clone.emit("task-output", (task_id_clone.clone(), output));
                            buffer.clear();
                        }
                    }
                }
            }

            // 发送剩余缓冲
            if !buffer.is_empty() {
                let output = buffer.join("\n");
                let _ = app_handle_clone.emit("task-output", (task_id_clone.clone(), output));
            }
        });

        let task_id_clone2 = task_id.to_string();
        let errors_clone = Arc::clone(errors);
        let app_handle_clone2 = app_handle.clone();

        // 错误输出缓冲发送器
        let stderr_handle = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            let mut buffer = Vec::new();
            let mut interval = interval(Duration::from_millis(OUTPUT_BUFFER_MS));

            loop {
                tokio::select! {
                    line = lines.next_line() => {
                        match line {
                            Ok(Some(line)) => {
                                let mut errors = errors_clone.lock().await;
                                if let Some(error) = errors.get_mut(&task_id_clone2) {
                                    error.append(line.clone());
                                }
                                buffer.push(line);
                            }
                            Ok(None) => break,
                            Err(_) => break,
                        }
                    }
                    _ = interval.tick() => {
                        if !buffer.is_empty() {
                            let error = buffer.join("\n");
                            let _ = app_handle_clone2.emit("task-error", (task_id_clone2.clone(), error));
                            buffer.clear();
                        }
                    }
                }
            }

            // 发送剩余缓冲
            if !buffer.is_empty() {
                let error = buffer.join("\n");
                let _ = app_handle_clone2.emit("task-error", (task_id_clone2.clone(), error));
            }
        });

        let status = child.wait().await?;
        stdout_handle.await?;
        stderr_handle.await?;

        if !status.success() {
            warn!("Task {} failed with status: {}", task_id, status);
            return Err(anyhow::anyhow!("Command failed with status: {}", status));
        }

        info!("Task {} completed successfully", task_id);
        Ok(())
    }

    pub async fn run_all_tasks(&self, app_handle: AppHandle) -> Result<()> {
        let task_ids: Vec<String> = {
            let tasks = self.tasks.lock().await;
            tasks.keys().cloned().collect()
        };

        let mut handles = vec![];
        for task_id in task_ids {
            let self_clone = Arc::new(self.clone());
            let app_handle_clone = app_handle.clone();
            let handle = tokio::spawn(async move {
                let _ = self_clone.run_task(task_id, app_handle_clone).await;
            });
            handles.push(handle);
        }

        for handle in handles {
            let _ = handle.await;
        }

        Ok(())
    }

    pub async fn get_task(&self, task_id: &str) -> Option<Task> {
        let tasks = self.tasks.lock().await;
        tasks.get(task_id).cloned()
    }

    pub async fn get_all_tasks(&self) -> Vec<Task> {
        let tasks = self.tasks.lock().await;
        tasks.values().cloned().collect()
    }

    pub async fn cancel_task(&self, task_id: &str) -> Result<()> {
        let mut handles = self.handles.lock().await;
        if let Some(handle) = handles.remove(task_id) {
            handle.abort();
        }

        let mut tasks = self.tasks.lock().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = TaskStatus::Cancelled;
            task.end_time = Some(chrono::Utc::now().timestamp());
        }

        Ok(())
    }

    pub async fn clear_tasks(&self) -> Result<()> {
        let mut tasks = self.tasks.lock().await;
        tasks.clear();

        let mut handles = self.handles.lock().await;
        for (_, handle) in handles.drain() {
            handle.abort();
        }

        Ok(())
    }

    fn clone(&self) -> Self {
        Self {
            tasks: Arc::clone(&self.tasks),
            handles: Arc::clone(&self.handles),
            semaphore: Arc::clone(&self.semaphore),
            outputs: Arc::clone(&self.outputs),
            errors: Arc::clone(&self.errors),
        }
    }
}

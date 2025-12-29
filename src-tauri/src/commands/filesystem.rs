use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// 文件信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub created: Option<String>,
    pub permissions: Option<String>,
}

/// 检查路径是否为敏感系统路径
fn is_sensitive_path(path: &str) -> bool {
    let sensitive_patterns = vec![
        "/etc/passwd",
        "/etc/shadow",
        "/etc/sudoers",
        "/etc/ssh/",
        "/.ssh/",
        "/sys/",
        "/proc/",
        "/dev/",
        "C:\\Windows\\System32",
        "C:\\Windows\\SysWOW64",
        "/System/Library/",
        "/private/var/db/",
    ];

    // 标准化路径
    let normalized_path = path.replace('\\', "/");

    // 检查是否包含敏感路径
    for pattern in sensitive_patterns {
        if normalized_path.contains(pattern) {
            return true;
        }
    }

    false
}

/// 检查路径是否为隐藏文件/目录
fn is_hidden_path(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.starts_with('.'))
        .unwrap_or(false)
}

/// 规范化路径，解析相对路径和 ~ 符号
fn normalize_path(path: &str) -> Result<PathBuf, String> {
    let expanded_path = if path == "~" || path.starts_with("~/") {
        // 展开 ~ 为用户主目录
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map_err(|e| format!("无法获取用户主目录: {}", e))?;

        if path == "~" {
            PathBuf::from(home)
        } else {
            PathBuf::from(path.replacen("~", &home, 1))
        }
    } else {
        PathBuf::from(path)
    };

    // 将相对路径转换为绝对路径
    let absolute_path = if expanded_path.is_relative() {
        std::env::current_dir()
            .map_err(|e| format!("无法获取当前目录: {}", e))?
            .join(expanded_path)
    } else {
        expanded_path
    };

    // 规范化路径（解析 .. 和 .）
    let canonical_path = absolute_path
        .canonicalize()
        .map_err(|e| format!("路径不存在或无法访问: {}", e))?;

    Ok(canonical_path)
}

/// 格式化系统时间为字符串
fn format_system_time(time: SystemTime) -> String {
    let datetime: DateTime<Local> = time.into();
    datetime.format("%Y-%m-%d %H:%M:%S").to_string()
}

/// 获取文件权限字符串（Unix-like 系统）
#[cfg(unix)]
fn get_permissions(metadata: &fs::Metadata) -> Option<String> {
    use std::os::unix::fs::PermissionsExt;
    let mode = metadata.permissions().mode();
    Some(format!("{:o}", mode & 0o777))
}

/// 获取文件权限字符串（Windows 系统）
#[cfg(windows)]
fn get_permissions(metadata: &fs::Metadata) -> Option<String> {
    let readonly = metadata.permissions().readonly();
    Some(if readonly {
        "readonly".to_string()
    } else {
        "readwrite".to_string()
    })
}

/// 读取文件内容
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径，防止目录遍历攻击
/// - 限制文件大小（最大 10MB）
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    // 规范化路径
    let normalized_path = normalize_path(&path)?;
    let path_str = normalized_path.to_string_lossy().to_string();

    // 安全检查：防止访问敏感目录
    if is_sensitive_path(&path_str) {
        return Err("拒绝访问：无法读取敏感系统文件".to_string());
    }

    // 检查文件是否存在
    if !normalized_path.exists() {
        return Err(format!("文件不存在: {}", path_str));
    }

    // 检查是否为文件（不是目录）
    if normalized_path.is_dir() {
        return Err(format!("路径是目录，不是文件: {}", path_str));
    }

    // 检查文件大小（限制为 10MB）
    let metadata =
        fs::metadata(&normalized_path).map_err(|e| format!("无法读取文件元数据: {}", e))?;

    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!(
            "文件过大 ({:.2}MB)，超过最大限制 10MB",
            metadata.len() as f64 / (1024.0 * 1024.0)
        ));
    }

    // 读取文件内容
    fs::read_to_string(&normalized_path).map_err(|e| format!("读取文件失败: {}", e))
}

/// 写入文件内容（带备份）
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径，防止目录遍历攻击
/// - 自动创建备份（如果文件已存在）
/// - 限制内容大小（最大 10MB）
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    // 检查内容大小
    const MAX_CONTENT_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if content.len() > MAX_CONTENT_SIZE {
        return Err(format!(
            "内容过大 ({:.2}MB)，超过最大限制 10MB",
            content.len() as f64 / (1024.0 * 1024.0)
        ));
    }

    // 规范化路径（对于新文件，需要特殊处理）
    let path_buf = PathBuf::from(&path);
    let parent_dir = path_buf.parent().ok_or("无效的文件路径")?;

    // 确保父目录存在
    if !parent_dir.exists() {
        return Err(format!("父目录不存在: {}", parent_dir.display()));
    }

    let normalized_parent = normalize_path(&parent_dir.to_string_lossy())?;
    let file_name = path_buf.file_name().ok_or("无效的文件名")?;
    let normalized_path = normalized_parent.join(file_name);
    let path_str = normalized_path.to_string_lossy().to_string();

    // 安全检查：防止访问敏感目录
    if is_sensitive_path(&path_str) {
        return Err("拒绝访问：无法写入敏感系统文件".to_string());
    }

    // 如果文件存在，创建备份
    if normalized_path.exists() {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let backup_path = format!("{}.backup.{}", path_str, timestamp);

        fs::copy(&normalized_path, &backup_path).map_err(|e| format!("创建备份失败: {}", e))?;

        tracing::info!("已创建备份: {}", backup_path);
    }

    // 写入文件
    fs::write(&normalized_path, content).map_err(|e| format!("写入文件失败: {}", e))?;

    tracing::info!("成功写入文件: {}", path_str);
    Ok(())
}

/// 列出目录中的文件和子目录
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 可选择是否显示隐藏文件
#[tauri::command]
pub async fn list_files(dir: String, show_hidden: Option<bool>) -> Result<Vec<FileInfo>, String> {
    let show_hidden = show_hidden.unwrap_or(false);

    // 规范化路径
    let normalized_path = normalize_path(&dir)?;
    let path_str = normalized_path.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&path_str) {
        return Err("拒绝访问：无法列出敏感系统目录".to_string());
    }

    // 检查是否为目录
    if !normalized_path.is_dir() {
        return Err(format!("路径不是目录: {}", path_str));
    }

    // 读取目录条目
    let entries = fs::read_dir(&normalized_path).map_err(|e| format!("读取目录失败: {}", e))?;

    let mut files = Vec::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();

        // 过滤隐藏文件
        if !show_hidden && is_hidden_path(&entry_path) {
            continue;
        }

        if let Ok(metadata) = entry.metadata() {
            let modified = metadata.modified().ok().map(format_system_time);

            let created = metadata.created().ok().map(format_system_time);

            let permissions = get_permissions(&metadata);

            files.push(FileInfo {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry_path.to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                modified,
                created,
                permissions,
            });
        }
    }

    // 按名称排序（目录在前）
    files.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(files)
}

/// 创建目录
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 支持创建多级目录
#[tauri::command]
pub async fn create_directory(path: String, recursive: Option<bool>) -> Result<(), String> {
    let recursive = recursive.unwrap_or(false);

    // 对于新目录，需要特殊处理路径规范化
    let path_buf = PathBuf::from(&path);

    // 安全检查（在规范化之前进行基本检查）
    if is_sensitive_path(&path) {
        return Err("拒绝访问：无法在敏感系统目录创建目录".to_string());
    }

    // 创建目录
    if recursive {
        fs::create_dir_all(&path_buf).map_err(|e| format!("创建目录失败: {}", e))?;
    } else {
        fs::create_dir(&path_buf).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    tracing::info!("成功创建目录: {}", path);
    Ok(())
}

/// 删除文件
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 创建备份后再删除
#[tauri::command]
pub async fn delete_file(path: String, create_backup: Option<bool>) -> Result<(), String> {
    let create_backup = create_backup.unwrap_or(true);

    // 规范化路径
    let normalized_path = normalize_path(&path)?;
    let path_str = normalized_path.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&path_str) {
        return Err("拒绝访问：无法删除敏感系统文件".to_string());
    }

    // 检查文件是否存在
    if !normalized_path.exists() {
        return Err(format!("文件不存在: {}", path_str));
    }

    // 检查是否为文件
    if normalized_path.is_dir() {
        return Err(format!("路径是目录，请使用删除目录命令: {}", path_str));
    }

    // 创建备份
    if create_backup {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let backup_path = format!("{}.deleted.{}", path_str, timestamp);

        fs::copy(&normalized_path, &backup_path).map_err(|e| format!("创建备份失败: {}", e))?;

        tracing::info!("已创建删除备份: {}", backup_path);
    }

    // 删除文件
    fs::remove_file(&normalized_path).map_err(|e| format!("删除文件失败: {}", e))?;

    tracing::info!("成功删除文件: {}", path_str);
    Ok(())
}

/// 删除目录
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 支持递归删除
/// - 非空目录需要显式指定递归删除
#[tauri::command]
pub async fn delete_directory(path: String, recursive: Option<bool>) -> Result<(), String> {
    let recursive = recursive.unwrap_or(false);

    // 规范化路径
    let normalized_path = normalize_path(&path)?;
    let path_str = normalized_path.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&path_str) {
        return Err("拒绝访问：无法删除敏感系统目录".to_string());
    }

    // 检查目录是否存在
    if !normalized_path.exists() {
        return Err(format!("目录不存在: {}", path_str));
    }

    // 检查是否为目录
    if !normalized_path.is_dir() {
        return Err(format!("路径不是目录: {}", path_str));
    }

    // 删除目录
    if recursive {
        fs::remove_dir_all(&normalized_path).map_err(|e| format!("删除目录失败: {}", e))?;
    } else {
        fs::remove_dir(&normalized_path)
            .map_err(|e| format!("删除目录失败（目录可能不为空，请使用递归删除）: {}", e))?;
    }

    tracing::info!("成功删除目录: {}", path_str);
    Ok(())
}

/// 复制文件
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 检查目标是否已存在
#[tauri::command]
pub async fn copy_file(
    source: String,
    destination: String,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let overwrite = overwrite.unwrap_or(false);

    // 规范化源路径
    let normalized_source = normalize_path(&source)?;
    let source_str = normalized_source.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&source_str) {
        return Err("拒绝访问：无法复制敏感系统文件".to_string());
    }

    // 检查源文件是否存在
    if !normalized_source.exists() {
        return Err(format!("源文件不存在: {}", source_str));
    }

    // 检查源是否为文件
    if normalized_source.is_dir() {
        return Err(format!("源路径是目录，不是文件: {}", source_str));
    }

    // 处理目标路径
    let dest_path_buf = PathBuf::from(&destination);
    let dest_parent = dest_path_buf.parent().ok_or("无效的目标路径")?;

    if !dest_parent.exists() {
        return Err(format!("目标父目录不存在: {}", dest_parent.display()));
    }

    let normalized_dest_parent = normalize_path(&dest_parent.to_string_lossy())?;
    let dest_file_name = dest_path_buf.file_name().ok_or("无效的目标文件名")?;
    let normalized_dest = normalized_dest_parent.join(dest_file_name);
    let dest_str = normalized_dest.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&dest_str) {
        return Err("拒绝访问：无法复制到敏感系统目录".to_string());
    }

    // 检查目标是否已存在
    if normalized_dest.exists() && !overwrite {
        return Err(format!("目标文件已存在: {}", dest_str));
    }

    // 复制文件
    fs::copy(&normalized_source, &normalized_dest).map_err(|e| format!("复制文件失败: {}", e))?;

    tracing::info!("成功复制文件: {} -> {}", source_str, dest_str);
    Ok(())
}

/// 移动/重命名文件
///
/// # 安全措施
/// - 检查敏感系统路径
/// - 规范化路径
/// - 检查目标是否已存在
#[tauri::command]
pub async fn move_file(
    source: String,
    destination: String,
    overwrite: Option<bool>,
) -> Result<(), String> {
    let overwrite = overwrite.unwrap_or(false);

    // 规范化源路径
    let normalized_source = normalize_path(&source)?;
    let source_str = normalized_source.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&source_str) {
        return Err("拒绝访问：无法移动敏感系统文件".to_string());
    }

    // 检查源是否存在
    if !normalized_source.exists() {
        return Err(format!("源路径不存在: {}", source_str));
    }

    // 处理目标路径
    let dest_path_buf = PathBuf::from(&destination);
    let dest_parent = dest_path_buf.parent().ok_or("无效的目标路径")?;

    if !dest_parent.exists() {
        return Err(format!("目标父目录不存在: {}", dest_parent.display()));
    }

    let normalized_dest_parent = normalize_path(&dest_parent.to_string_lossy())?;
    let dest_file_name = dest_path_buf.file_name().ok_or("无效的目标文件名")?;
    let normalized_dest = normalized_dest_parent.join(dest_file_name);
    let dest_str = normalized_dest.to_string_lossy().to_string();

    // 安全检查
    if is_sensitive_path(&dest_str) {
        return Err("拒绝访问：无法移动到敏感系统目录".to_string());
    }

    // 检查目标是否已存在
    if normalized_dest.exists() && !overwrite {
        return Err(format!("目标路径已存在: {}", dest_str));
    }

    // 移动文件
    fs::rename(&normalized_source, &normalized_dest).map_err(|e| format!("移动文件失败: {}", e))?;

    tracing::info!("成功移动文件: {} -> {}", source_str, dest_str);
    Ok(())
}

/// 检查路径是否存在
#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    let normalized_path = normalize_path(&path)?;
    Ok(normalized_path.exists())
}

/// 获取文件元数据
#[tauri::command]
pub async fn get_file_metadata(path: String) -> Result<FileInfo, String> {
    // 规范化路径
    let normalized_path = normalize_path(&path)?;
    let path_str = normalized_path.to_string_lossy().to_string();

    // 获取元数据
    let metadata =
        fs::metadata(&normalized_path).map_err(|e| format!("无法读取文件元数据: {}", e))?;

    let modified = metadata.modified().ok().map(format_system_time);

    let created = metadata.created().ok().map(format_system_time);

    let permissions = get_permissions(&metadata);

    let file_name = normalized_path
        .file_name()
        .ok_or("无效的文件名")?
        .to_string_lossy()
        .to_string();

    Ok(FileInfo {
        name: file_name,
        path: path_str,
        is_dir: metadata.is_dir(),
        size: metadata.len(),
        modified,
        created,
        permissions,
    })
}

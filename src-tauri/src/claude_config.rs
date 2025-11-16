use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeProvider {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub created_at: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ClaudeConfig {
    pub providers: Vec<ClaudeProvider>,
    pub current_provider: Option<String>,
}

pub struct ClaudeConfigManager;

impl ClaudeConfigManager {
    fn get_config_dir() -> Result<PathBuf, String> {
        let home = env::var("HOME")
            .or_else(|_| env::var("USERPROFILE"))
            .map_err(|e| format!("无法获取HOME目录: {}", e))?;

        let config_dir = PathBuf::from(home).join(".claude");

        // 创建配置目录
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| format!("无法创建配置目录: {}", e))?;
        }

        Ok(config_dir)
    }

    fn get_config_file() -> Result<PathBuf, String> {
        Ok(Self::get_config_dir()?.join("settings.json"))
    }

    pub fn load_providers() -> Result<Vec<ClaudeProvider>, String> {
        let config_file = Self::get_config_file()?;

        if !config_file.exists() {
            return Ok(Vec::new());
        }

        let content =
            fs::read_to_string(&config_file).map_err(|e| format!("无法读取配置文件: {}", e))?;

        let settings: Value =
            serde_json::from_str(&content).map_err(|e| format!("无法解析配置文件: {}", e))?;

        // 如果有 providers 字段，返回 providers
        if let Some(providers) = settings.get("providers").and_then(|p| p.as_array()) {
            let result: Result<Vec<ClaudeProvider>, _> = providers
                .iter()
                .map(|p| serde_json::from_value(p.clone()))
                .collect();
            return result.map_err(|e| format!("无法解析提供商信息: {}", e));
        }

        // 否则，从现有配置生成一个提供商
        if let (Some(api_key), Some(base_url), Some(active)) = (
            settings.get("ANTHROPIC_API_KEY").and_then(|v| v.as_str()),
            settings.get("ANTHROPIC_BASE_URL").and_then(|v| v.as_str()),
            settings.get("activeProvider").and_then(|v| v.as_str()),
        ) {
            let model = settings
                .get("ANTHROPIC_MODEL")
                .and_then(|v| v.as_str())
                .unwrap_or("claude-3-5-sonnet-20241022");
            let provider = ClaudeProvider {
                name: active.to_string(),
                base_url: base_url.to_string(),
                api_key: api_key.to_string(),
                model: model.to_string(),
                created_at: chrono::Local::now().to_rfc3339(),
            };
            return Ok(vec![provider]);
        }

        Ok(Vec::new())
    }

    pub fn get_current_provider() -> Result<Option<ClaudeProvider>, String> {
        let config_file = Self::get_config_file()?;

        if !config_file.exists() {
            return Ok(None);
        }

        let content =
            fs::read_to_string(&config_file).map_err(|e| format!("无法读取配置文件: {}", e))?;

        let settings: Value =
            serde_json::from_str(&content).map_err(|e| format!("无法解析配置文件: {}", e))?;

        // 优先使用 current_provider 字段
        if let Some(current_name) = settings.get("current_provider").and_then(|v| v.as_str()) {
            if let Some(providers) = settings.get("providers").and_then(|p| p.as_array()) {
                for p in providers {
                    if let Some(name) = p.get("name").and_then(|n| n.as_str()) {
                        if name == current_name {
                            return serde_json::from_value(p.clone())
                                .map(Some)
                                .map_err(|e| format!("无法解析提供商信息: {}", e));
                        }
                    }
                }
            }
        }

        // 否则使用 activeProvider 字段
        if let (Some(api_key), Some(base_url), Some(active)) = (
            settings.get("ANTHROPIC_API_KEY").and_then(|v| v.as_str()),
            settings.get("ANTHROPIC_BASE_URL").and_then(|v| v.as_str()),
            settings.get("activeProvider").and_then(|v| v.as_str()),
        ) {
            let model = settings
                .get("ANTHROPIC_MODEL")
                .and_then(|v| v.as_str())
                .unwrap_or("claude-3-5-sonnet-20241022");
            let provider = ClaudeProvider {
                name: active.to_string(),
                base_url: base_url.to_string(),
                api_key: api_key.to_string(),
                model: model.to_string(),
                created_at: chrono::Local::now().to_rfc3339(),
            };
            return Ok(Some(provider));
        }

        Ok(None)
    }

    pub fn add_provider(provider: ClaudeProvider) -> Result<(), String> {
        let config_file = Self::get_config_file()?;

        let mut settings: Value = if config_file.exists() {
            let content =
                fs::read_to_string(&config_file).map_err(|e| format!("无法读取配置文件: {}", e))?;
            serde_json::from_str(&content).map_err(|e| format!("无法解析配置文件: {}", e))?
        } else {
            json!({})
        };

        // 确保 providers 数组存在
        if settings.get("providers").is_none() {
            settings["providers"] = json!([]);
        }

        let providers = settings
            .get_mut("providers")
            .unwrap()
            .as_array_mut()
            .unwrap();

        // 检查是否已存在
        if providers
            .iter()
            .any(|p| p.get("name").and_then(|n| n.as_str()) == Some(&provider.name))
        {
            return Err(format!("提供商 '{}' 已存在", provider.name));
        }

        providers
            .push(serde_json::to_value(&provider).map_err(|e| format!("无法序列化提供商: {}", e))?);

        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("无法序列化配置: {}", e))?;

        fs::write(&config_file, json).map_err(|e| format!("无法保存配置文件: {}", e))?;

        Ok(())
    }

    pub fn switch_provider(provider_name: String) -> Result<(), String> {
        let config_file = Self::get_config_file()?;

        let mut settings: Value = if config_file.exists() {
            let content =
                fs::read_to_string(&config_file).map_err(|e| format!("无法读取配置文件: {}", e))?;
            serde_json::from_str(&content).map_err(|e| format!("无法解析配置文件: {}", e))?
        } else {
            return Err("配置文件不存在".to_string());
        };

        // 检查提供商是否存在
        // 首先检查 providers 数组
        let mut provider = None;

        if let Some(providers) = settings.get("providers").and_then(|p| p.as_array()) {
            provider = providers
                .iter()
                .find(|p| p.get("name").and_then(|n| n.as_str()) == Some(&provider_name))
                .cloned();
        }

        // 如果没有 providers 数组，但有单个提供商配置，检查 activeProvider
        if provider.is_none() {
            if let Some(active) = settings.get("activeProvider").and_then(|v| v.as_str()) {
                if active == provider_name {
                    // 构建提供商对象
                    if let (Some(api_key), Some(base_url)) = (
                        settings.get("ANTHROPIC_API_KEY").and_then(|v| v.as_str()),
                        settings.get("ANTHROPIC_BASE_URL").and_then(|v| v.as_str()),
                    ) {
                        let model = settings
                            .get("ANTHROPIC_MODEL")
                            .and_then(|v| v.as_str())
                            .unwrap_or("claude-3-5-sonnet-20241022");
                        provider = Some(json!({
                            "name": provider_name.clone(),
                            "base_url": base_url,
                            "api_key": api_key,
                            "model": model,
                            "created_at": chrono::Local::now().to_rfc3339()
                        }));
                    }
                }
            }
        }

        let provider = provider.ok_or(format!("提供商 '{}' 不存在", provider_name))?;

        // 更新 current_provider
        settings["current_provider"] = json!(provider_name.clone());

        // 也更新 activeProvider 以保持兼容性
        settings["activeProvider"] = json!(provider_name.clone());

        // 更新其他字段用于环保变量生成
        if let Some(base_url) = provider.get("base_url").and_then(|v| v.as_str()) {
            settings["ANTHROPIC_BASE_URL"] = json!(base_url);
        }
        if let Some(api_key) = provider.get("api_key").and_then(|v| v.as_str()) {
            settings["ANTHROPIC_API_KEY"] = json!(api_key);
        }
        if let Some(model) = provider.get("model").and_then(|v| v.as_str()) {
            settings["ANTHROPIC_MODEL"] = json!(model);
        }

        // 生成环境变量文件
        if let Some(api_key) = provider.get("api_key").and_then(|v| v.as_str()) {
            if let Some(base_url) = provider.get("base_url").and_then(|v| v.as_str()) {
                Self::set_env_vars_with_values(api_key, base_url)?;
            }
        }

        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("无法序列化配置: {}", e))?;

        fs::write(&config_file, json).map_err(|e| format!("无法保存配置文件: {}", e))?;

        Ok(())
    }

    pub fn remove_provider(provider_name: String) -> Result<(), String> {
        let config_file = Self::get_config_file()?;

        let mut settings: Value = if config_file.exists() {
            let content =
                fs::read_to_string(&config_file).map_err(|e| format!("无法读取配置文件: {}", e))?;
            serde_json::from_str(&content).map_err(|e| format!("无法解析配置文件: {}", e))?
        } else {
            return Err("配置文件不存在".to_string());
        };

        if let Some(providers) = settings.get_mut("providers").and_then(|p| p.as_array_mut()) {
            providers.retain(|p| p.get("name").and_then(|n| n.as_str()) != Some(&provider_name));
        }

        // 如果删除的是当前提供商，清空
        if settings.get("current_provider").and_then(|v| v.as_str()) == Some(&provider_name) {
            settings["current_provider"] = json!(null);
        }
        if settings.get("activeProvider").and_then(|v| v.as_str()) == Some(&provider_name) {
            settings["activeProvider"] = json!(null);
        }

        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("无法序列化配置: {}", e))?;

        fs::write(&config_file, json).map_err(|e| format!("无法保存配置文件: {}", e))?;

        Ok(())
    }

    pub fn validate_api_key(api_key: &str) -> Result<bool, String> {
        // 基础验证：检查长度和格式
        if api_key.len() < 10 {
            return Ok(false);
        }

        // 检查是否为有效的密钥格式（通常以特定前缀开头）
        let valid =
            api_key.starts_with("sk-") || api_key.starts_with("sk_") || api_key.starts_with("pat-");

        Ok(valid)
    }

    fn set_env_vars_with_values(api_key: &str, base_url: &str) -> Result<(), String> {
        // 创建 .env 文件
        let config_dir = Self::get_config_dir()?;
        let env_file = config_dir.join(".env.claude");

        let env_content = format!(
            "ANTHROPIC_API_KEY={}\nANTHROPIC_BASE_URL={}\n",
            api_key, base_url
        );

        fs::write(&env_file, env_content).map_err(|e| format!("无法写入 .env 文件: {}", e))?;

        Ok(())
    }
}

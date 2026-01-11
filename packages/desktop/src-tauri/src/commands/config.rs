use serde::{Deserialize, Serialize};
use tauri::command;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub default_model: String,
    pub theme: String,
    pub auto_update: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_model: "anthropic/claude-sonnet-4".to_string(),
            theme: "system".to_string(),
            auto_update: true,
        }
    }
}

#[command]
pub async fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let config = AppConfig {
        default_model: store
            .get("default_model")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "anthropic/claude-sonnet-4".to_string()),
        theme: store
            .get("theme")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "system".to_string()),
        auto_update: store.get("auto_update").and_then(|v| v.as_bool()).unwrap_or(true),
    };

    Ok(config)
}

#[command]
pub async fn set_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("default_model", config.default_model);
    store.set("theme", config.theme);
    store.set("auto_update", config.auto_update);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

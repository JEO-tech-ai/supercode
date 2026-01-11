use serde::{Deserialize, Serialize};
use tauri::command;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user_email: Option<String>,
}

#[command]
pub async fn get_auth_status(app: tauri::AppHandle) -> Result<AuthStatus, String> {
    let store = app.store("auth.json").map_err(|e| e.to_string())?;

    let status = AuthStatus {
        is_authenticated: store
            .get("is_authenticated")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        user_email: store
            .get("user_email")
            .and_then(|v| v.as_str().map(String::from)),
    };

    Ok(status)
}

import { invoke } from "@tauri-apps/api/core";

interface AppConfig {
  default_model: string;
  theme: string;
  auto_update: boolean;
}

interface AuthStatus {
  is_authenticated: boolean;
  user_email: string | null;
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export async function setConfig(config: AppConfig): Promise<void> {
  return invoke("set_config", { config });
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return invoke<AuthStatus>("get_auth_status");
}

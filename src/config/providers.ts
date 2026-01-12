/**
 * OAuth Provider Configuration
 * Centralized configuration for all auth providers (oh-my-opencode level)
 * 
 * Security: All credentials should be loaded from environment variables
 */

export type AuthGrantType = "authorization_code" | "device_flow" | "api_key";

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  nonRetryableErrors: string[];
}

export interface ProviderEndpoints {
  authorization?: string;
  token: string;
  refresh?: string;
  revoke?: string;
  deviceAuth?: string;
  userInfo?: string;
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authGrantType: AuthGrantType;
  scopes: string[];
  endpoints: ProviderEndpoints;
  apiEndpoints: string[];
  callbackPort: number;
  retry: RetryConfig;
  pkceRequired: boolean;
  refreshBufferMs: number;
}

// Default retry configuration (oh-my-opencode pattern)
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504, 0], // 0 = network error
  nonRetryableErrors: ["invalid_grant", "access_denied", "invalid_client"],
};

/**
 * Google/Gemini OAuth Configuration (Antigravity)
 */
export const GEMINI_CONFIG: ProviderConfig = {
  name: "gemini",
  displayName: "Gemini (Google)",
  clientId: process.env.GOOGLE_CLIENT_ID || 
    "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 
    "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",
  authGrantType: "authorization_code",
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs",
    "https://www.googleapis.com/auth/generative-language.retriever",
  ],
  endpoints: {
    authorization: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    refresh: "https://oauth2.googleapis.com/token",
    revoke: "https://oauth2.googleapis.com/revoke",
    userInfo: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  // Antigravity endpoint fallback (oh-my-opencode pattern)
  apiEndpoints: [
    "https://daily-cloudcode-pa.sandbox.googleapis.com",
    "https://autopush-cloudcode-pa.sandbox.googleapis.com",
    "https://cloudcode-pa.googleapis.com",
  ],
  callbackPort: 3100,
  retry: DEFAULT_RETRY_CONFIG,
  pkceRequired: true,
  refreshBufferMs: 60000, // 1 minute before expiry
};

/**
 * Claude (Anthropic) Configuration
 * Note: Anthropic primarily uses API keys, OAuth is for Pro/Max subscribers
 */
export const CLAUDE_CONFIG: ProviderConfig = {
  name: "claude",
  displayName: "Claude (Anthropic)",
  clientId: process.env.ANTHROPIC_CLIENT_ID || "claude-code-cli-client-id",
  clientSecret: process.env.ANTHROPIC_CLIENT_SECRET || "",
  authGrantType: "api_key", // Default to API key, OAuth available for Pro/Max
  scopes: [],
  endpoints: {
    token: "https://console.anthropic.com/api/oauth/token",
    refresh: "https://console.anthropic.com/api/oauth/token",
  },
  apiEndpoints: [
    "https://api.anthropic.com",
  ],
  callbackPort: 3101,
  retry: DEFAULT_RETRY_CONFIG,
  pkceRequired: false,
  refreshBufferMs: 60000,
};

/**
 * OpenAI/Codex Configuration
 * Supports both API key and ChatGPT OAuth (Device Flow)
 */
export const CODEX_CONFIG: ProviderConfig = {
  name: "codex",
  displayName: "Codex (OpenAI/ChatGPT)",
  clientId: process.env.OPENAI_CLIENT_ID || "chatgpt-cli",
  clientSecret: process.env.OPENAI_CLIENT_SECRET || "",
  authGrantType: "device_flow", // ChatGPT OAuth uses device flow
  scopes: ["offline_access"],
  endpoints: {
    deviceAuth: "https://auth.openai.com/oauth/device/code",
    token: "https://auth.openai.com/oauth/token",
    refresh: "https://auth.openai.com/oauth/token",
  },
  apiEndpoints: [
    "https://api.openai.com",
  ],
  callbackPort: 1455, // Codex CLI default port
  retry: DEFAULT_RETRY_CONFIG,
  pkceRequired: false,
  refreshBufferMs: 60000,
};

/**
 * Antigravity Configuration (Google's Browser IDE)
 * Uses same OAuth as Gemini but different endpoints
 */
export const ANTIGRAVITY_CONFIG: ProviderConfig = {
  name: "antigravity",
  displayName: "Antigravity (Google)",
  clientId: process.env.ANTIGRAVITY_CLIENT_ID || GEMINI_CONFIG.clientId,
  clientSecret: process.env.ANTIGRAVITY_CLIENT_SECRET || GEMINI_CONFIG.clientSecret,
  authGrantType: "authorization_code",
  scopes: GEMINI_CONFIG.scopes,
  endpoints: {
    authorization: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    refresh: "https://oauth2.googleapis.com/token",
    revoke: "https://oauth2.googleapis.com/revoke",
  },
  apiEndpoints: GEMINI_CONFIG.apiEndpoints,
  callbackPort: 51121, // Antigravity default port
  retry: DEFAULT_RETRY_CONFIG,
  pkceRequired: true,
  refreshBufferMs: 1800000, // 30 minutes (proactive refresh)
};

/**
 * GitHub Configuration (for repository access)
 */
export const GITHUB_CONFIG: ProviderConfig = {
  name: "github",
  displayName: "GitHub",
  clientId: process.env.GITHUB_CLIENT_ID || "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  authGrantType: "authorization_code",
  scopes: ["repo", "user:email"],
  endpoints: {
    authorization: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
  },
  apiEndpoints: [
    "https://api.github.com",
  ],
  callbackPort: 3102,
  retry: DEFAULT_RETRY_CONFIG,
  pkceRequired: true, // Enhanced security: use PKCE even for GitHub
  refreshBufferMs: 0, // GitHub tokens don't refresh
};

/**
 * All provider configurations
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  gemini: GEMINI_CONFIG,
  claude: CLAUDE_CONFIG,
  codex: CODEX_CONFIG,
  antigravity: ANTIGRAVITY_CONFIG,
  github: GITHUB_CONFIG,
};

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[provider];
}

/**
 * Request headers for Antigravity API (oh-my-opencode pattern)
 */
export const ANTIGRAVITY_HEADERS = {
  "User-Agent": "google-api-nodejs-client/9.15.1",
  "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
  "Client-Metadata": JSON.stringify({
    ideType: "IDE_UNSPECIFIED",
    platform: "PLATFORM_UNSPECIFIED",
    pluginType: "GEMINI",
  }),
};

/**
 * Debug mode
 */
export const DEBUG_ENABLED = process.env.SUPERCODE_DEBUG === "1" || 
                             process.env.OAUTH_DEBUG === "1";

export function debugLog(module: string, ...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log(`[${module}]`, ...args);
  }
}

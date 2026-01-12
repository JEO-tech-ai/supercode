/**
 * Antigravity Auth Type Definitions
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Token storage format for Antigravity authentication
 */
export interface AntigravityTokens {
  /** Always "antigravity" for this auth type */
  type: "antigravity";
  /** OAuth access token from Google */
  access_token: string;
  /** OAuth refresh token from Google */
  refresh_token: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** Unix timestamp in milliseconds when tokens were obtained */
  timestamp: number;
  /** ISO 8601 formatted expiration datetime (optional, for display) */
  expired?: string;
  /** User's email address from Google userinfo */
  email?: string;
  /** GCP project ID from loadCodeAssist API */
  project_id?: string;
}

/**
 * Project context returned from loadCodeAssist API
 */
export interface AntigravityProjectContext {
  /** GCP project ID for Cloud AI Companion */
  cloudaicompanionProject?: string;
  /** Managed project ID for enterprise users (optional) */
  managedProjectId?: string;
}

/**
 * Metadata for loadCodeAssist API request
 */
export interface AntigravityClientMetadata {
  /** IDE type identifier */
  ideType: "IDE_UNSPECIFIED" | string;
  /** Platform identifier */
  platform: "PLATFORM_UNSPECIFIED" | string;
  /** Plugin type - typically "GEMINI" */
  pluginType: "GEMINI" | string;
}

/**
 * Request body for loadCodeAssist API
 */
export interface AntigravityLoadCodeAssistRequest {
  metadata: AntigravityClientMetadata;
}

export interface AntigravityUserTier {
  id?: string;
  isDefault?: boolean;
  userDefinedCloudaicompanionProject?: boolean;
}

export interface AntigravityLoadCodeAssistResponse {
  cloudaicompanionProject?: string | { id: string };
  currentTier?: { id?: string };
  allowedTiers?: AntigravityUserTier[];
}

/**
 * Onboard user payload for FREE tier users
 */
export interface AntigravityOnboardUserPayload {
  done?: boolean;
  response?: {
    cloudaicompanionProject?: { id?: string };
  };
}

/**
 * Token exchange result from Google OAuth
 */
export interface AntigravityTokenExchangeResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Parsed refresh token parts
 * Format: refreshToken|projectId|managedProjectId
 */
export interface AntigravityRefreshParts {
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
}

/**
 * User info from Google userinfo API
 */
export interface AntigravityUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

/**
 * OAuth state for PKCE flow
 */
export interface AntigravityOAuthState {
  verifier: string;
  projectId?: string;
}

/**
 * OAuth error payload from Google
 */
export interface OAuthErrorPayload {
  error?: string | { status?: string; code?: string; message?: string };
  error_description?: string;
}

/**
 * Parsed OAuth error with normalized fields
 */
export interface ParsedOAuthError {
  code?: string;
  description?: string;
}

/**
 * Antigravity OAuth configuration constants
 * Adapted from Oh-My-OpenCode for SuperCode integration
 *
 * Security: Credentials are loaded from environment variables when available
 */

// OAuth 2.0 Client Credentials (Google Cloud Code AI Companion)
// Load from environment variables for security, fallback to defaults for development
export const ANTIGRAVITY_CLIENT_ID =
  process.env.ANTIGRAVITY_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";

export const ANTIGRAVITY_CLIENT_SECRET =
  process.env.ANTIGRAVITY_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  "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";

// OAuth Callback
export const ANTIGRAVITY_CALLBACK_PORT = 51121;
export const ANTIGRAVITY_REDIRECT_URI = `http://localhost:${ANTIGRAVITY_CALLBACK_PORT}/oauth-callback`;

// OAuth Scopes
export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
] as const;

// API Endpoint Fallbacks (order: daily → autopush → prod)
export const ANTIGRAVITY_ENDPOINT_FALLBACKS = [
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
  "https://autopush-cloudcode-pa.sandbox.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
] as const;

// API Version
export const ANTIGRAVITY_API_VERSION = "v1internal";

// Request Headers
export const ANTIGRAVITY_HEADERS = {
  "User-Agent": "google-api-nodejs-client/9.15.1",
  "X-Goog-Api-Client": "google-cloud-sdk supercoin/1.0",
  "Client-Metadata": JSON.stringify({
    ideType: "IDE_UNSPECIFIED",
    platform: "PLATFORM_UNSPECIFIED",
    pluginType: "GEMINI",
  }),
} as const;

// Default Project ID (fallback when loadCodeAssist API fails)
export const ANTIGRAVITY_DEFAULT_PROJECT_ID = "rising-fact-p41fc";

// Google OAuth endpoints
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL =
  "https://www.googleapis.com/oauth2/v1/userinfo";

// Token refresh buffer (refresh 60 seconds before expiry)
export const ANTIGRAVITY_TOKEN_REFRESH_BUFFER_MS = 60_000;

// Max retry attempts for token refresh
export const MAX_REFRESH_RETRIES = 3;

// Retry delay base (exponential backoff: 1s, 2s, 4s)
export const RETRY_DELAY_BASE_MS = 1000;

// Default thought signature to skip validation (CLIProxyAPI approach)
export const SKIP_THOUGHT_SIGNATURE_VALIDATOR = "skip_thought_signature_validator";

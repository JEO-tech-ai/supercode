/**
 * Antigravity Authentication Module
 * Google OAuth 2.0 with PKCE for Cloud AI Companion API.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

// Provider
export { AntigravityAuthProvider } from "./provider";

// OAuth
export {
  generatePKCEPair,
  buildAuthURL,
  exchangeCode,
  decodeState,
  fetchUserInfo,
  startCallbackServer,
  performOAuthFlow,
  type PKCEPair,
  type OAuthState,
  type AuthorizationResult,
  type CallbackResult,
  type CallbackServerHandle,
} from "./oauth";

// Token Management
export {
  AntigravityTokenRefreshError,
  isTokenExpired,
  refreshAccessToken,
  parseStoredToken,
  formatTokenForStorage,
} from "./token";

// Project Context
export {
  fetchProjectContext,
  clearProjectContextCache,
  invalidateProjectContextByRefreshToken,
} from "./project";

// Types
export type {
  AntigravityTokens,
  AntigravityProjectContext,
  AntigravityClientMetadata,
  AntigravityLoadCodeAssistRequest,
  AntigravityUserTier,
  AntigravityLoadCodeAssistResponse,
  AntigravityOnboardUserPayload,
  AntigravityTokenExchangeResult,
  AntigravityRefreshParts,
  AntigravityUserInfo,
  AntigravityOAuthState,
  OAuthErrorPayload,
  ParsedOAuthError,
} from "./types";

// Constants
export {
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_REDIRECT_URI,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_ENDPOINT_FALLBACKS,
  ANTIGRAVITY_API_VERSION,
  ANTIGRAVITY_HEADERS,
  ANTIGRAVITY_DEFAULT_PROJECT_ID,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  ANTIGRAVITY_TOKEN_REFRESH_BUFFER_MS,
  MAX_REFRESH_RETRIES,
  RETRY_DELAY_BASE_MS,
} from "./constants";

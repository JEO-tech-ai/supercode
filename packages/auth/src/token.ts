/**
 * Token management for OAuth authentication
 * Handles token storage, refresh, and expiration
 */

/**
 * Raw OAuth token response from provider
 */
interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  message?: string;
}

/**
 * Complete token set from OAuth provider
 */
export interface TokenSet {
  /** OAuth access token */
  access_token: string;
  /** OAuth refresh token for obtaining new access tokens */
  refresh_token: string;
  /** Token lifetime in seconds */
  expires_in: number;
  /** Timestamp when tokens were obtained (ms since epoch) */
  timestamp: number;
  /** Token type, always "Bearer" */
  token_type: "Bearer";
  /** OAuth scopes granted */
  scope?: string;
}

/**
 * Configuration for token refresh behavior
 */
export interface TokenRefreshConfig {
  /** Milliseconds before expiry to trigger refresh (default: 60000) */
  refreshBufferMs: number;
  /** Maximum retry attempts for refresh (default: 3) */
  maxRetries: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelayMs: number;
}

/**
 * Result of a token refresh operation
 */
export interface TokenRefreshResult {
  success: boolean;
  tokens?: TokenSet;
  error?: string;
  retryable?: boolean;
}

/**
 * Error thrown when a refresh token has been revoked
 */
export class InvalidGrantError extends Error {
  readonly code = "invalid_grant";

  constructor(message: string = "Token has been revoked") {
    super(message);
    this.name = "InvalidGrantError";
  }
}

/**
 * Error thrown when token refresh fails after all retries
 */
export class TokenRefreshError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean = true) {
    super(message);
    this.name = "TokenRefreshError";
    this.retryable = retryable;
  }
}

/**
 * Default token refresh configuration
 */
export const DEFAULT_REFRESH_CONFIG: TokenRefreshConfig = {
  refreshBufferMs: 60_000, // 60 seconds before expiry
  maxRetries: 3,
  baseDelayMs: 1000,
};

/**
 * Check if a token set has expired or is about to expire
 * @param tokens Token set to check
 * @param config Refresh configuration
 * @returns true if token needs refresh
 */
export function isTokenExpired(
  tokens: TokenSet,
  config: TokenRefreshConfig = DEFAULT_REFRESH_CONFIG
): boolean {
  const expirationTime = tokens.timestamp + tokens.expires_in * 1000;
  return Date.now() >= expirationTime - config.refreshBufferMs;
}

/**
 * Get remaining time until token expires
 * @param tokens Token set to check
 * @returns Milliseconds until expiration (negative if expired)
 */
export function getTokenTimeRemaining(tokens: TokenSet): number {
  const expirationTime = tokens.timestamp + tokens.expires_in * 1000;
  return expirationTime - Date.now();
}

/**
 * Calculate delay for exponential backoff
 * @param attempt Current attempt number (0-based)
 * @param baseDelayMs Base delay in milliseconds
 * @returns Delay in milliseconds with jitter
 */
function calculateRetryDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return exponentialDelay + jitter;
}

/**
 * Refresh access token using refresh token
 * Implements retry logic with exponential backoff
 *
 * @param refreshToken Current refresh token
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param tokenUrl Token endpoint URL
 * @param config Refresh configuration
 * @returns New token set
 * @throws InvalidGrantError if token has been revoked
 * @throws TokenRefreshError if refresh fails after all retries
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUrl: string = "https://github.com/login/oauth/access_token",
  config: TokenRefreshConfig = DEFAULT_REFRESH_CONFIG
): Promise<TokenSet> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      const data = (await response.json()) as OAuthTokenResponse;

      if (!response.ok || data.error) {
        const errorCode = data.error || "unknown_error";
        const errorDescription = data.error_description || data.message || "Token refresh failed";

        // Don't retry invalid_grant errors - token was revoked
        if (errorCode === "invalid_grant" || errorCode === "bad_refresh_token") {
          throw new InvalidGrantError(errorDescription);
        }

        throw new TokenRefreshError(errorDescription, true);
      }

      // Success - return new token set
      return {
        access_token: data.access_token || "",
        refresh_token: data.refresh_token || refreshToken, // Keep old if not returned
        expires_in: data.expires_in || 28800, // Default 8 hours
        timestamp: Date.now(),
        token_type: "Bearer",
        scope: data.scope,
      };
    } catch (error) {
      lastError = error as Error;

      // Don't retry InvalidGrantError
      if (error instanceof InvalidGrantError) {
        throw error;
      }

      // Retry on network errors and retryable errors
      if (attempt < config.maxRetries) {
        const delay = calculateRetryDelay(attempt, config.baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError || new TokenRefreshError("Token refresh failed after all retries", false);
}

/**
 * Exchange authorization code for tokens
 *
 * @param code Authorization code from OAuth callback
 * @param redirectUri Redirect URI used in authorization
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param codeVerifier PKCE code verifier (if using PKCE)
 * @param tokenUrl Token endpoint URL
 * @returns Token set
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier?: string,
  tokenUrl: string = "https://github.com/login/oauth/access_token"
): Promise<TokenSet> {
  const body: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };

  // Add PKCE verifier if provided
  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as OAuthTokenResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Token exchange failed");
  }

  return {
    access_token: data.access_token || "",
    refresh_token: data.refresh_token || "",
    expires_in: data.expires_in || 28800,
    timestamp: Date.now(),
    token_type: "Bearer",
    scope: data.scope,
  };
}

/**
 * Create a token set from raw OAuth response
 * @param data Raw OAuth response data
 * @returns Normalized token set
 */
export function createTokenSet(data: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}): TokenSet {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    expires_in: data.expires_in || 28800,
    timestamp: Date.now(),
    token_type: "Bearer",
    scope: data.scope,
  };
}

/**
 * Serialize token set for storage
 * @param tokens Token set to serialize
 * @returns JSON string
 */
export function serializeTokens(tokens: TokenSet): string {
  return JSON.stringify(tokens);
}

/**
 * Deserialize token set from storage
 * @param data JSON string
 * @returns Token set or null if invalid
 */
export function deserializeTokens(data: string): TokenSet | null {
  try {
    const parsed = JSON.parse(data);

    // Validate required fields
    if (
      typeof parsed.access_token !== "string" ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }

    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token || "",
      expires_in: parsed.expires_in || 28800,
      timestamp: parsed.timestamp,
      token_type: "Bearer",
      scope: parsed.scope,
    };
  } catch {
    return null;
  }
}

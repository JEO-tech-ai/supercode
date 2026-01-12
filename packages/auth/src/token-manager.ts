/**
 * Token Manager for client-side token lifecycle management
 * Handles automatic refresh with exponential backoff and invalid_grant recovery
 */

import {
  type TokenSet,
  type TokenRefreshConfig,
  DEFAULT_REFRESH_CONFIG,
  isTokenExpired,
  getTokenTimeRemaining,
  refreshAccessToken,
  InvalidGrantError,
  TokenRefreshError,
} from "./token";

/**
 * Token manager events
 */
export type TokenManagerEvent =
  | { type: "token_refreshed"; tokens: TokenSet }
  | { type: "token_refresh_failed"; error: Error; retryable: boolean }
  | { type: "reauthentication_required"; reason: string }
  | { type: "token_expiring_soon"; timeRemaining: number };

/**
 * Event listener callback
 */
export type TokenManagerEventListener = (event: TokenManagerEvent) => void;

/**
 * Token manager configuration
 */
export interface TokenManagerConfig extends TokenRefreshConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret (for server-side only) */
  clientSecret?: string;
  /** Token endpoint URL */
  tokenUrl?: string;
  /** Check interval in ms (default: 30000) */
  checkIntervalMs?: number;
  /** Time before expiry to warn (default: 300000 = 5 min) */
  warningBufferMs?: number;
}

/**
 * Default token manager configuration
 */
const DEFAULT_CONFIG: Omit<TokenManagerConfig, "clientId"> = {
  ...DEFAULT_REFRESH_CONFIG,
  checkIntervalMs: 30_000,
  warningBufferMs: 300_000,
};

/**
 * Client-side token lifecycle manager
 *
 * Features:
 * - Automatic token refresh before expiration
 * - Exponential backoff on refresh failures
 * - Invalid grant detection with re-auth trigger
 * - Event-based notifications for UI updates
 */
export class TokenManager {
  private tokens: TokenSet | null = null;
  private config: TokenManagerConfig;
  private listeners: Set<TokenManagerEventListener> = new Set();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;

  constructor(config: TokenManagerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Set current tokens and start automatic refresh
   */
  setTokens(tokens: TokenSet): void {
    this.tokens = tokens;
    this.scheduleRefresh();
  }

  /**
   * Get current tokens
   */
  getTokens(): TokenSet | null {
    return this.tokens;
  }

  /**
   * Get current access token if valid
   */
  getAccessToken(): string | null {
    if (!this.tokens) return null;
    if (isTokenExpired(this.tokens, this.config)) return null;
    return this.tokens.access_token;
  }

  /**
   * Check if tokens are valid and not expired
   */
  hasValidTokens(): boolean {
    if (!this.tokens) return false;
    return !isTokenExpired(this.tokens, this.config);
  }

  /**
   * Clear tokens and stop automatic refresh
   */
  clearTokens(): void {
    this.tokens = null;
    this.stopRefresh();
  }

  /**
   * Add event listener
   */
  addEventListener(listener: TokenManagerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: TokenManagerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Manually trigger token refresh
   */
  async refresh(): Promise<TokenSet> {
    if (!this.tokens?.refresh_token) {
      throw new Error("No refresh token available");
    }

    if (!this.config.clientSecret) {
      throw new Error("Client secret required for token refresh");
    }

    return this.performRefresh();
  }

  /**
   * Stop automatic refresh
   */
  stopRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Destroy the token manager
   */
  destroy(): void {
    this.stopRefresh();
    this.listeners.clear();
    this.tokens = null;
  }

  private emit(event: TokenManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Token manager event listener error:", error);
      }
    }
  }

  private scheduleRefresh(): void {
    this.stopRefresh();

    if (!this.tokens) return;

    const timeRemaining = getTokenTimeRemaining(this.tokens);
    const refreshTime = timeRemaining - this.config.refreshBufferMs;

    // Emit warning if token is expiring soon
    if (timeRemaining <= (this.config.warningBufferMs ?? 300_000)) {
      this.emit({
        type: "token_expiring_soon",
        timeRemaining,
      });
    }

    if (refreshTime <= 0) {
      // Token needs immediate refresh
      this.performRefresh().catch(() => {
        // Error already handled in performRefresh
      });
    } else {
      // Schedule refresh
      this.refreshTimer = setTimeout(() => {
        this.performRefresh().catch(() => {
          // Error already handled in performRefresh
        });
      }, Math.min(refreshTime, this.config.checkIntervalMs ?? 30_000));
    }
  }

  private async performRefresh(): Promise<TokenSet> {
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      return new Promise((resolve, reject) => {
        const check = () => {
          if (!this.isRefreshing) {
            if (this.tokens) {
              resolve(this.tokens);
            } else {
              reject(new Error("Refresh failed"));
            }
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }

    if (!this.tokens?.refresh_token) {
      const error = new Error("No refresh token available");
      this.emit({
        type: "reauthentication_required",
        reason: "No refresh token",
      });
      throw error;
    }

    if (!this.config.clientSecret) {
      const error = new Error("Client secret required");
      this.emit({
        type: "token_refresh_failed",
        error,
        retryable: false,
      });
      throw error;
    }

    this.isRefreshing = true;

    try {
      const newTokens = await refreshAccessToken(
        this.tokens.refresh_token,
        this.config.clientId,
        this.config.clientSecret,
        this.config.tokenUrl,
        this.config
      );

      this.tokens = newTokens;
      this.emit({ type: "token_refreshed", tokens: newTokens });
      this.scheduleRefresh();

      return newTokens;
    } catch (error) {
      if (error instanceof InvalidGrantError) {
        // Token was revoked - need re-authentication
        this.tokens = null;
        this.emit({
          type: "reauthentication_required",
          reason: error.message,
        });
      } else if (error instanceof TokenRefreshError) {
        this.emit({
          type: "token_refresh_failed",
          error,
          retryable: error.retryable,
        });

        if (!error.retryable) {
          this.tokens = null;
          this.emit({
            type: "reauthentication_required",
            reason: "Token refresh failed permanently",
          });
        }
      } else {
        this.emit({
          type: "token_refresh_failed",
          error: error as Error,
          retryable: true,
        });
      }

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}

/**
 * Create a token manager with the given configuration
 */
export function createTokenManager(config: TokenManagerConfig): TokenManager {
  return new TokenManager(config);
}

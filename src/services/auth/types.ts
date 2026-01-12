/**
 * Authentication Types
 */

export type AuthProviderName = "claude" | "codex" | "gemini" | "antigravity";

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  provider: AuthProviderName;
  type: "api_key" | "oauth";
  expiresAt: number; // Unix timestamp in milliseconds
  scopes?: string[];
  accountId?: string; // For multi-account support
}

export interface AuthResult {
  success: boolean;
  provider?: AuthProviderName;
  error?: string;
  accountId?: string;
}

export interface AuthStatus {
  provider: AuthProviderName;
  displayName: string;
  authenticated: boolean;
  type?: "api_key" | "oauth";
  expiresAt?: number;
  needsRefresh?: boolean;
  accountId?: string;
  accountCount?: number;
}

export interface LoginOptions {
  apiKey?: string;
  interactive?: boolean;
  accountId?: string; // Specify which account to use/update
}

export interface AuthProvider {
  readonly name: AuthProviderName;
  readonly displayName: string;

  login(options?: LoginOptions): Promise<AuthResult>;
  logout(accountId?: string): Promise<void>;
  refresh?(accountId?: string): Promise<TokenData>;
  getToken(accountId?: string): Promise<string | null>;
  isAuthenticated(accountId?: string): Promise<boolean>;
}

/**
 * OAuth-specific types
 */
export interface OAuthState {
  provider: AuthProviderName;
  state: string;
  codeVerifier: string;
  createdAt: number;
  accountId?: string;
}

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

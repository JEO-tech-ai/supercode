/**
 * Authentication Types
 */

export type AuthProviderName = "claude" | "codex" | "gemini";

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  provider: AuthProviderName;
  type: "api_key" | "oauth";
  expiresAt: number; // Unix timestamp in milliseconds
  scopes?: string[];
}

export interface AuthResult {
  success: boolean;
  provider?: AuthProviderName;
  error?: string;
}

export interface AuthStatus {
  provider: AuthProviderName;
  displayName: string;
  authenticated: boolean;
  type?: "api_key" | "oauth";
  expiresAt?: number;
  needsRefresh?: boolean;
}

export interface LoginOptions {
  apiKey?: string;
  interactive?: boolean;
}

export interface AuthProvider {
  readonly name: AuthProviderName;
  readonly displayName: string;

  login(options?: LoginOptions): Promise<AuthResult>;
  logout(): Promise<void>;
  refresh?(): Promise<TokenData>;
  getToken(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
}

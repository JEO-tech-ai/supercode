import { z } from "zod";

export type AuthProviderName = "claude" | "codex" | "gemini" | "antigravity" | "github";
export type AuthGrantType = "authorization_code" | "device_flow" | "api_key";

export const TokenDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  provider: z.enum(["claude", "codex", "gemini", "antigravity", "github"]),
  type: z.enum(["api_key", "oauth"]),
  expiresAt: z.number(),
  timestamp: z.number().optional(),
  scopes: z.array(z.string()).optional(),
  accountId: z.string().optional(),
  email: z.string().optional(),
  projectId: z.string().optional(),
  managedProjectId: z.string().optional(),
});

export type TokenData = z.infer<typeof TokenDataSchema>;

export function parseTokenData(data: unknown): TokenData | null {
  const result = TokenDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Managed Token format (oh-my-opencode pattern)
 * Format: refreshToken|projectId|managedProjectId
 */
export interface ManagedToken {
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
}

export interface AuthResult {
  success: boolean;
  provider?: AuthProviderName;
  error?: string;
  errorCode?: string;
  accountId?: string;
  email?: string;
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
  email?: string;
}

export interface LoginOptions {
  apiKey?: string;
  interactive?: boolean;
  accountId?: string; // Specify which account to use/update
  useDeviceAuth?: boolean; // For ChatGPT OAuth device flow
  scopes?: string[]; // Custom scopes
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
  redirectUri?: string;
  nonce?: string;
}

export interface PKCEPair {
  verifier: string;
  challenge: string;
  method: "S256";
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Device Authorization Flow (RFC 8628)
 * Used for ChatGPT OAuth
 */
export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Token Refresh Error Types
 */
export class TokenRefreshError extends Error {
  code?: string;
  description?: string;
  status: number;
  statusText: string;
  responseBody?: string;

  constructor(message: string, options?: {
    code?: string;
    description?: string;
    status?: number;
    statusText?: string;
    responseBody?: string;
  }) {
    super(message);
    this.name = "TokenRefreshError";
    this.code = options?.code;
    this.description = options?.description;
    this.status = options?.status ?? 0;
    this.statusText = options?.statusText ?? "";
    this.responseBody = options?.responseBody;
  }

  get isInvalidGrant(): boolean {
    return this.code === "invalid_grant";
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isRetryable(): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504, 0];
    return retryableStatuses.includes(this.status) && !this.isInvalidGrant;
  }
}

/**
 * Fetch Interceptor Types
 */
export interface FetchInterceptorOptions {
  provider: AuthProviderName;
  accountId?: string;
  autoRefresh?: boolean;
  endpointFallback?: boolean;
}

export interface InterceptedResponse extends Response {
  fromCache?: boolean;
  retriedCount?: number;
}

/**
 * Token Exchange Types
 */
export interface TokenExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * User Info Types
 */
export interface UserInfo {
  email: string;
  name?: string;
  picture?: string;
  id?: string;
}

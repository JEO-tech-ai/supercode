
export interface AuthSession {
  id: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface AuthConfig {
  githubClientId?: string;
  githubClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  claudeClientId?: string;
  claudeClientSecret?: string;
  jwtSecret: string;
  baseUrl?: string;
  cookieName?: string;
  cookieDomain?: string;
  secureCookie?: boolean;
}

export interface AuthContext {
  session: AuthSession | null;
  isAuthenticated: boolean;
}

export type OAuthProvider = "github" | "google" | "claude" | "codex";

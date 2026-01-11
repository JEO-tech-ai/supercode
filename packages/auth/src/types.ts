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

export interface AuthConfig {
  githubClientId: string;
  githubClientSecret: string;
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

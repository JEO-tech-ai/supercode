
export interface CodexAuthData {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export function validateCodexToken(token: string): boolean {
  // Simple validation or call OpenAI User Endpoint
  return token.startsWith("ey") || token.startsWith("sk-");
}

// Placeholder for full OAuth flow if OpenAI opens it
export const CODEX_OAUTH_URL = "https://auth0.openai.com/authorize";

/**
 * Gemini (Google) Auth Provider
 * Supports both API Key and OAuth with PKCE (via Antigravity)
 */
import * as clack from "@clack/prompts";
import { exec } from "child_process";
import { getTokenStore } from "../../server/store/token-store";
import { getOAuthStateStore } from "../../server/store/oauth-state-store";
import { startServer, isServerRunning } from "../../server/index";
import { waitForCallback } from "../../server/routes/auth-callback";
import type {
  AuthProvider,
  TokenData,
  AuthResult,
  LoginOptions,
  OAuthState,
} from "./types";
import logger from "../../shared/logger";

const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const ANTIGRAVITY_CLIENT_SECRET = "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";
const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
  "https://www.googleapis.com/auth/generative-language.retriever",
];
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_SERVER_PORT = 3100;

export class GeminiAuthProvider implements AuthProvider {
  readonly name = "gemini" as const;
  readonly displayName = "Gemini (Google)";

  private tokenStore = getTokenStore();
  private oauthStateStore = getOAuthStateStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      let apiKey = options?.apiKey || process.env.GOOGLE_API_KEY;

      if (apiKey) {
        return await this.loginWithApiKey(apiKey, options?.accountId);
      }

      if (options?.interactive !== false) {
        const authMethod = await clack.select({
          message: "Select Gemini authentication method:",
          options: [
            { value: "oauth", label: "OAuth with Antigravity (Recommended)", hint: "Browser login" },
            { value: "apikey", label: "API Key", hint: "Direct key input" },
          ],
        });

        if (clack.isCancel(authMethod)) {
          return { success: false, error: "Login cancelled" };
        }

        if (authMethod === "apikey") {
          const input = await clack.password({
            message: "Enter your Google AI API key:",
            validate: (value) => {
              if (!value) return "API key is required";
            },
          });

          if (clack.isCancel(input)) {
            return { success: false, error: "Login cancelled" };
          }
          return await this.loginWithApiKey(input as string, options?.accountId);
        } else {
          return await this.loginWithOAuth(options?.accountId);
        }
      }

      return { success: false, error: "Authentication required" };
    } catch (error) {
      logger.error("Gemini login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async loginWithApiKey(apiKey: string, accountId?: string): Promise<AuthResult> {
    const isValid = await this.validateApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key" };
    }

    const tokenData: TokenData = {
      accessToken: apiKey,
      provider: this.name,
      type: "api_key",
      expiresAt: Number.MAX_SAFE_INTEGER,
      accountId: accountId || "default",
    };

    await this.tokenStore.store(this.name, tokenData);
    return { success: true, provider: this.name, accountId: tokenData.accountId };
  }

  private async loginWithOAuth(accountId?: string): Promise<AuthResult> {
    try {
      if (!isServerRunning()) {
        await startServer({ port: DEFAULT_SERVER_PORT, host: "127.0.0.1" });
      }

      const redirectUri = `http://localhost:${DEFAULT_SERVER_PORT}/callback/${this.name}`;
      
      const { verifier, challenge } = this.oauthStateStore.generatePKCEPair();
      const state = this.oauthStateStore.generateState();

      const oauthState: OAuthState = {
        provider: this.name,
        state,
        codeVerifier: verifier,
        createdAt: Date.now(),
        accountId: accountId || `account_${Date.now()}`,
      };

      await this.oauthStateStore.store(oauthState);

      const params = new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: ANTIGRAVITY_SCOPES.join(" "),
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        access_type: "offline",
        prompt: "consent",
      });

      const authUrl = `${GOOGLE_AUTH_URL}?${params}`;

      clack.note(`Opening browser for authentication...\nIf browser doesn't open, visit:\n${authUrl}`);
      this.openBrowser(authUrl);

      const { code, state: returnedState } = await waitForCallback(this.name, 120000);

      const storedState = await this.oauthStateStore.retrieve(returnedState);
      if (!storedState || storedState.state !== returnedState) {
        throw new Error("Invalid state parameter (CSRF protection)");
      }

      await this.exchangeCode(code, storedState.codeVerifier!, redirectUri, storedState.accountId!);
      await this.oauthStateStore.delete(returnedState);

      return { success: true, provider: this.name, accountId: storedState.accountId };
    } catch (error) {
      logger.error("OAuth flow failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async logout(accountId?: string): Promise<void> {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (tokens?.type === "oauth" && tokens.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: "POST",
        });
      } catch {
        // Ignore revocation errors
      }
    }
    await this.tokenStore.delete(this.name, accountId);
  }

  async refresh(accountId?: string): Promise<TokenData> {
    const currentTokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!currentTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        refresh_token: currentTokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
    
    const newTokenData: TokenData = {
      ...currentTokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || currentTokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await this.tokenStore.store(this.name, newTokenData);
    return newTokenData;
  }

  async getToken(accountId?: string): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!tokens) return null;

    if (tokens.type === "oauth") {
      const needsRefresh = await this.tokenStore.needsRefresh(this.name, accountId);
      if (needsRefresh && tokens.refreshToken) {
        try {
          const newTokens = await this.refresh(accountId);
          return newTokens.accessToken;
        } catch {
          return null;
        }
      }
    }
    return tokens.accessToken;
  }

  async isAuthenticated(accountId?: string): Promise<boolean> {
    return this.tokenStore.isValid(this.name, accountId);
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async exchangeCode(code: string, verifier: string, redirectUri: string, accountId: string): Promise<TokenData> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${await response.text()}`);
    }

    const data = await response.json() as { 
      access_token: string; 
      refresh_token?: string; 
      expires_in: number 
    };

    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      provider: this.name,
      type: "oauth",
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: ANTIGRAVITY_SCOPES,
      accountId,
    };

    await this.tokenStore.store(this.name, tokenData);
    return tokenData;
  }

  private openBrowser(url: string) {
    const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${start} "${url}"`);
  }
}

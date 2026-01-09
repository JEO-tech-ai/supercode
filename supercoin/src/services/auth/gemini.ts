/**
 * Gemini (Google) Auth Provider
 * Supports both API Key and OAuth with PKCE (via Antigravity)
 */
import * as clack from "@clack/prompts";
import * as crypto from "crypto";
import { createServer } from "http";
import { exec } from "child_process";
import { getTokenStore } from "../../server/store/token-store";
import type {
  AuthProvider,
  TokenData,
  AuthResult,
  LoginOptions,
} from "./types";
import logger from "../../shared/logger";

// Antigravity Configuration (from OpenCode)
const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const ANTIGRAVITY_CLIENT_SECRET = "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";
const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface PKCEPair {
  verifier: string;
  challenge: string;
}

export class GeminiAuthProvider implements AuthProvider {
  readonly name = "gemini" as const;
  readonly displayName = "Gemini (Google)";

  private tokenStore = getTokenStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      // Check for API key in env or options first (Legacy/Direct mode)
      let apiKey = options?.apiKey || process.env.GOOGLE_API_KEY;

      if (apiKey) {
        return await this.loginWithApiKey(apiKey);
      }

      // Interactive Flow
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
          return await this.loginWithApiKey(input as string);
        } else {
          return await this.loginWithOAuth();
        }
      }

      return { success: false, error: "Authentication required" };
    } catch (error) {
      logger.error("Gemini login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async loginWithApiKey(apiKey: string): Promise<AuthResult> {
    const isValid = await this.validateApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key" };
    }

    const tokenData: TokenData = {
      accessToken: apiKey,
      provider: this.name,
      type: "api_key",
      expiresAt: Number.MAX_SAFE_INTEGER,
    };

    await this.tokenStore.store(this.name, tokenData);
    return { success: true, provider: this.name };
  }

  private async loginWithOAuth(): Promise<AuthResult> {
    // Start temporary callback server
    const server = await this.startCallbackServer();
    const redirectUri = `http://localhost:${server.port}/oauth-callback`;

    // Generate PKCE
    const { verifier, challenge } = this.generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // Build URL
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

    clack.note("Opening browser for authentication...");
    this.openBrowser(authUrl);

    try {
      const { code } = await server.waitForCallback();
      
      // Exchange code
      const tokens = await this.exchangeCode(code, verifier, redirectUri);
      
      return { success: true, provider: this.name };
    } finally {
      server.close();
    }
  }

  async logout(): Promise<void> {
    const tokens = await this.tokenStore.retrieve(this.name);
    if (tokens?.type === "oauth" && tokens.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: "POST",
        });
      } catch {
        // Ignore
      }
    }
    await this.tokenStore.delete(this.name);
  }

  async refresh(): Promise<TokenData> {
    const currentTokens = await this.tokenStore.retrieve(this.name);
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

    const data = await response.json() as { access_token: string; expires_in: number };
    const newTokenData: TokenData = {
      ...currentTokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await this.tokenStore.store(this.name, newTokenData);
    return newTokenData;
  }

  async getToken(): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name);
    if (!tokens) return null;

    if (tokens.type === "oauth") {
      const needsRefresh = await this.tokenStore.needsRefresh(this.name);
      if (needsRefresh && tokens.refreshToken) {
        try {
          const newTokens = await this.refresh();
          return newTokens.accessToken;
        } catch {
          return null;
        }
      }
    }
    return tokens.accessToken;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokenStore.isValid(this.name);
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

  private generatePKCE(): PKCEPair {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }

  private async exchangeCode(code: string, verifier: string, redirectUri: string): Promise<TokenData> {
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
    };

    await this.tokenStore.store(this.name, tokenData);
    return tokenData;
  }

  private startCallbackServer(): Promise<{ port: number; waitForCallback: () => Promise<{ code: string }>; close: () => void }> {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url || "", `http://localhost:${(server.address() as any).port}`);
        
        if (url.pathname === "/oauth-callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          res.writeHead(200, { "Content-Type": "text/html" });
          if (code) {
            res.end("<html><body><h1>Login successful</h1><p>You can close this window.</p></body></html>");
            if (this.callbackResolve) {
              this.callbackResolve({ code });
            }
          } else {
            res.end(`<html><body><h1>Login failed</h1><p>${error}</p></body></html>`);
            if (this.callbackReject) {
              this.callbackReject(new Error(error || "Unknown error"));
            }
          }
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      });

      server.listen(0, () => {
        resolve({
          port: (server.address() as any).port,
          waitForCallback: () => new Promise<{ code: string }>((res, rej) => {
            this.callbackResolve = res;
            this.callbackReject = rej;
          }),
          close: () => server.close(),
        });
      });
    });
  }

  private callbackResolve?: (value: { code: string }) => void;
  private callbackReject?: (reason: any) => void;

  private openBrowser(url: string) {
    const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${start} "${url}"`);
  }
}

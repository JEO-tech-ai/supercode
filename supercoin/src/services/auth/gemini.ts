/**
 * Gemini (Google) Auth Provider
 * Supports both API Key and OAuth with PKCE
 */
import * as clack from "@clack/prompts";
import * as crypto from "crypto";
import { getTokenStore } from "../../server/store/token-store";
import type {
  AuthProvider,
  TokenData,
  AuthResult,
  LoginOptions,
} from "./types";
import logger from "../../shared/logger";

interface PKCEPair {
  verifier: string;
  challenge: string;
}

export class GeminiAuthProvider implements AuthProvider {
  readonly name = "gemini" as const;
  readonly displayName = "Gemini (Google)";

  private tokenStore = getTokenStore();

  // OAuth configuration
  private readonly authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly tokenUrl = "https://oauth2.googleapis.com/token";
  private readonly clientId = process.env.GOOGLE_CLIENT_ID || "";
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  private readonly redirectUri = "http://localhost:3100/callback/gemini";

  private readonly scopes = [
    "https://www.googleapis.com/auth/generative-language",
  ];

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      // Check for API key first
      let apiKey = options?.apiKey || process.env.GOOGLE_API_KEY;

      if (apiKey) {
        // API key flow
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

      // Interactive API key input
      if (options?.interactive !== false) {
        const input = await clack.password({
          message: "Enter your Google AI API key:",
          validate: (value) => {
            if (!value) return "API key is required";
          },
        });

        if (clack.isCancel(input)) {
          return { success: false, error: "Login cancelled" };
        }

        apiKey = input as string;

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

      return { success: false, error: "API key is required" };
    } catch (error) {
      logger.error("Gemini login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async logout(): Promise<void> {
    const tokens = await this.tokenStore.retrieve(this.name);

    // Revoke OAuth token if applicable
    if (tokens?.type === "oauth" && tokens.accessToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
          { method: "POST" }
        );
      } catch {
        // Ignore revoke errors
      }
    }

    await this.tokenStore.delete(this.name);
  }

  async refresh(): Promise<TokenData> {
    const currentTokens = await this.tokenStore.retrieve(this.name);

    if (!currentTokens) {
      throw new Error("No tokens to refresh");
    }

    // API keys don't need refresh
    if (currentTokens.type === "api_key") {
      return currentTokens;
    }

    if (!currentTokens.refreshToken) {
      throw new Error("No refresh token available. Please login again.");
    }

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: currentTokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed. Please login again.");
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    const newTokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: currentTokens.refreshToken,
      provider: this.name,
      type: "oauth",
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: this.scopes,
    };

    await this.tokenStore.store(this.name, newTokenData);
    return newTokenData;
  }

  async getToken(): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name);
    if (!tokens) return null;

    // Check if OAuth token needs refresh
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
    } catch (error) {
      logger.error("API key validation failed", error as Error);
      return false;
    }
  }

  // PKCE helpers for OAuth flow
  private generatePKCE(): PKCEPair {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");

    return { verifier, challenge };
  }

  // Build OAuth authorization URL
  buildAuthUrl(): { url: string; verifier: string } {
    const { verifier, challenge } = this.generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return {
      url: `${this.authUrl}?${params}`,
      verifier,
    };
  }

  // Exchange authorization code for tokens
  async exchangeCode(code: string, verifier: string): Promise<TokenData> {
    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };

    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      provider: this.name,
      type: "oauth",
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: this.scopes,
    };

    await this.tokenStore.store(this.name, tokenData);
    return tokenData;
  }
}

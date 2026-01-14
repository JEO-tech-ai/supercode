/**
 * Codex (OpenAI/ChatGPT) Auth Provider
 * Supports both API Key and ChatGPT OAuth (Device Authorization Flow)
 *
 * Reference: https://developers.openai.com/codex/auth/
 */
import * as clack from "@clack/prompts";
import { exec } from "child_process";
import { getTokenStore } from "../../server/store/token-store";
import { CODEX_CONFIG, debugLog } from "../../config/providers";
import type {
  AuthProvider,
  TokenData,
  AuthResult,
  LoginOptions,
  DeviceAuthResponse,
  DeviceTokenResponse,
  TokenRefreshError,
} from "./types";
import logger from "../../shared/logger";

const DEVICE_AUTH_URL = "https://auth.openai.com/oauth/device/code";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max

export class CodexAuthProvider implements AuthProvider {
  readonly name = "codex" as const;
  readonly displayName = "Codex (OpenAI/ChatGPT)";

  private tokenStore = getTokenStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      // Priority: options.apiKey > env > interactive prompt
      let apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

      if (apiKey) {
        return await this.loginWithApiKey(apiKey, options?.accountId);
      }

      if (options?.interactive !== false) {
        const authMethod = await clack.select({
          message: "Select OpenAI authentication method:",
          options: [
            { value: "oauth", label: "ChatGPT OAuth (Recommended)", hint: "ChatGPT Plus/Pro/Business subscribers" },
            { value: "apikey", label: "API Key", hint: "Direct key input" },
          ],
        });

        if (clack.isCancel(authMethod)) {
          return { success: false, error: "Login cancelled" };
        }

        if (authMethod === "apikey") {
          clack.note(
            "Get your API key from:\n" +
            "https://platform.openai.com/api-keys"
          );

          const input = await clack.password({
            message: "Enter your OpenAI API key:",
            validate: (value) => {
              if (!value) return "API key is required";
              if (!value.startsWith("sk-")) {
                return "Invalid API key format (should start with sk-)";
              }
            },
          });

          if (clack.isCancel(input)) {
            return { success: false, error: "Login cancelled" };
          }

          return await this.loginWithApiKey(input as string, options?.accountId);
        } else {
          return await this.loginWithDeviceAuth(options?.accountId);
        }
      }

      return { success: false, error: "Authentication required" };
    } catch (error) {
      logger.error("Codex login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Login with API Key
   */
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

  /**
   * Login with ChatGPT OAuth Device Authorization Flow (RFC 8628)
   *
   * Flow:
   * 1. Request device code from OpenAI
   * 2. Display user_code and verification_uri to user
   * 3. Poll for token while user authenticates in browser
   * 4. Store tokens on success
   */
  private async loginWithDeviceAuth(accountId?: string): Promise<AuthResult> {
    try {
      debugLog("codex-oauth", "Starting device authorization flow");

      // Step 1: Request device code
      const deviceResponse = await this.requestDeviceCode();

      // Step 2: Show user code and open browser
      const { user_code, verification_uri, verification_uri_complete, expires_in, interval } = deviceResponse;

      clack.note(
        `Visit: ${verification_uri_complete || verification_uri}\n\n` +
        `Enter code: ${user_code}\n\n` +
        `This code expires in ${Math.floor(expires_in / 60)} minutes.`
      );

      // Open browser automatically
      if (verification_uri_complete) {
        this.openBrowser(verification_uri_complete);
      } else {
        this.openBrowser(verification_uri);
      }

      // Step 3: Poll for token
      const spinner = clack.spinner();
      spinner.start("Waiting for authentication...");

      const pollInterval = Math.max(interval * 1000, POLL_INTERVAL_MS);
      const maxAttempts = Math.min(Math.floor(expires_in * 1000 / pollInterval), MAX_POLL_ATTEMPTS);

      let tokenResponse: DeviceTokenResponse | null = null;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await this.sleep(pollInterval);
        attempts++;

        try {
          const response = await this.pollForToken(deviceResponse.device_code);

          if (response.error === "authorization_pending") {
            spinner.message(`Waiting for authentication... (${attempts}/${maxAttempts})`);
            continue;
          }

          if (response.error === "slow_down") {
            // Increase poll interval
            await this.sleep(pollInterval);
            continue;
          }

          if (response.error === "access_denied") {
            spinner.stop("Authentication denied");
            return { success: false, error: "Access denied by user", errorCode: "access_denied" };
          }

          if (response.error === "expired_token") {
            spinner.stop("Code expired");
            return { success: false, error: "Device code expired", errorCode: "expired_token" };
          }

          if (response.access_token) {
            tokenResponse = response as DeviceTokenResponse;
            break;
          }
        } catch (pollError) {
          debugLog("codex-oauth", "Poll error:", pollError);
          // Continue polling on transient errors
        }
      }

      if (!tokenResponse) {
        spinner.stop("Authentication timeout");
        return { success: false, error: "Authentication timeout" };
      }

      spinner.stop("Authentication successful!");

      // Step 4: Store tokens
      const tokenData: TokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        provider: this.name,
        type: "oauth",
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        timestamp: Date.now(),
        accountId: accountId || `chatgpt_${Date.now()}`,
        scopes: tokenResponse.scope?.split(" "),
      };

      await this.tokenStore.store(this.name, tokenData);

      debugLog("codex-oauth", "Token stored successfully");
      return { success: true, provider: this.name, accountId: tokenData.accountId };
    } catch (error) {
      logger.error("Device auth flow failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Request device code from OpenAI
   */
  private async requestDeviceCode(): Promise<DeviceAuthResponse> {
    const response = await fetch(DEVICE_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CODEX_CONFIG.clientId,
        scope: CODEX_CONFIG.scopes.join(" "),
      }),
    });

    if (!response.ok) {
      throw new Error(`Device code request failed: ${response.status}`);
    }

    return response.json() as Promise<DeviceAuthResponse>;
  }

  /**
   * Poll for token with device code
   */
  private async pollForToken(deviceCode: string): Promise<DeviceTokenResponse & { error?: string }> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CODEX_CONFIG.clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await response.json() as Partial<DeviceTokenResponse> & { error?: string };

    if (!response.ok && data.error) {
      return { error: data.error } as DeviceTokenResponse & { error: string };
    }

    return data as DeviceTokenResponse;
  }

  /**
   * Refresh OAuth token
   */
  async refresh(accountId?: string): Promise<TokenData> {
    const currentTokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!currentTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    debugLog("codex-oauth", "Refreshing token...");

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CODEX_CONFIG.clientId,
        refresh_token: currentTokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(`Token refresh failed: ${errorData.error || response.status}`);
    }

    const data = await response.json() as DeviceTokenResponse;

    const newTokenData: TokenData = {
      ...currentTokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || currentTokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      timestamp: Date.now(),
    };

    await this.tokenStore.store(this.name, newTokenData);
    debugLog("codex-oauth", "Token refreshed successfully");

    return newTokenData;
  }

  async logout(accountId?: string): Promise<void> {
    await this.tokenStore.delete(this.name, accountId);
  }

  async getToken(accountId?: string): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!tokens) return null;

    // Auto-refresh OAuth tokens if needed
    if (tokens.type === "oauth") {
      const needsRefresh = await this.tokenStore.needsRefresh(this.name, accountId);
      if (needsRefresh && tokens.refreshToken) {
        try {
          const newTokens = await this.refresh(accountId);
          return newTokens.accessToken;
        } catch (error) {
          debugLog("codex-oauth", "Auto-refresh failed:", error);
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
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      logger.error("API key validation failed", error as Error);
      return false;
    }
  }

  private openBrowser(url: string) {
    const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${start} "${url}"`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Antigravity Auth Provider
 * Implements AuthProvider interface for Google Antigravity OAuth.
 * Uses standalone OAuth flow with embedded callback server.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import * as clack from "@clack/prompts";
import { exec } from "child_process";
import { getTokenStore } from "../../../server/store/token-store";
import type { AuthProvider, TokenData, AuthResult, LoginOptions } from "../types";
import logger from "../../../shared/logger";
import { performOAuthFlow, fetchUserInfo } from "./oauth";
import { refreshAccessToken, isTokenExpired } from "./token";
import { fetchProjectContext, clearProjectContextCache } from "./project";
import { ANTIGRAVITY_SCOPES } from "./constants";
import type { AntigravityTokens } from "./types";

export class AntigravityAuthProvider implements AuthProvider {
  readonly name = "antigravity" as const;
  readonly displayName = "Google Antigravity";

  private tokenStore = getTokenStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      if (options?.interactive !== false) {
        clack.intro("Antigravity OAuth Login");

        const confirm = await clack.confirm({
          message: "Start Antigravity OAuth flow? A browser window will open.",
          initialValue: true,
        });

        if (clack.isCancel(confirm) || !confirm) {
          return { success: false, error: "Login cancelled" };
        }

        return await this.loginWithOAuth(options?.accountId);
      }

      return { success: false, error: "Interactive authentication required for Antigravity" };
    } catch (error) {
      logger.error("Antigravity login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async loginWithOAuth(accountId?: string): Promise<AuthResult> {
    const spinner = clack.spinner();
    spinner.start("Starting OAuth flow...");

    try {
      const result = await performOAuthFlow(undefined, async (url) => {
        spinner.message("Opening browser for authentication...");
        clack.note(`If browser doesn't open, visit:\n${url}`);
        this.openBrowser(url);
      });

      spinner.message("Exchanging tokens...");

      // Fetch project context
      const projectContext = await fetchProjectContext(result.tokens.access_token);

      // Build tokens object
      const antigravityTokens: AntigravityTokens = {
        type: "antigravity",
        access_token: result.tokens.access_token,
        refresh_token: result.tokens.refresh_token,
        expires_in: result.tokens.expires_in,
        timestamp: Date.now(),
        email: result.userInfo.email,
        project_id: projectContext.cloudaicompanionProject,
      };

      // Convert to TokenData format for storage
      const tokenData: TokenData = {
        accessToken: antigravityTokens.access_token,
        refreshToken: antigravityTokens.refresh_token,
        provider: this.name,
        type: "oauth",
        expiresAt: Date.now() + antigravityTokens.expires_in * 1000,
        scopes: [...ANTIGRAVITY_SCOPES],
        accountId: accountId || result.userInfo.email || `account_${Date.now()}`,
      };

      await this.tokenStore.store(this.name, tokenData);

      spinner.stop(`Logged in as ${result.userInfo.email}`);
      return {
        success: true,
        provider: this.name,
        accountId: tokenData.accountId
      };
    } catch (error) {
      spinner.stop("OAuth flow failed");
      logger.error("Antigravity OAuth flow failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async logout(accountId?: string): Promise<void> {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (tokens?.accessToken) {
      // Revoke token with Google
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
          { method: "POST" }
        );
      } catch {
        // Ignore revocation errors
      }
    }

    // Clear project context cache
    clearProjectContextCache();

    // Delete stored tokens
    await this.tokenStore.delete(this.name, accountId);
  }

  async refresh(accountId?: string): Promise<TokenData> {
    const currentTokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!currentTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const refreshResult = await refreshAccessToken(currentTokens.refreshToken);

    // Clear project context cache on refresh
    clearProjectContextCache();

    // Fetch updated project context
    const projectContext = await fetchProjectContext(refreshResult.access_token);

    // Fetch user info to get email
    let email: string | undefined;
    try {
      const userInfo = await fetchUserInfo(refreshResult.access_token);
      email = userInfo.email;
    } catch {
      // Keep existing account ID if user info fetch fails
    }

    const newTokenData: TokenData = {
      ...currentTokens,
      accessToken: refreshResult.access_token,
      refreshToken: refreshResult.refresh_token,
      expiresAt: Date.now() + refreshResult.expires_in * 1000,
      accountId: email || currentTokens.accountId,
    };

    await this.tokenStore.store(this.name, newTokenData);
    return newTokenData;
  }

  async getToken(accountId?: string): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!tokens) return null;

    // Check if token needs refresh
    const needsRefresh = await this.tokenStore.needsRefresh(this.name, accountId);
    if (needsRefresh && tokens.refreshToken) {
      try {
        const newTokens = await this.refresh(accountId);
        return newTokens.accessToken;
      } catch (error) {
        logger.error("Token refresh failed", error as Error);
        return null;
      }
    }

    return tokens.accessToken;
  }

  async isAuthenticated(accountId?: string): Promise<boolean> {
    return this.tokenStore.isValid(this.name, accountId);
  }

  /**
   * Get project context for API calls.
   * Returns cached context or fetches new one.
   */
  async getProjectContext(accountId?: string): Promise<string | null> {
    const token = await this.getToken(accountId);
    if (!token) return null;

    try {
      const context = await fetchProjectContext(token);
      return context.cloudaicompanionProject || null;
    } catch {
      return null;
    }
  }

  private openBrowser(url: string): void {
    const start =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(`${start} "${url}"`);
  }
}

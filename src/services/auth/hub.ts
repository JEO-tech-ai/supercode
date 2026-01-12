/**
 * Auth Hub
 * Unified authentication manager for all providers
 */
import { ClaudeAuthProvider } from "./claude";
import { CodexAuthProvider } from "./codex";
import { GeminiAuthProvider } from "./gemini";
import { AntigravityAuthProvider } from "./antigravity";
import { getTokenStore } from "../../server/store/token-store";
import type {
  AuthProvider,
  AuthProviderName,
  AuthResult,
  AuthStatus,
  LoginOptions,
  TokenData,
} from "./types";
import logger from "../../shared/logger";

export class AuthHub {
  private providers: Map<AuthProviderName, AuthProvider>;
  private tokenStore = getTokenStore();

  constructor() {
    this.providers = new Map<AuthProviderName, AuthProvider>([
      ["claude", new ClaudeAuthProvider()],
      ["codex", new CodexAuthProvider()],
      ["gemini", new GeminiAuthProvider()],
      ["antigravity", new AntigravityAuthProvider()],
    ]);
  }

  /**
   * Login to specific provider or interactively select
   */
  async login(
    providerName?: AuthProviderName,
    options?: LoginOptions
  ): Promise<AuthResult[]> {
    const results: AuthResult[] = [];

    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return [{ success: false, error: `Unknown provider: ${providerName}` }];
      }
      return [await provider.login(options)];
    }

    for (const [name, provider] of this.providers) {
      const result = await provider.login(options);
      results.push({ ...result, provider: name });
    }

    return results;
  }

  /**
   * Get authentication status for all providers
   */
  async status(): Promise<AuthStatus[]> {
    const statuses: AuthStatus[] = [];

    for (const [name, provider] of this.providers) {
      const allTokens = await this.tokenStore.retrieveAll(name);
      
      if (allTokens.length === 0) {
        statuses.push({
          provider: name,
          displayName: provider.displayName,
          authenticated: false,
          accountCount: 0,
        });
      } else {
        for (const tokens of allTokens) {
          const isAuthenticated = await provider.isAuthenticated(tokens.accountId);
          statuses.push({
            provider: name,
            displayName: provider.displayName,
            authenticated: isAuthenticated,
            type: tokens.type,
            expiresAt: tokens.expiresAt,
            accountId: tokens.accountId,
            accountCount: allTokens.length,
            needsRefresh: tokens.type === "oauth"
              ? await this.tokenStore.needsRefresh(name, tokens.accountId)
              : false,
          });
        }
      }
    }

    return statuses;
  }

  /**
   * Refresh tokens for specific provider or all
   */
  async refresh(providerName?: AuthProviderName, accountId?: string): Promise<AuthResult[]> {
    const results: AuthResult[] = [];

    const providers = providerName
      ? [[providerName, this.providers.get(providerName)!]]
      : Array.from(this.providers.entries());

    for (const [name, provider] of providers as [AuthProviderName, AuthProvider][]) {
      if (provider?.refresh) {
        try {
          await provider.refresh(accountId);
          results.push({ success: true, provider: name, accountId });
        } catch (error) {
          results.push({
            success: false,
            provider: name,
            accountId,
            error: (error as Error).message,
          });
        }
      } else {
        results.push({
          success: true,
          provider: name,
          accountId,
        });
      }
    }

    return results;
  }

  /**
   * Logout from specific provider or all
   */
  async logout(providerName?: AuthProviderName, accountId?: string): Promise<void> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        await provider.logout(accountId);
      }
      return;
    }

    for (const provider of this.providers.values()) {
      await provider.logout(accountId);
    }
  }

  /**
   * Get token for specific provider
   */
  async getToken(providerName: AuthProviderName, accountId?: string): Promise<string | null> {
    const provider = this.providers.get(providerName);
    if (!provider) return null;
    return provider.getToken(accountId);
  }

  /**
   * Check if specific provider is authenticated
   */
  async isAuthenticated(providerName: AuthProviderName, accountId?: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.isAuthenticated(accountId);
  }

  /**
   * Get provider instance
   */
  getProvider(providerName: AuthProviderName): AuthProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Map model provider to auth provider name
   */
  mapModelProviderToAuth(modelProvider: string): AuthProviderName | null {
    const mapping: Record<string, AuthProviderName> = {
      anthropic: "claude",
      openai: "codex",
      google: "gemini",
      antigravity: "antigravity",
    };
    return mapping[modelProvider] || null;
  }
}

// Singleton instance
let authHubInstance: AuthHub | null = null;

export function getAuthHub(): AuthHub {
  if (!authHubInstance) {
    authHubInstance = new AuthHub();
  }
  return authHubInstance;
}

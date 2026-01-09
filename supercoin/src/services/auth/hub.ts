/**
 * Auth Hub
 * Unified authentication manager for all providers
 */
import { ClaudeAuthProvider } from "./claude";
import { CodexAuthProvider } from "./codex";
import { GeminiAuthProvider } from "./gemini";
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

    // Login to all providers if none specified
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
      const isAuthenticated = await provider.isAuthenticated();
      const tokens = await this.tokenStore.retrieve(name);

      statuses.push({
        provider: name,
        displayName: provider.displayName,
        authenticated: isAuthenticated,
        type: tokens?.type,
        expiresAt: tokens?.expiresAt,
        needsRefresh: tokens?.type === "oauth"
          ? await this.tokenStore.needsRefresh(name)
          : false,
      });
    }

    return statuses;
  }

  /**
   * Refresh tokens for specific provider or all
   */
  async refresh(providerName?: AuthProviderName): Promise<AuthResult[]> {
    const results: AuthResult[] = [];

    const providers = providerName
      ? [[providerName, this.providers.get(providerName)!]]
      : Array.from(this.providers.entries());

    for (const [name, provider] of providers as [AuthProviderName, AuthProvider][]) {
      if (provider?.refresh) {
        try {
          await provider.refresh();
          results.push({ success: true, provider: name });
        } catch (error) {
          results.push({
            success: false,
            provider: name,
            error: (error as Error).message,
          });
        }
      } else {
        results.push({
          success: true,
          provider: name,
        });
      }
    }

    return results;
  }

  /**
   * Logout from specific provider or all
   */
  async logout(providerName?: AuthProviderName): Promise<void> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        await provider.logout();
      }
      return;
    }

    // Logout from all providers
    for (const provider of this.providers.values()) {
      await provider.logout();
    }
  }

  /**
   * Get token for specific provider
   */
  async getToken(providerName: AuthProviderName): Promise<string | null> {
    const provider = this.providers.get(providerName);
    if (!provider) return null;
    return provider.getToken();
  }

  /**
   * Check if specific provider is authenticated
   */
  async isAuthenticated(providerName: AuthProviderName): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.isAuthenticated();
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

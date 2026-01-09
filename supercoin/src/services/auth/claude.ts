/**
 * Claude (Anthropic) Auth Provider
 */
import * as clack from "@clack/prompts";
import { getTokenStore } from "../../server/store/token-store";
import type {
  AuthProvider,
  TokenData,
  AuthResult,
  LoginOptions,
} from "./types";
import logger from "../../shared/logger";

export class ClaudeAuthProvider implements AuthProvider {
  readonly name = "claude" as const;
  readonly displayName = "Claude (Anthropic)";

  private tokenStore = getTokenStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      // Priority: options.apiKey > env > interactive prompt
      let apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;

      if (!apiKey && options?.interactive !== false) {
        clack.note(
          "Get your API key from:\n" +
          "https://console.anthropic.com/settings/keys"
        );

        const input = await clack.password({
          message: "Enter your Anthropic API key:",
          validate: (value) => {
            if (!value) return "API key is required";
            if (!value.startsWith("sk-ant-")) {
              return "Invalid API key format (should start with sk-ant-)";
            }
          },
        });

        if (clack.isCancel(input)) {
          return { success: false, error: "Login cancelled" };
        }

        apiKey = input as string;
      }

      if (!apiKey) {
        return { success: false, error: "API key is required" };
      }

      // Validate API key
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        return { success: false, error: "Invalid API key" };
      }

      // Store token
      const tokenData: TokenData = {
        accessToken: apiKey,
        provider: this.name,
        type: "api_key",
        expiresAt: Number.MAX_SAFE_INTEGER, // API keys don't expire
      };

      await this.tokenStore.store(this.name, tokenData);

      return { success: true, provider: this.name };
    } catch (error) {
      logger.error("Claude login failed", error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async logout(): Promise<void> {
    await this.tokenStore.delete(this.name);
  }

  async getToken(): Promise<string | null> {
    const tokens = await this.tokenStore.retrieve(this.name);
    return tokens?.accessToken ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokenStore.isValid(this.name);
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });

      // 200 or 400 (bad request) means key is valid
      // 401 means invalid key
      return response.status !== 401;
    } catch (error) {
      logger.error("API key validation failed", error as Error);
      return false;
    }
  }
}

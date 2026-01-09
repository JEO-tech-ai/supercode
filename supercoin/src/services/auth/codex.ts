/**
 * Codex (OpenAI) Auth Provider
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

export class CodexAuthProvider implements AuthProvider {
  readonly name = "codex" as const;
  readonly displayName = "Codex (OpenAI)";

  private tokenStore = getTokenStore();

  async login(options?: LoginOptions): Promise<AuthResult> {
    try {
      // Priority: options.apiKey > env > interactive prompt
      let apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

      if (!apiKey && options?.interactive !== false) {
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
        expiresAt: Number.MAX_SAFE_INTEGER,
      };

      await this.tokenStore.store(this.name, tokenData);

      return { success: true, provider: this.name };
    } catch (error) {
      logger.error("Codex login failed", error as Error);
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
}

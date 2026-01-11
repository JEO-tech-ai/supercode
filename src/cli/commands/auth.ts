import { Command } from "commander";
import * as clack from "@clack/prompts";
import type { SuperCoinConfig } from "../../config/schema";
import { getAuthHub, type AuthProviderName, type AuthStatus } from "../../services/auth";
import { UI, CancelledError, Dialog, Toast } from "../../shared/ui";
import logger from "../../shared/logger";

export function createAuthCommand(config: SuperCoinConfig): Command {
  const auth = new Command("auth")
    .description("Manage authentication for AI providers");

  const authHub = getAuthHub();

  // Login command
  auth
    .command("login")
    .description("Authenticate with AI providers")
    .option("--claude", "Login to Claude (Anthropic)")
    .option("--codex", "Login to Codex (OpenAI)")
    .option("--gemini", "Login to Gemini (Google)")
    .option("--api-key <key>", "Provide API key directly")
    .option("--no-tui", "Disable interactive prompts")
    .action(async (options) => {
      const providers: AuthProviderName[] = [];

      if (options.claude) providers.push("claude");
      if (options.codex) providers.push("codex");
      if (options.gemini) providers.push("gemini");

      if (providers.length === 0 && options.tui !== false) {
        UI.empty();
        Dialog.intro("SuperCoin Authentication");

        const selected = await Dialog.multiselect<AuthProviderName>({
          message: "Select providers to authenticate:",
          options: [
            { value: "claude", label: "Claude (Anthropic)", hint: "API Key" },
            { value: "codex", label: "Codex (OpenAI)", hint: "API Key" },
            { value: "gemini", label: "Gemini (Google)", hint: "OAuth or API Key" },
          ],
          required: true,
        });

        providers.push(...selected);
      }

      for (const provider of providers) {
        try {
          const results = await Dialog.withSpinner(
            `Authenticating with ${provider}...`,
            () => authHub.login(provider, {
              apiKey: options.apiKey,
              interactive: options.tui !== false,
            }),
            `Successfully authenticated with ${provider}`
          );

          const result = results[0];
          if (!result.success) {
            Toast.warning(`${provider}: ${result.error}`);
          }
        } catch (error) {
          Toast.error(`Failed to authenticate with ${provider}`);
          logger.error(`Auth error for ${provider}`, error as Error);
        }
      }

      console.log("");
      await showAuthStatus(authHub);

      Dialog.outro("Authentication complete!");
    });

  // Status command
  auth
    .command("status")
    .description("Show authentication status")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const statuses = await authHub.status();

      if (options.json) {
        console.log(JSON.stringify(statuses, null, 2));
        return;
      }

      await showAuthStatus(authHub);
    });

  // Refresh command
  auth
    .command("refresh")
    .description("Refresh authentication tokens")
    .option("--claude", "Refresh Claude token")
    .option("--codex", "Refresh Codex token")
    .option("--gemini", "Refresh Gemini token")
    .action(async (options) => {
      const providers: AuthProviderName[] = [];

      if (options.claude) providers.push("claude");
      if (options.codex) providers.push("codex");
      if (options.gemini) providers.push("gemini");

      // If no specific provider, refresh all
      if (providers.length === 0) {
        providers.push("claude", "codex", "gemini");
      }

      for (const provider of providers) {
        try {
          const results = await Dialog.withSpinner(
            `Refreshing ${provider} token...`,
            () => authHub.refresh(provider),
            `${provider} token refreshed`
          );
          
          const result = results[0];
          if (!result.success) {
            Toast.info(`${provider}: ${result.error || "Already up to date"}`);
          }
        } catch (error) {
          Toast.error(`${provider}: ${(error as Error).message}`);
        }
      }
    });

  // Logout command
  auth
    .command("logout")
    .description("Logout from AI providers")
    .option("--claude", "Logout from Claude")
    .option("--codex", "Logout from Codex")
    .option("--gemini", "Logout from Gemini")
    .option("--all", "Logout from all providers")
    .action(async (options) => {
      if (options.all) {
        await authHub.logout();
        Dialog.outro("Logged out from all providers");
        return;
      }

      const providers: AuthProviderName[] = [];
      if (options.claude) providers.push("claude");
      if (options.codex) providers.push("codex");
      if (options.gemini) providers.push("gemini");

      for (const provider of providers) {
        await authHub.logout(provider);
        logger.info(`Logged out from ${provider}`);
      }
    });

  return auth;
}

async function showAuthStatus(authHub: ReturnType<typeof getAuthHub>): Promise<void> {
  const statuses = await authHub.status();

  UI.empty();
  Dialog.intro("Credentials");

  for (const status of statuses) {
    const typeText = status.type ? UI.dim(`(${status.type})`) : "";
    const statusText = status.authenticated ? "Authenticated" : "Not logged in";
    
    if (status.authenticated) {
      Toast.success(`${status.provider} ${typeText}`);
    } else {
      Toast.info(`${status.provider} ${UI.dim(statusText)}`);
    }
  }

  const authCount = statuses.filter(s => s.authenticated).length;
  Dialog.outro(`${authCount} of ${statuses.length} providers authenticated`);
}

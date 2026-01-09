/**
 * Auth Command
 * Manage authentication for AI providers
 */
import { Command } from "commander";
import * as clack from "@clack/prompts";
import type { SuperCoinConfig } from "../../config/schema";
import { getAuthHub, type AuthProviderName, type AuthStatus } from "../../services/auth";
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

      // If no specific provider, show interactive selection
      if (providers.length === 0 && options.tui !== false) {
        clack.intro("SuperCoin Authentication");

        const selected = await clack.multiselect({
          message: "Select providers to authenticate:",
          options: [
            { value: "claude", label: "Claude (Anthropic)", hint: "API Key" },
            { value: "codex", label: "Codex (OpenAI)", hint: "API Key" },
            { value: "gemini", label: "Gemini (Google)", hint: "OAuth with Antigravity" },
          ],
          required: true,
        });

        if (clack.isCancel(selected)) {
          clack.cancel("Authentication cancelled");
          process.exit(0);
        }

        providers.push(...(selected as AuthProviderName[]));
      }

      // Login to each provider
      for (const provider of providers) {
        const s = clack.spinner();
        s.start(`Authenticating with ${provider}...`);

        try {
          const results = await authHub.login(provider, {
            apiKey: options.apiKey,
            interactive: options.tui !== false,
          });

          const result = results[0];
          if (result.success) {
            s.stop(`Successfully authenticated with ${provider}`);
          } else {
            s.stop(`Failed to authenticate with ${provider}: ${result.error}`);
          }
        } catch (error) {
          s.stop(`Failed to authenticate with ${provider}`);
          logger.error(`Auth error for ${provider}`, error as Error);
        }
      }

      // Show final status
      console.log("");
      await showAuthStatus(authHub);

      clack.outro("Authentication complete!");
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
        const s = clack.spinner();
        s.start(`Refreshing ${provider} token...`);

        try {
          const results = await authHub.refresh(provider);
          const result = results[0];

          if (result.success) {
            s.stop(`${provider} token refreshed`);
          } else {
            s.stop(`${provider}: ${result.error || "Already up to date"}`);
          }
        } catch (error) {
          s.stop(`${provider}: ${(error as Error).message}`);
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
        clack.outro("Logged out from all providers");
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

  console.log("\nAuthentication Status:\n");
  console.log("+-----------+----------------+-----------+---------------------+");
  console.log("| Provider  | Status         | Type      | Expires             |");
  console.log("+-----------+----------------+-----------+---------------------+");

  for (const status of statuses) {
    const icon = status.authenticated ? "[OK]" : "[--]";
    const statusText = status.authenticated ? "Authenticated" : "Not logged in";
    const typeText = status.type || "-";
    const expiresText = status.expiresAt
      ? status.expiresAt === Number.MAX_SAFE_INTEGER
        ? "Never"
        : new Date(status.expiresAt).toLocaleString()
      : "-";

    console.log(
      `| ${status.provider.padEnd(9)} | ${icon} ${statusText.padEnd(10)} | ${typeText.padEnd(9)} | ${expiresText.padEnd(19)} |`
    );
  }

  console.log("+-----------+----------------+-----------+---------------------+");
}

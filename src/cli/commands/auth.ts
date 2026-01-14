import { Command } from "commander";
import * as clack from "@clack/prompts";
import path from "path";
import os from "os";
import type { SuperCoinConfig } from "../../config/schema";
import { getAuthHub, type AuthProviderName, type AuthStatus } from "../../services/auth";
import { UI, CancelledError, Dialog, Toast } from "../../shared/ui";
import logger from "../../shared/logger";
import { AuthError } from "../../shared/errors";

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

      let successCount = 0;
      let failCount = 0;

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
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          failCount++;
          const err = error instanceof Error ? error : new Error(String(error));
          
          if (err.message.includes("invalid") || err.message.includes("expired")) {
            Toast.error(`${provider}: Invalid or expired credentials`);
          } else if (err.message.includes("network") || err.message.includes("fetch")) {
            Toast.error(`${provider}: Network error - check your connection`);
          } else {
            Toast.error(`${provider}: ${err.message}`);
          }
          
          logger.error(`Auth error for ${provider}`, err);
        }
      }

      console.log("");
      await showAuthStatus(authHub);

      if (failCount === 0) {
        Dialog.outro("Authentication complete!");
      } else if (successCount > 0) {
        Dialog.outro(`Partially complete: ${successCount} succeeded, ${failCount} failed`);
      } else {
        Dialog.outro("Authentication failed for all providers");
      }
    });

  auth
    .command("list")
    .alias("ls")
    .description("List all configured credentials")
    .action(async () => {
      UI.empty();
      const configDir = path.join(os.homedir(), ".config", "supercoin");
      const displayPath = configDir.replace(os.homedir(), "~");
      Dialog.intro(`Credentials ${UI.dim(displayPath)}`);

      const statuses = await authHub.status();
      
      for (const status of statuses) {
        if (status.authenticated) {
          const typeLabel = status.type ? ` ${UI.dim(`(${status.type})`)}` : "";
          clack.log.info(`${status.displayName || status.provider}${typeLabel}`);
        }
      }

      const authCount = statuses.filter(s => s.authenticated).length;
      Dialog.outro(`${authCount} credential${authCount === 1 ? "" : "s"}`);

      const envVars = checkEnvironmentVariables();
      if (envVars.length > 0) {
        UI.empty();
        Dialog.intro("Environment");
        for (const { provider, envVar } of envVars) {
          clack.log.info(`${provider} ${UI.dim(envVar)}`);
        }
        Dialog.outro(`${envVars.length} environment variable${envVars.length === 1 ? "" : "s"}`);
      }
    });

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

function checkEnvironmentVariables(): Array<{ provider: string; envVar: string }> {
  const envMapping: Record<string, string[]> = {
    "Claude (Anthropic)": ["ANTHROPIC_API_KEY"],
    "Codex (OpenAI)": ["OPENAI_API_KEY"],
    "Gemini (Google)": ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    "Ollama": ["OLLAMA_HOST"],
    "LM Studio": ["LMSTUDIO_BASE_URL"],
  };

  const activeEnvVars: Array<{ provider: string; envVar: string }> = [];

  for (const [provider, envVars] of Object.entries(envMapping)) {
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        activeEnvVars.push({ provider, envVar });
      }
    }
  }

  return activeEnvVars;
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

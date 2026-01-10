/**
 * Doctor Command
 * System diagnostics and health check
 */
import { Command } from "commander";
import { existsSync } from "fs";
import path from "path";
import type { SuperCoinConfig } from "../../config/schema";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

export function createDoctorCommand(config: SuperCoinConfig): Command {
  const doctor = new Command("doctor")
    .description("Run system diagnostics")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const results: CheckResult[] = [];

      console.log("\nSuperCoin Health Check");
      console.log("======================\n");

      // Environment checks
      console.log("[Environment]");
      results.push(await checkBunVersion());
      results.push(await checkNodeVersion());
      results.push(await checkOS());

      // Authentication checks
      console.log("\n[Authentication]");
      results.push(await checkAuth("claude", "ANTHROPIC_API_KEY"));
      results.push(await checkAuth("codex", "OPENAI_API_KEY"));
      results.push(await checkAuth("gemini", "GOOGLE_API_KEY"));

      // Server checks
      console.log("\n[Server]");
      results.push(await checkServerConfig(config));

      // Ollama check
      console.log("\n[Ollama]");
      results.push(await checkOllamaStatus());

      // Config checks
      console.log("\n[Configuration]");
      results.push(await checkConfigFile());

      // Summary
      console.log("\n---");
      const passed = results.filter((r) => r.status === "pass").length;
      const failed = results.filter((r) => r.status === "fail").length;
      const warned = results.filter((r) => r.status === "warn").length;

      if (failed === 0) {
        console.log(
          `\nAll checks passed! (${passed} passed, ${warned} warnings)`
        );
      } else {
        console.log(
          `\n${failed} checks failed, ${warned} warnings, ${passed} passed`
        );
      }

      if (options.json) {
        console.log("\n" + JSON.stringify(results, null, 2));
      }
    });

  return doctor;
}

async function checkBunVersion(): Promise<CheckResult> {
  if (typeof Bun !== "undefined") {
    const version = Bun.version;
    console.log(`  Bun version: v${version}`);
    return {
      name: "bun_version",
      status: "pass",
      message: `v${version}`,
    };
  }

  console.log("  Bun version: Not active (Node.js runtime)");
  return {
    name: "bun_version",
    status: "warn",
    message: "Not active",
  };
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  console.log(`  Node version: ${version}`);
  return {
    name: "node_version",
    status: "pass",
    message: version,
  };
}

async function checkOS(): Promise<CheckResult> {
  const os = process.platform;
  const arch = process.arch;
  console.log(`  OS: ${os} (${arch})`);
  return {
    name: "os",
    status: "pass",
    message: `${os} (${arch})`,
  };
}

async function checkAuth(
  provider: string,
  envVar: string
): Promise<CheckResult> {
  const hasEnv = !!process.env[envVar];
  // Verify token files if env var is missing
  if (!hasEnv) {
    // This is a simplified check. Ideally we'd check the token store, but that requires async access
    // and importing the store. For now, we'll stick to env vars as the primary "easy" check,
    // but we can look for token files if we want to be more thorough.
    // However, the original code only checked env vars, so we'll stick to that for consistency
    // unless we want to do a full token store check.
  }

  const status = hasEnv ? "pass" : "warn";
  const icon = hasEnv ? "[OK]" : "[--]";
  const message = hasEnv
    ? "Environment variable set"
    : "Not configured via Env";

  console.log(`  ${provider.padEnd(8)}: ${icon} ${message}`);

  return {
    name: `auth_${provider}`,
    status,
    message,
  };
}

async function checkOllamaStatus(): Promise<CheckResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch("http://localhost:11434/api/version", {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as { version: string };
      console.log(`  Status    : [OK] Running v${data.version}`);
      return {
        name: "ollama_status",
        status: "pass",
        message: `Running v${data.version}`,
      };
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    console.log(
      `  Status    : [!!] Not running or unreachable (${
        (error as Error).message
      })`
    );
    return {
      name: "ollama_status",
      status: "fail", // Fail is appropriate here as it's a critical local dependency
      message: "Not running",
    };
  }
}

async function checkServerConfig(
  config: SuperCoinConfig
): Promise<CheckResult> {
  const port = config.server?.port || 3100;
  const host = config.server?.host || "127.0.0.1";
  const url = `http://${host}:${port}/health`; // Assuming a health endpoint exists or we check root

  console.log(`  Server config: http://${host}:${port}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    // Just try to fetch root or health. If we get a response (even 404), something is listening.
    // Ideally the server has a /health endpoint.
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`  Server status: [OK] Running`);
    return {
      name: "server_status",
      status: "pass",
      message: "Running",
    };
  } catch {
    console.log(`  Server status: [--] Not running`);
    return {
      name: "server_status",
      status: "warn", // Warn because it's not strictly required for CLI usage
      message: "Not running",
    };
  }
}

async function checkConfigFile(): Promise<CheckResult> {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const userConfig = path.join(home, ".config", "supercoin", "config.json");
  const projectConfig = path.join(process.cwd(), ".supercoin", "config.json");

  const hasUserConfig = existsSync(userConfig);
  const hasProjectConfig = existsSync(projectConfig);

  if (hasUserConfig) {
    console.log(`  User config: Found at ${userConfig}`);
  } else {
    console.log(`  User config: Not found`);
  }

  if (hasProjectConfig) {
    console.log(`  Project config: Found at ${projectConfig}`);
  } else {
    console.log(`  Project config: Not found`);
  }

  return {
    name: "config_files",
    status: hasUserConfig || hasProjectConfig ? "pass" : "warn",
    message:
      hasUserConfig || hasProjectConfig ? "Config found" : "Using defaults",
  };
}

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

      // Config checks
      console.log("\n[Configuration]");
      results.push(await checkConfigFile());

      // Summary
      console.log("\n---");
      const passed = results.filter((r) => r.status === "pass").length;
      const failed = results.filter((r) => r.status === "fail").length;
      const warned = results.filter((r) => r.status === "warn").length;

      if (failed === 0) {
        console.log(`\nAll checks passed! (${passed} passed, ${warned} warnings)`);
      } else {
        console.log(`\n${failed} checks failed, ${warned} warnings, ${passed} passed`);
      }

      if (options.json) {
        console.log("\n" + JSON.stringify(results, null, 2));
      }
    });

  return doctor;
}

async function checkBunVersion(): Promise<CheckResult> {
  try {
    const version = Bun.version;
    console.log(`  Bun version: v${version}`);
    return {
      name: "bun_version",
      status: "pass",
      message: `v${version}`,
    };
  } catch {
    console.log("  Bun version: Not available");
    return {
      name: "bun_version",
      status: "warn",
      message: "Not available",
    };
  }
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

async function checkAuth(provider: string, envVar: string): Promise<CheckResult> {
  const hasEnv = !!process.env[envVar];
  const status = hasEnv ? "pass" : "warn";
  const icon = hasEnv ? "[OK]" : "[--]";
  const message = hasEnv ? "Environment variable set" : "Not configured";

  console.log(`  ${provider.padEnd(8)}: ${icon} ${message}`);

  return {
    name: `auth_${provider}`,
    status,
    message,
  };
}

async function checkServerConfig(config: SuperCoinConfig): Promise<CheckResult> {
  const port = config.server?.port || 3100;
  const host = config.server?.host || "127.0.0.1";

  console.log(`  Server config: http://${host}:${port}`);
  console.log(`  Server status: Not running (placeholder)`);

  return {
    name: "server",
    status: "warn",
    message: "Server not running",
  };
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
    message: hasUserConfig || hasProjectConfig ? "Config found" : "Using defaults",
  };
}

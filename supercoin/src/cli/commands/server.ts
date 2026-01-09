import { Command } from "commander";
import type { SuperCoinConfig } from "../../config/schema";
import { startServer, stopServer, getServerStatus, isServerRunning } from "../../server";
import logger from "../../shared/logger";

export function createServerCommand(config: SuperCoinConfig): Command {
  const server = new Command("server")
    .description("Manage local authentication server");

  server
    .command("start")
    .description("Start the local server")
    .option("--port <number>", "Port number", parseInt)
    .option("--host <host>", "Host address")
    .option("--foreground", "Run in foreground")
    .action(async (options) => {
      const port = options.port || config.server?.port || 3100;
      const host = options.host || config.server?.host || "127.0.0.1";

      if (isServerRunning()) {
        const status = getServerStatus();
        logger.info(`Server already running at http://${status.host}:${status.port}`);
        return;
      }

      try {
        const status = await startServer({ port, host });
        logger.success(`Server started at http://${status.host}:${status.port}`);

        if (options.foreground) {
          logger.info("Running in foreground mode. Press Ctrl+C to stop.");
          await new Promise(() => {});
        } else {
          logger.info("Server running in background");
        }
      } catch (error) {
        logger.error("Failed to start server", error as Error);
        process.exit(1);
      }
    });

  server
    .command("stop")
    .description("Stop the local server")
    .action(async () => {
      if (!isServerRunning()) {
        logger.info("Server is not running");
        return;
      }

      try {
        await stopServer();
        logger.success("Server stopped");
      } catch (error) {
        logger.error("Failed to stop server", error as Error);
        process.exit(1);
      }
    });

  server
    .command("status")
    .description("Show server status")
    .action(async () => {
      const status = getServerStatus();

      console.log("\nServer Status:");
      if (status.running) {
        console.log(`  Status: Running`);
        console.log(`  Address: http://${status.host}:${status.port}`);
        console.log(`  PID: ${status.pid}`);
        console.log(`  Uptime: ${formatUptime(status.uptime || 0)}`);
      } else {
        console.log(`  Status: Not running`);
        const port = config.server?.port || 3100;
        const host = config.server?.host || "127.0.0.1";
        console.log(`  Configured: http://${host}:${port}`);
      }
      console.log();
    });

  server
    .command("logs")
    .description("Show server logs")
    .option("-f, --follow", "Follow log output")
    .option("-n, --lines <number>", "Number of lines", parseInt)
    .action(async (_options) => {
      logger.info("Server logs are printed to stdout when running in foreground mode");
    });

  server
    .command("config")
    .description("Manage server configuration")
    .argument("<action>", "Action: get, set, list")
    .argument("[key]", "Configuration key")
    .argument("[value]", "Configuration value")
    .action(async (action: string, key?: string, value?: string) => {
      switch (action) {
        case "list":
          console.log("\nServer Configuration:");
          console.log(`  port: ${config.server?.port || 3100}`);
          console.log(`  host: ${config.server?.host || "127.0.0.1"}`);
          console.log(`  autoStart: ${config.server?.autoStart ?? true}`);
          break;

        case "get":
          if (!key) {
            console.error("Key is required for 'get' action");
            process.exit(1);
          }
          const serverConfig = config.server || {};
          console.log(serverConfig[key as keyof typeof serverConfig] ?? "undefined");
          break;

        case "set":
          if (!key || !value) {
            console.error("Key and value are required for 'set' action");
            process.exit(1);
          }
          logger.info(`Would set server.${key} = ${value}`);
          logger.warn("Config persistence requires editing ~/.supercoin/config.json");
          break;

        default:
          console.error(`Unknown action: ${action}`);
          process.exit(1);
      }
    });

  return server;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

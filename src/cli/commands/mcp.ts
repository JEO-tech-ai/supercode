import { Command } from "commander";
import * as clack from "@clack/prompts";
import * as fs from "fs/promises";
import * as path from "path";
import { UI, CancelledError } from "../../shared/ui";
import { loadConfig, saveConfig } from "../../config/loader";
import type { Config } from "../../config/types";

interface McpServerConfig {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  enabled?: boolean;
}

type McpConfig = Record<string, McpServerConfig>;

function getConfigPath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || "~", ".config");
  return path.join(configDir, "supercode", "config.json");
}

async function getMcpConfig(): Promise<McpConfig> {
  try {
    const configPath = getConfigPath();
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    return config.mcp || {};
  } catch {
    return {};
  }
}

async function saveMcpConfig(mcp: McpConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  
  await fs.mkdir(configDir, { recursive: true });
  
  let config: Record<string, unknown> = {};
  try {
    const content = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(content);
  } catch {}
  
  config.mcp = mcp;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export function createMcpCommand(): Command {
  const mcp = new Command("mcp")
    .description("Manage MCP (Model Context Protocol) servers");

  mcp.command("list")
    .alias("ls")
    .description("List configured MCP servers")
    .action(async () => {
      const mcpConfig = await getMcpConfig();
      const servers = Object.entries(mcpConfig);

      UI.empty();
      clack.intro("MCP Servers");

      if (servers.length === 0) {
        clack.log.warn("No MCP servers configured");
        clack.outro("Add servers with: supercode mcp add");
        return;
      }

      for (const [name, config] of servers) {
        const status = config.enabled !== false ? "enabled" : "disabled";
        const statusIcon = config.enabled !== false ? "✓" : "○";
        
        let details: string;
        if (config.type === "local" && config.command) {
          details = config.command.join(" ");
        } else if (config.type === "remote" && config.url) {
          details = config.url;
        } else {
          details = config.type;
        }

        clack.log.info(
          `${statusIcon} ${name} (${status})\n    ${UI.Style.TEXT_DIM}${details}${UI.Style.RESET}`
        );
      }

      clack.outro(`${servers.length} server(s)`);
    });

  mcp.command("add")
    .description("Add an MCP server")
    .action(async () => {
      UI.empty();
      clack.intro("Add MCP Server");

      const name = await clack.text({
        message: "Server name",
        placeholder: "my-server",
        validate: (value) => {
          if (!value || value.length === 0) return "Name is required";
          if (!/^[a-z0-9-_]+$/i.test(value)) return "Use alphanumeric characters, dashes, and underscores";
        },
      });

      if (clack.isCancel(name)) throw new CancelledError();

      const type = await clack.select({
        message: "Server type",
        options: [
          { value: "local", label: "Local", hint: "Run a local command" },
          { value: "remote", label: "Remote", hint: "Connect to a URL" },
        ],
      });

      if (clack.isCancel(type)) throw new CancelledError();

      let serverConfig: McpServerConfig;

      if (type === "local") {
        const command = await clack.text({
          message: "Command to run",
          placeholder: "npx @modelcontextprotocol/server-filesystem .",
          validate: (value) => {
            if (!value || value.length === 0) return "Command is required";
          },
        });

        if (clack.isCancel(command)) throw new CancelledError();

        serverConfig = {
          type: "local",
          command: command.split(" "),
          enabled: true,
        };
      } else {
        const url = await clack.text({
          message: "Server URL",
          placeholder: "https://example.com/mcp",
          validate: (value) => {
            if (!value || value.length === 0) return "URL is required";
            try {
              new URL(value);
            } catch {
              return "Invalid URL";
            }
          },
        });

        if (clack.isCancel(url)) throw new CancelledError();

        serverConfig = {
          type: "remote",
          url,
          enabled: true,
        };
      }

      const mcpConfig = await getMcpConfig();
      mcpConfig[name] = serverConfig;
      await saveMcpConfig(mcpConfig);

      clack.log.success(`Added MCP server: ${name}`);
      clack.outro("Done");
    });

  mcp.command("remove")
    .alias("rm")
    .description("Remove an MCP server")
    .argument("[name]", "Server name to remove")
    .action(async (name?: string) => {
      UI.empty();
      clack.intro("Remove MCP Server");

      const mcpConfig = await getMcpConfig();
      const servers = Object.keys(mcpConfig);

      if (servers.length === 0) {
        clack.log.warn("No MCP servers configured");
        clack.outro("Done");
        return;
      }

      let serverName = name;
      if (!serverName) {
        const selected = await clack.select({
          message: "Select server to remove",
          options: servers.map((s) => ({
            value: s,
            label: s,
            hint: mcpConfig[s].type,
          })),
        });

        if (clack.isCancel(selected)) throw new CancelledError();
        serverName = selected;
      }

      if (!mcpConfig[serverName]) {
        clack.log.error(`Server not found: ${serverName}`);
        clack.outro("Done");
        return;
      }

      const confirm = await clack.confirm({
        message: `Remove ${serverName}?`,
      });

      if (clack.isCancel(confirm) || !confirm) {
        clack.log.info("Cancelled");
        clack.outro("Done");
        return;
      }

      delete mcpConfig[serverName];
      await saveMcpConfig(mcpConfig);

      clack.log.success(`Removed: ${serverName}`);
      clack.outro("Done");
    });

  mcp.command("enable")
    .description("Enable an MCP server")
    .argument("<name>", "Server name")
    .action(async (name: string) => {
      const mcpConfig = await getMcpConfig();

      if (!mcpConfig[name]) {
        UI.error(`Server not found: ${name}`);
        return;
      }

      mcpConfig[name].enabled = true;
      await saveMcpConfig(mcpConfig);
      UI.println(`Enabled: ${name}`);
    });

  mcp.command("disable")
    .description("Disable an MCP server")
    .argument("<name>", "Server name")
    .action(async (name: string) => {
      const mcpConfig = await getMcpConfig();

      if (!mcpConfig[name]) {
        UI.error(`Server not found: ${name}`);
        return;
      }

      mcpConfig[name].enabled = false;
      await saveMcpConfig(mcpConfig);
      UI.println(`Disabled: ${name}`);
    });

  return mcp;
}

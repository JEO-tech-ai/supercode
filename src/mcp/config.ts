import * as fs from "fs";
import * as path from "path";
import type { MCPConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

const MCP_CONFIG_FILE = "mcp.json";
const MCP_DIR = ".supercode";

export function getMcpConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, MCP_DIR, MCP_CONFIG_FILE);
}

export function loadMcpConfig(cwd: string = process.cwd()): MCPConfig {
  const configPath = getMcpConfigPath(cwd);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, servers: { ...DEFAULT_CONFIG.servers } };
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<MCPConfig>;

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      servers: { ...DEFAULT_CONFIG.servers, ...parsed.servers },
    } as MCPConfig;
  } catch {
    return { ...DEFAULT_CONFIG, servers: { ...DEFAULT_CONFIG.servers } };
  }
}

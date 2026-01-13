export type McpScope = "user" | "project" | "local";

export interface McpServerConfig {
  type?: "http" | "sse" | "stdio";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  disabled?: boolean;
}

export type SkillMcpConfig = Record<string, McpServerConfig>;

export interface SkillMcpClientInfo {
  serverName: string;
  skillName: string;
  sessionId: string;
}

export interface SkillMcpServerContext {
  config: McpServerConfig;
  skillName: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

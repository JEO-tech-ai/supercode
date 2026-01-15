export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
  defaultTimeout: number;
  autoStart: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServerStatus {
  name: string;
  status: "running" | "stopped" | "error";
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  error?: string;
}

export const DEFAULT_CONFIG: MCPConfig = {
  servers: {},
  defaultTimeout: 30000,
  autoStart: true,
};

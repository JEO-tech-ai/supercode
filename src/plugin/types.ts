import type { ToolDefinition } from "../core/types";
import type { Hook } from "../core/types";

export interface PluginClient {
  session: SessionClient;
  tui: TUIClient;
  tool: ToolClient;
}

interface SessionClient {
  messages: (params: {
    path: { id: string };
    query?: { directory: string };
  }) => Promise<{ data: unknown[] }>;
  prompt: (params: {
    path: { id: string };
    body: { parts: unknown[]; agent?: string; model?: unknown };
    query?: { directory: string };
  }) => Promise<void>;
  abort: (params: { path: { id: string } }) => Promise<void>;
  todo: (params: { path: { id: string } }) => Promise<{ data: unknown[] }>;
  summarize?: (sessionId: string) => Promise<void>;
}

interface TUIClient {
  showToast: (params: {
    body: { title: string; message: string; variant: string; duration?: number };
  }) => Promise<void>;
}

interface ToolClient {
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface PluginInput {
  client: PluginClient;
  directory: string;
  config?: Record<string, unknown>;
}

export interface PluginOutput {
  agents?: Record<string, unknown>;
  tools?: Record<string, ToolDefinition>;
  hooks?: Hook[];
  commands?: Record<string, unknown>;
}

export type PluginFactory = (
  input: PluginInput
) => PluginOutput | Promise<PluginOutput>;

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;
  config?: {
    schema?: Record<string, unknown>;
    defaults?: Record<string, unknown>;
  };
  dependencies?: string[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  output: PluginOutput;
  path: string;
  loadedAt: Date;
  status: "active" | "inactive" | "error";
  error?: Error;
}

export interface PluginConfig {
  pluginsDir: string;
  autoLoad: boolean;
  enableHotReload: boolean;
  timeout: number;
}

export const DEFAULT_CONFIG: PluginConfig = {
  pluginsDir: "~/.supercode/plugins",
  autoLoad: true,
  enableHotReload: false,
  timeout: 10000,
};

import type { ToolDefinition as CoreToolDefinition, Hook, HookEvent } from "../core/types";
import type { IPermissionManager } from "../core/permission";
import { z } from "zod";

// =============================================================================
// Client Interfaces
// =============================================================================

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

// =============================================================================
// Shell Interface (Bun-style shell execution)
// =============================================================================

export interface ShellOutput {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
  text(encoding?: BufferEncoding): string;
  json(): unknown;
}

export interface ShellPromise extends Promise<ShellOutput> {
  cwd(newCwd: string): this;
  env(newEnv: Record<string, string>): this;
  quiet(): this;
  nothrow(): this;
  text(encoding?: BufferEncoding): Promise<string>;
  json(): Promise<unknown>;
  lines(): AsyncIterable<string>;
}

export interface ShellInterface {
  (strings: TemplateStringsArray, ...expressions: unknown[]): ShellPromise;
  escape(input: string): string;
  env(newEnv?: Record<string, string | undefined>): ShellInterface;
  cwd(newCwd?: string): ShellInterface;
  nothrow(): ShellInterface;
}

// =============================================================================
// Project & Context
// =============================================================================

export interface ProjectMetadata {
  id: string;
  name: string;
  path: string;
  vcs?: "git";
  vcsDir?: string;
  createdAt: number;
  config?: Record<string, unknown>;
}

/**
 * Extended Plugin Context with all dependencies injected
 */
export interface PluginContext {
  /** SuperCode API client */
  client: PluginClient;
  /** Current project metadata */
  project: ProjectMetadata;
  /** Working directory */
  directory: string;
  /** Git worktree root (if applicable) */
  worktree?: string;
  /** Server URL */
  serverUrl?: string;
  /** Shell interface for command execution */
  shell: ShellInterface;
  /** Plugin-specific configuration */
  config: Record<string, unknown>;
  /** Permission manager (from Phase 1) */
  permission: IPermissionManager;
  /** Current session ID (if in session) */
  sessionId?: string;
  /** Abort signal for cancellation */
  abort?: AbortSignal;
}

/**
 * Legacy PluginInput for backward compatibility
 */
export interface PluginInput {
  client: PluginClient;
  directory: string;
  config?: Record<string, unknown>;
}

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Tool execution context
 */
export interface ToolContext {
  sessionId: string;
  messageId?: string;
  agent?: string;
  abort: AbortSignal;
  workdir: string;
}

/**
 * Enhanced Tool Definition for plugins
 */
export interface PluginToolDefinition<TArgs extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  args: z.ZodObject<TArgs>;
  execute: (args: z.infer<z.ZodObject<TArgs>>, context: ToolContext) => Promise<string>;
  /** Whether this tool requires permission checking (default: true) */
  requiresPermission?: boolean;
  /** Risk level for permission assessment */
  riskLevel?: "low" | "medium" | "high" | "critical";
}

/**
 * Helper function to define a tool with type inference
 */
export function defineTool<TArgs extends z.ZodRawShape>(
  definition: {
    description: string;
    args: TArgs;
    execute: (args: z.infer<z.ZodObject<TArgs>>, context: ToolContext) => Promise<string>;
    requiresPermission?: boolean;
    riskLevel?: "low" | "medium" | "high" | "critical";
  }
): PluginToolDefinition<TArgs> {
  return {
    name: "", // Will be set by registry
    description: definition.description,
    args: z.object(definition.args),
    execute: definition.execute,
    requiresPermission: definition.requiresPermission ?? true,
    riskLevel: definition.riskLevel,
  };
}

// Expose zod schema for convenience
defineTool.schema = z;

// =============================================================================
// Hook Definitions
// =============================================================================

/**
 * Extended hook event types for plugins
 */
export type PluginHookEvent =
  | HookEvent
  | "chat.message"
  | "chat.params"
  | "permission.ask"
  | "tool.execute.before"
  | "tool.execute.after"
  | "experimental.chat.messages.transform"
  | "experimental.chat.system.transform"
  | "experimental.session.compacting"
  | "experimental.text.complete";

/**
 * Plugin Hook Definition
 */
export interface PluginHook<T = void> {
  name: string;
  events: PluginHookEvent[];
  handler: (ctx: PluginContext, data: unknown) => Promise<T>;
  priority?: number;
  enabled?: boolean;
}

// =============================================================================
// Authentication
// =============================================================================

export interface AuthResult {
  type: "success" | "failed";
  provider?: string;
  access?: string;
  refresh?: string;
  key?: string;
  expires?: number;
  error?: string;
}

export interface AuthPrompt {
  type: "text" | "select";
  key: string;
  message: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string; hint?: string }>;
  validate?: (value: string) => string | undefined;
  condition?: (inputs: Record<string, string>) => boolean;
}

export interface AuthMethod {
  type: "oauth" | "api";
  label: string;
  prompts?: AuthPrompt[];
  authorize: (inputs?: Record<string, string>) => Promise<AuthResult | AuthOAuthResult>;
}

export interface AuthOAuthResult {
  url: string;
  instructions: string;
  method: "auto" | "code";
  callback: (code?: string) => Promise<AuthResult>;
}

export interface AuthPlugin {
  name: string;
  provider: string;
  methods: AuthMethod[];
  loader?: (getAuth: () => Promise<AuthResult>, provider: unknown) => Promise<Record<string, unknown>>;
}

// =============================================================================
// Plugin Interface
// =============================================================================

/**
 * Hook handlers map for plugins
 */
export interface PluginHooks {
  /** General event handler */
  event?: (input: { event: unknown }) => Promise<void>;

  /** Configuration changed */
  config?: (input: Record<string, unknown>) => Promise<void>;

  /** Chat message received */
  "chat.message"?: (
    input: { sessionId: string; agent?: string; model?: unknown; messageId?: string },
    output: { message: unknown; parts: unknown[] }
  ) => Promise<void>;

  /** LLM parameters modification */
  "chat.params"?: (
    input: { sessionId: string; agent: string; model: unknown },
    output: { temperature: number; topP: number; topK: number; options: Record<string, unknown> }
  ) => Promise<void>;

  /** Permission request handling */
  "permission.ask"?: (
    input: { tool: string; pattern?: string; type: string },
    output: { status: "ask" | "deny" | "allow" }
  ) => Promise<void>;

  /** Before tool execution */
  "tool.execute.before"?: (
    input: { tool: string; sessionId: string; callId: string },
    output: { args: unknown }
  ) => Promise<void>;

  /** After tool execution */
  "tool.execute.after"?: (
    input: { tool: string; sessionId: string; callId: string },
    output: { title: string; output: string; metadata: unknown }
  ) => Promise<void>;

  /** [Experimental] Transform messages */
  "experimental.chat.messages.transform"?: (
    input: Record<string, never>,
    output: { messages: Array<{ info: unknown; parts: unknown[] }> }
  ) => Promise<void>;

  /** [Experimental] Transform system prompt */
  "experimental.chat.system.transform"?: (
    input: { sessionId: string },
    output: { system: string[] }
  ) => Promise<void>;

  /** [Experimental] Session compaction */
  "experimental.session.compacting"?: (
    input: { sessionId: string },
    output: { context: string[]; prompt?: string }
  ) => Promise<void>;
}

/**
 * Enhanced Plugin Interface
 */
export interface Plugin {
  /** Plugin name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;

  /** Called when plugin is loaded */
  onLoad?: (ctx: PluginContext) => Promise<void>;
  /** Called when plugin is unloaded */
  onUnload?: (ctx: PluginContext) => Promise<void>;

  /** Tool definitions */
  tools?: Record<string, PluginToolDefinition>;
  /** Hook handlers */
  hooks?: PluginHooks;
  /** Legacy hooks array (for compatibility) */
  legacyHooks?: Hook[];
  /** Configuration provider */
  config?: (ctx: PluginContext) => Record<string, unknown>;
  /** Authentication plugin */
  auth?: AuthPlugin;
}

/**
 * Plugin factory function type (opencode-style)
 * Supports both legacy PluginOutput and new Plugin interface
 */
export type PluginFactory = (
  input: PluginInput | PluginContext
) => Plugin | PluginOutput | Promise<Plugin | PluginOutput>;

/**
 * Legacy Plugin Output for backward compatibility
 */
export interface PluginOutput {
  agents?: Record<string, unknown>;
  tools?: Record<string, CoreToolDefinition | PluginToolDefinition>;
  hooks?: Hook[];
  commands?: Record<string, unknown>;
}

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
  /** Raw output from plugin factory */
  output: PluginOutput;
  /** Parsed plugin interface (if available) */
  plugin?: Plugin;
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
  /** Additional plugin sources (npm packages, local files) */
  sources?: string[];
}

export const DEFAULT_CONFIG: PluginConfig = {
  pluginsDir: "~/.supercode/plugins",
  autoLoad: true,
  enableHotReload: false,
  timeout: 10000,
  sources: [],
};

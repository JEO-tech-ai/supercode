/**
 * Permission System Types
 * "Last Match Wins" rule evaluation with wildcard/glob pattern support.
 * Adapted from opencode permission system for SuperCode.
 */

/**
 * Permission decision types
 * - allow: Automatically allow the action
 * - deny: Automatically deny the action
 * - ask: Prompt the user for permission
 */
export type PermissionDecision = "allow" | "deny" | "ask";

/**
 * User reply types for "ask" decisions
 * - once: Allow this specific request only
 * - always: Add a permanent allow rule
 * - reject: Deny this request (optionally add deny rule)
 */
export type PermissionReply = "once" | "always" | "reject";

/**
 * Permission scope for rules
 * - session: Rule applies only to current session
 * - project: Rule applies to current project directory
 * - global: Rule applies globally
 */
export type PermissionScope = "session" | "project" | "global";

/**
 * Tool categories for permission grouping
 */
export type ToolCategory =
  | "shell"
  | "filesystem"
  | "network"
  | "browser"
  | "mcp"
  | "agent"
  | "system";

/**
 * Permission rule definition
 */
export interface PermissionRule {
  /** Unique identifier for this rule */
  id: string;
  /** Tool name or pattern (supports wildcards: *, ?) */
  tool: string;
  /** Argument pattern (supports glob patterns) */
  pattern?: string;
  /** The decision to apply when rule matches */
  action: PermissionDecision;
  /** Human-readable reason for this rule */
  reason?: string;
  /** Scope of the rule */
  scope: PermissionScope;
  /** Rule priority (higher = evaluated later, "last match wins") */
  priority: number;
  /** Whether this rule is currently enabled */
  enabled: boolean;
  /** When this rule was created */
  createdAt: number;
  /** When this rule expires (optional) */
  expiresAt?: number;
  /** Metadata for tracking */
  metadata?: {
    source?: "default" | "user" | "project" | "session";
    createdBy?: string;
    tags?: string[];
  };
}

/**
 * Permission request from a tool execution
 */
export interface PermissionRequest {
  /** Unique request identifier */
  id: string;
  /** Tool requesting permission */
  tool: string;
  /** Tool arguments (for pattern matching) */
  args?: Record<string, unknown>;
  /** Serialized argument string for display */
  argsString?: string;
  /** Description of what the tool will do */
  description?: string;
  /** Current session ID */
  sessionId: string;
  /** Working directory */
  workdir: string;
  /** Request timestamp */
  timestamp: number;
  /** Risk level assessment */
  riskLevel?: "low" | "medium" | "high" | "critical";
}

/**
 * Result of evaluating a permission request
 */
export interface PermissionResult {
  /** The final decision */
  decision: PermissionDecision;
  /** The rule that matched (if any) */
  matchedRule?: PermissionRule;
  /** Reason for the decision */
  reason?: string;
  /** Whether user interaction is required */
  requiresUserInput: boolean;
}

/**
 * Pending permission request awaiting user response
 */
export interface PendingRequest {
  /** The original request */
  request: PermissionRequest;
  /** Promise resolve function */
  resolve: (reply: PermissionReply) => void;
  /** Promise reject function */
  reject: (error: Error) => void;
  /** Timeout handle */
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Permission context for rule evaluation
 */
export interface PermissionContext {
  /** Current session ID */
  sessionId: string;
  /** Working directory */
  workdir: string;
  /** Project root directory (if detected) */
  projectRoot?: string;
  /** Whether running in autonomous/agent mode */
  autonomousMode?: boolean;
  /** Trust level for current context */
  trustLevel?: "low" | "medium" | "high";
}

/**
 * Permission manager configuration
 */
export interface PermissionConfig {
  /** Whether permission system is enabled */
  enabled: boolean;
  /** Default decision when no rules match */
  defaultDecision: PermissionDecision;
  /** Timeout for user prompts (ms) */
  askTimeout: number;
  /** Whether to allow all in development mode */
  devModeBypass: boolean;
  /** Path to rules configuration file */
  rulesPath?: string;
  /** Enable detailed logging */
  logDecisions: boolean;
  /** Enable statistics tracking */
  trackStats: boolean;
  /** Auto-deny patterns (always blocked) */
  blockedPatterns: string[];
  /** Auto-allow patterns (always allowed) */
  trustedPatterns: string[];
}

/**
 * Permission statistics for monitoring
 */
export interface PermissionStats {
  /** Total permission requests */
  totalRequests: number;
  /** Requests allowed */
  allowed: number;
  /** Requests denied */
  denied: number;
  /** Requests that prompted user */
  asked: number;
  /** User approved requests */
  userApproved: number;
  /** User rejected requests */
  userRejected: number;
  /** Requests by tool */
  byTool: Record<string, number>;
  /** Last request timestamp */
  lastRequest?: number;
}

/**
 * Ruleset for a specific context
 */
export interface PermissionRuleset {
  /** Ruleset identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Rules in this set */
  rules: PermissionRule[];
  /** Ruleset scope */
  scope: PermissionScope;
  /** Whether this ruleset is active */
  enabled: boolean;
  /** Version for conflict resolution */
  version: number;
}

/**
 * Event emitted when permission decision is made
 */
export interface PermissionEvent {
  type: "request" | "decision" | "rule_added" | "rule_removed" | "config_changed";
  request?: PermissionRequest;
  result?: PermissionResult;
  rule?: PermissionRule;
  timestamp: number;
}

/**
 * Permission event handler type
 */
export type PermissionEventHandler = (event: PermissionEvent) => void;

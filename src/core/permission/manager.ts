/**
 * Permission Manager
 * Central manager for permission checking with async user prompts.
 */

import type {
  PermissionConfig,
  PermissionContext,
  PermissionRequest,
  PermissionResult,
  PermissionReply,
  PermissionRule,
  PermissionStats,
  PermissionEvent,
  PermissionEventHandler,
  PendingRequest,
  PermissionScope,
  PermissionDecision,
} from "./types";
import {
  RuleStore,
  evaluateRequest,
  createRule,
  createAllowRuleFromRequest,
  createDenyRuleFromRequest,
} from "./rules";
import { serializeArgs, isDangerousPattern } from "./patterns";
import {
  DEFAULT_PERMISSION_CONFIG,
  createDefaultRuleset,
  assessRiskLevel,
  requiresPermissionCheck,
} from "./defaults";
import logger from "../../shared/logger";

/**
 * Permission Manager Interface
 */
export interface IPermissionManager {
  // Core operations
  check(request: PermissionRequest): Promise<PermissionResult>;
  checkSync(request: PermissionRequest): PermissionResult;

  // User interaction
  respondToRequest(requestId: string, reply: PermissionReply): void;
  getPendingRequests(): PendingRequest[];

  // Rule management
  addRule(rule: Partial<PermissionRule> & Pick<PermissionRule, "tool" | "action">): PermissionRule;
  removeRule(id: string): boolean;
  getRules(scope?: PermissionScope): PermissionRule[];
  clearSessionRules(): void;

  // Configuration
  configure(config: Partial<PermissionConfig>): void;
  getConfig(): PermissionConfig;
  setContext(context: PermissionContext): void;

  // Statistics
  getStats(): PermissionStats;
  resetStats(): void;

  // Events
  on(handler: PermissionEventHandler): () => void;

  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Create initial stats object
 */
function createStats(): PermissionStats {
  return {
    totalRequests: 0,
    allowed: 0,
    denied: 0,
    asked: 0,
    userApproved: 0,
    userRejected: 0,
    byTool: {},
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Permission Manager Implementation
 */
class PermissionManager implements IPermissionManager {
  private config: PermissionConfig;
  private context: PermissionContext | null = null;
  private ruleStore: RuleStore;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private eventHandlers: Set<PermissionEventHandler> = new Set();
  private stats: PermissionStats;
  private initialized = false;

  constructor(config?: Partial<PermissionConfig>) {
    this.config = { ...DEFAULT_PERMISSION_CONFIG, ...config };
    this.ruleStore = new RuleStore();
    this.stats = createStats();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load default rules
    const defaultRuleset = createDefaultRuleset();
    this.ruleStore.importRuleset(defaultRuleset);

    // Load project rules if configured
    if (this.config.rulesPath) {
      await this.loadRulesFromFile(this.config.rulesPath);
    }

    this.initialized = true;
    logger.debug("Permission manager initialized");
  }

  private async loadRulesFromFile(path: string): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(path, "utf-8");
      const rules = JSON.parse(content) as PermissionRule[];

      for (const rule of rules) {
        this.ruleStore.addRule(createRule(rule));
      }

      logger.debug(`Loaded ${rules.length} rules from ${path}`);
    } catch (error) {
      logger.warn(`Failed to load rules from ${path}:`, error);
    }
  }

  // ===========================================================================
  // Core Permission Checking
  // ===========================================================================

  async check(request: PermissionRequest): Promise<PermissionResult> {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if permission checking is disabled
    if (!this.config.enabled) {
      return { decision: "allow", requiresUserInput: false, reason: "Permission checking disabled" };
    }

    // Check if tool requires permission
    if (!requiresPermissionCheck(request.tool)) {
      return { decision: "allow", requiresUserInput: false, reason: "Exempt tool" };
    }

    // Check blocked patterns first
    const argsString = request.argsString ?? serializeArgs(request.args);
    if (this.isBlockedPattern(argsString)) {
      this.updateStats("denied", request.tool);
      return {
        decision: "deny",
        requiresUserInput: false,
        reason: "Blocked pattern",
      };
    }

    // Evaluate against rules
    const rules = this.ruleStore.getRules();
    const result = evaluateRequest(request, rules, this.config.defaultDecision);

    // Update stats
    this.updateStats(result.decision, request.tool);

    // If decision is "ask", wait for user response
    if (result.decision === "ask") {
      return this.askUser(request, result);
    }

    // Emit event
    this.emitEvent({
      type: "decision",
      request,
      result,
      timestamp: Date.now(),
    });

    if (this.config.logDecisions) {
      logger.info(`Permission: ${request.tool} → ${result.decision} (${result.reason})`);
    }

    return result;
  }

  checkSync(request: PermissionRequest): PermissionResult {
    // Synchronous check without user prompts
    if (!this.config.enabled) {
      return { decision: "allow", requiresUserInput: false };
    }

    if (!requiresPermissionCheck(request.tool)) {
      return { decision: "allow", requiresUserInput: false };
    }

    const argsString = request.argsString ?? serializeArgs(request.args);
    if (this.isBlockedPattern(argsString)) {
      return { decision: "deny", requiresUserInput: false, reason: "Blocked pattern" };
    }

    const rules = this.ruleStore.getRules();
    return evaluateRequest(request, rules, this.config.defaultDecision);
  }

  private isBlockedPattern(argsString: string): boolean {
    return (
      this.config.blockedPatterns.some((bp) => argsString.includes(bp)) ||
      isDangerousPattern(argsString)
    );
  }

  // ===========================================================================
  // User Interaction
  // ===========================================================================

  private async askUser(
    request: PermissionRequest,
    initialResult: PermissionResult
  ): Promise<PermissionResult> {
    return new Promise((resolve, reject) => {
      const requestId = request.id || generateRequestId();

      // Create pending request
      const pending: PendingRequest = {
        request: { ...request, id: requestId },
        resolve: (reply: PermissionReply) => {
          this.handleUserReply(requestId, reply, resolve);
        },
        reject,
      };

      // Set timeout
      pending.timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({
          decision: "deny",
          requiresUserInput: false,
          reason: "Permission request timed out",
        });
      }, this.config.askTimeout);

      // Store pending request
      this.pendingRequests.set(requestId, pending);

      // Emit event for UI to handle
      this.emitEvent({
        type: "request",
        request: pending.request,
        timestamp: Date.now(),
      });
    });
  }

  private handleUserReply(
    requestId: string,
    reply: PermissionReply,
    resolve: (result: PermissionResult) => void
  ): void {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      logger.warn(`No pending request found for ${requestId}`);
      return;
    }

    // Clear timeout
    if (pending.timeoutHandle) {
      clearTimeout(pending.timeoutHandle);
    }

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Process reply
    let result: PermissionResult;

    switch (reply) {
      case "once":
        this.stats.userApproved++;
        result = {
          decision: "allow",
          requiresUserInput: false,
          reason: "User approved (once)",
        };
        break;

      case "always":
        this.stats.userApproved++;
        // Add permanent allow rule
        const allowRule = createAllowRuleFromRequest(pending.request, "session");
        this.ruleStore.addRule(allowRule);
        result = {
          decision: "allow",
          matchedRule: allowRule,
          requiresUserInput: false,
          reason: "User approved (always)",
        };
        this.emitEvent({
          type: "rule_added",
          rule: allowRule,
          timestamp: Date.now(),
        });
        break;

      case "reject":
        this.stats.userRejected++;
        result = {
          decision: "deny",
          requiresUserInput: false,
          reason: "User rejected",
        };
        break;

      default:
        result = {
          decision: "deny",
          requiresUserInput: false,
          reason: "Invalid reply",
        };
    }

    // Emit decision event
    this.emitEvent({
      type: "decision",
      request: pending.request,
      result,
      timestamp: Date.now(),
    });

    resolve(result);
  }

  respondToRequest(requestId: string, reply: PermissionReply): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(reply);
    } else {
      logger.warn(`No pending request found for ${requestId}`);
    }
  }

  getPendingRequests(): PendingRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  // ===========================================================================
  // Rule Management
  // ===========================================================================

  addRule(
    partial: Partial<PermissionRule> & Pick<PermissionRule, "tool" | "action">
  ): PermissionRule {
    const rule = createRule(partial);
    this.ruleStore.addRule(rule);

    this.emitEvent({
      type: "rule_added",
      rule,
      timestamp: Date.now(),
    });

    return rule;
  }

  removeRule(id: string): boolean {
    const rule = this.ruleStore.getRule(id);
    const removed = this.ruleStore.removeRule(id);

    if (removed && rule) {
      this.emitEvent({
        type: "rule_removed",
        rule,
        timestamp: Date.now(),
      });
    }

    return removed;
  }

  getRules(scope?: PermissionScope): PermissionRule[] {
    return this.ruleStore.getRules(scope);
  }

  clearSessionRules(): void {
    this.ruleStore.clearRules("session");
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  configure(config: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...config };

    this.emitEvent({
      type: "config_changed",
      timestamp: Date.now(),
    });
  }

  getConfig(): PermissionConfig {
    return { ...this.config };
  }

  setContext(context: PermissionContext): void {
    this.context = context;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  private updateStats(decision: PermissionDecision, tool: string): void {
    if (!this.config.trackStats) return;

    this.stats.totalRequests++;
    this.stats.byTool[tool] = (this.stats.byTool[tool] ?? 0) + 1;
    this.stats.lastRequest = Date.now();

    switch (decision) {
      case "allow":
        this.stats.allowed++;
        break;
      case "deny":
        this.stats.denied++;
        break;
      case "ask":
        this.stats.asked++;
        break;
    }
  }

  getStats(): PermissionStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = createStats();
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  on(handler: PermissionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: PermissionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error("Permission event handler error:", error);
      }
    }
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async cleanup(): Promise<void> {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeoutHandle) {
        clearTimeout(pending.timeoutHandle);
      }
      pending.reject(new Error("Permission manager cleanup"));
    }
    this.pendingRequests.clear();

    // Clear session rules
    this.ruleStore.clearRules("session");

    // Clear event handlers
    this.eventHandlers.clear();

    this.initialized = false;
    logger.debug("Permission manager cleaned up");
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let permissionManagerInstance: PermissionManager | null = null;

/**
 * Get the global permission manager instance
 */
export function getPermissionManager(): IPermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager();
  }
  return permissionManagerInstance;
}

/**
 * Reset the permission manager (for testing)
 */
export function resetPermissionManager(): void {
  if (permissionManagerInstance) {
    permissionManagerInstance.cleanup().catch(console.error);
    permissionManagerInstance = null;
  }
}

/**
 * Create a new isolated permission manager (for testing or scoped usage)
 */
export function createPermissionManager(
  config?: Partial<PermissionConfig>
): IPermissionManager {
  return new PermissionManager(config);
}

/**
 * Helper to create a permission request
 */
export function createPermissionRequest(
  tool: string,
  args?: Record<string, unknown>,
  context?: Partial<PermissionRequest>
): PermissionRequest {
  return {
    id: generateRequestId(),
    tool,
    args,
    argsString: serializeArgs(args),
    sessionId: context?.sessionId ?? "unknown",
    workdir: context?.workdir ?? process.cwd(),
    timestamp: Date.now(),
    riskLevel: assessRiskLevel(tool, args),
    ...context,
  };
}

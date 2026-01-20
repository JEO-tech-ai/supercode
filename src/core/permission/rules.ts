/**
 * Permission Rules Engine
 * Rule storage, evaluation, and management with "Last Match Wins" semantics.
 */

import type {
  PermissionRule,
  PermissionRequest,
  PermissionResult,
  PermissionScope,
  PermissionDecision,
  PermissionRuleset,
  PermissionContext,
} from "./types";
import { matchTool, matchArgs, serializeArgs } from "./patterns";
import logger from "../../shared/logger";

/**
 * Rule storage interface
 */
export interface IRuleStore {
  getRules(scope?: PermissionScope): PermissionRule[];
  getRule(id: string): PermissionRule | undefined;
  addRule(rule: PermissionRule): void;
  updateRule(id: string, updates: Partial<PermissionRule>): boolean;
  removeRule(id: string): boolean;
  clearRules(scope?: PermissionScope): void;
  getRulesets(): PermissionRuleset[];
  importRuleset(ruleset: PermissionRuleset): void;
  exportRuleset(scope: PermissionScope): PermissionRuleset;
}

/**
 * Generate a unique rule ID
 */
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new permission rule with defaults
 */
export function createRule(
  partial: Partial<PermissionRule> & Pick<PermissionRule, "tool" | "action">
): PermissionRule {
  return {
    id: partial.id ?? generateRuleId(),
    tool: partial.tool,
    pattern: partial.pattern,
    action: partial.action,
    reason: partial.reason,
    scope: partial.scope ?? "session",
    priority: partial.priority ?? 0,
    enabled: partial.enabled ?? true,
    createdAt: partial.createdAt ?? Date.now(),
    expiresAt: partial.expiresAt,
    metadata: partial.metadata ?? { source: "user" },
  };
}

/**
 * In-memory rule store implementation
 */
export class RuleStore implements IRuleStore {
  private rules: Map<string, PermissionRule> = new Map();
  private rulesets: Map<string, PermissionRuleset> = new Map();

  getRules(scope?: PermissionScope): PermissionRule[] {
    const allRules = Array.from(this.rules.values());

    const filtered = scope
      ? allRules.filter((r) => r.scope === scope)
      : allRules;

    // Filter out expired rules
    const now = Date.now();
    const active = filtered.filter((r) => {
      if (r.expiresAt && r.expiresAt < now) {
        // Clean up expired rule
        this.rules.delete(r.id);
        return false;
      }
      return r.enabled;
    });

    // Sort by priority (ascending) for "last match wins"
    return active.sort((a, b) => a.priority - b.priority);
  }

  getRule(id: string): PermissionRule | undefined {
    return this.rules.get(id);
  }

  addRule(rule: PermissionRule): void {
    this.rules.set(rule.id, rule);
    logger.debug(`Permission rule added: ${rule.id} (${rule.tool} → ${rule.action})`);
  }

  updateRule(id: string, updates: Partial<PermissionRule>): boolean {
    const existing = this.rules.get(id);
    if (!existing) return false;

    const updated: PermissionRule = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot be changed
      createdAt: existing.createdAt, // createdAt cannot be changed
    };

    this.rules.set(id, updated);
    logger.debug(`Permission rule updated: ${id}`);
    return true;
  }

  removeRule(id: string): boolean {
    const deleted = this.rules.delete(id);
    if (deleted) {
      logger.debug(`Permission rule removed: ${id}`);
    }
    return deleted;
  }

  clearRules(scope?: PermissionScope): void {
    if (scope) {
      for (const [id, rule] of this.rules) {
        if (rule.scope === scope) {
          this.rules.delete(id);
        }
      }
      logger.debug(`Permission rules cleared for scope: ${scope}`);
    } else {
      this.rules.clear();
      logger.debug("All permission rules cleared");
    }
  }

  getRulesets(): PermissionRuleset[] {
    return Array.from(this.rulesets.values());
  }

  importRuleset(ruleset: PermissionRuleset): void {
    // Add all rules from the ruleset
    for (const rule of ruleset.rules) {
      this.addRule({
        ...rule,
        scope: ruleset.scope,
        metadata: {
          ...rule.metadata,
          source: "project",
        },
      });
    }

    // Store ruleset metadata
    this.rulesets.set(ruleset.id, ruleset);
    logger.debug(`Imported ruleset: ${ruleset.name} (${ruleset.rules.length} rules)`);
  }

  exportRuleset(scope: PermissionScope): PermissionRuleset {
    const rules = this.getRules(scope);

    return {
      id: `ruleset_${scope}_${Date.now()}`,
      name: `${scope} rules`,
      description: `Exported ${scope} permission rules`,
      rules,
      scope,
      enabled: true,
      version: 1,
    };
  }
}

/**
 * Evaluate a permission request against rules
 * Uses "Last Match Wins" semantics - rules are evaluated in priority order,
 * and the last matching rule determines the decision.
 */
export function evaluateRequest(
  request: PermissionRequest,
  rules: PermissionRule[],
  defaultDecision: PermissionDecision = "ask"
): PermissionResult {
  let matchedRule: PermissionRule | undefined;
  let decision: PermissionDecision = defaultDecision;

  // Serialize args for pattern matching
  const argsString = request.argsString ?? serializeArgs(request.args);

  // Evaluate rules in priority order (ascending)
  // Last match wins, so we continue through all rules
  for (const rule of rules) {
    // Check if rule matches
    if (!matchTool(rule.tool, request.tool)) {
      continue;
    }

    // Check pattern if specified
    if (rule.pattern && !matchArgs(rule.pattern, request.args, argsString)) {
      continue;
    }

    // Rule matches - update decision
    matchedRule = rule;
    decision = rule.action;

    logger.debug(
      `Rule matched: ${rule.id} (${rule.tool}/${rule.pattern ?? "*"}) → ${rule.action}`
    );
  }

  return {
    decision,
    matchedRule,
    reason: matchedRule?.reason ?? (matchedRule ? `Matched rule: ${matchedRule.id}` : undefined),
    requiresUserInput: decision === "ask",
  };
}

/**
 * Find rules that would match a given tool/pattern
 */
export function findMatchingRules(
  rules: PermissionRule[],
  tool: string,
  pattern?: string
): PermissionRule[] {
  return rules.filter((rule) => {
    if (!matchTool(rule.tool, tool)) return false;
    if (pattern && rule.pattern && !matchArgs(rule.pattern, undefined, pattern)) {
      return false;
    }
    return true;
  });
}

/**
 * Check if a rule conflicts with existing rules
 */
export function checkRuleConflict(
  newRule: PermissionRule,
  existingRules: PermissionRule[]
): PermissionRule | undefined {
  // Find rules with same tool and pattern but different action
  return existingRules.find(
    (r) =>
      r.tool === newRule.tool &&
      r.pattern === newRule.pattern &&
      r.action !== newRule.action &&
      r.scope === newRule.scope
  );
}

/**
 * Merge rules from multiple sources with priority
 */
export function mergeRules(
  ...ruleSets: PermissionRule[][]
): PermissionRule[] {
  const merged: Map<string, PermissionRule> = new Map();

  for (const rules of ruleSets) {
    for (const rule of rules) {
      // Use tool+pattern+scope as dedup key
      const key = `${rule.tool}:${rule.pattern ?? "*"}:${rule.scope}`;
      const existing = merged.get(key);

      // Higher priority wins for same key
      if (!existing || rule.priority >= existing.priority) {
        merged.set(key, rule);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Validate a rule for correctness
 */
export function validateRule(rule: Partial<PermissionRule>): string[] {
  const errors: string[] = [];

  if (!rule.tool) {
    errors.push("Tool is required");
  }

  if (!rule.action || !["allow", "deny", "ask"].includes(rule.action)) {
    errors.push("Valid action (allow/deny/ask) is required");
  }

  if (rule.priority !== undefined && (rule.priority < -1000 || rule.priority > 1000)) {
    errors.push("Priority must be between -1000 and 1000");
  }

  if (rule.scope && !["session", "project", "global"].includes(rule.scope)) {
    errors.push("Invalid scope");
  }

  if (rule.expiresAt && rule.expiresAt < Date.now()) {
    errors.push("Expiration time is in the past");
  }

  return errors;
}

/**
 * Create a quick allow rule for a specific request
 */
export function createAllowRuleFromRequest(
  request: PermissionRequest,
  scope: PermissionScope = "session"
): PermissionRule {
  return createRule({
    tool: request.tool,
    pattern: request.argsString ?? serializeArgs(request.args),
    action: "allow",
    reason: "User approved",
    scope,
    metadata: {
      source: "user",
      createdBy: "permission_prompt",
    },
  });
}

/**
 * Create a deny rule for a specific request
 */
export function createDenyRuleFromRequest(
  request: PermissionRequest,
  scope: PermissionScope = "session"
): PermissionRule {
  return createRule({
    tool: request.tool,
    pattern: request.argsString ?? serializeArgs(request.args),
    action: "deny",
    reason: "User rejected",
    scope,
    metadata: {
      source: "user",
      createdBy: "permission_prompt",
    },
  });
}

/**
 * Permission System
 * Centralized permission management with "Last Match Wins" rule evaluation.
 *
 * @example
 * ```typescript
 * import { getPermissionManager, createPermissionRequest } from '~/core/permission';
 *
 * const manager = getPermissionManager();
 * await manager.initialize();
 *
 * const request = createPermissionRequest('Bash', { command: 'rm -rf node_modules' });
 * const result = await manager.check(request);
 *
 * if (result.decision === 'allow') {
 *   // Execute the tool
 * } else if (result.decision === 'deny') {
 *   // Block execution
 * } else {
 *   // Wait for user response
 * }
 * ```
 */

// Types
export type {
  PermissionDecision,
  PermissionReply,
  PermissionScope,
  ToolCategory,
  PermissionRule,
  PermissionRequest,
  PermissionResult,
  PendingRequest,
  PermissionContext,
  PermissionConfig,
  PermissionStats,
  PermissionRuleset,
  PermissionEvent,
  PermissionEventHandler,
} from "./types";

// Pattern utilities
export {
  globToRegex,
  matchGlob,
  matchTool,
  matchArgs,
  serializeArgs,
  extractPrimaryArg,
  isPathWithin,
  normalizePath,
  isDangerousPattern,
  extractExecutable,
  isFileSystemModification,
} from "./patterns";

// Rule management
export type { IRuleStore } from "./rules";
export {
  RuleStore,
  createRule,
  generateRuleId,
  evaluateRequest,
  findMatchingRules,
  checkRuleConflict,
  mergeRules,
  validateRule,
  createAllowRuleFromRequest,
  createDenyRuleFromRequest,
} from "./rules";

// Default configurations
export {
  DEFAULT_PERMISSION_CONFIG,
  READ_ONLY_TOOLS,
  FILESYSTEM_TOOLS,
  EXECUTION_TOOLS,
  createDefaultReadRules,
  createCriticalFileProtectionRules,
  createDangerousCommandRules,
  createProjectScopeRules,
  createDefaultRuleset,
  assessRiskLevel,
  requiresPermissionCheck,
} from "./defaults";

// Permission manager
export type { IPermissionManager } from "./manager";
export {
  getPermissionManager,
  resetPermissionManager,
  createPermissionManager,
  createPermissionRequest,
} from "./manager";

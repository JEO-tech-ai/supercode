/**
 * Hooks Module
 * Central export for all SuperCode hooks.
 * Provides factory functions for creating hooks and initialization utilities.
 */

// ============================================================================
// Type Exports
// ============================================================================
export * from "./types";

// ============================================================================
// Registry Exports
// ============================================================================
export * from "./registry";

// ============================================================================
// Existing Hooks
// ============================================================================
export { todoContinuationHook } from "./todo-continuation";
export { loggingHook } from "./logging";

// ============================================================================
// Session & Lifecycle Hooks
// ============================================================================
export {
  createSessionRecoveryHook,
  detectErrorType,
  isRecoverableError,
  resetRecoveryState as clearRecoveryState,
} from "./session-recovery";
export type {
  SessionRecoveryOptions,
  RecoveryErrorType,
} from "./session-recovery";

export {
  createSessionLifecycleHook,
  getSessionState,
  getAllSessions,
  getActiveSessionCount,
  setSessionMetadata,
  getSessionMetadata,
  cleanup as cleanupSessionLifecycle,
} from "./session-lifecycle";
export type {
  SessionLifecycleOptions,
  SessionState,
} from "./session-lifecycle";

// ============================================================================
// Context Window Hooks
// ============================================================================
export {
  createContextWindowMonitorHook,
  getUsageStatus as getContextWindowState,
  resetUsageStatus as resetContextWindowState,
  clearAllUsageStatus,
} from "./context-window-monitor";
export type { ContextWindowMonitorOptions } from "./context-window-monitor";

export {
  createContextWindowLimitRecoveryHook,
  parseTokenLimitError,
  getPendingCompactions,
  getCompactionState,
  resetCompactionState,
} from "./context-window-limit-recovery";
export type {
  ContextWindowLimitRecoveryOptions,
  ParsedTokenLimitError,
  CompactionResult,
} from "./context-window-limit-recovery";

export {
  createPreemptiveCompactionHook,
  getCompactionState as getPreemptiveCompactionState,
  resetCompactionState as resetPreemptiveCompactionState,
} from "./preemptive-compaction";
export type { PreemptiveCompactionOptions } from "./preemptive-compaction";

// ============================================================================
// Tool Hooks
// ============================================================================
export {
  createToolOutputTruncatorHook,
  getTruncationStats,
  resetTruncationStats,
} from "./tool-output-truncator";
export type { ToolOutputTruncatorOptions } from "./tool-output-truncator";

export {
  createToolCallMonitorHook,
  getToolStats,
  getAllToolStats,
  clearToolStats,
  getToolStatsSummary,
} from "./tool-call-monitor";
export type {
  ToolCallMonitorOptions,
  ToolCallStats,
  SessionToolStats,
} from "./tool-call-monitor";

// ============================================================================
// Validation Hooks
// ============================================================================
export {
  createThinkingBlockValidatorHook,
  validateParts,
  fixParts,
} from "./thinking-block-validator";
export type {
  ThinkingBlockValidatorOptions,
  ValidationResult,
} from "./thinking-block-validator";

// ============================================================================
// Error Recovery Hooks
// ============================================================================
export {
  createEditErrorRecoveryHook,
  detectEditErrorType,
  isRecoverableEditError,
  clearRetryState,
} from "./edit-error-recovery";
export type {
  EditErrorType,
  EditErrorRecoveryOptions,
} from "./edit-error-recovery";

// ============================================================================
// Context Injection Hooks
// ============================================================================
export {
  createRulesInjectorHook,
  collectRules,
  clearRulesCache,
  getRulesCacheStats,
} from "./rules-injector";
export type {
  RulesInjectorOptions,
  RuleSource,
  CollectedRules,
} from "./rules-injector";

export {
  createDirectoryReadmeInjectorHook,
  clearReadmeCache,
} from "./directory-readme-injector";
export type { DirectoryReadmeInjectorOptions } from "./directory-readme-injector";

export {
  createPromptContextInjectorHook,
  createContextCollector,
  getGlobalCollector,
  addContext,
  hasPendingContext,
  clearContext,
} from "./prompt-context-injector";
export type {
  PromptContextInjectorOptions,
  ContextCollector,
  ConsumedContext,
} from "./prompt-context-injector";

// ============================================================================
// Legacy Hook Registry Access
// ============================================================================
import { getHookRegistry as getLegacyHookRegistry } from "../hooks";

// ============================================================================
// Hook Initialization
// ============================================================================

/**
 * Hook configuration options
 */
export interface HookInitOptions {
  /** Enable session lifecycle management */
  sessionLifecycle?: boolean;
  /** Enable context window monitoring */
  contextWindowMonitor?: boolean;
  /** Enable tool call monitoring */
  toolCallMonitor?: boolean;
  /** Enable output truncation */
  outputTruncator?: boolean;
  /** Enable thinking block validation */
  thinkingValidator?: boolean;
  /** Enable rules injection */
  rulesInjector?: boolean;
  /** Enable README injection */
  readmeInjector?: boolean;
  /** Enable session recovery */
  sessionRecovery?: boolean;
  /** Enable edit error recovery */
  editErrorRecovery?: boolean;
  /** Enable context window limit recovery */
  contextLimitRecovery?: boolean;
  /** Enable preemptive compaction */
  preemptiveCompaction?: boolean;
  /** Enable prompt context injection */
  promptContextInjector?: boolean;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Default hook configuration
 */
const DEFAULT_HOOK_OPTIONS: HookInitOptions = {
  sessionLifecycle: true,
  contextWindowMonitor: true,
  toolCallMonitor: true,
  outputTruncator: true,
  thinkingValidator: true,
  rulesInjector: true,
  readmeInjector: false, // Disabled by default to avoid noise
  sessionRecovery: true,
  editErrorRecovery: true,
  contextLimitRecovery: true,
  preemptiveCompaction: true,
  promptContextInjector: true,
  debug: false,
};

// ============================================================================
// Imports for Hook Creation
// ============================================================================
import { todoContinuationHook } from "./todo-continuation";
import { loggingHook } from "./logging";
import { createSessionRecoveryHook } from "./session-recovery";
import { createSessionLifecycleHook } from "./session-lifecycle";
import { createContextWindowMonitorHook } from "./context-window-monitor";
import { createContextWindowLimitRecoveryHook } from "./context-window-limit-recovery";
import { createPreemptiveCompactionHook } from "./preemptive-compaction";
import { createToolOutputTruncatorHook } from "./tool-output-truncator";
import { createToolCallMonitorHook } from "./tool-call-monitor";
import { createThinkingBlockValidatorHook } from "./thinking-block-validator";
import { createEditErrorRecoveryHook } from "./edit-error-recovery";
import { createRulesInjectorHook } from "./rules-injector";
import { createDirectoryReadmeInjectorHook } from "./directory-readme-injector";
import { createPromptContextInjectorHook } from "./prompt-context-injector";

/**
 * Initialize all hooks with the given options
 */
export function initializeHooks(options: HookInitOptions = {}): void {
  const opts = { ...DEFAULT_HOOK_OPTIONS, ...options };
  const registry = getLegacyHookRegistry();

  // Always register core hooks
  registry.register(todoContinuationHook);
  registry.register(loggingHook);

  // Session & Lifecycle
  if (opts.sessionLifecycle) {
    registry.register(createSessionLifecycleHook({ debug: opts.debug }));
  }

  if (opts.sessionRecovery) {
    registry.register(createSessionRecoveryHook({ debug: opts.debug }));
  }

  // Context Window
  if (opts.contextWindowMonitor) {
    registry.register(createContextWindowMonitorHook({ debug: opts.debug }));
  }

  if (opts.contextLimitRecovery) {
    registry.register(createContextWindowLimitRecoveryHook({ debug: opts.debug }));
  }

  if (opts.preemptiveCompaction) {
    registry.register(createPreemptiveCompactionHook({ debug: opts.debug }));
  }

  // Tools
  if (opts.toolCallMonitor) {
    registry.register(createToolCallMonitorHook({ debug: opts.debug }));
  }

  if (opts.outputTruncator) {
    registry.register(createToolOutputTruncatorHook({ debug: opts.debug }));
  }

  // Validation
  if (opts.thinkingValidator) {
    registry.register(createThinkingBlockValidatorHook({ debug: opts.debug }));
  }

  // Error Recovery
  if (opts.editErrorRecovery) {
    registry.register(createEditErrorRecoveryHook({ debug: opts.debug }));
  }

  // Context Injection
  if (opts.rulesInjector) {
    registry.register(createRulesInjectorHook({ debug: opts.debug }));
  }

  if (opts.readmeInjector) {
    registry.register(createDirectoryReadmeInjectorHook({ debug: opts.debug }));
  }

  if (opts.promptContextInjector) {
    registry.register(createPromptContextInjectorHook(undefined, { debug: opts.debug }));
  }
}

/**
 * Initialize hooks with minimal configuration (for testing)
 */
export function initializeMinimalHooks(): void {
  const registry = getLegacyHookRegistry();
  registry.register(todoContinuationHook);
  registry.register(loggingHook);
}

/**
 * Get list of all available hook factories
 */
export function getAvailableHookFactories(): string[] {
  return [
    "createSessionRecoveryHook",
    "createSessionLifecycleHook",
    "createContextWindowMonitorHook",
    "createContextWindowLimitRecoveryHook",
    "createPreemptiveCompactionHook",
    "createToolOutputTruncatorHook",
    "createToolCallMonitorHook",
    "createThinkingBlockValidatorHook",
    "createEditErrorRecoveryHook",
    "createRulesInjectorHook",
    "createDirectoryReadmeInjectorHook",
    "createPromptContextInjectorHook",
  ];
}

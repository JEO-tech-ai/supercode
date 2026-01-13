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
// Session Notification Hooks
// ============================================================================
export {
  createSessionNotificationHook,
  clearNotificationState,
  getAllNotificationStates,
} from "./session-notification";
export type { SessionNotificationOptions } from "./session-notification";

// ============================================================================
// Comment Checker Hooks
// ============================================================================
export {
  createCommentCheckerHook,
  checkCodeForComments,
} from "./comment-checker";
export type { CommentCheckerOptions } from "./comment-checker";

// ============================================================================
// Directory Agents Injector Hooks
// ============================================================================
export {
  createDirectoryAgentsInjectorHook,
  clearAgentsCache,
  getAgentsCacheStats,
} from "./directory-agents-injector";
export type { DirectoryAgentsInjectorOptions } from "./directory-agents-injector";

// ============================================================================
// Empty Task Response Detector Hooks
// ============================================================================
export { createEmptyTaskResponseDetectorHook } from "./empty-task-response-detector";
export type { EmptyTaskResponseDetectorOptions } from "./empty-task-response-detector";

// ============================================================================
// Think Mode Hooks
// ============================================================================
export {
  createThinkModeHook,
  getDefaultThinkKeywords,
} from "./think-mode";
export type { ThinkModeOptions } from "./think-mode";

// ============================================================================
// Keyword Detector Hooks
// ============================================================================
export {
  createKeywordDetectorHook,
  createKeywordConfig,
} from "./keyword-detector";
export type { KeywordDetectorOptions, KeywordConfig } from "./keyword-detector";

// ============================================================================
// Auto Slash Command Hooks
// ============================================================================
export {
  createAutoSlashCommandHook,
  getAvailableSlashCommands,
  createSlashCommand,
} from "./auto-slash-command";
export type { AutoSlashCommandOptions, SlashCommand } from "./auto-slash-command";

// ============================================================================
// Background Notification Hooks
// ============================================================================
export {
  createBackgroundNotificationHook,
  getBackgroundTasks,
  getRunningTasks,
  clearCompletedTasks,
} from "./background-notification";
export type { BackgroundNotificationOptions } from "./background-notification";

// ============================================================================
// Ralph Loop Hooks
// ============================================================================
export {
  createRalphLoopHook,
  getLoopState,
  stopLoop,
  clearLoopState,
  startLoop,
  cancelLoop,
  isLoopActive,
  readState as readLoopState,
  writeState as writeLoopState,
  incrementIteration as incrementLoopIteration,
} from "./ralph-loop";
export type {
  RalphLoopOptions,
  RalphLoopState,
  RalphLoopHook,
  StartLoopOptions,
} from "./ralph-loop";

// ============================================================================
// Interactive Bash Session Hooks
// ============================================================================
export {
  createInteractiveBashSessionHook,
  getActiveBashSessions,
  clearBashSessions,
  getAllActiveBashSessions,
} from "./interactive-bash-session";
export type { InteractiveBashSessionOptions } from "./interactive-bash-session";

// ============================================================================
// Non-Interactive Environment Hooks
// ============================================================================
export {
  createNonInteractiveEnvHook,
  getDefaultEnvVars,
  getDefaultTargetCommands,
} from "./non-interactive-env";
export type { NonInteractiveEnvOptions } from "./non-interactive-env";

// ============================================================================
// Empty Message Sanitizer Hooks
// ============================================================================
export {
  createEmptyMessageSanitizerHook,
  isMessageEmpty,
  sanitize,
} from "./empty-message-sanitizer";
export type { EmptyMessageSanitizerOptions } from "./empty-message-sanitizer";

// ============================================================================
// Agent Usage Reminder Hooks
// ============================================================================
export {
  createAgentUsageReminderHook,
  getUsageStats,
  clearUsageStats,
  getAllUsageStats,
} from "./agent-usage-reminder";
export type { AgentUsageReminderOptions } from "./agent-usage-reminder";

// ============================================================================
// Compaction Context Injector Hooks
// ============================================================================
export {
  createCompactionContextInjectorHook,
  getDefaultCompactionInstructions,
} from "./compaction-context-injector";
export type { CompactionContextInjectorOptions } from "./compaction-context-injector";

// ============================================================================
// Auto Update Checker Hooks
// ============================================================================
export {
  createAutoUpdateCheckerHook,
  checkForUpdate,
  getCachedVersion,
  getLatestVersion,
  invalidatePackage,
  invalidateCache,
} from "./auto-update-checker";
export type {
  AutoUpdateCheckerOptions,
  UpdateCheckResult,
  PluginEntryInfo,
} from "./auto-update-checker";

// ============================================================================
// Claude Code Hooks
// ============================================================================
export {
  createClaudeCodeHooksHook,
  loadClaudeHooksConfig,
  getClaudeSettingsPaths,
  executePreToolUseHooks,
  executePostToolUseHooks,
  executeUserPromptSubmitHooks,
  executeStopHooks,
  executePreCompactHooks,
  setStopHookActive,
  getStopHookActive,
  clearStopHookState,
  executeHookCommand,
  findMatchingHooks,
  transformToolName,
  objectToSnakeCase,
  isHookDisabled,
} from "./claude-code-hooks";
export type {
  ClaudeCodeHooksOptions,
  ClaudeHooksConfig,
  ClaudeHookEvent,
  HookMatcher,
  HookCommand,
  PreToolUseInput,
  PostToolUseInput,
  UserPromptSubmitInput,
  StopInput,
  PreCompactInput,
  PreToolUseOutput,
  PostToolUseOutput,
  StopOutput,
  PreCompactOutput,
  PermissionDecision,
  PermissionMode,
  PreToolUseContext,
  PreToolUseResult,
  PostToolUseContext,
  PostToolUseResult,
  UserPromptSubmitContext,
  UserPromptSubmitResult,
  MessagePart,
  StopContext,
  StopResult,
  PreCompactContext,
  PreCompactResult,
} from "./claude-code-hooks";

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
  /** Enable session notifications */
  sessionNotification?: boolean;
  /** Enable comment checker */
  commentChecker?: boolean;
  /** Enable directory agents injector */
  directoryAgentsInjector?: boolean;
  /** Enable empty task response detector */
  emptyTaskResponseDetector?: boolean;
  /** Enable think mode */
  thinkMode?: boolean;
  /** Enable keyword detector */
  keywordDetector?: boolean;
  /** Enable auto slash command */
  autoSlashCommand?: boolean;
  /** Enable background notification */
  backgroundNotification?: boolean;
  /** Enable ralph loop */
  ralphLoop?: boolean;
  /** Enable interactive bash session */
  interactiveBashSession?: boolean;
  /** Enable non-interactive environment */
  nonInteractiveEnv?: boolean;
  /** Enable empty message sanitizer */
  emptyMessageSanitizer?: boolean;
  /** Enable agent usage reminder */
  agentUsageReminder?: boolean;
  /** Enable compaction context injector */
  compactionContextInjector?: boolean;
  /** Enable auto update checker */
  autoUpdateChecker?: boolean;
  /** Enable Claude Code Hooks compatibility */
  claudeCodeHooks?: boolean;
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
  sessionNotification: false, // Disabled by default (OS notifications)
  commentChecker: true,
  directoryAgentsInjector: true,
  emptyTaskResponseDetector: true,
  thinkMode: true,
  keywordDetector: true,
  autoSlashCommand: true,
  backgroundNotification: true,
  ralphLoop: false, // Disabled by default (opt-in feature)
  interactiveBashSession: true,
  nonInteractiveEnv: true,
  emptyMessageSanitizer: true,
  agentUsageReminder: true,
  compactionContextInjector: true,
  autoUpdateChecker: true,
  claudeCodeHooks: true,
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
import { createSessionNotificationHook } from "./session-notification";
import { createCommentCheckerHook } from "./comment-checker";
import { createDirectoryAgentsInjectorHook } from "./directory-agents-injector";
import { createEmptyTaskResponseDetectorHook } from "./empty-task-response-detector";
import { createThinkModeHook } from "./think-mode";
import { createKeywordDetectorHook } from "./keyword-detector";
import { createAutoSlashCommandHook } from "./auto-slash-command";
import { createBackgroundNotificationHook } from "./background-notification";
import { createRalphLoopHook } from "./ralph-loop";
import { createInteractiveBashSessionHook } from "./interactive-bash-session";
import { createNonInteractiveEnvHook } from "./non-interactive-env";
import { createEmptyMessageSanitizerHook } from "./empty-message-sanitizer";
import { createAgentUsageReminderHook } from "./agent-usage-reminder";
import { createCompactionContextInjectorHook } from "./compaction-context-injector";
import { createAutoUpdateCheckerHook } from "./auto-update-checker";
import { createClaudeCodeHooksHook } from "./claude-code-hooks";

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

  // Session Notification
  if (opts.sessionNotification) {
    registry.register(createSessionNotificationHook({ debug: opts.debug }));
  }

  // Comment Checker
  if (opts.commentChecker) {
    registry.register(createCommentCheckerHook({ debug: opts.debug }));
  }

  // Directory Agents Injector
  if (opts.directoryAgentsInjector) {
    registry.register(createDirectoryAgentsInjectorHook({ debug: opts.debug }));
  }

  // Empty Task Response Detector
  if (opts.emptyTaskResponseDetector) {
    registry.register(createEmptyTaskResponseDetectorHook({ debug: opts.debug }));
  }

  // Think Mode
  if (opts.thinkMode) {
    registry.register(createThinkModeHook({ debug: opts.debug }));
  }

  // Keyword Detector
  if (opts.keywordDetector) {
    registry.register(createKeywordDetectorHook({ debug: opts.debug }));
  }

  // Auto Slash Command
  if (opts.autoSlashCommand) {
    registry.register(createAutoSlashCommandHook({ debug: opts.debug }));
  }

  // Background Notification
  if (opts.backgroundNotification) {
    registry.register(createBackgroundNotificationHook({ debug: opts.debug }));
  }

  // Ralph Loop
  if (opts.ralphLoop) {
    registry.register(createRalphLoopHook({ debug: opts.debug }));
  }

  // Interactive Bash Session
  if (opts.interactiveBashSession) {
    registry.register(createInteractiveBashSessionHook({ debug: opts.debug }));
  }

  // Non-Interactive Environment
  if (opts.nonInteractiveEnv) {
    registry.register(createNonInteractiveEnvHook({ debug: opts.debug }));
  }

  // Empty Message Sanitizer
  if (opts.emptyMessageSanitizer) {
    registry.register(createEmptyMessageSanitizerHook({ debug: opts.debug }));
  }

  // Agent Usage Reminder
  if (opts.agentUsageReminder) {
    registry.register(createAgentUsageReminderHook({ debug: opts.debug }));
  }

  // Compaction Context Injector
  if (opts.compactionContextInjector) {
    registry.register(createCompactionContextInjectorHook({ debug: opts.debug }));
  }

  // Auto Update Checker
  if (opts.autoUpdateChecker) {
    registry.register(createAutoUpdateCheckerHook({ debug: opts.debug }));
  }

  // Claude Code Hooks
  if (opts.claudeCodeHooks) {
    registry.register(createClaudeCodeHooksHook({ debug: opts.debug }));
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
    // Session & Lifecycle
    "createSessionRecoveryHook",
    "createSessionLifecycleHook",
    // Context Window
    "createContextWindowMonitorHook",
    "createContextWindowLimitRecoveryHook",
    "createPreemptiveCompactionHook",
    // Tools
    "createToolOutputTruncatorHook",
    "createToolCallMonitorHook",
    // Validation
    "createThinkingBlockValidatorHook",
    // Error Recovery
    "createEditErrorRecoveryHook",
    // Context Injection
    "createRulesInjectorHook",
    "createDirectoryReadmeInjectorHook",
    "createPromptContextInjectorHook",
    // Session Notification
    "createSessionNotificationHook",
    // Comment Checker
    "createCommentCheckerHook",
    // Directory Agents Injector
    "createDirectoryAgentsInjectorHook",
    // Empty Task Response Detector
    "createEmptyTaskResponseDetectorHook",
    // Think Mode
    "createThinkModeHook",
    // Keyword Detector
    "createKeywordDetectorHook",
    // Auto Slash Command
    "createAutoSlashCommandHook",
    // Background Notification
    "createBackgroundNotificationHook",
    // Ralph Loop
    "createRalphLoopHook",
    // Interactive Bash Session
    "createInteractiveBashSessionHook",
    // Non-Interactive Environment
    "createNonInteractiveEnvHook",
    // Empty Message Sanitizer
    "createEmptyMessageSanitizerHook",
    // Agent Usage Reminder
    "createAgentUsageReminderHook",
    // Compaction Context Injector
    "createCompactionContextInjectorHook",
    // Auto Update Checker
    "createAutoUpdateCheckerHook",
    // Claude Code Hooks
    "createClaudeCodeHooksHook",
  ];
}

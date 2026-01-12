/**
 * Ralph Loop Type Definitions
 * Self-referential development loop for autonomous task completion.
 * Enhanced from Oh-My-OpenCode patterns for SuperCode integration.
 */

/**
 * Persistent state for Ralph Loop
 */
export interface RalphLoopState {
  /** Whether the loop is currently active */
  active: boolean;
  /** Current iteration number */
  iteration: number;
  /** Maximum allowed iterations */
  maxIterations: number;
  /** Completion promise keyword */
  completionPromise: string;
  /** When the loop started (ISO timestamp) */
  startedAt: string;
  /** The original task/prompt */
  prompt: string;
  /** Session ID that owns this loop */
  sessionId?: string;
  /** History of responses (optional, for debugging) */
  history?: string[];
}

/**
 * Configuration options for Ralph Loop
 */
export interface RalphLoopOptions {
  /** Maximum iterations before auto-stop (default: 100) */
  maxIterations?: number;
  /** Completion promise keyword (default: "DONE") */
  completionPromise?: string;
  /** Enable auto-continue between iterations */
  autoContinue?: boolean;
  /** Custom state file path relative to project dir */
  stateDir?: string;
  /** API timeout for session checks in ms (default: 3000) */
  apiTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Ralph Loop hook interface
 */
export interface RalphLoopHook {
  /** Hook name */
  name: string;
  /** Hook description */
  description: string;
  /** Events this hook handles */
  events: string[];
  /** Event handler */
  handler: (context: RalphLoopContext) => Promise<RalphLoopResult>;
  /** Start a new loop */
  startLoop: (sessionId: string, prompt: string, options?: StartLoopOptions) => boolean;
  /** Cancel an active loop */
  cancelLoop: (sessionId: string) => boolean;
  /** Get current state */
  getState: () => RalphLoopState | null;
  /** Check if loop is active */
  isActive: () => boolean;
}

/**
 * Options for starting a new loop
 */
export interface StartLoopOptions {
  maxIterations?: number;
  completionPromise?: string;
}

/**
 * Context passed to Ralph Loop handler
 */
export interface RalphLoopContext {
  event: string;
  sessionId: string;
  workdir: string;
  data?: {
    message?: string;
    response?: string;
    error?: Error | unknown;
    [key: string]: unknown;
  };
  timestamp?: number;
}

/**
 * Result from Ralph Loop handler
 */
export interface RalphLoopResult {
  /** Continue processing */
  continue?: boolean;
  /** Modified prompt to inject */
  prompt?: string;
  /** Context to prepend */
  prependContext?: string;
  /** Message to append */
  appendMessage?: string;
  /** Skip original action */
  skipAction?: boolean;
  /** Error if any */
  error?: string;
}

/**
 * Session state for recovery tracking
 */
export interface SessionState {
  /** Whether session is recovering from error */
  isRecovering?: boolean;
  /** Recovery timeout handle */
  recoveryTimeout?: NodeJS.Timeout;
}

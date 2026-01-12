/**
 * Todo Continuation Types
 * Type definitions for todo continuation enforcer hook.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Todo item structure
 */
export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: string;
  activeForm?: string;
}

/**
 * Session state for todo continuation
 */
export interface SessionState {
  /** Countdown timer handle */
  countdownTimer?: ReturnType<typeof setTimeout>;
  /** Countdown interval handle */
  countdownInterval?: ReturnType<typeof setInterval>;
  /** Whether session is in recovery state */
  isRecovering?: boolean;
  /** When countdown started */
  countdownStartedAt?: number;
}

/**
 * Message info from session
 */
export interface MessageInfo {
  id?: string;
  sessionId?: string;
  role?: "user" | "assistant" | "system";
  error?: {
    name?: string;
    message?: string;
    data?: unknown;
  };
  agent?: string;
  model?: {
    providerID?: string;
    modelID?: string;
  };
  tools?: {
    write?: boolean;
    edit?: boolean;
  };
}

/**
 * Todo continuation hook options
 */
export interface TodoContinuationOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Countdown duration in seconds (default: 2) */
  countdownSeconds?: number;
  /** Toast duration in milliseconds (default: 900) */
  toastDurationMs?: number;
  /** Grace period before accepting user input as interruption (default: 500ms) */
  gracePeriodMs?: number;
  /** Custom continuation prompt */
  continuationPrompt?: string;
}

/**
 * Todo continuation enforcer interface
 */
export interface TodoContinuationEnforcer {
  /** Mark session as recovering (pauses countdown) */
  markRecovering: (sessionId: string) => void;
  /** Mark session recovery complete (resumes countdown) */
  markRecoveryComplete: (sessionId: string) => void;
  /** Cancel countdown for a session */
  cancelCountdown: (sessionId: string) => void;
  /** Get current session state */
  getState: (sessionId: string) => SessionState | undefined;
}

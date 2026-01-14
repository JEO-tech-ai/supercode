/**
 * Prompt Context Injector Hook
 * Manages and injects collected context into prompts.
 * Adapted from Oh-My-OpenCode patterns for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "./types";
import logger from "../../shared/logger";

/**
 * Context collector interface
 */
export interface ContextCollector {
  /** Add context for a session */
  add(sessionId: string, content: string, source?: string): void;
  /** Check if session has pending context */
  hasPending(sessionId: string): boolean;
  /** Consume pending context */
  consume(sessionId: string): ConsumedContext;
  /** Clear context for session */
  clear(sessionId: string): void;
}

/**
 * Consumed context result
 */
export interface ConsumedContext {
  /** Merged content */
  merged: string;
  /** Whether there was any content */
  hasContent: boolean;
  /** Number of sources consumed */
  sourceCount: number;
}

/**
 * Pending context entry
 */
interface PendingContext {
  content: string;
  source: string;
  timestamp: number;
}

/**
 * Prompt context injector options
 */
export interface PromptContextInjectorOptions {
  /** Maximum context length */
  maxContextLength?: number;
  /** Context separator */
  separator?: string;
  /** Include source headers */
  includeHeaders?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: PromptContextInjectorOptions = {
  maxContextLength: 50000,
  separator: "\n\n---\n\n",
  includeHeaders: true,
  debug: false,
};

/**
 * Create a context collector
 */
export function createContextCollector(): ContextCollector {
  const pendingContexts = new Map<string, PendingContext[]>();

  return {
    add(sessionId: string, content: string, source: string = "unknown"): void {
      if (!content.trim()) return;

      let contexts = pendingContexts.get(sessionId);
      if (!contexts) {
        contexts = [];
        pendingContexts.set(sessionId, contexts);
      }

      contexts.push({
        content: content.trim(),
        source,
        timestamp: Date.now(),
      });
    },

    hasPending(sessionId: string): boolean {
      const contexts = pendingContexts.get(sessionId);
      return !!contexts && contexts.length > 0;
    },

    consume(sessionId: string): ConsumedContext {
      const contexts = pendingContexts.get(sessionId);
      if (!contexts || contexts.length === 0) {
        return { merged: "", hasContent: false, sourceCount: 0 };
      }

      pendingContexts.delete(sessionId);

      const merged = contexts
        .map((c) => c.content)
        .join("\n\n");

      return {
        merged,
        hasContent: true,
        sourceCount: contexts.length,
      };
    },

    clear(sessionId: string): void {
      pendingContexts.delete(sessionId);
    },
  };
}

/**
 * Global collector instance
 */
let globalCollector: ContextCollector | null = null;

/**
 * Get or create global collector
 */
export function getGlobalCollector(): ContextCollector {
  if (!globalCollector) {
    globalCollector = createContextCollector();
  }
  return globalCollector;
}

/**
 * Create prompt context injector hook
 */
export function createPromptContextInjectorHook(
  collector?: ContextCollector,
  options: PromptContextInjectorOptions = {}
): Hook {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as Required<PromptContextInjectorOptions>;

  const activeCollector = collector || getGlobalCollector();

  return {
    name: "prompt-context-injector",
    description: "Injects collected context into prompts",
    events: ["message.before", "session.deleted"],
    priority: 85,

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event } = context;

      // Clean up on session delete
      if (event === "session.deleted") {
        activeCollector.clear(sessionId);
        return;
      }

      // Check for pending context
      if (!activeCollector.hasPending(sessionId)) {
        return;
      }

      const consumed = activeCollector.consume(sessionId);
      if (!consumed.hasContent) {
        return;
      }

      // Truncate if necessary
      let contextContent = consumed.merged;
      if (contextContent.length > mergedOptions.maxContextLength) {
        contextContent =
          contextContent.slice(0, mergedOptions.maxContextLength - 20) +
          "\n...[truncated]";
      }

      if (mergedOptions.debug) {
        logger.debug(
          `[prompt-context-injector] Injecting ${consumed.sourceCount} context sources ` +
          `(${contextContent.length} chars) for session ${sessionId}`
        );
      }

      return {
        continue: true,
        context: [contextContent],
      };
    },
  };
}

/**
 * Add context to global collector
 */
export function addContext(
  sessionId: string,
  content: string,
  source?: string
): void {
  getGlobalCollector().add(sessionId, content, source);
}

/**
 * Check if session has pending context
 */
export function hasPendingContext(sessionId: string): boolean {
  return getGlobalCollector().hasPending(sessionId);
}

/**
 * Clear context for session
 */
export function clearContext(sessionId: string): void {
  getGlobalCollector().clear(sessionId);
}


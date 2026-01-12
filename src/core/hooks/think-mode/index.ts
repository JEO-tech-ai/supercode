/**
 * Think Mode Hook
 * Automatically activates extended thinking mode when "think" keywords detected.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */
import type { Hook, HookContext, HookResult } from "../types";
import type {
  ThinkModeState,
  ThinkModeInput,
  ThinkModeOptions,
} from "./types";
import { detectThinkKeyword, extractPromptText } from "./detector";
import {
  getHighVariant,
  isAlreadyHighVariant,
  getThinkingConfig,
} from "./switcher";
import logger from "../../../shared/logger";

/**
 * Default options
 */
const DEFAULT_OPTIONS: ThinkModeOptions = {
  debug: false,
  anthropicBudgetTokens: 64000,
  anthropicMaxTokens: 128000,
  bedrockBudgetTokens: 32000,
  bedrockMaxTokens: 64000,
};

/**
 * Think mode state per session
 */
const thinkModeState = new Map<string, ThinkModeState>();

/**
 * Clear think mode state for a session
 */
export function clearThinkModeState(sessionId: string): void {
  thinkModeState.delete(sessionId);
}

/**
 * Get think mode state for a session
 */
export function getThinkModeState(sessionId: string): ThinkModeState | undefined {
  return thinkModeState.get(sessionId);
}

/**
 * Check if think mode is active for a session
 */
export function isThinkModeActive(sessionId: string): boolean {
  const state = thinkModeState.get(sessionId);
  return state?.requested ?? false;
}

/**
 * Create think mode hook
 * @param options - Hook options
 * @returns Hook instance
 */
export function createThinkModeHook(
  options: ThinkModeOptions = {}
): Hook {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: "think-mode",
    description: "Activates extended thinking mode when think keywords detected",
    events: ["message.before", "session.end"],
    priority: 90, // High priority to modify before sending

    async handler(context: HookContext): Promise<HookResult | void> {
      const { sessionId, event, data } = context;

      // Clean up on session end
      if (event === "session.end") {
        thinkModeState.delete(sessionId);
        return;
      }

      // Only process message.before
      if (event !== "message.before") {
        return;
      }

      if (!data) {
        return;
      }

      const input = data as ThinkModeInput;

      // Initialize state
      const state: ThinkModeState = {
        requested: false,
        modelSwitched: false,
        thinkingConfigInjected: false,
      };

      // Extract text from message parts
      const promptText = extractPromptText(input.parts || []);

      // Check for think keyword
      if (!detectThinkKeyword(promptText)) {
        thinkModeState.set(sessionId, state);
        return;
      }

      state.requested = true;

      // Get current model
      const currentModel = input.message?.model;
      if (!currentModel) {
        thinkModeState.set(sessionId, state);
        if (mergedOptions.debug) {
          logger.debug(
            `[think-mode] Think keyword detected but no model set for session ${sessionId}`
          );
        }
        return;
      }

      state.providerID = currentModel.providerID;
      state.modelID = currentModel.modelID;

      // Check if already high variant
      if (isAlreadyHighVariant(currentModel.modelID)) {
        thinkModeState.set(sessionId, state);
        if (mergedOptions.debug) {
          logger.debug(
            `[think-mode] Model ${currentModel.modelID} is already high variant`
          );
        }
        return;
      }

      // Get high variant
      const highVariant = getHighVariant(currentModel.modelID);
      const thinkingConfig = getThinkingConfig(
        currentModel.providerID,
        currentModel.modelID,
        mergedOptions
      );

      // Switch to high variant if available
      if (highVariant) {
        input.message.model = {
          providerID: currentModel.providerID,
          modelID: highVariant,
        };
        state.modelSwitched = true;

        if (mergedOptions.debug) {
          logger.debug(
            `[think-mode] Model switched from ${currentModel.modelID} to ${highVariant}`
          );
        }
      }

      // Inject thinking configuration if available
      if (thinkingConfig) {
        Object.assign(input.message, thinkingConfig);
        state.thinkingConfigInjected = true;

        if (mergedOptions.debug) {
          logger.debug(
            `[think-mode] Thinking config injected for provider ${currentModel.providerID}`,
            thinkingConfig
          );
        }
      }

      thinkModeState.set(sessionId, state);

      // Return modified data
      return {
        continue: true,
        modified: input,
      };
    },
  };
}

// Re-export types
export type { ThinkModeState, ThinkModeInput, ThinkModeOptions } from "./types";

// Re-export detector utilities
export { detectThinkKeyword, extractPromptText, getSupportedKeywords } from "./detector";

// Re-export switcher utilities
export {
  getHighVariant,
  isAlreadyHighVariant,
  getThinkingConfig,
  getSupportedHighVariants,
  getThinkingCapablePatterns,
} from "./switcher";

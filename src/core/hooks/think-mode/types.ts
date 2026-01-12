/**
 * Think Mode Types
 * Type definitions for thinking mode hook.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Think mode state for a session
 */
export interface ThinkModeState {
  /** Whether think mode was requested in the prompt */
  requested: boolean;
  /** Whether the model was switched to a high variant */
  modelSwitched: boolean;
  /** Whether thinking configuration was injected */
  thinkingConfigInjected: boolean;
  /** Provider ID if think mode was activated */
  providerID?: string;
  /** Model ID before switch (if switched) */
  modelID?: string;
}

/**
 * Model reference
 */
export interface ModelRef {
  providerID: string;
  modelID: string;
}

/**
 * Message with optional model reference
 */
export interface MessageWithModel {
  model?: ModelRef;
}

/**
 * Input for think mode hook
 */
export interface ThinkModeInput {
  parts: Array<{ type: string; text?: string }>;
  message: MessageWithModel;
}

/**
 * Provider-specific thinking configuration
 */
export type ThinkingConfig = Record<string, unknown>;

/**
 * Think mode hook options
 */
export interface ThinkModeOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom thinking budget for Anthropic (default: 64000) */
  anthropicBudgetTokens?: number;
  /** Custom max tokens for Anthropic (default: 128000) */
  anthropicMaxTokens?: number;
  /** Custom thinking budget for Bedrock (default: 32000) */
  bedrockBudgetTokens?: number;
  /** Custom max tokens for Bedrock (default: 64000) */
  bedrockMaxTokens?: number;
}

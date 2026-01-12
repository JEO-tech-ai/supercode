/**
 * Preemptive Compaction Constants
 * Configuration values for preemptive compaction behavior.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/** Default threshold ratio to trigger compaction (85%) */
export const DEFAULT_THRESHOLD = 0.85;

/** Minimum tokens required before considering compaction */
export const MIN_TOKENS_FOR_COMPACTION = 50_000;

/** Cooldown between compaction attempts in milliseconds */
export const COMPACTION_COOLDOWN_MS = 60_000;

/** Delay before auto-resume after compaction in milliseconds */
export const RESUME_DELAY_MS = 500;

/** Default context limit for Claude models */
export const CLAUDE_DEFAULT_CONTEXT_LIMIT = 200_000;

/** Extended context limit (1M) for supported configurations */
export const CLAUDE_EXTENDED_CONTEXT_LIMIT = 1_000_000;

/** Pattern to identify Claude models */
export const CLAUDE_MODEL_PATTERN = /claude-(opus|sonnet|haiku)/i;

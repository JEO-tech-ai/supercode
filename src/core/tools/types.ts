/**
 * Core Tool Types
 * Re-exports and additional type definitions for tools.
 */

// Re-export from core types
export type {
  ToolDefinition,
  ToolParameter,
  ToolContext,
  ToolResult,
} from "../types";

// Alias for backwards compatibility
export type { ToolDefinition as Tool } from "../types";

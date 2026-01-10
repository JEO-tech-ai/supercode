/**
 * UI Utilities
 * Terminal UI helpers inspired by opencode's UI module
 */

/**
 * CancelledError - Thrown when user cancels an operation
 */
export class CancelledError extends Error {
  constructor(message = "Operation cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

/**
 * Style constants for terminal output
 */
export const Style = {
  /** Dim text (gray) */
  TEXT_DIM: "\x1b[90m",
  /** Reset all styles */
  RESET: "\x1b[0m",
  /** Bold text */
  BOLD: "\x1b[1m",
  /** Green text */
  GREEN: "\x1b[32m",
  /** Yellow text */
  YELLOW: "\x1b[33m",
  /** Red text */
  RED: "\x1b[31m",
  /** Blue text */
  BLUE: "\x1b[34m",
  /** Cyan text */
  CYAN: "\x1b[36m",
} as const;

/**
 * Print an empty line for visual spacing
 */
export function empty(): void {
  console.log();
}

/**
 * Format text with dim style
 */
export function dim(text: string): string {
  return `${Style.TEXT_DIM}${text}${Style.RESET}`;
}

/**
 * Format text with bold style
 */
export function bold(text: string): string {
  return `${Style.BOLD}${text}${Style.RESET}`;
}

/**
 * Format text with color
 */
export function color(text: string, colorCode: string): string {
  return `${colorCode}${text}${Style.RESET}`;
}

/**
 * Format a provider name with status indicator
 */
export function formatProviderStatus(name: string, authenticated: boolean): string {
  const icon = authenticated ? "✓" : "○";
  const iconColor = authenticated ? Style.GREEN : Style.TEXT_DIM;
  return `${iconColor}${icon}${Style.RESET} ${name}`;
}

/**
 * Format a table row with padding
 */
export function tableRow(columns: string[], widths: number[]): string {
  return columns
    .map((col, i) => col.padEnd(widths[i] || 10))
    .join(" │ ");
}

/**
 * Create a simple table header separator
 */
export function tableSeparator(widths: number[]): string {
  return widths.map((w) => "─".repeat(w)).join("─┼─");
}

/**
 * UI namespace for grouped exports (opencode compatibility)
 */
export const UI = {
  CancelledError,
  Style,
  empty,
  dim,
  bold,
  color,
  formatProviderStatus,
  tableRow,
  tableSeparator,
};

export default UI;

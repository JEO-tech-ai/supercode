/**
 * Theme System
 * Inspired by OpenCode's theme architecture
 * Provides color tokens and theme management for CLI output
 */

/**
 * ANSI color codes for terminal output
 */
export const AnsiCode = {
  // Reset
  RESET: "\x1b[0m",

  // Text Styles
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  ITALIC: "\x1b[3m",
  UNDERLINE: "\x1b[4m",

  // Foreground Colors (Standard)
  BLACK: "\x1b[30m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",

  // Foreground Colors (Bright)
  BRIGHT_BLACK: "\x1b[90m",
  BRIGHT_RED: "\x1b[91m",
  BRIGHT_GREEN: "\x1b[92m",
  BRIGHT_YELLOW: "\x1b[93m",
  BRIGHT_BLUE: "\x1b[94m",
  BRIGHT_MAGENTA: "\x1b[95m",
  BRIGHT_CYAN: "\x1b[96m",
  BRIGHT_WHITE: "\x1b[97m",

  // Background Colors (Standard)
  BG_BLACK: "\x1b[40m",
  BG_RED: "\x1b[41m",
  BG_GREEN: "\x1b[42m",
  BG_YELLOW: "\x1b[43m",
  BG_BLUE: "\x1b[44m",
  BG_MAGENTA: "\x1b[45m",
  BG_CYAN: "\x1b[46m",
  BG_WHITE: "\x1b[47m",
} as const;

/**
 * Theme color tokens interface
 * Semantic color names mapped to ANSI codes
 */
export interface ThemeColors {
  // Primary brand colors
  primary: string;
  secondary: string;
  accent: string;

  // Status colors
  error: string;
  warning: string;
  success: string;
  info: string;

  // Text colors
  text: string;
  textMuted: string;
  textInverse: string;

  // Background indicators (for reference, not direct ANSI)
  background: string;
  backgroundPanel: string;

  // Border/separator
  border: string;
  borderActive: string;

  // Diff colors
  diffAdded: string;
  diffRemoved: string;
}

/**
 * Complete theme definition
 */
export interface Theme {
  name: string;
  mode: "dark" | "light";
  colors: ThemeColors;
}

/**
 * Dark theme - Default
 */
export const DARK_THEME: Theme = {
  name: "dark",
  mode: "dark",
  colors: {
    // Primary - Orange/Peach (OpenCode style)
    primary: AnsiCode.YELLOW,
    secondary: AnsiCode.BLUE,
    accent: AnsiCode.CYAN,

    // Status
    error: AnsiCode.RED,
    warning: AnsiCode.YELLOW,
    success: AnsiCode.GREEN,
    info: AnsiCode.CYAN,

    // Text
    text: AnsiCode.WHITE,
    textMuted: AnsiCode.BRIGHT_BLACK,
    textInverse: AnsiCode.BLACK,

    // Background (reference values, terminals handle this)
    background: AnsiCode.BG_BLACK,
    backgroundPanel: AnsiCode.BG_BLACK,

    // Border
    border: AnsiCode.BRIGHT_BLACK,
    borderActive: AnsiCode.YELLOW,

    // Diff
    diffAdded: AnsiCode.GREEN,
    diffRemoved: AnsiCode.RED,
  },
};

/**
 * Light theme
 */
export const LIGHT_THEME: Theme = {
  name: "light",
  mode: "light",
  colors: {
    // Primary - Blue for light mode
    primary: AnsiCode.BLUE,
    secondary: AnsiCode.MAGENTA,
    accent: AnsiCode.CYAN,

    // Status
    error: AnsiCode.RED,
    warning: AnsiCode.YELLOW,
    success: AnsiCode.GREEN,
    info: AnsiCode.BLUE,

    // Text
    text: AnsiCode.BLACK,
    textMuted: AnsiCode.BRIGHT_BLACK,
    textInverse: AnsiCode.WHITE,

    // Background
    background: AnsiCode.BG_WHITE,
    backgroundPanel: AnsiCode.BG_WHITE,

    // Border
    border: AnsiCode.BRIGHT_BLACK,
    borderActive: AnsiCode.BLUE,

    // Diff
    diffAdded: AnsiCode.GREEN,
    diffRemoved: AnsiCode.RED,
  },
};

/**
 * Available built-in themes
 */
export const THEMES: Record<string, Theme> = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
};

// Current active theme (module-level state)
let currentTheme: Theme = DARK_THEME;

/**
 * Get the current active theme
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Set the active theme by name or Theme object
 */
export function setTheme(theme: string | Theme): void {
  if (typeof theme === "string") {
    const found = THEMES[theme];
    if (!found) {
      throw new Error(`Unknown theme: ${theme}. Available: ${Object.keys(THEMES).join(", ")}`);
    }
    currentTheme = found;
  } else {
    currentTheme = theme;
  }
}

/**
 * Get current theme colors
 */
export function colors(): ThemeColors {
  return currentTheme.colors;
}

/**
 * Apply a theme color to text
 */
export function themed(text: string, colorKey: keyof ThemeColors): string {
  const color = currentTheme.colors[colorKey];
  return `${color}${text}${AnsiCode.RESET}`;
}

/**
 * Apply primary color
 */
export function primary(text: string): string {
  return themed(text, "primary");
}

/**
 * Apply secondary color
 */
export function secondary(text: string): string {
  return themed(text, "secondary");
}

/**
 * Apply accent color
 */
export function accent(text: string): string {
  return themed(text, "accent");
}

/**
 * Apply error color
 */
export function error(text: string): string {
  return themed(text, "error");
}

/**
 * Apply warning color
 */
export function warning(text: string): string {
  return themed(text, "warning");
}

/**
 * Apply success color
 */
export function success(text: string): string {
  return themed(text, "success");
}

/**
 * Apply info color
 */
export function info(text: string): string {
  return themed(text, "info");
}

/**
 * Apply muted text color
 */
export function muted(text: string): string {
  return themed(text, "textMuted");
}

/**
 * Apply border color
 */
export function border(text: string): string {
  return themed(text, "border");
}

/**
 * Detect terminal background color mode
 * Uses OSC 11 escape sequence to query terminal
 * Falls back to "dark" if detection fails
 */
export async function detectColorMode(): Promise<"dark" | "light"> {
  // Skip detection if not a TTY
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return "dark";
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve("dark");
    }, 1000);

    const cleanup = () => {
      clearTimeout(timeout);
      process.stdin.removeListener("data", handler);
      if (wasRaw !== undefined) {
        try {
          process.stdin.setRawMode(wasRaw);
        } catch {
          // Ignore errors during cleanup
        }
      }
    };

    let wasRaw: boolean | undefined;

    const handler = (data: Buffer) => {
      const str = data.toString();
      // Parse OSC 11 response: ESC ] 11 ; rgb:RRRR/GGGG/BBBB ESC \
      const match = str.match(/\x1b\]11;rgb:([0-9a-f]{2,4})\/([0-9a-f]{2,4})\/([0-9a-f]{2,4})/i);

      if (match) {
        const [, rHex, gHex, bHex] = match;
        // Normalize to 0-255 range
        const normalize = (hex: string) => {
          if (hex.length === 4) {
            return parseInt(hex.slice(0, 2), 16);
          }
          return parseInt(hex, 16);
        };

        const r = normalize(rHex);
        const g = normalize(gHex);
        const b = normalize(bHex);

        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        cleanup();
        resolve(luminance > 0.5 ? "light" : "dark");
      }
    };

    try {
      wasRaw = process.stdin.isRaw;
      process.stdin.setRawMode(true);
      process.stdin.once("data", handler);
      // Query terminal background color
      process.stdout.write("\x1b]11;?\x07");
    } catch {
      cleanup();
      resolve("dark");
    }
  });
}

/**
 * Auto-detect and set theme based on terminal background
 */
export async function autoDetectTheme(): Promise<Theme> {
  const mode = await detectColorMode();
  const theme = mode === "light" ? LIGHT_THEME : DARK_THEME;
  setTheme(theme);
  return theme;
}

/**
 * Theme namespace for grouped exports
 */
export const Theme = {
  // Constants
  AnsiCode,
  DARK_THEME,
  LIGHT_THEME,
  THEMES,

  // State
  get: getTheme,
  set: setTheme,
  colors,

  // Helpers
  themed,
  primary,
  secondary,
  accent,
  error,
  warning,
  success,
  info,
  muted,
  border,

  // Detection
  detectColorMode,
  autoDetectTheme,
};

export default Theme;

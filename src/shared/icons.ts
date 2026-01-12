/**
 * Text-based icons for terminal UI
 * No emojis - pure ASCII/Unicode text symbols for maximum terminal compatibility
 *
 * Design principles:
 * - Fixed width brackets for alignment
 * - ASCII-safe primary characters
 * - Clear semantic meaning
 */

// =============================================================================
// STATUS ICONS
// =============================================================================

export const STATUS = {
  SUCCESS: "[+]",
  ERROR: "[-]",
  WARNING: "[!]",
  INFO: "[i]",
  RUNNING: "[*]",
  PENDING: "[ ]",
  QUEUED: "[Q]",
  THINKING: "[~]",
  STREAMING: "[>]",
  TOOL_CALL: "[T]",
  CANCELLED: "[x]",
} as const;

// Single character status dots (for compact displays)
export const DOT = {
  ON: "*",
  OFF: "o",
  ERROR: "x",
  WARN: "!",
  SPIN: ["\\", "|", "/", "-"],
} as const;

// =============================================================================
// AGENT ICONS
// =============================================================================

export const AGENT = {
  EXPLORER: "[EXP]",
  ANALYST: "[ANA]",
  FRONTEND: "[FRN]",
  DOCWRITER: "[DOC]",
  EXECUTOR: "[EXE]",
  REVIEWER: "[REV]",
  LIBRARIAN: "[LIB]",
  MULTIMODAL: "[MUL]",
  CUSTOM: "[CUS]",
  ORCHESTRATOR: "[ORC]",
  CENT: "[CNT]",
  DEFAULT: "[AGT]",
} as const;

// Agent type to icon mapping
export const AGENT_ICONS: Record<string, string> = {
  explorer: AGENT.EXPLORER,
  analyst: AGENT.ANALYST,
  frontend: AGENT.FRONTEND,
  docwriter: AGENT.DOCWRITER,
  executor: AGENT.EXECUTOR,
  reviewer: AGENT.REVIEWER,
  librarian: AGENT.LIBRARIAN,
  multimodal: AGENT.MULTIMODAL,
  custom: AGENT.CUSTOM,
  orchestrator: AGENT.ORCHESTRATOR,
  cent: AGENT.CENT,
};

// =============================================================================
// STATUS INDICATORS (with colors defined separately)
// =============================================================================

export const STATUS_ICONS: Record<string, string> = {
  idle: "[ ]",
  queued: "[Q]",
  running: "[*]",
  thinking: "[~]",
  tool_calling: "[T]",
  streaming: "[>]",
  completed: "[+]",
  error: "[-]",
  cancelled: "[x]",
  starting: "[.]",
  stopped: "[o]",
  crashed: "[X]",
  connected: "[+]",
  connecting: "[.]",
  disconnected: "[o]",
  disabled: "[-]",
};

// =============================================================================
// LANGUAGE ICONS (for LSP)
// =============================================================================

export const LANG = {
  TYPESCRIPT: "[TS]",
  JAVASCRIPT: "[JS]",
  PYTHON: "[PY]",
  RUST: "[RS]",
  GO: "[GO]",
  JAVA: "[JV]",
  C: "[C]",
  CPP: "[C+]",
  CSHARP: "[C#]",
  RUBY: "[RB]",
  PHP: "[PH]",
  SWIFT: "[SW]",
  KOTLIN: "[KT]",
  SCALA: "[SC]",
  HTML: "[HT]",
  CSS: "[CS]",
  JSON: "[JS]",
  YAML: "[YM]",
  MARKDOWN: "[MD]",
  DEFAULT: "[--]",
} as const;

export const LANGUAGE_ICONS: Record<string, string> = {
  typescript: LANG.TYPESCRIPT,
  javascript: LANG.JAVASCRIPT,
  python: LANG.PYTHON,
  rust: LANG.RUST,
  go: LANG.GO,
  java: LANG.JAVA,
  c: LANG.C,
  cpp: LANG.CPP,
  csharp: LANG.CSHARP,
  ruby: LANG.RUBY,
  php: LANG.PHP,
  swift: LANG.SWIFT,
  kotlin: LANG.KOTLIN,
  scala: LANG.SCALA,
  html: LANG.HTML,
  css: LANG.CSS,
  json: LANG.JSON,
  yaml: LANG.YAML,
  markdown: LANG.MARKDOWN,
  default: LANG.DEFAULT,
};

// =============================================================================
// LSP CAPABILITY ICONS
// =============================================================================

export const CAPABILITY_ICONS: Record<string, string> = {
  completionProvider: "[AC]",
  hoverProvider: "[HV]",
  definitionProvider: "[DF]",
  referencesProvider: "[RF]",
  documentFormattingProvider: "[FM]",
  renameProvider: "[RN]",
  codeActionProvider: "[CA]",
  signatureHelpProvider: "[SG]",
  diagnosticProvider: "[DG]",
};

// =============================================================================
// COMMAND ICONS (for slash commands)
// =============================================================================

export const CMD = {
  // Session
  NEW: "[+]",
  SESSION: "[S]",
  UNDO: "[<]",
  REDO: "[>]",
  RENAME: "[~]",
  COPY: "[C]",
  EXPORT: "[E]",
  TIMELINE: "[T]",
  FORK: "[F]",
  SHARE: "[^]",

  // Navigation
  MODEL: "[M]",
  AGENT: "[A]",
  THEME: "[#]",
  PROVIDER: "[P]",

  // MCP
  MCP: "[:]",
  CONNECT: "[+]",
  DISCONNECT: "[-]",
  TOOLS: "[T]",
  RESOURCES: "[R]",

  // Git
  DIFF: "[D]",
  COMMIT: "[C]",
  STATUS: "[S]",
  LOG: "[L]",
  BRANCH: "[B]",
  PR: "[P]",

  // Context
  COMPACT: "[Z]",
  CONTEXT: "[X]",
  COST: "[$]",
  PLAN: "[P]",
  FILES: "[F]",

  // Agent
  SPAWN: "[>>]",
  MONITOR: "[*]",
  STOP: "[X]",

  // Debug
  BUG: "[!]",
  DOCTOR: "[+]",
  LOGS: "[L]",
  VERSION: "[V]",

  // System
  HELP: "[?]",
  COMMANDS: "[:]",
  CONFIG: "[=]",
  LSP: "[L]",
  SIDEBAR: "[|]",
  FULLSCREEN: "[ ]",
  EXIT: "[Q]",
} as const;

// Slash command icon mapping
export const COMMAND_ICONS: Record<string, string> = {
  // Session
  new: CMD.NEW,
  session: CMD.SESSION,
  undo: CMD.UNDO,
  redo: CMD.REDO,
  rename: CMD.RENAME,
  copy: CMD.COPY,
  export: CMD.EXPORT,
  timeline: CMD.TIMELINE,
  fork: CMD.FORK,
  share: CMD.SHARE,

  // Navigation
  models: CMD.MODEL,
  agents: CMD.AGENT,
  theme: CMD.THEME,
  provider: CMD.PROVIDER,

  // MCP
  mcp: CMD.MCP,
  "mcp:connect": CMD.CONNECT,
  "mcp:disconnect": CMD.DISCONNECT,
  "mcp:tools": CMD.TOOLS,
  "mcp:resources": CMD.RESOURCES,

  // Git
  diff: CMD.DIFF,
  commit: CMD.COMMIT,
  status: CMD.STATUS,
  log: CMD.LOG,
  branch: CMD.BRANCH,
  pr: CMD.PR,

  // Context
  compact: CMD.COMPACT,
  context: CMD.CONTEXT,
  cost: CMD.COST,
  plan: CMD.PLAN,
  files: CMD.FILES,

  // Agent
  spawn: CMD.SPAWN,
  monitor: CMD.MONITOR,
  stop: CMD.STOP,

  // Debug
  bug: CMD.BUG,
  doctor: CMD.DOCTOR,
  logs: CMD.LOGS,
  version: CMD.VERSION,

  // System
  help: CMD.HELP,
  commands: CMD.COMMANDS,
  config: CMD.CONFIG,
  lsp: CMD.LSP,
  sidebar: CMD.SIDEBAR,
  fullscreen: CMD.FULLSCREEN,
  exit: CMD.EXIT,
};

// =============================================================================
// UI SECTION ICONS
// =============================================================================

export const SECTION = {
  SESSION: "[S]",
  CONTEXT: "[X]",
  AGENTS: "[A]",
  MCP: "[M]",
  LSP: "[L]",
  TODO: "[T]",
  FILES: "[F]",
  GIT: "[G]",
  MONITOR: "[*]",
} as const;

// =============================================================================
// NAVIGATION ICONS
// =============================================================================

export const NAV = {
  UP: "^",
  DOWN: "v",
  LEFT: "<",
  RIGHT: ">",
  HOME: "|<",
  END: ">|",
  EXPAND: "v",
  COLLAPSE: ">",
} as const;

// =============================================================================
// MISC ICONS
// =============================================================================

export const MISC = {
  BULLET: "*",
  SEPARATOR: "|",
  ARROW: "->",
  CHECK: "+",
  CROSS: "x",
  DOT: ".",
  BRANCH: "-",
  COST: "$",
} as const;

// =============================================================================
// TOAST VARIANT ICONS
// =============================================================================

export const TOAST = {
  info: "[i]",
  success: "[+]",
  warning: "[!]",
  error: "[-]",
} as const;

// =============================================================================
// FILE STATUS ICONS
// =============================================================================

export const FILE_STATUS = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get agent icon by type
 */
export function getAgentIcon(type: string): string {
  return AGENT_ICONS[type.toLowerCase()] || AGENT.DEFAULT;
}

/**
 * Get status icon
 */
export function getStatusIcon(status: string): string {
  return STATUS_ICONS[status.toLowerCase()] || STATUS.PENDING;
}

/**
 * Get language icon
 */
export function getLanguageIcon(language: string): string {
  return LANGUAGE_ICONS[language.toLowerCase()] || LANG.DEFAULT;
}

/**
 * Get command icon
 */
export function getCommandIcon(command: string): string {
  return COMMAND_ICONS[command.toLowerCase()] || "*";
}

// =============================================================================
// EXPORTS
// =============================================================================

export const ICONS = {
  STATUS,
  DOT,
  AGENT,
  LANG,
  CMD,
  SECTION,
  NAV,
  MISC,
  TOAST,
  FILE_STATUS,
} as const;

export default ICONS;

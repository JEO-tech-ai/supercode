/**
 * Keybinding System
 * Simple key combination parsing and matching
 * Inspired by OpenCode's keybind system
 */

/**
 * Parsed keybind representation
 */
export interface Keybind {
  /** Main key (e.g., "c", "enter", "escape") */
  key: string;
  /** Ctrl modifier */
  ctrl: boolean;
  /** Alt/Option modifier */
  alt: boolean;
  /** Shift modifier */
  shift: boolean;
  /** Meta/Command modifier */
  meta: boolean;
  /** Leader key prefix (e.g., <leader>n) */
  leader: boolean;
}

/**
 * Keybind configuration type
 */
export type KeybindConfig = {
  [action: string]: string | string[];
};

/**
 * Default keybinds (inspired by OpenCode)
 */
export const DEFAULT_KEYBINDS: KeybindConfig = {
  // App controls
  leader: "ctrl+x",
  app_exit: ["ctrl+c", "ctrl+d"],
  app_help: ["?", "ctrl+h"],

  // Input controls
  input_submit: ["enter", "ctrl+enter"],
  input_cancel: "escape",
  input_clear: "ctrl+u",

  // Navigation
  nav_up: ["up", "ctrl+p"],
  nav_down: ["down", "ctrl+n"],
  nav_left: ["left", "ctrl+b"],
  nav_right: ["right", "ctrl+f"],
  nav_home: ["home", "ctrl+a"],
  nav_end: ["end", "ctrl+e"],

  // Session controls (with leader)
  session_new: "<leader>n",
  session_list: "<leader>l",
  session_interrupt: "ctrl+c",

  // Model/Agent selection
  model_list: "<leader>m",
  agent_list: "<leader>a",

  // Copy/Paste
  copy: "<leader>y",
  paste: "ctrl+v",
};

/**
 * Parse a keybind string into a Keybind object
 * Supports formats:
 * - "ctrl+c"
 * - "alt+shift+enter"
 * - "<leader>n"
 * - "escape"
 */
export function parseKeybind(combo: string): Keybind {
  const keybind: Keybind = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    leader: false,
  };

  let remaining = combo.toLowerCase().trim();

  // Check for leader prefix
  if (remaining.startsWith("<leader>")) {
    keybind.leader = true;
    remaining = remaining.slice(8); // Remove "<leader>"
  }

  // Split by + and process modifiers
  const parts = remaining.split("+");

  for (const part of parts) {
    const trimmed = part.trim();

    switch (trimmed) {
      case "ctrl":
      case "control":
        keybind.ctrl = true;
        break;
      case "alt":
      case "option":
        keybind.alt = true;
        break;
      case "shift":
        keybind.shift = true;
        break;
      case "meta":
      case "cmd":
      case "command":
      case "super":
        keybind.meta = true;
        break;
      default:
        // This is the main key
        keybind.key = normalizeKeyName(trimmed);
    }
  }

  return keybind;
}

/**
 * Normalize key names to consistent format
 */
function normalizeKeyName(key: string): string {
  const keyMap: Record<string, string> = {
    // Special keys
    esc: "escape",
    return: "enter",
    space: " ",
    tab: "tab",

    // Arrow keys
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",

    // Function keys are kept as-is (f1, f2, etc.)

    // Other special keys
    backspace: "backspace",
    delete: "delete",
    del: "delete",
    insert: "insert",
    ins: "insert",
    pageup: "pageup",
    pagedown: "pagedown",
    pgup: "pageup",
    pgdn: "pagedown",
    home: "home",
    end: "end",
  };

  return keyMap[key] || key;
}

/**
 * Convert a Keybind object back to string representation
 */
export function keybindToString(keybind: Keybind): string {
  const parts: string[] = [];

  if (keybind.leader) {
    parts.push("<leader>");
  }
  if (keybind.ctrl) {
    parts.push("ctrl");
  }
  if (keybind.alt) {
    parts.push("alt");
  }
  if (keybind.shift) {
    parts.push("shift");
  }
  if (keybind.meta) {
    parts.push("cmd");
  }

  // Format the main key
  let keyDisplay = keybind.key;
  if (keyDisplay === " ") {
    keyDisplay = "space";
  }

  if (keybind.leader) {
    return `<leader>${keyDisplay}`;
  }

  parts.push(keyDisplay);
  return parts.join("+");
}

/**
 * Check if two keybinds match
 */
export function matchKeybind(a: Keybind, b: Keybind): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta &&
    a.leader === b.leader
  );
}

/**
 * Create a Keybind from a keyboard event
 */
export function keybindFromEvent(
  event: { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean },
  leaderActive = false
): Keybind {
  return {
    key: normalizeKeyName(event.key.toLowerCase()),
    ctrl: event.ctrlKey ?? false,
    alt: event.altKey ?? false,
    shift: event.shiftKey ?? false,
    meta: event.metaKey ?? false,
    leader: leaderActive,
  };
}

/**
 * Parse a config value (string or string[]) into Keybind array
 */
export function parseKeybindConfig(value: string | string[]): Keybind[] {
  if (Array.isArray(value)) {
    return value.map(parseKeybind);
  }
  return [parseKeybind(value)];
}

/**
 * Keybind registry for managing action -> keybind mappings
 */
export class KeybindRegistry {
  private bindings: Map<string, Keybind[]> = new Map();
  private leaderActive = false;
  private leaderTimeout: ReturnType<typeof setTimeout> | null = null;
  private leaderKey: Keybind | null = null;

  constructor(config: KeybindConfig = DEFAULT_KEYBINDS) {
    this.loadConfig(config);
  }

  /**
   * Load keybind configuration
   */
  loadConfig(config: KeybindConfig): void {
    this.bindings.clear();

    for (const [action, value] of Object.entries(config)) {
      if (action === "leader") {
        this.leaderKey = parseKeybind(value as string);
      }
      this.bindings.set(action, parseKeybindConfig(value));
    }
  }

  /**
   * Get keybinds for an action
   */
  get(action: string): Keybind[] {
    return this.bindings.get(action) ?? [];
  }

  /**
   * Get the first keybind string for an action (for display)
   */
  getDisplayString(action: string): string {
    const keybinds = this.get(action);
    if (keybinds.length === 0) return "";
    return keybindToString(keybinds[0]);
  }

  /**
   * Check if an event matches an action
   */
  matchAction(
    action: string,
    event: { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean }
  ): boolean {
    const keybinds = this.get(action);
    const eventKeybind = keybindFromEvent(event, this.leaderActive);

    return keybinds.some((kb) => matchKeybind(kb, eventKeybind));
  }

  /**
   * Check if event is the leader key
   */
  isLeaderKey(event: {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  }): boolean {
    if (!this.leaderKey) return false;
    const eventKeybind = keybindFromEvent(event, false);
    return matchKeybind(this.leaderKey, eventKeybind);
  }

  /**
   * Activate leader mode
   */
  activateLeader(timeoutMs = 2000): void {
    this.leaderActive = true;

    // Clear existing timeout
    if (this.leaderTimeout) {
      clearTimeout(this.leaderTimeout);
    }

    // Set timeout to deactivate leader
    this.leaderTimeout = setTimeout(() => {
      this.leaderActive = false;
      this.leaderTimeout = null;
    }, timeoutMs);
  }

  /**
   * Deactivate leader mode
   */
  deactivateLeader(): void {
    this.leaderActive = false;
    if (this.leaderTimeout) {
      clearTimeout(this.leaderTimeout);
      this.leaderTimeout = null;
    }
  }

  /**
   * Check if leader mode is active
   */
  isLeaderActive(): boolean {
    return this.leaderActive;
  }

  /**
   * Find which action matches an event
   */
  findMatchingAction(event: {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  }): string | null {
    // Check for leader key first
    if (this.isLeaderKey(event)) {
      this.activateLeader();
      return "leader";
    }

    // Check all actions
    for (const [action] of this.bindings) {
      if (action === "leader") continue;
      if (this.matchAction(action, event)) {
        // If this was a leader combo, deactivate leader
        const keybinds = this.get(action);
        if (keybinds.some((kb) => kb.leader)) {
          this.deactivateLeader();
        }
        return action;
      }
    }

    // No match found, deactivate leader
    if (this.leaderActive) {
      this.deactivateLeader();
    }

    return null;
  }
}

// Default global registry
let globalRegistry: KeybindRegistry | null = null;

/**
 * Get the global keybind registry
 */
export function getKeybindRegistry(): KeybindRegistry {
  if (!globalRegistry) {
    globalRegistry = new KeybindRegistry();
  }
  return globalRegistry;
}

/**
 * Set the global keybind registry
 */
export function setKeybindRegistry(registry: KeybindRegistry): void {
  globalRegistry = registry;
}

/**
 * Keybind namespace for grouped exports
 */
export const Keybind = {
  // Types
  DEFAULT_KEYBINDS,

  // Parsing
  parse: parseKeybind,
  parseConfig: parseKeybindConfig,
  toString: keybindToString,
  fromEvent: keybindFromEvent,

  // Matching
  match: matchKeybind,

  // Registry
  Registry: KeybindRegistry,
  getRegistry: getKeybindRegistry,
  setRegistry: setKeybindRegistry,
};

export default Keybind;

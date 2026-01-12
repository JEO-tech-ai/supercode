/**
 * Phase 5: Extended Keyboard Shortcuts
 * Centralized keybinding registry and management system
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useInput, type Key } from "ink";

/**
 * Parsed keybinding structure
 */
export interface KeyCombo {
  key: string;           // The main key (e.g., "x", "enter", "escape")
  ctrl?: boolean;        // Ctrl modifier
  meta?: boolean;        // Meta/Cmd modifier
  shift?: boolean;       // Shift modifier
  alt?: boolean;         // Alt modifier
}

/**
 * Keybinding definition
 */
export interface Keybinding {
  id: string;                    // Unique identifier
  combo: KeyCombo;               // Key combination
  handler: () => void;           // Action handler
  description?: string;          // Human-readable description
  category?: string;             // Category for grouping
  enabled?: boolean;             // Whether the binding is active
  priority?: number;             // Higher priority wins on conflict
  scope?: string;                // Scope for conditional activation
}

/**
 * Keybinding registry context value
 */
export interface KeybindingContextValue {
  /** Register a new keybinding */
  register: (binding: Keybinding) => () => void;
  /** Unregister a keybinding by ID */
  unregister: (id: string) => void;
  /** Get all registered keybindings */
  getBindings: () => Keybinding[];
  /** Get bindings by category */
  getBindingsByCategory: (category: string) => Keybinding[];
  /** Check if a keybinding exists */
  hasBinding: (id: string) => boolean;
  /** Enable/disable a keybinding */
  setEnabled: (id: string, enabled: boolean) => void;
  /** Set the active scope */
  setScope: (scope: string | null) => void;
  /** Get the current scope */
  getScope: () => string | null;
  /** Format a key combo for display */
  formatKeyCombo: (combo: KeyCombo) => string;
  /** Parse a keybind string */
  parseKeyCombo: (str: string) => KeyCombo;
}

const KeybindingContext = createContext<KeybindingContextValue | null>(null);

/**
 * Parse a keybinding string into KeyCombo
 * e.g., "ctrl+shift+a" -> { ctrl: true, shift: true, key: "a" }
 */
export function parseKeyCombo(str: string): KeyCombo {
  const parts = str.toLowerCase().split("+").map((p) => p.trim());
  const combo: KeyCombo = { key: "" };

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        combo.ctrl = true;
        break;
      case "meta":
      case "cmd":
      case "command":
        combo.meta = true;
        break;
      case "shift":
        combo.shift = true;
        break;
      case "alt":
      case "option":
        combo.alt = true;
        break;
      case "enter":
      case "return":
        combo.key = "return";
        break;
      case "esc":
      case "escape":
        combo.key = "escape";
        break;
      case "space":
        combo.key = " ";
        break;
      case "up":
      case "uparrow":
        combo.key = "upArrow";
        break;
      case "down":
      case "downarrow":
        combo.key = "downArrow";
        break;
      case "left":
      case "leftarrow":
        combo.key = "leftArrow";
        break;
      case "right":
      case "rightarrow":
        combo.key = "rightArrow";
        break;
      case "tab":
        combo.key = "tab";
        break;
      case "backspace":
        combo.key = "backspace";
        break;
      case "delete":
        combo.key = "delete";
        break;
      default:
        combo.key = part;
        break;
    }
  }

  return combo;
}

/**
 * Format a KeyCombo for display
 */
export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];

  if (combo.ctrl) parts.push("Ctrl");
  if (combo.meta) parts.push("Cmd");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");

  // Format the key
  let keyDisplay = combo.key;
  switch (combo.key) {
    case "return":
      keyDisplay = "Enter";
      break;
    case "escape":
      keyDisplay = "Esc";
      break;
    case " ":
      keyDisplay = "Space";
      break;
    case "upArrow":
      keyDisplay = "Up";
      break;
    case "downArrow":
      keyDisplay = "Down";
      break;
    case "leftArrow":
      keyDisplay = "Left";
      break;
    case "rightArrow":
      keyDisplay = "Right";
      break;
    case "tab":
      keyDisplay = "Tab";
      break;
    case "backspace":
      keyDisplay = "Backspace";
      break;
    case "delete":
      keyDisplay = "Delete";
      break;
    default:
      keyDisplay = combo.key.toUpperCase();
      break;
  }

  parts.push(keyDisplay);

  return parts.join("+");
}

/**
 * Check if input matches a key combo
 */
function matchesKeyCombo(input: string, key: Key, combo: KeyCombo): boolean {
  // Check modifiers
  if (combo.ctrl && !key.ctrl) return false;
  if (combo.meta && !key.meta) return false;
  if (combo.shift && !key.shift) return false;

  // Check the main key
  const comboKey = combo.key.toLowerCase();

  // Special keys
  if (comboKey === "return" && key.return) return true;
  if (comboKey === "escape" && key.escape) return true;
  if (comboKey === "uparrow" && key.upArrow) return true;
  if (comboKey === "downarrow" && key.downArrow) return true;
  if (comboKey === "leftarrow" && key.leftArrow) return true;
  if (comboKey === "rightarrow" && key.rightArrow) return true;
  if (comboKey === "tab" && key.tab) return true;
  if (comboKey === "backspace" && key.backspace) return true;
  if (comboKey === "delete" && key.delete) return true;
  if (comboKey === " " && input === " ") return true;

  // Regular character keys
  if (input.toLowerCase() === comboKey) return true;

  return false;
}

/**
 * Keybinding Provider Props
 */
export interface KeybindingProviderProps {
  children: ReactNode;
  /** Default keybindings to register */
  defaults?: Keybinding[];
  /** Whether the provider should handle input */
  active?: boolean;
}

/**
 * Keybinding Provider Component
 */
export function KeybindingProvider({
  children,
  defaults = [],
  active = true,
}: KeybindingProviderProps): React.JSX.Element {
  const [bindings, setBindings] = useState<Map<string, Keybinding>>(new Map());
  const [currentScope, setCurrentScope] = useState<string | null>(null);

  // Register default bindings on mount
  useEffect(() => {
    for (const binding of defaults) {
      setBindings((prev) => new Map(prev).set(binding.id, binding));
    }
  }, []);

  // Register a new keybinding
  const register = useCallback((binding: Keybinding): (() => void) => {
    setBindings((prev) => {
      const next = new Map(prev);
      next.set(binding.id, { ...binding, enabled: binding.enabled ?? true });
      return next;
    });

    // Return unregister function
    return () => {
      setBindings((prev) => {
        const next = new Map(prev);
        next.delete(binding.id);
        return next;
      });
    };
  }, []);

  // Unregister a keybinding
  const unregister = useCallback((id: string): void => {
    setBindings((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Get all bindings
  const getBindings = useCallback((): Keybinding[] => {
    return Array.from(bindings.values());
  }, [bindings]);

  // Get bindings by category
  const getBindingsByCategory = useCallback(
    (category: string): Keybinding[] => {
      return Array.from(bindings.values()).filter(
        (b) => b.category === category
      );
    },
    [bindings]
  );

  // Check if binding exists
  const hasBinding = useCallback(
    (id: string): boolean => {
      return bindings.has(id);
    },
    [bindings]
  );

  // Enable/disable binding
  const setEnabled = useCallback((id: string, enabled: boolean): void => {
    setBindings((prev) => {
      const binding = prev.get(id);
      if (!binding) return prev;

      const next = new Map(prev);
      next.set(id, { ...binding, enabled });
      return next;
    });
  }, []);

  // Set scope
  const setScope = useCallback((scope: string | null): void => {
    setCurrentScope(scope);
  }, []);

  // Get scope
  const getScope = useCallback((): string | null => {
    return currentScope;
  }, [currentScope]);

  // Handle input
  useInput(
    (input, key) => {
      if (!active) return;

      // Get matching bindings sorted by priority
      const matchingBindings = Array.from(bindings.values())
        .filter((b) => {
          // Check if enabled
          if (b.enabled === false) return false;

          // Check scope
          if (b.scope && b.scope !== currentScope) return false;

          // Check key match
          return matchesKeyCombo(input, key, b.combo);
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Execute the highest priority matching binding
      if (matchingBindings.length > 0) {
        matchingBindings[0].handler();
      }
    },
    { isActive: active }
  );

  // Context value
  const value = useMemo<KeybindingContextValue>(
    () => ({
      register,
      unregister,
      getBindings,
      getBindingsByCategory,
      hasBinding,
      setEnabled,
      setScope,
      getScope,
      formatKeyCombo,
      parseKeyCombo,
    }),
    [
      register,
      unregister,
      getBindings,
      getBindingsByCategory,
      hasBinding,
      setEnabled,
      setScope,
      getScope,
    ]
  );

  return (
    <KeybindingContext.Provider value={value}>
      {children}
    </KeybindingContext.Provider>
  );
}

/**
 * Hook to access keybinding context
 */
export function useKeybindings(): KeybindingContextValue {
  const context = useContext(KeybindingContext);
  if (!context) {
    throw new Error("useKeybindings must be used within KeybindingProvider");
  }
  return context;
}

/**
 * Hook to register a keybinding
 */
export function useKeybind(
  id: string,
  combo: string | KeyCombo,
  handler: () => void,
  options?: {
    description?: string;
    category?: string;
    enabled?: boolean;
    priority?: number;
    scope?: string;
  }
): void {
  const { register } = useKeybindings();

  useEffect(() => {
    const parsedCombo = typeof combo === "string" ? parseKeyCombo(combo) : combo;

    const unregister = register({
      id,
      combo: parsedCombo,
      handler,
      description: options?.description,
      category: options?.category,
      enabled: options?.enabled ?? true,
      priority: options?.priority,
      scope: options?.scope,
    });

    return unregister;
  }, [id, combo, handler, register, options?.description, options?.category, options?.enabled, options?.priority, options?.scope]);
}

/**
 * Hook to register multiple keybindings
 */
export function useKeybinds(
  bindings: Array<{
    id: string;
    combo: string | KeyCombo;
    handler: () => void;
    description?: string;
    category?: string;
    enabled?: boolean;
    priority?: number;
    scope?: string;
  }>
): void {
  const { register } = useKeybindings();

  useEffect(() => {
    const unregisters = bindings.map((binding) => {
      const parsedCombo =
        typeof binding.combo === "string"
          ? parseKeyCombo(binding.combo)
          : binding.combo;

      return register({
        id: binding.id,
        combo: parsedCombo,
        handler: binding.handler,
        description: binding.description,
        category: binding.category,
        enabled: binding.enabled ?? true,
        priority: binding.priority,
        scope: binding.scope,
      });
    });

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [bindings, register]);
}

/**
 * Default keybindings for SuperCode
 */
export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // Global
  {
    id: "palette.toggle",
    combo: parseKeyCombo("ctrl+x"),
    handler: () => {},
    description: "Toggle Command Palette",
    category: "Global",
    priority: 100,
  },
  {
    id: "app.exit",
    combo: parseKeyCombo("ctrl+c"),
    handler: () => {},
    description: "Exit Application",
    category: "Global",
    priority: 100,
  },
  {
    id: "navigation.back",
    combo: parseKeyCombo("escape"),
    handler: () => {},
    description: "Go Back / Close",
    category: "Global",
    priority: 50,
  },

  // Session
  {
    id: "session.new",
    combo: parseKeyCombo("ctrl+n"),
    handler: () => {},
    description: "New Session",
    category: "Session",
  },
  {
    id: "session.undo",
    combo: parseKeyCombo("ctrl+z"),
    handler: () => {},
    description: "Undo",
    category: "Session",
  },
  {
    id: "session.redo",
    combo: parseKeyCombo("ctrl+y"),
    handler: () => {},
    description: "Redo",
    category: "Session",
  },

  // View
  {
    id: "sidebar.toggle",
    combo: parseKeyCombo("ctrl+b"),
    handler: () => {},
    description: "Toggle Sidebar",
    category: "View",
  },
  {
    id: "fullscreen.toggle",
    combo: parseKeyCombo("ctrl+f"),
    handler: () => {},
    description: "Toggle Fullscreen",
    category: "View",
  },
  {
    id: "theme.toggle",
    combo: parseKeyCombo("ctrl+t"),
    handler: () => {},
    description: "Toggle Theme",
    category: "View",
  },

  // Navigation
  {
    id: "nav.up",
    combo: parseKeyCombo("up"),
    handler: () => {},
    description: "Navigate Up",
    category: "Navigation",
    priority: 10,
  },
  {
    id: "nav.down",
    combo: parseKeyCombo("down"),
    handler: () => {},
    description: "Navigate Down",
    category: "Navigation",
    priority: 10,
  },
  {
    id: "nav.select",
    combo: parseKeyCombo("enter"),
    handler: () => {},
    description: "Select",
    category: "Navigation",
    priority: 10,
  },
];

/**
 * Keymap presets
 */
export const KEYMAP_PRESETS = {
  default: DEFAULT_KEYBINDINGS,
  vim: [
    ...DEFAULT_KEYBINDINGS,
    {
      id: "vim.up",
      combo: parseKeyCombo("k"),
      handler: () => {},
      description: "Navigate Up (Vim)",
      category: "Vim",
      scope: "vim",
    },
    {
      id: "vim.down",
      combo: parseKeyCombo("j"),
      handler: () => {},
      description: "Navigate Down (Vim)",
      category: "Vim",
      scope: "vim",
    },
    {
      id: "vim.top",
      combo: parseKeyCombo("g"),
      handler: () => {},
      description: "Go to Top (Vim)",
      category: "Vim",
      scope: "vim",
    },
    {
      id: "vim.bottom",
      combo: parseKeyCombo("shift+g"),
      handler: () => {},
      description: "Go to Bottom (Vim)",
      category: "Vim",
      scope: "vim",
    },
  ] as Keybinding[],
  emacs: [
    ...DEFAULT_KEYBINDINGS,
    {
      id: "emacs.up",
      combo: parseKeyCombo("ctrl+p"),
      handler: () => {},
      description: "Navigate Up (Emacs)",
      category: "Emacs",
      scope: "emacs",
    },
    {
      id: "emacs.down",
      combo: parseKeyCombo("ctrl+n"),
      handler: () => {},
      description: "Navigate Down (Emacs)",
      category: "Emacs",
      scope: "emacs",
    },
    {
      id: "emacs.bol",
      combo: parseKeyCombo("ctrl+a"),
      handler: () => {},
      description: "Beginning of Line (Emacs)",
      category: "Emacs",
      scope: "emacs",
    },
    {
      id: "emacs.eol",
      combo: parseKeyCombo("ctrl+e"),
      handler: () => {},
      description: "End of Line (Emacs)",
      category: "Emacs",
      scope: "emacs",
    },
  ] as Keybinding[],
};

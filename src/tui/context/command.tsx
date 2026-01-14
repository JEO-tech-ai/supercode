import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";

export interface CommandOption {
  id: string;
  title: string;
  description?: string;
  category?: string;
  keybind?: string;
  slash?: string;
  suggested?: boolean;
  disabled?: boolean;
  icon?: string;
  onSelect?: (source?: "palette" | "keybind" | "slash") => void;
  onHighlight?: () => (() => void) | void;
}

interface CommandRegistration {
  id: string;
  getOptions: () => CommandOption[];
}

interface CommandContextValue {
  register: (id: string, getOptions: () => CommandOption[]) => () => void;
  unregister: (id: string) => void;
  trigger: (commandId: string, source?: "palette" | "keybind" | "slash") => boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  visible: boolean;
  options: CommandOption[];
  getBySlash: (slash: string) => CommandOption | undefined;
  getByKeybind: (keybind: string) => CommandOption | undefined;
}

const CommandContext = createContext<CommandContextValue | null>(null);

interface CommandProviderProps {
  children: ReactNode;
  defaultCommands?: CommandOption[];
}

export function CommandProvider({ children, defaultCommands = [] }: CommandProviderProps) {
  const [registrations, setRegistrations] = useState<CommandRegistration[]>([]);
  const [visible, setVisible] = useState(false);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const all: CommandOption[] = [];

    for (const opt of defaultCommands) {
      if (seen.has(opt.id)) continue;
      seen.add(opt.id);
      all.push(opt);
    }

    for (const reg of registrations) {
      for (const opt of reg.getOptions()) {
        if (seen.has(opt.id)) continue;
        seen.add(opt.id);
        all.push(opt);
      }
    }

    const suggested = all.filter((x) => x.suggested && !x.disabled);

    return [
      ...suggested.map((x) => ({
        ...x,
        id: "suggested." + x.id,
        category: "Suggested",
      })),
      ...all,
    ];
  }, [registrations, defaultCommands]);

  const register = useCallback((id: string, getOptions: () => CommandOption[]) => {
    setRegistrations((prev) => [...prev, { id, getOptions }]);

    return () => {
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    };
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistrations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const trigger = useCallback(
    (commandId: string, source?: "palette" | "keybind" | "slash"): boolean => {
      const normalizedId = commandId.startsWith("suggested.")
        ? commandId.slice(10)
        : commandId;

      const option = options.find(
        (o) =>
          o.id === commandId ||
          o.id === normalizedId ||
          o.id === "suggested." + normalizedId
      );

      if (option && !option.disabled) {
        option.onSelect?.(source);
        return true;
      }
      return false;
    },
    [options]
  );

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  const getBySlash = useCallback(
    (slash: string): CommandOption | undefined => {
      return options.find((o) => o.slash === slash);
    },
    [options]
  );

  const getByKeybind = useCallback(
    (keybind: string): CommandOption | undefined => {
      return options.find((o) => o.keybind === keybind);
    },
    [options]
  );

  return (
    <CommandContext.Provider
      value={{
        register,
        unregister,
        trigger,
        show,
        hide,
        toggle,
        visible,
        options,
        getBySlash,
        getByKeybind,
      }}
    >
      {children}
    </CommandContext.Provider>
  );
}

export function useCommand(): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("useCommand must be used within CommandProvider");
  }
  return context;
}

export function useCommandRegistration(
  id: string,
  getOptions: () => CommandOption[],
  deps: React.DependencyList = []
): void {
  const command = useCommand();

  useEffect(() => {
    const unregister = command.register(id, getOptions);
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, command.register, ...deps]);
}

export function useCommandTrigger(): (
  commandId: string,
  source?: "palette" | "keybind" | "slash"
) => boolean {
  const command = useCommand();
  return command.trigger;
}

export const DEFAULT_COMMANDS: CommandOption[] = [
  {
    id: "new-session",
    title: "New Session",
    description: "Start a new conversation",
    category: "Session",
    keybind: "Ctrl+N",
    slash: "new",
    icon: "➕",
    suggested: true,
  },
  {
    id: "model-select",
    title: "Select Model",
    description: "Choose a different AI model",
    category: "Settings",
    keybind: "Ctrl+M",
    slash: "models",
    icon: "🤖",
  },
  {
    id: "provider-select",
    title: "Select Provider",
    description: "Choose a different AI provider",
    category: "Settings",
    slash: "provider",
    icon: "🔌",
  },
  {
    id: "theme-toggle",
    title: "Toggle Theme",
    description: "Switch between light and dark mode",
    category: "Settings",
    keybind: "Ctrl+T",
    slash: "theme",
    icon: "🎨",
  },
  {
    id: "help",
    title: "Help",
    description: "Show available commands",
    category: "Help",
    keybind: "Ctrl+?",
    slash: "help",
    icon: "❓",
  },
  {
    id: "command-palette",
    title: "Command Palette",
    description: "Open command palette",
    category: "Navigation",
    keybind: "Ctrl+X",
    icon: "⌘",
  },
  {
    id: "sidebar-toggle",
    title: "Toggle Sidebar",
    description: "Show or hide the sidebar",
    category: "View",
    keybind: "Ctrl+B",
    slash: "sidebar",
    icon: "📊",
  },
  {
    id: "fullscreen",
    title: "Fullscreen",
    description: "Toggle fullscreen mode",
    category: "View",
    keybind: "Ctrl+F",
    slash: "fullscreen",
    icon: "⛶",
  },
  {
    id: "undo",
    title: "Undo",
    description: "Undo last action",
    category: "Edit",
    keybind: "Ctrl+Z",
    slash: "undo",
    icon: "↩",
  },
  {
    id: "redo",
    title: "Redo",
    description: "Redo last action",
    category: "Edit",
    keybind: "Ctrl+Y",
    slash: "redo",
    icon: "↪",
  },
  {
    id: "exit",
    title: "Exit",
    description: "Exit the application",
    category: "System",
    keybind: "Ctrl+C",
    slash: "exit",
    icon: "🚪",
  },
];

export function groupCommandsByCategory(
  commands: CommandOption[]
): Map<string, CommandOption[]> {
  const grouped = new Map<string, CommandOption[]>();

  for (const cmd of commands) {
    const category = cmd.category || "Other";
    const existing = grouped.get(category) || [];
    grouped.set(category, [...existing, cmd]);
  }

  return grouped;
}

export function filterCommands(
  commands: CommandOption[],
  query: string
): CommandOption[] {
  if (!query.trim()) return commands;

  const lowerQuery = query.toLowerCase();

  return commands.filter((cmd) => {
    const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
    const descMatch = cmd.description?.toLowerCase().includes(lowerQuery);
    const slashMatch = cmd.slash?.toLowerCase().includes(lowerQuery);
    const categoryMatch = cmd.category?.toLowerCase().includes(lowerQuery);

    return titleMatch || descMatch || slashMatch || categoryMatch;
  });
}

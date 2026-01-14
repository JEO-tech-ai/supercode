import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  onCleanup,
  type ParentComponent,
  type Accessor,
} from "solid-js";

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
}

type CommandRegistration = {
  id: string;
  getOptions: () => CommandOption[];
};

interface CommandContextValue {
  register: (id: string, getOptions: () => CommandOption[]) => () => void;
  trigger: (commandId: string, source?: "palette" | "keybind" | "slash") => boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  visible: Accessor<boolean>;
  options: Accessor<CommandOption[]>;
  getBySlash: (slash: string) => CommandOption | undefined;
}

const CommandContext = createContext<CommandContextValue>();

const DEFAULT_COMMANDS: CommandOption[] = [
  {
    id: "new-session",
    title: "New Session",
    description: "Start a new conversation",
    category: "Session",
    keybind: "Ctrl+N",
    slash: "new",
    icon: "+",
    suggested: true,
  },
  {
    id: "model-select",
    title: "Select Model",
    description: "Choose a different AI model",
    category: "Settings",
    keybind: "Ctrl+M",
    slash: "model",
    icon: "cpu",
  },
  {
    id: "theme-toggle",
    title: "Toggle Theme",
    description: "Switch between light and dark mode",
    category: "Settings",
    keybind: "Ctrl+T",
    slash: "theme",
    icon: "sun",
  },
  {
    id: "help",
    title: "Help",
    description: "Show available commands",
    category: "Help",
    keybind: "Ctrl+?",
    slash: "help",
    icon: "?",
  },
  {
    id: "command-palette",
    title: "Command Palette",
    description: "Open command palette",
    category: "Navigation",
    keybind: "Ctrl+K",
    icon: "command",
  },
];

export const CommandProvider: ParentComponent = (props) => {
  const [registrations, setRegistrations] = createSignal<CommandRegistration[]>([]);
  const [visible, setVisible] = createSignal(false);

  const options = createMemo(() => {
    const seen = new Set<string>();
    const all: CommandOption[] = [];

    for (const opt of DEFAULT_COMMANDS) {
      if (seen.has(opt.id)) continue;
      seen.add(opt.id);
      all.push(opt);
    }

    for (const reg of registrations()) {
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
  });

  const register = (id: string, getOptions: () => CommandOption[]) => {
    setRegistrations((prev) => [...prev, { id, getOptions }]);

    return () => {
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    };
  };

  const trigger = (commandId: string, source?: "palette" | "keybind" | "slash"): boolean => {
    const normalizedId = commandId.startsWith("suggested.")
      ? commandId.slice(10)
      : commandId;

    const option = options().find(
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
  };

  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const toggle = () => setVisible((v) => !v);

  const getBySlash = (slash: string): CommandOption | undefined => {
    return options().find((o) => o.slash === slash);
  };

  return (
    <CommandContext.Provider
      value={{
        register,
        trigger,
        show,
        hide,
        toggle,
        visible,
        options,
        getBySlash,
      }}
    >
      {props.children}
    </CommandContext.Provider>
  );
};

export function useCommand(): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("useCommand must be used within a CommandProvider");
  }
  return context;
}

export function useCommandRegistration(
  id: string,
  getOptions: () => CommandOption[]
): void {
  const command = useCommand();
  const unregister = command.register(id, getOptions);
  onCleanup(unregister);
}

export default CommandProvider;

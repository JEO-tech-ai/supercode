import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useDialog } from "./dialog";

export interface Command {
  id: string;
  title: string;
  category?: string;
  keybind?: string;
  description?: string;
  suggested?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface CommandContextValue {
  commands: Command[];
  register: (commands: Command[]) => () => void;
  trigger: (id: string) => boolean;
  search: (query: string) => Command[];
  openPalette: () => void;
  closePalette: () => void;
  isPaletteOpen: boolean;
}

const CommandContext = createContext<CommandContextValue | null>(null);

interface CommandProviderProps {
  children: ReactNode;
}

export function CommandProvider({ children }: CommandProviderProps) {
  const [registries, setRegistries] = useState<Map<string, Command[]>>(new Map());
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const dialog = useDialog();

  const commands = useMemo(() => {
    const all: Command[] = [];
    registries.forEach((cmds) => {
      all.push(...cmds.filter((c) => !c.disabled));
    });
    return all;
  }, [registries]);

  const register = useCallback((cmds: Command[]) => {
    const key = `registry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setRegistries((prev) => {
      const next = new Map(prev);
      next.set(key, cmds);
      return next;
    });

    // Return unregister function
    return () => {
      setRegistries((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    };
  }, []);

  const trigger = useCallback((id: string) => {
    const cmd = commands.find((c) => c.id === id);
    if (cmd && !cmd.disabled) {
      cmd.onSelect();
      return true;
    }
    return false;
  }, [commands]);

  const search = useCallback((query: string) => {
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [commands]);

  const openPalette = useCallback(() => {
    setIsPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false);
  }, []);

  return (
    <CommandContext.Provider
      value={{
        commands,
        register,
        trigger,
        search,
        openPalette,
        closePalette,
        isPaletteOpen,
      }}
    >
      {children}
    </CommandContext.Provider>
  );
}

export function useCommand() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("useCommand must be used within CommandProvider");
  }
  return context;
}

// Hook to register commands
export function useCommands(commands: Command[], deps: unknown[] = []) {
  const { register } = useCommand();

  React.useEffect(() => {
    const unregister = register(commands);
    return unregister;
  }, deps);
}

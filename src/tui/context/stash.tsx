import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { PromptPart } from "../component/prompt/FileReference";

export interface StashEntry {
  id: string;
  input: string;
  parts: PromptPart[];
  mode: "normal" | "shell";
  timestamp: number;
  sessionId?: string;
}

interface StashContextValue {
  entries: StashEntry[];
  push: (entry: Omit<StashEntry, "id" | "timestamp">) => void;
  pop: () => StashEntry | undefined;
  peek: () => StashEntry | undefined;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
}

const StashContext = createContext<StashContextValue | null>(null);

const MAX_STASH_ENTRIES = 20;
const STASH_STORAGE_KEY = "supercode_stash";

interface StashProviderProps {
  children: ReactNode;
  persistToStorage?: boolean;
}

export function StashProvider({ children, persistToStorage = false }: StashProviderProps) {
  const [entries, setEntries] = useState<StashEntry[]>(() => {
    if (persistToStorage && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(STASH_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveToStorage = useCallback((newEntries: StashEntry[]) => {
    if (persistToStorage && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(newEntries));
      } catch {
      }
    }
  }, [persistToStorage]);

  const push = useCallback((entry: Omit<StashEntry, "id" | "timestamp">) => {
    const newEntry: StashEntry = {
      ...entry,
      id: `stash-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    setEntries((prev) => {
      const next = [newEntry, ...prev].slice(0, MAX_STASH_ENTRIES);
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const pop = useCallback(() => {
    let popped: StashEntry | undefined;
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[0];
      const next = prev.slice(1);
      saveToStorage(next);
      return next;
    });
    return popped;
  }, [saveToStorage]);

  const peek = useCallback(() => {
    return entries[0];
  }, [entries]);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const clear = useCallback(() => {
    setEntries([]);
    saveToStorage([]);
  }, [saveToStorage]);

  return (
    <StashContext.Provider
      value={{
        entries,
        push,
        pop,
        peek,
        remove,
        clear,
        count: entries.length,
      }}
    >
      {children}
    </StashContext.Provider>
  );
}

export function useStash() {
  const context = useContext(StashContext);
  if (!context) {
    throw new Error("useStash must be used within StashProvider");
  }
  return context;
}

export function formatStashTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function truncateStashInput(input: string, maxLength: number = 50): string {
  const firstLine = input.split("\n")[0];
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength - 3) + "...";
}

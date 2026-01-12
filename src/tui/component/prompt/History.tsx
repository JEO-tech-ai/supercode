import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface HistoryEntry {
  input: string;
  timestamp: number;
  sessionId?: string;
}

interface HistoryContextValue {
  entries: HistoryEntry[];
  add: (entry: Omit<HistoryEntry, "timestamp">) => void;
  get: (index: number) => HistoryEntry | undefined;
  move: (direction: -1 | 1, currentInput: string) => HistoryEntry | undefined;
  reset: () => void;
  currentIndex: number;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

const MAX_HISTORY = 100;

interface HistoryProviderProps {
  children: ReactNode;
}

export function HistoryProvider({ children }: HistoryProviderProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState<string>("");

  const add = useCallback((entry: Omit<HistoryEntry, "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    setEntries((prev) => {
      // Don't add duplicates
      if (prev[0]?.input === entry.input) return prev;
      
      const next = [newEntry, ...prev].slice(0, MAX_HISTORY);
      return next;
    });

    // Reset navigation
    setCurrentIndex(-1);
    setSavedInput("");
  }, []);

  const get = useCallback((index: number) => {
    return entries[index];
  }, [entries]);

  const move = useCallback((direction: -1 | 1, currentInput: string) => {
    // Save current input when starting to navigate
    if (currentIndex === -1 && direction === -1) {
      setSavedInput(currentInput);
    }

    const nextIndex = currentIndex + direction;

    // Going back to current input
    if (nextIndex < -1) {
      return undefined;
    }

    if (nextIndex === -1) {
      setCurrentIndex(-1);
      return { input: savedInput, timestamp: Date.now() };
    }

    // Going into history
    if (nextIndex >= entries.length) {
      return undefined;
    }

    setCurrentIndex(nextIndex);
    return entries[nextIndex];
  }, [currentIndex, entries, savedInput]);

  const reset = useCallback(() => {
    setCurrentIndex(-1);
    setSavedInput("");
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        entries,
        add,
        get,
        move,
        reset,
        currentIndex,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistory must be used within HistoryProvider");
  }
  return context;
}

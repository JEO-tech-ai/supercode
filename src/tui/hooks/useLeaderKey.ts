import { useState, useCallback, useEffect, useRef } from "react";
import { useInput } from "ink";

export interface LeaderKeyBinding {
  key: string;
  label: string;
  action: () => void;
  category?: string;
}

export interface UseLeaderKeyOptions {
  leaderKey?: string;
  timeout?: number;
  bindings: LeaderKeyBinding[];
  enabled?: boolean;
  onActivate?: () => void;
  onDeactivate?: (reason: "timeout" | "execute" | "cancel") => void;
  onKeyPress?: (key: string) => void;
}

export interface UseLeaderKeyReturn {
  isActive: boolean;
  buffer: string;
  availableBindings: LeaderKeyBinding[];
  activate: () => void;
  deactivate: () => void;
  getBindingForKey: (key: string) => LeaderKeyBinding | undefined;
}

const DEFAULT_LEADER_KEY = " ";
const DEFAULT_TIMEOUT = 2000;

export function useLeaderKey(options: UseLeaderKeyOptions): UseLeaderKeyReturn {
  const {
    leaderKey = DEFAULT_LEADER_KEY,
    timeout = DEFAULT_TIMEOUT,
    bindings,
    enabled = true,
    onActivate,
    onDeactivate,
    onKeyPress,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [buffer, setBuffer] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activatedAtRef = useRef<number>(0);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const deactivate = useCallback(
    (reason: "timeout" | "execute" | "cancel" = "cancel") => {
      clearTimeoutRef();
      setIsActive(false);
      setBuffer("");
      activatedAtRef.current = 0;
      onDeactivate?.(reason);
    },
    [clearTimeoutRef, onDeactivate]
  );

  const activate = useCallback(() => {
    if (!enabled) return;

    clearTimeoutRef();
    setIsActive(true);
    setBuffer("");
    activatedAtRef.current = Date.now();
    onActivate?.();

    timeoutRef.current = setTimeout(() => {
      deactivate("timeout");
    }, timeout);
  }, [enabled, clearTimeoutRef, timeout, onActivate, deactivate]);

  const getBindingForKey = useCallback(
    (key: string): LeaderKeyBinding | undefined => {
      return bindings.find((b) => b.key.toLowerCase() === key.toLowerCase());
    },
    [bindings]
  );

  const availableBindings = bindings.filter((b) => {
    if (!buffer) return true;
    return b.key.toLowerCase().startsWith(buffer.toLowerCase());
  });

  useInput(
    (input, key) => {
      if (!enabled) return;

      if (!isActive) {
        const isLeaderKey =
          (leaderKey === " " && input === " " && key.ctrl) ||
          (leaderKey !== " " && input === leaderKey);

        if (isLeaderKey) {
          activate();
          return;
        }
        return;
      }

      if (key.escape) {
        deactivate("cancel");
        return;
      }

      onKeyPress?.(input);

      const newBuffer = buffer + input;
      setBuffer(newBuffer);

      clearTimeoutRef();
      timeoutRef.current = setTimeout(() => {
        deactivate("timeout");
      }, timeout);

      const binding = getBindingForKey(newBuffer);
      if (binding) {
        deactivate("execute");
        binding.action();
        return;
      }

      const hasPartialMatch = bindings.some((b) =>
        b.key.toLowerCase().startsWith(newBuffer.toLowerCase())
      );

      if (!hasPartialMatch) {
        deactivate("cancel");
      }
    },
    { isActive: enabled }
  );

  useEffect(() => {
    return () => {
      clearTimeoutRef();
    };
  }, [clearTimeoutRef]);

  return {
    isActive,
    buffer,
    availableBindings,
    activate,
    deactivate,
    getBindingForKey,
  };
}

export function formatLeaderKeyHint(bindings: LeaderKeyBinding[]): string {
  const grouped = bindings.reduce(
    (acc, b) => {
      const category = b.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(b);
      return acc;
    },
    {} as Record<string, LeaderKeyBinding[]>
  );

  return Object.entries(grouped)
    .map(([category, items]) => {
      const hints = items.map((b) => `${b.key}: ${b.label}`).join(", ");
      return `[${category}] ${hints}`;
    })
    .join(" | ");
}

export const DEFAULT_LEADER_BINDINGS: LeaderKeyBinding[] = [
  { key: "n", label: "New Session", action: () => {}, category: "Session" },
  { key: "s", label: "Save", action: () => {}, category: "Session" },
  { key: "m", label: "Models", action: () => {}, category: "Navigation" },
  { key: "p", label: "Providers", action: () => {}, category: "Navigation" },
  { key: "t", label: "Theme", action: () => {}, category: "Settings" },
  { key: "h", label: "Help", action: () => {}, category: "Help" },
  { key: "?", label: "Keybindings", action: () => {}, category: "Help" },
];

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  variant?: "info" | "success" | "warning" | "error";
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string | Error, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((options: ToastOptions) => {
    const toast: ToastItem = {
      ...options,
      id: options.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      variant: options.variant ?? "info",
      duration: options.duration ?? 3000,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      const next = [...prev, toast];
      return next.slice(-maxToasts);
    });

    // Auto dismiss
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    }
  }, [maxToasts]);

  const success = useCallback((message: string, title?: string) => {
    show({ message, title, variant: "success" });
  }, [show]);

  const error = useCallback((message: string | Error, title?: string) => {
    show({
      message: typeof message === "string" ? message : message.message,
      title: title ?? "Error",
      variant: "error",
      duration: 5000,
    });
  }, [show]);

  const warning = useCallback((message: string, title?: string) => {
    show({ message, title, variant: "warning" });
  }, [show]);

  const info = useCallback((message: string, title?: string) => {
    show({ message, title, variant: "info" });
  }, [show]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        show,
        success,
        error,
        warning,
        info,
        dismiss,
        clear,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

import React, { createContext, useContext, useState, useCallback, type ReactNode, type ReactElement } from "react";

interface DialogContextValue {
  isOpen: boolean;
  content: ReactElement | null;
  show: (content: ReactElement) => void;
  replace: (content: ReactElement) => void;
  clear: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [content, setContent] = useState<ReactElement | null>(null);

  const show = useCallback((newContent: ReactElement) => {
    setContent(newContent);
  }, []);

  const replace = useCallback((newContent: ReactElement) => {
    setContent(newContent);
  }, []);

  const clear = useCallback(() => {
    setContent(null);
  }, []);

  return (
    <DialogContext.Provider
      value={{
        isOpen: content !== null,
        content,
        show,
        replace,
        clear,
      }}
    >
      {children}
      {content}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}

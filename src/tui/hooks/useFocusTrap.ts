import { useState, useCallback, useEffect, useRef } from "react";

export interface FocusableElement {
  id: string;
  focus: () => void;
  blur?: () => void;
  tabIndex?: number;
}

export interface UseFocusTrapOptions {
  enabled?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  initialFocusId?: string;
  onFocusChange?: (elementId: string | null) => void;
  onEscape?: () => void;
}

export interface UseFocusTrapReturn {
  isActive: boolean;
  focusedId: string | null;
  register: (element: FocusableElement) => () => void;
  focus: (id: string) => void;
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  activate: () => void;
  deactivate: () => void;
  getFocusableIds: () => string[];
}

export function useFocusTrap(options: UseFocusTrapOptions = {}): UseFocusTrapReturn {
  const {
    enabled = true,
    autoFocus = true,
    restoreFocus = true,
    initialFocusId,
    onFocusChange,
    onEscape,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const elementsRef = useRef<Map<string, FocusableElement>>(new Map());
  const previousFocusRef = useRef<string | null>(null);
  const orderRef = useRef<string[]>([]);

  const updateOrder = useCallback(() => {
    const elements = Array.from(elementsRef.current.entries())
      .sort((a, b) => (a[1].tabIndex ?? 0) - (b[1].tabIndex ?? 0))
      .map(([id]) => id);
    orderRef.current = elements;
  }, []);

  const register = useCallback(
    (element: FocusableElement): (() => void) => {
      elementsRef.current.set(element.id, element);
      updateOrder();

      return () => {
        elementsRef.current.delete(element.id);
        updateOrder();
      };
    },
    [updateOrder]
  );

  const focus = useCallback(
    (id: string) => {
      const element = elementsRef.current.get(id);
      if (element) {
        element.focus();
        setFocusedId(id);
        onFocusChange?.(id);
      }
    },
    [onFocusChange]
  );

  const focusFirst = useCallback(() => {
    const firstId = orderRef.current[0];
    if (firstId) focus(firstId);
  }, [focus]);

  const focusLast = useCallback(() => {
    const lastId = orderRef.current[orderRef.current.length - 1];
    if (lastId) focus(lastId);
  }, [focus]);

  const focusNext = useCallback(() => {
    if (!focusedId) {
      focusFirst();
      return;
    }

    const currentIndex = orderRef.current.indexOf(focusedId);
    const nextIndex = (currentIndex + 1) % orderRef.current.length;
    const nextId = orderRef.current[nextIndex];
    if (nextId) focus(nextId);
  }, [focusedId, focusFirst, focus]);

  const focusPrevious = useCallback(() => {
    if (!focusedId) {
      focusLast();
      return;
    }

    const currentIndex = orderRef.current.indexOf(focusedId);
    const prevIndex =
      currentIndex <= 0 ? orderRef.current.length - 1 : currentIndex - 1;
    const prevId = orderRef.current[prevIndex];
    if (prevId) focus(prevId);
  }, [focusedId, focusLast, focus]);

  const activate = useCallback(() => {
    if (!enabled) return;

    previousFocusRef.current = focusedId;
    setIsActive(true);

    if (autoFocus) {
      if (initialFocusId && elementsRef.current.has(initialFocusId)) {
        focus(initialFocusId);
      } else {
        focusFirst();
      }
    }
  }, [enabled, autoFocus, initialFocusId, focusedId, focus, focusFirst]);

  const deactivate = useCallback(() => {
    setIsActive(false);

    if (restoreFocus && previousFocusRef.current) {
      const prevElement = elementsRef.current.get(previousFocusRef.current);
      if (prevElement) {
        prevElement.focus();
        setFocusedId(previousFocusRef.current);
        onFocusChange?.(previousFocusRef.current);
      }
    }

    previousFocusRef.current = null;
  }, [restoreFocus, onFocusChange]);

  const getFocusableIds = useCallback(() => {
    return [...orderRef.current];
  }, []);

  useEffect(() => {
    if (!enabled && isActive) {
      deactivate();
    }
  }, [enabled, isActive, deactivate]);

  return {
    isActive,
    focusedId,
    register,
    focus,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    activate,
    deactivate,
    getFocusableIds,
  };
}

export interface UseFocusRestoreOptions {
  enabled?: boolean;
  onRestore?: (id: string) => void;
}

export interface UseFocusRestoreReturn {
  savedId: string | null;
  save: (id: string) => void;
  restore: () => void;
  clear: () => void;
}

export function useFocusRestore(
  options: UseFocusRestoreOptions = {}
): UseFocusRestoreReturn {
  const { enabled = true, onRestore } = options;
  const [savedId, setSavedId] = useState<string | null>(null);

  const save = useCallback(
    (id: string) => {
      if (!enabled) return;
      setSavedId(id);
    },
    [enabled]
  );

  const restore = useCallback(() => {
    if (!enabled || !savedId) return;
    onRestore?.(savedId);
    setSavedId(null);
  }, [enabled, savedId, onRestore]);

  const clear = useCallback(() => {
    setSavedId(null);
  }, []);

  return {
    savedId,
    save,
    restore,
    clear,
  };
}

export function createFocusableRef(
  id: string,
  onFocus?: () => void
): FocusableElement {
  return {
    id,
    focus: () => onFocus?.(),
    tabIndex: 0,
  };
}

import { useState, useCallback } from "react";

export interface CursorPosition {
  index: number;
  column: number;
}

export interface TextSelection {
  start: number;
  end: number;
}

export interface UseCursorOptions {
  initialPosition?: number;
  onPositionChange?: (position: CursorPosition) => void;
}

export interface UseCursorReturn {
  position: CursorPosition;
  selection: TextSelection | null;
  moveLeft: (count?: number) => void;
  moveRight: (count?: number) => void;
  moveToStart: () => void;
  moveToEnd: (textLength: number) => void;
  moveToPosition: (index: number) => void;
  setSelection: (start: number, end: number) => void;
  clearSelection: () => void;
  getPositionForColumn: (column: number, text: string) => number;
  getColumnForPosition: (index: number, text: string) => number;
  handleTextChange: (oldText: string, newText: string, action: "insert" | "delete" | "replace") => void;
}

function getDisplayWidth(char: string): number {
  const code = char.charCodeAt(0);
  
  if (code >= 0x1100 && code <= 0x11FF) return 2;
  if (code >= 0x3000 && code <= 0x9FFF) return 2;
  if (code >= 0xAC00 && code <= 0xD7AF) return 2;
  if (code >= 0xF900 && code <= 0xFAFF) return 2;
  if (code >= 0xFE10 && code <= 0xFE1F) return 2;
  if (code >= 0xFE30 && code <= 0xFE6F) return 2;
  if (code >= 0xFF00 && code <= 0xFF60) return 2;
  if (code >= 0xFFE0 && code <= 0xFFE6) return 2;
  
  return 1;
}

function getTextDisplayWidth(text: string, endIndex?: number): number {
  const end = endIndex ?? text.length;
  let width = 0;
  for (let i = 0; i < end && i < text.length; i++) {
    width += getDisplayWidth(text[i]);
  }
  return width;
}

export function useCursor(options: UseCursorOptions = {}): UseCursorReturn {
  const { initialPosition = 0, onPositionChange } = options;

  const [position, setPosition] = useState<CursorPosition>({
    index: initialPosition,
    column: 0,
  });

  const [selection, setSelectionState] = useState<TextSelection | null>(null);

  const updatePosition = useCallback(
    (index: number, text: string = "") => {
      const column = getTextDisplayWidth(text, index);
      const newPos = { index, column };
      setPosition(newPos);
      onPositionChange?.(newPos);
    },
    [onPositionChange]
  );

  const moveLeft = useCallback(
    (count = 1) => {
      setPosition((prev) => {
        const newIndex = Math.max(0, prev.index - count);
        return { ...prev, index: newIndex };
      });
    },
    []
  );

  const moveRight = useCallback(
    (count = 1) => {
      setPosition((prev) => ({
        ...prev,
        index: prev.index + count,
      }));
    },
    []
  );

  const moveToStart = useCallback(() => {
    setPosition({ index: 0, column: 0 });
    onPositionChange?.({ index: 0, column: 0 });
  }, [onPositionChange]);

  const moveToEnd = useCallback(
    (textLength: number) => {
      setPosition((prev) => ({
        ...prev,
        index: textLength,
      }));
    },
    []
  );

  const moveToPosition = useCallback(
    (index: number) => {
      setPosition((prev) => ({
        ...prev,
        index: Math.max(0, index),
      }));
    },
    []
  );

  const setSelection = useCallback((start: number, end: number) => {
    setSelectionState({
      start: Math.min(start, end),
      end: Math.max(start, end),
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(null);
  }, []);

  const getPositionForColumn = useCallback((column: number, text: string): number => {
    let currentColumn = 0;
    for (let i = 0; i < text.length; i++) {
      const charWidth = getDisplayWidth(text[i]);
      if (currentColumn + charWidth > column) {
        return i;
      }
      currentColumn += charWidth;
    }
    return text.length;
  }, []);

  const getColumnForPosition = useCallback((index: number, text: string): number => {
    return getTextDisplayWidth(text, index);
  }, []);

  const handleTextChange = useCallback(
    (oldText: string, newText: string, action: "insert" | "delete" | "replace") => {
      const lengthDiff = newText.length - oldText.length;

      if (action === "insert") {
        setPosition((prev) => ({
          index: prev.index + lengthDiff,
          column: getTextDisplayWidth(newText, prev.index + lengthDiff),
        }));
      } else if (action === "delete") {
        setPosition((prev) => ({
          index: Math.max(0, prev.index + lengthDiff),
          column: getTextDisplayWidth(newText, Math.max(0, prev.index + lengthDiff)),
        }));
      } else {
        setPosition({
          index: newText.length,
          column: getTextDisplayWidth(newText),
        });
      }

      clearSelection();
    },
    [clearSelection]
  );

  return {
    position,
    selection,
    moveLeft,
    moveRight,
    moveToStart,
    moveToEnd,
    moveToPosition,
    setSelection,
    clearSelection,
    getPositionForColumn,
    getColumnForPosition,
    handleTextChange,
  };
}

export function useTextWidth() {
  return {
    getCharWidth: getDisplayWidth,
    getTextWidth: getTextDisplayWidth,
  };
}

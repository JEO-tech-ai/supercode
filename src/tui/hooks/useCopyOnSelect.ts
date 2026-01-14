import { useState, useCallback, useEffect, useRef } from "react";

export interface TextSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text: string;
}

export interface UseCopyOnSelectOptions {
  enabled?: boolean;
  useOSC52?: boolean;
  onCopy?: (text: string) => void;
  onSelectionChange?: (selection: TextSelection | null) => void;
  showToast?: (message: string) => void;
}

export interface UseCopyOnSelectReturn {
  selection: TextSelection | null;
  isSelecting: boolean;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number, lines: string[]) => void;
  endSelection: () => void;
  clearSelection: () => void;
  copySelection: () => Promise<void>;
  getSelectedText: (lines: string[]) => string;
}

export function useCopyOnSelect(
  options: UseCopyOnSelectOptions = {}
): UseCopyOnSelectReturn {
  const {
    enabled = true,
    useOSC52 = true,
    onCopy,
    onSelectionChange,
    showToast,
  } = options;

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setIsSelecting(false);
    startPosRef.current = null;
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const startSelection = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;

      startPosRef.current = { x, y };
      setIsSelecting(true);
      setSelection({
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        text: "",
      });
    },
    [enabled]
  );

  const getSelectedText = useCallback(
    (lines: string[]): string => {
      if (!selection) return "";

      const { startX, startY, endX, endY } = normalizeSelection(selection);
      const selectedLines: string[] = [];

      for (let y = startY; y <= endY && y < lines.length; y++) {
        const line = lines[y] || "";
        if (y === startY && y === endY) {
          selectedLines.push(line.slice(startX, endX + 1));
        } else if (y === startY) {
          selectedLines.push(line.slice(startX));
        } else if (y === endY) {
          selectedLines.push(line.slice(0, endX + 1));
        } else {
          selectedLines.push(line);
        }
      }

      return selectedLines.join("\n");
    },
    [selection]
  );

  const updateSelection = useCallback(
    (x: number, y: number, lines: string[]) => {
      if (!enabled || !isSelecting || !startPosRef.current) return;

      const newSelection: TextSelection = {
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: x,
        endY: y,
        text: "",
      };

      const normalizedSel = normalizeSelection(newSelection);
      const selectedText = getSelectedTextFromLines(lines, normalizedSel);
      newSelection.text = selectedText;

      setSelection(newSelection);
      onSelectionChange?.(newSelection);
    },
    [enabled, isSelecting, onSelectionChange]
  );

  const endSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    if (useOSC52) {
      const base64 = Buffer.from(text).toString("base64");
      const osc52 = `\x1b]52;c;${base64}\x07`;
      process.stdout.write(osc52);
    }

    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      if (process.platform === "darwin") {
        await execAsync(`echo ${JSON.stringify(text)} | pbcopy`);
      } else if (process.platform === "linux") {
        await execAsync(`echo ${JSON.stringify(text)} | xclip -selection clipboard`);
      } else if (process.platform === "win32") {
        await execAsync(`echo ${JSON.stringify(text)} | clip`);
      }
    } catch {
    }
  }, [useOSC52]);

  const copySelection = useCallback(async () => {
    if (!selection || !selection.text) return;

    await copyToClipboard(selection.text);
    onCopy?.(selection.text);
    showToast?.(`Copied ${selection.text.length} characters`);
    clearSelection();
  }, [selection, copyToClipboard, onCopy, showToast, clearSelection]);

  useEffect(() => {
    if (!enabled) {
      clearSelection();
    }
  }, [enabled, clearSelection]);

  return {
    selection,
    isSelecting,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    copySelection,
    getSelectedText,
  };
}

function normalizeSelection(selection: TextSelection): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} {
  let { startX, startY, endX, endY } = selection;

  if (startY > endY || (startY === endY && startX > endX)) {
    [startX, endX] = [endX, startX];
    [startY, endY] = [endY, startY];
  }

  return { startX, startY, endX, endY };
}

function getSelectedTextFromLines(
  lines: string[],
  selection: { startX: number; startY: number; endX: number; endY: number }
): string {
  const { startX, startY, endX, endY } = selection;
  const selectedLines: string[] = [];

  for (let y = startY; y <= endY && y < lines.length; y++) {
    const line = lines[y] || "";
    if (y === startY && y === endY) {
      selectedLines.push(line.slice(startX, endX + 1));
    } else if (y === startY) {
      selectedLines.push(line.slice(startX));
    } else if (y === endY) {
      selectedLines.push(line.slice(0, endX + 1));
    } else {
      selectedLines.push(line);
    }
  }

  return selectedLines.join("\n");
}

export function writeOSC52(text: string): void {
  const base64 = Buffer.from(text).toString("base64");
  const osc52 = `\x1b]52;c;${base64}\x07`;
  process.stdout.write(osc52);
}

export function escapeForClipboard(text: string): string {
  return text.replace(/'/g, "'\\''");
}

import React, { useRef, useCallback, useMemo } from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../context/theme";
import type { PromptPart } from "./FileReference";
import { getStringWidth } from "../../utils/string-width";

/**
 * Extmark - Virtual text markers that render as "pills" in the prompt
 * 
 * Extmarks allow rich content (files, agents, pasted content) to be displayed
 * as compact visual elements while maintaining the full data underneath.
 */

export interface ExtmarkData {
  id: string;
  type: "file" | "agent" | "paste" | "url" | "symbol";
  start: number;
  end: number;
  displayText: string;
  actualText?: string; // For paste: the full content
  metadata?: {
    path?: string;      // For file
    name?: string;      // For agent
    lines?: number;     // For paste
    url?: string;       // For url
    kind?: string;      // For symbol
  };
}

interface ExtmarkProps {
  data: ExtmarkData;
  isActive?: boolean;
  onRemove?: () => void;
}

/**
 * Single extmark pill component
 */
export function Extmark({ data, isActive, onRemove }: ExtmarkProps) {
  const { theme } = useTheme();

  const colors: Record<ExtmarkData["type"], string> = {
    file: theme.primary || "blue",
    agent: theme.secondary || "magenta",
    paste: theme.success || "green",
    url: theme.accent || "cyan",
    symbol: theme.warning || "yellow",
  };

  const icons: Record<ExtmarkData["type"], string> = {
    file: "@",
    agent: "@",
    paste: "[]",
    url: "🔗",
    symbol: "#",
  };

  const bgColor = isActive ? theme.selection : undefined;

  return (
    <Text
      backgroundColor={bgColor}
      color={colors[data.type]}
    >
      {" "}{icons[data.type]}{data.displayText}{" "}
    </Text>
  );
}

/**
 * ExtmarkManager - Manages extmarks for a prompt input
 * 
 * Handles creation, removal, and position adjustment when text changes.
 */
export class ExtmarkManager {
  private extmarks: Map<string, ExtmarkData> = new Map();
  private counter = 0;
  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  /**
   * Create a new extmark
   */
  create(data: Omit<ExtmarkData, "id">): string {
    const id = `extmark-${++this.counter}-${Date.now()}`;
    this.extmarks.set(id, { ...data, id });
    this.onChange?.();
    return id;
  }

  /**
   * Update an existing extmark
   */
  update(id: string, updates: Partial<ExtmarkData>): void {
    const extmark = this.extmarks.get(id);
    if (extmark) {
      this.extmarks.set(id, { ...extmark, ...updates });
      this.onChange?.();
    }
  }

  /**
   * Remove an extmark by ID
   */
  remove(id: string): void {
    this.extmarks.delete(id);
    this.onChange?.();
  }

  /**
   * Clear all extmarks
   */
  clear(): void {
    this.extmarks.clear();
    this.counter = 0;
    this.onChange?.();
  }

  /**
   * Get all extmarks sorted by position
   */
  getAll(): ExtmarkData[] {
    return Array.from(this.extmarks.values()).sort((a, b) => a.start - b.start);
  }

  /**
   * Get extmarks by type
   */
  getByType(type: ExtmarkData["type"]): ExtmarkData[] {
    return this.getAll().filter((e) => e.type === type);
  }

  /**
   * Get extmark at a specific position (for deletion handling)
   */
  getAtPosition(position: number): ExtmarkData | undefined {
    for (const extmark of this.extmarks.values()) {
      if (position >= extmark.start && position <= extmark.end) {
        return extmark;
      }
    }
    return undefined;
  }

  /**
   * Adjust positions when text changes
   * @param changeStart - Position where change occurred
   * @param delta - Number of characters added (positive) or removed (negative)
   */
  adjustPositions(changeStart: number, delta: number): void {
    const toRemove: string[] = [];

    for (const extmark of this.extmarks.values()) {
      if (delta < 0) {
        // Deletion
        const deleteEnd = changeStart - delta;
        
        // Check if deletion overlaps with extmark
        if (changeStart < extmark.end && deleteEnd > extmark.start) {
          // Extmark is affected by deletion - remove it
          toRemove.push(extmark.id);
          continue;
        }
      }

      // Adjust positions for extmarks after the change
      if (extmark.start >= changeStart) {
        extmark.start += delta;
        extmark.end += delta;
      } else if (extmark.end > changeStart) {
        // Change is inside extmark - adjust end only
        extmark.end += delta;
      }
    }

    // Remove affected extmarks
    for (const id of toRemove) {
      this.extmarks.delete(id);
    }

    if (toRemove.length > 0) {
      this.onChange?.();
    }
  }

  /**
   * Convert extmarks to PromptParts for submission
   */
  toPromptParts(): PromptPart[] {
    return this.getAll().map((extmark) => {
      switch (extmark.type) {
        case "file":
          return {
            type: "file" as const,
            path: extmark.metadata?.path || extmark.displayText,
            displayPath: extmark.displayText,
          };
        case "agent":
          return {
            type: "agent" as const,
            name: extmark.metadata?.name || extmark.displayText,
          };
        case "url":
          return {
            type: "url" as const,
            url: extmark.metadata?.url || extmark.displayText,
          };
        case "symbol":
          return {
            type: "symbol" as const,
            name: extmark.displayText,
            kind: (extmark.metadata?.kind as "function" | "class" | "variable" | "type" | "interface") || "function",
          };
        case "paste":
          return {
            type: "text" as const,
            text: extmark.actualText || extmark.displayText,
          };
        default:
          return {
            type: "text" as const,
            text: extmark.displayText,
          };
      }
    });
  }

  /**
   * Get the count of extmarks
   */
  get size(): number {
    return this.extmarks.size;
  }

  /**
   * Check if there are any extmarks
   */
  get isEmpty(): boolean {
    return this.extmarks.size === 0;
  }
}

/**
 * Hook to use ExtmarkManager with React state updates
 */
export function useExtmarkManager() {
  const forceUpdate = useCallback(() => {
    // Trigger re-render
  }, []);
  
  const managerRef = useRef<ExtmarkManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new ExtmarkManager(forceUpdate);
  }

  return managerRef.current;
}

/**
 * Render text with extmarks as pills
 */
interface RenderWithExtmarksProps {
  text: string;
  extmarks: ExtmarkData[];
  cursorPosition?: number;
  activeExtmarkId?: string;
  onExtmarkClick?: (id: string) => void;
}

export function RenderWithExtmarks({
  text,
  extmarks,
  cursorPosition,
  activeExtmarkId,
  onExtmarkClick,
}: RenderWithExtmarksProps) {
  const { theme } = useTheme();
  
  const parts = useMemo(() => {
    const sortedExtmarks = [...extmarks].sort((a, b) => a.start - b.start);
    const result: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const extmark of sortedExtmarks) {
      // Text before extmark
      if (extmark.start > lastEnd) {
        const textBefore = text.slice(lastEnd, extmark.start);
        result.push(
          <Text key={`text-${lastEnd}`}>{textBefore}</Text>
        );
      }

      // Extmark pill
      result.push(
        <Extmark
          key={extmark.id}
          data={extmark}
          isActive={activeExtmarkId === extmark.id}
        />
      );

      lastEnd = extmark.end;
    }

    // Remaining text after last extmark
    if (lastEnd < text.length) {
      result.push(
        <Text key={`text-${lastEnd}`}>{text.slice(lastEnd)}</Text>
      );
    }

    // If no content, show placeholder
    if (result.length === 0 && text.length === 0) {
      result.push(
        <Text key="empty" color={theme.textMuted}>
          Type a message...
        </Text>
      );
    }

    return result;
  }, [text, extmarks, activeExtmarkId, theme.textMuted]);

  return <Box>{parts}</Box>;
}

export function createFileExtmark(
  manager: ExtmarkManager,
  path: string,
  position: number
): string {
  const displayText = path.split("/").pop() || path;
  const virtualText = "@" + displayText;
  return manager.create({
    type: "file",
    start: position,
    end: position + getStringWidth(virtualText),
    displayText,
    metadata: { path },
  });
}

export function createAgentExtmark(
  manager: ExtmarkManager,
  name: string,
  position: number
): string {
  const virtualText = "@" + name;
  return manager.create({
    type: "agent",
    start: position,
    end: position + getStringWidth(virtualText),
    displayText: name,
    metadata: { name },
  });
}

export function createPasteExtmark(
  manager: ExtmarkManager,
  content: string,
  position: number
): string {
  const lines = content.split("\n").length;
  const displayText = `Pasted ~${lines} lines`;
  const virtualText = "[" + displayText + "]";
  return manager.create({
    type: "paste",
    start: position,
    end: position + getStringWidth(virtualText),
    displayText,
    actualText: content,
    metadata: { lines },
  });
}

export function createURLExtmark(
  manager: ExtmarkManager,
  url: string,
  position: number,
  title?: string
): string {
  const displayText = title || new URL(url).hostname;
  const virtualText = "\uD83D\uDD17" + displayText;
  return manager.create({
    type: "url",
    start: position,
    end: position + getStringWidth(virtualText),
    displayText,
    metadata: { url },
  });
}

export default Extmark;

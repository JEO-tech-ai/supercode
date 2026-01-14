import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ImageAttachment, ClipboardContent } from "../hooks/useClipboard";
import { createImageAttachment, readImageFromPath, isImagePath } from "../hooks/useClipboard";

export interface FileAttachment extends ImageAttachment {
  source: "clipboard" | "path" | "drop";
  originalPath?: string;
}

interface FileContextValue {
  attachments: FileAttachment[];
  addAttachment: (attachment: FileAttachment) => void;
  addFromClipboard: (content: ClipboardContent) => FileAttachment | null;
  addFromPath: (path: string) => Promise<FileAttachment | null>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrev: () => void;
  removeSelected: () => void;
  hasAttachments: boolean;
  totalSize: number;
}

const FileContext = createContext<FileContextValue | null>(null);

interface FileProviderProps {
  children: ReactNode;
  maxAttachments?: number;
  maxTotalSize?: number;
}

export function FileProvider({
  children,
  maxAttachments = 10,
  maxTotalSize = 50 * 1024 * 1024,
}: FileProviderProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const calculateSize = useCallback((att: FileAttachment) => {
    const base64 = att.dataUrl.split(",")[1] || "";
    return Math.ceil((base64.length * 3) / 4);
  }, []);

  const totalSize = attachments.reduce((sum, att) => sum + calculateSize(att), 0);

  const addAttachment = useCallback(
    (attachment: FileAttachment) => {
      setAttachments((prev) => {
        if (prev.length >= maxAttachments) return prev;

        const newSize = totalSize + calculateSize(attachment);
        if (newSize > maxTotalSize) return prev;

        if (prev.some((a) => a.id === attachment.id)) return prev;

        return [...prev, attachment];
      });
    },
    [maxAttachments, maxTotalSize, totalSize, calculateSize]
  );

  const addFromClipboard = useCallback(
    (content: ClipboardContent): FileAttachment | null => {
      const base = createImageAttachment(content);
      if (!base) return null;

      const attachment: FileAttachment = {
        ...base,
        source: "clipboard",
      };

      addAttachment(attachment);
      return attachment;
    },
    [addAttachment]
  );

  const addFromPath = useCallback(
    async (path: string): Promise<FileAttachment | null> => {
      if (!isImagePath(path)) return null;

      const content = await readImageFromPath(path);
      if (!content) return null;

      const base = createImageAttachment(content);
      if (!base) return null;

      const attachment: FileAttachment = {
        ...base,
        source: "path",
        originalPath: path,
      };

      addAttachment(attachment);
      return attachment;
    },
    [addAttachment]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const newList = prev.filter((a) => a.id !== id);
      setSelectedIndex((idx) => {
        if (newList.length === 0) return -1;
        if (idx >= newList.length) return newList.length - 1;
        return idx;
      });
      return newList;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setSelectedIndex(-1);
  }, []);

  const selectNext = useCallback(() => {
    if (attachments.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % attachments.length);
  }, [attachments.length]);

  const selectPrev = useCallback(() => {
    if (attachments.length === 0) return;
    setSelectedIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
  }, [attachments.length]);

  const removeSelected = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= attachments.length) return;
    removeAttachment(attachments[selectedIndex].id);
  }, [selectedIndex, attachments, removeAttachment]);

  const value: FileContextValue = {
    attachments,
    addAttachment,
    addFromClipboard,
    addFromPath,
    removeAttachment,
    clearAttachments,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrev,
    removeSelected,
    hasAttachments: attachments.length > 0,
    totalSize,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFileAttachments(): FileContextValue {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFileAttachments must be used within FileProvider");
  }
  return context;
}

export function useOptionalFileAttachments(): FileContextValue | null {
  return useContext(FileContext);
}

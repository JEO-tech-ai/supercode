import { createSignal, onMount, onCleanup, type Accessor } from "solid-js";

export interface DragDropFile {
  file: File;
  dataUrl: string;
}

export interface UseDragDropOptions {
  acceptedTypes?: string[];
  onDrop?: (files: DragDropFile[]) => void;
  disabled?: boolean;
}

export interface UseDragDropReturn {
  isDragging: Accessor<boolean>;
  isProcessing: Accessor<boolean>;
  error: Accessor<string | null>;
}

const DEFAULT_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropReturn {
  const {
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    onDrop,
    disabled = false,
  } = options;

  const [isDragging, setIsDragging] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let dragCounter = 0;

  const handleDragEnter = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    dragCounter++;
    
    if (event.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    dragCounter--;
    
    if (dragCounter === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    dragCounter = 0;
    setIsDragging(false);
    setError(null);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const acceptedFiles = Array.from(files).filter((file) =>
      acceptedTypes.includes(file.type)
    );

    if (acceptedFiles.length === 0) {
      setError("No supported files found. Supported: PNG, JPEG, GIF, WebP, SVG, PDF");
      return;
    }

    setIsProcessing(true);

    try {
      const results: DragDropFile[] = [];

      for (const file of acceptedFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        results.push({ file, dataUrl });
      }

      onDrop?.(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process files");
    } finally {
      setIsProcessing(false);
    }
  };

  onMount(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
  });

  onCleanup(() => {
    document.removeEventListener("dragenter", handleDragEnter);
    document.removeEventListener("dragleave", handleDragLeave);
    document.removeEventListener("dragover", handleDragOver);
    document.removeEventListener("drop", handleDrop);
  });

  return {
    isDragging,
    isProcessing,
    error,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

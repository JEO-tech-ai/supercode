import { createSignal, onMount, onCleanup, type Accessor } from "solid-js";

export interface ImageAttachment {
  id: string;
  filename: string;
  mime: string;
  dataUrl: string;
}

export interface UseImagePasteOptions {
  acceptedTypes?: string[];
  onAttach?: (attachment: ImageAttachment) => void;
  disabled?: boolean;
}

export interface UseImagePasteReturn {
  isPasting: Accessor<boolean>;
  error: Accessor<string | null>;
}

const DEFAULT_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

export function useImagePaste(options: UseImagePasteOptions = {}): UseImagePasteReturn {
  const {
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    onAttach,
    disabled = false,
  } = options;

  const [isPasting, setIsPasting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handlePaste = async (event: ClipboardEvent) => {
    if (disabled) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);
    const fileItems = items.filter(
      (item) => item.kind === "file" && acceptedTypes.includes(item.type)
    );

    if (fileItems.length === 0) return;

    event.preventDefault();
    setIsPasting(true);
    setError(null);

    try {
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (!file) continue;

        const dataUrl = await readFileAsDataUrl(file);

        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
          filename: file.name || `pasted-${Date.now()}.${getExtension(file.type)}`,
          mime: file.type,
          dataUrl,
        };

        onAttach?.(attachment);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process pasted content");
    } finally {
      setIsPasting(false);
    }
  };

  onMount(() => {
    document.addEventListener("paste", handlePaste);
  });

  onCleanup(() => {
    document.removeEventListener("paste", handlePaste);
  });

  return {
    isPasting,
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

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return map[mimeType] || "bin";
}

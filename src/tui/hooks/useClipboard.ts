import { useState, useCallback, useEffect } from "react";
import * as fs from "fs";
import * as path from "path";

export interface ClipboardContent {
  type: "text" | "image";
  data: string;
  mime?: string;
  filename?: string;
}

export interface ImageAttachment {
  id: string;
  filename: string;
  mime: string;
  dataUrl: string;
  size?: number;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"];
const PDF_EXTENSIONS = [".pdf"];
const ALL_SUPPORTED_EXTENSIONS = [...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS];

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
];

export const ACCEPTED_FILE_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];

export function isImagePath(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized.includes(".")) return false;
  return IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isPdfPath(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.trim().toLowerCase();
  return normalized.endsWith(".pdf");
}

export function isSupportedFilePath(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized.includes(".")) return false;
  return ALL_SUPPORTED_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isValidFilePath(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  try {
    const normalized = text.trim().replace(/^['"]|['"]$/g, "").replace(/\\ /g, " ");
    return fs.existsSync(normalized);
  } catch {
    return false;
  }
}

export async function readImageFromPath(filePath: string): Promise<ClipboardContent | null> {
  try {
    const normalized = filePath.trim().replace(/^['"]|['"]$/g, "").replace(/\\ /g, " ");

    if (!fs.existsSync(normalized)) return null;

    const stats = fs.statSync(normalized);
    if (!stats.isFile()) return null;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (stats.size > MAX_SIZE) return null;

    const buffer = fs.readFileSync(normalized);
    const base64 = buffer.toString("base64");

    const ext = path.extname(normalized).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".bmp": "image/bmp",
      ".ico": "image/x-icon",
    };

    return {
      type: "image",
      data: base64,
      mime: mimeMap[ext] || "image/png",
      filename: path.basename(normalized),
    };
  } catch {
    return null;
  }
}

export async function readPdfFromPath(filePath: string): Promise<ClipboardContent | null> {
  try {
    const normalized = filePath.trim().replace(/^['"]|['"]$/g, "").replace(/\\ /g, " ");

    if (!fs.existsSync(normalized)) return null;

    const stats = fs.statSync(normalized);
    if (!stats.isFile()) return null;

    const MAX_PDF_SIZE = 50 * 1024 * 1024;
    if (stats.size > MAX_PDF_SIZE) return null;

    const buffer = fs.readFileSync(normalized);
    const base64 = buffer.toString("base64");

    return {
      type: "image",
      data: base64,
      mime: "application/pdf",
      filename: path.basename(normalized),
    };
  } catch {
    return null;
  }
}

export async function readFileFromPath(filePath: string): Promise<ClipboardContent | null> {
  if (isPdfPath(filePath)) {
    return readPdfFromPath(filePath);
  }
  if (isImagePath(filePath)) {
    return readImageFromPath(filePath);
  }
  return null;
}

async function readTextClipboard(): Promise<string> {
  try {
    const { execSync } = await import("child_process");

    if (process.platform === "darwin") {
      return execSync("pbpaste", { encoding: "utf-8", timeout: 5000 });
    }

    if (process.platform === "linux") {
      return execSync("xclip -selection clipboard -o", { encoding: "utf-8", timeout: 5000 });
    }

    if (process.platform === "win32") {
      return execSync("powershell Get-Clipboard", { encoding: "utf-8", timeout: 5000 });
    }

    return "";
  } catch {
    return "";
  }
}

async function writeToClipboard(text: string): Promise<void> {
  try {
    const { execSync } = await import("child_process");
    const escaped = text.replace(/"/g, '\\"');

    if (process.platform === "darwin") {
      execSync(`echo "${escaped}" | pbcopy`, { timeout: 5000 });
    } else if (process.platform === "linux") {
      execSync(`echo "${escaped}" | xclip -selection clipboard`, { timeout: 5000 });
    } else if (process.platform === "win32") {
      execSync(`echo ${text} | clip`, { timeout: 5000 });
    }
  } catch {
  }
}

async function readImageClipboard(): Promise<ClipboardContent | null> {
  try {
    if (process.platform !== "darwin") return null;

    const { execSync } = await import("child_process");

    const types = execSync("osascript -e 'clipboard info' 2>/dev/null || echo ''", {
      encoding: "utf-8",
      timeout: 5000,
    });

    const hasImage = types.includes("«class PNGf»") || types.includes("TIFF") || types.includes("JPEG");
    if (!hasImage) return null;

    const tempPath = `/tmp/supercode-clipboard-${Date.now()}.png`;

    execSync(
      `osascript -e 'set pngData to the clipboard as «class PNGf»' -e 'set fp to open for access POSIX file "${tempPath}" with write permission' -e 'write pngData to fp' -e 'close access fp'`,
      { timeout: 10000 }
    );

    const result = await readImageFromPath(tempPath);

    try {
      fs.unlinkSync(tempPath);
    } catch {
    }

    if (result) {
      result.filename = `clipboard-${Date.now()}.png`;
    }

    return result;
  } catch {
    return null;
  }
}

export interface UseClipboardOptions {
  detectImagePaths?: boolean;
  enableNativeImage?: boolean;
}

export interface UseClipboardReturn {
  read: () => Promise<ClipboardContent | null>;
  readText: () => Promise<string>;
  readImage: () => Promise<ClipboardContent | null>;
  write: (text: string) => Promise<void>;
  isImagePath: (text: string) => boolean;
  readImageFromPath: (path: string) => Promise<ClipboardContent | null>;
  hasImage: boolean;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { detectImagePaths = true, enableNativeImage = true } = options;
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    if (!enableNativeImage || process.platform !== "darwin") return;

    const checkClipboard = async () => {
      try {
        const { execSync } = await import("child_process");
        const types = execSync("osascript -e 'clipboard info' 2>/dev/null || echo ''", {
          encoding: "utf-8",
          timeout: 2000,
        });
        setHasImage(types.includes("«class PNGf»") || types.includes("TIFF") || types.includes("JPEG"));
      } catch {
        setHasImage(false);
      }
    };

    checkClipboard();
    const interval = setInterval(checkClipboard, 2000);
    return () => clearInterval(interval);
  }, [enableNativeImage]);

  const read = useCallback(async (): Promise<ClipboardContent | null> => {
    try {
      if (enableNativeImage) {
        const imageContent = await readImageClipboard();
        if (imageContent) return imageContent;
      }

      const text = await readTextClipboard();
      if (!text) return null;

      if (detectImagePaths && isImagePath(text)) {
        const imageContent = await readImageFromPath(text);
        if (imageContent) return imageContent;
      }

      return { type: "text", data: text };
    } catch {
      return null;
    }
  }, [detectImagePaths, enableNativeImage]);

  const readText = useCallback(async (): Promise<string> => {
    return readTextClipboard();
  }, []);

  const readImage = useCallback(async (): Promise<ClipboardContent | null> => {
    if (!enableNativeImage) return null;
    return readImageClipboard();
  }, [enableNativeImage]);

  const write = useCallback(async (text: string): Promise<void> => {
    await writeToClipboard(text);
  }, []);

  return {
    read,
    readText,
    readImage,
    write,
    isImagePath,
    readImageFromPath,
    hasImage,
  };
}

export function createImageAttachment(content: ClipboardContent): ImageAttachment | null {
  if (content.type !== "image") return null;

  return {
    id: crypto.randomUUID(),
    filename: content.filename ?? `image-${Date.now()}`,
    mime: content.mime ?? "image/png",
    dataUrl: `data:${content.mime ?? "image/png"};base64,${content.data}`,
  };
}

export function getBase64Size(base64: string): number {
  return Math.ceil((base64.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

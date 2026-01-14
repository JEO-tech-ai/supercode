import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import type { FileAttachmentPart } from "./types";

const TEMP_DIR = "/tmp/supercode/attachments";
const MAX_INLINE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

export async function ensureAttachmentDir(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

export function getAttachmentType(mime: string): FileAttachmentPart["type"] {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export function extractBase64Data(dataUrl: string): { mime: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

export function calculateBase64Size(base64: string): number {
  return Math.ceil((base64.length * 3) / 4);
}

export async function storeAttachment(attachment: FileAttachmentPart): Promise<string> {
  await ensureAttachmentDir();

  const extracted = extractBase64Data(attachment.dataUrl);
  if (!extracted) {
    throw new Error("Invalid data URL format");
  }

  const buffer = Buffer.from(extracted.data, "base64");

  if (buffer.length > MAX_ATTACHMENT_SIZE) {
    throw new Error(`Attachment too large: ${buffer.length} bytes (max ${MAX_ATTACHMENT_SIZE})`);
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const ext = getExtensionFromMime(extracted.mime);
  const filename = `${attachment.id}-${hash}.${ext}`;
  const filePath = path.join(TEMP_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return filePath;
}

export async function loadAttachment(filePath: string): Promise<FileAttachmentPart | null> {
  try {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString("base64");
    const ext = path.extname(filePath).slice(1);
    const mime = getMimeFromExtension(ext);

    return {
      id: path.basename(filePath, `.${ext}`).split("-")[0],
      type: getAttachmentType(mime),
      filename: path.basename(filePath),
      mime,
      dataUrl: `data:${mime};base64,${base64}`,
      size: buffer.length,
      source: "path",
      originalPath: filePath,
    };
  } catch {
    return null;
  }
}

export function shouldStoreExternally(attachment: FileAttachmentPart): boolean {
  const extracted = extractBase64Data(attachment.dataUrl);
  if (!extracted) return false;
  return calculateBase64Size(extracted.data) > MAX_INLINE_SIZE;
}

export async function processAttachmentsForStorage(
  attachments: FileAttachmentPart[]
): Promise<FileAttachmentPart[]> {
  const processed: FileAttachmentPart[] = [];

  for (const attachment of attachments) {
    if (shouldStoreExternally(attachment)) {
      const storedPath = await storeAttachment(attachment);
      processed.push({
        ...attachment,
        dataUrl: `file://${storedPath}`,
        originalPath: storedPath,
      });
    } else {
      processed.push(attachment);
    }
  }

  return processed;
}

export async function resolveAttachment(attachment: FileAttachmentPart): Promise<FileAttachmentPart> {
  if (!attachment.dataUrl.startsWith("file://")) {
    return attachment;
  }

  const filePath = attachment.dataUrl.replace("file://", "");
  const loaded = await loadAttachment(filePath);

  if (loaded) {
    return {
      ...attachment,
      dataUrl: loaded.dataUrl,
    };
  }

  return attachment;
}

export async function resolveAttachments(
  attachments: FileAttachmentPart[]
): Promise<FileAttachmentPart[]> {
  return Promise.all(attachments.map(resolveAttachment));
}

export async function cleanupOldAttachments(maxAgeDays: number = 7): Promise<number> {
  try {
    await ensureAttachmentDir();
    const files = await fs.readdir(TEMP_DIR);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stat = await fs.stat(filePath);

      if (stat.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        deleted++;
      }
    }

    return deleted;
  } catch {
    return 0;
  }
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
  };
  return map[mime] || "bin";
}

function getMimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    pdf: "application/pdf",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

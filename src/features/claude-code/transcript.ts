import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { TranscriptEntry } from "./types";

const TRANSCRIPT_BASE = path.join(os.homedir(), ".supercode", "transcripts");

export function getTranscriptPath(sessionId: string): string {
  return path.join(TRANSCRIPT_BASE, `${sessionId}.jsonl`);
}

export function getTranscriptDir(): string {
  return TRANSCRIPT_BASE;
}

export function readTranscript(sessionId: string): TranscriptEntry[] {
  const transcriptPath = getTranscriptPath(sessionId);

  if (!fs.existsSync(transcriptPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(transcriptPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.map((line) => {
      const entry = JSON.parse(line) as TranscriptEntry & {
        timestamp: string;
      };
      return {
        ...entry,
        timestamp: new Date(entry.timestamp),
      };
    });
  } catch {
    return [];
  }
}

export function appendToTranscript(
  sessionId: string,
  entry: Omit<TranscriptEntry, "timestamp">
): void {
  const transcriptPath = getTranscriptPath(sessionId);
  const dir = path.dirname(transcriptPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const line =
    JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + "\n";

  fs.appendFileSync(transcriptPath, line);
}

export function searchTranscript(
  sessionId: string,
  pattern: string | RegExp
): TranscriptEntry[] {
  const entries = readTranscript(sessionId);
  const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;

  return entries.filter((entry) => regex.test(entry.content));
}

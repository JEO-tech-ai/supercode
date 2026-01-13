import { join } from "node:path";
import { homedir } from "node:os";

function getDataDir(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
}

function getStorageDir(): string {
  return join(getDataDir(), "opencode", "storage");
}

export const STORAGE_DIR = getStorageDir();
export const MESSAGE_STORAGE = join(STORAGE_DIR, "message");
export const PART_STORAGE = join(STORAGE_DIR, "part");

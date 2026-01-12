/**
 * AST-Grep Binary Downloader
 * Automatic download and caching of ast-grep binary.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import { spawn } from "bun";
import { existsSync, mkdirSync, chmodSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import logger from "../../../shared/logger";

/**
 * GitHub repo for ast-grep
 */
const REPO = "ast-grep/ast-grep";

/**
 * Default version (fallback)
 */
const DEFAULT_VERSION = "0.40.0";

/**
 * Platform mapping for download URLs
 */
interface PlatformInfo {
  arch: string;
  os: string;
}

const PLATFORM_MAP: Record<string, PlatformInfo> = {
  "darwin-arm64": { arch: "aarch64", os: "apple-darwin" },
  "darwin-x64": { arch: "x86_64", os: "apple-darwin" },
  "linux-arm64": { arch: "aarch64", os: "unknown-linux-gnu" },
  "linux-x64": { arch: "x86_64", os: "unknown-linux-gnu" },
  "win32-x64": { arch: "x86_64", os: "pc-windows-msvc" },
  "win32-arm64": { arch: "aarch64", os: "pc-windows-msvc" },
  "win32-ia32": { arch: "i686", os: "pc-windows-msvc" },
};

/**
 * Get cache directory for binary
 */
export function getCacheDir(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
    const base = localAppData || join(homedir(), "AppData", "Local");
    return join(base, "supercode", "bin");
  }

  const xdgCache = process.env.XDG_CACHE_HOME;
  const base = xdgCache || join(homedir(), ".cache");
  return join(base, "supercode", "bin");
}

/**
 * Get binary name for current platform
 */
export function getBinaryName(): string {
  return process.platform === "win32" ? "sg.exe" : "sg";
}

/**
 * Get cached binary path if exists
 */
export function getCachedBinaryPath(): string | null {
  const binaryPath = join(getCacheDir(), getBinaryName());
  return existsSync(binaryPath) ? binaryPath : null;
}

/**
 * Extract zip archive
 */
async function extractZip(archivePath: string, destDir: string): Promise<void> {
  const proc =
    process.platform === "win32"
      ? spawn({
          cmd: [
            "powershell",
            "-command",
            `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
          ],
          stdout: "pipe",
          stderr: "pipe",
        })
      : spawn({
          cmd: ["unzip", "-o", archivePath, "-d", destDir],
          stdout: "pipe",
          stderr: "pipe",
        });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    const toolHint =
      process.platform === "win32"
        ? "Ensure PowerShell is available on your system."
        : "Please install 'unzip' (e.g., apt install unzip, brew install unzip).";
    throw new Error(`zip extraction failed (exit ${exitCode}): ${stderr}\n\n${toolHint}`);
  }
}

/**
 * Download ast-grep binary from GitHub releases
 */
export async function downloadAstGrep(version: string = DEFAULT_VERSION): Promise<string | null> {
  const platformKey = `${process.platform}-${process.arch}`;
  const platformInfo = PLATFORM_MAP[platformKey];

  if (!platformInfo) {
    logger.error(`[ast-grep] Unsupported platform: ${platformKey}`);
    return null;
  }

  const cacheDir = getCacheDir();
  const binaryName = getBinaryName();
  const binaryPath = join(cacheDir, binaryName);

  // Return if already cached
  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  const { arch, os } = platformInfo;
  const assetName = `app-${arch}-${os}.zip`;
  const downloadUrl = `https://github.com/${REPO}/releases/download/${version}/${assetName}`;

  logger.info("[ast-grep] Downloading binary...");

  try {
    // Ensure cache directory exists
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    // Download archive
    const response = await fetch(downloadUrl, { redirect: "follow" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const archivePath = join(cacheDir, assetName);
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(archivePath, arrayBuffer);

    // Extract archive
    await extractZip(archivePath, cacheDir);

    // Clean up archive
    if (existsSync(archivePath)) {
      unlinkSync(archivePath);
    }

    // Set executable permission on Unix
    if (process.platform !== "win32" && existsSync(binaryPath)) {
      chmodSync(binaryPath, 0o755);
    }

    logger.info("[ast-grep] Binary ready.");

    return binaryPath;
  } catch (err) {
    logger.error(
      `[ast-grep] Failed to download: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
}

/**
 * Ensure ast-grep binary is available
 * Downloads if not found in cache
 */
export async function ensureAstGrepBinary(): Promise<string | null> {
  // Check cache first
  const cachedPath = getCachedBinaryPath();
  if (cachedPath) {
    return cachedPath;
  }

  // Download if not cached
  return downloadAstGrep(DEFAULT_VERSION);
}

/**
 * Get current version of downloaded binary
 */
export async function getDownloadedVersion(): Promise<string | null> {
  const binaryPath = getCachedBinaryPath();
  if (!binaryPath) return null;

  try {
    const proc = spawn({
      cmd: [binaryPath, "--version"],
      stdout: "pipe",
      stderr: "ignore",
    });

    const output = await new Response(proc.stdout).text();
    const versionMatch = output.match(/\d+\.\d+\.\d+/);
    return versionMatch ? versionMatch[0] : null;
  } catch {
    return null;
  }
}

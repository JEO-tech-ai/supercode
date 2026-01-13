import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

export const PACKAGE_NAME = "supercode";
export const NPM_REGISTRY_URL = `https://registry.npmjs.org/-/package/${PACKAGE_NAME}/dist-tags`;
export const NPM_FETCH_TIMEOUT = 5000;

function getCacheDir(): string {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA ?? os.homedir(), "supercode");
  }
  return path.join(os.homedir(), ".cache", "supercode");
}

export const CACHE_DIR = getCacheDir();
export const VERSION_FILE = path.join(CACHE_DIR, "version");
export const INSTALLED_PACKAGE_JSON = path.join(
  CACHE_DIR,
  "node_modules",
  PACKAGE_NAME,
  "package.json"
);

function getUserConfigDir(): string {
  if (process.platform === "win32") {
    const crossPlatformDir = path.join(os.homedir(), ".config");
    const appdataDir = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    
    const crossPlatformConfig = path.join(crossPlatformDir, "supercode", "supercode.json");
    const crossPlatformConfigJsonc = path.join(crossPlatformDir, "supercode", "supercode.jsonc");
    
    if (fs.existsSync(crossPlatformConfig) || fs.existsSync(crossPlatformConfigJsonc)) {
      return crossPlatformDir;
    }
    
    return appdataDir;
  }
  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
}

export function getWindowsAppdataDir(): string | null {
  if (process.platform !== "win32") return null;
  return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
}

export const USER_CONFIG_DIR = getUserConfigDir();
export const USER_SUPERCODE_CONFIG = path.join(USER_CONFIG_DIR, "supercode", "supercode.json");
export const USER_SUPERCODE_CONFIG_JSONC = path.join(USER_CONFIG_DIR, "supercode", "supercode.jsonc");

export const SISYPHUS_SPINNER = ["·", "•", "●", "○", "◌", "◦", " "];

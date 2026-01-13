import type { Hook, HookContext } from "../types";
import type { AutoUpdateCheckerOptions } from "./types";
import {
  getCachedVersion,
  getLocalDevVersion,
  findPluginEntry,
  getLatestVersion,
  updatePinnedVersion,
} from "./checker";
import { invalidatePackage } from "./cache";
import { PACKAGE_NAME, SISYPHUS_SPINNER } from "./constants";
import logger from "../../../shared/logger";

async function runBunInstall(): Promise<boolean> {
  try {
    const { spawn } = await import("node:child_process");
    const { CACHE_DIR } = await import("./constants");
    
    return new Promise((resolve) => {
      const proc = spawn("bun", ["install"], {
        cwd: CACHE_DIR,
        stdio: "ignore",
        detached: true,
      });
      
      proc.on("close", (code) => {
        resolve(code === 0);
      });
      
      proc.on("error", () => {
        resolve(false);
      });
      
      proc.unref();
    });
  } catch {
    return false;
  }
}

export function createAutoUpdateCheckerHook(
  options: AutoUpdateCheckerOptions = {}
): Hook {
  const {
    showStartupToast = true,
    isSisyphusEnabled = false,
    autoUpdate = true,
    debug = false,
  } = options;

  const log = debug ? logger.debug.bind(logger) : () => {};

  const getToastMessage = (isUpdate: boolean, latestVersion?: string): string => {
    if (isSisyphusEnabled) {
      return isUpdate
        ? `Sisyphus on steroids is steering SuperCode.\nv${latestVersion} available. Restart to apply.`
        : `Sisyphus on steroids is steering SuperCode.`;
    }
    return isUpdate
      ? `SuperCode is now on Steroids.\nv${latestVersion} available. Restart to apply.`
      : `SuperCode is now on Steroids.`;
  };

  let hasChecked = false;

  const showToast = (
    context: HookContext,
    title: string,
    message: string,
    variant: "info" | "success" | "error" = "info",
    duration = 5000
  ) => {
    if (context.metadata?.showToast) {
      (context.metadata.showToast as (opts: unknown) => void)({
        title,
        message,
        variant,
        duration,
      });
    }
    log(`[auto-update-checker] Toast: ${title} - ${message}`);
  };

  const showSpinnerToast = async (
    context: HookContext,
    version: string,
    message: string
  ) => {
    const totalDuration = 5000;
    const frameInterval = 100;
    const totalFrames = Math.floor(totalDuration / frameInterval);

    for (let i = 0; i < totalFrames; i++) {
      const spinner = SISYPHUS_SPINNER[i % SISYPHUS_SPINNER.length];
      showToast(
        context,
        `${spinner} SuperCode ${version}`,
        message,
        "info",
        frameInterval + 50
      );
      await new Promise((resolve) => setTimeout(resolve, frameInterval));
    }
  };

  const runBackgroundUpdateCheck = async (
    context: HookContext,
    directory: string
  ): Promise<void> => {
    const pluginInfo = findPluginEntry(directory);
    if (!pluginInfo) {
      log("[auto-update-checker] Plugin not found in config");
      return;
    }

    const cachedVersion = getCachedVersion();
    const currentVersion = cachedVersion ?? pluginInfo.pinnedVersion;
    if (!currentVersion) {
      log("[auto-update-checker] No version found (cached or pinned)");
      return;
    }

    const latestVersion = await getLatestVersion();
    if (!latestVersion) {
      log("[auto-update-checker] Failed to fetch latest version");
      return;
    }

    if (currentVersion === latestVersion) {
      log("[auto-update-checker] Already on latest version");
      return;
    }

    log(`[auto-update-checker] Update available: ${currentVersion} → ${latestVersion}`);

    if (!autoUpdate) {
      showToast(
        context,
        `SuperCode ${latestVersion}`,
        getToastMessage(true, latestVersion),
        "info",
        8000
      );
      log("[auto-update-checker] Auto-update disabled, notification only");
      return;
    }

    if (pluginInfo.isPinned) {
      const updated = updatePinnedVersion(
        pluginInfo.configPath,
        pluginInfo.entry,
        latestVersion
      );
      if (!updated) {
        showToast(
          context,
          `SuperCode ${latestVersion}`,
          getToastMessage(true, latestVersion),
          "info",
          8000
        );
        log("[auto-update-checker] Failed to update pinned version in config");
        return;
      }
      log(`[auto-update-checker] Config updated: ${pluginInfo.entry} → ${PACKAGE_NAME}@${latestVersion}`);
    }

    invalidatePackage(PACKAGE_NAME);

    const installSuccess = await runBunInstall();

    if (installSuccess) {
      showToast(
        context,
        `SuperCode Updated!`,
        `v${currentVersion} → v${latestVersion}\nRestart to apply.`,
        "success",
        8000
      );
      log(`[auto-update-checker] Update installed: ${currentVersion} → ${latestVersion}`);
    } else {
      showToast(
        context,
        `SuperCode ${latestVersion}`,
        getToastMessage(true, latestVersion),
        "info",
        8000
      );
      log("[auto-update-checker] bun install failed; update not installed");
    }
  };

  return {
    name: "auto-update-checker",
    description: "Automatically checks for and installs updates",
    events: ["session.start"],
    priority: 100,

    handler: async (context: HookContext) => {
      if (context.event !== "session.start") return;
      if (hasChecked) return;

      const parentId = (context.data as { parentId?: string })?.parentId;
      if (parentId) return;

      hasChecked = true;

      const directory = context.workdir;

      setTimeout(async () => {
        const cachedVersion = getCachedVersion();
        const localDevVersion = getLocalDevVersion(directory);
        const displayVersion = localDevVersion ?? cachedVersion;

        if (localDevVersion) {
          if (showStartupToast) {
            await showSpinnerToast(
              context,
              `${displayVersion} (dev)`,
              isSisyphusEnabled
                ? "Sisyphus running in local development mode."
                : "Running in local development mode."
            );
          }
          log("[auto-update-checker] Local development mode");
          return;
        }

        if (showStartupToast && displayVersion) {
          await showSpinnerToast(
            context,
            displayVersion,
            getToastMessage(false)
          );
        }

        await runBackgroundUpdateCheck(context, directory).catch((err) => {
          logger.error("[auto-update-checker] Background update check failed:", err);
        });
      }, 0);

      return;
    },
  };
}

export type { AutoUpdateCheckerOptions, UpdateCheckResult, PluginEntryInfo } from "./types";
export { checkForUpdate, getCachedVersion, getLatestVersion } from "./checker";
export { invalidatePackage, invalidateCache } from "./cache";

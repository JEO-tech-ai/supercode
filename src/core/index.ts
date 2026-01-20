export * from "./types";
export { getHookRegistry, type IHookRegistry } from "./hooks";
export { getToolRegistry, type IToolRegistry } from "./tools";
export { getSessionManager, type ISessionManager } from "./session";
export { getPermissionManager, type IPermissionManager } from "./permission";
export { initializeHooks } from "./hooks/index";
export { initializeTools } from "./tools/index";

export async function initializeCore(): Promise<void> {
  const { initializeHooks } = require("./hooks/index");
  const { initializeTools } = require("./tools/index");
  const { getPermissionManager } = require("./permission");

  initializeHooks();
  initializeTools();
  await getPermissionManager().initialize();
}

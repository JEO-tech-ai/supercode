export * from "./types";
export { getHookRegistry, type IHookRegistry } from "./hooks";
export { getToolRegistry, type IToolRegistry } from "./tools";
export { getSessionManager, type ISessionManager } from "./session";
export { initializeHooks } from "./hooks/index";
export { initializeTools } from "./tools/index";

export function initializeCore(): void {
  const { initializeHooks } = require("./hooks/index");
  const { initializeTools } = require("./tools/index");

  initializeHooks();
  initializeTools();
}

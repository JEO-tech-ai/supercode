export { todoContinuationHook } from "./todo-continuation";
export { loggingHook } from "./logging";

import { getHookRegistry } from "../hooks";
import { todoContinuationHook } from "./todo-continuation";
import { loggingHook } from "./logging";

export function initializeHooks(): void {
  const registry = getHookRegistry();

  registry.register(todoContinuationHook);
  registry.register(loggingHook);
}

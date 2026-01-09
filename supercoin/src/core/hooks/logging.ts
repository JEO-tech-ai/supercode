import type { Hook, HookContext } from "../types";
import logger from "../../shared/logger";

export const loggingHook: Hook = {
  name: "logging",
  events: ["request.before", "request.after", "error"],
  priority: 100,

  async handler(context: HookContext) {
    switch (context.event) {
      case "request.before":
        logger.debug(`Request started in session ${context.sessionId}`);
        break;

      case "request.after":
        logger.debug(`Request completed in session ${context.sessionId}`);
        break;

      case "error":
        logger.error(`Error in session ${context.sessionId}`, context.data as Error);
        break;
    }
  },
};

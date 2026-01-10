/**
 * Logger Utility
 * Simple logging with debug support
 */

const DEBUG = process.env.SUPERCOIN_DEBUG === "1" || process.env.DEBUG === "supercoin";

export const logger = {
  debug: (message: string, data?: unknown): void => {
    if (DEBUG) {
      console.debug(`[supercoin:debug] ${message}`, data ?? "");
    }
  },

  info: (message: string): void => {
    console.log(`[supercoin] ${message}`);
  },

  warn: (message: string): void => {
    console.warn(`[supercoin:warn] ${message}`);
  },

  error: (message: string, error?: Error): void => {
    console.error(`[supercoin:error] ${message}`);
    if (error && DEBUG) {
      console.error(error.stack);
    }
  },

  success: (message: string): void => {
    console.log(`[supercoin] ${message}`);
  },
};

export const Log = logger;
export default logger;
export type Logger = typeof logger;
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

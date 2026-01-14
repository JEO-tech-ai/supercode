import { promises as fs } from "fs";
import { existsSync, mkdirSync, appendFileSync } from "fs";
import path from "path";
import os from "os";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogConfig {
  level: LogLevel;
  print: boolean;
  file: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let config: LogConfig = {
  level: "INFO",
  print: false,
  file: true,
};

let logFilePath: string | null = null;
let initialized = false;

function getLogDir(): string {
  const home = os.homedir();
  return path.join(home, ".config", "supercoin", "logs");
}

function getLogFile(): string {
  if (logFilePath) return logFilePath;
  
  const logDir = getLogDir();
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true, mode: 0o700 });
  }
  
  const date = new Date().toISOString().split("T")[0];
  logFilePath = path.join(logDir, `supercode-${date}.log`);
  return logFilePath;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

function writeToFile(formatted: string): void {
  if (!config.file) return;
  
  try {
    const logFile = getLogFile();
    appendFileSync(logFile, formatted + "\n");
  } catch {
  }
}

function printToConsole(level: LogLevel, message: string, data?: unknown): void {
  if (!config.print && level !== "ERROR") return;
  
  const prefix = `[supercode:${level.toLowerCase()}]`;
  
  switch (level) {
    case "DEBUG":
      console.debug(prefix, message, data ?? "");
      break;
    case "INFO":
      console.log(prefix, message);
      break;
    case "WARN":
      console.warn(prefix, message);
      break;
    case "ERROR":
      console.error(prefix, message);
      if (data instanceof Error && config.level === "DEBUG") {
        console.error(data.stack);
      }
      break;
  }
}

export const logger = {
  init(options: Partial<LogConfig> = {}): void {
    config = { ...config, ...options };
    initialized = true;
    
    if (config.file) {
      logger.debug("Logger initialized", { level: config.level, file: getLogFile() });
    }
  },

  file(): string {
    return getLogFile();
  },

  isInitialized(): boolean {
    return initialized;
  },

  debug(message: string, data?: unknown): void {
    if (!shouldLog("DEBUG")) return;
    
    const formatted = formatMessage("DEBUG", message, data);
    writeToFile(formatted);
    printToConsole("DEBUG", message, data);
  },

  info(message: string, data?: unknown): void {
    if (!shouldLog("INFO")) return;
    
    const formatted = formatMessage("INFO", message, data);
    writeToFile(formatted);
    printToConsole("INFO", message, data);
  },

  warn(message: string, data?: unknown): void {
    if (!shouldLog("WARN")) return;
    
    const formatted = formatMessage("WARN", message, data);
    writeToFile(formatted);
    printToConsole("WARN", message, data);
  },

  error(message: string, error?: Error | unknown): void {
    const formatted = formatMessage("ERROR", message, error instanceof Error ? error.message : error);
    writeToFile(formatted);
    
    if (error instanceof Error && error.stack) {
      writeToFile(error.stack);
    }
    
    printToConsole("ERROR", message, error);
  },

  success(message: string): void {
    logger.info(message);
  },
};

export const Log = logger;
export default logger;
export type Logger = typeof logger;

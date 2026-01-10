import type { Hono } from "hono";

export interface ServerConfig {
  port: number;
  host: string;
}

export interface ServerStatus {
  running: boolean;
  port?: number;
  host?: string;
  pid?: number;
  uptime?: number;
}

export interface CallbackResult {
  success: boolean;
  provider: string;
  code?: string;
  state?: string;
  error?: string;
}

export type ServerApp = Hono;

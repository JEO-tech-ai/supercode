import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { createRoutes } from "./routes";
import type { ServerConfig, ServerStatus } from "./types";

let serverInstance: ReturnType<typeof Bun.serve> | null = null;
let serverStartTime: number | null = null;

export function createServer(): Hono {
  const app = new Hono();

  app.use("*", cors());
  app.use("*", honoLogger());

  app.get("/", (c) => {
    return c.json({
      name: "supercoin",
      version: "0.1.0",
      status: "running",
    });
  });

  app.route("/", createRoutes());

  app.notFound((c) => {
    return c.json({ error: "Not Found" }, 404);
  });

  app.onError((err, c) => {
    console.error(`[supercoin:server] Error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  });

  return app;
}

export async function startServer(config: ServerConfig): Promise<ServerStatus> {
  if (serverInstance) {
    return getServerStatus();
  }

  const app = createServer();

  serverInstance = Bun.serve({
    port: config.port,
    hostname: config.host,
    fetch: app.fetch,
  });

  serverStartTime = Date.now();

  return {
    running: true,
    port: config.port,
    host: config.host,
    pid: process.pid,
    uptime: 0,
  };
}

export async function stopServer(): Promise<void> {
  if (serverInstance) {
    serverInstance.stop();
    serverInstance = null;
    serverStartTime = null;
  }
}

export function getServerStatus(): ServerStatus {
  if (!serverInstance) {
    return { running: false };
  }

  return {
    running: true,
    port: serverInstance.port,
    host: serverInstance.hostname,
    pid: process.pid,
    uptime: serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1000) : 0,
  };
}

export function isServerRunning(): boolean {
  return serverInstance !== null;
}

export { createRoutes } from "./routes";
export * from "./types";

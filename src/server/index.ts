import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { createRoutes } from "./routes";
import type { ServerConfig, ServerStatus } from "./types";

let serverInstance: any = null;
let serverStartTime: number | null = null;
let serverInfo: { port: number; host: string } | null = null;

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

  if (typeof Bun !== "undefined") {
    serverInstance = Bun.serve({
      port: config.port,
      hostname: config.host,
      fetch: app.fetch,
    });
    serverInfo = { port: serverInstance.port, host: serverInstance.hostname };
  } else {
    serverInstance = serve({
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
    });
    serverInfo = { port: config.port, host: config.host };
  }

  serverStartTime = Date.now();

  return {
    running: true,
    port: serverInfo.port,
    host: serverInfo.host,
    pid: process.pid,
    uptime: 0,
  };
}

export async function stopServer(): Promise<void> {
  if (serverInstance) {
    if (typeof Bun !== "undefined") {
      serverInstance.stop();
    } else {
      serverInstance.close();
    }
    serverInstance = null;
    serverStartTime = null;
    serverInfo = null;
  }
}

export function getServerStatus(): ServerStatus {
  if (!serverInstance || !serverInfo) {
    return { running: false };
  }

  return {
    running: true,
    port: serverInfo.port,
    host: serverInfo.host,
    pid: process.pid,
    uptime: serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1000) : 0,
  };
}

export function isServerRunning(): boolean {
  return serverInstance !== null;
}

export { createRoutes } from "./routes";
export * from "./types";

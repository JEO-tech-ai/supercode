import { Hono } from "hono";
import { createHealthRoutes } from "./health";
import { createAuthCallbackRoutes } from "./auth-callback";

export function createRoutes(): Hono {
  const app = new Hono();

  app.route("/health", createHealthRoutes());
  app.route("/callback", createAuthCallbackRoutes());

  return app;
}

export { createHealthRoutes } from "./health";
export { createAuthCallbackRoutes, callbackEmitter, waitForCallback } from "./auth-callback";

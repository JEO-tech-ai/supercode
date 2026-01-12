import { Hono } from "hono";
import { createHealthRoutes } from "./health";
import { createAuthCallbackRoutes } from "./auth-callback";
import { createProviderConfigRoutes } from "./provider-config";

export function createRoutes(): Hono {
  const app = new Hono();

  app.route("/health", createHealthRoutes());
  app.route("/callback", createAuthCallbackRoutes());
  app.route("/provider", createProviderConfigRoutes());

  return app;
}

export { createHealthRoutes } from "./health";
export { createAuthCallbackRoutes, callbackEmitter, waitForCallback } from "./auth-callback";
export { createProviderConfigRoutes, getProviderRuntimeConfig, setProviderRuntimeConfig } from "./provider-config";

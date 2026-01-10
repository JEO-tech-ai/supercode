import { Hono } from "hono";

export function createHealthRoutes(): Hono {
  const app = new Hono();

  app.get("/", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    });
  });

  app.get("/ready", (c) => {
    return c.json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

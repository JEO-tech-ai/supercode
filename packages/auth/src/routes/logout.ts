import { Hono } from "hono";
import { SessionManager } from "../session";
import type { AuthVariables } from "../middleware";

export function createLogoutRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.post("/logout", async (c) => {
    const sessionManager = new SessionManager(c.get("authConfig"));
    c.header("Set-Cookie", sessionManager.createLogoutCookieHeader());
    return c.json({ success: true });
  });

  app.get("/logout", async (c) => {
    const sessionManager = new SessionManager(c.get("authConfig"));
    c.header("Set-Cookie", sessionManager.createLogoutCookieHeader());
    return c.redirect("/");
  });

  return app;
}


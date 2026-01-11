import { Hono } from "hono";
import type { AuthVariables } from "../middleware";

export function createStatusRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/status", async (c) => {
    const auth = c.get("auth");

    if (!auth?.isAuthenticated) {
      return c.json({
        authenticated: false,
        user: null,
      });
    }

    return c.json({
      authenticated: true,
      user: {
        id: auth.session?.userId,
        email: auth.session?.email,
      },
    });
  });

  return app;
}

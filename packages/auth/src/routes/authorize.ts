import { Hono } from "hono";
import type { AuthVariables } from "../middleware";

export function createAuthorizeRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/authorize", async (c) => {
    const config = c.get("authConfig");
    const origin = config.baseUrl ?? new URL(c.req.url).origin;
    const redirectUri = `${origin}/auth/callback`;
    const state = crypto.randomUUID();

    c.header(
      "Set-Cookie",
      `auth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`
    );

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", config.githubClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", state);

    return c.redirect(authUrl.toString());
  });

  return app;
}


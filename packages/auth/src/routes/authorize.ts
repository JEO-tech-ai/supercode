import { Hono } from "hono";
import type { AuthVariables } from "../middleware";
import { createOAuthState } from "../pkce";

export function createAuthorizeRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/authorize", async (c) => {
    const config = c.get("authConfig");
    const origin = config.baseUrl ?? new URL(c.req.url).origin;
    const redirectUri = `${origin}/auth/callback`;

    // Generate PKCE-protected state
    const { encodedState, verifier } = createOAuthState();

    // Store verifier in HttpOnly cookie for CSRF protection
    // The verifier is checked in the callback to prevent CSRF attacks
    c.header(
      "Set-Cookie",
      `pkce_verifier=${verifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${config.secureCookie ? "; Secure" : ""}`
    );

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", config.githubClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", encodedState);

    return c.redirect(authUrl.toString());
  });

  return app;
}


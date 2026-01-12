import { Hono } from "hono";
import type { AuthVariables } from "../middleware";
import { createOAuthState } from "../pkce";

import { getGoogleAuthUrl } from "../providers/google";

export function createAuthorizeRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/authorize", async (c) => {
    const config = c.get("authConfig");
    const provider = c.req.query("provider") || "github"; // Default to github
    const origin = config.baseUrl ?? new URL(c.req.url).origin;
    const redirectUri = `${origin}/auth/callback?provider=${provider}`;

    // Generate PKCE-protected state
    const { encodedState, verifier } = createOAuthState();

    // Store verifier in HttpOnly cookie for CSRF protection
    c.header(
      "Set-Cookie",
      `pkce_verifier=${verifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${config.secureCookie ? "; Secure" : ""}`
    );

    if (provider === "google" || provider === "antigravity") {
        // Antigravity uses Google Auth
        if (!config.googleClientId) {
            return c.text("Google Client ID not configured", 500);
        }
        const url = getGoogleAuthUrl(config.googleClientId, redirectUri, encodedState);
        return c.redirect(url);
    }
    
    // Default: GitHub
    if (!config.githubClientId) {
        return c.text("GitHub Client ID not configured", 500);
    }
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", config.githubClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", encodedState);

    return c.redirect(authUrl.toString());
  });

  return app;
}


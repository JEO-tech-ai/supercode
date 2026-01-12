import { Hono } from "hono";
import { fetchGitHubUser, exchangeCodeForToken } from "../github";
import { SessionManager } from "../session";
import { getLocalDb, users, eq } from "@supercoin/database";
import type { AuthVariables } from "../middleware";
import { validateOAuthCallback } from "../pkce";

/**
 * Extract cookie value from cookie header
 */
function extractCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${name}=`));

  return cookie?.split("=")[1]?.trim() ?? null;
}

export function createCallbackRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/callback", async (c) => {
    const config = c.get("authConfig");
    const sessionManager = new SessionManager(config);
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    // Handle OAuth errors from provider
    if (error) {
      const errorMsg = errorDescription || error;
      console.error("OAuth error from provider:", errorMsg);
      return c.redirect(`/?error=${encodeURIComponent(errorMsg)}`);
    }

    // Validate required parameters
    if (!code || !state) {
      return c.redirect("/?error=missing_params");
    }

    // Extract PKCE verifier from cookie
    const cookieHeader = c.req.header("Cookie");
    const storedVerifier = extractCookie(cookieHeader, "pkce_verifier");

    if (!storedVerifier) {
      console.error("PKCE verifier cookie not found");
      return c.redirect("/?error=missing_verifier");
    }

    // Validate state with PKCE protection
    const validation = validateOAuthCallback(state, storedVerifier);

    if (!validation.valid) {
      console.error("OAuth state validation failed:", validation.error);
      return c.redirect(`/?error=${encodeURIComponent(validation.error || "invalid_state")}`);
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(
        code,
        config.githubClientId,
        config.githubClientSecret
      );

      // Fetch GitHub user info
      const githubUser = await fetchGitHubUser(accessToken);

      // Upsert user in database
      const db = getLocalDb();
      const existingUser = await db.query.users.findFirst({
        where: eq(users.githubId, String(githubUser.id)),
      });

      let userId: string;

      if (existingUser) {
        // Update existing user
        await db
          .update(users)
          .set({
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        userId = existingUser.id;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: githubUser.email,
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            githubId: String(githubUser.id),
          })
          .returning();
        userId = newUser.id;
      }

      // Create session
      const sessionToken = await sessionManager.createSession({
        id: crypto.randomUUID(),
        userId,
        email: githubUser.email,
      });

      // Set session cookie and clear PKCE verifier cookie
      c.header("Set-Cookie", sessionManager.createCookieHeader(sessionToken));

      // Clear the PKCE verifier cookie
      c.header(
        "Set-Cookie",
        `pkce_verifier=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        { append: true }
      );

      return c.redirect("/");
    } catch (err) {
      console.error("OAuth callback error:", err);
      return c.redirect("/?error=auth_failed");
    }
  });

  return app;
}

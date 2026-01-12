import { Hono } from "hono";
import { fetchGitHubUser, exchangeCodeForToken } from "../providers/github";
import { exchangeGoogleCode, fetchGoogleUser } from "../providers/google";
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
    const provider = c.req.query("provider") || "github"; // Default to github
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      const errorMsg = errorDescription || error;
      console.error("OAuth error from provider:", errorMsg);
      return c.redirect(`/?error=${encodeURIComponent(errorMsg)}`);
    }

    if (!code || !state) {
      return c.redirect("/?error=missing_params");
    }

    const cookieHeader = c.req.header("Cookie");
    const storedVerifier = extractCookie(cookieHeader, "pkce_verifier");

    if (!storedVerifier) {
      console.error("PKCE verifier cookie not found");
      return c.redirect("/?error=missing_verifier");
    }

    const validation = validateOAuthCallback(state, storedVerifier);

    if (!validation.valid) {
      console.error("OAuth state validation failed:", validation.error);
      return c.redirect(`/?error=${encodeURIComponent(validation.error || "invalid_state")}`);
    }

    try {
      let email: string;
      let name: string;
      let avatarUrl: string | undefined;
      let providerId: string;

      if (provider === "google" || provider === "antigravity") {
          // Google Flow
          const origin = config.baseUrl ?? new URL(c.req.url).origin;
          const redirectUri = `${origin}/auth/callback?provider=${provider}`;
          
          if (!config.googleClientId || !config.googleClientSecret) {
            throw new Error("Google credentials not configured");
          }

          const tokens = await exchangeGoogleCode(
              code,
              config.googleClientId,
              config.googleClientSecret,
              redirectUri,
              storedVerifier
          );
          
          const userProfile = await fetchGoogleUser(tokens.access_token);
          email = userProfile.email;
          name = userProfile.name;
          avatarUrl = userProfile.picture;
          providerId = userProfile.id;
          
          // TODO: Store tokens.refresh_token if present for Antigravity logic
      } else {
          // GitHub Flow
          if (!config.githubClientId || !config.githubClientSecret) {
            throw new Error("GitHub credentials not configured");
          }

          const accessToken = await exchangeCodeForToken(
            code,
            config.githubClientId,
            config.githubClientSecret
          );

          const githubUser = await fetchGitHubUser(accessToken);
          email = githubUser.email;
          name = githubUser.name || githubUser.login;
          avatarUrl = githubUser.avatar_url;
          providerId = String(githubUser.id);
      }

      const db = getLocalDb();
      
      let existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      // Legacy fallback for GitHub
      if (!existingUser && provider === "github") {
          existingUser = await db.query.users.findFirst({
              where: eq(users.githubId, providerId),
          });
      }

      let userId: string;

      if (existingUser) {
        await db
          .update(users)
          .set({
            name: name,
            avatarUrl: avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        userId = existingUser.id;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            email: email,
            name: name,
            avatarUrl: avatarUrl,
            githubId: provider === 'github' ? providerId : null,
          })
          .returning();
        userId = newUser.id;
      }

      const sessionToken = await sessionManager.createSession({
        id: crypto.randomUUID(),
        userId,
        email: email,
      });

      c.header("Set-Cookie", sessionManager.createCookieHeader(sessionToken));

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

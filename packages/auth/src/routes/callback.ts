import { Hono } from "hono";
import { fetchGitHubUser, exchangeCodeForToken } from "../github";
import { SessionManager } from "../session";
import { getLocalDb, users, eq } from "@supercoin/database";
import type { AuthVariables } from "../middleware";

export function createCallbackRoute() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.get("/callback", async (c) => {
    const config = c.get("authConfig");
    const sessionManager = new SessionManager(config);
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(`/?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return c.redirect("/?error=missing_params");
    }

    const cookieHeader = c.req.header("Cookie");
    const storedState = cookieHeader
      ?.split(";")
      .find((cookie) => cookie.trim().startsWith("auth_state="))
      ?.split("=")[1];

    if (state !== storedState) {
      return c.redirect("/?error=invalid_state");
    }

    try {
      const accessToken = await exchangeCodeForToken(
        code,
        config.githubClientId,
        config.githubClientSecret
      );

      const githubUser = await fetchGitHubUser(accessToken);

      const db = getLocalDb();
      const existingUser = await db.query.users.findFirst({
        where: eq(users.githubId, String(githubUser.id)),
      });

      let userId: string;

      if (existingUser) {
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

      const sessionToken = await sessionManager.createSession({
        id: crypto.randomUUID(),
        userId,
        email: githubUser.email,
      });

      c.header("Set-Cookie", sessionManager.createCookieHeader(sessionToken));

      return c.redirect("/");
    } catch (err) {
      console.error("OAuth callback error:", err);
      return c.redirect("/?error=auth_failed");
    }
  });

  return app;
}

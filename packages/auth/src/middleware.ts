import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { SessionManager } from "./session";
import type { AuthConfig, AuthContext, AuthSession } from "./types";

export type AuthVariables = {
  auth: AuthContext;
  session: AuthSession | null;
  authConfig: AuthConfig;
  sessionManager: SessionManager;
};

export type AuthConfigProvider = (c: Context) => AuthConfig;

type AuthConfigInput = AuthConfig | AuthConfigProvider;

export function createAuthMiddleware<Bindings extends object = Record<string, unknown>>(
  configInput: AuthConfigInput
) {
  const resolveConfig: AuthConfigProvider =
    typeof configInput === "function" ? configInput : () => configInput;

  return createMiddleware<{ Bindings: Bindings; Variables: AuthVariables }>(
    async (c, next) => {
      const authConfig = resolveConfig(c);
      const sessionManager = new SessionManager(authConfig);

    const cookieHeader = c.req.header("Cookie") ?? null;
    const token = sessionManager.extractTokenFromCookie(cookieHeader);

    let session: AuthSession | null = null;

    if (token) {
      session = await sessionManager.verifySession(token);
    }

    c.set("auth", {
      session,
      isAuthenticated: session !== null,
    });
    c.set("session", session);
    c.set("authConfig", authConfig);
    c.set("sessionManager", sessionManager);

    await next();
  });
}

export function requireAuth() {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const auth = c.get("auth");

    if (!auth?.isAuthenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });
}

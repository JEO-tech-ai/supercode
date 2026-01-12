import { Hono } from "hono";
import { createAuthMiddleware, requireAuth } from "./middleware";
import { createAuthorizeRoute } from "./routes/authorize";
import { createCallbackRoute } from "./routes/callback";
import { createLogoutRoute } from "./routes/logout";
import { createStatusRoute } from "./routes/status";
import type { AuthConfig } from "./types";
import type { AuthVariables } from "./middleware";

type AuthBindings = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  JWT_SECRET?: string;
  AUTH_BASE_URL?: string;
  AUTH_COOKIE_NAME?: string;
  AUTH_COOKIE_DOMAIN?: string;
  AUTH_SECURE_COOKIE?: string;
};


function resolveConfigFromEnv(env: AuthBindings): AuthConfig {
  return {
    githubClientId: env.GITHUB_CLIENT_ID ?? "",
    githubClientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    jwtSecret: env.JWT_SECRET ?? "",
    baseUrl: env.AUTH_BASE_URL,
    cookieName: env.AUTH_COOKIE_NAME,
    cookieDomain: env.AUTH_COOKIE_DOMAIN,
    secureCookie: env.AUTH_SECURE_COOKIE === "true",
  };
}

export function createAuthRouter(config?: AuthConfig) {
  const app = new Hono<{ Bindings: AuthBindings; Variables: AuthVariables }>();

  app.use("*", async (c, next) => {
    const envConfig = resolveConfigFromEnv(c.env ?? {});
    c.set("authConfig", config ?? envConfig);
    await next();
  });

  app.use("*", async (c, next) => {
    const authConfig = c.get("authConfig");
    return createAuthMiddleware<AuthBindings>(authConfig)(c, next);
  });

  app.route("/", createAuthorizeRoute());
  app.route("/", createCallbackRoute());
  app.route("/", createLogoutRoute());
  app.route("/", createStatusRoute());

  return app;
}

export { createAuthMiddleware, requireAuth } from "./middleware";
export { SessionManager } from "./session";
export type * from "./types";

// PKCE exports
export {
  generatePKCEPair,
  generateState,
  encodeState,
  decodeState,
  isStateValid,
  createOAuthState,
  validateOAuthCallback,
  type PKCEPair,
  type OAuthState,
} from "./pkce";

// Token management exports
export {
  isTokenExpired,
  getTokenTimeRemaining,
  refreshAccessToken,
  exchangeCodeForTokens,
  createTokenSet,
  serializeTokens,
  deserializeTokens,
  InvalidGrantError,
  TokenRefreshError,
  DEFAULT_REFRESH_CONFIG,
  type TokenSet,
  type TokenRefreshConfig,
  type TokenRefreshResult,
} from "./token";

// Token manager exports
export {
  TokenManager,
  createTokenManager,
  type TokenManagerConfig,
  type TokenManagerEvent,
  type TokenManagerEventListener,
} from "./token-manager";

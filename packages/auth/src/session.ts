import { SignJWT, jwtVerify } from "jose";
import type { AuthSession, AuthConfig } from "./types";

const encoder = new TextEncoder();

export class SessionManager {
  private secret: Uint8Array;
  private cookieName: string;
  private secureCookie: boolean;
  private cookieDomain?: string;

  constructor(config: AuthConfig) {
    this.secret = encoder.encode(config.jwtSecret);
    this.cookieName = config.cookieName ?? "supercoin_session";
    this.secureCookie = config.secureCookie ?? true;
    this.cookieDomain = config.cookieDomain;
  }

  async createSession(data: Omit<AuthSession, "expiresAt">): Promise<string> {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const token = await new SignJWT({ ...data, expiresAt })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.secret);

    return token;
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      const session = payload as unknown as AuthSession;

      if (session.expiresAt < Date.now()) {
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  createCookieHeader(token: string): string {
    const parts = [
      `${this.cookieName}=${token}`,
      "HttpOnly",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=604800",
    ];

    if (this.secureCookie) {
      parts.push("Secure");
    }

    if (this.cookieDomain) {
      parts.push(`Domain=${this.cookieDomain}`);
    }

    return parts.join("; ");
  }

  createLogoutCookieHeader(): string {
    return [
      `${this.cookieName}=`,
      "HttpOnly",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=0",
    ].join("; ");
  }

  extractTokenFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) =>
      c.startsWith(`${this.cookieName}=`)
    );

    if (!sessionCookie) return null;

    return sessionCookie.split("=")[1];
  }
}

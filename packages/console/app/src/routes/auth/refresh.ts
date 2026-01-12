import { APIEvent } from "@solidjs/start/server";
import { jwtVerify, SignJWT } from "jose";

interface SessionPayload {
  id: string;
  userId: string;
  email: string;
  expiresAt: number;
}

/**
 * POST /auth/refresh
 * Refresh the session token
 * Returns 401 with reauthentication_required if session is invalid
 */
export async function POST(event: APIEvent) {
  const cookieHeader = event.request.headers.get("Cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("supercoin_session="));

  const sessionToken = sessionCookie?.split("=")[1]?.trim();

  if (!sessionToken) {
    return Response.json(
      {
        error: "reauthentication_required",
        message: "No valid session found. Please log in again.",
      },
      { status: 401 }
    );
  }

  const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  const encoder = new TextEncoder();
  const secret = encoder.encode(jwtSecret);

  try {
    // Verify current session
    const { payload } = await jwtVerify(sessionToken, secret);
    const session = payload as unknown as SessionPayload;

    // Check if session has expired
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return Response.json(
        {
          error: "reauthentication_required",
          message: "Session expired. Please log in again.",
        },
        {
          status: 401,
          headers: {
            "Set-Cookie": `supercoin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
          },
        }
      );
    }

    // Create a new session token with extended expiration
    const newToken = await new SignJWT({
      id: crypto.randomUUID(),
      userId: session.userId,
      email: session.email,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Return success with new session cookie
    return new Response(
      JSON.stringify({
        success: true,
        message: "Session refreshed",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `supercoin_session=${newToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`,
        },
      }
    );
  } catch (error) {
    // Token validation failed
    console.error("Session refresh error:", error);
    return Response.json(
      {
        error: "reauthentication_required",
        message: "Invalid session. Please log in again.",
      },
      {
        status: 401,
        headers: {
          "Set-Cookie": `supercoin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        },
      }
    );
  }
}

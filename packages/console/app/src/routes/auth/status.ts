import { APIEvent } from "@solidjs/start/server";
import { jwtVerify } from "jose";

interface SessionPayload {
  id: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export async function GET(event: APIEvent) {
  // Get session cookie
  const cookieHeader = event.request.headers.get("Cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("supercoin_session="));

  const sessionToken = sessionCookie?.split("=")[1]?.trim();

  if (!sessionToken) {
    return Response.json({
      authenticated: false,
      user: null,
    });
  }

  // Validate JWT token
  const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  const encoder = new TextEncoder();
  const secret = encoder.encode(jwtSecret);

  try {
    const { payload } = await jwtVerify(sessionToken, secret);
    const session = payload as unknown as SessionPayload;

    // Check if session has expired
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return Response.json({
        authenticated: false,
        user: null,
      });
    }

    return Response.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
      },
    });
  } catch (error) {
    // Invalid or expired token
    console.error("Session validation error:", error);
    return Response.json({
      authenticated: false,
      user: null,
    });
  }
}

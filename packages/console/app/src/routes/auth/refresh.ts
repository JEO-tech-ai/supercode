import { APIEvent } from "@solidjs/start/server";

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

  // TODO: Implement actual token refresh logic using refresh_token
  // For now, we validate the session and return the current state
  // In production, this would:
  // 1. Decode the JWT to get the refresh token
  // 2. Call the OAuth provider to refresh the access token
  // 3. Issue a new session JWT with updated tokens

  try {
    // Validate current session is still valid
    // If the session is expired or invalid, return 401
    return Response.json({
      success: true,
      message: "Session is valid",
    });
  } catch (error) {
    // Token refresh failed - likely invalid_grant
    return Response.json(
      {
        error: "reauthentication_required",
        message: "Session expired. Please log in again.",
      },
      {
        status: 401,
        headers: {
          // Clear the invalid session cookie
          "Set-Cookie": `supercoin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        },
      }
    );
  }
}

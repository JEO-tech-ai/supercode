import { APIEvent } from "@solidjs/start/server";

export function GET(event: APIEvent) {
  // Get session cookie
  const cookieHeader = event.request.headers.get("Cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("supercoin_session="));

  const sessionToken = sessionCookie?.split("=")[1]?.trim();

  // For now, return unauthenticated if no session cookie
  // In production, we would validate the JWT token here
  if (!sessionToken) {
    return Response.json({
      authenticated: false,
      user: null,
    });
  }

  // TODO: Validate JWT token and get user info
  // For demo purposes, return a mock authenticated user
  return Response.json({
    authenticated: true,
    user: {
      id: "demo-user",
      email: "demo@supercoin.ai",
    },
  });
}

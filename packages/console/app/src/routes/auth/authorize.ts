import { APIEvent } from "@solidjs/start/server";
import { createOAuthState } from "@supercoin/auth";

export function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const origin = url.origin;
  const redirectUri = `${origin}/auth/callback`;

  // Get GitHub client ID from environment
  const clientId = process.env.GITHUB_CLIENT_ID || "";

  if (!clientId) {
    return Response.json(
      { error: "GitHub OAuth not configured" },
      { status: 500 }
    );
  }

  // Generate PKCE-protected state
  const { encodedState, verifier } = createOAuthState();

  // Build GitHub OAuth URL
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "read:user user:email");
  authUrl.searchParams.set("state", encodedState);

  // Set PKCE verifier cookie and redirect
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": `pkce_verifier=${verifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}

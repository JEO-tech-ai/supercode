import { APIEvent } from "@solidjs/start/server";
import { validateOAuthCallback } from "@supercoin/auth";
import { SignJWT } from "jose";

/**
 * GitHub user response type
 */
interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Extract cookie value from cookie header
 */
function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${name}=`));

  return cookie?.split("=")[1]?.trim() ?? null;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error("No access token received");
  }

  return data.access_token;
}

/**
 * Fetch GitHub user info
 */
async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const user = (await response.json()) as GitHubUser;

  // Fetch primary email if not available
  if (!user.email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as GitHubEmail[];
      const primary = emails.find((e) => e.primary && e.verified);
      if (primary) {
        user.email = primary.email;
      }
    }
  }

  return user;
}

/**
 * Create JWT session token
 */
async function createSessionToken(
  userId: string,
  email: string,
  jwtSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const secret = encoder.encode(jwtSecret);

  const token = await new SignJWT({
    id: crypto.randomUUID(),
    userId,
    email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

/**
 * GET /auth/callback
 * Handle OAuth callback from GitHub
 */
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle OAuth errors from provider
  if (error) {
    const errorMsg = errorDescription || error;
    console.error("OAuth error from provider:", errorMsg);
    return Response.redirect(`${url.origin}/auth/login?error=${encodeURIComponent(errorMsg)}`);
  }

  // Validate required parameters
  if (!code || !state) {
    return Response.redirect(`${url.origin}/auth/login?error=missing_params`);
  }

  // Extract PKCE verifier from cookie
  const cookieHeader = event.request.headers.get("Cookie");
  const storedVerifier = extractCookie(cookieHeader, "pkce_verifier");

  if (!storedVerifier) {
    console.error("PKCE verifier cookie not found");
    return Response.redirect(`${url.origin}/auth/login?error=missing_verifier`);
  }

  // Validate state with PKCE protection
  const validation = validateOAuthCallback(state, storedVerifier);

  if (!validation.valid) {
    console.error("OAuth state validation failed:", validation.error);
    return Response.redirect(
      `${url.origin}/auth/login?error=${encodeURIComponent(validation.error || "invalid_state")}`
    );
  }

  // Get credentials from environment
  const clientId = process.env.GITHUB_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
  const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-in-production";

  if (!clientId || !clientSecret) {
    console.error("GitHub OAuth credentials not configured");
    return Response.redirect(`${url.origin}/auth/login?error=oauth_not_configured`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);

    // Fetch GitHub user info
    const githubUser = await fetchGitHubUser(accessToken);

    // Create session token
    const sessionToken = await createSessionToken(
      String(githubUser.id),
      githubUser.email || `${githubUser.login}@github.local`,
      jwtSecret
    );

    // Create session cookie (7 days)
    const cookieOptions = [
      `supercoin_session=${sessionToken}`,
      "HttpOnly",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=604800", // 7 days
    ];

    // Clear PKCE verifier cookie
    const clearVerifierCookie = "pkce_verifier=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";

    // Redirect to dashboard with session cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.origin,
        "Set-Cookie": cookieOptions.join("; "),
      },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "auth_failed";
    return Response.redirect(
      `${url.origin}/auth/login?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

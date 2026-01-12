/**
 * PKCE (Proof Key for Code Exchange) implementation
 * RFC 7636 compliant CSRF protection for OAuth 2.0
 */

import { createHash, randomBytes } from "crypto";

/**
 * PKCE code pair for OAuth flow
 */
export interface PKCEPair {
  /** Random string used to verify the code exchange */
  verifier: string;
  /** SHA256 hash of verifier, sent during authorization */
  challenge: string;
  /** Always "S256" for SHA256 */
  method: "S256";
}

/**
 * OAuth state containing PKCE verifier and optional metadata
 */
export interface OAuthState {
  /** PKCE verifier for CSRF protection */
  verifier: string;
  /** Optional project ID for context */
  projectId?: string;
  /** Timestamp when state was created */
  timestamp: number;
}

/**
 * Generate a cryptographically secure PKCE pair
 * @returns PKCE pair with verifier and challenge
 */
export function generatePKCEPair(): PKCEPair {
  // Generate 32 random bytes, encode as URL-safe base64
  // Results in 43-character string (RFC 7636 requires 43-128 chars)
  const verifier = randomBytes(32).toString("base64url");

  // Generate challenge as SHA256 hash of verifier
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return {
    verifier,
    challenge,
    method: "S256",
  };
}

/**
 * Generate a simple random state for non-PKCE OAuth flows
 * @returns Random state string
 */
export function generateState(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Encode OAuth state to URL-safe base64 string
 * @param state OAuth state object
 * @returns Base64URL encoded state
 */
export function encodeState(state: OAuthState): string {
  const json = JSON.stringify(state);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Decode OAuth state from URL-safe base64 string
 * @param encoded Base64URL encoded state
 * @returns Decoded state or null if invalid
 */
export function decodeState(encoded: string): OAuthState | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json);

    // Validate required fields
    if (
      typeof parsed.verifier !== "string" ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }

    return parsed as OAuthState;
  } catch {
    return null;
  }
}

/**
 * Verify that the state timestamp is within acceptable bounds
 * @param state OAuth state to verify
 * @param maxAgeMs Maximum age in milliseconds (default: 10 minutes)
 * @returns true if state is valid and not expired
 */
export function isStateValid(state: OAuthState, maxAgeMs: number = 10 * 60 * 1000): boolean {
  const age = Date.now() - state.timestamp;
  return age >= 0 && age <= maxAgeMs;
}

/**
 * Create a complete OAuth state with PKCE protection
 * @param projectId Optional project ID to include
 * @returns Object containing encoded state and verifier for storage
 */
export function createOAuthState(projectId?: string): {
  encodedState: string;
  verifier: string;
} {
  const pkce = generatePKCEPair();

  const state: OAuthState = {
    verifier: pkce.verifier,
    projectId,
    timestamp: Date.now(),
  };

  return {
    encodedState: encodeState(state),
    verifier: pkce.verifier,
  };
}

/**
 * Validate OAuth callback state against stored verifier
 * @param encodedState State received from OAuth callback
 * @param storedVerifier Verifier stored during authorization
 * @returns true if state is valid and verifier matches
 */
export function validateOAuthCallback(
  encodedState: string,
  storedVerifier: string
): { valid: boolean; state: OAuthState | null; error?: string } {
  const state = decodeState(encodedState);

  if (!state) {
    return { valid: false, state: null, error: "Invalid state encoding" };
  }

  if (!isStateValid(state)) {
    return { valid: false, state, error: "State expired" };
  }

  if (state.verifier !== storedVerifier) {
    return { valid: false, state, error: "Verifier mismatch - possible CSRF attack" };
  }

  return { valid: true, state };
}

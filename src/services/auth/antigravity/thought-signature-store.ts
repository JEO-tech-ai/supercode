/**
 * Thought Signature Store
 *
 * Stores and retrieves thought signatures for multi-turn conversations.
 * Gemini 3 Pro requires thought_signature on function call content blocks
 * in subsequent requests to maintain reasoning continuity.
 */

/**
 * In-memory store for thought signatures indexed by session ID
 */
const signatureStore = new Map<string, string>();

/**
 * In-memory store for session IDs per fetch instance
 */
const sessionIdStore = new Map<string, string>();

/**
 * Store a thought signature for a session
 */
export function setThoughtSignature(sessionKey: string, signature: string): void {
  if (sessionKey && signature) {
    signatureStore.set(sessionKey, signature);
  }
}

/**
 * Retrieve the stored thought signature for a session
 */
export function getThoughtSignature(sessionKey: string): string | undefined {
  return signatureStore.get(sessionKey);
}

/**
 * Clear the thought signature for a session
 */
export function clearThoughtSignature(sessionKey: string): void {
  signatureStore.delete(sessionKey);
}

/**
 * Store or retrieve a persistent session ID for a fetch instance
 */
export function getOrCreateSessionId(fetchInstanceId: string, sessionId?: string): string {
  if (sessionId) {
    sessionIdStore.set(fetchInstanceId, sessionId);
    return sessionId;
  }

  const existing = sessionIdStore.get(fetchInstanceId);
  if (existing) {
    return existing;
  }

  const n = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const newSessionId = `-${n}`;
  sessionIdStore.set(fetchInstanceId, newSessionId);
  return newSessionId;
}

/**
 * Clear the session ID for a fetch instance
 */
export function clearSessionId(fetchInstanceId: string): void {
  sessionIdStore.delete(fetchInstanceId);
}

/**
 * Clear all stored data for a fetch instance
 */
export function clearFetchInstanceData(fetchInstanceId: string): void {
  signatureStore.delete(fetchInstanceId);
  sessionIdStore.delete(fetchInstanceId);
}

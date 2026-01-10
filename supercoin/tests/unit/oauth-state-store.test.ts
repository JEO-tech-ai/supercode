import { expect, test, describe, beforeEach } from "bun:test";
import { getOAuthStateStore } from "../../src/server/store/oauth-state-store";
import type { OAuthState } from "../../src/services/auth/types";

describe("OAuth State Store", () => {
  const stateStore = getOAuthStateStore();

  beforeEach(async () => {
    await stateStore.deleteByProvider("gemini");
  });

  describe("PKCE Generation", () => {
    test("should generate valid PKCE pair", () => {
      const { verifier, challenge } = stateStore.generatePKCEPair();

      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(challenge.length).toBeGreaterThan(0);
      expect(verifier).not.toBe(challenge);
    });

    test("should generate unique verifiers", () => {
      const pair1 = stateStore.generatePKCEPair();
      const pair2 = stateStore.generatePKCEPair();

      expect(pair1.verifier).not.toBe(pair2.verifier);
      expect(pair1.challenge).not.toBe(pair2.challenge);
    });
  });

  describe("State Generation", () => {
    test("should generate random state", () => {
      const state1 = stateStore.generateState();
      const state2 = stateStore.generateState();

      expect(state1.length).toBe(64);
      expect(state2.length).toBe(64);
      expect(state1).not.toBe(state2);
    });
  });

  describe("State Storage", () => {
    test("should store and retrieve OAuth state", async () => {
      const oauthState: OAuthState = {
        provider: "gemini",
        state: stateStore.generateState(),
        codeVerifier: "test-verifier-123",
        createdAt: Date.now(),
        accountId: "test-account",
      };

      await stateStore.store(oauthState);
      const retrieved = await stateStore.retrieve(oauthState.state);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.provider).toBe("gemini");
      expect(retrieved?.codeVerifier).toBe("test-verifier-123");
      expect(retrieved?.accountId).toBe("test-account");
    });

    test("should return null for non-existent state", async () => {
      const retrieved = await stateStore.retrieve("non-existent-state");
      expect(retrieved).toBeNull();
    });

    test("should delete state", async () => {
      const oauthState: OAuthState = {
        provider: "gemini",
        state: stateStore.generateState(),
        codeVerifier: "test-verifier",
        createdAt: Date.now(),
      };

      await stateStore.store(oauthState);
      await stateStore.delete(oauthState.state);

      const retrieved = await stateStore.retrieve(oauthState.state);
      expect(retrieved).toBeNull();
    });

    test("should delete all states for a provider", async () => {
      const state1: OAuthState = {
        provider: "gemini",
        state: stateStore.generateState(),
        codeVerifier: "verifier-1",
        createdAt: Date.now(),
      };

      const state2: OAuthState = {
        provider: "gemini",
        state: stateStore.generateState(),
        codeVerifier: "verifier-2",
        createdAt: Date.now(),
      };

      await stateStore.store(state1);
      await stateStore.store(state2);
      await stateStore.deleteByProvider("gemini");

      const retrieved1 = await stateStore.retrieve(state1.state);
      const retrieved2 = await stateStore.retrieve(state2.state);

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });
  });
});

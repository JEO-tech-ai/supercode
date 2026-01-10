import { expect, test, describe, beforeEach } from "bun:test";
import { getTokenStore } from "../../src/server/store/token-store";
import type { TokenData } from "../../src/services/auth/types";

describe("Multi-Account Token Storage", () => {
  const tokenStore = getTokenStore();

  beforeEach(async () => {
    await tokenStore.delete("gemini", "*");
  });

  describe("Single Account Storage", () => {
    test("should store and retrieve token with accountId", async () => {
      const tokenData: TokenData = {
        accessToken: "test-token-123",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-1",
      };

      await tokenStore.store("gemini", tokenData);
      const retrieved = await tokenStore.retrieve("gemini", "account-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe("test-token-123");
      expect(retrieved?.accountId).toBe("account-1");
    });

    test("should store token with default accountId", async () => {
      const tokenData: TokenData = {
        accessToken: "api-key-456",
        provider: "gemini",
        type: "api_key",
        expiresAt: Number.MAX_SAFE_INTEGER,
        accountId: "default",
      };

      await tokenStore.store("gemini", tokenData);
      const retrieved = await tokenStore.retrieve("gemini", "default");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe("api-key-456");
    });
  });

  describe("Multiple Account Storage", () => {
    test("should store multiple accounts for same provider", async () => {
      const account1: TokenData = {
        accessToken: "token-account-1",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-1",
      };

      const account2: TokenData = {
        accessToken: "token-account-2",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-2",
      };

      await tokenStore.store("gemini", account1);
      await tokenStore.store("gemini", account2);

      const allTokens = await tokenStore.retrieveAll("gemini");
      expect(allTokens.length).toBe(2);

      const accountIds = allTokens.map((t) => t.accountId);
      expect(accountIds).toContain("account-1");
      expect(accountIds).toContain("account-2");
    });

    test("should retrieve specific account by accountId", async () => {
      const account1: TokenData = {
        accessToken: "token-1",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-1",
      };

      const account2: TokenData = {
        accessToken: "token-2",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-2",
      };

      await tokenStore.store("gemini", account1);
      await tokenStore.store("gemini", account2);

      const retrieved1 = await tokenStore.retrieve("gemini", "account-1");
      const retrieved2 = await tokenStore.retrieve("gemini", "account-2");

      expect(retrieved1?.accessToken).toBe("token-1");
      expect(retrieved2?.accessToken).toBe("token-2");
    });

    test("should delete specific account", async () => {
      const account1: TokenData = {
        accessToken: "token-1",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-1",
      };

      const account2: TokenData = {
        accessToken: "token-2",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-2",
      };

      await tokenStore.store("gemini", account1);
      await tokenStore.store("gemini", account2);

      await tokenStore.delete("gemini", "account-1");

      const retrieved1 = await tokenStore.retrieve("gemini", "account-1");
      const retrieved2 = await tokenStore.retrieve("gemini", "account-2");

      expect(retrieved1).toBeNull();
      expect(retrieved2).not.toBeNull();
    });

    test("should delete all accounts with wildcard", async () => {
      const account1: TokenData = {
        accessToken: "token-1",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-1",
      };

      const account2: TokenData = {
        accessToken: "token-2",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "account-2",
      };

      await tokenStore.store("gemini", account1);
      await tokenStore.store("gemini", account2);

      await tokenStore.delete("gemini", "*");

      const allTokens = await tokenStore.retrieveAll("gemini");
      expect(allTokens.length).toBe(0);
    });
  });

  describe("Token Validation", () => {
    test("should validate API key tokens", async () => {
      const tokenData: TokenData = {
        accessToken: "api-key",
        provider: "gemini",
        type: "api_key",
        expiresAt: Number.MAX_SAFE_INTEGER,
        accountId: "default",
      };

      await tokenStore.store("gemini", tokenData);
      const isValid = await tokenStore.isValid("gemini", "default");

      expect(isValid).toBe(true);
    });

    test("should validate non-expired OAuth tokens", async () => {
      const tokenData: TokenData = {
        accessToken: "oauth-token",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 3600000,
        accountId: "test-account",
      };

      await tokenStore.store("gemini", tokenData);
      const isValid = await tokenStore.isValid("gemini", "test-account");

      expect(isValid).toBe(true);
    });

    test("should detect expired OAuth tokens", async () => {
      const tokenData: TokenData = {
        accessToken: "expired-token",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() - 3600000,
        accountId: "expired-account",
      };

      await tokenStore.store("gemini", tokenData);
      const isValid = await tokenStore.isValid("gemini", "expired-account");

      expect(isValid).toBe(false);
    });

    test("should detect tokens needing refresh", async () => {
      const tokenData: TokenData = {
        accessToken: "soon-to-expire",
        provider: "gemini",
        type: "oauth",
        expiresAt: Date.now() + 10 * 60 * 1000,
        accountId: "refresh-account",
        refreshToken: "refresh-token-123",
      };

      await tokenStore.store("gemini", tokenData);
      const needsRefresh = await tokenStore.needsRefresh("gemini", "refresh-account");

      expect(needsRefresh).toBe(true);
    });
  });
});

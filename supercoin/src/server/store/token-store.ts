/**
 * Token Store
 * Secure storage for API keys and OAuth tokens
 */
import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import * as crypto from "crypto";
import path from "path";
import type { TokenData, AuthProviderName } from "../../services/auth/types";
import logger from "../../shared/logger";

interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export class TokenStore {
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private encryptionKey: Buffer | null = null;

  private readonly configDir: string;
  private readonly keyFile: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path.join(home, ".config", "supercoin");
    this.keyFile = path.join(this.configDir, ".key");

    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Get or create encryption key
   */
  private async getEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Try to read existing key
    if (existsSync(this.keyFile)) {
      try {
        const keyHex = await fs.readFile(this.keyFile, "utf-8");
        this.encryptionKey = Buffer.from(keyHex.trim(), "hex");
        return this.encryptionKey;
      } catch {
        // Key file corrupted, generate new
      }
    }

    // Generate new key
    this.encryptionKey = crypto.randomBytes(this.KEY_LENGTH);
    await fs.writeFile(this.keyFile, this.encryptionKey.toString("hex"), {
      mode: 0o600,
    });

    return this.encryptionKey;
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<EncryptedData> {
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
    };
  }

  /**
   * Decrypt data
   */
  private async decrypt(encrypted: EncryptedData): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = Buffer.from(encrypted.iv, "base64");
    const authTag = Buffer.from(encrypted.authTag, "base64");
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Get token file path
   */
  private getTokenFilePath(provider: AuthProviderName): string {
    return path.join(this.configDir, `${provider}.token`);
  }

  /**
   * Store token
   */
  async store(provider: AuthProviderName, tokens: TokenData): Promise<void> {
    const filePath = this.getTokenFilePath(provider);
    const encrypted = await this.encrypt(JSON.stringify(tokens));

    await fs.writeFile(filePath, JSON.stringify(encrypted), {
      mode: 0o600,
    });

    logger.debug(`Token stored for ${provider}`);
  }

  /**
   * Retrieve token
   */
  async retrieve(provider: AuthProviderName): Promise<TokenData | null> {
    const filePath = this.getTokenFilePath(provider);

    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await fs.readFile(filePath, "utf-8");
      const encrypted: EncryptedData = JSON.parse(content);
      const decrypted = await this.decrypt(encrypted);

      return JSON.parse(decrypted) as TokenData;
    } catch (error) {
      logger.error(`Failed to retrieve token for ${provider}`, error as Error);
      return null;
    }
  }

  /**
   * Delete token
   */
  async delete(provider: AuthProviderName): Promise<void> {
    const filePath = this.getTokenFilePath(provider);

    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        logger.debug(`Token deleted for ${provider}`);
      }
    } catch (error) {
      logger.error(`Failed to delete token for ${provider}`, error as Error);
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  async isValid(provider: AuthProviderName): Promise<boolean> {
    const tokens = await this.retrieve(provider);
    if (!tokens) return false;

    // API keys don't expire
    if (tokens.type === "api_key") return true;

    // Check OAuth token expiry (with 5 minute buffer)
    const bufferMs = 5 * 60 * 1000;
    return tokens.expiresAt > Date.now() + bufferMs;
  }

  /**
   * Check if token needs refresh
   */
  async needsRefresh(provider: AuthProviderName): Promise<boolean> {
    const tokens = await this.retrieve(provider);
    if (!tokens) return false;

    // API keys don't need refresh
    if (tokens.type === "api_key") return false;

    // Check if within refresh window (15 minutes before expiry)
    const refreshWindowMs = 15 * 60 * 1000;
    return tokens.expiresAt < Date.now() + refreshWindowMs;
  }
}

// Singleton instance
let tokenStoreInstance: TokenStore | null = null;

export function getTokenStore(): TokenStore {
  if (!tokenStoreInstance) {
    tokenStoreInstance = new TokenStore();
  }
  return tokenStoreInstance;
}

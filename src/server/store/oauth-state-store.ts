import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import * as crypto from "crypto";
import path from "path";
import type { OAuthState, AuthProviderName } from "../../services/auth/types";
import logger from "../../shared/logger";

const STATE_EXPIRY_MS = 10 * 60 * 1000;

interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * OAuth State Store with AES-256-GCM Encryption
 * Security improvement: States are now encrypted at rest
 */
export class OAuthStateStore {
  private states: Map<string, OAuthState> = new Map();
  private readonly configDir: string;
  private readonly stateFile: string;
  private readonly keyFile: string;
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private encryptionKey: Buffer | null = null;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path.join(home, ".config", "supercoin");
    this.stateFile = path.join(this.configDir, ".oauth-states.enc");
    this.keyFile = path.join(this.configDir, ".key");

    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }

    this.loadStates();
    this.startCleanupTimer();
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

  private async loadStates(): Promise<void> {
    try {
      if (existsSync(this.stateFile)) {
        const content = await fs.readFile(this.stateFile, "utf-8");
        const encrypted: EncryptedData = JSON.parse(content);
        const decrypted = await this.decrypt(encrypted);
        const data = JSON.parse(decrypted);
        this.states = new Map(Object.entries(data));
        this.cleanupExpired();
      }
    } catch (error) {
      logger.error("Failed to load OAuth states", error as Error);
      this.states.clear();
    }
  }

  private async saveStates(): Promise<void> {
    try {
      const data = Object.fromEntries(this.states);
      const encrypted = await this.encrypt(JSON.stringify(data));
      await fs.writeFile(this.stateFile, JSON.stringify(encrypted), { mode: 0o600 });
    } catch (error) {
      logger.error("Failed to save OAuth states", error as Error);
    }
  }

  async store(state: OAuthState): Promise<void> {
    this.states.set(state.state, state);
    await this.saveStates();
  }

  async retrieve(stateValue: string): Promise<OAuthState | null> {
    const state = this.states.get(stateValue);
    if (!state) return null;

    if (Date.now() - state.createdAt > STATE_EXPIRY_MS) {
      this.states.delete(stateValue);
      await this.saveStates();
      return null;
    }

    return state;
  }

  async delete(stateValue: string): Promise<void> {
    this.states.delete(stateValue);
    await this.saveStates();
  }

  async deleteByProvider(provider: AuthProviderName): Promise<void> {
    for (const [key, value] of this.states.entries()) {
      if (value.provider === provider) {
        this.states.delete(key);
      }
    }
    await this.saveStates();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.states.entries()) {
      if (now - value.createdAt > STATE_EXPIRY_MS) {
        this.states.delete(key);
      }
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpired();
      this.saveStates();
    }, 60000);
  }

  generatePKCEPair(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(64).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }

  generateState(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

let oauthStateStoreInstance: OAuthStateStore | null = null;

export function getOAuthStateStore(): OAuthStateStore {
  if (!oauthStateStoreInstance) {
    oauthStateStoreInstance = new OAuthStateStore();
  }
  return oauthStateStoreInstance;
}

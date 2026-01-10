import { promises as fs } from "fs";
import { existsSync } from "fs";
import * as crypto from "crypto";
import path from "path";
import type { OAuthState, AuthProviderName } from "../../services/auth/types";
import logger from "../../shared/logger";

const STATE_EXPIRY_MS = 10 * 60 * 1000;

export class OAuthStateStore {
  private states: Map<string, OAuthState> = new Map();
  private readonly configDir: string;
  private readonly stateFile: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path.join(home, ".config", "supercoin");
    this.stateFile = path.join(this.configDir, ".oauth-states");
    this.loadStates();
    this.startCleanupTimer();
  }

  private async loadStates(): Promise<void> {
    try {
      if (existsSync(this.stateFile)) {
        const content = await fs.readFile(this.stateFile, "utf-8");
        const data = JSON.parse(content);
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
      await fs.writeFile(this.stateFile, JSON.stringify(data), { mode: 0o600 });
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

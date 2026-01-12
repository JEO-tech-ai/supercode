export interface AntigravityAccount {
  email: string;
  refreshToken: string;
  accessToken: string;
  projectId?: string;
  expiresAt: number;
}

export interface AntigravityConfig {
  accounts: AntigravityAccount[];
  strategy: "sticky" | "round-robin";
  activeIndex: number;
}

export function selectActiveAccount(config: AntigravityConfig): AntigravityAccount {
  if (config.accounts.length === 0) {
    throw new Error("No Antigravity accounts configured");
  }
  
  // Strategy: round-robin or sticky
  if (config.strategy === "round-robin") {
      const index = (config.activeIndex + 1) % config.accounts.length;
      return config.accounts[index];
  }
  
  // Default: sticky
  return config.accounts[config.activeIndex] || config.accounts[0];
}

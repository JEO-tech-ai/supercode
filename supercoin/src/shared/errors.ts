/**
 * Custom Error Classes
 */

export class SuperCoinError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "SuperCoinError";
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends SuperCoinError {
  constructor(message: string, provider?: string) {
    super(message, "AUTH_ERROR", { provider });
    this.name = "AuthError";
  }
}

export class ModelError extends SuperCoinError {
  constructor(message: string, model?: string) {
    super(message, "MODEL_ERROR", { model });
    this.name = "ModelError";
  }
}

export class ConfigError extends SuperCoinError {
  constructor(message: string, path?: string) {
    super(message, "CONFIG_ERROR", { path });
    this.name = "ConfigError";
  }
}

export class NetworkError extends SuperCoinError {
  constructor(message: string, url?: string) {
    super(message, "NETWORK_ERROR", { url });
    this.name = "NetworkError";
  }
}

export class AgentError extends SuperCoinError {
  constructor(message: string, agent?: string) {
    super(message, "AGENT_ERROR", { agent });
    this.name = "AgentError";
  }
}

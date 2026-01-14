import { AuthError, ModelError, ConfigError, NetworkError, AgentError, SuperCoinError } from "../shared/errors";
import { CancelledError } from "../shared/ui";

export function formatError(input: unknown): string | undefined {
  if (input instanceof AuthError) {
    const provider = input.details && typeof input.details === "object" && "provider" in input.details
      ? (input.details as { provider?: string }).provider
      : undefined;
    return provider
      ? `Authentication failed for "${provider}": ${input.message}`
      : `Authentication failed: ${input.message}`;
  }

  if (input instanceof ModelError) {
    const model = input.details && typeof input.details === "object" && "model" in input.details
      ? (input.details as { model?: string }).model
      : undefined;
    return [
      `Model error${model ? ` (${model})` : ""}: ${input.message}`,
      "Try: `supercode models list` to see available models",
    ].join("\n");
  }

  if (input instanceof ConfigError) {
    const path = input.details && typeof input.details === "object" && "path" in input.details
      ? (input.details as { path?: string }).path
      : undefined;
    return path
      ? `Configuration error at ${path}: ${input.message}`
      : `Configuration error: ${input.message}`;
  }

  if (input instanceof NetworkError) {
    const url = input.details && typeof input.details === "object" && "url" in input.details
      ? (input.details as { url?: string }).url
      : undefined;
    return [
      `Network error${url ? ` connecting to ${url}` : ""}: ${input.message}`,
      "Check your internet connection and try again.",
    ].join("\n");
  }

  if (input instanceof AgentError) {
    const agent = input.details && typeof input.details === "object" && "agent" in input.details
      ? (input.details as { agent?: string }).agent
      : undefined;
    return agent
      ? `Agent "${agent}" error: ${input.message}`
      : `Agent error: ${input.message}`;
  }

  if (input instanceof SuperCoinError) {
    return `Error [${input.code}]: ${input.message}`;
  }

  if (input instanceof CancelledError) {
    return "";
  }

  return undefined;
}

export function formatUnknownError(input: unknown): string {
  if (input instanceof Error) {
    return input.stack ?? `${input.name}: ${input.message}`;
  }

  if (typeof input === "object" && input !== null) {
    try {
      return JSON.stringify(input, null, 2);
    } catch {
      return "Unexpected error (unserializable)";
    }
  }

  return String(input);
}

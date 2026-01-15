import type { ClaudeCodeSessionState } from "./types";

const state: ClaudeCodeSessionState = {
  mainSessionId: undefined,
  subagentSessions: new Set(),
  lastActiveSessionId: undefined,
};

export function setMainSessionId(sessionId: string): void {
  state.mainSessionId = sessionId;
  state.lastActiveSessionId = sessionId;
}

export function getMainSessionId(): string | undefined {
  return state.mainSessionId;
}

export function clearMainSessionId(): void {
  state.mainSessionId = undefined;
}

export function addSubagentSession(sessionId: string): void {
  state.subagentSessions.add(sessionId);
  state.lastActiveSessionId = sessionId;
}

export function removeSubagentSession(sessionId: string): void {
  state.subagentSessions.delete(sessionId);
}

export function isSubagentSession(sessionId: string): boolean {
  return state.subagentSessions.has(sessionId);
}

export function getSubagentSessions(): string[] {
  return Array.from(state.subagentSessions);
}

export function getLastActiveSessionId(): string | undefined {
  return state.lastActiveSessionId;
}

export function setLastActiveSessionId(sessionId: string): void {
  state.lastActiveSessionId = sessionId;
}

export const subagentSessions = state.subagentSessions;

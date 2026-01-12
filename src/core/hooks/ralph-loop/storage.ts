/**
 * Ralph Loop Storage
 * Filesystem-based persistent state management with frontmatter format.
 * Enhanced from Oh-My-OpenCode patterns for SuperCode integration.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { RalphLoopState } from "./types";
import {
  DEFAULT_STATE_FILE,
  DEFAULT_COMPLETION_PROMISE,
  DEFAULT_MAX_ITERATIONS,
} from "./constants";

/**
 * Get the full path to the state file
 */
export function getStateFilePath(
  directory: string,
  customPath?: string
): string {
  return customPath
    ? join(directory, customPath)
    : join(directory, DEFAULT_STATE_FILE);
}

/**
 * Parse frontmatter from state file content
 */
function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const data: Record<string, unknown> = {};
    const lines = yamlContent.split("\n");

    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value: string | boolean | number = line.slice(colonIndex + 1).trim();

      // Parse boolean
      if (value === "true") value = true;
      else if (value === "false") value = false;
      // Parse number
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      // Remove quotes from string
      else if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      data[key] = value;
    }

    return { data, body };
  } catch {
    return { data: {}, body: content };
  }
}

/**
 * Strip quotes from a value
 */
function stripQuotes(val: unknown): string {
  const str = String(val ?? "");
  return str.replace(/^["']|["']$/g, "");
}

/**
 * Read Ralph Loop state from file
 */
export function readState(
  directory: string,
  customPath?: string
): RalphLoopState | null {
  const filePath = getStateFilePath(directory, customPath);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, body } = parseFrontmatter(content);

    const active = data.active;
    const iteration = data.iteration;

    if (active === undefined || iteration === undefined) {
      return null;
    }

    const isActive = active === true || active === "true";
    const iterationNum =
      typeof iteration === "number" ? iteration : Number(iteration);

    if (isNaN(iterationNum)) {
      return null;
    }

    return {
      active: isActive,
      iteration: iterationNum,
      maxIterations:
        Number(data.max_iterations) ||
        Number(data.maxIterations) ||
        DEFAULT_MAX_ITERATIONS,
      completionPromise:
        stripQuotes(data.completion_promise) ||
        stripQuotes(data.completionPromise) ||
        DEFAULT_COMPLETION_PROMISE,
      startedAt:
        stripQuotes(data.started_at) ||
        stripQuotes(data.startedAt) ||
        new Date().toISOString(),
      prompt: body.trim(),
      sessionId: data.session_id
        ? stripQuotes(data.session_id)
        : data.sessionId
          ? stripQuotes(data.sessionId)
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Write Ralph Loop state to file
 */
export function writeState(
  directory: string,
  state: RalphLoopState,
  customPath?: string
): boolean {
  const filePath = getStateFilePath(directory, customPath);

  try {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const sessionIdLine = state.sessionId
      ? `session_id: "${state.sessionId}"\n`
      : "";
    const content = `---
active: ${state.active}
iteration: ${state.iteration}
max_iterations: ${state.maxIterations}
completion_promise: "${state.completionPromise}"
started_at: "${state.startedAt}"
${sessionIdLine}---
${state.prompt}
`;

    writeFileSync(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear Ralph Loop state file
 */
export function clearState(directory: string, customPath?: string): boolean {
  const filePath = getStateFilePath(directory, customPath);

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Increment iteration counter in state file
 */
export function incrementIteration(
  directory: string,
  customPath?: string
): RalphLoopState | null {
  const state = readState(directory, customPath);
  if (!state) return null;

  state.iteration += 1;
  if (writeState(directory, state, customPath)) {
    return state;
  }
  return null;
}

/**
 * Update state with new values
 */
export function updateState(
  directory: string,
  updates: Partial<RalphLoopState>,
  customPath?: string
): RalphLoopState | null {
  const state = readState(directory, customPath);
  if (!state) return null;

  const updatedState = { ...state, ...updates };
  if (writeState(directory, updatedState, customPath)) {
    return updatedState;
  }
  return null;
}

/**
 * Check if state file exists
 */
export function hasState(directory: string, customPath?: string): boolean {
  const filePath = getStateFilePath(directory, customPath);
  return existsSync(filePath);
}

/**
 * Get state file modification time
 */
export function getStateModTime(
  directory: string,
  customPath?: string
): number | null {
  const filePath = getStateFilePath(directory, customPath);
  try {
    if (!existsSync(filePath)) return null;
    const { statSync } = require("node:fs");
    const stats = statSync(filePath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

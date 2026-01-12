/**
 * Event Processing System
 * Handles real-time events from multi-agent workflows with session tagging.
 */

import { EOL } from "os";
import { UI, Style } from "../../shared/ui";
import type {
  RunContext,
  EventPayload,
  EventState,
  SessionStatus,
  RunEvent,
} from "./types";

// ANSI color codes for session tagging
const SESSION_COLORS = {
  main: "\x1b[32m",      // green
  child: "\x1b[33m",     // yellow
  background: "\x1b[35m", // magenta
  error: "\x1b[31m",     // red
  dim: "\x1b[90m",       // gray
  reset: "\x1b[0m",
};

/**
 * Create initial event state
 */
export function createEventState(): EventState {
  return {
    mainSessionIdle: true,
    mainSessionError: false,
    lastError: null,
    lastOutput: "",
    lastPartText: "",
    currentTool: null,
    currentToolStart: null,
    sessions: new Map(),
    backgroundTasks: new Map(),
  };
}

/**
 * Format session tag for output
 */
export function formatSessionTag(
  sessionId: string,
  mainSessionId: string,
  isBackground = false
): string {
  if (isBackground) {
    return `${SESSION_COLORS.background}[BG:${sessionId.slice(0, 6)}]${SESSION_COLORS.reset}`;
  }

  if (sessionId === mainSessionId) {
    return `${SESSION_COLORS.main}[MAIN]${SESSION_COLORS.reset}`;
  }

  return `${SESSION_COLORS.child}[${sessionId.slice(0, 8)}]${SESSION_COLORS.reset}`;
}

/**
 * Format tool execution indicator
 */
export function formatToolIndicator(
  toolName: string,
  status: "start" | "end" | "error",
  duration?: number
): string {
  const icons = {
    start: "▶",
    end: "✓",
    error: "✗",
  };

  const colors = {
    start: SESSION_COLORS.dim,
    end: "\x1b[32m",
    error: "\x1b[31m",
  };

  const icon = `${colors[status]}${icons[status]}${SESSION_COLORS.reset}`;
  const durationStr = duration ? ` ${SESSION_COLORS.dim}(${duration}ms)${SESSION_COLORS.reset}` : "";

  return `${icon} ${toolName}${durationStr}`;
}

/**
 * Log event with session tagging (verbose mode)
 */
function logEventVerbose(
  ctx: RunContext,
  event: RunEvent,
  state: EventState
): void {
  const isMainSession = event.sessionId === ctx.mainSessionId;
  const tag = formatSessionTag(event.sessionId, ctx.mainSessionId);

  switch (event.type) {
    case "session.start":
      if (!isMainSession) {
        process.stderr.write(
          `${tag} ${SESSION_COLORS.dim}Agent session started${SESSION_COLORS.reset}${EOL}`
        );
      }
      break;

    case "session.end":
      if (!isMainSession) {
        process.stderr.write(
          `${tag} ${SESSION_COLORS.dim}Agent session ended${SESSION_COLORS.reset}${EOL}`
        );
      }
      break;

    case "session.error":
      const errorEvent = event as { error?: string };
      process.stderr.write(
        `${tag} ${SESSION_COLORS.error}Error: ${errorEvent.error || "Unknown error"}${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "agent.spawn":
      const spawnEvent = event as { agentName: string };
      process.stderr.write(
        `${tag} ${SESSION_COLORS.dim}Spawning agent: ${spawnEvent.agentName}${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "agent.complete":
      const completeEvent = event as { agentName: string; result?: { success: boolean } };
      const status = completeEvent.result?.success ? "completed" : "failed";
      process.stderr.write(
        `${tag} ${SESSION_COLORS.dim}Agent ${completeEvent.agentName} ${status}${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "tool.start":
      const toolStartEvent = event as { toolName: string };
      state.currentTool = toolStartEvent.toolName;
      state.currentToolStart = Date.now();
      process.stderr.write(
        `${tag} ${formatToolIndicator(toolStartEvent.toolName, "start")}${EOL}`
      );
      break;

    case "tool.end":
      const toolEndEvent = event as { toolName: string };
      const duration = state.currentToolStart
        ? Date.now() - state.currentToolStart
        : undefined;
      process.stderr.write(
        `${tag} ${formatToolIndicator(toolEndEvent.toolName, "end", duration)}${EOL}`
      );
      state.currentTool = null;
      state.currentToolStart = null;
      break;

    case "tool.error":
      const toolErrorEvent = event as { toolName: string; error?: string };
      process.stderr.write(
        `${tag} ${formatToolIndicator(toolErrorEvent.toolName, "error")} ${SESSION_COLORS.error}${toolErrorEvent.error || ""}${SESSION_COLORS.reset}${EOL}`
      );
      state.currentTool = null;
      state.currentToolStart = null;
      break;

    case "message.chunk":
      // Stream chunks to stdout
      const chunkEvent = event as { chunk?: string };
      if (chunkEvent.chunk) {
        process.stdout.write(chunkEvent.chunk);
        state.lastPartText += chunkEvent.chunk;
      }
      break;

    case "message.end":
      if (state.lastPartText) {
        process.stdout.write(EOL);
        state.lastOutput = state.lastPartText;
        state.lastPartText = "";
      }
      break;

    case "thinking.start":
      process.stderr.write(
        `${tag} ${SESSION_COLORS.dim}Thinking...${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "thinking.end":
      process.stderr.write(
        `${tag} ${SESSION_COLORS.dim}Done thinking${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "todo.update":
      const todoEvent = event as { todos: Array<{ content: string; status: string }> };
      const pendingCount = todoEvent.todos.filter(t => t.status === "pending").length;
      const inProgressCount = todoEvent.todos.filter(t => t.status === "in_progress").length;
      const completedCount = todoEvent.todos.filter(t => t.status === "completed").length;
      process.stderr.write(
        `${tag} ${SESSION_COLORS.dim}Todos: ${completedCount}/${todoEvent.todos.length} done, ${inProgressCount} in progress${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "background.start":
      const bgStartEvent = event as { taskId: string; description?: string };
      const bgTag = formatSessionTag(bgStartEvent.taskId, ctx.mainSessionId, true);
      process.stderr.write(
        `${bgTag} ${SESSION_COLORS.dim}Background task: ${bgStartEvent.description || bgStartEvent.taskId}${SESSION_COLORS.reset}${EOL}`
      );
      break;

    case "background.complete":
      const bgEndEvent = event as { taskId: string };
      const bgEndTag = formatSessionTag(bgEndEvent.taskId, ctx.mainSessionId, true);
      process.stderr.write(
        `${bgEndTag} ${SESSION_COLORS.dim}Background task completed${SESSION_COLORS.reset}${EOL}`
      );
      break;
  }
}

/**
 * Log event in compact mode (default)
 */
function logEventCompact(
  ctx: RunContext,
  event: RunEvent,
  state: EventState
): void {
  switch (event.type) {
    case "session.error":
      const errorEvent = event as { error?: string };
      state.lastError = errorEvent.error || "Unknown error";
      state.mainSessionError = event.sessionId === ctx.mainSessionId;
      break;

    case "tool.start":
      const toolStartEvent = event as { toolName: string };
      state.currentTool = toolStartEvent.toolName;
      state.currentToolStart = Date.now();
      // Show spinner or indicator
      process.stderr.write(
        `${SESSION_COLORS.dim}[${toolStartEvent.toolName}]${SESSION_COLORS.reset} `
      );
      break;

    case "tool.end":
      // Clear the tool indicator
      state.currentTool = null;
      state.currentToolStart = null;
      break;

    case "tool.error":
      const toolErrorEvent = event as { toolName: string; error?: string };
      process.stderr.write(
        `${SESSION_COLORS.error}[${toolErrorEvent.toolName} failed]${SESSION_COLORS.reset}${EOL}`
      );
      state.currentTool = null;
      state.currentToolStart = null;
      break;

    case "message.chunk":
      const chunkEvent = event as { chunk?: string };
      if (chunkEvent.chunk) {
        process.stdout.write(chunkEvent.chunk);
        state.lastPartText += chunkEvent.chunk;
      }
      break;

    case "message.end":
      if (state.lastPartText) {
        process.stdout.write(EOL);
        state.lastOutput = state.lastPartText;
        state.lastPartText = "";
      }
      break;
  }
}

/**
 * Update event state based on event
 */
export function updateEventState(state: EventState, event: RunEvent): void {
  switch (event.type) {
    case "session.start":
      const sessionEvent = event as { sessionId: string; parentId?: string };
      state.sessions.set(sessionEvent.sessionId, {
        id: sessionEvent.sessionId,
        parentId: sessionEvent.parentId,
        status: "active",
        childIds: [],
        todos: [],
        lastActivity: Date.now(),
      });

      // Update parent's child list
      if (sessionEvent.parentId) {
        const parent = state.sessions.get(sessionEvent.parentId);
        if (parent) {
          parent.childIds.push(sessionEvent.sessionId);
        }
      }
      break;

    case "session.end":
      const endEvent = event as { sessionId: string; status?: string };
      const session = state.sessions.get(endEvent.sessionId);
      if (session) {
        session.status = (endEvent.status as SessionStatus["status"]) || "completed";
        session.lastActivity = Date.now();
      }
      break;

    case "session.error":
      const errorSession = state.sessions.get(event.sessionId);
      if (errorSession) {
        errorSession.status = "error";
        errorSession.lastActivity = Date.now();
      }
      break;

    case "todo.update":
      const todoEvent = event as { sessionId: string; todos: SessionStatus["todos"] };
      const todoSession = state.sessions.get(todoEvent.sessionId);
      if (todoSession) {
        todoSession.todos = todoEvent.todos;
        todoSession.lastActivity = Date.now();
      }
      break;

    case "background.start":
      const bgStartEvent = event as { taskId: string; description?: string };
      state.backgroundTasks.set(bgStartEvent.taskId, {
        description: bgStartEvent.description || bgStartEvent.taskId,
        status: "running",
      });
      break;

    case "background.complete":
      const bgEndEvent = event as { taskId: string };
      const task = state.backgroundTasks.get(bgEndEvent.taskId);
      if (task) {
        task.status = "completed";
      }
      break;
  }
}

/**
 * Process a single event
 */
export function processEvent(
  ctx: RunContext,
  event: RunEvent,
  state: EventState
): void {
  // Update state first
  updateEventState(state, event);

  // Log based on format
  if (ctx.format === "json") {
    // JSON format outputs each event as a JSON line
    console.log(JSON.stringify({
      ...event,
      timestamp: Date.now(),
    }));
  } else if (ctx.verbose) {
    logEventVerbose(ctx, event, state);
  } else {
    logEventCompact(ctx, event, state);
  }

  // Update main session state
  if (event.sessionId === ctx.mainSessionId) {
    if (event.type === "session.end") {
      state.mainSessionIdle = true;
    } else if (event.type === "session.error") {
      state.mainSessionError = true;
    } else if (event.type === "message.start" || event.type === "tool.start") {
      state.mainSessionIdle = false;
    }
  }
}

/**
 * Process event stream (async generator)
 */
export async function* processEvents(
  ctx: RunContext,
  events: AsyncIterable<EventPayload>,
  state: EventState
): AsyncGenerator<void, void, unknown> {
  for await (const event of events) {
    processEvent(ctx, event as unknown as RunEvent, state);
    yield;
  }
}

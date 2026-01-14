import { Command } from "commander";
import { sessionManager } from "../../core/session/manager";
import { UI } from "../../shared/ui";
import type { SessionState } from "../../core/session/types";
import { EOL } from "os";

function formatDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatSessionTable(sessions: SessionState[]): string {
  const lines: string[] = [];

  const maxIdWidth = Math.max(20, ...sessions.map((s) => s.sessionId.length));
  const maxTitleWidth = Math.max(25, ...sessions.map((s) => (s.metadata.title || "Untitled").length));

  const header = `Session ID${" ".repeat(maxIdWidth - 10)}  Title${" ".repeat(maxTitleWidth - 5)}  Updated`;
  lines.push(header);
  lines.push("─".repeat(header.length));
  
  for (const session of sessions) {
    const title = truncate(session.metadata.title || "Untitled", maxTitleWidth);
    const timeStr = formatDate(session.updatedAt);
    const line = `${session.sessionId.padEnd(maxIdWidth)}  ${title.padEnd(maxTitleWidth)}  ${timeStr}`;
    lines.push(line);
  }

  return lines.join(EOL);
}

function formatSessionJSON(sessions: SessionState[]): string {
  const jsonData = sessions.map((session) => ({
    id: session.sessionId,
    title: session.metadata.title || "Untitled",
    status: session.status,
    mode: session.mode,
    provider: session.context.provider,
    model: session.context.model,
    messages: session.messages.length,
    todos: session.todos.length,
    updated: session.updatedAt.toISOString(),
    created: session.createdAt.toISOString(),
    workdir: session.context.workdir,
  }));
  return JSON.stringify(jsonData, null, 2);
}

export function createSessionCommand(): Command {
  const session = new Command("session")
    .description("Manage sessions")
    .addCommand(createSessionListCommand())
    .addCommand(createSessionShowCommand())
    .addCommand(createSessionDeleteCommand())
    .addCommand(createSessionStatsCommand())
    .addCommand(createSessionCompactCommand())
    .addCommand(createSessionForkCommand())
    .addCommand(createSessionChildrenCommand());

  return session;
}

function createSessionListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description("List sessions")
    .option("-n, --max-count <number>", "Limit to N most recent sessions", parseInt)
    .option("--format <format>", "Output format (table or json)", "table")
    .option("--status <status>", "Filter by status (active, completed, idle)")
    .action(async (options) => {
      const filter: Record<string, unknown> = {};
      
      if (options.status) {
        filter.status = options.status;
      }

      let sessions = sessionManager.listSessions(filter);

      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      if (options.maxCount) {
        sessions = sessions.slice(0, options.maxCount);
      }

      if (sessions.length === 0) {
        UI.println(UI.Style.TEXT_DIM + "No sessions found" + UI.Style.RESET);
        return;
      }

      let output: string;
      if (options.format === "json") {
        output = formatSessionJSON(sessions);
      } else {
        output = formatSessionTable(sessions);
      }

      console.log(output);
    });
}

function createSessionShowCommand(): Command {
  return new Command("show")
    .description("Show session details")
    .argument("<session-id>", "Session ID to show")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (sessionId, options) => {
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        UI.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.format === "json") {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      UI.println();
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "Session: " + UI.Style.RESET + session.sessionId);
      UI.println(UI.Style.TEXT_DIM + "─".repeat(50) + UI.Style.RESET);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Status  " + UI.Style.RESET + session.status);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Mode    " + UI.Style.RESET + session.mode);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Provider" + UI.Style.RESET + " " + session.context.provider + "/" + session.context.model);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Workdir " + UI.Style.RESET + session.context.workdir);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Created " + UI.Style.RESET + formatDate(session.createdAt));
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Updated " + UI.Style.RESET + formatDate(session.updatedAt));
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Messages" + UI.Style.RESET + " " + session.messages.length);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Todos   " + UI.Style.RESET + " " + session.todos.length);

      if (session.todos.length > 0) {
        UI.println();
        UI.println(UI.Style.TEXT_WARNING_BOLD + "Todos:" + UI.Style.RESET);
        for (const todo of session.todos) {
          const icon = todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "→" : "○";
          const color = todo.status === "completed" ? UI.Style.TEXT_SUCCESS : 
                       todo.status === "in_progress" ? UI.Style.TEXT_WARNING : UI.Style.TEXT_DIM;
          UI.println("  " + color + icon + UI.Style.RESET + " " + todo.content);
        }
      }

      UI.println();
    });
}

function createSessionDeleteCommand(): Command {
  return new Command("delete")
    .alias("rm")
    .description("Delete a session")
    .argument("<session-id>", "Session ID to delete")
    .option("-f, --force", "Force delete without confirmation")
    .action(async (sessionId, options) => {
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        UI.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.force || !process.stdin.isTTY) {
        const deleted = await sessionManager.deleteSession(sessionId);
        if (deleted) {
          UI.success(`Deleted session: ${sessionId}`);
        } else {
          UI.error(`Failed to delete session: ${sessionId}`);
          process.exit(1);
        }
        return;
      }

      const clack = await import("@clack/prompts");
      const confirm = await clack.confirm({
        message: `Delete session ${sessionId}?`,
      });

      if (clack.isCancel(confirm) || !confirm) {
        UI.warning("Cancelled");
        return;
      }

      const deleted = await sessionManager.deleteSession(sessionId);
      if (deleted) {
        UI.success(`Deleted session: ${sessionId}`);
      } else {
        UI.error(`Failed to delete session: ${sessionId}`);
        process.exit(1);
      }
    });
}

function createSessionStatsCommand(): Command {
  return new Command("stats")
    .description("Show session statistics")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (options) => {
      const stats = sessionManager.getStats();

      if (options.format === "json") {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      UI.println();
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "Session Statistics" + UI.Style.RESET);
      UI.println(UI.Style.TEXT_DIM + "─".repeat(40) + UI.Style.RESET);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Total     " + UI.Style.RESET + stats.totalSessions);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Active    " + UI.Style.RESET + stats.activeSessions);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Completed " + UI.Style.RESET + stats.completedSessions);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Messages  " + UI.Style.RESET + stats.totalMessages);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Todos     " + UI.Style.RESET + stats.totalTodos + " (" + stats.completedTodos + " completed)");
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Tokens    " + UI.Style.RESET + stats.totalTokensUsed.toLocaleString());
      UI.println();

      if (stats.topModels.length > 0) {
        UI.println(UI.Style.TEXT_WARNING_BOLD + "Top Models:" + UI.Style.RESET);
        for (const { model, count } of stats.topModels.slice(0, 5)) {
          UI.println("  " + UI.Style.TEXT_DIM + count + "x" + UI.Style.RESET + " " + model);
        }
        UI.println();
      }
    });
}

function createSessionCompactCommand(): Command {
  return new Command("compact")
    .description("Compact a session to reduce token usage")
    .argument("<session-id>", "Session ID to compact")
    .option("--dry-run", "Show what would be compacted without making changes")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (sessionId, options) => {
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        UI.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      const stats = sessionManager.getCompactionStats(sessionId);

      if (!stats) {
        UI.error("Failed to get compaction stats");
        process.exit(1);
      }

      if (options.format === "json") {
        console.log(JSON.stringify({ sessionId, stats, needsCompaction: sessionManager.needsCompaction(sessionId) }, null, 2));
        
        if (options.dryRun) return;
        
        const result = await sessionManager.compactSession(sessionId);
        console.log(JSON.stringify({ result }, null, 2));
        return;
      }

      UI.println();
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "Session Context Stats" + UI.Style.RESET);
      UI.println(UI.Style.TEXT_DIM + "─".repeat(40) + UI.Style.RESET);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Current Tokens " + UI.Style.RESET + stats.totalTokens.toLocaleString());
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Context Limit  " + UI.Style.RESET + stats.contextLimit.toLocaleString());
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Usable Context " + UI.Style.RESET + stats.usableContext.toLocaleString());
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Utilization    " + UI.Style.RESET + stats.utilizationPercent + "%");
      UI.println();

      const needsCompaction = sessionManager.needsCompaction(sessionId);
      
      if (stats.overflowAmount > 0) {
        UI.println(UI.Style.TEXT_DANGER_BOLD + "⚠ Context overflow: " + stats.overflowAmount.toLocaleString() + " tokens over limit" + UI.Style.RESET);
      } else if (stats.utilizationPercent > 80) {
        UI.println(UI.Style.TEXT_WARNING + "⚠ Context utilization is high (" + stats.utilizationPercent + "%)" + UI.Style.RESET);
      } else {
        UI.println(UI.Style.TEXT_SUCCESS + "✓ Context utilization is healthy" + UI.Style.RESET);
      }
      UI.println();

      if (options.dryRun) {
        if (needsCompaction) {
          UI.println(UI.Style.TEXT_WARNING + "Would compact this session (--dry-run mode)" + UI.Style.RESET);
        } else {
          UI.println(UI.Style.TEXT_DIM + "No compaction needed" + UI.Style.RESET);
        }
        return;
      }

      if (!needsCompaction) {
        UI.println(UI.Style.TEXT_DIM + "No compaction needed" + UI.Style.RESET);
        return;
      }

      const result = await sessionManager.compactSession(sessionId);

      if (result && result.pruned) {
        UI.println(UI.Style.TEXT_SUCCESS_BOLD + "✓ Compaction complete" + UI.Style.RESET);
        UI.println(UI.Style.TEXT_INFO + "  Pruned " + result.prunedTokens.toLocaleString() + " tokens from " + result.prunedMessages + " messages" + UI.Style.RESET);
        
        if (result.needsSummary) {
          UI.println(UI.Style.TEXT_WARNING + "  Session may need a summary to continue effectively" + UI.Style.RESET);
        }
      } else {
        UI.println(UI.Style.TEXT_DIM + "No changes made" + UI.Style.RESET);
      }
      UI.println();
    });
}

function createSessionForkCommand(): Command {
  return new Command("fork")
    .description("Fork a session to create a branch at a specific point")
    .argument("<session-id>", "Session ID to fork")
    .option("-m, --message <message-id>", "Fork at specific message ID (default: end)")
    .option("-t, --title <title>", "Title for the forked session")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (sessionId, options) => {
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        UI.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.message) {
        const messageExists = session.messages.some((m) => m.id === options.message);
        if (!messageExists) {
          UI.error(`Message not found: ${options.message}`);
          process.exit(1);
        }
      }

      const forkedSession = await sessionManager.forkSession(sessionId, {
        messageId: options.message,
        title: options.title,
      });

      if (!forkedSession) {
        UI.error("Failed to fork session");
        process.exit(1);
      }

      if (options.format === "json") {
        console.log(JSON.stringify({
          forked: true,
          sessionId: forkedSession.sessionId,
          parentId: sessionId,
          messageId: options.message,
          messagesCount: forkedSession.messages.length,
        }, null, 2));
        return;
      }

      UI.println();
      UI.println(UI.Style.TEXT_SUCCESS_BOLD + "✓ Session forked successfully" + UI.Style.RESET);
      UI.println(UI.Style.TEXT_DIM + "─".repeat(40) + UI.Style.RESET);
      UI.println();

      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "New Session " + UI.Style.RESET + forkedSession.sessionId);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Parent      " + UI.Style.RESET + sessionId);
      UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Messages    " + UI.Style.RESET + forkedSession.messages.length);
      if (options.message) {
        UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.TEXT_DIM + "Fork Point  " + UI.Style.RESET + options.message);
      }
      UI.println();

      UI.println(UI.Style.TEXT_DIM + "Continue with: supercode run --session " + forkedSession.sessionId + UI.Style.RESET);
      UI.println();
    });
}

function createSessionChildrenCommand(): Command {
  return new Command("children")
    .description("List child sessions (forks) of a session")
    .argument("<session-id>", "Parent session ID")
    .option("--format <format>", "Output format (table or json)", "table")
    .action(async (sessionId, options) => {
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        UI.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      const children = sessionManager.getChildren(sessionId);

      if (options.format === "json") {
        console.log(JSON.stringify(children.map((c) => ({
          id: c.sessionId,
          title: c.metadata.title,
          messagesCount: c.messages.length,
          forkedAt: c.metadata.forkedFrom?.forkedAt,
          forkPoint: c.metadata.forkedFrom?.messageId,
        })), null, 2));
        return;
      }

      if (children.length === 0) {
        UI.println(UI.Style.TEXT_DIM + "No child sessions (forks) found" + UI.Style.RESET);
        return;
      }

      UI.println();
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "Child Sessions (Forks)" + UI.Style.RESET);
      UI.println(UI.Style.TEXT_DIM + "─".repeat(40) + UI.Style.RESET);
      UI.println();

      for (const child of children) {
        const forkInfo = child.metadata.forkedFrom;
        UI.println(UI.Style.TEXT_INFO_BOLD + "| " + UI.Style.RESET + child.sessionId);
        UI.println(UI.Style.TEXT_DIM + "  " + (child.metadata.title || "Untitled") + UI.Style.RESET);
        UI.println(UI.Style.TEXT_DIM + "  Messages: " + child.messages.length + UI.Style.RESET);
        if (forkInfo) {
          UI.println(UI.Style.TEXT_DIM + "  Forked: " + formatDate(forkInfo.forkedAt) + UI.Style.RESET);
        }
        UI.println();
      }

      UI.println(UI.Style.TEXT_DIM + children.length + " child session(s)" + UI.Style.RESET);
      UI.println();
    });
}

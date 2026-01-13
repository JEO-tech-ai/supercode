import { sessionManager } from '../../session/manager';
import type { SessionInfoParams } from './types';
import { sessionInfoSchema } from './types';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);

  return parts.join(', ') || 'Less than a minute';
}

export async function sessionInfo(params: SessionInfoParams): Promise<string> {
  const { session_id } = params;

  const session = await sessionManager.getSession(session_id);

  if (!session) {
    return `Session not found: ${session_id}`;
  }

  const duration = session.updatedAt.getTime() - session.createdAt.getTime();
  const durationStr = formatDuration(duration);

  const customMeta = session.metadata?.custom as Record<string, unknown> || {};
  const agents = (customMeta.agents as string[]) || [];
  const uniqueAgents = Array.from(new Set(agents));

  const todoStats = session.todos && session.todos.length > 0 ? {
    total: session.todos.length,
    completed: session.todos.filter(t => t.status === 'completed').length,
  } : null;

  const lines: string[] = [
    `Session ID: ${session.sessionId}`,
    `Messages: ${session.messages.length}`,
    `Date Range: ${session.createdAt.toISOString()} to ${session.updatedAt.toISOString()}`,
    `Duration: ${durationStr}`,
    `Status: ${session.status}`,
    `Mode: ${session.mode}`,
    `Model: ${session.context.model}`,
    `Provider: ${session.context.provider}`,
    `Agents Used: ${uniqueAgents.length > 0 ? uniqueAgents.join(', ') : 'None'}`,
  ];

  if (todoStats) {
    lines.push(`Has Todos: Yes (${todoStats.completed}/${todoStats.total} completed)`);
  } else {
    lines.push('Has Todos: No');
  }

  lines.push(`Has Transcript: ${customMeta.transcript ? 'Yes' : 'No'}`);

  return lines.join('\n');
}

export const sessionInfoTool = {
  name: 'session_info',
  description: `Get metadata and statistics about an OpenCode session.

Returns detailed information about a session including message count, date range, agents used, and available data sources.

Arguments:
- session_id (required): Session ID to inspect

Example output:
Session ID: ses_abc123
Messages: 45
Date Range: 2025-12-20 10:30:00 to 2025-12-24 15:45:30
Duration: 4 days, 5 hours
Status: active
Mode: normal
Model: claude-3-5-sonnet
Provider: anthropic
Agents Used: build, oracle, librarian
Has Todos: Yes (12 items, 8 completed)
Has Transcript: Yes`,
  parameters: sessionInfoSchema,
  execute: sessionInfo,
};

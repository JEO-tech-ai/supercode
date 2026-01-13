import { sessionManager } from '../../session/manager';
import type { SessionReadParams } from './types';
import { sessionReadSchema } from './types';

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

export async function sessionRead(params: SessionReadParams): Promise<string> {
  const { session_id, include_todos = false, include_transcript = false, limit } = params;

  const session = await sessionManager.getSession(session_id);

  if (!session) {
    return `Session not found: ${session_id}`;
  }

  const lines: string[] = [];

  lines.push(`Session: ${session.sessionId}`);
  lines.push(`Messages: ${session.messages.length}`);
  lines.push(`Date Range: ${session.createdAt.toISOString()} to ${session.updatedAt.toISOString()}`);
  lines.push(`Status: ${session.status}`);
  lines.push('');

  const messages = limit ? session.messages.slice(-limit) : session.messages;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const timestamp = msg.timestamp?.toISOString().split('T')[1]?.slice(0, 8) || '';

    lines.push(`[Message ${i + 1}] ${msg.role} (${timestamp})`);
    lines.push(truncateContent(msg.content, 500));
    lines.push('');
  }

  if (include_todos && session.todos && session.todos.length > 0) {
    lines.push('---');
    lines.push('Todos:');
    for (const todo of session.todos) {
      const status = todo.status === 'completed' ? '✅' :
                     todo.status === 'in_progress' ? '🔄' : '⬜';
      lines.push(`${status} ${todo.content}`);
    }
    lines.push('');
  }

  const customMeta = session.metadata?.custom as Record<string, unknown> || {};
  if (include_transcript && customMeta.transcript) {
    const transcript = customMeta.transcript as string;
    lines.push('---');
    lines.push('Transcript:');
    lines.push(transcript.slice(0, 2000));
    if (transcript.length > 2000) {
      lines.push('... (truncated)');
    }
  }

  return lines.join('\n');
}

export const sessionReadTool = {
  name: 'session_read',
  description: `Read messages and history from an OpenCode session.

Returns a formatted view of session messages with role, timestamp, and content. Optionally includes todos and transcript data.

Arguments:
- session_id (required): Session ID to read
- include_todos (optional): Include todo list if available (default: false)
- include_transcript (optional): Include transcript log if available (default: false)
- limit (optional): Maximum number of messages to return (default: all)

Example output:
Session: ses_abc123
Messages: 45
Date Range: 2025-12-20 to 2025-12-24

[Message 1] user (10:30:00)
Hello, can you help me with...

[Message 2] assistant (10:30:15)
Of course! Let me help you with...`,
  parameters: sessionReadSchema,
  execute: sessionRead,
};

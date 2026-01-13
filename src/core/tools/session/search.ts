import { sessionManager } from '../../session/manager';
import type { SessionSearchParams, SearchMatch } from './types';
import { sessionSearchSchema } from './types';

export async function sessionSearch(params: SessionSearchParams): Promise<string> {
  const { query, session_id, case_sensitive = false, limit = 20 } = params;

  let sessions;
  if (session_id) {
    const session = await sessionManager.getSession(session_id);
    sessions = session ? [session] : [];
  } else {
    sessions = sessionManager.listSessions({});
  }

  const matches: SearchMatch[] = [];
  const searchQuery = case_sensitive ? query : query.toLowerCase();

  for (const session of sessions) {
    if (!session?.messages) continue;

    for (const message of session.messages) {
      const content = case_sensitive ? message.content : message.content.toLowerCase();
      const index = content.indexOf(searchQuery);

      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        let excerpt = message.content.slice(start, end);

        const matchStart = index - start;
        excerpt = excerpt.slice(0, matchStart) +
                  '**' + excerpt.slice(matchStart, matchStart + query.length) + '**' +
                  excerpt.slice(matchStart + query.length);

        if (start > 0) excerpt = '...' + excerpt;
        if (end < content.length) excerpt = excerpt + '...';

        matches.push({
          sessionId: session.sessionId,
          messageId: message.id || 'unknown',
          role: message.role,
          excerpt,
          matchIndex: index,
        });

        if (matches.length >= limit) break;
      }
    }

    if (matches.length >= limit) break;
  }

  if (matches.length === 0) {
    return `No matches found for: "${query}"`;
  }

  const uniqueSessions = new Set(matches.map(m => m.sessionId)).size;
  const lines: string[] = [
    `Found ${matches.length} matches across ${uniqueSessions} session(s):`,
    '',
  ];

  for (const match of matches) {
    lines.push(`[${match.sessionId.slice(0, 12)}] Message (${match.role})`);
    lines.push(match.excerpt);
    lines.push('');
  }

  return lines.join('\n');
}

export const sessionSearchTool = {
  name: 'session_search',
  description: `Search for content within OpenCode session messages.

Performs full-text search across session messages and returns matching excerpts with context.

Arguments:
- query (required): Search query string
- session_id (optional): Search within specific session only (default: all sessions)
- case_sensitive (optional): Case-sensitive search (default: false)
- limit (optional): Maximum number of results to return (default: 20)

Example output:
Found 3 matches across 2 sessions:

[ses_abc123] Message (user)
...implement the **session manager** tool...

[ses_abc123] Message (assistant)
...I'll create a **session manager** with full search...

[ses_def456] Message (user)
...use the **session manager** to find...`,
  parameters: sessionSearchSchema,
  execute: sessionSearch,
};

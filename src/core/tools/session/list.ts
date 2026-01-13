import { sessionManager } from '../../session/manager';
import type { SessionListParams, SessionSummary } from './types';
import { sessionListSchema } from './types';

export async function sessionList(params: SessionListParams): Promise<string> {
  const { limit = 20, from_date, to_date, project_path } = params;

  const sessions = sessionManager.listSessions({
    since: from_date ? new Date(from_date) : undefined,
    until: to_date ? new Date(to_date) : undefined,
    searchTerm: project_path,
  });

  const limitedSessions = sessions.slice(0, limit);

  if (limitedSessions.length === 0) {
    return 'No sessions found matching the criteria.';
  }

  const header = '| Session ID | Messages | First | Last | Status |';
  const divider = '|------------|----------|-------|------|--------|';

  const rows = limitedSessions.map((session) => {
    const shortId = session.sessionId.slice(0, 12);
    const messageCount = session.messages?.length || 0;
    const firstDate = session.createdAt?.toISOString().split('T')[0] || '-';
    const lastDate = session.updatedAt?.toISOString().split('T')[0] || '-';
    const status = session.status || 'unknown';

    return `| ${shortId} | ${messageCount} | ${firstDate} | ${lastDate} | ${status} |`;
  });

  return [header, divider, ...rows].join('\n');
}

export const sessionListTool = {
  name: 'session_list',
  description: `List all OpenCode sessions with optional filtering.

Returns a list of available session IDs with metadata including message count, date range, and agents used.

Arguments:
- limit (optional): Maximum number of sessions to return
- from_date (optional): Filter sessions from this date (ISO 8601 format)
- to_date (optional): Filter sessions until this date (ISO 8601 format)

Example output:
| Session ID | Messages | First | Last | Status |
|------------|----------|-------|------|--------|
| ses_abc123 | 45 | 2025-12-20 | 2025-12-24 | active |
| ses_def456 | 12 | 2025-12-19 | 2025-12-19 | completed |`,
  parameters: sessionListSchema,
  execute: sessionList,
};

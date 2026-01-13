import { z } from 'zod';

export const sessionListSchema = z.object({
  limit: z.number().optional().describe('Maximum number of sessions to return'),
  from_date: z.string().optional().describe('Filter sessions from this date (ISO 8601)'),
  to_date: z.string().optional().describe('Filter sessions until this date (ISO 8601)'),
  project_path: z.string().optional().describe('Filter by project path'),
});

export type SessionListParams = z.infer<typeof sessionListSchema>;

export const sessionReadSchema = z.object({
  session_id: z.string().describe('Session ID to read'),
  include_todos: z.boolean().optional().describe('Include todo list if available'),
  include_transcript: z.boolean().optional().describe('Include transcript log if available'),
  limit: z.number().optional().describe('Maximum number of messages to return'),
});

export type SessionReadParams = z.infer<typeof sessionReadSchema>;

export const sessionSearchSchema = z.object({
  query: z.string().describe('Search query string'),
  session_id: z.string().optional().describe('Search within specific session only'),
  case_sensitive: z.boolean().optional().describe('Case-sensitive search (default: false)'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
});

export type SessionSearchParams = z.infer<typeof sessionSearchSchema>;

export const sessionInfoSchema = z.object({
  session_id: z.string().describe('Session ID to inspect'),
});

export type SessionInfoParams = z.infer<typeof sessionInfoSchema>;

export interface SearchMatch {
  sessionId: string;
  messageId: string;
  role: string;
  excerpt: string;
  matchIndex: number;
}

export interface SessionSummary {
  sessionId: string;
  messageCount: number;
  firstDate: string;
  lastDate: string;
  agents: string[];
  status: string;
}

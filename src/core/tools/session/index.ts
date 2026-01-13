export * from './types';

export { sessionList, sessionListTool } from './list';
export { sessionRead, sessionReadTool } from './read';
export { sessionSearch, sessionSearchTool } from './search';
export { sessionInfo, sessionInfoTool } from './info';

import { sessionListTool } from './list';
import { sessionReadTool } from './read';
import { sessionSearchTool } from './search';
import { sessionInfoTool } from './info';

export const sessionTools = {
  session_list: sessionListTool,
  session_read: sessionReadTool,
  session_search: sessionSearchTool,
  session_info: sessionInfoTool,
};

export const SESSION_TOOL_NAMES = [
  'session_list',
  'session_read',
  'session_search',
  'session_info',
] as const;

export type SessionToolName = typeof SESSION_TOOL_NAMES[number];

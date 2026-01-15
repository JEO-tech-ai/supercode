export interface ClaudeCodeSessionState {
  mainSessionId: string | undefined;
  subagentSessions: Set<string>;
  lastActiveSessionId: string | undefined;
}

export interface MessageFields {
  agent?: string;
  tools?: {
    write?: boolean;
    edit?: boolean;
    [key: string]: boolean | undefined;
  };
  model?: {
    providerID?: string;
    modelID?: string;
  };
}

export interface TranscriptEntry {
  timestamp: Date;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: unknown[];
}

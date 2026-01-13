export interface MessageMeta {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  time: {
    created: number;
    completed?: number;
  };
  agent?: string;
  model?: {
    providerId: string;
    modelId: string;
  };
  path?: {
    cwd: string;
    root: string;
  };
  tools?: Record<string, boolean>;
}

export interface OriginalMessageContext {
  agent?: string;
  model?: {
    providerId?: string;
    modelId?: string;
  };
  path?: {
    cwd?: string;
    root?: string;
  };
  tools?: Record<string, boolean>;
}

export interface TextPart {
  id: string;
  type: "text";
  text: string;
  synthetic: boolean;
  time: {
    start: number;
    end: number;
  };
  messageId: string;
  sessionId: string;
}

export interface StoredMessage {
  agent?: string;
  model?: { providerId?: string; modelId?: string };
  tools?: Record<string, boolean>;
}

export type SessionStatus = 'active' | 'idle' | 'paused' | 'completed' | 'error';

export type SessionMode = 'normal' | 'ultrawork' | 'interactive';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    toolCalls?: ToolCall[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  timestamp: Date;
}

export interface SessionTodo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionLoop {
  iteration: number;
  maxIterations: number;
  stagnantCount: number;
  lastPendingHash?: string;
  startTime: Date;
}

export interface SessionContext {
  sessionId: string;
  workdir: string;
  userId?: string;
  env: Record<string, string>;
  permissions: string[];
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
}

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  mode: SessionMode;
  context: SessionContext;
  messages: SessionMessage[];
  todos: SessionTodo[];
  loop?: SessionLoop;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    custom?: Record<string, unknown>;
  };
  cache?: {
    enabled: boolean;
    size: number;
    maxSize: number;
    keys: string[];
  };
}

export interface SessionFilter {
  status?: SessionStatus;
  mode?: SessionMode;
  userId?: string;
  model?: string;
  provider?: string;
  since?: Date;
  until?: Date;
  tags?: string[];
  searchTerm?: string;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMessages: number;
  totalTodos: number;
  completedTodos: number;
  averageSessionDuration: number;
  totalTokensUsed: number;
  topModels: Array<{ model: string; count: number }>;
}

export interface SessionExportFormat {
  version: string;
  exportDate: string;
  session: SessionState;
  format: 'json' | 'yaml' | 'md';
}

export interface SessionImportResult {
  success: boolean;
  sessionId?: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export type SessionEvent =
  | 'session.created'
  | 'session.updated'
  | 'session.paused'
  | 'session.resumed'
  | 'session.completed'
  | 'session.deleted'
  | 'message.added'
  | 'todo.added'
  | 'todo.updated'
  | 'todo.completed'
  | 'loop.started'
  | 'loop.iterated'
  | 'loop.completed';

export interface SessionEventHandler {
  event: SessionEvent;
  handler: (data: unknown) => void | Promise<void>;
  once?: boolean;
}

export interface SessionEncryptionConfig {
  enabled: boolean;
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations: number;
}

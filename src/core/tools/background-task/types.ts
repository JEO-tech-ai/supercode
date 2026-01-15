export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type BackgroundAgentType = 
  | 'explore' 
  | 'librarian' 
  | 'oracle' 
  | 'frontend-ui-ux-engineer' 
  | 'document-writer'
  | 'general';

export interface BackgroundTask {
  id: string;
  parentSessionId: string;
  childSessionId?: string;
  agent: BackgroundAgentType;
  prompt: string;
  description?: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SpawnTaskInput {
  agent: string;
  prompt: string;
  description?: string;
}

export interface GetOutputInput {
  task_id: string;
  block?: boolean;
  timeout?: number;
}

export interface CancelTaskInput {
  taskId?: string;
  all?: boolean;
}

export interface BackgroundManagerConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  taskRetentionMs: number;
}

export const DEFAULT_CONFIG: BackgroundManagerConfig = {
  maxConcurrentTasks: 5,
  defaultTimeout: 300000,
  taskRetentionMs: 3600000,
};

export interface TaskEvent {
  task: BackgroundTask;
  error?: Error;
}

export interface BackgroundManagerEvents {
  'task.created': TaskEvent;
  'task.started': TaskEvent;
  'task.completed': TaskEvent;
  'task.failed': TaskEvent;
  'task.cancelled': TaskEvent;
}

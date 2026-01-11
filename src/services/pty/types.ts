import * as pty from 'node-pty';
import { EventEmitter } from 'events';

// PTY Spawn Options (extends IPtyForkOptions with shell/args)
export interface PTYSpawnOptions extends pty.IPtyForkOptions {
  shell?: string;
  args?: string[];
}

// PTY Process Interface
export interface PTYProcess {
  id: string;
  pid: number;
  shell: string;
  cwd: string;
  cols: number;
  rows: number;
  env: Record<string, string>;
  isAlive: () => boolean;
  kill: (signal?: 'SIGTERM' | 'SIGKILL' | 'SIGINT') => void;
  resize: (cols: number, rows: number) => void;
  write: (data: string) => void;
  onData: (callback: (data: string) => void) => pty.IDisposable;
  onExit: (callback: (e: { exitCode: number; signal?: number }) => void) => pty.IDisposable;
  outputBuffer: string[];
  lastActivity: Date;
  _killed?: boolean;
}

// PTY Manager Options
export interface PTYManagerConfig {
  maxConcurrent: number;
  idleTimeout: number;
  enableCaching: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

// PTY Event Types
export type PTYEventType = 'data' | 'exit' | 'error';

export interface PTYEvent {
  type: PTYEventType;
  process: PTYProcess;
  data?: string;
  exitCode?: number;
  signal?: string;
  error?: Error;
}

// Custom Errors
export class PTYNotFoundError extends Error {
  constructor(processId: string) {
    super(`PTY process not found: ${processId}`);
    this.name = 'PTYNotFoundError';
  }
}

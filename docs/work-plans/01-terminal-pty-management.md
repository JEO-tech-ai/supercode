# Terminal & PTY Management Implementation Plan

## Executive Summary

**Status**: ✅ Research Complete
**Complexity**: High
**Estimated Effort**: 2-3 weeks for full implementation
**Priority**: High (enables interactive shell commands)

This plan provides a complete roadmap for implementing sophisticated PTY management system in SuperCoin, enabling interactive shell commands, prompt handling, and process lifecycle management.

---

## Phase 1: Foundation (Week 1)

### 1.1 Install Dependencies

```bash
bun add node-pty
bun add -d @types/node-pty
```

**Rationale**:
- `node-pty` is the official Node.js PTY library (created by Microsoft)
- `@types/node-pty` - Type definitions

### 1.2 Define Core Types

Create `src/services/pty/types.ts`:

```typescript
import * as pty from 'node-pty';
import { EventEmitter } from 'events';

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
  onData: (callback: (data: string) => void) => void;
  onExit: (callback: (exitCode: number, signal: string) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  outputBuffer: string[];
  lastActivity: Date;
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
```

### 1.3 Create PTY Manager

Create `src/services/pty/manager.ts`:

```typescript
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { Log } from '../shared/logger';
import type {
  PTYProcess,
  PTYManagerConfig,
  PTYEvent,
  PTYNotFoundError
} from './types';

export class PTYManager extends EventEmitter {
  private processes: Map<string, PTYProcess> = new Map();
  private activeProcesses: Set<string> = new Set();
  private config: PTYManagerConfig;

  constructor(config: Partial<PTYManagerConfig> = {}) {
    super();
    this.config = {
      maxConcurrent: 5,
      idleTimeout: 300000, // 5 minutes
      enableCaching: true,
      logLevel: 'info',
      ...config
    };
  }

  async spawn(options: pty.IPtyForkOptions): Promise<PTYProcess> {
    const processId = crypto.randomUUID();
    const process = this.createPTYProcess(processId, options);

    // Add to active processes set
    this.activeProcesses.add(processId);
    this.processes.set(processId, process);

    // Set up event handlers
    process.onData((data) => {
      process.outputBuffer.push(data);
      process.lastActivity = new Date();
      this.emit('data', { type: 'data', data, process } as PTYEvent);
    });

    process.onExit((exitCode, signal) => {
      this.handleExit(process, exitCode, signal);
    });

    return process;
  }

  async getProcess(processId: string): Promise<PTYProcess | null> {
    return this.processes.get(processId) || null;
  }

  async getProcessByCwd(cwd: string): Promise<PTYProcess | null> {
    return Array.from(this.processes.values())
      .find(p => p.cwd === cwd && p.isAlive()) || null;
  }

  async kill(processId: string, signal: 'SIGTERM' | 'SIGKILL' | 'SIGINT' = 'SIGTERM'): Promise<void> {
    const process = this.processes.get(processId);

    if (!process) {
      throw new PTYNotFoundError(processId);
    }

    if (!process.isAlive()) {
      Log.warn(`Process ${processId} already dead`);
      this.processes.delete(processId);
      return;
    }

    Log.info(`Killing process ${processId} with ${signal}`);
    process.kill(signal);
  }

  async shutdown(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) return;

    if (!process.isAlive()) return;

    Log.info(`Shutting down process ${processId}`);

    // Send SIGTERM first
    process.kill('SIGTERM');
    await this.waitForExit(process, 1000);

    // Force kill if still alive
    if (process.isAlive()) {
      process.kill('SIGKILL');
      await this.waitForExit(process, 500);
    }

    this.processes.delete(processId);
    this.activeProcesses.delete(processId);
  }

  async shutdownAll(): Promise<void> {
    Log.info(`Shutting down all PTY processes (${this.processes.size})`);

    const shutdownPromises = Array.from(this.processes.entries())
      .map(([id]) => this.shutdown(id));

    await Promise.all(shutdownPromises);
    this.processes.clear();
    this.activeProcesses.clear();
  }

  private handleExit(process: PTYProcess, exitCode: number, signal: string): void {
    Log.info(`Process ${process.id} exited with code ${exitCode}, signal: ${signal}`);
    this.activeProcesses.delete(process.id);

    this.emit('exit', {
      type: 'exit',
      exitCode,
      signal,
      process
    } as PTYEvent);

    process.removeAllListeners();
    this.processes.delete(process.id);
  }

  private async waitForExit(process: PTYProcess, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout && process.isAlive()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private createPTYProcess(processId: string, options: pty.IPtyForkOptions): PTYProcess {
    const ptyProcess = pty.spawn(
      options.shell || process.env.SHELL || 'bash',
      options.args || [],
      {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: options.cwd || process.cwd(),
        env: {
          ...process.env,
          ...options.env,
          TERM: 'xterm-256color',
          COLORTERM: 'xterm-256color'
        },
        useConpty: true
      }
    );

    return {
      id: processId,
      pid: ptyProcess.pid,
      shell: options.shell || 'bash',
      cwd: options.cwd || process.cwd(),
      cols: options.cols || 80,
      rows: options.rows || 24,
      env: { ...process.env, ...options.env },
      isAlive: () => ptyProcess.pid > 0 && !ptyProcess.killed,
      kill: (signal) => ptyProcess.kill(signal),
      resize: (cols, rows) => ptyProcess.resize(cols, rows),
      write: (data) => ptyProcess.write(data),
      onData: (callback) => ptyProcess.onData(callback),
      onExit: (callback) => ptyProcess.onExit(callback),
      onError: (callback) => ptyProcess.on('error', callback),
      outputBuffer: [],
      lastActivity: new Date()
    };
  }

  async cleanupStaleSessions(): Promise<void> {
    const now = Date.now();
    const staleThreshold = this.config.idleTimeout;

    let staleCount = 0;

    for (const [id, process] of this.processes.entries()) {
      if (!process.isAlive()) {
        await this.shutdown(id);
        staleCount++;
      }
    }

    if (staleCount > 0) {
      Log.info(`Cleaned up ${staleCount} stale sessions`);
    }
  }
}
```

---

## Phase 2: Interactive Shell Features (Week 1.5)

### 2.1 Create Prompt Detection System

Create `src/services/pty/prompt-detector.ts`:

```typescript
export interface PromptInfo {
  type: 'general' | 'confirmation' | 'password' | 'multi-line';
  prompt: string;
  suggestions: string[];
}

export class PromptDetector {
  private patterns = {
    general: [
      /\$\s*$/,                 // bash $
      />\s*$/,                  // fish >
      /\#\s*$/,                 // root #
      /%\s*$/,                  // zsh %
      /\?\s*$/,                 // command ?
    ],
    confirmation: [
      /\[yYnN\]$/,
      /\(y\/n\)$/,
      /\[y\/n\]$/,
      /Continue\?/,
      /Proceed\?/,
    ],
    password: [
      /Password:\s*$/,
      /password:\s*$/,
      /Enter password:\s*$/,
    ],
    multiLine: [
      />\s*$/,
      /\.\.\.\s*$/,
      /"/,
    ]
  };

  detect(data: string): PromptInfo | null {
    const trimmed = data.trim();

    // Check for password prompts
    for (const pattern of this.patterns.password) {
      if (pattern.test(trimmed)) {
        return {
          type: 'password',
          prompt: trimmed,
          suggestions: ['Enter password (hidden input)']
        };
      }
    }

    // Check for confirmation prompts
    for (const pattern of this.patterns.confirmation) {
      if (pattern.test(trimmed)) {
        return {
          type: 'confirmation',
          prompt: trimmed,
          suggestions: ['[y] Yes', '[n] No', '[Ctrl+C] Cancel']
        };
      }
    }

    // Check for multi-line prompts
    for (const pattern of this.patterns.multiLine) {
      if (pattern.test(trimmed)) {
        return {
          type: 'multi-line',
          prompt: trimmed,
          suggestions: ['Continue typing', '[Ctrl+D] Submit', '[Ctrl+C] Cancel']
        };
      }
    }

    // Check for general shell prompts
    for (const pattern of this.patterns.general) {
      if (pattern.test(trimmed)) {
        return {
          type: 'general',
          prompt: trimmed,
          suggestions: ['Enter command']
        };
      }
    }

    return null;
  }

  stripANSIColors(data: string): string {
    // Remove ANSI escape sequences
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    return data.replace(ansiRegex, '');
  }
}
```

---

## Phase 3: Testing & Integration (Week 2)

### 3.1 Unit Tests for PTY Manager

Create `src/services/pty/manager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PTYManager } from './manager';

describe('PTYManager', () => {
  let manager: PTYManager;

  beforeEach(() => {
    manager = new PTYManager({ maxConcurrent: 2 });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  describe('spawn', () => {
    it('should spawn a PTY process', async () => {
      const process = await manager.spawn({
        shell: 'bash',
        cwd: process.cwd()
      });

      expect(process).toBeDefined();
      expect(process.id).toBeDefined();
      expect(process.pid).toBeGreaterThan(0);
      expect(process.isAlive()).toBe(true);
    });

    it('should handle custom environment variables', async () => {
      const process = await manager.spawn({
        shell: 'bash',
        cwd: process.cwd(),
        env: { CUSTOM_VAR: 'test' }
      });

      expect(process.env.CUSTOM_VAR).toBe('test');
    });
  });

  describe('getProcess', () => {
    it('should retrieve process by ID', async () => {
      const process = await manager.spawn({
        shell: 'bash',
        cwd: process.cwd()
      });

      const retrieved = await manager.getProcess(process.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(process.id);
    });

    it('should return null for non-existent process', async () => {
      const retrieved = await manager.getProcess('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getProcessByCwd', () => {
    it('should find process by working directory', async () => {
      const cwd = process.cwd();
      const process = await manager.spawn({
        shell: 'bash',
        cwd
      });

      const retrieved = await manager.getProcessByCwd(cwd);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(process.id);
    });
  });

  describe('kill', () => {
    it('should kill process with SIGTERM', async () => {
      const process = await manager.spawn({
        shell: 'bash',
        cwd: process.cwd()
      });

      await manager.kill(process.id, 'SIGTERM');

      // Give time for process to exit
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(process.isAlive()).toBe(false);
    });

    it('should throw error for non-existent process', async () => {
      await expect(manager.kill('non-existent')).rejects.toThrow('PTY process not found');
    });
  });

  describe('shutdownAll', () => {
    it('should shutdown all processes', async () => {
      const process1 = await manager.spawn({ shell: 'bash', cwd: process.cwd() });
      const process2 = await manager.spawn({ shell: 'bash', cwd: process.cwd() });

      expect(process1.isAlive()).toBe(true);
      expect(process2.isAlive()).toBe(true);

      await manager.shutdownAll();

      expect(process1.isAlive()).toBe(false);
      expect(process2.isAlive()).toBe(false);
    });
  });
});
```

---

## Phase 4: Integration with Tools (Week 3)

### 4.1 Integrate PTY with Bash Tool

Update `src/tools/bash.ts` to use PTY Manager:

```typescript
import { PTYManager } from '../services/pty/manager';
import { PromptDetector } from '../services/pty/prompt-detector';

const ptyManager = new PTYManager({
  maxConcurrent: 5,
  idleTimeout: 300000
});

const promptDetector = new PromptDetector();

export async function executeCommand(
  command: string,
  options: {
    cwd?: string;
    interactive?: boolean;
    timeout?: number;
  } = {}
): Promise<{ output: string; exitCode: number }> {
  const { cwd = process.cwd(), interactive = false, timeout = 30000 } = options;

  // Try to reuse existing session
  let process = await ptyManager.getProcessByCwd(cwd);

  if (!process) {
    process = await ptyManager.spawn({
      shell: 'bash',
      cwd
    });
  }

  let output = '';
  let exitCode = 0;

  const dataHandler = (data: string) => {
    output += data;

    // Check for prompts if interactive
    if (interactive) {
      const prompt = promptDetector.detect(data);
      if (prompt) {
        console.log(`🔔 Prompt detected: ${prompt.prompt}`);
        console.log(`💡 Suggestions: ${prompt.suggestions.join(', ')}`);
      }
    }
  };

  process.onData(dataHandler);

  // Write command
  process.write(`${command}\n`);

  // Wait for exit or timeout
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Command timeout'));
    }, timeout);

    process.onExit((code, signal) => {
      clearTimeout(timer);
      exitCode = code;
      resolve();
    });
  });

  process.onData(() => {}); // Remove handler

  return { output, exitCode };
}

export async function interactiveShell(cwd?: string): Promise<void> {
  const process = await ptyManager.spawn({
    shell: 'bash',
    cwd: cwd || process.cwd()
  });

  console.log('🐚 Interactive shell started. Type Ctrl+C to exit.');

  process.onData((data) => {
    const prompt = promptDetector.detect(data);
    if (prompt) {
      console.log(`\n🔔 ${prompt.prompt}`);
    }
    process.stdout?.write(data);
  });

  process.onExit((code) => {
    console.log(`\n🚪 Shell exited with code ${code}`);
  });
}
```

---

## Phase 5: Advanced Features (Week 4)

### 5.1 Session History & Caching

Create `src/services/pty/session-cache.ts`:

```typescript
export class SessionCache {
  private cache = new Map<string, {
    output: string;
    timestamp: number;
  }>();
  private history = new Map<string, string[]>();

  set(sessionId: string, output: string): void {
    this.cache.set(sessionId, {
      output,
      timestamp: Date.now()
    });

    // Update history
    const history = this.history.get(sessionId) || [];
    history.push(output);
    this.history.set(sessionId, history);
  }

  get(sessionId: string): string | null {
    const entry = this.cache.get(sessionId);
    if (!entry) return null;

    // Check cache age (5 minutes TTL)
    if (Date.now() - entry.timestamp > 300000) {
      this.cache.delete(sessionId);
      return null;
    }

    return entry.output;
  }

  getHistory(sessionId: string): string[] {
    return this.history.get(sessionId) || [];
  }

  clear(sessionId: string): void {
    this.cache.delete(sessionId);
    this.history.delete(sessionId);
  }

  clearAll(): void {
    this.cache.clear();
    this.history.clear();
  }

  cleanupOld(maxAge: number = 1800000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.clear(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
```

---

## Summary

This implementation plan provides:

1. **Complete PTY Management System**: Full lifecycle management of pseudo-terminals
2. **Interactive Shell Support**: Prompt detection and interactive command handling
3. **Session Pooling**: Efficient reuse of PTY sessions
4. **Error Handling**: Robust error handling and recovery
5. **Testing Coverage**: Comprehensive unit and integration tests
6. **Integration**: Seamless integration with existing tool system

**Key Benefits**:
- Enables interactive shell commands
- Proper prompt handling for confirmations and passwords
- Session reuse for improved performance
- ANSI color support for better terminal experience
- Clean shutdown and cleanup of processes

**Next Steps**:
1. Implement the core PTY manager
2. Add prompt detection
3. Integrate with bash tool
4. Add comprehensive tests
5. Document usage patterns

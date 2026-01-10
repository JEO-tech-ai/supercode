import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { Log } from '../../shared/logger';
import type {
  PTYProcess,
  PTYManagerConfig,
  PTYEvent,
  PTYNotFoundError
} from './types';

export class PTYManager extends EventEmitter {
  private processes = new Map<string, PTYProcess>();
  private activeProcesses = new Set<string>();
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

// Global PTY manager instance
export const ptyManager = new PTYManager();

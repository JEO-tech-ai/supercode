import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { Log } from '../../shared/logger';
import {
  PTYProcess,
  PTYManagerConfig,
  PTYEvent,
  PTYNotFoundError,
  PTYSpawnOptions
} from './types';

export class PTYManager extends EventEmitter {
  private processes = new Map<string, PTYProcess>();
  private activeProcesses = new Set<string>();
  private config: PTYManagerConfig;

  constructor(config: Partial<PTYManagerConfig> = {}) {
    super();
    this.config = {
      maxConcurrent: 5,
      idleTimeout: 300000,
      enableCaching: true,
      logLevel: 'info',
      ...config
    };
  }

  async spawn(options: PTYSpawnOptions): Promise<PTYProcess> {
    const processId = crypto.randomUUID();
    const ptyProcess = this.createPTYProcess(processId, options);

    this.activeProcesses.add(processId);
    this.processes.set(processId, ptyProcess);

    ptyProcess.onData((data) => {
      ptyProcess.outputBuffer.push(data);
      ptyProcess.lastActivity = new Date();
      this.emit('data', { type: 'data', data, process: ptyProcess } as PTYEvent);
    });

    ptyProcess.onExit((e) => {
      this.handleExit(ptyProcess, e.exitCode, e.signal);
    });

    return ptyProcess;
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

  private handleExit(process: PTYProcess, exitCode: number, signal?: number): void {
    Log.info(`Process ${process.id} exited with code ${exitCode}, signal: ${signal ?? 'none'}`);
    this.activeProcesses.delete(process.id);

    this.emit('exit', {
      type: 'exit',
      exitCode,
      signal: signal?.toString(),
      process
    } as PTYEvent);

    process._killed = true;
    this.processes.delete(process.id);
  }

  private async waitForExit(process: PTYProcess, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout && process.isAlive()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private createPTYProcess(processId: string, options: PTYSpawnOptions): PTYProcess {
    const shell = options.shell || process.env.SHELL || 'bash';
    const args = options.args || [];
    const cwd = options.cwd || process.cwd();
    const cols = options.cols || 80;
    const rows = options.rows || 24;
    
    const envRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envRecord[key] = value;
      }
    }
    if (options.env) {
      Object.assign(envRecord, options.env);
    }
    envRecord.TERM = 'xterm-256color';
    envRecord.COLORTERM = 'xterm-256color';

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: envRecord,
      useConpty: true
    });

    let killed = false;

    return {
      id: processId,
      pid: ptyProcess.pid,
      shell,
      cwd,
      cols,
      rows,
      env: envRecord,
      isAlive: () => ptyProcess.pid > 0 && !killed,
      kill: (signal) => {
        killed = true;
        ptyProcess.kill(signal);
      },
      resize: (c, r) => ptyProcess.resize(c, r),
      write: (data) => ptyProcess.write(data),
      onData: (callback) => ptyProcess.onData(callback),
      onExit: (callback) => ptyProcess.onExit(callback),
      outputBuffer: [],
      lastActivity: new Date(),
      _killed: false
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

import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { Log } from '../../shared/logger';
import { 
  getShutdownManager, 
  killTree, 
  withTimeoutDefault, 
  type Disposable 
} from '../../shared/shutdown';
import {
  PTYProcess,
  PTYManagerConfig,
  PTYEvent,
  PTYNotFoundError,
  PTYSpawnOptions
} from './types';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;
const KILL_ESCALATION_TIMEOUT_MS = 200;

export class PTYManager extends EventEmitter implements Disposable {
  private processes = new Map<string, PTYProcess>();
  private activeProcesses = new Set<string>();
  private config: PTYManagerConfig;
  private isDisposing = false;

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
    if (this.isDisposing) {
      throw new Error('PTYManager is disposing, cannot spawn new processes');
    }

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
    const proc = this.processes.get(processId);

    if (!proc) {
      throw new PTYNotFoundError(processId);
    }

    if (!proc.isAlive()) {
      Log.warn(`Process ${processId} already dead`);
      this.cleanup(processId);
      return;
    }

    Log.info(`Killing process ${processId} with ${signal}`);
    proc.kill(signal);
  }

  async shutdown(processId: string, timeoutMs: number = DEFAULT_SHUTDOWN_TIMEOUT_MS): Promise<void> {
    const proc = this.processes.get(processId);
    if (!proc) return;

    if (!proc.isAlive()) {
      this.cleanup(processId);
      return;
    }

    Log.info(`Shutting down process ${processId}`);

    let exited = false;
    const exitPromise = new Promise<void>((resolve) => {
      const checkExit = () => {
        if (!proc.isAlive()) {
          exited = true;
          resolve();
        }
      };
      
      const interval = setInterval(() => {
        checkExit();
        if (exited) clearInterval(interval);
      }, 50);
      
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, timeoutMs);
    });

    proc.kill('SIGTERM');
    await this.waitForExit(proc, KILL_ESCALATION_TIMEOUT_MS);

    if (proc.isAlive()) {
      proc.kill('SIGKILL');
      await this.waitForExit(proc, KILL_ESCALATION_TIMEOUT_MS);
    }

    await exitPromise;
    this.cleanup(processId);
  }

  async shutdownAll(timeoutMs: number = DEFAULT_SHUTDOWN_TIMEOUT_MS): Promise<void> {
    if (this.isDisposing) {
      Log.debug('Already disposing PTY processes');
      return;
    }

    this.isDisposing = true;
    Log.info(`Shutting down all PTY processes (${this.processes.size})`);

    const shutdownPromises = Array.from(this.processes.keys())
      .map((id) => 
        withTimeoutDefault(
          this.shutdown(id, timeoutMs),
          timeoutMs,
          undefined
        )
      );

    await Promise.all(shutdownPromises);
    this.processes.clear();
    this.activeProcesses.clear();
    this.isDisposing = false;
  }

  async dispose(): Promise<void> {
    Log.info('Disposing PTYManager');
    await this.shutdownAll();
    this.removeAllListeners();
  }

  private cleanup(processId: string): void {
    this.processes.delete(processId);
    this.activeProcesses.delete(processId);
  }

  private handleExit(proc: PTYProcess, exitCode: number, signal?: number): void {
    Log.info(`Process ${proc.id} exited with code ${exitCode}, signal: ${signal ?? 'none'}`);
    
    proc._killed = true;
    this.cleanup(proc.id);

    this.emit('exit', {
      type: 'exit',
      exitCode,
      signal: signal?.toString(),
      process: proc
    } as PTYEvent);
  }

  private async waitForExit(proc: PTYProcess, timeout: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout && proc.isAlive()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return !proc.isAlive();
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
    let staleCount = 0;

    const entries = Array.from(this.processes.entries());
    for (const [id, proc] of entries) {
      if (!proc.isAlive()) {
        this.cleanup(id);
        staleCount++;
      }
    }

    if (staleCount > 0) {
      Log.info(`Cleaned up ${staleCount} stale sessions`);
    }
  }

  getActiveCount(): number {
    return this.activeProcesses.size;
  }

  isDisposed(): boolean {
    return this.isDisposing;
  }
}

const ptyManagerInstance = new PTYManager();
getShutdownManager().register('ptyManager', ptyManagerInstance);

export const ptyManager = ptyManagerInstance;

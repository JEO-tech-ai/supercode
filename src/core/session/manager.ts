import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../../shared/logger';
import type {
  SessionState,
  SessionContext,
  SessionMessage,
  SessionTodo,
  SessionFilter,
  SessionStats,
  SessionExportFormat,
  SessionEventHandler,
  SessionEvent,
  SessionEncryptionConfig,
  SessionStatus,
} from './types';

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionState>();
  private storagePath: string;
  private encryptionConfig: SessionEncryptionConfig;
  private encryptionKey?: Buffer;
  private eventHandlers = new Map<SessionEvent, Set<SessionEventHandler>>();
  private cache = new Map<string, any>();
  private cacheMaxSize = 100;
  private autoSaveInterval = 60000;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(
    storagePath: string = path.join(process.cwd(), '.supercoin', 'sessions'),
    encryptionConfig: Partial<SessionEncryptionConfig> = {}
  ) {
    super();
    this.storagePath = storagePath;
    this.encryptionConfig = {
      enabled: false,
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000,
      ...encryptionConfig,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });

      if (this.encryptionConfig.enabled) {
        await this.setupEncryption();
      }

      await this.loadSessions();
      this.startAutoSave();

      Log.info(`📂 Session manager initialized at ${this.storagePath}`);
    } catch (error) {
      Log.error(`Failed to initialize session manager: ${(error as Error).message}`);
    }
  }

  async createSession(context: Partial<SessionContext> = {}): Promise<SessionState> {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const session: SessionState = {
      sessionId,
      status: 'active',
      mode: 'normal',
      context: {
        sessionId,
        workdir: process.cwd(),
        env: Object.fromEntries(
          Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
        ),
        permissions: [],
        model: 'ollama/rnj-1',
        provider: 'ollama',
        temperature: 0.7,
        maxTokens: 4096,
        ...context,
      },
      messages: [],
      todos: [],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      metadata: {},
      cache: {
        enabled: true,
        size: 0,
        maxSize: 50,
        keys: [],
      },
    };

    this.sessions.set(sessionId, session);
    await this.saveSession(sessionId);

    this.emit('session.created', { sessionId });
    this.emit('session.updated', { sessionId, status: 'active' });

    Log.info(`🆕 Created session: ${sessionId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionState | undefined> {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.lastActivityAt = new Date();
      return session;
    }

    return undefined;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionState>
  ): Promise<SessionState | undefined> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    Object.assign(session, updates, { updatedAt: new Date(), lastActivityAt: new Date() });

    await this.saveSession(sessionId);
    this.emit('session.updated', { sessionId, updates });

    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    this.cache.delete(sessionId);

    try {
      const filePath = this.getSessionFilePath(sessionId);
      await fs.unlink(filePath);
    } catch (error) {
      Log.warn(`Failed to delete session file: ${(error as Error).message}`);
    }

    this.emit('session.deleted', { sessionId });
    Log.info(`🗑️ Deleted session: ${sessionId}`);

    return true;
  }

  async addMessage(sessionId: string, message: Omit<SessionMessage, 'id' | 'timestamp'>): Promise<SessionMessage> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const newMessage: SessionMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...message,
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    await this.saveSession(sessionId);
    this.emit('message.added', { sessionId, message: newMessage });

    return newMessage;
  }

  async clearMessages(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.messages = [];
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    await this.saveSession(sessionId);
    this.emit('session.updated', { sessionId, updates: { messagesCleared: true } });

    return true;
  }

  async addTodo(sessionId: string, todo: Omit<SessionTodo, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTodo> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const newTodo: SessionTodo = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...todo,
    };

    session.todos.push(newTodo);
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    await this.saveSession(sessionId);
    this.emit('todo.added', { sessionId, todo: newTodo });

    return newTodo;
  }

  async updateTodo(sessionId: string, todoId: string, updates: Partial<SessionTodo>): Promise<SessionTodo | undefined> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const todo = session.todos.find(t => t.id === todoId);

    if (!todo) {
      return undefined;
    }

    Object.assign(todo, updates, { updatedAt: new Date() });

    session.updatedAt = new Date();
    await this.saveSession(sessionId);

    this.emit('todo.updated', { sessionId, todoId, updates });

    if (updates.status === 'completed') {
      this.emit('todo.completed', { sessionId, todoId });
    }

    return todo;
  }

  listSessions(filter: SessionFilter = {}): SessionState[] {
    let sessions = Array.from(this.sessions.values());

    if (filter.status) {
      sessions = sessions.filter(s => s.status === filter.status);
    }

    if (filter.mode) {
      sessions = sessions.filter(s => s.mode === filter.mode);
    }

    if (filter.userId) {
      sessions = sessions.filter(s => s.context.userId === filter.userId);
    }

    if (filter.model) {
      sessions = sessions.filter(s => s.context.model === filter.model);
    }

    if (filter.provider) {
      sessions = sessions.filter(s => s.context.provider === filter.provider);
    }

    if (filter.since) {
      sessions = sessions.filter(s => s.createdAt >= filter.since!);
    }

    if (filter.until) {
      sessions = sessions.filter(s => s.createdAt <= filter.until!);
    }

    if (filter.tags && filter.tags.length > 0) {
      sessions = sessions.filter(s =>
        filter.tags!.some(tag => s.metadata.tags?.includes(tag))
      );
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      sessions = sessions.filter(s =>
        s.metadata.title?.toLowerCase().includes(term) ||
        s.metadata.description?.toLowerCase().includes(term) ||
        s.messages.some(m => m.content.toLowerCase().includes(term))
      );
    }

    return sessions;
  }

  getStats(): SessionStats {
    const sessions = Array.from(this.sessions.values());

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    const totalTodos = sessions.reduce((sum, s) => sum + s.todos.length, 0);
    const completedTodos = sessions.reduce(
      (sum, s) => sum + s.todos.filter(t => t.status === 'completed').length,
      0
    );

    const durations = sessions
      .filter(s => s.status === 'completed')
      .map(s => s.updatedAt.getTime() - s.createdAt.getTime());
    const averageSessionDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const totalTokensUsed = sessions.reduce(
      (sum, s) =>
        sum + s.messages.reduce((ms, m) => ms + (m.metadata?.tokens?.total || 0), 0),
      0
    );

    const modelCounts = new Map<string, number>();
    sessions.forEach(s => {
      const count = modelCounts.get(s.context.model) || 0;
      modelCounts.set(s.context.model, count + 1);
    });
    const topModels = Array.from(modelCounts.entries())
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      totalMessages,
      totalTodos,
      completedTodos,
      averageSessionDuration,
      totalTokensUsed,
      topModels,
    };
  }

  async exportSession(sessionId: string, format: 'json' | 'yaml' = 'json'): Promise<string> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const exportData: SessionExportFormat = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      session,
      format,
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      throw new Error(`Format ${format} not yet supported`);
    }
  }

  async importSession(data: string, format: 'json' | 'yaml' = 'json'): Promise<string> {
    try {
      const exportData: SessionExportFormat =
        format === 'json' ? JSON.parse(data) : JSON.parse(data);

      const session = exportData.session;

      this.sessions.set(session.sessionId, session);
      await this.saveSession(session.sessionId);

      Log.info(`📥 Imported session: ${session.sessionId}`);
      return session.sessionId;
    } catch (error) {
      throw new Error(`Failed to import session: ${(error as Error).message}`);
    }
  }

  override on(event: SessionEvent, handler: (data: unknown) => void): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add({ event, handler });

    return super.on(event, handler as (...args: any[]) => void);
  }

  private async setupEncryption(): Promise<void> {
    const keyPath = path.join(this.storagePath, '.key');

    try {
      const keyData = await fs.readFile(keyPath);

      if (this.encryptionConfig.keyDerivation === 'pbkdf2') {
        const salt = crypto.randomBytes(16);
        const derivedKey = crypto.pbkdf2Sync(
          keyData,
          salt,
          this.encryptionConfig.iterations,
          32,
          'sha256'
        );
        this.encryptionKey = derivedKey;
      }
    } catch (error) {
      const key = crypto.randomBytes(32);
      await fs.mkdir(this.storagePath, { recursive: true });
      await fs.writeFile(keyPath, key.toString('hex'), 'utf-8');
      this.encryptionKey = key;
    }
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.storagePath, `${sessionId}.json`);
  }

  private async saveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    try {
      const filePath = this.getSessionFilePath(sessionId);
      const data = JSON.stringify(session, null, 2);

      if (this.encryptionConfig.enabled && this.encryptionKey) {
        const encrypted = this.encrypt(data);
        await fs.writeFile(filePath, encrypted, 'utf-8');
      } else {
        await fs.writeFile(filePath, data, 'utf-8');
      }
    } catch (error) {
      Log.error(`Failed to save session ${sessionId}: ${(error as Error).message}`);
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath);

      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          await this.loadSession(path.join(this.storagePath, file));
        }
      }

      Log.info(`📂 Loaded ${this.sessions.size} sessions`);
    } catch (error) {
      Log.warn(`Failed to load sessions: ${(error as Error).message}`);
    }
  }

  private async loadSession(filePath: string): Promise<void> {
    try {
      let data = await fs.readFile(filePath, 'utf-8');

      if (this.encryptionConfig.enabled && this.encryptionKey) {
        data = this.decrypt(data);
      }

      const session: SessionState = JSON.parse(data);

      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.lastActivityAt = new Date(session.lastActivityAt);

      session.messages.forEach(m => {
        m.timestamp = new Date(m.timestamp);
      });

      session.todos.forEach(t => {
        t.createdAt = new Date(t.createdAt);
        t.updatedAt = new Date(t.updatedAt);
      });

      if (session.loop) {
        session.loop.startTime = new Date(session.loop.startTime);
      }

      this.sessions.set(session.sessionId, session);
    } catch (error) {
      Log.warn(`Failed to load session ${filePath}: ${(error as Error).message}`);
    }
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      for (const [sessionId, session] of this.sessions) {
        if (session.status === 'active') {
          await this.saveSession(sessionId);
        }
      }
    }, this.autoSaveInterval);
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const toDelete = Array.from(this.sessions.values()).filter(
      s => s.status === 'completed' && s.lastActivityAt < cutoffDate
    );

    for (const session of toDelete) {
      await this.deleteSession(session.sessionId);
    }

    Log.info(`🧹 Cleaned up ${toDelete.length} old sessions`);
    return toDelete.length;
  }

  async shutdown(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    for (const sessionId of this.sessions.keys()) {
      await this.saveSession(sessionId);
    }

    Log.info('💾 Saved all sessions');
  }
}

export const sessionManager = new SessionManager();

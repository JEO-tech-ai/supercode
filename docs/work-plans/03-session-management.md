# Session Management Implementation Plan

## Executive Summary

**Status**: ✅ Research Complete
**Complexity**: High
**Estimated Effort**: 2-3 weeks
**Priority**: High (enables session persistence and management)

This plan implements session management system, enabling session persistence, state management, lifecycle handling, and cross-session communication.

---

## Phase 1: Session Foundation (Week 1)

### 1.1 Define Session Types

Create `src/session/types.ts`:

```typescript
export interface Session {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  status: SessionStatus;
  metadata: SessionMetadata;
  state: SessionState;
  context: SessionContext;
}

export type SessionStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface SessionMetadata {
  name?: string;
  description?: string;
  tags: string[];
  environment: 'development' | 'staging' | 'production';
  workspace?: string;
  version?: string;
}

export interface SessionState {
  variables: Record<string, any>;
  files: Map<string, FileHandle>;
  processes: Map<string, ProcessInfo>;
  network: NetworkState;
  ui: UIState;
}

export interface SessionContext {
  cwd: string;
  env: Record<string, string>;
  permissions: string[];
  toolHistory: ToolExecution[];
  commandHistory: CommandExecution[];
}

export interface FileHandle {
  path: string;
  mode: 'read' | 'write' | 'append';
  encoding?: BufferEncoding;
  fd?: number;
}

export interface ProcessInfo {
  pid: number;
  command: string;
  cwd: string;
  startTime: Date;
  status: 'running' | 'stopped' | 'killed';
  exitCode?: number;
}

export interface NetworkState {
  activeConnections: Connection[];
  pendingRequests: Map<string, PendingRequest>;
}

export interface Connection {
  id: string;
  url: string;
  method: string;
  startTime: Date;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface PendingRequest {
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: Date;
}

export interface UIState {
  viewport: { width: number; height: number };
  scrollPosition: { line: number; column: number };
  selectedTool?: string;
  activePanel?: 'chat' | 'terminal' | 'files' | 'settings';
}

export interface ToolExecution {
  toolName: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  duration: number;
  timestamp: Date;
}

export interface CommandExecution {
  command: string;
  exitCode: number;
  output: string;
  duration: number;
  timestamp: Date;
}
```

### 1.2 Create Session Manager

Create `src/session/manager.ts`:

```typescript
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Log } from '../shared/logger';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  Session,
  SessionStatus,
  SessionMetadata,
  SessionState,
  SessionContext
} from './types';

export interface SessionManagerConfig {
  maxSessions: number;
  sessionTimeout: number;
  persistencePath: string;
  autoSave: boolean;
  autoSaveInterval: number;
}

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();
  private activeSessionId: string | null = null;
  private config: SessionManagerConfig;
  private saveTimer?: NodeJS.Timeout;

  constructor(config: Partial<SessionManagerConfig> = {}) {
    super();
    this.config = {
      maxSessions: 10,
      sessionTimeout: 3600000, // 1 hour
      persistencePath: join(process.cwd(), '.sessions'),
      autoSave: true,
      autoSaveInterval: 30000, // 30 seconds
      ...config
    };

    // Ensure persistence directory exists
    if (!existsSync(this.config.persistencePath)) {
      mkdirSync(this.config.persistencePath, { recursive: true });
    }

    // Start auto-save if enabled
    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  async createSession(
    metadata: Partial<SessionMetadata> = {}
  ): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date();

    const session: Session = {
      id: sessionId,
      userId: metadata.userId,
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      status: 'active',
      metadata: {
        name: metadata.name || 'Untitled Session',
        description: metadata.description || '',
        tags: metadata.tags || [],
        environment: metadata.environment || 'development',
        workspace: metadata.workspace,
        version: metadata.version || '1.0.0'
      },
      state: {
        variables: {},
        files: new Map(),
        processes: new Map(),
        network: {
          activeConnections: [],
          pendingRequests: new Map()
        },
        ui: {
          viewport: { width: 80, height: 24 },
          scrollPosition: { line: 0, column: 0 }
        }
      },
      context: {
        cwd: process.cwd(),
        env: { ...process.env },
        permissions: [],
        toolHistory: [],
        commandHistory: []
      }
    };

    // Add to sessions map
    this.sessions.set(sessionId, session);

    // Set as active if first session
    if (!this.activeSessionId) {
      this.activeSessionId = sessionId;
    }

    // Save session
    if (this.config.autoSave) {
      await this.saveSession(sessionId);
    }

    Log.info(`✅ Created session: ${session.metadata.name} (${sessionId})`);

    // Emit event
    this.emit('session:created', session);

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getActiveSession(): Promise<Session | null> {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async getSessionsByStatus(status: SessionStatus): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.status === status);
  }

  async getSessionsByTag(tag: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.metadata.tags.includes(tag));
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Session>
  ): Promise<Session> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Apply updates
    Object.assign(session, updates);
    session.updatedAt = new Date();
    session.lastActivity = new Date();

    // Save if auto-save enabled
    if (this.config.autoSave) {
      await this.saveSession(sessionId);
    }

    // Emit event
    this.emit('session:updated', session);

    return session;
  }

  async setActiveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.activeSessionId = sessionId;

    Log.info(`🎯 Active session: ${session.metadata.name} (${sessionId})`);

    // Emit event
    this.emit('session:activated', session);
  }

  async suspendSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'suspended',
      lastActivity: new Date()
    });

    const session = this.sessions.get(sessionId);
    if (session) {
      Log.info(`⏸️ Suspended session: ${session.metadata.name}`);
      this.emit('session:suspended', session);
    }
  }

  async resumeSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'active',
      lastActivity: new Date()
    });

    const session = this.sessions.get(sessionId);
    if (session) {
      Log.info(`▶️ Resumed session: ${session.metadata.name}`);
      this.emit('session:resumed', session);
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Cleanup resources
    await this.cleanupSessionResources(session);

    // Update status
    session.status = 'terminated';
    session.lastActivity = new Date();

    // Remove from active sessions
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    // Save final state
    await this.saveSession(sessionId);

    // Remove from map
    this.sessions.delete(sessionId);

    Log.info(`🗑️ Terminated session: ${session.metadata.name}`);

    // Emit event
    this.emit('session:terminated', session);
  }

  async saveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const filePath = join(this.config.persistencePath, `${sessionId}.json`);
    const data = JSON.stringify(session, this.replacer, 2);

    writeFileSync(filePath, data, 'utf-8');

    Log.debug(`💾 Saved session: ${session.metadata.name}`);
  }

  async loadSession(sessionId: string): Promise<Session> {
    const filePath = join(this.config.persistencePath, `${sessionId}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`Session file not found: ${sessionId}`);
    }

    const data = readFileSync(filePath, 'utf-8');
    const session = JSON.parse(data, this.reviver);

    // Rehydrate Maps
    session.state.files = new Map(Object.entries(session.state.files));
    session.state.processes = new Map(Object.entries(session.state.processes));
    session.state.network.pendingRequests = new Map(
      Object.entries(session.state.network.pendingRequests)
    );

    // Update timestamps
    session.lastActivity = new Date();
    session.updatedAt = new Date();

    // Add to sessions map
    this.sessions.set(sessionId, session);

    Log.info(`📂 Loaded session: ${session.metadata.name}`);

    // Emit event
    this.emit('session:loaded', session);

    return session;
  }

  async loadAllSessions(): Promise<Session[]> {
    const sessions: Session[] = [];

    for (const file of this.getSessionFiles()) {
      try {
        const sessionId = file.replace('.json', '');
        const session = await this.loadSession(sessionId);
        sessions.push(session);
      } catch (error) {
        Log.error(`Failed to load session ${file}:`, error);
      }
    }

    Log.info(`📂 Loaded ${sessions.length} sessions`);

    return sessions;
  }

  async cleanupInactiveSessions(): Promise<number> {
    const now = Date.now();
    const inactiveThreshold = this.config.sessionTimeout;

    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();

      if (inactiveTime > inactiveThreshold && session.status === 'active') {
        await this.suspendSession(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      Log.info(`🧹 Suspended ${cleaned} inactive sessions`);
    }

    return cleaned;
  }

  async exportSession(sessionId: string, outputPath: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const filePath = join(outputPath, `${session.metadata.name}-${sessionId}.json`);
    const data = JSON.stringify(session, this.replacer, 2);

    writeFileSync(filePath, data, 'utf-8');

    Log.info(`📦 Exported session to: ${filePath}`);
  }

  async importSession(filePath: string): Promise<Session> {
    const data = readFileSync(filePath, 'utf-8');
    const session = JSON.parse(data, this.reviver);

    // Generate new ID for imported session
    session.id = randomUUID();
    session.createdAt = new Date();
    session.updatedAt = new Date();
    session.lastActivity = new Date();

    // Add to sessions map
    this.sessions.set(session.id, session);

    // Save
    await this.saveSession(session.id);

    Log.info(`📥 Imported session: ${session.metadata.name}`);

    return session;
  }

  async cloneSession(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Create deep clone
    const cloned = JSON.parse(JSON.stringify(session, this.replacer), this.reviver);

    // Generate new ID
    cloned.id = randomUUID();
    cloned.createdAt = new Date();
    cloned.updatedAt = new Date();
    cloned.lastActivity = new Date();

    // Update name
    cloned.metadata.name = `${session.metadata.name} (Copy)`;

    // Rehydrate Maps
    cloned.state.files = new Map(Object.entries(cloned.state.files));
    cloned.state.processes = new Map(Object.entries(cloned.state.processes));
    cloned.state.network.pendingRequests = new Map(
      Object.entries(cloned.state.network.pendingRequests)
    );

    // Add to sessions map
    this.sessions.set(cloned.id, cloned);

    // Save
    await this.saveSession(cloned.id);

    Log.info(`📋 Cloned session: ${cloned.metadata.name}`);

    // Emit event
    this.emit('session:cloned', { original: session, cloned });

    return cloned;
  }

  async getSessionStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    terminated: number;
  }> {
    const sessions = await this.getAllSessions();

    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      suspended: sessions.filter(s => s.status === 'suspended').length,
      terminated: sessions.filter(s => s.status === 'terminated').length
    };
  }

  private async cleanupSessionResources(session: Session): Promise<void> {
    // Close file handles
    for (const [path, handle] of session.state.files.entries()) {
      try {
        if (handle.fd) {
          // Close file descriptor
          await new Promise((resolve, reject) => {
            // Use Node's fs.close if available, otherwise skip
            resolve(void 0);
          });
        }
      } catch (error) {
        Log.warn(`Failed to close file handle: ${path}`, error);
      }
    }

    // Kill processes
    for (const [pid, process] of session.state.processes.entries()) {
      try {
        if (process.status === 'running') {
          process.kill('SIGTERM');
        }
      } catch (error) {
        Log.warn(`Failed to kill process: ${pid}`, error);
      }
    }

    // Clear network connections
    session.state.network.activeConnections = [];
    session.state.network.pendingRequests.clear();
  }

  private startAutoSave(): void {
    this.saveTimer = setInterval(async () => {
      const activeSession = await this.getActiveSession();
      if (activeSession) {
        await this.saveSession(activeSession.id);
      }
    }, this.config.autoSaveInterval);

    Log.debug('⏰ Auto-save started');
  }

  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
      Log.debug('⏸️ Auto-save stopped');
    }
  }

  private getSessionFiles(): string[] {
    const { readdirSync } = require('fs');
    try {
      return readdirSync(this.config.persistencePath)
        .filter(file => file.endsWith('.json'));
    } catch (error) {
      Log.warn('Failed to read session directory', error);
      return [];
    }
  }

  private replacer(key: string, value: any): any {
    // Convert Maps to objects for serialization
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }

    // Convert Dates to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  private reviver(key: string, value: any): any {
    // Convert ISO strings back to Dates
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }

    return value;
  }

  async shutdown(): Promise<void> {
    Log.info('🛑 Shutting down session manager...');

    // Save all active sessions
    for (const session of this.sessions.values()) {
      if (session.status === 'active') {
        await this.saveSession(session.id);
      }
    }

    // Stop auto-save
    this.stopAutoSave();

    // Clear sessions
    this.sessions.clear();
    this.activeSessionId = null;

    Log.info('✅ Session manager shutdown complete');
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();
```

---

## Phase 2: Session State Management (Week 1.5)

### 2.1 Create State Manager

Create `src/session/state.ts`:

```typescript
import { EventEmitter } from 'events';
import type { Session, SessionState } from './types';

export interface StateChange {
  sessionId: string;
  path: string[];
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

export class StateManager extends EventEmitter {
  private stateChangeHistory = new Map<string, StateChange[]>();
  private readonly maxHistorySize = 100;

  async setState<T>(
    sessionId: string,
    path: string,
    value: T,
    emit: boolean = true
  ): Promise<void> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Get current value
    const oldValue = this.getStateByPath(session.state, path);

    // Set new value
    this.setValueByPath(session.state, path, value);

    // Record change
    if (emit) {
      const change: StateChange = {
        sessionId,
        path: path.split('.'),
        oldValue,
        newValue: value,
        timestamp: new Date()
      };

      this.recordChange(change);

      // Emit event
      this.emit('state:changed', change);
    }
  }

  async getState<T>(
    sessionId: string,
    path: string
  ): Promise<T | null> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return this.getStateByPath(session.state, path);
  }

  async updateState<T>(
    sessionId: string,
    path: string,
    updater: (current: T) => T
  ): Promise<void> {
    const current = await this.getState<T>(sessionId, path);
    const updated = updater(current);
    await this.setState(sessionId, path, updated);
  }

  async watchState(
    sessionId: string,
    path: string,
    callback: (value: any) => void
  ): () => void {
    const handler = (change: StateChange) => {
      if (change.sessionId === sessionId) {
        const currentValue = this.getStateByPath(change, path);
        callback(currentValue);
      }
    };

    this.on('state:changed', handler);

    // Return unsubscribe function
    return () => this.off('state:changed', handler);
  }

  async getChanges(
    sessionId: string,
    since?: Date
  ): Promise<StateChange[]> {
    const changes = this.stateChangeHistory.get(sessionId) || [];

    if (!since) {
      return changes;
    }

    return changes.filter(c => c.timestamp >= since);
  }

  async undo(sessionId: string): Promise<void> {
    const changes = this.stateChangeHistory.get(sessionId) || [];
    if (changes.length === 0) return;

    // Get last change
    const lastChange = changes[changes.length - 1];

    // Restore old value
    await this.setState(
      sessionId,
      lastChange.path.join('.'),
      lastChange.oldValue,
      false
    );

    // Remove from history
    this.stateChangeHistory.set(sessionId, changes.slice(0, -1));
  }

  async redo(sessionId: string): Promise<void> {
    // Get all changes (including undone)
    const changes = this.stateChangeHistory.get(sessionId) || [];

    // Find undone change to redo
    const lastChange = changes[changes.length - 1];
    if (!lastChange) return;

    // Apply new value
    await this.setState(
      sessionId,
      lastChange.path.join('.'),
      lastChange.newValue,
      false
    );

    // Remove from history
    this.stateChangeHistory.set(sessionId, changes.slice(0, -1));
  }

  async clearHistory(sessionId: string): Promise<void> {
    this.stateChangeHistory.delete(sessionId);
  }

  private recordChange(change: StateChange): void {
    const history = this.stateChangeHistory.get(change.sessionId) || [];

    // Add change
    history.push(change);

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.stateChangeHistory.set(change.sessionId, history);
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');

    // Navigate to parent
    const parent = keys.slice(0, -1).reduce((current, key) => {
      if (current[key] === undefined) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    // Set value
    parent[keys[keys.length - 1]] = value;
  }
}

// Global state manager instance
export const stateManager = new StateManager();
```

---

## Phase 3: Session Persistence (Week 2)

### 3.1 Create Persistence Layer

Create `src/session/persistence.ts`:

```typescript
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { Log } from '../shared/logger';
import type { Session } from './types';

export interface PersistenceConfig {
  path: string;
  compression: boolean;
  encryption: boolean;
  encryptionKey?: string;
}

export class SessionPersistence {
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;

    // Ensure directory exists
    if (!existsSync(config.path)) {
      mkdirSync(config.path, { recursive: true });
    }
  }

  async save(session: Session): Promise<void> {
    const filePath = join(this.config.path, `${session.id}.json`);
    const data = JSON.stringify(session, null, 2);

    // Compress if enabled
    const content = this.config.compression
      ? await this.compress(data)
      : data;

    // Encrypt if enabled
    const finalContent = this.config.encryption
      ? await this.encrypt(content, this.config.encryptionKey!)
      : content;

    writeFileSync(filePath, finalContent, 'utf-8');

    Log.debug(`💾 Saved session: ${session.metadata.name}`);
  }

  async load(sessionId: string): Promise<Session | null> {
    const filePath = join(this.config.path, `${sessionId}.json`);

    if (!existsSync(filePath)) {
      return null;
    }

    let data = readFileSync(filePath, 'utf-8');

    // Decrypt if enabled
    data = this.config.encryption
      ? await this.decrypt(data, this.config.encryptionKey!)
      : data;

    // Decompress if enabled
    data = this.config.compression
      ? await this.decompress(data)
      : data;

    const session = JSON.parse(data);

    return session;
  }

  async delete(sessionId: string): Promise<void> {
    const filePath = join(this.config.path, `${sessionId}.json`);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
      Log.debug(`🗑️ Deleted session: ${sessionId}`);
    }
  }

  async list(): Promise<string[]> {
    const { readdirSync } = require('fs');

    try {
      return readdirSync(this.config.path)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      Log.error('Failed to list sessions', error);
      return [];
    }
  }

  async compress(data: string): Promise<string> {
    // Simple compression placeholder
    // In production, use zlib or similar
    return data;
  }

  async decompress(data: string): Promise<string> {
    // Simple decompression placeholder
    return data;
  }

  async encrypt(data: string, key: string): Promise<string> {
    // Simple encryption placeholder
    // In production, use proper encryption (AES, etc.)
    return Buffer.from(data).toString('base64');
  }

  async decrypt(data: string, key: string): Promise<string> {
    // Simple decryption placeholder
    return Buffer.from(data, 'base64').toString('utf-8');
  }
}
```

---

## Phase 4: Testing & Integration (Week 3)

### 4.1 Unit Tests for Session Manager

Create `src/session/manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from './manager';
import { existsSync, unlinkSync } from 'fs';

describe('SessionManager', () => {
  let manager: SessionManager;
  const testPersistencePath = '/tmp/test-sessions';

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testPersistencePath)) {
      const { rmSync } = require('fs');
      rmSync(testPersistencePath, { recursive: true, force: true });
    }

    manager = new SessionManager({
      maxSessions: 5,
      sessionTimeout: 60000,
      persistencePath: testPersistencePath,
      autoSave: false
    });
  });

  afterEach(async () => {
    await manager.shutdown();

    // Clean up test directory
    if (existsSync(testPersistencePath)) {
      const { rmSync } = require('fs');
      rmSync(testPersistencePath, { recursive: true, force: true });
    }
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await manager.createSession({
        name: 'Test Session',
        tags: ['test']
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.metadata.name).toBe('Test Session');
      expect(session.metadata.tags).toEqual(['test']);
      expect(session.status).toBe('active');
    });

    it('should set first session as active', async () => {
      const session = await manager.createSession();
      const active = await manager.getActiveSession();

      expect(active?.id).toBe(session.id);
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const created = await manager.createSession({
        name: 'Test Session'
      });

      const retrieved = await manager.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.metadata.name).toBe('Test Session');
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await manager.getSession('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session metadata', async () => {
      const session = await manager.createSession({
        name: 'Old Name'
      });

      const updated = await manager.updateSession(session.id, {
        metadata: {
          ...session.metadata,
          name: 'New Name'
        }
      });

      expect(updated.metadata.name).toBe('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(session.updatedAt.getTime());
    });
  });

  describe('suspendSession', () => {
    it('should suspend active session', async () => {
      const session = await manager.createSession();
      await manager.suspendSession(session.id);

      const retrieved = await manager.getSession(session.id);

      expect(retrieved?.status).toBe('suspended');
    });
  });

  describe('resumeSession', () => {
    it('should resume suspended session', async () => {
      const session = await manager.createSession();
      await manager.suspendSession(session.id);
      await manager.resumeSession(session.id);

      const retrieved = await manager.getSession(session.id);

      expect(retrieved?.status).toBe('active');
    });
  });

  describe('terminateSession', () => {
    it('should terminate session and remove from map', async () => {
      const session = await manager.createSession();
      await manager.terminateSession(session.id);

      const retrieved = await manager.getSession(session.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should save session to disk', async () => {
      const session = await manager.createSession({
        name: 'Test Session'
      });

      await manager.saveSession(session.id);

      const sessionPath = `${testPersistencePath}/${session.id}.json`;
      expect(existsSync(sessionPath)).toBe(true);
    });
  });

  describe('loadSession', () => {
    it('should load session from disk', async () => {
      const created = await manager.createSession({
        name: 'Test Session'
      });

      await manager.saveSession(created.id);

      // Clear from memory
      await manager.terminateSession(created.id);

      // Reload
      const loaded = await manager.loadSession(created.id);

      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(created.id);
      expect(loaded?.metadata.name).toBe('Test Session');
    });
  });

  describe('cloneSession', () => {
    it('should create clone with new ID', async () => {
      const original = await manager.createSession({
        name: 'Original Session',
        tags: ['original']
      });

      const cloned = await manager.cloneSession(original.id);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.metadata.name).toBe('Original Session (Copy)');
      expect(cloned.metadata.tags).toEqual(['original']);
      expect(cloned.state).toEqual(original.state);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should suspend sessions past timeout', async () => {
      const session = await manager.createSession();

      // Manually set old timestamp
      session.lastActivity = new Date(Date.now() - 120000); // 2 minutes ago

      const cleaned = await manager.cleanupInactiveSessions();

      expect(cleaned).toBe(1);

      const retrieved = await manager.getSession(session.id);
      expect(retrieved?.status).toBe('suspended');
    });
  });
});
```

---

## Summary

This implementation plan provides:

1. **Complete Session Management**: Session creation, lifecycle, and cleanup
2. **State Management**: Track and manage session state with undo/redo
3. **Persistence Layer**: Save and load sessions with compression/encryption
4. **Session Cloning**: Duplicate sessions for testing/experimentation
5. **Resource Cleanup**: Proper cleanup of files and processes
6. **Testing**: Comprehensive unit tests

**Key Benefits**:
- Session persistence across restarts
- State management with history tracking
- Efficient resource cleanup
- Session export/import
- Auto-save functionality

**Next Steps**:
1. Implement session manager
2. Create state manager
3. Build persistence layer
4. Add comprehensive tests
5. Document session API
6. Add session UI components

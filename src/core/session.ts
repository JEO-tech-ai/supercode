import type { Session, SessionMessage } from "./types";

export interface ISessionManager {
  create(workdir: string, model: string): Session;
  get(id: string): Session | undefined;
  getCurrent(): Session | undefined;
  setCurrent(id: string): boolean;
  addMessage(sessionId: string, message: Omit<SessionMessage, "timestamp">): void;
  getMessages(sessionId: string): SessionMessage[];
  end(id: string): boolean;
  list(): Session[];
  clear(): void;
}

class SessionManager implements ISessionManager {
  private sessions: Map<string, Session> = new Map();
  private currentSessionId: string | null = null;

  create(workdir: string, model: string): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      startedAt: new Date(),
      workdir,
      model,
      messages: [],
    };

    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getCurrent(): Session | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessions.get(this.currentSessionId);
  }

  setCurrent(id: string): boolean {
    if (!this.sessions.has(id)) return false;
    this.currentSessionId = id;
    return true;
  }

  addMessage(sessionId: string, message: Omit<SessionMessage, "timestamp">): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({
        ...message,
        timestamp: new Date(),
      });
    }
  }

  getMessages(sessionId: string): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  end(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }

    this.sessions.delete(id);
    return true;
  }

  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  clear(): void {
    this.sessions.clear();
    this.currentSessionId = null;
  }
}

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): ISessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

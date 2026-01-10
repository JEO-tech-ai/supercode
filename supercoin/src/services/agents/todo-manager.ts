import type { Todo, TaskStatus } from "./types";

export interface ITodoManager {
  create(input: { sessionId: string; content: string; priority?: "high" | "medium" | "low" }): Promise<Todo>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
  get(id: string): Todo | undefined;
  list(sessionId?: string): Todo[];
  listPending(sessionId?: string): Todo[];
  hasPending(sessionId?: string): boolean;
  clear(sessionId?: string): void;
  // New: Support bulk update from todowrite tool
  setTodos(sessionId: string, todos: Todo[]): void;
}

class TodoManager implements ITodoManager {
  private todos: Map<string, Todo> = new Map();

  async create(input: { sessionId: string; content: string; priority?: "high" | "medium" | "low" }): Promise<Todo> {
    const todo: Todo = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      content: input.content,
      status: "pending",
      priority: input.priority || "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.todos.set(todo.id, todo);
    return todo;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const todo = this.todos.get(id);
    if (todo) {
      todo.status = status;
      todo.updatedAt = new Date();
    }
  }

  get(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  list(sessionId?: string): Todo[] {
    const allTodos = Array.from(this.todos.values());
    if (sessionId) {
      return allTodos.filter((t) => t.sessionId === sessionId);
    }
    return allTodos;
  }

  listPending(sessionId?: string): Todo[] {
    return this.list(sessionId).filter((t) => t.status === "pending" || t.status === "in_progress");
  }

  hasPending(sessionId?: string): boolean {
    return this.listPending(sessionId).length > 0;
  }

  clear(sessionId?: string): void {
    if (sessionId) {
      const toDelete = this.list(sessionId).map((t) => t.id);
      for (const id of toDelete) {
        this.todos.delete(id);
      }
    } else {
      this.todos.clear();
    }
  }

  setTodos(sessionId: string, todos: Todo[]): void {
    this.clear(sessionId);
    for (const todo of todos) {
      this.todos.set(todo.id, { ...todo, sessionId });
    }
  }
}

let todoManagerInstance: TodoManager | null = null;

export function getTodoManager(): ITodoManager {
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
  }
  return todoManagerInstance;
}

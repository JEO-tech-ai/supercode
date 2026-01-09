import type { Todo, TaskStatus } from "./types";

export interface ITodoManager {
  create(input: { content: string; priority?: "high" | "medium" | "low" }): Promise<Todo>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
  get(id: string): Todo | undefined;
  list(): Todo[];
  listPending(): Todo[];
  hasPending(): boolean;
  clear(): void;
}

class TodoManager implements ITodoManager {
  private todos: Map<string, Todo> = new Map();

  async create(input: { content: string; priority?: "high" | "medium" | "low" }): Promise<Todo> {
    const todo: Todo = {
      id: crypto.randomUUID(),
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

  list(): Todo[] {
    return Array.from(this.todos.values());
  }

  listPending(): Todo[] {
    return this.list().filter((t) => t.status === "pending" || t.status === "in_progress");
  }

  hasPending(): boolean {
    return this.listPending().length > 0;
  }

  clear(): void {
    this.todos.clear();
  }
}

let todoManagerInstance: TodoManager | null = null;

export function getTodoManager(): ITodoManager {
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
  }
  return todoManagerInstance;
}

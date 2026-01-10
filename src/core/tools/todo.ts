import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import { getTodoManager } from "../../services/agents/todo-manager";
import type { Todo, TaskStatus } from "../../services/agents/types";

export const TodoWriteTool: ToolDefinition = {
  name: "todowrite",
  description: "Use this tool to create or update your todo list. Provide an array of todo items with content, status, priority, and id. This allows the agent to track progress and work continuously until all tasks are completed.",
  parameters: [
    {
      name: "todos",
      type: "array",
      description: "Array of todo items. Each item should have: content (brief description), status (pending|in_progress|completed|cancelled), priority (high|medium|low), id (unique identifier)",
      required: true,
    },
  ],
  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      const todoManager = getTodoManager();
      const todosArray = args.todos as Array<{ content: string; status: string; priority: string; id: string }>;

      // Convert array format to Todo format
      const todoItems: Todo[] = todosArray.map((item) => ({
        id: item.id || crypto.randomUUID(),
        sessionId: context.sessionId,
        content: item.content,
        status: item.status as TaskStatus,
        priority: item.priority as "high" | "medium" | "low",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Use new setTodos method to replace entire list
      todoManager.setTodos(context.sessionId, todoItems);

      const pending = todoManager.listPending();

      return {
        success: true,
        output: `Todo list updated with ${todosArray.length} items. ${pending.length} tasks remaining.`,
        data: todoItems,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

export const TodoReadTool: ToolDefinition = {
  name: "todoread",
  description: "Use this tool to read your current todo list and see task progress. This helps track what tasks are pending, in progress, or completed.",
  parameters: [],
  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    try {
      const todoManager = getTodoManager();
      const todos = todoManager.list();
      const pending = todoManager.listPending();

      // Format todos for LLM
      const formatted = todos
        .map((todo) => {
          const statusIcon = todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "→" : todo.status === "failed" ? "✗" : "○";
          return `${statusIcon} [${todo.priority}] ${todo.content} (${todo.status})`;
        })
        .join("\n");

      return {
        success: true,
        output: `Current todo list (${pending.length} pending, ${todos.length} total):\n${formatted}`,
        data: todos,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

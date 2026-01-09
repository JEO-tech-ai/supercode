import type { Hook, HookContext } from "../types";
import { getTodoManager } from "../../services/agents/todo-manager";

export const todoContinuationHook: Hook = {
  name: "todo-continuation",
  events: ["session.idle"],
  priority: 10,

  async handler(context: HookContext) {
    const todoManager = getTodoManager();

    if (todoManager.hasPending()) {
      const pending = todoManager.listPending();

      return {
        continue: true,
        prompt: `There are ${pending.length} pending tasks:\n${pending.map((t) => `- ${t.content}`).join("\n")}\n\nPlease continue working on the next pending task.`,
      };
    }

    return { continue: false };
  },
};

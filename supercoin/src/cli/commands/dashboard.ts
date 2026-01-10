import * as clack from "@clack/prompts";
import { getTodoManager } from "../../services/agents/todo-manager";
import { getSessionManager } from "../../core/session";

export async function createDashboardCommand() {
  return {
    name: "dashboard",
    description: "Show agent status dashboard",
    async action() {
      await runDashboard();
    },
  };
}

async function runDashboard() {
  const currentSession = getSessionManager().get();
  const todoManager = getTodoManager();

  clack.intro("📊 SuperCoin Agent Dashboard");
  console.log();

  // Get current todos
  const todos = todoManager.list();
  const pending = todoManager.listPending();

  // Display todo summary
  clack.note(`Todo Progress (${pending.length} pending)`, "Summary");
  
  if (pending.length === 0) {
    console.log("  ✅ No pending tasks");
  } else {
    pending.forEach((todo) => {
      const statusIcon = todo.status === "in_progress" ? "🔄" : "○";
      const priorityBadge = todo.priority === "high" ? "🔴" : todo.priority === "medium" ? "🟡" : "🟢";
      console.log(`  ${statusIcon} ${priorityBadge} ${todo.content}`);
    });
  }

  console.log();

  const action = await clack.select({
    message: "What would you like to do?",
    options: [
      { value: "refresh", label: "🔄 Refresh" },
      { value: "exit", label: "✋ Exit" },
    ],
  });

  if (clack.isCancel(action)) {
    clack.cancel("Operation cancelled");
    return;
  }

  if (action === "refresh") {
    await runDashboard();
  }
}

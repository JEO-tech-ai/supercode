/**
 * Dashboard Command
 * Show agent status and progress dashboard
 */
import { Command } from "commander";
import * as clack from "@clack/prompts";
import type { SuperCoinConfig } from "../../config/schema";
import { getTodoManager } from "../../services/agents/todo-manager";
import { getSessionManager } from "../../core/session";

export function createDashboardCommand(config: SuperCoinConfig): Command {
  const dashboard = new Command("dashboard")
    .description("Show agent status dashboard")
    .option("--json", "Output as JSON")
    .action(async function(this: Command) {
      const options = this.optsWithGlobals();
      if (options.json) {
        const todoManager = getTodoManager();
        const todos = todoManager.list();
        console.log(JSON.stringify({ todos }, null, 2));
        return;
      }
      await runDashboard();
    });

  return dashboard;
}

async function runDashboard() {
  const currentSession = getSessionManager().getCurrent();
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

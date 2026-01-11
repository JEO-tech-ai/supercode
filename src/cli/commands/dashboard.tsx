import React from "react";
import { Command } from "commander";
import { render } from "ink";
import type { SuperCoinConfig } from "../../config/schema";
import { getTodoManager } from "../../services/agents/todo-manager";
import { sessionManager } from "../../core/session/manager";
import { LiveDashboard } from "../components/LiveDashboard";

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
      render(<LiveDashboard />);
    });

  return dashboard;
}

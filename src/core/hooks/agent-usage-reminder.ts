/**
 * Agent Usage Reminder Hook
 * Reminds to use specialized agents instead of direct tool calls.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface AgentUsageReminderOptions {
  /** Minimum direct tool calls before reminder */
  toolCallThreshold?: number;
  /** Agent recommendations by tool type */
  recommendations?: Record<string, string[]>;
  /** Debug mode */
  debug?: boolean;
}

interface UsageStats {
  toolCalls: Map<string, number>;
  agentCalls: Map<string, number>;
  remindersSent: number;
}

const usageStats = new Map<string, UsageStats>();

const DEFAULT_RECOMMENDATIONS: Record<string, string[]> = {
  grep: ["explorer", "librarian"],
  glob: ["explorer"],
  read: ["explorer", "librarian"],
  bash: ["executor"],
  WebFetch: ["librarian"],
  WebSearch: ["librarian"],
};

/**
 * Get or create usage stats for a session
 */
function getStats(sessionId: string): UsageStats {
  let stats = usageStats.get(sessionId);
  if (!stats) {
    stats = {
      toolCalls: new Map(),
      agentCalls: new Map(),
      remindersSent: 0,
    };
    usageStats.set(sessionId, stats);
  }
  return stats;
}

/**
 * Create agent usage reminder hook
 */
export function createAgentUsageReminderHook(
  options: AgentUsageReminderOptions = {}
): Hook {
  const {
    toolCallThreshold = 5,
    recommendations = DEFAULT_RECOMMENDATIONS,
    debug = false,
  } = options;

  return {
    name: "agent-usage-reminder",
    description: "Reminds to use specialized agents for complex operations",
    events: ["tool.after"],

    async handler(context: HookContext): Promise<HookResult> {
      const { sessionId, toolName } = context;

      if (!toolName) {
        return { action: "continue" };
      }

      const stats = getStats(sessionId);

      // Track tool usage
      const currentCount = stats.toolCalls.get(toolName) || 0;
      stats.toolCalls.set(toolName, currentCount + 1);

      // Check if we should send a reminder
      const recommendedAgents = recommendations[toolName];
      if (!recommendedAgents || recommendedAgents.length === 0) {
        return { action: "continue" };
      }

      const totalCalls = stats.toolCalls.get(toolName) || 0;
      if (totalCalls < toolCallThreshold) {
        return { action: "continue" };
      }

      // Only send one reminder per session per tool
      const reminderKey = `${toolName}_reminded`;
      if ((stats as Record<string, unknown>)[reminderKey]) {
        return { action: "continue" };
      }
      (stats as Record<string, unknown>)[reminderKey] = true;
      stats.remindersSent++;

      if (debug) {
        console.log(`[agent-usage-reminder] Sending reminder for ${toolName}`);
      }

      const agentList = recommendedAgents.join(", ");

      return {
        action: "continue",
        modified: true,
        appendMessage: `
<system-reminder>
You've made ${totalCalls} ${toolName} calls. Consider using specialized agents for better results:

Recommended agents: ${agentList}

Benefits of using agents:
- Agents have domain expertise and optimized prompts
- They can handle complex multi-step operations
- Background agents enable parallel execution
- Agents provide structured, consistent results

Example: Instead of multiple grep calls, use the explorer agent for comprehensive search.
</system-reminder>
`,
      };
    },
  };
}

/**
 * Get usage stats for a session
 */
export function getUsageStats(sessionId: string): UsageStats | undefined {
  return usageStats.get(sessionId);
}

/**
 * Clear usage stats for a session
 */
export function clearUsageStats(sessionId: string): void {
  usageStats.delete(sessionId);
}

/**
 * Get all usage stats
 */
export function getAllUsageStats(): Map<string, UsageStats> {
  return new Map(usageStats);
}

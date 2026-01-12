/**
 * Compaction Context Injector Hook
 * Injects context and instructions when session compaction is triggered.
 */

import type { Hook, HookContext, HookResult } from "./types";

export interface CompactionContextInjectorOptions {
  /** Custom instructions for compaction */
  customInstructions?: string;
  /** Include active todos */
  includeTodos?: boolean;
  /** Include tool stats */
  includeToolStats?: boolean;
  /** Debug mode */
  debug?: boolean;
}

const DEFAULT_COMPACTION_INSTRUCTIONS = `
## Context Compaction Guidelines

You are about to compact the conversation context. Follow these guidelines:

### What to Preserve
1. **Current Task State**: All active todos and their status
2. **Key Decisions**: Important architectural or implementation choices made
3. **File Context**: Which files have been read/modified and why
4. **Error History**: Critical errors encountered and their resolutions
5. **User Preferences**: Any stated preferences or constraints

### What to Summarize
1. Exploratory searches that led to conclusions
2. Intermediate steps in multi-step operations
3. Verbose tool outputs (keep key findings only)
4. Back-and-forth clarifications (keep final decision)

### What to Omit
1. Redundant file contents already addressed
2. Failed approaches that were abandoned
3. Verbose debug output
4. Repeated patterns or similar operations

### Format
Provide a structured summary with:
- **Current State**: What we're working on
- **Progress**: What's been accomplished
- **Next Steps**: What remains to be done
- **Key Context**: Critical information that must be retained
`;

/**
 * Create compaction context injector hook
 */
export function createCompactionContextInjectorHook(
  options: CompactionContextInjectorOptions = {}
): Hook {
  const {
    customInstructions = DEFAULT_COMPACTION_INSTRUCTIONS,
    includeTodos = true,
    includeToolStats = true,
    debug = false,
  } = options;

  return {
    name: "compaction-context-injector",
    description: "Injects context and instructions for session compaction",
    events: ["session.compacting", "context.compacting"],

    async handler(context: HookContext): Promise<HookResult> {
      const { sessionId, todos, toolStats } = context;

      if (debug) {
        console.log(`[compaction-context-injector] Compacting session ${sessionId}`);
      }

      const sections: string[] = [customInstructions];

      // Include active todos
      if (includeTodos && todos && Array.isArray(todos) && todos.length > 0) {
        const todoList = todos
          .map((t: { content: string; status: string }) => `- [${t.status}] ${t.content}`)
          .join("\n");

        sections.push(`
### Active Todos
${todoList}
`);
      }

      // Include tool stats
      if (includeToolStats && toolStats && typeof toolStats === "object") {
        const stats = toolStats as Record<string, number>;
        const statsList = Object.entries(stats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([tool, count]) => `- ${tool}: ${count} calls`)
          .join("\n");

        sections.push(`
### Tool Usage Summary
${statsList}
`);
      }

      return {
        action: "continue",
        modified: true,
        prependContext: sections.join("\n"),
      };
    },
  };
}

/**
 * Get default compaction instructions
 */
export function getDefaultCompactionInstructions(): string {
  return DEFAULT_COMPACTION_INSTRUCTIONS;
}

import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import { toolRegistry } from "../../tools/registry";

const DISALLOWED_TOOLS = new Set(["batch"]);
const MAX_PARALLEL_CALLS = 10;

const DESCRIPTION = `Execute multiple tool calls in parallel for better performance.

Usage:
- Provide an array of tool calls, each with 'tool' (name) and 'parameters'
- Up to 10 tools can be executed in parallel
- The 'batch' tool cannot be called recursively
- External tools (MCP, environment) cannot be batched - call them directly

Example:
  tool_calls: [
    { "tool": "read", "parameters": { "filePath": "file1.ts" } },
    { "tool": "read", "parameters": { "filePath": "file2.ts" } }
  ]`;

interface ToolCall {
  tool: string;
  parameters: Record<string, unknown>;
}

interface BatchResult {
  tool: string;
  success: boolean;
  result?: ToolResult;
  error?: string;
}

export const batchTool: ToolDefinition = {
  name: "batch",
  description: DESCRIPTION,
  parameters: [
    {
      name: "tool_calls",
      type: "array",
      description: "Array of tool calls to execute in parallel",
      required: true,
    },
  ],

  async execute(
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const toolCalls = args.tool_calls as ToolCall[];

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return {
        success: false,
        error: "tool_calls must be a non-empty array",
      };
    }

    const callsToExecute = toolCalls.slice(0, MAX_PARALLEL_CALLS);
    const discardedCalls = toolCalls.slice(MAX_PARALLEL_CALLS);

    const executeCall = async (call: ToolCall): Promise<BatchResult> => {
      try {
        if (DISALLOWED_TOOLS.has(call.tool)) {
          throw new Error(
            `Tool '${call.tool}' is not allowed in batch. Disallowed tools: ${Array.from(DISALLOWED_TOOLS).join(", ")}`
          );
        }

        const toolSchema = toolRegistry.get(call.tool);
        if (!toolSchema) {
          const availableTools = toolRegistry
            .getAll()
            .map((t) => t.name)
            .filter((name) => !DISALLOWED_TOOLS.has(name));
          throw new Error(
            `Tool '${call.tool}' not found. Available tools: ${availableTools.join(", ")}`
          );
        }

        const implementation = (toolRegistry as unknown as { toolCache: Map<string, Function> }).toolCache?.get(call.tool);
        if (!implementation) {
          throw new Error(`Tool '${call.tool}' has no implementation registered`);
        }

        const result = await implementation(call.parameters, context);

        return {
          tool: call.tool,
          success: true,
          result,
        };
      } catch (error) {
        return {
          tool: call.tool,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };

    const results = await Promise.all(callsToExecute.map(executeCall));

    for (const call of discardedCalls) {
      results.push({
        tool: call.tool,
        success: false,
        error: `Maximum of ${MAX_PARALLEL_CALLS} tools allowed in batch`,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    const outputMessage =
      failCount > 0
        ? `Executed ${successCount}/${results.length} tools successfully. ${failCount} failed.`
        : `All ${successCount} tools executed successfully.\n\nKeep using the batch tool for optimal performance!`;

    const detailedResults = results.map((r) => ({
      tool: r.tool,
      success: r.success,
      output: r.success ? r.result?.output : undefined,
      error: r.success ? undefined : r.error,
    }));

    return {
      success: failCount === 0,
      output: outputMessage,
      data: {
        totalCalls: results.length,
        successful: successCount,
        failed: failCount,
        tools: toolCalls.map((c) => c.tool),
        results: detailedResults,
      },
    };
  },
};

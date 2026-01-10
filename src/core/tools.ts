import type { ToolDefinition, ToolContext, ToolResult } from "./types";

export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  unregister(name: string): boolean;
  get(name: string): ToolDefinition | undefined;
  execute(name: string, args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  list(): ToolDefinition[];
  listNames(): string[];
}

class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}` };
    }

    try {
      return await tool.execute(args, context);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

let toolRegistryInstance: ToolRegistry | null = null;

export function getToolRegistry(): IToolRegistry {
  if (!toolRegistryInstance) {
    toolRegistryInstance = new ToolRegistry();
  }
  return toolRegistryInstance;
}

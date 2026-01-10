import { toolRegistry } from '../../tools/registry';
import { getToolRegistry as getCoreToolRegistry } from '../tools';
import { bashTool } from './bash';
import { readTool, writeTool, editTool } from './file';
import { grepTool, globTool } from './search';
import { TodoWriteTool, TodoReadTool } from './todo';
import { Log } from '../../shared/logger';
import type { ToolDefinition } from '../types';

function getToolRegistry() {
  return toolRegistry;
}

function convertToToolSchema(toolDef: ToolDefinition, category: any = 'custom') {
  return {
    name: toolDef.name,
    description: toolDef.description,
    category,
    parameters: toolDef.parameters.map(p => ({
      name: p.name,
      type: p.type as any,
      description: p.description,
      required: p.required || false,
      default: p.default,
    })),
    returns: { type: 'any', description: 'Tool result' },
    examples: [],
    requiresAuth: false,
    requiresPermission: [],
    timeout: 30000,
  };
}

function inferCategory(toolName: string): any {
  const nameLower = toolName.toLowerCase();

  if (nameLower.includes('bash') || nameLower.includes('terminal') || nameLower.includes('command')) {
    return 'terminal';
  }

  if (nameLower.includes('read') || nameLower.includes('write') || nameLower.includes('edit') || nameLower.includes('file')) {
    return 'file';
  }

  if (nameLower.includes('grep') || nameLower.includes('glob') || nameLower.includes('search')) {
    return 'file';
  }

  if (nameLower.includes('todo')) {
    return 'system';
  }

  return 'custom';
}

export function initializeTools(): void {
  const registry = getToolRegistry();
  const coreRegistry = getCoreToolRegistry();

  const tools = [
    { tool: bashTool },
    { tool: readTool },
    { tool: writeTool },
    { tool: editTool },
    { tool: grepTool },
    { tool: globTool },
    { tool: TodoWriteTool },
    { tool: TodoReadTool },
  ];

  tools.forEach(({ tool }) => {
    try {
      const category = inferCategory(tool.name);
      const schema = convertToToolSchema(tool, category);

      // Register to advanced registry (from work plan)
      registry.register(schema, tool.execute);
      
      // Also register to core registry (for tests and backwards compatibility)
      coreRegistry.register(tool);
      
      Log.info(`✅ Registered tool: ${tool.name} (${category})`);
    } catch (error) {
      Log.error(`Failed to register tool ${tool.name}: ${(error as Error).message}`);
    }
  });
}

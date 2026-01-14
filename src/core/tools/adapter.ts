import { toolRegistry } from '../../tools/registry';
import { getToolRegistry as getCoreToolRegistry } from '../tools';
import { bashTool } from './bash';
import { readTool, writeTool, editTool } from './file';
import { grepTool, globTool } from './search';
import { TodoWriteTool, TodoReadTool } from './todo';
import { webfetchTool } from './webfetch';
import { batchTool } from './batch';
import { lspTools } from './lsp';
import { astGrepTools } from './ast-grep';
import { Log } from '../../shared/logger';
import type { ToolDefinition } from '../types';
import type { ToolSchema, ToolCategory, ParameterType } from '../../tools/types';

function getToolRegistry() {
  return toolRegistry;
}

function convertToToolSchema(toolDef: ToolDefinition, category: ToolCategory = 'custom'): ToolSchema {
  return {
    name: toolDef.name,
    description: toolDef.description,
    category,
    parameters: toolDef.parameters.map(p => ({
      name: p.name,
      type: p.type as ParameterType,
      description: p.description,
      required: p.required || false,
      default: p.default,
    })),
    returns: { type: 'any' as ParameterType, description: 'Tool result' },
    examples: [],
    requiresAuth: false,
    requiresPermission: [],
    timeout: 30000,
  };
}

function inferCategory(toolName: string): ToolCategory {
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

  if (nameLower.includes('webfetch') || nameLower.includes('fetch')) {
    return 'network';
  }

  if (nameLower.includes('batch')) {
    return 'system';
  }

  if (nameLower.startsWith('lsp_')) {
    return 'code';
  }

  if (nameLower.startsWith('ast_grep')) {
    return 'code';
  }

  return 'custom';
}

export function initializeTools(): void {
  const registry = getToolRegistry();
  const coreRegistry = getCoreToolRegistry();

  const coreTools: ToolDefinition[] = [
    bashTool,
    readTool,
    writeTool,
    editTool,
    grepTool,
    globTool,
    TodoWriteTool,
    TodoReadTool,
    webfetchTool,
    batchTool,
  ];

  // Combine all tools: core + LSP (11) + AST-Grep (3)
  const allTools: ToolDefinition[] = [
    ...coreTools,
    ...lspTools,
    ...astGrepTools,
  ];

  allTools.forEach((tool) => {
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

  Log.info(`📦 Initialized ${allTools.length} tools (${coreTools.length} core, ${lspTools.length} LSP, ${astGrepTools.length} AST-Grep)`);
}

import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../shared/logger';
import type { ToolSchema, ToolDefinition } from './types';
import { toolRegistry } from './registry';

function getToolRegistry() {
  return toolRegistry;
}

interface DiscoveredTool {
  schema: ToolSchema;
  implementation: Function;
  filePath: string;
}

export class ToolDiscovery {
  private discoveredTools = new Map<string, DiscoveredTool>();
  private scanPaths: string[] = [];

  constructor(scanPaths: string[] = []) {
    this.scanPaths = scanPaths;
  }

  setScanPaths(paths: string[]): void {
    this.scanPaths = paths;
  }

  addScanPath(path: string): void {
    if (!this.scanPaths.includes(path)) {
      this.scanPaths.push(path);
    }
  }

  async discover(): Promise<Map<string, DiscoveredTool>> {
    Log.info('🔍 Starting tool discovery...');

    const discovered = new Map<string, DiscoveredTool>();

    for (const scanPath of this.scanPaths) {
      const toolsInPath = await this.scanPath(scanPath);
      toolsInPath.forEach((tool, name) => {
        discovered.set(name, tool);
      });
    }

    this.discoveredTools = discovered;
    Log.info(`✅ Discovered ${discovered.size} tools`);

    return discovered;
  }

  async scanPath(dirPath: string): Promise<Map<string, DiscoveredTool>> {
    const tools = new Map<string, DiscoveredTool>();

    try {
      const files = await this.getToolFiles(dirPath);

      for (const file of files) {
        const fileTools = await this.parseToolFile(file);
        fileTools.forEach((tool, name) => {
          tools.set(name, tool);
        });
      }
    } catch (error) {
      Log.warn(`Failed to scan path ${dirPath}: ${(error as Error).message}`);
    }

    return tools;
  }

  async getToolFiles(dirPath: string): Promise<string[]> {
    const toolFiles: string[] = [];

    async function scan(currentPath: string): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const content = await fs.readFile(fullPath, 'utf-8');

          if (content.includes('ToolDefinition') || content.includes('ToolSchema')) {
            toolFiles.push(fullPath);
          }
        }
      }
    }

    await scan(dirPath);
    return toolFiles;
  }

  async parseToolFile(filePath: string): Promise<Map<string, DiscoveredTool>> {
    const tools = new Map<string, DiscoveredTool>();

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);

      const toolPatterns = [
        /export\s+const\s+(\w+)\s*:\s*ToolDefinition\s*=\s*\{/g,
        /export\s+const\s+(\w+)\s*=\s*\{\s*name:\s*["']([^"']+)["']/g,
      ];

      for (const pattern of toolPatterns) {
        let match;
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
          const variableName = match[1];
          const toolName = match[2] || variableName;

          if (!tools.has(toolName)) {
            tools.set(toolName, {
              schema: await this.extractSchema(content, toolName),
              implementation: async () => {
                const module = await import(filePath);
                return module[variableName];
              },
              filePath: relativePath,
            });
          }
        }
      }
    } catch (error) {
      Log.warn(`Failed to parse tool file ${filePath}: ${(error as Error).message}`);
    }

    return tools;
  }

  async extractSchema(content: string, toolName: string): Promise<ToolSchema> {
    const schema: Partial<ToolSchema> = {
      name: toolName,
      description: '',
      category: 'custom',
      parameters: [],
      returns: { type: 'any', description: 'Tool result' },
      examples: [],
    };

    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    if (nameMatch) schema.name = nameMatch[1];

    const descriptionMatch = content.match(/description:\s*["']([^"']+)["']/);
    if (descriptionMatch) schema.description = descriptionMatch[1];

    const parametersMatch = content.match(/parameters:\s*\[(.*?)\]/s);
    if (parametersMatch) {
      schema.parameters = this.extractParameters(parametersMatch[1]);
    }

    return schema as ToolSchema;
  }

  extractParameters(parametersBlock: string): Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }> {
    const parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      default?: any;
    }> = [];

    const paramPattern = /\{\s*name:\s*["']([^"']+)["'],\s*type:\s*["']([^"']+)["'],\s*description:\s*["']([^"']+)["'][^}]*required:\s*(true|false)/g;

    let match;
    while ((match = paramPattern.exec(parametersBlock)) !== null) {
      parameters.push({
        name: match[1],
        type: match[2],
        description: match[3],
        required: match[4] === 'true',
      });
    }

    return parameters;
  }

  async registerDiscoveredTools(): Promise<number> {
    const registry = getToolRegistry();
    let registeredCount = 0;

    for (const [toolName, discoveredTool] of this.discoveredTools) {
      try {
        const implementation = await discoveredTool.implementation();
        const toolDef = (implementation as any).default || implementation;

        if (toolDef && toolDef.name) {
          registry.register({
            name: toolDef.name,
            description: toolDef.description || '',
            category: discoveredTool.schema.category,
            parameters: toolDef.parameters || [],
            returns: discoveredTool.schema.returns,
            examples: discoveredTool.schema.examples,
          }, toolDef.execute);

          registeredCount++;
          Log.info(`📦 Registered tool: ${toolName} from ${discoveredTool.filePath}`);
        }
      } catch (error) {
        Log.warn(`Failed to register tool ${toolName}: ${(error as Error).message}`);
      }
    }

    return registeredCount;
  }

  getDiscoveredTools(): Map<string, DiscoveredTool> {
    return this.discoveredTools;
  }

  search(query: string): DiscoveredTool[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.discoveredTools.values()).filter(tool =>
      tool.schema.name.toLowerCase().includes(lowerQuery) ||
      tool.schema.description.toLowerCase().includes(lowerQuery) ||
      tool.schema.category.toLowerCase().includes(lowerQuery)
    );
  }

  clear(): void {
    this.discoveredTools.clear();
  }
}

export const toolDiscovery = new ToolDiscovery();

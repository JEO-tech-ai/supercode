import { EventEmitter } from 'events';
import { Log } from '../shared/logger';
import type {
  ToolSchema,
  ToolParameter,
  ToolReturn,
  ToolCategory,
  ToolExecutionContext,
  ExecutionResult
} from './types';

export class ToolRegistry extends EventEmitter {
  private tools = new Map<string, ToolSchema>();
  private toolCache = new Map<string, Function>();
  private categories = new Map<ToolCategory, Set<string>>();

  register(schema: ToolSchema, implementation: Function): void {
    // Validate schema
    this.validateSchema(schema);

    // Check for duplicates
    if (this.tools.has(schema.name)) {
      Log.warn(`Tool ${schema.name} already registered, overwriting`);
    }

    // Register tool
    this.tools.set(schema.name, schema);
    this.toolCache.set(schema.name, implementation);

    // Update categories
    const categorySet = this.categories.get(schema.category) || new Set();
    categorySet.add(schema.name);
    this.categories.set(schema.category, categorySet);

    Log.info(`✅ Registered tool: ${schema.name} (${schema.category})`);

    // Emit event
    this.emit('tool:registered', { name: schema.name, category: schema.category });
  }

  unregister(name: string): boolean {
    const schema = this.tools.get(name);

    if (!schema) {
      return false;
    }

    // Remove from tools cache
    this.tools.delete(name);
    this.toolCache.delete(name);

    // Update categories
    const categorySet = this.categories.get(schema.category);
    categorySet?.delete(name);

    // Emit event
    this.emit('tool:unregistered', { name });
    
    Log.info(`🗑️ Unregistered tool: ${name}`);
    return true;
  }

  get(name: string): ToolSchema | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolSchema[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ToolSchema[] {
    const names = this.categories.get(category);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter((schema): schema is ToolSchema => schema !== undefined);
  }

  search(query: string): ToolSchema[] {
    const lowerQuery = query.toLowerCase();

    return this.getAll().filter(schema =>
      schema.name.toLowerCase().includes(lowerQuery) ||
      schema.description.toLowerCase().includes(lowerQuery) ||
      schema.category.toLowerCase().includes(lowerQuery)
    );
  }

  exists(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
    this.toolCache.clear();
    this.categories.clear();

    Log.info('🧹 Cleared tool registry');
  }

  private validateSchema(schema: ToolSchema): void {
    if (!schema.name || typeof schema.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!schema.description || typeof schema.description !== 'string') {
      throw new Error('Tool description is required and must be a string');
    }

    if (!schema.category) {
      throw new Error('Tool category is required');
    }

    if (!Array.isArray(schema.parameters)) {
      throw new Error('Tool parameters must be an array');
    }

    for (const param of schema.parameters) {
      if (!param.name || typeof param.name !== 'string') {
        throw new Error(`Parameter name is required for ${schema.name}`);
      }

      if (!param.type) {
        throw new Error(`Parameter type is required for ${schema.name}.${param.name}`);
      }
    }
  }
}

// Global tool registry instance
export const toolRegistry = new ToolRegistry();

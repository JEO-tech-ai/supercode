# Command Execution & Tool Discovery Implementation Plan

## Executive Summary

**Status**: ✅ Research Complete
**Complexity**: High
**Estimated Effort**: 2-3 weeks
**Priority**: High (core feature for tool execution)

This plan implements command execution and tool discovery system, enabling dynamic tool loading, schema validation, and efficient command execution with proper error handling.

---

## Phase 1: Tool System Foundation (Week 1)

### 1.1 Define Tool Schema

Create `src/tools/types.ts`:

```typescript
export interface ToolSchema {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: ToolReturn;
  examples: ToolExample[];
  requiresAuth?: boolean;
  requiresPermission?: string[];
  timeout?: number;
  rateLimit?: RateLimit;
}

export interface ToolParameter {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
}

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'file'
  | 'directory';

export interface ToolReturn {
  type: ParameterType;
  description: string;
}

export interface ToolExample {
  description: string;
  parameters: Record<string, any>;
  expectedOutput: any;
}

export type ToolCategory =
  | 'file'
  | 'terminal'
  | 'network'
  | 'database'
  | 'ai'
  | 'system'
  | 'custom';

export interface RateLimit {
  maxRequests: number;
  windowMs: number;
}

export interface ToolExecutionContext {
  sessionId: string;
  userId?: string;
  cwd: string;
  env: Record<string, string>;
  permissions: string[];
  metadata: Record<string, any>;
}
```

### 1.2 Create Tool Registry

Create `src/tools/registry.ts`:

```typescript
import { EventEmitter } from 'events';
import { Log } from '../shared/logger';
import type {
  ToolSchema,
  ToolCategory,
  ToolExecutionContext
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

    // Remove from categories
    const categorySet = this.categories.get(schema.category);
    categorySet?.delete(name);

    Log.info(`🗑️ Unregistered tool: ${name}`);

    this.emit('tool:unregistered', { name });

    return true;
  }

  get(name: string): ToolSchema | undefined {
    return this.tools.get(name);
  }

  getImplementation(name: string): Function | undefined {
    return this.toolCache.get(name);
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

    // Validate parameters
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

// Global registry instance
export const toolRegistry = new ToolRegistry();
```

---

## Phase 2: Command Execution Engine (Week 1.5)

### 2.1 Create Command Executor

Create `src/tools/executor.ts`:

```typescript
import { Log } from '../shared/logger';
import { toolRegistry } from './registry';
import type {
  ToolSchema,
  ToolExecutionContext,
  ToolSchema
} from './types';

export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: Error;
  duration: number;
  toolName: string;
}

export class CommandExecutor {
  private rateLimits = new Map<string, number[]>();

  async execute(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Get tool schema
    const schema = toolRegistry.get(toolName);

    if (!schema) {
      return {
        success: false,
        output: null,
        error: new Error(`Tool not found: ${toolName}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    // Check rate limits
    if (schema.rateLimit) {
      const allowed = await this.checkRateLimit(toolName, context.sessionId, schema.rateLimit);
      if (!allowed) {
        return {
          success: false,
          output: null,
          error: new Error(`Rate limit exceeded for ${toolName}`),
          duration: Date.now() - startTime,
          toolName
        };
      }
    }

    // Validate parameters
    const validation = this.validateParameters(schema, parameters);
    if (!validation.valid) {
      return {
        success: false,
        output: null,
        error: new Error(`Parameter validation failed: ${validation.errors.join(', ')}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    // Check permissions
    if (schema.requiresPermission) {
      const hasPermission = schema.requiresPermission.every(perm =>
        context.permissions.includes(perm)
      );

      if (!hasPermission) {
        return {
          success: false,
          output: null,
          error: new Error(`Missing required permissions: ${schema.requiresPermission.join(', ')}`),
          duration: Date.now() - startTime,
          toolName
        };
      }
    }

    // Get implementation
    const implementation = toolRegistry.getImplementation(toolName);

    if (!implementation) {
      return {
        success: false,
        output: null,
        error: new Error(`Tool implementation not found: ${toolName}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    try {
      // Execute with timeout
      const timeout = schema.timeout || 30000;
      const result = await this.executeWithTimeout(
        implementation,
        parameters,
        context,
        timeout
      );

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
        toolName
      };
    } catch (error) {
      Log.error(`Tool execution failed: ${toolName}`, error);

      return {
        success: false,
        output: null,
        error: error as Error,
        duration: Date.now() - startTime,
        toolName
      };
    }
  }

  private async executeWithTimeout<T>(
    fn: Function,
    params: any,
    context: ToolExecutionContext,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(params, context),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  private validateParameters(
    schema: ToolSchema,
    params: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required parameters
    for (const param of schema.parameters) {
      if (param.required && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      // Validate type
      if (param.name in params) {
        const value = params[param.name];

        switch (param.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`Parameter ${param.name} must be a string`);
            }
            break;

          case 'number':
            if (typeof value !== 'number') {
              errors.push(`Parameter ${param.name} must be a number`);
            } else {
              // Check min/max
              if (param.minimum !== undefined && value < param.minimum) {
                errors.push(`Parameter ${param.name} must be >= ${param.minimum}`);
              }
              if (param.maximum !== undefined && value > param.maximum) {
                errors.push(`Parameter ${param.name} must be <= ${param.maximum}`);
              }
            }
            break;

          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Parameter ${param.name} must be a boolean`);
            }
            break;

          case 'array':
            if (!Array.isArray(value)) {
              errors.push(`Parameter ${param.name} must be an array`);
            }
            break;

          case 'object':
            if (typeof value !== 'object' || value === null) {
              errors.push(`Parameter ${param.name} must be an object`);
            }
            break;

          case 'file':
            if (typeof value !== 'string') {
              errors.push(`Parameter ${param.name} must be a file path (string)`);
            }
            break;

          case 'directory':
            if (typeof value !== 'string') {
              errors.push(`Parameter ${param.name} must be a directory path (string)`);
            }
            break;
        }

        // Validate enum
        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async checkRateLimit(
    toolName: string,
    sessionId: string,
    limit: { maxRequests: number; windowMs: number }
  ): Promise<boolean> {
    const key = `${toolName}:${sessionId}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Get existing timestamps
    let timestamps = this.rateLimits.get(key) || [];

    // Filter to only include requests within the window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if under limit
    if (timestamps.length >= limit.maxRequests) {
      Log.warn(`Rate limit exceeded: ${toolName} (${timestamps.length}/${limit.maxRequests})`);
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.rateLimits.set(key, timestamps);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanupRateLimits(now - limit.windowMs * 2);
    }

    return true;
  }

  private cleanupRateLimits(beforeTimestamp: number): void {
    for (const [key, timestamps] of this.rateLimits.entries()) {
      const filtered = timestamps.filter(t => t > beforeTimestamp);

      if (filtered.length === 0) {
        this.rateLimits.delete(key);
      } else {
        this.rateLimits.set(key, filtered);
      }
    }
  }
}

// Global executor instance
export const commandExecutor = new CommandExecutor();
```

---

## Phase 3: Tool Discovery & Loading (Week 2)

### 3.1 Create Tool Loader

Create `src/tools/loader.ts`:

```typescript
import { glob } from 'glob';
import { Log } from '../shared/logger';
import { toolRegistry } from './registry';
import type { ToolSchema } from './types';

export interface ToolLoadOptions {
  pattern?: string;
  recursive?: boolean;
  validateOnLoad?: boolean;
}

export class ToolLoader {
  async loadFromDirectory(
    directory: string,
    options: ToolLoadOptions = {}
  ): Promise<{ loaded: number; failed: number }> {
    const {
      pattern = '**/*.tool.ts',
      recursive = true,
      validateOnLoad = true
    } = options;

    Log.info(`🔍 Scanning directory for tools: ${directory}`);

    const files = await glob(pattern, {
      cwd: directory,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    Log.info(`📦 Found ${files.length} potential tool files`);

    let loaded = 0;
    let failed = 0;

    for (const file of files) {
      try {
        await this.loadToolFile(file, validateOnLoad);
        loaded++;
      } catch (error) {
        Log.error(`❌ Failed to load tool from ${file}:`, error);
        failed++;
      }
    }

    Log.info(`✅ Loaded ${loaded} tools, ${failed} failed`);

    return { loaded, failed };
  }

  async loadToolFile(filePath: string, validate: boolean = true): Promise<void> {
    Log.debug(`Loading tool file: ${filePath}`);

    // Dynamic import
    const module = await import(filePath);

    // Look for tool export
    const toolExport = module.tool || module.default;

    if (!toolExport) {
      throw new Error('No tool export found in file');
    }

    // Extract schema and implementation
    const schema: ToolSchema = toolExport.schema;
    const implementation: Function = toolExport.execute;

    if (!schema) {
      throw new Error('Tool must have a schema property');
    }

    if (!implementation) {
      throw new Error('Tool must have an execute function');
    }

    // Validate schema if requested
    if (validate) {
      this.validateTool(schema, implementation);
    }

    // Register tool
    toolRegistry.register(schema, implementation);
  }

  async loadBuiltInTools(): Promise<void> {
    Log.info('🏗️ Loading built-in tools');

    const builtInTools = [
      'bash',
      'read',
      'write',
      'edit',
      'glob',
      'grep',
      'webfetch',
      'codesearch',
      'websearch'
    ];

    for (const toolName of builtInTools) {
      try {
        const toolPath = `./tools/${toolName}`;
        const module = await import(toolPath);

        if (module.tool) {
          toolRegistry.register(module.tool.schema, module.tool.execute);
          Log.info(`✅ Loaded built-in tool: ${toolName}`);
        }
      } catch (error) {
        Log.error(`Failed to load built-in tool ${toolName}:`, error);
      }
    }
  }

  private validateTool(schema: ToolSchema, implementation: Function): void {
    // Basic schema validation
    if (!schema.name || typeof schema.name !== 'string') {
      throw new Error('Tool schema must have a valid name');
    }

    if (!schema.description) {
      throw new Error(`Tool ${schema.name} must have a description`);
    }

    if (!schema.category) {
      throw new Error(`Tool ${schema.name} must have a category`);
    }

    // Check implementation
    if (typeof implementation !== 'function') {
      throw new Error(`Tool ${schema.name} must have a valid execute function`);
    }
  }
}

// Global loader instance
export const toolLoader = new ToolLoader();
```

### 3.2 Create Tool Discovery Service

Create `src/tools/discovery.ts`:

```typescript
import { toolRegistry } from './registry';
import { toolLoader } from './loader';
import { Log } from '../shared/logger';
import type { ToolSchema, ToolCategory } from './types';

export interface DiscoveryResult {
  tools: ToolSchema[];
  categories: Record<ToolCategory, number>;
  total: number;
}

export class ToolDiscovery {
  async discover(
    query?: string,
    category?: ToolCategory
  ): Promise<DiscoveryResult> {
    let tools: ToolSchema[];

    if (query) {
      // Search by query
      tools = toolRegistry.search(query);

      if (category) {
        tools = tools.filter(t => t.category === category);
      }
    } else if (category) {
      // Get by category
      tools = toolRegistry.getByCategory(category);
    } else {
      // Get all tools
      tools = toolRegistry.getAll();
    }

    // Build category summary
    const categories: Record<ToolCategory, number> = {} as any;

    for (const tool of tools) {
      categories[tool.category] = (categories[tool.category] || 0) + 1;
    }

    return {
      tools,
      categories,
      total: tools.length
    };
  }

  async getToolInfo(name: string): Promise<ToolSchema | null> {
    return toolRegistry.get(name) || null;
  }

  async getCategoryTree(): Promise<Record<string, ToolSchema[]>> {
    const tree: Record<string, ToolSchema[]> = {};
    const tools = toolRegistry.getAll();

    for (const tool of tools) {
      if (!tree[tool.category]) {
        tree[tool.category] = [];
      }

      tree[tool.category].push(tool);
    }

    return tree;
  }

  async suggestTools(input: string, limit: number = 5): Promise<ToolSchema[]> {
    const tokens = input.toLowerCase().split(/\s+/);

    // Score each tool
    const scored = toolRegistry.getAll().map(tool => {
      let score = 0;

      // Name match
      if (tool.name.toLowerCase().includes(tokens.join(' '))) {
        score += 10;
      }

      // Description match
      for (const token of tokens) {
        if (tool.description.toLowerCase().includes(token)) {
          score += 2;
        }
      }

      // Category match
      if (tool.category.toLowerCase().includes(tokens.join(' '))) {
        score += 5;
      }

      return { tool, score };
    });

    // Sort by score and return top matches
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.tool);
  }

  async reloadTools(directory?: string): Promise<void> {
    Log.info('🔄 Reloading tools...');

    if (directory) {
      await toolLoader.loadFromDirectory(directory);
    } else {
      await toolLoader.loadBuiltInTools();
    }

    Log.info(`✅ Tools reloaded. Total: ${toolRegistry.getAll().length}`);
  }

  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    withAuth: number;
    withRateLimit: number;
  }> {
    const tools = toolRegistry.getAll();

    const byCategory: Record<string, number> = {};
    let withAuth = 0;
    let withRateLimit = 0;

    for (const tool of tools) {
      byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;

      if (tool.requiresAuth) withAuth++;
      if (tool.rateLimit) withRateLimit++;
    }

    return {
      total: tools.length,
      byCategory,
      withAuth,
      withRateLimit
    };
  }
}

// Global discovery instance
export const toolDiscovery = new ToolDiscovery();
```

---

## Phase 4: Tool Templates & Generation (Week 2.5)

### 4.1 Create Tool Generator

Create `src/tools/generator.ts`:

```typescript
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { ToolSchema, ToolCategory } from './types';

export class ToolGenerator {
  generateTemplate(
    name: string,
    category: ToolCategory,
    description: string
  ): string {
    const className = this.toPascalCase(name);
    const fileName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return `// Tool: ${name}
// Category: ${category}
// Description: ${description}

import { Log } from '../shared/logger';
import type { ToolSchema, ToolExecutionContext } from './types';

// Define tool schema
export const schema: ToolSchema = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'Parameter description',
      required: true
    },
    {
      name: 'param2',
      type: 'number',
      description: 'Optional parameter',
      required: false,
      default: 0
    }
  ],
  returns: {
    type: 'object',
    description: 'Result description'
  },
  examples: [
    {
      description: 'Example usage',
      parameters: {
        param1: 'value1',
        param2: 42
      },
      expectedOutput: {
        success: true,
        data: '...'
      }
    }
  ]
};

// Tool implementation
export async function execute(
  parameters: Record<string, any>,
  context: ToolExecutionContext
): Promise<any> {
  const { param1, param2 } = parameters;

  try {
    // Your tool logic here
    Log.info(\`Executing ${name} with param1=\${param1}, param2=\${param2}\`);

    const result = await performOperation(param1, param2);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    Log.error(\`${name} failed:\`, error);

    throw error;
  }
}

// Helper functions
async function performOperation(param1: string, param2: number): Promise<any> {
  // Implement your tool logic
  return { result: '...' };
}

// Export tool
export const tool = {
  schema,
  execute
};
`;
  }

  async createToolFile(
    name: string,
    category: ToolCategory,
    description: string,
    outputDir: string
  ): Promise<string> {
    const template = this.generateTemplate(name, category, description);
    const fileName = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.tool.ts';
    const filePath = join(outputDir, fileName);

    writeFileSync(filePath, template, 'utf-8');

    return filePath;
  }

  generateScaffold(name: string): string {
    return `// Custom Tool Scaffold
// This is a template for creating custom tools

import { toolRegistry } from './registry';
import type { ToolSchema } from './types';

// 1. Define your tool schema
const schema: ToolSchema = {
  name: '${name}',
  description: 'Describe what this tool does',
  category: 'custom', // Change to appropriate category
  parameters: [
    {
      name: 'input',
      type: 'string',
      description: 'Input description',
      required: true
    }
  ],
  returns: {
    type: 'object',
    description: 'Return value description'
  },
  examples: [
    {
      description: 'Example usage',
      parameters: { input: 'example' },
      expectedOutput: { success: true }
    }
  ]
};

// 2. Implement your tool
async function execute(parameters: any, context: any): Promise<any> {
  const { input } = parameters;

  // Add your implementation here

  return {
    success: true,
    output: '...'
  };
}

// 3. Register the tool
toolRegistry.register(schema, execute);

export { schema, execute };
`;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

// Global generator instance
export const toolGenerator = new ToolGenerator();
```

---

## Phase 5: Testing & Integration (Week 3)

### 5.1 Unit Tests for Tool Registry

Create `src/tools/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './registry';
import type { ToolSchema } from './types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const schema: ToolSchema = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema, () => ({ result: 'ok' }));

      expect(registry.exists('test-tool')).toBe(true);
    });

    it('should throw error for invalid schema', () => {
      const schema = {
        description: 'Missing name',
        category: 'file' as const,
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      } as ToolSchema;

      expect(() => registry.register(schema, () => ({}))).toThrow();
    });
  });

  describe('get', () => {
    it('should return registered tool', () => {
      const schema: ToolSchema = {
        name: 'test-tool',
        description: 'Test',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema, () => ({}));

      const retrieved = registry.get('test-tool');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-tool');
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('should return tools by category', () => {
      const schema1: ToolSchema = {
        name: 'tool1',
        description: 'Tool 1',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      const schema2: ToolSchema = {
        name: 'tool2',
        description: 'Tool 2',
        category: 'terminal',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema1, () => ({}));
      registry.register(schema2, () => ({}));

      const fileTools = registry.getByCategory('file');

      expect(fileTools.length).toBe(1);
      expect(fileTools[0].name).toBe('tool1');
    });
  });

  describe('search', () => {
    it('should search tools by name', () => {
      const schema: ToolSchema = {
        name: 'file-read',
        description: 'Read files',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema, () => ({}));

      const results = registry.search('file');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('file-read');
    });

    it('should search tools by description', () => {
      const schema: ToolSchema = {
        name: 'custom-tool',
        description: 'This is a custom file operation',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema, () => ({}));

      const results = registry.search('custom');

      expect(results.length).toBe(1);
    });
  });

  describe('unregister', () => {
    it('should unregister a tool', () => {
      const schema: ToolSchema = {
        name: 'test-tool',
        description: 'Test',
        category: 'file',
        parameters: [],
        returns: { type: 'string', description: 'Test' },
        examples: []
      };

      registry.register(schema, () => ({}));
      expect(registry.exists('test-tool')).toBe(true);

      const result = registry.unregister('test-tool');

      expect(result).toBe(true);
      expect(registry.exists('test-tool')).toBe(false);
    });
  });
});
```

---

## Summary

This implementation plan provides:

1. **Complete Tool System**: Registry, executor, and loader for tool management
2. **Schema Validation**: Type-safe tool definitions with parameter validation
3. **Execution Engine**: Command execution with timeout, rate limiting, and error handling
4. **Tool Discovery**: Search, categorization, and suggestion capabilities
5. **Tool Generation**: Template generation for creating new tools
6. **Testing**: Comprehensive unit tests for all components

**Key Benefits**:
- Dynamic tool loading at runtime
- Type-safe tool schemas
- Parameter validation
- Rate limiting and permission checks
- Easy tool discovery and search
- Tool templates for quick development

**Next Steps**:
1. Implement tool registry
2. Create command executor
3. Build tool loader
4. Add discovery service
5. Generate tool templates
6. Add comprehensive tests
7. Document tool development

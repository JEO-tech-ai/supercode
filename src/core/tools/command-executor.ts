import type {
  ToolSchema,
  ToolParameter,
  ToolReturn,
  ToolExecutionContext,
  ExecutionResult
} from '../../tools/types';

export interface CommandExecutionConfig {
  maxConcurrent: number;
  timeout: number;
  enableRateLimiting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class CommandExecutor {
  private rateLimits = new Map<string, number[]>();
  private config: CommandExecutionConfig;
  private processTimeout: number;

  constructor(config: Partial<CommandExecutionConfig> = {}) {
    this.config = {
      maxConcurrent: 5,
      timeout: 30000, // 30 seconds default
      enableRateLimiting: true,
      logLevel: 'info',
      ...config
    };
    this.processTimeout = this.config.timeout;
  }

  async execute(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Check rate limits if enabled
    if (this.config.enableRateLimiting) {
      const allowed = await this.checkRateLimit(toolName, context);
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

    // Execute with timeout
    try {
      const result = await Promise.race([
        this.executeTool(toolName, parameters, context),
        new Promise<ExecutionResult>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Execution timeout after ${this.processTimeout}ms`)),
            this.processTimeout
          )
      )
      ]);

      return result;
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
        toolName
      };
    }
  }

  private async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    const { toolRegistry } = await import('../../tools/registry');

    const registry = toolRegistry;
    const tool = registry.get(toolName);

    if (!tool) {
      return {
        success: false,
        output: null,
        error: new Error(`Tool not found: ${toolName}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    const implementation = (toolRegistry as any).toolCache?.get(toolName);

    if (!implementation) {
      return {
        success: false,
        output: null,
        error: new Error(`Tool implementation not found: ${toolName}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    const validation = this.validateParameters(tool, parameters);
    if (!validation.valid) {
      return {
        success: false,
        output: null,
        error: new Error(`Parameter validation failed: ${validation.errors.join(', ')}`),
        duration: Date.now() - startTime,
        toolName
      };
    }

    if (tool.requiresPermission && tool.requiresPermission.length > 0) {
      const hasPermission = tool.requiresPermission.some(perm =>
        context.permissions.includes(perm)
      );

      if (!hasPermission) {
        return {
          success: false,
          output: null,
          error: new Error(`Missing required permissions: ${tool.requiresPermission.join(', ')}`),
          duration: Date.now() - startTime,
          toolName
        };
      }
    }

    const result = await implementation(parameters, context);

    return {
      success: true,
      output: result,
      duration: Date.now() - startTime,
      toolName
    };
  }

  private validateParameters(
    schema: ToolSchema,
    params: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of schema.parameters) {
      if (param.required && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

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
            }
            if (param.minimum !== undefined && value < param.minimum) {
              errors.push(`Parameter ${param.name} must be >= ${param.minimum}`);
            }
            if (param.maximum !== undefined && value > param.maximum) {
              errors.push(`Parameter ${param.name} must be <= ${param.maximum}`);
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
          case 'directory':
            if (typeof value !== 'string') {
              errors.push(`Parameter ${param.name} must be a file/directory path (string)`);
            }
            break;
        }

        // Enum validation
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
    context: ToolExecutionContext
  ): Promise<boolean> {
    const key = `${toolName}:${context.sessionId}`;
    const now = Date.now();
    const config = this.rateLimits.get(key);

    if (!config) {
      this.rateLimits.set(key, []);
      return true;
    }

    const windowStart = now - 60000;
    const recentRequests = config.filter(time => time > windowStart);

    const rateLimit = 10;
    if (recentRequests.length >= rateLimit) {
      return false;
    }

    config.push(now);

    if (config.length > rateLimit * 2) {
      this.rateLimits.set(key, config.slice(-rateLimit));
    }

    return true;
  }

  updateConfig(key: string, timestamp: number[]): void {
    this.rateLimits.set(key, timestamp);
  }

  private isRateLimited(key: string): boolean {
    const config = this.rateLimits.get(key);
    if (!config) return false;

    const now = Date.now();
    const recentCount = config.filter(t => now - t < 60000).length;

    return recentCount >= 10;
  }

  getStats(): Record<string, { count: number; isRateLimited: boolean }> {
    const stats: Record<string, { count: number; isRateLimited: boolean }> = {};
    
    for (const [key, timestamps] of this.rateLimits.entries()) {
      stats[key] = {
        count: timestamps.length,
        isRateLimited: this.isRateLimited(key)
      };
    }

    return stats;
  }

  clearRateLimits(): void {
    this.rateLimits.clear();
  }
}

// Global command executor instance
export const commandExecutor = new CommandExecutor();

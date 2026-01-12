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
  | 'directory'
  | 'any'
  | 'void';

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
  | 'code'      // LSP, AST-Grep, and other code intelligence tools
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

export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: Error;
  duration: number;
  toolName: string;
}

export interface ToolDefinition {
  schema: ToolSchema;
  execute: (parameters: any, context: ToolExecutionContext) => Promise<ExecutionResult>;
}

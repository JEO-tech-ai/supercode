import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../shared/logger';
import type { ToolSchema, ToolParameter, ToolReturn, ParameterType } from './types';

export interface ToolTemplate {
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  returns: ToolReturn;
  examples: Array<{ description: string; parameters: Record<string, any>; expectedOutput: any }>;
}

export interface GeneratedTool {
  content: string;
  fileName: string;
  filePath: string;
}

export class ToolGenerator {
  private templatesPath: string;
  private outputPath: string;

  constructor(templatesPath: string = './tools/templates', outputPath: string = './src/core/tools') {
    this.templatesPath = path.resolve(templatesPath);
    this.outputPath = path.resolve(outputPath);
  }

  async generateFromTemplate(templateName: string, config: Partial<ToolTemplate>): Promise<GeneratedTool> {
    const templatePath = path.join(this.templatesPath, `${templateName}.ts`);

    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      const toolSchema = this.buildToolSchema(config);

      const toolContent = this.fillTemplate(template, toolSchema);
      const fileName = `${toolSchema.name}.ts`;
      const filePath = path.join(this.outputPath, fileName);

      return {
        content: toolContent,
        fileName,
        filePath,
      };
    } catch (error) {
      throw new Error(`Failed to generate tool from template: ${(error as Error).message}`);
    }
  }

  async generateFromSchema(schema: ToolSchema): Promise<GeneratedTool> {
    const template = await this.getDefaultTemplate();

    const toolContent = this.fillTemplate(template, schema);
    const fileName = `${schema.name}.ts`;
    const filePath = path.join(this.outputPath, fileName);

    return {
      content: toolContent,
      fileName,
      filePath,
    };
  }

  async generateFromPrompt(prompt: string): Promise<GeneratedTool> {
    const schema = await this.inferSchemaFromPrompt(prompt);
    return this.generateFromSchema(schema);
  }

  private buildToolSchema(config: Partial<ToolTemplate>): ToolSchema {
    return {
      name: config.name || 'new_tool',
      description: config.description || 'Description of the tool',
      category: (config.category as any) || 'custom',
      parameters: config.parameters || [],
      returns: config.returns || { type: 'any' as ParameterType, description: 'Tool result' },
      examples: config.examples || [],
      requiresAuth: false,
      requiresPermission: [],
      timeout: 30000,
      rateLimit: { maxRequests: 10, windowMs: 60000 },
    };
  }

  private fillTemplate(template: string, schema: ToolSchema): string {
    let content = template;

    content = content.replace(/\{\{TOOL_NAME\}\}/g, schema.name);
    content = content.replace(/\{\{TOOL_DESCRIPTION\}\}/g, schema.description);
    content = content.replace(/\{\{TOOL_CATEGORY\}\}/g, schema.category);

    const parametersBlock = this.generateParametersBlock(schema.parameters);
    content = content.replace(/\{\{PARAMETERS\}\}/g, parametersBlock);

    const executeBody = this.generateExecuteBody(schema);
    content = content.replace(/\{\{EXECUTE_BODY\}\}/g, executeBody);

    return content;
  }

  private generateParametersBlock(parameters: ToolParameter[]): string {
    if (parameters.length === 0) {
      return '[]';
    }

    const paramStrings = parameters.map(param => {
      const required = param.required ? 'true' : 'false';
      const defaultStr = param.default !== undefined ? `default: ${JSON.stringify(param.default)}` : '';

      return `    {
      name: "${param.name}",
      type: "${param.type}",
      description: "${param.description}",
      required: ${required},
      ${defaultStr}
    }`;
    });

    return `[\n${paramStrings.join(',\n')}\n  ]`;
  }

  private generateExecuteBody(schema: ToolSchema): string {
    const args: string[] = [];
    const destructure: string[] = [];

    for (const param of schema.parameters) {
      if (param.required) {
        destructure.push(`${param.name}: args.${param.name} as ${param.type}`);
      }
    }

    if (destructure.length > 0) {
      args.push(`const { ${destructure.join(', ')} } = args`);
    }

    return `    // Implementation here
    // ${args.join('\n    // ')}
    
    return {
      success: true,
      output: "Tool executed successfully"
    }`;
  }

  private async getDefaultTemplate(): Promise<string> {
    const defaultTemplate = `import type { ToolDefinition, ToolContext, ToolResult } from "../types";

export const {{TOOL_NAME}}Tool: ToolDefinition = {
  name: "{{TOOL_NAME}}",
  description: "{{TOOL_DESCRIPTION}}",
  parameters: {{PARAMETERS}},

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
{{EXECUTE_BODY}}
  },
};
`;

    return defaultTemplate;
  }

  private async inferSchemaFromPrompt(prompt: string): Promise<ToolSchema> {
    const promptLower = prompt.toLowerCase();

    let category: any = 'custom';
    if (promptLower.includes('file')) category = 'file';
    else if (promptLower.includes('terminal') || promptLower.includes('bash') || promptLower.includes('command')) category = 'terminal';
    else if (promptLower.includes('network') || promptLower.includes('http') || promptLower.includes('api')) category = 'network';
    else if (promptLower.includes('database') || promptLower.includes('db')) category = 'database';
    else if (promptLower.includes('ai') || promptLower.includes('model')) category = 'ai';

    const schema: ToolSchema = {
      name: this.generateToolName(prompt),
      description: prompt,
      category,
      parameters: [],
      returns: { type: 'any' as ParameterType, description: 'Tool result' },
      examples: [],
      requiresAuth: false,
      requiresPermission: [],
      timeout: 30000,
    };

    return schema;
  }

  private generateToolName(prompt: string): string {
    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 0) return 'new_tool';

    const name = words.join('_');
    return name.endsWith('_tool') ? name : `${name}_tool`;
  }

  async saveTool(tool: GeneratedTool): Promise<void> {
    const dir = path.dirname(tool.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tool.filePath, tool.content, 'utf-8');

    Log.info(`📄 Generated tool: ${tool.fileName} at ${tool.filePath}`);
  }

  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesPath);
      return files
        .filter(file => file.endsWith('.ts'))
        .map(file => path.basename(file, '.ts'));
    } catch (error) {
      Log.warn(`Failed to list templates: ${(error as Error).message}`);
      return [];
    }
  }

  async validateTool(tool: GeneratedTool): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const content = await fs.readFile(tool.filePath, 'utf-8');

      if (!content.includes('ToolDefinition')) {
        errors.push('Tool must implement ToolDefinition interface');
      }

      if (!content.includes('name:')) {
        errors.push('Tool must have a name property');
      }

      if (!content.includes('execute:')) {
        errors.push('Tool must have an execute method');
      }

      if (!content.includes('ToolContext')) {
        errors.push('Tool must use ToolContext');
      }

      if (!content.includes('ToolResult')) {
        errors.push('Tool must return ToolResult');
      }
    } catch (error) {
      errors.push(`Failed to validate: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const toolGenerator = new ToolGenerator();

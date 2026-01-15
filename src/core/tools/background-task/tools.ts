import type { ToolDefinition, ToolContext, ToolResult } from '../types';
import { getBackgroundManager } from './manager';
import type { SpawnTaskInput, GetOutputInput, CancelTaskInput } from './types';

export const backgroundTaskTool: ToolDefinition = {
  name: 'background_task',
  description: `Run agent task in background. Returns task_id immediately; notifies on completion.

Use \`background_output\` to get results. Prompts MUST be in English.`,
  parameters: [
    {
      name: 'agent',
      type: 'string',
      description: 'The agent type to spawn (explore, librarian, oracle, frontend-ui-ux-engineer, document-writer, general)',
      required: true,
    },
    {
      name: 'prompt',
      type: 'string',
      description: 'The task prompt for the agent',
      required: true,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Short description of the task (3-5 words)',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as SpawnTaskInput;
    const manager = getBackgroundManager();
    
    const taskId = await manager.spawnTask(
      context.sessionId,
      input.agent,
      input.prompt,
      input.description
    );

    return {
      success: true,
      data: {
        taskId,
        message: `Task ${taskId} spawned. Use background_output to retrieve results.`,
      },
    };
  },
};

export const backgroundOutputTool: ToolDefinition = {
  name: 'background_output',
  description: 'Get output from background task. System notifies on completion, so block=true rarely needed.',
  parameters: [
    {
      name: 'task_id',
      type: 'string',
      description: 'The task ID returned by background_task',
      required: true,
    },
    {
      name: 'block',
      type: 'boolean',
      description: 'Whether to wait for task completion (default: false)',
      required: false,
      default: false,
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Timeout in milliseconds when blocking (default: 300000)',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as GetOutputInput;
    const manager = getBackgroundManager();
    
    const task = manager.getTask(input.task_id);
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${input.task_id}`,
      };
    }

    if (task.status === 'pending' || task.status === 'running') {
      if (!input.block) {
        return {
          success: true,
          data: {
            status: task.status,
            message: `Task ${input.task_id} is still ${task.status}. Use block=true to wait.`,
          },
        };
      }
    }

    try {
      const result = await manager.getResult(
        input.task_id,
        input.block ?? false,
        input.timeout
      );

      return {
        success: true,
        data: {
          status: task.status,
          result,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export const backgroundCancelTool: ToolDefinition = {
  name: 'background_cancel',
  description: 'Cancel running background task(s). Use all=true to cancel ALL before final answer.',
  parameters: [
    {
      name: 'taskId',
      type: 'string',
      description: 'Specific task ID to cancel',
      required: false,
    },
    {
      name: 'all',
      type: 'boolean',
      description: 'Cancel all tasks for current session',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const input = args as unknown as CancelTaskInput;
    const manager = getBackgroundManager();

    if (input.all) {
      const cancelled = manager.cancelAllTasks(context.sessionId);
      return {
        success: true,
        data: {
          cancelled,
          message: `Cancelled ${cancelled} task(s)`,
        },
      };
    }

    if (input.taskId) {
      const success = manager.cancelTask(input.taskId);
      return {
        success,
        data: success
          ? { message: `Task ${input.taskId} cancelled` }
          : { message: `Task ${input.taskId} could not be cancelled (not found or already completed)` },
      };
    }

    return {
      success: false,
      error: 'Specify taskId or all=true',
    };
  },
};

export const backgroundTools: ToolDefinition[] = [
  backgroundTaskTool,
  backgroundOutputTool,
  backgroundCancelTool,
];

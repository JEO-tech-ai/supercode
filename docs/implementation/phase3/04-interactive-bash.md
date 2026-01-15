# Phase 3.4: Interactive Bash Tool (tmux)

> Priority: P3 (Lower)
> Effort: 2-3 days
> Dependencies: PTY manager

## Overview

The Interactive Bash tool provides tmux-based session management for long-running processes and interactive CLI tools. It allows spawning background processes, attaching to them, and managing their lifecycle.

## Current State in SuperCode

### Existing Files
```
src/core/tools/bash.ts           # Basic bash execution
src/core/tools/bash-pty.ts       # PTY-based bash
src/services/pty/manager.ts      # PTY session management
```

### What Exists
- Basic bash command execution
- PTY manager for interactive sessions

### What's Missing
- tmux integration
- Named session management
- Background process tracking
- Output capture

## Implementation Plan

### File: `src/core/tools/interactive-bash.ts`

```typescript
import type { ToolDefinition, ToolContext, ToolResult } from './types';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { Log } from '../../shared/logger';

const execAsync = promisify(exec);

const SESSION_PREFIX = 'omo-';

interface TmuxSession {
  name: string;
  created: Date;
  attached: boolean;
  windows: number;
}

export interface InteractiveBashConfig {
  timeout: number;
  maxOutputLines: number;
  sessionPrefix: string;
}

const DEFAULT_CONFIG: InteractiveBashConfig = {
  timeout: 30000,
  maxOutputLines: 500,
  sessionPrefix: SESSION_PREFIX,
};

// Blocked commands that should use regular bash
const BLOCKED_COMMANDS = [
  'capture-pane',
  'save-buffer', 
  'show-buffer',
  'pipe-pane',
];

export const interactiveBashTool: ToolDefinition = {
  name: 'interactive_bash',
  description: `Execute tmux commands. Use "omo-{name}" session pattern.

For: server processes, long-running tasks, background jobs, interactive CLI tools.

Blocked (use bash instead): ${BLOCKED_COMMANDS.join(', ')}.

Examples:
- Create session: new-session -d -s omo-dev "npm run dev"
- List sessions: list-sessions
- Send keys: send-keys -t omo-dev "npm test" Enter
- Kill session: kill-session -t omo-dev`,

  parameters: {
    type: 'object',
    properties: {
      tmux_command: {
        type: 'string',
        description: 'The tmux command to execute (without "tmux" prefix)',
      },
    },
    required: ['tmux_command'],
  },

  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const config = DEFAULT_CONFIG;
    const tmuxCommand = args.tmux_command as string;

    // Check for blocked commands
    for (const blocked of BLOCKED_COMMANDS) {
      if (tmuxCommand.includes(blocked)) {
        return {
          success: false,
          error: `Command "${blocked}" is blocked in interactive_bash. Use regular bash tool instead.`,
        };
      }
    }

    // Ensure session name follows pattern
    if (tmuxCommand.includes('-s ') && !tmuxCommand.includes(`-s ${config.sessionPrefix}`)) {
      const match = tmuxCommand.match(/-s\s+(\S+)/);
      if (match && !match[1].startsWith(config.sessionPrefix)) {
        Log.warn('[interactive-bash] Session name should use omo- prefix');
      }
    }

    try {
      // Check if tmux is available
      try {
        await execAsync('which tmux');
      } catch {
        return {
          success: false,
          error: 'tmux is not installed. Please install tmux first.',
        };
      }

      const fullCommand = `tmux ${tmuxCommand}`;
      
      Log.info('[interactive-bash] Executing:', { command: fullCommand });

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: config.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      const output = stdout || stderr || 'Command executed successfully';
      const truncatedOutput = truncateOutput(output, config.maxOutputLines);

      return {
        success: true,
        data: truncatedOutput,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle common errors
      if (errorMessage.includes('no server running')) {
        return {
          success: false,
          error: 'No tmux server running. Create a session first with: new-session -d -s omo-name',
        };
      }

      if (errorMessage.includes("session not found")) {
        const sessions = await listSessions(config);
        const sessionList = sessions.length > 0
          ? `\n\nAvailable sessions: ${sessions.map(s => s.name).join(', ')}`
          : '\n\nNo sessions available. Create one with: new-session -d -s omo-name';
        
        return {
          success: false,
          error: `Session not found.${sessionList}`,
        };
      }

      Log.error('[interactive-bash] Execution failed:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

async function listSessions(config: InteractiveBashConfig): Promise<TmuxSession[]> {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}|#{session_created}|#{session_attached}|#{session_windows}"');
    
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const [name, created, attached, windows] = line.split('|');
      return {
        name,
        created: new Date(parseInt(created) * 1000),
        attached: attached === '1',
        windows: parseInt(windows),
      };
    });
  } catch {
    return [];
  }
}

function truncateOutput(output: string, maxLines: number): string {
  const lines = output.split('\n');
  
  if (lines.length <= maxLines) {
    return output;
  }

  const truncated = lines.slice(0, maxLines);
  return truncated.join('\n') + `\n\n... [${lines.length - maxLines} more lines truncated]`;
}

// Helper tools

export const tmuxListTool: ToolDefinition = {
  name: 'tmux_list',
  description: 'List all tmux sessions',
  parameters: { type: 'object', properties: {} },
  
  execute: async (args, context): Promise<ToolResult> => {
    const sessions = await listSessions(DEFAULT_CONFIG);
    
    if (sessions.length === 0) {
      return {
        success: true,
        data: 'No tmux sessions running.',
      };
    }

    const formatted = sessions.map(s => 
      `- ${s.name} (${s.windows} window${s.windows !== 1 ? 's' : ''})${s.attached ? ' [attached]' : ''}`
    ).join('\n');

    return {
      success: true,
      data: `Active tmux sessions:\n${formatted}`,
    };
  },
};

export const tmuxCaptureTool: ToolDefinition = {
  name: 'tmux_capture',
  description: 'Capture output from a tmux session',
  parameters: {
    type: 'object',
    properties: {
      session: {
        type: 'string',
        description: 'Session name to capture from',
      },
      lines: {
        type: 'number',
        description: 'Number of lines to capture (default: 100)',
        default: 100,
      },
    },
    required: ['session'],
  },

  execute: async (args, context): Promise<ToolResult> => {
    const session = args.session as string;
    const lines = (args.lines as number) ?? 100;

    try {
      const { stdout } = await execAsync(
        `tmux capture-pane -t ${session} -p -S -${lines}`,
        { timeout: 5000 }
      );

      return {
        success: true,
        data: stdout || '[no output]',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture output',
      };
    }
  },
};

export default interactiveBashTool;
```

## Usage Examples

```typescript
// Start a dev server
await interactiveBashTool.execute({
  tmux_command: 'new-session -d -s omo-dev "npm run dev"',
}, context);

// Check running sessions
await interactiveBashTool.execute({
  tmux_command: 'list-sessions',
}, context);

// Send command to session
await interactiveBashTool.execute({
  tmux_command: 'send-keys -t omo-dev "npm test" Enter',
}, context);

// Capture output
await tmuxCaptureTool.execute({
  session: 'omo-dev',
  lines: 50,
}, context);

// Kill session
await interactiveBashTool.execute({
  tmux_command: 'kill-session -t omo-dev',
}, context);
```

## Testing

```typescript
describe('interactiveBashTool', () => {
  it('should execute tmux commands');
  it('should block dangerous commands');
  it('should handle missing tmux');
  it('should handle session not found');
  it('should list available sessions');
  it('should capture session output');
});
```

## Success Criteria

- [ ] Executes tmux commands
- [ ] Blocks dangerous commands
- [ ] Session prefix pattern enforced
- [ ] Error messages helpful
- [ ] Output capture works
- [ ] Session listing works

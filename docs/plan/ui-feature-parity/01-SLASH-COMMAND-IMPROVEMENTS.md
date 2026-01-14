# Phase 1: Slash Command System Improvements

> **Priority**: HIGH
> **Estimated Duration**: 1 week
> **Dependencies**: None (can start immediately)

---

## Overview

SuperCode의 슬래시 명령 시스템을 OpenCode 수준으로 개선합니다. 현재 클라이언트 사이드 템플릿 치환에서 서버 사이드 실행, MCP 통합, 서브태스크 위임까지 확장합니다.

---

## Current State Analysis

### SuperCode Implementation

**Location**: `src/core/hooks/auto-slash-command.ts`

```typescript
// Current: Simple client-side template expansion
interface SlashCommand {
  name: string
  description: string
  template: string  // Only supports {args} placeholder
}

const DEFAULT_COMMANDS = [
  { name: 'plan', description: 'Create a plan', template: 'Create a detailed plan for: {args}' },
  { name: 'review', description: 'Review code', template: 'Review this code: {args}' },
  // ...
]

// Execution: Simple string replacement before sending to LLM
function expandCommand(input: string): string {
  const match = input.match(/^\/(\w+)\s*(.*)$/)
  if (!match) return input
  const command = DEFAULT_COMMANDS.find(c => c.name === match[1])
  return command?.template.replace('{args}', match[2]) ?? input
}
```

**Limitations**:
- Client-side only (no server logic)
- Single `{args}` placeholder
- No MCP integration
- No subtask delegation
- No inline scripting
- Static command list

### OpenCode Implementation

**Location**: `opencode/packages/opencode/src/command/index.ts`

```typescript
// OpenCode: Rich server-side command system
export namespace Command {
  export const Info = z.object({
    name: z.string(),
    description: z.string().optional(),
    agent: z.string().optional(),        // Dedicated agent for this command
    model: z.string().optional(),        // Specific model override
    mcp: z.string().optional(),          // MCP server source
    subtask: z.boolean().optional(),     // Run as subtask
    hints: z.array(z.string()).optional(), // Autocomplete hints
    template: z.union([
      z.string(),
      z.promise(z.string())              // Dynamic templates!
    ])
  })
}

// Template supports:
// - $1, $2, $3... - Positional arguments
// - $ARGUMENTS - All remaining arguments
// - `!command` - Inline bash execution
// - Automatic file path detection and attachment
```

**Capabilities**:
- Server-side execution with full context
- Positional arguments ($1, $2, $ARGUMENTS)
- MCP prompt discovery
- Subtask delegation to specialized agents
- Inline bash script execution
- Dynamic template loading
- File path auto-attachment

---

## Implementation Plan

### Task 1.1: Server-Side Command Registry

**Create**: `src/command/registry.ts`

```typescript
import { z } from 'zod'

export namespace Command {
  // Command definition schema (OpenCode compatible)
  export const InfoSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    agent: z.string().optional(),
    model: z.string().optional(),
    mcp: z.string().optional(),
    subtask: z.boolean().optional(),
    hints: z.array(z.string()).optional(),
    template: z.union([z.string(), z.function().returns(z.promise(z.string()))])
  })
  
  export type Info = z.infer<typeof InfoSchema>
  
  // Built-in commands
  export const BUILTIN: Info[] = [
    {
      name: 'init',
      description: 'Analyze codebase and create a summary',
      template: `Analyze this codebase and provide:
1. Tech stack overview
2. Project structure
3. Key entry points
4. Development conventions`
    },
    {
      name: 'review',
      description: 'Review code changes',
      agent: 'code-reviewer',
      subtask: true,
      template: `Review the following code for:
- Best practices
- Potential bugs
- Performance issues
- Security concerns

$ARGUMENTS`
    },
    {
      name: 'plan',
      description: 'Create implementation plan',
      agent: 'planner',
      subtask: true,
      template: `Create a detailed implementation plan for: $ARGUMENTS`
    },
    {
      name: 'test',
      description: 'Generate tests',
      template: `Generate comprehensive tests for: $ARGUMENTS`
    }
  ]
  
  // Registry state
  const state = {
    commands: new Map<string, Info>(),
    loaded: false
  }
  
  export function register(command: Info): void {
    state.commands.set(command.name, command)
  }
  
  export function get(name: string): Info | undefined {
    return state.commands.get(name)
  }
  
  export function list(): Info[] {
    return Array.from(state.commands.values())
  }
  
  export async function load(configPath?: string): Promise<void> {
    if (state.loaded) return
    
    // Load built-in commands
    BUILTIN.forEach(cmd => register(cmd))
    
    // Load from config file (opencode.json or similar)
    if (configPath) {
      const config = await loadConfigCommands(configPath)
      config.forEach(cmd => register(cmd))
    }
    
    state.loaded = true
  }
}
```

**Complexity**: Medium
**Duration**: 2 days

---

### Task 1.2: Positional Arguments Support

**Create**: `src/command/template.ts`

```typescript
export namespace Template {
  interface ExpandOptions {
    template: string
    args: string[]
    rawArgs: string
    workdir: string
  }
  
  /**
   * Expand template with positional arguments
   * 
   * Supports:
   * - $1, $2, $3... for positional arguments
   * - $ARGUMENTS for all remaining arguments
   * - `!command` for inline bash execution
   */
  export async function expand(options: ExpandOptions): Promise<string> {
    let result = options.template
    
    // Replace positional arguments ($1, $2, etc.)
    for (let i = 0; i < options.args.length; i++) {
      result = result.replace(new RegExp(`\\$${i + 1}`, 'g'), options.args[i])
    }
    
    // Replace $ARGUMENTS with all remaining args
    result = result.replace(/\$ARGUMENTS/g, options.rawArgs)
    
    // Execute inline bash commands (`!command`)
    result = await expandBashCommands(result, options.workdir)
    
    return result
  }
  
  async function expandBashCommands(template: string, workdir: string): Promise<string> {
    const bashPattern = /`!([^`]+)`/g
    let result = template
    let match
    
    while ((match = bashPattern.exec(template)) !== null) {
      const command = match[1]
      try {
        const output = await runBashCommand(command, workdir)
        result = result.replace(match[0], output.trim())
      } catch (error) {
        // Keep original on error
        console.warn(`Bash expansion failed for: ${command}`)
      }
    }
    
    return result
  }
  
  async function runBashCommand(command: string, workdir: string): Promise<string> {
    const proc = Bun.spawn(['bash', '-c', command], {
      cwd: workdir,
      stdout: 'pipe',
      stderr: 'pipe'
    })
    
    const output = await new Response(proc.stdout).text()
    return output
  }
}
```

**Example Usage**:
```
/review src/auth.ts src/user.ts
Template: "Review these files: $1 and $2\n\nContext: $ARGUMENTS"
Expanded: "Review these files: src/auth.ts and src/user.ts\n\nContext: src/auth.ts src/user.ts"

/deploy prod
Template: "Deploy to $1. Current branch: `!git branch --show-current`"
Expanded: "Deploy to prod. Current branch: main"
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 1.3: MCP Command Discovery

**Create**: `src/command/mcp-discovery.ts`

```typescript
import { MCP } from '../mcp'

export namespace MCPDiscovery {
  interface MCPCommand extends Command.Info {
    mcp: string  // MCP server name
    mcpPromptName: string
  }
  
  /**
   * Discover commands from connected MCP servers
   */
  export async function discoverCommands(): Promise<MCPCommand[]> {
    const commands: MCPCommand[] = []
    const servers = await MCP.listConnected()
    
    for (const server of servers) {
      try {
        const prompts = await MCP.prompts(server.name)
        
        for (const prompt of prompts) {
          commands.push({
            name: `${server.name}:${prompt.name}`,
            description: prompt.description,
            mcp: server.name,
            mcpPromptName: prompt.name,
            template: '', // MCP handles the template
            hints: prompt.arguments?.map(arg => arg.name) ?? []
          })
        }
      } catch (error) {
        console.warn(`Failed to discover prompts from ${server.name}:`, error)
      }
    }
    
    return commands
  }
  
  /**
   * Execute an MCP command
   */
  export async function execute(command: MCPCommand, args: Record<string, string>): Promise<string> {
    const result = await MCP.getPrompt(command.mcp, command.mcpPromptName, args)
    return result.messages.map(m => m.content.text).join('\n')
  }
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 1.4: Subtask Delegation

**Modify**: `src/session/prompt.ts`

```typescript
import { Command } from '../command/registry'
import { Template } from '../command/template'
import { AgentRegistry } from '../agents/registry'

export async function handleCommand(options: {
  sessionID: string
  command: string
  arguments: string
  agent: string
  model: string
}): Promise<void> {
  const cmd = Command.get(options.command)
  if (!cmd) {
    throw new Error(`Unknown command: ${options.command}`)
  }
  
  // Parse arguments
  const args = parseArguments(options.arguments)
  
  // Expand template
  const expandedTemplate = await Template.expand({
    template: typeof cmd.template === 'function' 
      ? await cmd.template() 
      : cmd.template,
    args: args.positional,
    rawArgs: options.arguments,
    workdir: getSessionWorkdir(options.sessionID)
  })
  
  // Detect and attach file references
  const fileParts = await detectAndAttachFiles(expandedTemplate, options.sessionID)
  
  // Handle subtask delegation
  if (cmd.subtask && cmd.agent) {
    await executeAsSubtask({
      sessionID: options.sessionID,
      agent: cmd.agent,
      prompt: expandedTemplate,
      fileParts,
      parentModel: options.model
    })
    return
  }
  
  // Direct execution
  await sendPrompt({
    sessionID: options.sessionID,
    text: expandedTemplate,
    parts: fileParts,
    agent: cmd.agent ?? options.agent,
    model: cmd.model ?? options.model
  })
}

async function executeAsSubtask(options: {
  sessionID: string
  agent: string
  prompt: string
  fileParts: FilePart[]
  parentModel: string
}): Promise<void> {
  // Create subtask with dedicated agent
  const agent = AgentRegistry.get(options.agent)
  if (!agent) {
    throw new Error(`Unknown agent for subtask: ${options.agent}`)
  }
  
  // Run as background task with progress reporting
  await agent.execute({
    sessionID: options.sessionID,
    prompt: options.prompt,
    fileParts: options.fileParts,
    asSubtask: true,
    reportProgress: true
  })
}

function parseArguments(raw: string): { positional: string[], named: Record<string, string> } {
  const parts = raw.split(/\s+/)
  const positional: string[] = []
  const named: Record<string, string> = {}
  
  for (const part of parts) {
    if (part.startsWith('--')) {
      const [key, value] = part.slice(2).split('=')
      named[key] = value ?? 'true'
    } else {
      positional.push(part)
    }
  }
  
  return { positional, named }
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 1.5: API Endpoint

**Create**: `src/server/routes/command.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { handleCommand } from '../../session/prompt'
import { Command } from '../../command/registry'

const app = new Hono()

// Execute command
app.post(
  '/session/:sessionID/command',
  zValidator('json', z.object({
    command: z.string(),
    arguments: z.string(),
    agent: z.string(),
    model: z.string(),
    messageID: z.string().optional(),
    variant: z.string().optional(),
    parts: z.array(z.any()).optional()
  })),
  async (c) => {
    const { sessionID } = c.req.param()
    const body = c.req.valid('json')
    
    await handleCommand({
      sessionID,
      command: body.command,
      arguments: body.arguments,
      agent: body.agent,
      model: body.model
    })
    
    return c.json({ success: true })
  }
)

// List available commands
app.get('/commands', async (c) => {
  const commands = Command.list()
  return c.json({
    commands: commands.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      hints: cmd.hints,
      hasDedicatedAgent: !!cmd.agent,
      isSubtask: !!cmd.subtask
    }))
  })
})

export { app as commandRoutes }
```

**Complexity**: Low
**Duration**: 0.5 days

---

## UI Integration

### TUI: Update SlashCommands.tsx

```typescript
// Fetch commands from server instead of static list
const { data: commands } = useQuery({
  queryKey: ['commands'],
  queryFn: () => sdk.client.commands.list()
})

// Show command hints during autocomplete
function renderCommandItem(cmd: Command) {
  return (
    <Box>
      <Text color="cyan">/{cmd.name}</Text>
      <Text color="gray"> - {cmd.description}</Text>
      {cmd.hasDedicatedAgent && <Text color="yellow"> [agent: {cmd.agent}]</Text>}
      {cmd.isSubtask && <Text color="magenta"> [subtask]</Text>}
    </Box>
  )
}
```

### Web Console: Update PromptInput

```typescript
// In packages/console/app/src/components/prompt-input.tsx
const slashCommands = createMemo<SlashCommand[]>(() => {
  const builtin = command.options
    .filter(opt => !opt.disabled && opt.slash)
    .map(opt => ({
      id: opt.id,
      trigger: opt.slash!,
      title: opt.title,
      description: opt.description,
      type: 'builtin' as const
    }))
  
  // Include MCP-discovered commands
  const custom = sync.data.command.map(cmd => ({
    id: `custom.${cmd.name}`,
    trigger: cmd.name,
    title: cmd.name,
    description: cmd.description,
    type: cmd.mcp ? 'mcp' as const : 'custom' as const
  }))
  
  return [...custom, ...builtin]
})
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/command/template.test.ts
describe('Template.expand', () => {
  it('expands positional arguments', async () => {
    const result = await Template.expand({
      template: 'Review $1 and $2',
      args: ['file1.ts', 'file2.ts'],
      rawArgs: 'file1.ts file2.ts',
      workdir: '/tmp'
    })
    expect(result).toBe('Review file1.ts and file2.ts')
  })
  
  it('expands $ARGUMENTS', async () => {
    const result = await Template.expand({
      template: 'All files: $ARGUMENTS',
      args: [],
      rawArgs: 'a.ts b.ts c.ts',
      workdir: '/tmp'
    })
    expect(result).toBe('All files: a.ts b.ts c.ts')
  })
  
  it('executes inline bash', async () => {
    const result = await Template.expand({
      template: 'Current dir: `!pwd`',
      args: [],
      rawArgs: '',
      workdir: '/tmp'
    })
    expect(result).toBe('Current dir: /tmp')
  })
})
```

### Integration Tests

```typescript
// tests/command/integration.test.ts
describe('Command execution', () => {
  it('executes /review as subtask', async () => {
    const response = await fetch('/session/test-session/command', {
      method: 'POST',
      body: JSON.stringify({
        command: 'review',
        arguments: 'src/auth.ts',
        agent: 'code-reviewer',
        model: 'claude-sonnet-4'
      })
    })
    
    expect(response.ok).toBe(true)
    // Verify subtask was created
    const status = await getSessionStatus('test-session')
    expect(status.type).toBe('running')
    expect(status.agent).toBe('code-reviewer')
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| S1 | Server-side command registry works | Commands loaded from config |
| S2 | Positional arguments expand correctly | $1, $2, $ARGUMENTS all work |
| S3 | MCP commands discovered | /mcp:* commands appear in list |
| S4 | Subtask delegation works | /review triggers code-reviewer agent |
| S5 | Inline bash executes | `!git status` works in templates |
| S6 | API endpoint functional | POST /session/:id/command succeeds |
| S7 | UI integration complete | Both TUI and Web show new commands |

---

## Migration Path

### Phase 1: Parallel Operation
- Keep existing client-side commands
- Add server-side as fallback
- Feature flag: `SUPERCODE_SERVER_COMMANDS=1`

### Phase 2: Gradual Migration
- Move commands one-by-one to server
- Test each command in both modes
- Update documentation

### Phase 3: Full Cutover
- Remove client-side command expansion
- All commands go through server
- Remove feature flag

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/command/registry.ts` | CREATE | Command registry |
| `src/command/template.ts` | CREATE | Template expansion |
| `src/command/mcp-discovery.ts` | CREATE | MCP integration |
| `src/command/types.ts` | CREATE | Type definitions |
| `src/session/prompt.ts` | MODIFY | Command handling |
| `src/server/routes/command.ts` | CREATE | API endpoint |
| `src/server/routes/index.ts` | MODIFY | Mount command routes |
| `src/tui/component/prompt/SlashCommands.tsx` | MODIFY | Dynamic command list |

---

**Next Document**: [02-FILE-HANDLING-SYSTEM.md](./02-FILE-HANDLING-SYSTEM.md)

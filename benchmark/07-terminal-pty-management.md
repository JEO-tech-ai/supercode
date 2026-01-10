# Terminal & PTY Management

## Overview

OpenCode provides sophisticated pseudo-terminal (PTY) handling for running long-lived shell processes, interactive commands, and capturing output in real-time. This enables agents to execute commands, handle interactive prompts, and manage process lifecycles.

## Architecture

### Core Components

```
PTY Management
├── PTY Wrapper
│   ├── Process Spawning
│   ├── I/O Streams
│   └── Process Control
├── Interactive Mode
│   ├── Terminal Emulation
│   ├── ANSI Escape Sequences
│   └── Screen Buffer
├── Session Management
│   ├── PTY Pool
│   ├── Process Tracking
│   └── Cleanup
├── Output Capture
│   ├── Stdout/Stderr
│   ├── Real-time Streaming
│   └── Buffered Capture
└── Security
    ├── Sandboxing
    ├── Resource Limits
    └── Process Isolation
```

### Key Files

- `packages/opencode/src/pty/` - PTY handling directory
- Integration with shell commands

## Implementation Details

### 1. PTY Spawning

```typescript
// Using node-pty library
import { spawn } from 'node-pty'

export class PTYProcess {
  private pty: IPty | null = null
  private output: string = ''
  private exitCode: number | null = null

  spawn(
    command: string,
    args: string[],
    options: PTYOptions
  ): void {
    // Spawn pseudo-terminal
    this.pty = spawn(command, args, {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env
    })

    // Capture output
    this.pty.onData((data) => {
      this.output += data
      if (options.onData) {
        options.onData(data)
      }
    })

    // Capture exit
    this.pty.onExit(({ exitCode, signal }) => {
      this.exitCode = exitCode
      if (options.onExit) {
        options.onExit({ exitCode, signal })
      }
    })
  }
}
```

### 2. Interactive Shell Session

```typescript
export class ShellSession {
  private pty: PTYProcess
  private history: string[] = []
  private cwd: string

  constructor(options: PTYOptions) {
    this.cwd = options.cwd || process.cwd()
    this.pty = new PTYProcess()
    this.pty.spawn('bash', ['-i'], {
      ...options,
      onData: (data) => this.handleOutput(data)
    })
  }

  execute(command: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const output: string[] = []
      let currentOutput = ''

      // Write command to PTY
      this.pty.write(`${command}\n`)

      // Capture output until prompt
      const dataHandler = (data: string) => {
        currentOutput += data
        output.push(data)

        // Detect shell prompt (simple heuristic)
        if (this.isPrompt(currentOutput)) {
          this.pty.off('data', dataHandler)
          resolve({
            output: output.join(''),
            exitCode: 0,
            duration: Date.now() - startTime
          })
        }
      }

      const startTime = Date.now()
      this.pty.on('data', dataHandler)

      // Timeout after 5 minutes
      setTimeout(() => {
        this.pty.off('data', dataHandler)
        reject(new Error('Command timeout'))
      }, 5 * 60 * 1000)
    })
  }

  private isPrompt(output: string): boolean {
    // Simple heuristic: last non-empty line ends with $ or #
    const lines = output.trim().split('\n')
    const lastLine = lines[lines.length - 1]
    return /^\$|# /.test(lastLine)
  }

  write(data: string): void {
    this.pty.write(data)
  }

  resize(cols: number, rows: number): void {
    this.pty.resize({ cols, rows })
  }

  kill(): void {
    this.pty.destroy()
  }
}
```

### 3. Multi-Line Command Execution

```typescript
export async function executeScript(
  script: string,
  options: PTYOptions
): Promise<CommandResult> {
  const session = new ShellSession(options)
  const commands = script.split('\n').filter(line => line.trim())

  const results: CommandResult[] = []

  for (const command of commands) {
    const result = await session.execute(command)
    results.push(result)

    // Stop on error if fail-fast mode
    if (options.failFast && result.exitCode !== 0) {
      break
    }
  }

  session.kill()

  return {
    output: results.map(r => r.output).join('\n'),
    exitCode: results[results.length - 1].exitCode,
    duration: results.reduce((sum, r) => sum + r.duration, 0)
  }
}
```

### 4. Interactive Prompt Handling

```typescript
export class InteractiveShell {
  private session: ShellSession
  private prompts: Map<string, string> = new Map()

  async executeWithPrompt(
    command: string,
    responses: Record<string, string>
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const output: string[] = []
      let inPrompt = false
      let currentPrompt = ''

      const dataHandler = (data: string) => {
        output.push(data)

        // Detect prompt (e.g., "Continue? [y/n]")
        if (!inPrompt && this.detectPrompt(data)) {
          inPrompt = true
          currentPrompt = this.extractPrompt(data)
        }

        if (inPrompt) {
          // Find matching response
          for (const [pattern, response] of Object.entries(responses)) {
            if (currentPrompt.includes(pattern)) {
              this.session.write(`${response}\n`)
              inPrompt = false
              break
            }
          }
        }
      }

      this.session.write(`${command}\n`)
      this.session.on('data', dataHandler)

      // Timeout
      setTimeout(() => {
        this.session.off('data', dataHandler)
        reject(new Error('Prompt timeout'))
      }, 30000) // 30 seconds for prompts
    })
  }

  private detectPrompt(data: string): boolean {
    const promptPatterns = [
      /\[y\/n\]/i,
      /continue\?/i,
      /enter password:/i,
      /press enter to continue/i
    ]

    return promptPatterns.some(pattern => pattern.test(data))
  }

  private extractPrompt(data: string): string {
    return data.trim().slice(-100) // Last 100 chars
  }
}
```

### 5. PTY Pool Management

```typescript
export class PTYPool {
  private pool = new Map<string, ShellSession>()
  private maxPoolSize = 5

  async acquire(
    cwd: string,
    options?: PTYOptions
  ): Promise<ShellSession> {
    // Reuse existing session in same directory
    const key = cwd
    if (this.pool.has(key)) {
      return this.pool.get(key)!
    }

    // Create new session
    const session = new ShellSession({ cwd, ...options })

    // Enforce pool size limit
    if (this.pool.size >= this.maxPoolSize) {
      const oldestKey = this.pool.keys().next().value
      this.pool.get(oldestKey)?.kill()
      this.pool.delete(oldestKey)
    }

    this.pool.set(key, session)
    return session
  }

  release(cwd: string): void {
    const session = this.pool.get(cwd)
    if (session) {
      // Don't kill immediately, reuse later
      // session will be killed when pool is full
    }
  }

  terminateAll(): void {
    for (const session of this.pool.values()) {
      session.kill()
    }
    this.pool.clear()
  }
}
```

### 6. Output Formatting

```typescript
export class OutputFormatter {
  private ansiColorRegex = /\x1b\[[0-9;]*m/g
  private ansiControlRegex = /\x1b\[[0-9;]*[A-Za-z]/g

  stripANSI(output: string): string {
    return output
      .replace(this.ansiColorRegex, '')
      .replace(this.ansiControlRegex, '')
  }

  toHTML(output: string): string {
    // Convert ANSI colors to HTML spans
    let html = this.escapeHTML(output)

    // Simple color mapping
    const colors = {
      '30': '#000', '31': '#f00', '32': '#0f0',
      '33': '#ff0', '34': '#00f', '35': '#f0f',
      '36': '#0ff', '37': '#fff'
    }

    html = html.replace(
      /\x1b\[([0-9]+)m(.+?)\x1b\[0m/g,
      (match, code, text) => {
        const color = colors[code] || '#fff'
        return `<span style="color: ${color}">${text}</span>`
      }
    )

    return html
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
```

### 7. Resource Limits

```typescript
export class ResourceLimitedPTY {
  private pty: PTYProcess
  private cpuUsage: number = 0
  private memoryUsage: number = 0

  async spawnWithLimits(
    command: string,
    args: string[],
    limits: {
      maxCpu?: number, // percentage
      maxMemory?: number, // MB
      maxTime?: number // seconds
    }
  ): Promise<CommandResult> {
    // Spawn with ulimit for memory
    if (limits.maxMemory) {
      const ulimitCmd = `ulimit -v ${limits.maxMemory * 1024} && ${command}`
      command = 'bash'
      args = ['-c', ulimitCmd]
    }

    this.pty.spawn(command, args, {
      onExit: ({ exitCode }) => {
        // Check if terminated due to limits
        if (exitCode === 137) {
          throw new ResourceLimitError('Process killed: Memory limit exceeded')
        }
      }
    })

    // Start monitoring
    const monitor = setInterval(() => {
      this.checkLimits(limits)
    }, 1000)

    // Timeout
    if (limits.maxTime) {
      setTimeout(() => {
        this.pty.kill()
        throw new ResourceLimitError('Process timeout')
      }, limits.maxTime * 1000)
    }

    const result = await this.pty.wait()
    clearInterval(monitor)

    return result
  }

  private checkLimits(limits: ResourceLimits): void {
    // Monitor CPU and memory usage
    const stats = this.getProcessStats()

    if (limits.maxCpu && stats.cpu > limits.maxCpu) {
      Log.warn(`CPU usage (${stats.cpu}%) exceeds limit`)
    }

    if (limits.maxMemory && stats.memory > limits.maxMemory) {
      Log.warn(`Memory usage (${stats.memory}MB) exceeds limit`)
    }
  }

  private getProcessStats(): ProcessStats {
    // Use process stats from OS
    // Implementation varies by platform
    return {
      cpu: 0,
      memory: 0
    }
  }
}
```

## Configuration

### PTY Options

```typescript
export interface PTYOptions {
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
  onData?: (data: string) => void
  onExit?: (result: { exitCode: number, signal: string }) => void
  failFast?: boolean
  timeout?: number // milliseconds
}
```

### Security Options

```typescript
export interface SecurityOptions {
  sandbox?: boolean // Run in isolated environment
  allowedCommands?: string[] // Whitelist of commands
  deniedCommands?: string[] // Blacklist of commands
  maxCpu?: number // Max CPU percentage
  maxMemory?: number // Max memory in MB
  maxTime?: number // Max execution time in seconds
  readonly?: boolean // Read-only filesystem
  networkDisabled?: boolean // No network access
}
```

## Security Considerations

### Command Whitelisting

```typescript
export class CommandValidator {
  private allowedCommands: Set<string>
  private deniedCommands: Set<string>

  validate(command: string): boolean {
    const baseCommand = command.split(' ')[0]

    // Check denied list
    if (this.deniedCommands.has(baseCommand)) {
      throw new SecurityError(
        `Command denied by policy: ${baseCommand}`
      )
    }

    // Check allowed list (if specified)
    if (this.allowedCommands.size > 0 &&
        !this.allowedCommands.has(baseCommand)) {
      throw new SecurityError(
        `Command not allowed: ${baseCommand}`
      )
    }

    return true
  }
}
```

### Path Sanitization

```typescript
export class PathSanitizer {
  private allowedDirectories: Set<string>

  sanitize(path: string): string {
    // Resolve absolute path
    const resolved = resolve(path)

    // Check if path is allowed
    for (const allowed of this.allowedDirectories) {
      if (resolved.startsWith(allowed)) {
        return resolved
      }
    }

    throw new SecurityError(
      `Path not allowed: ${path}`
    )
  }
}
```

## Benefits for SuperCoin

### Current Limitations

SuperCoin has:
- Simple shell execution via Bun.spawn()
- No interactive prompt handling
- No PTY support
- No output formatting
- No process pooling

### Opportunities

1. **Interactive Commands**: Handle prompts (y/n, password, etc.)
2. **Long-Running Processes**: Manage background processes
3. **Output Formatting**: Convert ANSI to HTML/markdown
4. **Process Pooling**: Reuse shell sessions
5. **Resource Limits**: Prevent runaway processes
6. **Terminal Emulation**: Full xterm-256color support

### Implementation Path

1. **Phase 1**: Install and integrate node-pty library
2. **Phase 2**: Implement basic ShellSession wrapper
3. **Phase 3**: Add interactive prompt detection and handling
4. **Phase 4**: Implement PTY pool management
5. **Phase 5**: Add output formatting (ANSI → HTML)
6. **Phase 6**: Implement resource limits
7. **Phase 7**: Add security (whitelist, sandbox)

## Technical Specifications

### Performance Metrics

- **PTY Spawn**: 10-50ms
- **Command Execution**: Varies by command
- **Output Capture**: <1ms latency
- **PTY Pool Hit**: 0ms (reused session)

### Memory Footprint

- **Per PTY Process**: ~5-10MB
- **Output Buffer**: ~1-10MB (depends on output size)
- **Pool Overhead**: ~50MB (5 sessions)

### Terminal Capabilities

- **Colors**: xterm-256color (256 colors)
- **Control Sequences**: ANSI escape codes
- **Window Resize**: Dynamic cols/rows
- **Unicode**: Full UTF-8 support

## Testing Strategy

### Unit Tests

```typescript
describe('PTYProcess', () => {
  it('should spawn shell', async () => {
    const pty = new PTYProcess()
    pty.spawn('echo', ['hello'], { cwd: '/tmp' })
    const result = await pty.wait()
    expect(result.output).toContain('hello')
    expect(result.exitCode).toBe(0)
  })

  it('should handle interactive prompts', async () => {
    const shell = new InteractiveShell()
    const result = await shell.executeWithPrompt(
      'rm -i test.txt',
      { 'remove test.txt?': 'y' }
    )
    expect(result.exitCode).toBe(0)
  })
})
```

### Integration Tests

```typescript
describe('PTY Integration', () => {
  it('should execute multi-line script', async () => {
    const script = `
      echo "line 1"
      echo "line 2"
      echo "line 3"
    `
    const result = await executeScript(script, { cwd: '/tmp' })
    expect(result.output).toContain('line 1')
    expect(result.output).toContain('line 2')
    expect(result.output).toContain('line 3')
  })

  it('should enforce resource limits', async () => {
    const pty = new ResourceLimitedPTY()
    await expect(
      pty.spawnWithLimits('stress', ['--cpu', '1'], {
        maxTime: 5
      })
    ).rejects.toThrow(ResourceLimitError)
  })
})
```

## References

- [node-pty](https://github.com/microsoft/node-pty) - PTY library
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [ANSI Escape Codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [Terminal Emulation](https://invisible-island.net/xtermcontrol.html)

---

**Status**: ✅ Benchmarked from opencode v0.1.x
**Complexity**: Medium-High
**Priority**: High (interactive commands essential)
**Estimated Effort**: 2-3 weeks for full implementation

# Phase 2: Core Features (핵심 기능)

> **Multi-Agent Execution**: Claude(구현) → Gemini(코드리뷰) → Codex(테스트) → Claude(수정)

## 목표

oh-my-opencode의 핵심 기능 포팅 및 통합:
1. Background Agent Manager (병렬 태스크 실행)
2. Ralph Loop (자율 반복 루프)
3. Enhanced LSP Tools (11개 LSP 도구)
4. Session Compaction 고도화

---

## 1. Background Agent Manager

### 1.1 아키텍처

```
src/features/background-agent/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── manager.ts            # BackgroundManager class
├── task.ts               # Task wrapper
├── concurrency.ts        # Concurrency limiter
└── cleanup.ts            # TTL cleanup daemon
```

### 1.2 타입 정의

```typescript
// src/features/background-agent/types.ts

export interface BackgroundTask {
  id: string;
  sessionId: string;
  agentId: string;
  provider: string;
  model: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: Error;
}

export interface ConcurrencyConfig {
  // Global limits
  maxConcurrent: number;
  // Per-provider limits
  perProvider: Record<string, number>;
  // Per-model limits
  perModel: Record<string, number>;
}

export interface BackgroundManagerConfig {
  concurrency: ConcurrencyConfig;
  ttlMs: number;           // Default: 30 minutes
  cleanupIntervalMs: number; // Default: 5 minutes
}

export interface TaskOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  onProgress?: (progress: number) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}
```

### 1.3 Background Manager 구현

```typescript
// src/features/background-agent/manager.ts

export class BackgroundManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private running: Map<string, Promise<void>> = new Map();
  private queues: Map<string, BackgroundTask[]> = new Map(); // priority queues
  private config: BackgroundManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: BackgroundManagerConfig) {
    this.config = config;
    this.startCleanupDaemon();
  }

  async submit(task: Omit<BackgroundTask, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullTask: BackgroundTask = {
      ...task,
      id,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(id, fullTask);
    await this.enqueue(fullTask);

    return id;
  }

  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      task.status = 'cancelled';
      return true;
    }

    if (task.status === 'running') {
      // Abort signal handling
      task.status = 'cancelled';
      return true;
    }

    return false;
  }

  getStatus(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  getBySession(sessionId: string): BackgroundTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.sessionId === sessionId);
  }

  private async enqueue(task: BackgroundTask): Promise<void> {
    const key = this.getQueueKey(task);

    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }

    this.queues.get(key)!.push(task);
    this.processQueue(key);
  }

  private async processQueue(key: string): Promise<void> {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    const running = this.getRunningCount(key);
    const limit = this.getConcurrencyLimit(key);

    if (running >= limit) return;

    const task = queue.shift()!;
    await this.executeTask(task);
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();

    try {
      const result = await this.runAgent(task);
      task.result = result;
      task.status = 'completed';
    } catch (error) {
      task.error = error as Error;
      task.status = 'failed';
    } finally {
      task.completedAt = new Date();
      this.processQueue(this.getQueueKey(task));
    }
  }

  private startCleanupDaemon(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();

      for (const [id, task] of this.tasks) {
        const age = now - task.createdAt.getTime();

        if (age > this.config.ttlMs &&
            (task.status === 'completed' || task.status === 'failed')) {
          this.tasks.delete(id);
        }
      }
    }, this.config.cleanupIntervalMs);
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    // Cancel all running tasks
    for (const [id, task] of this.tasks) {
      if (task.status === 'running') {
        task.status = 'cancelled';
      }
    }
  }
}
```

### 1.4 Concurrency Limiter

```typescript
// src/features/background-agent/concurrency.ts

export class ConcurrencyLimiter {
  private limits: Map<string, number> = new Map();
  private current: Map<string, number> = new Map();
  private waiting: Map<string, Array<() => void>> = new Map();

  setLimit(key: string, limit: number): void {
    this.limits.set(key, limit);
    this.current.set(key, 0);
    this.waiting.set(key, []);
  }

  async acquire(key: string): Promise<() => void> {
    const limit = this.limits.get(key) || 1;
    const current = this.current.get(key) || 0;

    if (current < limit) {
      this.current.set(key, current + 1);
      return () => this.release(key);
    }

    // Wait for slot
    return new Promise(resolve => {
      this.waiting.get(key)!.push(() => {
        this.current.set(key, (this.current.get(key) || 0) + 1);
        resolve(() => this.release(key));
      });
    });
  }

  private release(key: string): void {
    const current = this.current.get(key) || 0;
    this.current.set(key, Math.max(0, current - 1));

    const waiting = this.waiting.get(key);
    if (waiting && waiting.length > 0) {
      const next = waiting.shift()!;
      next();
    }
  }
}
```

---

## 2. Ralph Loop 구현

### 2.1 아키텍처

```
src/core/hooks/ralph-loop/
├── index.ts              # Hook registration
├── types.ts              # Type definitions
├── detector.ts           # Completion promise detector
├── executor.ts           # Loop executor
└── cli.ts                # CLI command handler
```

### 2.2 타입 정의

```typescript
// src/core/hooks/ralph-loop/types.ts

export interface RalphLoopConfig {
  maxIterations: number;      // Default: 10
  timeoutMs: number;          // Default: 30 minutes
  completionPatterns: string[]; // Patterns indicating completion
  pauseOnError: boolean;      // Pause for user input on error
}

export interface RalphLoopState {
  sessionId: string;
  taskPrompt: string;
  currentIteration: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'timeout';
  history: RalphIteration[];
  startedAt: Date;
}

export interface RalphIteration {
  iteration: number;
  prompt: string;
  response: string;
  toolCalls: ToolCall[];
  completionDetected: boolean;
  durationMs: number;
}

export type RalphCompletionPromise =
  | 'task_complete'
  | 'all_tests_pass'
  | 'no_more_changes'
  | 'user_satisfied'
  | 'manual_stop';
```

### 2.3 Completion Detector

```typescript
// src/core/hooks/ralph-loop/detector.ts

export class CompletionDetector {
  private patterns: RegExp[];

  constructor(config: RalphLoopConfig) {
    this.patterns = config.completionPatterns.map(p => new RegExp(p, 'i'));
  }

  detect(response: string, toolCalls: ToolCall[]): RalphCompletionPromise | null {
    // Check response patterns
    for (const pattern of this.patterns) {
      if (pattern.test(response)) {
        return 'task_complete';
      }
    }

    // Check for test success indicators
    if (this.hasTestSuccess(toolCalls)) {
      return 'all_tests_pass';
    }

    // Check for no changes made
    if (this.hasNoChanges(toolCalls)) {
      return 'no_more_changes';
    }

    return null;
  }

  private hasTestSuccess(toolCalls: ToolCall[]): boolean {
    const testCalls = toolCalls.filter(tc =>
      tc.name === 'bash' &&
      (tc.args.command?.includes('test') || tc.args.command?.includes('jest'))
    );

    return testCalls.some(tc =>
      tc.result?.includes('passed') && !tc.result?.includes('failed')
    );
  }

  private hasNoChanges(toolCalls: ToolCall[]): boolean {
    const editCalls = toolCalls.filter(tc =>
      tc.name === 'edit' || tc.name === 'write'
    );

    return editCalls.length === 0;
  }
}
```

### 2.4 Loop Executor

```typescript
// src/core/hooks/ralph-loop/executor.ts

export class RalphLoopExecutor {
  private state: RalphLoopState | null = null;
  private detector: CompletionDetector;
  private abortController: AbortController | null = null;

  constructor(private config: RalphLoopConfig) {
    this.detector = new CompletionDetector(config);
  }

  async start(sessionId: string, taskPrompt: string): Promise<RalphLoopState> {
    this.abortController = new AbortController();

    this.state = {
      sessionId,
      taskPrompt,
      currentIteration: 0,
      status: 'running',
      history: [],
      startedAt: new Date(),
    };

    while (this.shouldContinue()) {
      const iteration = await this.runIteration();
      this.state.history.push(iteration);
      this.state.currentIteration++;

      if (iteration.completionDetected) {
        this.state.status = 'completed';
        break;
      }
    }

    return this.state;
  }

  private shouldContinue(): boolean {
    if (!this.state) return false;
    if (this.abortController?.signal.aborted) return false;
    if (this.state.currentIteration >= this.config.maxIterations) {
      this.state.status = 'timeout';
      return false;
    }

    const elapsed = Date.now() - this.state.startedAt.getTime();
    if (elapsed > this.config.timeoutMs) {
      this.state.status = 'timeout';
      return false;
    }

    return this.state.status === 'running';
  }

  private async runIteration(): Promise<RalphIteration> {
    const startTime = Date.now();

    const prompt = this.buildIterationPrompt();
    const response = await this.executeAgent(prompt);

    const completionPromise = this.detector.detect(
      response.content,
      response.toolCalls
    );

    return {
      iteration: this.state!.currentIteration,
      prompt,
      response: response.content,
      toolCalls: response.toolCalls,
      completionDetected: completionPromise !== null,
      durationMs: Date.now() - startTime,
    };
  }

  private buildIterationPrompt(): string {
    const basePrompt = this.state!.taskPrompt;
    const iteration = this.state!.currentIteration;

    if (iteration === 0) {
      return `[Ralph Loop Start] ${basePrompt}

Continue working until the task is complete. Signal completion when done.`;
    }

    const lastIteration = this.state!.history[this.state!.history.length - 1];

    return `[Ralph Loop Iteration ${iteration}]
Previous iteration summary: ${lastIteration.response.slice(0, 500)}...

Continue working on: ${basePrompt}

If the task is complete, clearly state "TASK COMPLETE" or "All tests pass".`;
  }

  stop(): void {
    this.abortController?.abort();
    if (this.state) {
      this.state.status = 'paused';
    }
  }
}
```

### 2.5 CLI Integration

```typescript
// src/core/hooks/ralph-loop/cli.ts

export function registerRalphLoopCommand(program: Command): void {
  program
    .command('ralph-loop')
    .alias('rl')
    .description('Run task in autonomous loop until completion')
    .argument('<task>', 'Task description')
    .option('--max-iterations <n>', 'Maximum iterations', '10')
    .option('--timeout <ms>', 'Timeout in milliseconds', '1800000')
    .action(async (task, options) => {
      const executor = new RalphLoopExecutor({
        maxIterations: parseInt(options.maxIterations),
        timeoutMs: parseInt(options.timeout),
        completionPatterns: DEFAULT_COMPLETION_PATTERNS,
        pauseOnError: true,
      });

      const state = await executor.start(currentSession.id, task);

      console.log(`Ralph Loop completed after ${state.currentIteration} iterations`);
      console.log(`Status: ${state.status}`);
    });
}
```

---

## 3. Enhanced LSP Tools (11개)

### 3.1 추가 LSP 도구 목록

```
src/core/tools/lsp/
├── index.ts              # Exports (기존)
├── hover.ts              # (기존)
├── goto.ts               # (기존)
├── references.ts         # (기존)
├── rename.ts             # (기존)
├── codeActions.ts        # 신규
├── diagnostics.ts        # 신규
├── workspaceSymbols.ts   # 신규
├── documentSymbols.ts    # 신규
├── signatureHelp.ts      # 신규
└── completions.ts        # 확장
```

### 3.2 Code Actions Tool

```typescript
// src/core/tools/lsp/codeActions.ts

import { z } from 'zod';

export const codeActionsTool = {
  name: 'lsp_code_actions',
  description: 'Get available code actions (quick fixes, refactorings) at a position',
  args: z.object({
    file: z.string().describe('File path'),
    line: z.number().describe('Line number (1-based)'),
    character: z.number().describe('Character position'),
    diagnostics: z.array(z.string()).optional().describe('Specific diagnostics to address'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const client = await getLSPClient(args.file);

    const actions = await client.sendRequest('textDocument/codeAction', {
      textDocument: { uri: fileUriFromPath(args.file) },
      range: {
        start: { line: args.line - 1, character: args.character },
        end: { line: args.line - 1, character: args.character },
      },
      context: {
        diagnostics: args.diagnostics || [],
      },
    });

    return formatCodeActions(actions);
  },
};

function formatCodeActions(actions: CodeAction[]): string {
  if (!actions || actions.length === 0) {
    return 'No code actions available at this position.';
  }

  return actions.map((action, i) => {
    return `${i + 1}. [${action.kind}] ${action.title}`;
  }).join('\n');
}
```

### 3.3 Diagnostics Tool

```typescript
// src/core/tools/lsp/diagnostics.ts

export const diagnosticsTool = {
  name: 'lsp_diagnostics',
  description: 'Get all diagnostics (errors, warnings) for a file',
  args: z.object({
    file: z.string().describe('File path'),
    severity: z.enum(['error', 'warning', 'info', 'hint']).optional(),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const client = await getLSPClient(args.file);

    // Request diagnostics
    const diagnostics = await client.getDiagnostics(args.file);

    // Filter by severity if specified
    let filtered = diagnostics;
    if (args.severity) {
      const severityMap = { error: 1, warning: 2, info: 3, hint: 4 };
      filtered = diagnostics.filter(d => d.severity === severityMap[args.severity!]);
    }

    return formatDiagnostics(filtered);
  },
};
```

### 3.4 Workspace Symbols Tool

```typescript
// src/core/tools/lsp/workspaceSymbols.ts

export const workspaceSymbolsTool = {
  name: 'lsp_workspace_symbols',
  description: 'Search for symbols across the entire workspace',
  args: z.object({
    query: z.string().describe('Symbol search query'),
    limit: z.number().default(20).describe('Maximum results'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const client = await getWorkspaceLSPClient();

    const symbols = await client.sendRequest('workspace/symbol', {
      query: args.query,
    });

    return formatWorkspaceSymbols(symbols.slice(0, args.limit));
  },
};
```

### 3.5 Document Symbols Tool

```typescript
// src/core/tools/lsp/documentSymbols.ts

export const documentSymbolsTool = {
  name: 'lsp_document_symbols',
  description: 'Get all symbols (functions, classes, variables) in a file',
  args: z.object({
    file: z.string().describe('File path'),
    kind: z.enum(['function', 'class', 'variable', 'interface', 'all']).default('all'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const client = await getLSPClient(args.file);

    const symbols = await client.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: fileUriFromPath(args.file) },
    });

    let filtered = symbols;
    if (args.kind !== 'all') {
      const kindMap = { function: 12, class: 5, variable: 13, interface: 11 };
      filtered = symbols.filter(s => s.kind === kindMap[args.kind]);
    }

    return formatDocumentSymbols(filtered);
  },
};
```

### 3.6 Signature Help Tool

```typescript
// src/core/tools/lsp/signatureHelp.ts

export const signatureHelpTool = {
  name: 'lsp_signature_help',
  description: 'Get function/method signature help at cursor position',
  args: z.object({
    file: z.string().describe('File path'),
    line: z.number().describe('Line number (1-based)'),
    character: z.number().describe('Character position'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const client = await getLSPClient(args.file);

    const help = await client.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri: fileUriFromPath(args.file) },
      position: { line: args.line - 1, character: args.character },
    });

    return formatSignatureHelp(help);
  },
};
```

---

## 4. Session Compaction 고도화

### 4.1 LLM 기반 Compaction

```typescript
// src/core/session/compaction.ts (확장)

export interface CompactionConfig {
  threshold: number;          // Token usage threshold (default: 0.85)
  preserveRecent: number;     // Recent messages to preserve (default: 5)
  summaryModel: string;       // Model for summarization
  maxSummaryTokens: number;   // Max tokens for summary
}

export class SessionCompactor {
  constructor(private config: CompactionConfig) {}

  async compact(session: Session): Promise<Session> {
    const messages = session.messages;
    const tokenCount = this.countTokens(messages);
    const maxTokens = this.getMaxTokens(session.model);

    if (tokenCount / maxTokens < this.config.threshold) {
      return session; // No compaction needed
    }

    // Preserve recent messages
    const recent = messages.slice(-this.config.preserveRecent);
    const toCompact = messages.slice(0, -this.config.preserveRecent);

    // Generate summary using LLM
    const summary = await this.generateSummary(toCompact);

    // Create compacted session
    return {
      ...session,
      messages: [
        { role: 'system', content: `[Session Summary]\n${summary}` },
        ...recent,
      ],
      metadata: {
        ...session.metadata,
        compactedAt: new Date().toISOString(),
        originalMessageCount: messages.length,
      },
    };
  }

  private async generateSummary(messages: Message[]): Promise<string> {
    const prompt = `Summarize the following conversation, preserving:
1. Key decisions and conclusions
2. Important code changes made
3. Outstanding tasks or issues
4. Critical context needed for continuation

Conversation:
${messages.map(m => `[${m.role}]: ${m.content.slice(0, 1000)}`).join('\n\n')}

Summary:`;

    const response = await generateText({
      model: getModel(this.config.summaryModel),
      prompt,
      maxTokens: this.config.maxSummaryTokens,
    });

    return response.text;
  }
}
```

---

## 5. 파일 수정 목록

### 5.1 신규 파일

| 파일 경로 | 목적 | 예상 LOC |
|-----------|------|----------|
| `src/features/background-agent/index.ts` | Exports | 10 |
| `src/features/background-agent/types.ts` | 타입 정의 | 60 |
| `src/features/background-agent/manager.ts` | BackgroundManager | 250 |
| `src/features/background-agent/concurrency.ts` | Concurrency limiter | 80 |
| `src/features/background-agent/cleanup.ts` | Cleanup daemon | 50 |
| `src/core/hooks/ralph-loop/index.ts` | Hook registration | 50 |
| `src/core/hooks/ralph-loop/types.ts` | 타입 정의 | 50 |
| `src/core/hooks/ralph-loop/detector.ts` | Completion detector | 100 |
| `src/core/hooks/ralph-loop/executor.ts` | Loop executor | 200 |
| `src/core/hooks/ralph-loop/cli.ts` | CLI command | 60 |
| `src/core/tools/lsp/codeActions.ts` | Code actions | 80 |
| `src/core/tools/lsp/diagnostics.ts` | Diagnostics | 70 |
| `src/core/tools/lsp/workspaceSymbols.ts` | Workspace symbols | 60 |
| `src/core/tools/lsp/documentSymbols.ts` | Document symbols | 70 |
| `src/core/tools/lsp/signatureHelp.ts` | Signature help | 60 |

### 5.2 수정 파일

| 파일 경로 | 수정 내용 |
|-----------|-----------|
| `src/core/session/compaction.ts` | LLM 기반 compaction 추가 |
| `src/core/tools/lsp/index.ts` | 새 도구 export |
| `src/core/hooks/index.ts` | Ralph loop 등록 |
| `src/cli/commands/index.ts` | /ralph-loop 명령 추가 |

---

## 6. 검증 체크리스트

### 기능 검증
- [ ] Background tasks 병렬 실행
- [ ] Concurrency limit 준수
- [ ] TTL cleanup 동작
- [ ] Ralph Loop 반복 실행
- [ ] Completion detection 정확성
- [ ] 모든 LSP 도구 정상 응답
- [ ] Session compaction 품질

### 통합 검증
- [ ] 기존 agent 시스템과 호환
- [ ] 기존 hook 시스템과 호환
- [ ] Permission 시스템 적용

---

## 다음 단계

→ [04-PHASE3-ADVANCED.md](./04-PHASE3-ADVANCED.md) - Phase 3 고급 기능 구현

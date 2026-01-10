# Phase 7: Oh-My-OpenCode 기능 통합 계획

## 개요

oh-my-opencode 프로젝트의 핵심 기능들을 supercoin에 통합하여 multi-agent AI 개발 시스템으로 발전시킵니다.

**참조 프로젝트**: `/Users/supercent/Documents/Github/oh-my-opencode`
**현재 버전**: oh-my-opencode v2.14.0 (~48,800 lines TypeScript)

---

## 1. Multi-Agent Orchestration 시스템

### 1.1 Coin-style Orchestrator

oh-my-opencode의 Coin 에이전트처럼 작업을 전문 에이전트에게 위임하는 orchestrator를 구현합니다.

**현재 supercoin 구조**:
```typescript
// src/services/agents/coin.ts
export class Coin implements Agent {
  readonly capabilities = ["planning", "delegation", "verification", "coordination"];
}
```

**개선 목표**:
```typescript
// src/services/agents/conductor.ts
export class ConductorAgent implements Agent {
  readonly name = "conductor" as const;
  readonly model = "anthropic/claude-opus-4-5";
  readonly temperature = 0.1;

  // Coin처럼 extended thinking 지원
  readonly thinkingBudget = 32000;

  // 전문 에이전트 위임
  private specialists = {
    oracle: "openai/gpt-5.2",        // 아키텍처, 디버깅
    librarian: "google/gemini-3-pro", // 문서 검색, 리서치
    explorer: "anthropic/claude-haiku-4-5", // 빠른 탐색
    frontend: "google/gemini-3-pro", // UI/UX 개발
    docWriter: "google/gemini-3-flash", // 문서 작성
  };

  async delegate(task: Task, specialist: string): Promise<AgentResult> {
    // Background task로 위임
  }
}
```

### 1.2 Agent 위임 시스템

```typescript
// src/services/agents/delegation.ts
interface DelegationRequest {
  task: string;
  targetAgent: AgentName;
  priority: "high" | "normal" | "low";
  runInBackground?: boolean;
  timeout?: number;
}

interface DelegationResult {
  taskId: string;
  status: "completed" | "running" | "failed";
  result?: AgentResult;
  agent: AgentName;
}

export class DelegationManager {
  async delegate(request: DelegationRequest): Promise<DelegationResult>;
  async getStatus(taskId: string): Promise<DelegationResult>;
  async cancel(taskId: string): Promise<void>;
}
```

---

## 2. Background Task 시스템 강화

### 2.1 Concurrency Manager

oh-my-opencode의 rate limiting 시스템을 참조합니다.

```typescript
// src/services/background/concurrency-manager.ts
interface ConcurrencyConfig {
  defaultConcurrency: number;
  providerConcurrency: Record<ProviderName, number>;
  modelConcurrency: Record<string, number>;
}

export class ConcurrencyManager {
  private config: ConcurrencyConfig = {
    defaultConcurrency: 5,
    providerConcurrency: {
      anthropic: 3,
      openai: 5,
      google: 10,
      antigravity: 5,
    },
    modelConcurrency: {
      "anthropic/claude-opus-4-5": 2,
      "google/gemini-3-flash": 10,
    },
  };

  async acquire(model: string): Promise<void>;
  release(model: string): void;
  getAvailableSlots(provider: ProviderName): number;
}
```

### 2.2 Task Lifecycle

```typescript
// src/services/background/task-manager.ts
type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface BackgroundTask {
  id: string;
  sessionId: string;
  parentSessionId?: string;
  description: string;
  agent: AgentName;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: AgentResult;
  error?: Error;
}

export class TaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();

  async spawn(agent: AgentName, prompt: string, description: string): Promise<string>;
  async getOutput(taskId: string): Promise<AgentResult | null>;
  async cancel(taskId: string): Promise<void>;
  list(filter?: { status?: TaskStatus; agent?: AgentName }): BackgroundTask[];
}
```

---

## 3. Hook 시스템 확장

### 3.1 Hook 이벤트 타입

oh-my-opencode의 22개 hook 시스템을 참조합니다.

```typescript
// src/services/hooks/types.ts
interface HookEvents {
  // Tool lifecycle
  PreToolUse: (args: PreToolUseArgs) => Promise<HookResult>;
  PostToolUse: (args: PostToolUseArgs) => Promise<HookResult>;

  // User interaction
  UserPromptSubmit: (args: PromptArgs) => Promise<HookResult>;

  // Session lifecycle
  Stop: (args: StopArgs) => Promise<HookResult>;
  OnSummarize: (args: SummarizeArgs) => Promise<HookResult>;

  // Error handling
  OnError: (args: ErrorArgs) => Promise<HookResult>;

  // Background tasks
  BackgroundTaskComplete: (args: TaskCompleteArgs) => Promise<HookResult>;
}

interface HookResult {
  continue: boolean;
  modified?: unknown;
  message?: string;
}
```

### 3.2 핵심 Hook 구현

```typescript
// src/services/hooks/implementations/

// 1. Context Injection Hook
export const contextInjectorHook = createHook({
  name: "context-injector",
  event: "UserPromptSubmit",
  handler: async (args) => {
    // AGENTS.md 파일 계층적 주입
  },
});

// 2. Todo Continuation Enforcer
export const todoContinuationHook = createHook({
  name: "todo-continuation-enforcer",
  event: "Stop",
  handler: async (args) => {
    // 미완료 TODO가 있으면 계속 진행
  },
});

// 3. Tool Output Truncator
export const outputTruncatorHook = createHook({
  name: "tool-output-truncator",
  event: "PostToolUse",
  handler: async (args) => {
    // 동적 출력 자르기
  },
});

// 4. Error Recovery Hook
export const errorRecoveryHook = createHook({
  name: "error-recovery",
  event: "OnError",
  handler: async (args) => {
    // 자동 오류 복구
  },
});

// 5. Keyword Detector Hook
export const keywordDetectorHook = createHook({
  name: "keyword-detector",
  event: "UserPromptSubmit",
  handler: async (args) => {
    // ultrawork, search, analyze 키워드 감지
  },
});
```

---

## 4. Context Injection 시스템

### 4.1 계층적 AGENTS.md 주입

```typescript
// src/services/context/agents-injector.ts
export class AgentsInjector {
  private injectedPaths: Set<string> = new Set();

  async inject(currentFile: string): Promise<string[]> {
    const contexts: string[] = [];
    let dir = path.dirname(currentFile);

    while (dir !== "/") {
      const agentsPath = path.join(dir, "AGENTS.md");
      if (!this.injectedPaths.has(agentsPath) && await this.exists(agentsPath)) {
        contexts.push(await this.read(agentsPath));
        this.injectedPaths.add(agentsPath);
      }
      dir = path.dirname(dir);
    }

    return contexts.reverse(); // 상위 → 하위 순서
  }
}
```

### 4.2 조건부 Rules 시스템

```typescript
// src/services/context/rules-loader.ts
interface Rule {
  path: string;
  content: string;
  globs: string[];
  alwaysApply?: boolean;
}

export class RulesLoader {
  private rulesDir = ".claude/rules/";

  async loadForFile(filePath: string): Promise<Rule[]> {
    const rules = await this.loadAllRules();
    return rules.filter(rule =>
      rule.alwaysApply || this.matchesGlob(filePath, rule.globs)
    );
  }
}
```

**예시 Rules 구조**:
```
.claude/rules/
├── typescript.md       # globs: ["*.ts", "*.tsx"]
├── react.md            # globs: ["src/components/**/*"]
├── database.md         # globs: ["db/**/*"], alwaysApply: true
└── testing.md          # globs: ["tests/**/*", "*.test.ts"]
```

---

## 5. LSP Tools 통합

### 5.1 LSP Client 구현

```typescript
// src/services/tools/lsp/client.ts
export class LSPClient {
  private servers: Map<string, LanguageServer> = new Map();

  // Core LSP methods
  async hover(file: string, position: Position): Promise<HoverInfo>;
  async gotoDefinition(file: string, position: Position): Promise<Location[]>;
  async findReferences(file: string, position: Position): Promise<Location[]>;
  async getDocumentSymbols(file: string): Promise<DocumentSymbol[]>;
  async getWorkspaceSymbols(query: string): Promise<WorkspaceSymbol[]>;
  async getDiagnostics(file: string): Promise<Diagnostic[]>;

  // Refactoring
  async prepareRename(file: string, position: Position): Promise<PrepareRenameResult>;
  async rename(file: string, position: Position, newName: string): Promise<WorkspaceEdit>;
  async getCodeActions(file: string, range: Range): Promise<CodeAction[]>;
  async applyCodeAction(action: CodeAction): Promise<void>;
}
```

### 5.2 LSP Tools

```typescript
// src/services/tools/lsp/tools.ts
export const lspTools = {
  lsp_hover: createTool({
    name: "lsp_hover",
    description: "Get type info and documentation for symbol",
    handler: async (args) => lspClient.hover(args.file, args.position),
  }),

  lsp_goto_definition: createTool({
    name: "lsp_goto_definition",
    description: "Jump to symbol definition",
    handler: async (args) => lspClient.gotoDefinition(args.file, args.position),
  }),

  lsp_find_references: createTool({
    name: "lsp_find_references",
    description: "Find all usages of symbol",
    handler: async (args) => lspClient.findReferences(args.file, args.position),
  }),

  lsp_rename: createTool({
    name: "lsp_rename",
    description: "Rename symbol across workspace",
    handler: async (args) => lspClient.rename(args.file, args.position, args.newName),
  }),

  // ... 기타 LSP tools
};
```

---

## 6. Session Management 시스템

### 6.1 Session Store

```typescript
// src/services/sessions/store.ts
interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  messages: Message[];
  metadata: SessionMetadata;
}

interface SessionMetadata {
  tokenCount: number;
  model: string;
  compactionCount: number;
  errorCount: number;
}

export class SessionStore {
  async create(): Promise<Session>;
  async get(id: string): Promise<Session | null>;
  async update(id: string, data: Partial<Session>): Promise<Session>;
  async delete(id: string): Promise<void>;
  async list(filter?: SessionFilter): Promise<Session[]>;
  async search(query: string): Promise<Session[]>;
}
```

### 6.2 Session Tools

```typescript
// src/services/tools/session/tools.ts
export const sessionTools = {
  session_list: createTool({
    name: "session_list",
    description: "List sessions with filtering",
    handler: async (args) => sessionStore.list(args.filter),
  }),

  session_read: createTool({
    name: "session_read",
    description: "Read messages from session",
    handler: async (args) => sessionStore.get(args.sessionId),
  }),

  session_search: createTool({
    name: "session_search",
    description: "Full-text search across sessions",
    handler: async (args) => sessionStore.search(args.query),
  }),
};
```

---

## 7. Dynamic Output Truncation

### 7.1 Token-aware Truncator

```typescript
// src/services/context/truncator.ts
interface TruncationConfig {
  maxTokens: number;
  headroomPercent: number;  // 50%
  protectedTools: string[]; // 자르면 안 되는 tools
}

export class DynamicTruncator {
  private config: TruncationConfig = {
    maxTokens: 50000,
    headroomPercent: 0.5,
    protectedTools: ["task", "todowrite", "lsp_rename"],
  };

  truncate(output: string, contextUsed: number, totalContext: number): string {
    const remaining = totalContext - contextUsed;
    const budget = Math.min(remaining * this.config.headroomPercent, this.config.maxTokens);

    if (this.estimateTokens(output) <= budget) {
      return output;
    }

    return this.smartTruncate(output, budget);
  }

  private smartTruncate(output: string, budget: number): string {
    // 중요한 부분 유지하면서 자르기
    // - 첫 번째/마지막 결과 유지
    // - 중간 부분 요약
  }
}
```

---

## 8. Ultrawork 모드

### 8.1 키워드 감지 및 모드 활성화

```typescript
// src/services/modes/ultrawork.ts
export class UltraworkMode {
  private keywords = ["ultrawork", "ulw", "울트라워크"];

  isTriggered(prompt: string): boolean {
    return this.keywords.some(kw =>
      prompt.toLowerCase().includes(kw)
    );
  }

  activate(): ModeConfig {
    return {
      parallelAgents: true,
      aggressiveBackgroundTasks: true,
      deepExploration: true,
      autoRetry: true,
      maxIterations: 100,
    };
  }
}

// src/services/modes/search.ts
export class SearchMode {
  private keywords = ["search", "find", "찾아", "検索"];

  activate(): ModeConfig {
    return {
      agents: ["explorer", "librarian"],
      parallel: true,
      evidenceBased: true,
    };
  }
}

// src/services/modes/analyze.ts
export class AnalyzeMode {
  private keywords = ["analyze", "investigate", "분석", "調査"];

  activate(): ModeConfig {
    return {
      deepAnalysis: true,
      expertConsultation: true,
      multiPhase: true,
    };
  }
}
```

---

## 9. Configuration 시스템 확장

### 9.1 확장된 Config Schema

```typescript
// src/config/schema.ts
export const SuperCoinConfigSchema = z.object({
  // 기존 설정
  default_model: z.string(),
  fallback_models: z.array(z.string()),

  // 새로운 설정
  agents: z.record(z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    prompt_append: z.string().optional(),
    disable: z.boolean().optional(),
  })).optional(),

  background_task: z.object({
    defaultConcurrency: z.number().default(5),
    providerConcurrency: z.record(z.number()).optional(),
    modelConcurrency: z.record(z.number()).optional(),
  }).optional(),

  disabled_hooks: z.array(z.string()).optional(),

  conductor_agent: z.object({
    disabled: z.boolean().default(false),
    planner_enabled: z.boolean().default(true),
  }).optional(),

  experimental: z.object({
    preemptive_compaction_threshold: z.number().default(0.85),
    truncate_all_tool_outputs: z.boolean().default(false),
    aggressive_truncation: z.boolean().default(false),
  }).optional(),
});
```

---

## 10. 구현 우선순위

### Phase 7.1: 핵심 인프라 (1주차)
1. Background Task 시스템 강화 (ConcurrencyManager)
2. Hook 시스템 확장
3. Context Injection 기본 구현

### Phase 7.2: Agent 시스템 (2주차)
4. Conductor Agent 구현
5. Delegation Manager
6. Ultrawork/Search/Analyze 모드

### Phase 7.3: 도구 통합 (3주차)
7. LSP Tools 통합
8. Session Management
9. Dynamic Truncator

### Phase 7.4: 검증 및 최적화 (4주차)
10. E2E 테스트
11. 성능 최적화
12. 문서화

---

## 참고 파일

oh-my-opencode 핵심 파일:
- `src/agents/sisyphus.ts` (504 lines) - Orchestrator 참조
- `src/hooks/` (22 hooks) - Hook 시스템 참조
- `src/tools/lsp/` - LSP 도구 참조
- `src/features/background-agent/` - Background task 참조
- `src/shared/dynamic-truncator.ts` - Truncation 참조

supercoin 수정 대상:
- `src/services/agents/` - Agent 시스템
- `src/services/background/` - Background task
- `src/services/hooks/` - Hook 시스템 (새로 생성)
- `src/services/context/` - Context injection (새로 생성)
- `src/services/tools/lsp/` - LSP tools (새로 생성)
- `src/services/sessions/` - Session management
- `src/config/schema.ts` - Config 확장

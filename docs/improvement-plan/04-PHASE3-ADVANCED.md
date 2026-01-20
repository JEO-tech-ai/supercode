# Phase 3: Advanced Features (고급 기능)

> **Multi-Agent Execution**: Gemini(대규모분석) → Claude(고급구현) → Codex(통합테스트)

## 목표

고급 기능 구현 및 아키텍처 고도화:
1. Sisyphus Orchestrator 고도화
2. AST-Grep 통합
3. Configuration Enhancement (5-layer)
4. Enhanced Hook Lifecycle

---

## 1. Sisyphus Orchestrator 고도화

### 1.1 현재 Cent Agent vs 목표 Sisyphus

| 기능 | Cent (현재) | Sisyphus (목표) |
|------|-------------|-----------------|
| Request Classification | Basic | 7-type detailed |
| Agent Delegation | Manual | Automatic |
| Parallel Execution | Limited | Full |
| Context Sharing | Per-call | Session-based |
| Result Integration | Simple concat | Semantic merge |

### 1.2 Request Classification Types

```typescript
// src/agents/sisyphus/classifier.ts

export type RequestType =
  | 'code_generation'      // 새 코드 작성
  | 'code_modification'    // 기존 코드 수정
  | 'bug_fix'              // 버그 수정
  | 'code_review'          // 코드 리뷰
  | 'research'             // 조사/분석
  | 'documentation'        // 문서 작성
  | 'infrastructure';      // 인프라/배포

export interface ClassificationResult {
  type: RequestType;
  confidence: number;
  suggestedAgents: string[];
  context: {
    keywords: string[];
    entities: string[];
    scope: 'file' | 'module' | 'project';
  };
}

export class RequestClassifier {
  async classify(prompt: string): Promise<ClassificationResult> {
    // Keyword-based fast classification
    const keywords = this.extractKeywords(prompt);
    const fastResult = this.keywordClassify(keywords);

    if (fastResult.confidence > 0.8) {
      return fastResult;
    }

    // LLM-based classification for ambiguous cases
    return this.llmClassify(prompt, keywords);
  }

  private keywordClassify(keywords: string[]): ClassificationResult {
    const patterns: Record<RequestType, string[]> = {
      code_generation: ['create', 'implement', 'add', 'build', 'make', 'write'],
      code_modification: ['update', 'change', 'modify', 'refactor', 'improve'],
      bug_fix: ['fix', 'bug', 'error', 'issue', 'broken', 'crash'],
      code_review: ['review', 'check', 'audit', 'analyze', 'examine'],
      research: ['find', 'search', 'locate', 'understand', 'explain'],
      documentation: ['document', 'readme', 'comment', 'api doc'],
      infrastructure: ['deploy', 'docker', 'ci', 'cd', 'kubernetes', 'aws'],
    };

    // Match and score
    let bestMatch: RequestType = 'code_modification';
    let bestScore = 0;

    for (const [type, typeKeywords] of Object.entries(patterns)) {
      const matches = keywords.filter(k =>
        typeKeywords.some(tk => k.toLowerCase().includes(tk))
      );
      const score = matches.length / typeKeywords.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = type as RequestType;
      }
    }

    return {
      type: bestMatch,
      confidence: bestScore,
      suggestedAgents: this.getAgentsForType(bestMatch),
      context: { keywords, entities: [], scope: 'project' },
    };
  }

  private getAgentsForType(type: RequestType): string[] {
    const mapping: Record<RequestType, string[]> = {
      code_generation: ['frontend', 'oracle'],
      code_modification: ['explorer', 'oracle'],
      bug_fix: ['explorer', 'analyst'],
      code_review: ['analyst', 'oracle'],
      research: ['librarian', 'explorer'],
      documentation: ['docwriter', 'librarian'],
      infrastructure: ['executor', 'analyst'],
    };
    return mapping[type];
  }
}
```

### 1.3 Agent Delegation System

```typescript
// src/agents/sisyphus/delegator.ts

export interface DelegationPlan {
  primary: AgentAssignment;
  parallel: AgentAssignment[];
  sequential: AgentAssignment[];
  contextSharing: ContextSharingConfig;
}

export interface AgentAssignment {
  agentId: string;
  task: string;
  priority: number;
  dependencies: string[];
  timeout?: number;
}

export class AgentDelegator {
  constructor(private backgroundManager: BackgroundManager) {}

  async createPlan(
    classification: ClassificationResult,
    prompt: string
  ): Promise<DelegationPlan> {
    const agents = classification.suggestedAgents;

    // Determine execution strategy
    if (classification.type === 'research') {
      // Research: parallel exploration
      return this.createParallelPlan(agents, prompt);
    }

    if (classification.type === 'code_generation') {
      // Code gen: sequential with context passing
      return this.createSequentialPlan(agents, prompt);
    }

    // Default: primary with parallel support
    return this.createHybridPlan(agents, prompt);
  }

  async execute(plan: DelegationPlan): Promise<DelegationResult> {
    const results: Map<string, AgentResult> = new Map();

    // Execute primary
    const primaryResult = await this.executeAgent(plan.primary);
    results.set(plan.primary.agentId, primaryResult);

    // Execute parallel tasks
    const parallelPromises = plan.parallel.map(async assignment => {
      const result = await this.backgroundManager.submit({
        sessionId: currentSession.id,
        agentId: assignment.agentId,
        provider: this.getProvider(assignment.agentId),
        model: this.getModel(assignment.agentId),
        prompt: assignment.task,
      });
      return { id: assignment.agentId, taskId: result };
    });

    const parallelResults = await Promise.all(parallelPromises);

    // Wait for parallel completion and collect
    for (const { id, taskId } of parallelResults) {
      const status = await this.waitForTask(taskId);
      results.set(id, status.result!);
    }

    // Execute sequential tasks
    for (const assignment of plan.sequential) {
      const context = this.buildContext(results, assignment.dependencies);
      const result = await this.executeAgent(assignment, context);
      results.set(assignment.agentId, result);
    }

    return this.integrateResults(results);
  }
}
```

### 1.4 Result Integration

```typescript
// src/agents/sisyphus/integrator.ts

export class ResultIntegrator {
  async integrate(
    results: Map<string, AgentResult>,
    classification: ClassificationResult
  ): Promise<string> {
    // Different integration strategies based on type
    switch (classification.type) {
      case 'research':
        return this.integrateResearch(results);
      case 'code_review':
        return this.integrateReview(results);
      default:
        return this.integrateGeneric(results);
    }
  }

  private async integrateResearch(results: Map<string, AgentResult>): Promise<string> {
    // Combine findings, deduplicate, rank by relevance
    const findings: Finding[] = [];

    for (const [agentId, result] of results) {
      const agentFindings = this.extractFindings(result);
      findings.push(...agentFindings.map(f => ({ ...f, source: agentId })));
    }

    // Deduplicate by semantic similarity
    const unique = this.deduplicateFindings(findings);

    // Format for presentation
    return this.formatFindings(unique);
  }

  private async integrateReview(results: Map<string, AgentResult>): Promise<string> {
    // Merge code review feedback, prioritize by severity
    const issues: ReviewIssue[] = [];

    for (const [agentId, result] of results) {
      const agentIssues = this.extractIssues(result);
      issues.push(...agentIssues);
    }

    // Sort by severity
    issues.sort((a, b) => b.severity - a.severity);

    return this.formatReview(issues);
  }
}
```

---

## 2. AST-Grep 통합

### 2.1 아키텍처

```
src/core/tools/ast-grep/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── search.ts             # AST search tool
├── replace.ts            # AST replace tool
├── patterns.ts           # Common patterns library
└── languages.ts          # Language configurations
```

### 2.2 AST Search Tool

```typescript
// src/core/tools/ast-grep/search.ts

import { z } from 'zod';

export const astSearchTool = {
  name: 'ast_search',
  description: 'Search code using AST patterns. More precise than text search for code structures.',
  args: z.object({
    pattern: z.string().describe('AST pattern to search (sg syntax)'),
    path: z.string().optional().describe('Directory or file to search'),
    lang: z.enum([
      'typescript', 'javascript', 'python', 'go', 'rust',
      'java', 'kotlin', 'c', 'cpp', 'csharp', 'ruby',
      'php', 'swift', 'scala', 'haskell', 'lua', 'elixir',
      'html', 'css', 'json', 'yaml', 'bash', 'dockerfile',
      'sql', 'graphql', 'markdown'
    ]).describe('Programming language'),
    strictness: z.enum(['exact', 'fuzzy']).default('exact'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const searchPath = args.path || process.cwd();

    // Run ast-grep CLI
    const result = await execAsync(
      `sg --pattern '${args.pattern}' --lang ${args.lang} ${searchPath} --json`
    );

    const matches = JSON.parse(result.stdout);
    return formatAstMatches(matches);
  },
};

function formatAstMatches(matches: AstMatch[]): string {
  if (matches.length === 0) {
    return 'No matches found.';
  }

  return matches.map(match => {
    return `## ${match.file}:${match.range.start.line}
\`\`\`${match.language}
${match.text}
\`\`\`
`;
  }).join('\n');
}
```

### 2.3 AST Replace Tool

```typescript
// src/core/tools/ast-grep/replace.ts

export const astReplaceTool = {
  name: 'ast_replace',
  description: 'Replace code using AST patterns. Safe refactoring across codebase.',
  args: z.object({
    pattern: z.string().describe('AST pattern to match'),
    replacement: z.string().describe('Replacement pattern (can use $1, $2 for captures)'),
    path: z.string().optional(),
    lang: z.enum([/* same as search */]).describe('Programming language'),
    dryRun: z.boolean().default(true).describe('Preview changes without applying'),
  }),

  async execute(args: z.infer<typeof this.args>): Promise<string> {
    const searchPath = args.path || process.cwd();

    const cmd = args.dryRun
      ? `sg --pattern '${args.pattern}' --rewrite '${args.replacement}' --lang ${args.lang} ${searchPath}`
      : `sg --pattern '${args.pattern}' --rewrite '${args.replacement}' --lang ${args.lang} ${searchPath} --update-all`;

    const result = await execAsync(cmd);

    if (args.dryRun) {
      return `Preview of changes:\n${result.stdout}\n\nRun with dryRun: false to apply.`;
    }

    return `Applied changes:\n${result.stdout}`;
  },
};
```

### 2.4 Common Patterns Library

```typescript
// src/core/tools/ast-grep/patterns.ts

export const COMMON_PATTERNS = {
  typescript: {
    // Find all async functions
    asyncFunctions: 'async function $NAME($$$PARAMS) { $$$BODY }',
    // Find all React components
    reactComponents: 'function $NAME($PROPS): JSX.Element { $$$BODY }',
    // Find all useState hooks
    useState: 'const [$STATE, $SETTER] = useState($INITIAL)',
    // Find console.log statements
    consoleLog: 'console.log($$$ARGS)',
    // Find try-catch blocks
    tryCatch: 'try { $$$TRY } catch ($ERR) { $$$CATCH }',
  },

  python: {
    // Find all function definitions
    functions: 'def $NAME($$$PARAMS): $$$BODY',
    // Find all class definitions
    classes: 'class $NAME($$$BASES): $$$BODY',
    // Find all import statements
    imports: 'import $MODULE',
    // Find all print statements
    prints: 'print($$$ARGS)',
  },

  javascript: {
    // Find all arrow functions
    arrowFunctions: 'const $NAME = ($$$PARAMS) => $BODY',
    // Find all require statements
    requires: "require('$MODULE')",
    // Find all exports
    exports: 'export { $$$EXPORTS }',
  },
};
```

---

## 3. Configuration Enhancement (5-layer)

### 3.1 Layer Implementation

```typescript
// src/config/layers.ts (확장)

export interface ConfigLayerSource {
  layer: ConfigLayer;
  priority: number;
  path?: string;
  url?: string;
  content: Partial<SuperCodeConfig>;
}

export class LayeredConfigManager {
  private layers: ConfigLayerSource[] = [];

  async load(projectDir: string): Promise<SuperCodeConfig> {
    // Layer 1: Remote config (.well-known)
    const remote = await this.loadRemoteConfig(projectDir);
    if (remote) this.layers.push({ layer: 'remote', priority: 1, ...remote });

    // Layer 2: Global config
    const global = await this.loadGlobalConfig();
    if (global) this.layers.push({ layer: 'global', priority: 2, ...global });

    // Layer 3: Directory config (.supercode/)
    const directory = await this.loadDirectoryConfig(projectDir);
    if (directory) this.layers.push({ layer: 'directory', priority: 3, ...directory });

    // Layer 4: Project config (supercode.json)
    const project = await this.loadProjectConfig(projectDir);
    if (project) this.layers.push({ layer: 'project', priority: 4, ...project });

    // Layer 5: CLI args (highest priority, applied at runtime)
    // Applied separately via applyCliArgs()

    return this.merge();
  }

  private async loadRemoteConfig(projectDir: string): Promise<ConfigLayerSource | null> {
    // Check for .well-known/supercode endpoint
    const wellKnownPath = path.join(projectDir, '.well-known', 'supercode');

    if (await exists(wellKnownPath)) {
      const content = await readFile(wellKnownPath, 'utf-8');
      const parsed = parseConfigFile(content, wellKnownPath);
      return { layer: 'remote', priority: 1, path: wellKnownPath, content: parsed };
    }

    // Try remote URL from project config
    const projectConfig = await this.loadProjectConfig(projectDir);
    if (projectConfig?.content?.remoteConfigUrl) {
      try {
        const response = await fetch(projectConfig.content.remoteConfigUrl);
        const content = await response.json();
        return {
          layer: 'remote',
          priority: 1,
          url: projectConfig.content.remoteConfigUrl,
          content,
        };
      } catch {
        // Remote config optional, continue without
      }
    }

    return null;
  }

  private merge(): SuperCodeConfig {
    // Sort by priority (ascending = lower priority first)
    const sorted = [...this.layers].sort((a, b) => a.priority - b.priority);

    // Deep merge with later layers overriding earlier
    let result: Partial<SuperCodeConfig> = {};

    for (const layer of sorted) {
      result = deepMerge(result, layer.content);
    }

    // Validate final config
    return SuperCodeConfigSchema.parse(result);
  }

  applyCliArgs(args: CliArgs): SuperCodeConfig {
    const current = this.merge();

    return {
      ...current,
      ...(args.provider && { provider: args.provider }),
      ...(args.model && { model: args.model }),
      ...(args.noHooks && { hooks: { enabled: false } }),
    };
  }

  getLayerInfo(): ConfigLayerInfo[] {
    return this.layers.map(l => ({
      layer: l.layer,
      path: l.path,
      url: l.url,
      keys: Object.keys(l.content),
    }));
  }
}
```

### 3.2 Remote Config Discovery

```typescript
// src/config/remote.ts

export async function discoverRemoteConfig(
  projectDir: string
): Promise<RemoteConfigResult | null> {
  // Step 1: Check .well-known local file
  const localWellKnown = path.join(projectDir, '.well-known', 'supercode');
  if (await exists(localWellKnown)) {
    return { type: 'local', path: localWellKnown };
  }

  // Step 2: Check git remote and try org-level config
  const gitRemote = await getGitRemote(projectDir);
  if (gitRemote) {
    const orgConfig = await tryOrgConfig(gitRemote);
    if (orgConfig) {
      return { type: 'remote', url: orgConfig.url, config: orgConfig.content };
    }
  }

  return null;
}

async function tryOrgConfig(gitRemote: string): Promise<OrgConfig | null> {
  // Parse org from git remote
  // Try https://raw.githubusercontent.com/{org}/.supercode/main/config.json
  // Or similar org-level config endpoints

  const match = gitRemote.match(/github\.com[:/]([^/]+)/);
  if (!match) return null;

  const org = match[1];
  const configUrls = [
    `https://raw.githubusercontent.com/${org}/.supercode/main/config.json`,
    `https://${org}.github.io/.supercode/config.json`,
  ];

  for (const url of configUrls) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        return { url, content: await response.json() };
      }
    } catch {
      continue;
    }
  }

  return null;
}
```

---

## 4. Enhanced Hook Lifecycle

### 4.1 추가 Hook Types

```typescript
// src/core/hooks/types.ts (확장)

export type HookName =
  // Existing
  | 'onUserPromptSubmit'
  | 'onPreToolUse'
  | 'onPostToolUse'
  | 'onStop'
  | 'onContextWindowLimit'

  // New: Chat lifecycle
  | 'chat.message'              // Intercept/modify messages
  | 'chat.params'               // Modify LLM parameters
  | 'chat.response'             // Process response before display

  // New: Permission
  | 'permission.ask'            // Override permission decisions
  | 'permission.denied'         // Handle denied permissions

  // New: Session
  | 'session.start'             // Session initialization
  | 'session.end'               // Session cleanup
  | 'session.compacting'        // Custom compaction logic

  // New: Experimental
  | 'experimental.chat.messages.transform'
  | 'experimental.chat.system.transform'
  | 'experimental.tool.result.transform';

export interface HookContext {
  session: Session;
  config: SuperCodeConfig;
  agent: Agent;
  permission: PermissionManager;
}

export type HookHandler<T = void> = (
  ctx: HookContext,
  ...args: unknown[]
) => Promise<T>;
```

### 4.2 Hook Pipeline

```typescript
// src/core/hooks/pipeline.ts

export class HookPipeline {
  private registry: Map<HookName, HookHandler[]> = new Map();

  register(name: HookName, handler: HookHandler): () => void {
    if (!this.registry.has(name)) {
      this.registry.set(name, []);
    }
    this.registry.get(name)!.push(handler);

    // Return unregister function
    return () => {
      const handlers = this.registry.get(name);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  async emit<T>(
    name: HookName,
    ctx: HookContext,
    ...args: unknown[]
  ): Promise<T | undefined> {
    const handlers = this.registry.get(name) || [];

    for (const handler of handlers) {
      const result = await handler(ctx, ...args);
      if (result !== undefined) {
        return result as T;
      }
    }

    return undefined;
  }

  async emitChain<T>(
    name: HookName,
    ctx: HookContext,
    initial: T,
    ...args: unknown[]
  ): Promise<T> {
    const handlers = this.registry.get(name) || [];
    let value = initial;

    for (const handler of handlers) {
      const result = await handler(ctx, value, ...args);
      if (result !== undefined) {
        value = result as T;
      }
    }

    return value;
  }
}
```

### 4.3 Message Transform Hook

```typescript
// src/core/hooks/implementations/message-transform.ts

export function createMessageTransformHook(): HookHandler<Message[]> {
  return async (ctx: HookContext, messages: Message[]): Promise<Message[]> => {
    // Example: Inject system context based on file types
    const fileTypes = new Set<string>();

    for (const msg of messages) {
      const fileRefs = extractFileReferences(msg.content);
      for (const ref of fileRefs) {
        fileTypes.add(path.extname(ref));
      }
    }

    // Add language-specific context
    const languageContext = getLanguageContext(fileTypes);

    if (languageContext) {
      return [
        { role: 'system', content: languageContext },
        ...messages,
      ];
    }

    return messages;
  };
}
```

---

## 5. 파일 수정 목록

### 신규 파일

| 파일 경로 | 목적 | 예상 LOC |
|-----------|------|----------|
| `src/agents/sisyphus/index.ts` | Sisyphus exports | 20 |
| `src/agents/sisyphus/classifier.ts` | Request classifier | 150 |
| `src/agents/sisyphus/delegator.ts` | Agent delegator | 200 |
| `src/agents/sisyphus/integrator.ts` | Result integrator | 150 |
| `src/core/tools/ast-grep/index.ts` | AST-Grep exports | 15 |
| `src/core/tools/ast-grep/search.ts` | Search tool | 100 |
| `src/core/tools/ast-grep/replace.ts` | Replace tool | 100 |
| `src/core/tools/ast-grep/patterns.ts` | Common patterns | 80 |
| `src/config/remote.ts` | Remote config | 100 |
| `src/core/hooks/pipeline.ts` | Hook pipeline | 120 |

### 수정 파일

| 파일 경로 | 수정 내용 |
|-----------|-----------|
| `src/agents/cent/index.ts` | Sisyphus 통합 |
| `src/config/layers.ts` | 5-layer 구현 |
| `src/core/hooks/types.ts` | 새 hook types |
| `src/core/hooks/index.ts` | Pipeline 통합 |

---

## 6. 검증 체크리스트

- [ ] Sisyphus 7-type 분류 정확도 > 85%
- [ ] Agent delegation 병렬 실행 정상
- [ ] Result integration 품질 검증
- [ ] AST-Grep 25개 언어 지원
- [ ] Config 5-layer 우선순위 정확
- [ ] 새 hooks 모두 동작

---

## 다음 단계

→ [05-PHASE4-POLISH.md](./05-PHASE4-POLISH.md) - Phase 4 완성도 작업

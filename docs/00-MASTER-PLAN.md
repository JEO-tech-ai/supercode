# SuperCode Enhancement Master Plan

> **목표**: `supercode`를 `oh-my-opencode` 수준의 산업용 AI 에이전트 하네스로 개선

## Executive Summary

`supercode`는 우수한 Multi-frontend 플랫폼(Web, Desktop, TUI)이지만, `oh-my-opencode`의 "Agent Discipline"과 "Long-term Memory" 기능이 부족합니다. 이 계획은 두 프로젝트의 장점을 결합하여 최고 수준의 AI 코딩 어시스턴트를 만드는 것을 목표로 합니다.

## Current State Comparison

| 영역 | supercode | oh-my-opencode | Gap |
|------|-----------|----------------|-----|
| **Hooks 시스템** | 기본 HookRegistry | 22+ 전문 hooks | 🔴 Critical |
| **Agent Discipline** | 단순 구현 | comment-checker, todo-enforcer | 🔴 Critical |
| **Session Tools** | 기본 세션 관리 | session_list/read/search | 🔴 Critical |
| **Config System** | JSON only | JSONC + multi-path + permissions | 🟡 High |
| **Background Agent** | 기본 지원 | BackgroundManager + 병렬 실행 | 🟡 High |
| **Claude Compatibility** | 부분 지원 | Full .claude/ directory support | 🟡 High |
| **Skills Integration** | skill-loader 기본 | MCP + Skills + Commands | 🟢 Medium |
| **Testing** | E2E 중심 | Co-located unit tests | 🟢 Medium |

## Implementation Roadmap

### Phase 1: Core Agent Discipline (Week 1-2)
**Priority: 🔴 Critical**

1. **Hooks System Overhaul** → [01-HOOKS-SYSTEM.md](./01-HOOKS-SYSTEM.md)
   - Port 22+ hooks from oh-my-opencode
   - Implement factory pattern for hook creation
   - Add hook lifecycle management

2. **Agent Discipline** → [02-AGENT-DISCIPLINE.md](./02-AGENT-DISCIPLINE.md)
   - Implement robust comment-checker with filters
   - Add todo-continuation-enforcer
   - Implement thinking-block-validator

3. **Session Tools** → [03-SESSION-TOOLS.md](./03-SESSION-TOOLS.md)
   - Implement session_list tool
   - Implement session_read tool
   - Implement session_search tool

### Phase 2: Configuration & Background (Week 3-4)
**Priority: 🟡 High**

4. **Config System** → [04-CONFIG-SYSTEM.md](./04-CONFIG-SYSTEM.md)
   - Add JSONC support
   - Implement multi-path configuration
   - Add granular permissions (ask/allow/deny)

5. **Background Agent** → [05-BACKGROUND-AGENT.md](./05-BACKGROUND-AGENT.md)
   - Implement BackgroundManager
   - Add ConcurrencyManager for rate limiting
   - Implement background_task/background_output tools

### Phase 3: Integration & Quality (Week 5-6)
**Priority: 🟢 Medium**

6. **Skills Integration** → [06-SKILLS-INTEGRATION.md](./06-SKILLS-INTEGRATION.md)
   - Integrate skills-template system
   - Add MCP server support
   - Implement slash commands

7. **Testing Strategy** → [07-TESTING-STRATEGY.md](./07-TESTING-STRATEGY.md)
   - Add co-located unit tests
   - Implement TDD workflow
   - Achieve 80%+ coverage

## Architecture Overview

```
supercode/
├── src/
│   ├── cli/                    # CLI entry points
│   ├── tui/                    # React/Ink TUI
│   ├── core/
│   │   ├── hooks/              # 🔴 ENHANCE: Hook system
│   │   │   ├── registry.ts
│   │   │   ├── comment-checker/
│   │   │   ├── todo-enforcer/
│   │   │   ├── session-recovery/
│   │   │   └── ...22+ hooks
│   │   ├── tools/              # 🔴 ENHANCE: Add session tools
│   │   │   ├── session/
│   │   │   │   ├── list.ts
│   │   │   │   ├── read.ts
│   │   │   │   └── search.ts
│   │   │   └── ...existing tools
│   │   └── session/
│   ├── agents/                 # Orchestrators & Specialists
│   ├── services/
│   │   └── background/         # 🟡 ENHANCE: BackgroundManager
│   ├── config/                 # 🟡 ENHANCE: JSONC + permissions
│   └── features/
│       ├── skill-loader/       # 🟢 ENHANCE: skills-template
│       └── skill-mcp-manager/
├── packages/                   # Monorepo packages
└── docs/                       # Implementation plans
```

## Key Features to Implement

### 1. Hooks System (from oh-my-opencode)

```typescript
// Target: 22+ specialized hooks
export const HOOKS = [
  'todo-continuation-enforcer',
  'context-window-monitor',
  'session-notification',
  'session-recovery',
  'comment-checker',
  'tool-output-truncator',
  'directory-agents-injector',
  'directory-readme-injector',
  'empty-task-response-detector',
  'anthropic-context-window-limit-recovery',
  'preemptive-compaction',
  'compaction-context-injector',
  'think-mode',
  'claude-code-hooks',
  'rules-injector',
  'background-notification',
  'auto-update-checker',
  'agent-usage-reminder',
  'keyword-detector',
  'non-interactive-env',
  'interactive-bash-session',
  'empty-message-sanitizer',
  'thinking-block-validator',
  'ralph-loop',
  'auto-slash-command',
  'edit-error-recovery',
];
```

### 2. Comment Checker with Filters

```typescript
// oh-my-opencode pattern
src/hooks/comment-checker/
├── index.ts
├── constants.ts
├── types.ts
├── downloader.ts
├── cli.ts
├── filters/
│   ├── index.ts
│   ├── shebang.ts      # #!/usr/bin/env
│   ├── docstring.ts    # JSDoc, PHPDoc
│   ├── directive.ts    # @ts-ignore, eslint-disable
│   └── bdd.ts          # Given, When, Then
└── output/
    ├── index.ts
    ├── formatter.ts
    └── xml-builder.ts
```

### 3. Session Tools

```typescript
// New tools for agent memory
export const session_list = {
  name: 'session_list',
  description: 'List all OpenCode sessions with optional filtering',
  parameters: {
    limit: z.number().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
  },
};

export const session_read = {
  name: 'session_read',
  description: 'Read messages from a session',
  parameters: {
    session_id: z.string(),
    include_todos: z.boolean().optional(),
    limit: z.number().optional(),
  },
};

export const session_search = {
  name: 'session_search',
  description: 'Search content within sessions',
  parameters: {
    query: z.string(),
    session_id: z.string().optional(),
    case_sensitive: z.boolean().optional(),
  },
};
```

### 4. Background Agent System

```typescript
// BackgroundManager for parallel agent execution
class BackgroundManager {
  private tasks: Map<string, BackgroundTask>;
  private concurrencyManager: ConcurrencyManager;

  async launchTask(agent: string, prompt: string): Promise<string>;
  async getOutput(taskId: string, block?: boolean): Promise<TaskResult>;
  async cancelTask(taskId: string): Promise<void>;
  async cancelAll(): Promise<void>;
}
```

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Hooks Count | ~5 | 22+ |
| Test Coverage | ~40% | 80%+ |
| Session Tools | 0 | 3 |
| Config Formats | JSON | JSONC + multi-path |
| Background Agents | Basic | Full parallel support |
| Claude Compatibility | Partial | Full .claude/ support |

## Dependencies

- `@code-yeongyu/comment-checker`: For comment analysis
- `jsonc-parser`: For JSONC configuration support
- `picomatch`: For glob pattern matching
- `@ast-grep/napi`: For AST-based code analysis

## Risk Mitigation

1. **Breaking Changes**: Use feature flags for gradual rollout
2. **Performance**: Implement lazy loading for hooks
3. **Compatibility**: Maintain backward compatibility with existing configs
4. **Testing**: Require tests for all new features (TDD)

## Next Steps

1. ✅ Create implementation plan documents
2. 🔄 Start with Phase 1: Core Agent Discipline
3. 🔄 Implement hooks system overhaul
4. 🔄 Add session tools
5. 🔄 Enhance config system

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete, Implementation Starting

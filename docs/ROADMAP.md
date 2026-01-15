# SuperCode Enhancement Roadmap

> Generated: 2026-01-15
> Based on gap analysis comparing SuperCode with OpenCode + Oh-My-OpenCode

## Overview

This roadmap outlines the prioritized implementation plan to bring SuperCode feature parity with the OpenCode + Oh-My-OpenCode ecosystem, while maintaining SuperCode's unique identity.

---

## Phase 1: Core Stability (Priority: CRITICAL)

**Timeline**: Week 1-2
**Goal**: Ensure robust autonomous operation without crashes or data loss

### 1.1 Background Task Tool
**Priority**: P0 - Blocking other features
**Effort**: 3-4 days
**Dependencies**: None

```
src/core/tools/background-task/
├── index.ts          # Main tool exports
├── manager.ts        # Task lifecycle management
├── types.ts          # Task state, result types
└── executor.ts       # Agent spawning logic
```

**Key Features**:
- Spawn explore/librarian agents asynchronously
- Track task status (pending, running, completed, failed)
- Retrieve results via task_id
- Cancel running tasks
- Parent session tracking

**API**:
```typescript
background_task(agent: "explore" | "librarian", prompt: string) -> task_id
background_output(task_id: string, block?: boolean) -> result
background_cancel(task_id?: string, all?: boolean) -> success
```

### 1.2 Context Window Limit Recovery Hook
**Priority**: P0 - Prevents session crashes
**Effort**: 3-4 days
**Dependencies**: Enhanced session events

```
src/core/hooks/context-window-limit-recovery/
├── index.ts          # Hook factory and event handler
├── parser.ts         # Error message parsing (Anthropic-specific)
├── executor.ts       # Truncation and retry logic
└── types.ts          # State types
```

**Key Features**:
- Detect Anthropic token limit errors
- Parse error to extract limit details
- Truncate large tool outputs
- Auto-retry with DCP (Dynamic Context Pruning)
- Toast notifications for user awareness

**Triggers**:
- `session.error` with token limit message
- `message.updated` with error field

### 1.3 Session Recovery Hook
**Priority**: P0 - Prevents data corruption
**Effort**: 4-5 days
**Dependencies**: Direct storage access

```
src/core/hooks/session-recovery/
├── index.ts          # Main recovery logic
├── storage.ts        # Direct file manipulation for repairs
└── types.ts          # Error types, recovery configs
```

**Recovery Types**:
| Error Type | Recovery Action |
|------------|-----------------|
| `tool_result_missing` | Inject cancelled tool results |
| `thinking_block_order` | Prepend/strip thinking parts |
| `thinking_disabled_violation` | Strip thinking blocks |
| `empty_content` | Inject placeholder text |

### 1.4 Ralph Loop (Agentic Iteration)
**Priority**: P0 - Core autonomous operation
**Effort**: 3-4 days
**Dependencies**: Session events, storage

```
src/core/hooks/ralph-loop/
├── index.ts          # Loop controller
├── storage.ts        # Persistent loop state
├── constants.ts      # Default configs
└── types.ts          # State interfaces
```

**Key Features**:
- Track iteration count with max limit
- Detect completion via promise tag: `<promise>TASK_COMPLETE</promise>`
- Auto-inject continuation prompt on session.idle
- Cancel on user abort
- Toast progress notifications

**Configuration**:
```typescript
interface RalphLoopConfig {
  maxIterations: number;      // default: 25
  completionPromise: string;  // default: "TASK_COMPLETE"
  continuationDelay: number;  // ms before re-prompting
}
```

---

## Phase 2: Agent Enhancement (Priority: HIGH)

**Timeline**: Week 3-4
**Goal**: Improve agent capabilities and coordination

### 2.1 Todo Continuation Enforcer
**Priority**: P1
**Effort**: 2-3 days
**Dependencies**: Ralph Loop, Background Task

```
src/core/hooks/todo-continuation-enforcer.ts
```

**Key Features**:
- Monitor session.idle events
- Check for incomplete todos
- Countdown toast (2s) before auto-resume
- Skip if background tasks running
- Respect agent permissions (skip plan mode)

### 2.2 Think Mode Hook
**Priority**: P1
**Effort**: 1-2 days
**Dependencies**: None

```
src/core/hooks/think-mode.ts
```

**Key Features**:
- Inject thinking budget into requests
- Model-aware (Anthropic extended thinking)
- Configurable budget tokens

### 2.3 Enhanced Sisyphus Prompt Builder
**Priority**: P1
**Effort**: 3-4 days
**Dependencies**: Agent registry

```
src/agents/sisyphus-prompt-builder.ts  # Update existing
```

**Enhancements**:
- Dynamic agent availability sections
- Tool categorization (cost tiers)
- Skill trigger detection
- Key triggers from available agents
- GitHub workflow section
- Frontend delegation rules

### 2.4 Oracle Agent
**Priority**: P2
**Effort**: 1-2 days
**Dependencies**: None

```
src/agents/oracle.ts
```

**Key Features**:
- High-cost reasoning model (GPT-5.2 Codex or equivalent)
- Architecture decision support
- Deep debugging assistance
- Code review capability

---

## Phase 3: Tool Ecosystem (Priority: MEDIUM)

**Timeline**: Week 5-6
**Goal**: Expand tool capabilities for research and automation

### 3.1 Skill MCP Tool
**Priority**: P2
**Effort**: 3-4 days
**Dependencies**: Skill file format

```
src/core/tools/skill-mcp/
├── index.ts          # Tool definition
├── loader.ts         # Skill file parser
└── types.ts          # Skill interfaces
```

**Key Features**:
- Load skills from `.agent-skills/` directory
- Execute skill workflows
- Token-optimized skill rendering

### 3.2 Grep App (GitHub Code Search)
**Priority**: P2
**Effort**: 1-2 days
**Dependencies**: None (external API)

```
src/core/tools/grep-app.ts
```

**Key Features**:
- Search GitHub via grep.app API
- Language filtering
- Regex support
- Repository/path filters

### 3.3 Web Search (Exa AI)
**Priority**: P2
**Effort**: 1-2 days
**Dependencies**: API key configuration

```
src/core/tools/web-search.ts
```

**Key Features**:
- Real-time web search
- Configurable result count
- Content extraction
- Fast/deep search modes

### 3.4 Interactive Bash (tmux)
**Priority**: P3
**Effort**: 2-3 days
**Dependencies**: PTY manager

```
src/core/tools/interactive-bash.ts
```

**Key Features**:
- tmux session management
- Long-running process support
- Named sessions (`omo-{name}`)
- Output capture

### 3.5 Background Notification Hooks
**Priority**: P2
**Effort**: 1-2 days
**Dependencies**: Background Task

```
src/core/hooks/background-notification.ts
src/core/hooks/session-notification.ts
```

**Key Features**:
- Toast on background task completion
- Session state change notifications
- Error alerts

---

## Phase 4: Ecosystem Compatibility (Priority: LOW)

**Timeline**: Week 7-8
**Goal**: Full compatibility with OpenCode plugin ecosystem

### 4.1 Plugin System Alignment
**Priority**: P3
**Effort**: 5-7 days
**Dependencies**: All previous phases

```
src/plugin/
├── index.ts          # Plugin loader
├── types.ts          # @opencode-ai/plugin compatible types
├── registry.ts       # Plugin registration
└── sdk.ts            # SDK client wrapper
```

### 4.2 Claude Code Compatibility Layer
**Priority**: P3
**Effort**: 3-4 days
**Dependencies**: Plugin system

```
src/features/claude-code/
├── index.ts          # Compatibility exports
├── session-state.ts  # Session ID tracking
├── transcript.ts     # Transcript file access
└── hooks.ts          # Claude Code hook adapters
```

### 4.3 Full MCP Integration
**Priority**: P3
**Effort**: 4-5 days
**Dependencies**: Plugin system

```
src/mcp/
├── server.ts         # MCP server implementation
├── client.ts         # MCP client wrapper
└── tools.ts          # MCP tool registration
```

---

## Implementation Checklist

### Phase 1 Checklist
- [x] Background Task Tool
  - [x] Task manager with state tracking
  - [x] Agent spawning via existing agent registry
  - [x] Result retrieval and cancellation
  - [x] Integration with explore/librarian agents
- [x] Context Window Limit Recovery
  - [x] Anthropic error parser
  - [x] Tool output truncation
  - [x] DCP (Dynamic Context Pruning) integration
  - [x] Retry mechanism
- [x] Session Recovery
  - [x] Error type detection
  - [x] Tool result injection
  - [x] Thinking block manipulation
  - [x] Empty content recovery
- [x] Ralph Loop
  - [x] Persistent state storage
  - [x] Completion promise detection
  - [x] Continuation prompt injection
  - [x] Max iteration enforcement

### Phase 2 Checklist
- [x] Todo Continuation Enforcer
- [x] Think Mode Hook
- [x] Enhanced Sisyphus Prompt Builder
- [x] Oracle Agent

### Phase 3 Checklist
- [x] Skill MCP Tool
- [x] Grep App Tool
- [x] Web Search Tool
- [x] Interactive Bash Tool
- [x] Background/Session Notification Hooks

### Phase 4 Checklist
- [x] Plugin System
- [x] Claude Code Compatibility
- [x] Full MCP Integration

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Agent types | 7 (full) | 7 (full) |
| Active hooks | 12+ | 12+ |
| Tool count | 35+ | 35+ |
| Session recovery rate | 95%+ | 95%+ |
| Autonomous task completion | Auto-loop | Auto-loop |
| Context overflow handling | Auto-recover | Auto-recover |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Comprehensive test suite before each phase |
| TypeScript errors | Run `tsc --noEmit` after each feature |
| API compatibility | Version lock dependencies |
| Performance regression | Benchmark critical paths |

---

## Next Steps

1. **Immediate**: Keep docs aligned with releases
2. **Parallel**: Add regression tests for hooks/tools
3. **Review**: Collect user feedback for the next roadmap cycle

---

*This roadmap is a living document. Update as implementation progresses.*

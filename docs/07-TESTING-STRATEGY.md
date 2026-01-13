# Testing Strategy Plan

> **목표**: TDD 기반의 포괄적인 테스트 전략으로 80%+ 커버리지 달성

## Overview

oh-my-opencode의 테스트 패턴을 참조하여, supercode에 co-located 단위 테스트와 통합 테스트를 추가합니다.

## Current State Analysis

### supercode (현재)
```
tests/
├── integration/
│   └── ... (E2E tests)
└── unit/
    └── ... (limited)
```

### oh-my-opencode (목표)
```
src/
├── hooks/
│   ├── comment-checker/
│   │   ├── index.ts
│   │   └── index.test.ts      # Co-located
│   ├── ralph-loop/
│   │   ├── index.ts
│   │   └── index.test.ts      # Co-located
│   └── ...
└── ...
```

## Testing Architecture

### 1. Test Organization

```
src/
├── core/
│   ├── hooks/
│   │   ├── comment-checker/
│   │   │   ├── index.ts
│   │   │   ├── index.test.ts           # Unit tests
│   │   │   └── filters/
│   │   │       ├── shebang.ts
│   │   │       └── shebang.test.ts     # Unit tests
│   │   └── todo-continuation-enforcer/
│   │       ├── index.ts
│   │       └── index.test.ts           # Unit tests
│   ├── tools/
│   │   ├── session/
│   │   │   ├── list.ts
│   │   │   └── list.test.ts            # Unit tests
│   │   └── background/
│   │       ├── task.ts
│   │       └── task.test.ts            # Unit tests
│   └── session/
│       ├── manager.ts
│       └── manager.test.ts             # Unit tests
├── config/
│   ├── loader.ts
│   ├── loader.test.ts                  # Unit tests
│   ├── jsonc-parser.ts
│   └── jsonc-parser.test.ts            # Unit tests
└── services/
    └── background/
        ├── manager.ts
        └── manager.test.ts             # Unit tests

tests/
├── integration/
│   ├── cli.test.ts                     # CLI integration tests
│   ├── session-workflow.test.ts        # Session workflow tests
│   └── agent-delegation.test.ts        # Agent delegation tests
├── e2e/
│   ├── full-workflow.test.ts           # Full E2E tests
│   └── tui.test.ts                     # TUI tests
└── fixtures/
    ├── sessions/
    ├── configs/
    └── skills/
```

### 2. Test Configuration

```typescript
// bunfig.toml
[test]
root = "."
preload = ["./tests/setup.ts"]
coverage = true
coverageDir = "./coverage"
coverageReporter = ["text", "lcov"]
timeout = 30000

// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'bun:test';

// Global test setup
beforeAll(async () => {
  // Setup test environment
  process.env.SUPERCODE_TEST = 'true';
  process.env.SUPERCODE_CONFIG_DIR = '/tmp/supercode-test';
});

afterAll(async () => {
  // Cleanup
});

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
});
```

### 3. Testing Patterns

#### Unit Test Pattern

```typescript
// src/core/hooks/comment-checker/index.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createCommentCheckerHooks } from './index';

describe('CommentCheckerHooks', () => {
  describe('#createCommentCheckerHooks', () => {
    describe('given default configuration', () => {
      let hooks: ReturnType<typeof createCommentCheckerHooks>;
      
      beforeEach(() => {
        hooks = createCommentCheckerHooks();
      });
      
      describe('when checking a file with noise comments', () => {
        it('then should detect and report them', async () => {
          const input = {
            tool: 'write',
            sessionID: 'test-session',
          };
          const output = {
            args: {
              filePath: '/test/file.ts',
              content: '// TODO: implement this\nconst x = 1;',
            },
          };
          
          await hooks['tool.execute.before'](input, output);
          
          expect(output.result).toContain('noise comment');
        });
      });
      
      describe('when checking a file with valid comments', () => {
        it('then should not report any issues', async () => {
          const input = {
            tool: 'write',
            sessionID: 'test-session',
          };
          const output = {
            args: {
              filePath: '/test/file.ts',
              content: '/** JSDoc comment */\nconst x = 1;',
            },
          };
          
          await hooks['tool.execute.before'](input, output);
          
          expect(output.result).toBeUndefined();
        });
      });
    });
  });
});
```

#### BDD Style Naming

```typescript
// Use #given, #when, #then pattern
describe('SessionManager', () => {
  describe('#listSessions', () => {
    describe('given multiple sessions exist', () => {
      describe('when filtering by date range', () => {
        it('then should return only sessions within range', () => {
          // Test implementation
        });
      });
    });
    
    describe('given no sessions exist', () => {
      describe('when listing all', () => {
        it('then should return empty array', () => {
          // Test implementation
        });
      });
    });
  });
});
```

#### Mock Patterns

```typescript
// src/core/tools/session/list.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { sessionList } from './list';

// Mock the session manager
const mockSessionManager = {
  listSessions: mock(() => [
    {
      sessionId: 'test-123',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      messages: [{ role: 'user', content: 'test' }],
      agents: ['explore'],
    },
  ]),
};

// Inject mock
mock.module('../../session/manager', () => ({
  sessionManager: mockSessionManager,
}));

describe('sessionList', () => {
  it('should format sessions as table', async () => {
    const result = await sessionList({ limit: 10 });
    
    expect(result).toContain('| Session ID |');
    expect(result).toContain('test-123');
    expect(mockSessionManager.listSessions).toHaveBeenCalledWith({
      limit: 10,
      fromDate: undefined,
      toDate: undefined,
      projectPath: undefined,
    });
  });
});
```

### 4. Integration Test Patterns

```typescript
// tests/integration/session-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { SessionManager } from '../../src/core/session/manager';
import { BackgroundManager } from '../../src/services/background/manager';

describe('Session Workflow Integration', () => {
  let sessionManager: SessionManager;
  let backgroundManager: BackgroundManager;
  
  beforeAll(async () => {
    sessionManager = new SessionManager({
      storageDir: '/tmp/test-sessions',
    });
    backgroundManager = new BackgroundManager(mockContext);
  });
  
  afterAll(async () => {
    // Cleanup test sessions
    await sessionManager.cleanup();
  });
  
  describe('session creation and continuation', () => {
    it('should create a session and allow continuation', async () => {
      // Create session
      const session = await sessionManager.createSession({
        provider: 'test',
        model: 'test-model',
      });
      
      expect(session.sessionId).toBeDefined();
      
      // Add message
      await sessionManager.addMessage(session.sessionId, {
        role: 'user',
        content: 'Test message',
      });
      
      // Retrieve session
      const retrieved = await sessionManager.getSession(session.sessionId);
      expect(retrieved?.messages).toHaveLength(1);
    });
  });
  
  describe('background task execution', () => {
    it('should execute background task and return result', async () => {
      const taskId = await backgroundManager.launchTask(
        'explore',
        'Find all TypeScript files',
        { description: 'Test task' }
      );
      
      expect(taskId).toMatch(/^bg_/);
      
      // Wait for completion
      const output = await backgroundManager.getOutput(taskId, {
        block: true,
        timeout: 5000,
      });
      
      expect(output.status).toBe('completed');
    });
  });
});
```

### 5. Test Fixtures

```typescript
// tests/fixtures/sessions/sample-session.ts
export const sampleSession = {
  sessionId: 'ses_test_123',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  messages: [
    { id: 'msg_1', role: 'user', content: 'Hello', timestamp: new Date() },
    { id: 'msg_2', role: 'assistant', content: 'Hi!', timestamp: new Date() },
  ],
  todos: [
    { id: 'todo_1', content: 'Complete task', status: 'completed', priority: 'high' },
    { id: 'todo_2', content: 'Review code', status: 'pending', priority: 'medium' },
  ],
  context: { provider: 'anthropic', model: 'claude-sonnet-4' },
  metadata: { title: 'Test Session', projectPath: '/test' },
  status: 'completed' as const,
};

// tests/fixtures/configs/valid-config.jsonc
export const validConfigJsonc = `
{
  // This is a comment
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "permissions": {
    "tools": {
      "default": "allow",
      "tools": {
        "bash": "ask"
      }
    }
  }
}
`;
```

### 6. Coverage Configuration

```typescript
// package.json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test src/**/*.test.ts",
    "test:integration": "bun test tests/integration/**/*.test.ts",
    "test:e2e": "bun test tests/e2e/**/*.test.ts"
  }
}
```

### 7. CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - run: bun install
      
      - name: Run unit tests
        run: bun test:unit
      
      - name: Run integration tests
        run: bun test:integration
      
      - name: Generate coverage report
        run: bun test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

## Test Categories

### Category 1: Hooks (Priority: High)

| Hook | Test File | Status |
|------|-----------|--------|
| comment-checker | `comment-checker/index.test.ts` | ⬜ |
| todo-continuation-enforcer | `todo-enforcer/index.test.ts` | ⬜ |
| session-recovery | `session-recovery/index.test.ts` | ⬜ |
| tool-output-truncator | `tool-truncator/index.test.ts` | ⬜ |
| ralph-loop | `ralph-loop/index.test.ts` | ⬜ |
| keyword-detector | `keyword-detector/index.test.ts` | ⬜ |

### Category 2: Tools (Priority: High)

| Tool | Test File | Status |
|------|-----------|--------|
| session_list | `session/list.test.ts` | ⬜ |
| session_read | `session/read.test.ts` | ⬜ |
| session_search | `session/search.test.ts` | ⬜ |
| background_task | `background/task.test.ts` | ⬜ |
| background_output | `background/output.test.ts` | ⬜ |
| skill | `skill/index.test.ts` | ⬜ |

### Category 3: Config (Priority: Medium)

| Component | Test File | Status |
|-----------|-----------|--------|
| JSONC Parser | `jsonc-parser.test.ts` | ⬜ |
| Config Loader | `loader.test.ts` | ⬜ |
| Permissions | `permissions.test.ts` | ⬜ |

### Category 4: Services (Priority: Medium)

| Service | Test File | Status |
|---------|-----------|--------|
| BackgroundManager | `background/manager.test.ts` | ⬜ |
| ConcurrencyManager | `background/concurrency.test.ts` | ⬜ |
| SessionManager | `session/manager.test.ts` | ⬜ |
| SkillLoader | `skill-loader/index.test.ts` | ⬜ |

## Implementation Checklist

### Phase 1: Test Infrastructure (Day 1)
- [ ] Set up Bun test configuration
- [ ] Create test setup file
- [ ] Create fixture templates
- [ ] Set up coverage reporting

### Phase 2: Core Hook Tests (Day 2-3)
- [ ] comment-checker tests
- [ ] todo-continuation-enforcer tests
- [ ] session-recovery tests
- [ ] ralph-loop tests

### Phase 3: Tool Tests (Day 4-5)
- [ ] session_list tests
- [ ] session_read tests
- [ ] session_search tests
- [ ] background tools tests

### Phase 4: Config & Service Tests (Day 6-7)
- [ ] Config loader tests
- [ ] Permission checker tests
- [ ] BackgroundManager tests
- [ ] SessionManager tests

### Phase 5: Integration Tests (Day 8-9)
- [ ] CLI integration tests
- [ ] Session workflow tests
- [ ] Agent delegation tests

### Phase 6: CI/CD (Day 10)
- [ ] Set up GitHub Actions
- [ ] Configure coverage reporting
- [ ] Add PR checks

## Success Criteria

| Metric | Target |
|--------|--------|
| Unit Test Coverage | 80%+ |
| Integration Test Coverage | 70%+ |
| All Tests Passing | 100% |
| Test Execution Time | < 60s |

## Best Practices

### DO
1. Write tests before implementing (TDD)
2. Use BDD naming convention (#given, #when, #then)
3. Co-locate tests with source files
4. Mock external dependencies
5. Keep tests focused and independent

### DON'T
1. Skip tests to "save time"
2. Write tests that depend on order
3. Mock too many internal components
4. Write flaky tests
5. Ignore failing tests

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete

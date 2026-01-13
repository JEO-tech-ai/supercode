# Agent Discipline Improvement Plan

> **목표**: oh-my-opencode의 Agent Discipline 기능을 supercode에 포팅하여 코드 품질 및 작업 추적 강화

## Overview

Agent Discipline은 AI 에이전트가 일관된 품질의 코드를 생성하고, 작업을 완료까지 추적하도록 강제하는 시스템입니다.

## Key Components

### 1. Comment Checker

AI가 생성하는 불필요한 주석을 감지하고 경고합니다.

#### Current State (supercode)
```typescript
// 단순한 RegExp 기반 체크
const NOISE_PATTERNS = [
  /\/\/ TODO: implement/i,
  /\/\/ Add .* here/i,
];
```

#### Target State (oh-my-opencode)
```typescript
// 다중 필터 기반 정교한 체크
src/hooks/comment-checker/
├── filters/
│   ├── shebang.ts      # #!/usr/bin/env - 허용
│   ├── docstring.ts    # JSDoc, PHPDoc - 허용
│   ├── directive.ts    # @ts-ignore, eslint-disable - 허용
│   └── bdd.ts          # Given, When, Then - 허용
```

#### Implementation

```typescript
// src/core/hooks/comment-checker/index.ts
import { CommentChecker } from '@code-yeongyu/comment-checker';
import { createFilters } from './filters';
import { formatOutput } from './output';

export interface CommentCheckerConfig {
  languages?: string[];
  severity?: 'error' | 'warning' | 'info';
  exclude_patterns?: string[];
}

export function createCommentCheckerHooks(config?: CommentCheckerConfig) {
  const checker = new CommentChecker();
  const filters = createFilters();
  
  return {
    'tool.execute.before': async (
      input: ToolExecuteBeforeInput,
      output: ToolExecuteBeforeOutput
    ) => {
      if (input.tool === 'write' || input.tool === 'edit') {
        const filePath = (output.args as any).filePath;
        const content = (output.args as any).content || (output.args as any).newString;
        
        if (content && shouldCheck(filePath)) {
          const issues = await checker.check(content, getLanguage(filePath));
          const filtered = filters.apply(issues);
          
          if (filtered.length > 0) {
            // Inject warning to model
            output.result = formatOutput(filtered);
          }
        }
      }
    },
    
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput
    ) => {
      // Post-write validation
      if (input.tool === 'write') {
        const filePath = (input.args as any).filePath;
        if (shouldCheck(filePath)) {
          const content = await readFile(filePath);
          const issues = await checker.check(content, getLanguage(filePath));
          const filtered = filters.apply(issues);
          
          if (filtered.length > 0) {
            output.result += '\n\n' + formatOutput(filtered);
          }
        }
      }
    },
  };
}
```

#### Filters Implementation

```typescript
// src/core/hooks/comment-checker/filters/index.ts
export function createFilters() {
  return {
    apply: (issues: CommentIssue[]): CommentIssue[] => {
      return issues
        .filter(issue => !isShebang(issue))
        .filter(issue => !isDocstring(issue))
        .filter(issue => !isDirective(issue))
        .filter(issue => !isBDD(issue));
    },
  };
}

// src/core/hooks/comment-checker/filters/shebang.ts
export function isShebang(issue: CommentIssue): boolean {
  return issue.text.startsWith('#!');
}

// src/core/hooks/comment-checker/filters/docstring.ts
export function isDocstring(issue: CommentIssue): boolean {
  const patterns = [
    /^\s*\/\*\*/, // JSDoc
    /^\s*"""/,    // Python docstring
    /^\s*'''/,    // Python docstring
    /^\s*#\s*@/, // PHPDoc
  ];
  return patterns.some(p => p.test(issue.text));
}

// src/core/hooks/comment-checker/filters/directive.ts
export function isDirective(issue: CommentIssue): boolean {
  const directives = [
    '@ts-ignore',
    '@ts-expect-error',
    '@ts-nocheck',
    'eslint-disable',
    'eslint-enable',
    'prettier-ignore',
    'stylelint-disable',
    'noinspection',
    'type: ignore',
    '# noqa',
  ];
  return directives.some(d => issue.text.includes(d));
}

// src/core/hooks/comment-checker/filters/bdd.ts
export function isBDD(issue: CommentIssue): boolean {
  const keywords = ['#given', '#when', '#then', '#and', '#but'];
  const lowerText = issue.text.toLowerCase();
  return keywords.some(k => lowerText.includes(k));
}
```

### 2. Todo Continuation Enforcer

AI가 todo 목록의 작업을 완료할 때까지 지속적으로 작업하도록 강제합니다.

```typescript
// src/core/hooks/todo-continuation-enforcer/index.ts
export interface TodoContinuationEnforcerConfig {
  reminderInterval?: number; // ms
  maxReminders?: number;
}

export interface TodoContinuationEnforcer {
  handler: (input: { event: SessionEvent }) => Promise<void>;
  markRecovering: () => void;
  markRecoveryComplete: () => void;
}

export function createTodoContinuationEnforcer(
  ctx: HookContext,
  options: { backgroundManager: BackgroundManager }
): TodoContinuationEnforcer {
  const state = {
    isRecovering: false,
    reminderCount: 0,
    lastReminderTime: 0,
  };
  
  const handler = async (input: { event: SessionEvent }) => {
    const { event } = input;
    const props = event.properties as Record<string, unknown>;
    
    // Skip during recovery
    if (state.isRecovering) return;
    
    // Check on session idle
    if (event.type === 'session.idle') {
      const sessionId = props.sessionID as string;
      const todos = await getTodosFromSession(ctx, sessionId);
      
      const pendingTodos = todos.filter(t => 
        t.status === 'pending' || t.status === 'in_progress'
      );
      
      if (pendingTodos.length > 0) {
        const now = Date.now();
        const interval = 30000; // 30 seconds
        
        if (now - state.lastReminderTime > interval) {
          state.reminderCount++;
          state.lastReminderTime = now;
          
          // Inject reminder
          await ctx.client.session.prompt({
            path: { id: sessionId },
            body: {
              parts: [{
                type: 'text',
                text: formatTodoReminder(pendingTodos, state.reminderCount),
              }],
            },
          });
        }
      }
    }
    
    // Reset on todo completion
    if (event.type === 'tool.executed' && props.tool === 'todowrite') {
      state.reminderCount = 0;
    }
  };
  
  return {
    handler,
    markRecovering: () => { state.isRecovering = true; },
    markRecoveryComplete: () => { state.isRecovering = false; },
  };
}

function formatTodoReminder(todos: Todo[], count: number): string {
  return `
[SYSTEM REMINDER - TODO CONTINUATION (Reminder #${count})]

You have ${todos.length} incomplete todo item(s):

${todos.map((t, i) => `${i + 1}. [${t.status}] ${t.content}`).join('\n')}

Please continue working on these tasks. Mark items as completed when done.
Do NOT stop until all items are complete or explicitly cancelled.
`.trim();
}
```

### 3. Thinking Block Validator

AI의 thinking 블록이 올바르게 형식화되어 있는지 검증합니다.

```typescript
// src/core/hooks/thinking-block-validator/index.ts
export function createThinkingBlockValidatorHook() {
  return {
    'experimental.chat.messages.transform': async (
      input: unknown,
      output: { messages: Array<{ info: unknown; parts: unknown[] }> }
    ) => {
      for (const message of output.messages) {
        for (let i = 0; i < message.parts.length; i++) {
          const part = message.parts[i] as { type: string; thinking?: string };
          
          if (part.type === 'thinking' && part.thinking) {
            // Validate thinking block structure
            if (!isValidThinkingBlock(part.thinking)) {
              // Fix malformed thinking block
              part.thinking = sanitizeThinkingBlock(part.thinking);
            }
          }
        }
      }
    },
  };
}

function isValidThinkingBlock(thinking: string): boolean {
  // Check for common issues
  const issues = [
    thinking.includes('<thinking>'),  // Nested tags
    thinking.includes('</thinking>'), // Nested tags
    thinking.length > 100000,         // Too long
    thinking.trim().length === 0,     // Empty
  ];
  return !issues.some(Boolean);
}

function sanitizeThinkingBlock(thinking: string): string {
  return thinking
    .replace(/<\/?thinking>/g, '')
    .slice(0, 50000)
    .trim() || 'Processing...';
}
```

### 4. Empty Task Response Detector

Task 에이전트가 빈 응답을 반환할 때 감지하고 재시도합니다.

```typescript
// src/core/hooks/empty-task-response-detector/index.ts
export function createEmptyTaskResponseDetectorHook(ctx: HookContext) {
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput
    ) => {
      if (input.tool === 'task') {
        const result = output.result;
        
        if (isEmptyOrUselessResponse(result)) {
          output.result = `
[WARNING: Empty or uninformative response from subagent]

The subagent returned an empty or unhelpful response.
This may indicate:
1. The task was too vague
2. The subagent encountered an error
3. The subagent couldn't find relevant information

Original response: "${result.slice(0, 200)}..."

Please try:
1. Reformulating the task with more specific instructions
2. Using direct tools (Read, Grep, Glob) instead
3. Breaking down the task into smaller steps
`.trim();
        }
      }
    },
  };
}

function isEmptyOrUselessResponse(result: string): boolean {
  const trimmed = result.trim();
  
  if (!trimmed || trimmed.length < 10) return true;
  
  const uselessPatterns = [
    /^(ok|okay|done|completed|finished)\.?$/i,
    /^i (will|can|could) help/i,
    /^let me (help|assist|check)/i,
    /^sure[,.]?\s*(i|let)/i,
  ];
  
  return uselessPatterns.some(p => p.test(trimmed));
}
```

### 5. Edit Error Recovery

Edit 도구 실패 시 자동으로 복구를 시도합니다.

```typescript
// src/core/hooks/edit-error-recovery/index.ts
export function createEditErrorRecoveryHook(ctx: HookContext) {
  const recentEdits = new Map<string, EditAttempt>();
  
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput
    ) => {
      if (input.tool === 'edit') {
        const args = input.args as EditArgs;
        
        if (output.result.includes('oldString not found')) {
          const suggestion = await findSimilarContent(
            ctx,
            args.filePath,
            args.oldString
          );
          
          if (suggestion) {
            output.result += `\n\n[RECOVERY SUGGESTION]
The exact oldString was not found, but a similar content was found:

\`\`\`
${suggestion.content}
\`\`\`

Location: Line ${suggestion.line}
Similarity: ${(suggestion.similarity * 100).toFixed(1)}%

Consider using this content instead, or read the file first to get the exact content.
`;
          }
        }
        
        if (output.result.includes('found multiple times')) {
          const matches = await findAllMatches(
            ctx,
            args.filePath,
            args.oldString
          );
          
          output.result += `\n\n[DISAMBIGUATION]
The oldString was found ${matches.length} times:

${matches.map((m, i) => `${i + 1}. Line ${m.line}: ${m.context.slice(0, 80)}...`).join('\n')}

Add more surrounding context to uniquely identify the target location.
`;
        }
      }
    },
  };
}
```

## File Structure

```
src/core/hooks/
├── comment-checker/
│   ├── index.ts
│   ├── index.test.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── downloader.ts          # Binary downloader for comment-checker
│   ├── cli.ts                 # CLI integration
│   ├── filters/
│   │   ├── index.ts
│   │   ├── shebang.ts
│   │   ├── shebang.test.ts
│   │   ├── docstring.ts
│   │   ├── docstring.test.ts
│   │   ├── directive.ts
│   │   ├── directive.test.ts
│   │   ├── bdd.ts
│   │   └── bdd.test.ts
│   └── output/
│       ├── index.ts
│       ├── formatter.ts
│       └── xml-builder.ts
├── todo-continuation-enforcer/
│   ├── index.ts
│   ├── index.test.ts
│   ├── constants.ts
│   └── types.ts
├── thinking-block-validator/
│   ├── index.ts
│   └── index.test.ts
├── empty-task-response-detector/
│   ├── index.ts
│   └── index.test.ts
└── edit-error-recovery/
    ├── index.ts
    └── index.test.ts
```

## Implementation Checklist

### Phase 1: Comment Checker (Day 1-3)
- [ ] Set up @code-yeongyu/comment-checker dependency
- [ ] Implement filter infrastructure
- [ ] Implement shebang filter
- [ ] Implement docstring filter
- [ ] Implement directive filter
- [ ] Implement BDD filter
- [ ] Add output formatting
- [ ] Write tests

### Phase 2: Todo Enforcer (Day 4-5)
- [ ] Implement todo state tracking
- [ ] Implement reminder injection
- [ ] Add configurable intervals
- [ ] Integrate with BackgroundManager
- [ ] Write tests

### Phase 3: Validators (Day 6-7)
- [ ] Implement thinking block validator
- [ ] Implement empty task response detector
- [ ] Implement edit error recovery
- [ ] Write tests

## Success Criteria

| Metric | Target |
|--------|--------|
| Comment Checker Accuracy | 95%+ |
| Todo Completion Rate | 90%+ improvement |
| False Positive Rate | < 5% |
| Test Coverage | 80%+ |

## Dependencies

```json
{
  "dependencies": {
    "@code-yeongyu/comment-checker": "^0.6.1"
  }
}
```

---

**Last Updated**: 2026-01-13
**Status**: 📋 Planning Complete

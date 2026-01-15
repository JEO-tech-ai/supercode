# Plan: Agent Orchestration Enhancement

> **Priority**: 🟡 High | **Phase**: 2 | **Duration**: 1 week

---

## Objective

Enhance SuperCode's multi-agent system by:
- Adding new agent types from oh-my-opencode
- Improving delegation patterns
- Implementing background task parallelization
- Enabling expert subagent model

---

## Current Agents (SuperCode)

| Agent | Purpose | Status |
|-------|---------|--------|
| `cent` | Main orchestrator (6-phase) | ✅ Exists |
| `explore` | Codebase search | ✅ Exists |
| `librarian` | Documentation research | ✅ Exists |
| `sisyphus` | Long-running tasks | ✅ Exists |

---

## Target Agents (Unified)

| Agent | Purpose | Source | Priority |
|-------|---------|--------|----------|
| `cent` | Main orchestrator | SuperCode | ✅ Keep |
| `explore` | Codebase search | SuperCode + OpenCode | ✅ Enhance |
| `librarian` | Documentation research | SuperCode + oh-my-opencode | ✅ Enhance |
| `oracle` | Expert technical advisor | oh-my-opencode | 🔴 Add |
| `plan` | Read-only planning | OpenCode | 🔴 Add |
| `general` | Multi-step tasks | OpenCode | 🔴 Add |
| `frontend-ui-ux-engineer` | UI/UX specialist | oh-my-opencode | 🟡 Add |
| `document-writer` | Documentation | oh-my-opencode | 🟡 Add |
| `sisyphus` | Long-running tasks | SuperCode | ✅ Keep |

---

## New Agent Implementations

### Oracle Agent

```typescript
// src/agents/oracle.ts
export const oracleAgent: AgentConfig = {
  name: 'oracle',
  description: 'Expert technical advisor powered by Codex/GPT-5.2',
  model: 'openai/gpt-5.2-codex',
  
  systemPrompt: `You are Oracle, a senior engineering advisor with deep expertise in:
- Architecture design and trade-offs
- Code review and quality assessment
- Debugging complex issues
- Performance optimization

You provide strategic guidance, not implementation. Your role is to:
1. Analyze the problem thoroughly
2. Identify potential solutions with trade-offs
3. Recommend the best approach
4. Flag potential risks

Never write code directly. Instead, provide clear guidance for the implementing agent.`,

  capabilities: {
    codeGeneration: false,
    fileEditing: false,
    commandExecution: false,
    webSearch: true,
    codeAnalysis: true,
  }
}
```

### Plan Agent (Read-Only)

```typescript
// src/agents/plan.ts
export const planAgent: AgentConfig = {
  name: 'plan',
  description: 'Read-only planning agent for exploration and architecture',
  model: 'anthropic/claude-sonnet-4',
  
  systemPrompt: `You are a planning agent. Your job is to:
1. Explore the codebase structure
2. Analyze existing patterns
3. Create detailed implementation plans
4. Identify potential issues

You CANNOT modify files. You can only read and analyze.`,

  capabilities: {
    codeGeneration: false,
    fileEditing: false,  // Denied by default
    commandExecution: false,
    webSearch: true,
    codeAnalysis: true,
  },
  
  toolOverrides: {
    write: { enabled: false, reason: 'Plan agent is read-only' },
    edit: { enabled: false, reason: 'Plan agent is read-only' },
  }
}
```

### Frontend UI/UX Engineer Agent

```typescript
// src/agents/frontend-ui-ux-engineer.ts
export const frontendEngineerAgent: AgentConfig = {
  name: 'frontend-ui-ux-engineer',
  description: 'Designer-turned-developer for stunning UI/UX',
  model: 'anthropic/claude-sonnet-4',
  
  systemPrompt: `You are a frontend UI/UX engineer with a design background.
Your code may be a bit messy, but the visual output is always stunning.

Specialize in:
- Visual design (colors, typography, spacing)
- Animations and micro-interactions
- Responsive layouts
- Modern UI patterns (glassmorphism, gradients)
- Premium user experiences

Always prioritize how it LOOKS over how clean the code is.`,

  capabilities: {
    codeGeneration: true,
    fileEditing: true,
    commandExecution: false,
    webSearch: true,
    codeAnalysis: true,
  }
}
```

---

## Agent Delegation Patterns

### Current (SuperCode)
```
User → Cent → Direct execution or single agent delegation
```

### Target (Enhanced)
```
User → Cent → {
  explore (parallel background)
  librarian (parallel background)
  oracle (sync consultation)
  plan (sync analysis)
  → Implementation decision →
  frontend-engineer OR general OR sisyphus
}
```

### Delegation Logic

```typescript
// src/agents/cent/delegation.ts
export async function delegateTask(task: Task, context: Context): Promise<Result> {
  // Phase 1: Parallel exploration
  const explorations = await Promise.all([
    backgroundTask('explore', task.codebaseQuery),
    backgroundTask('librarian', task.documentationQuery),
  ])
  
  // Phase 2: Analysis (if complex)
  if (task.complexity === 'high') {
    const oracleGuidance = await syncTask('oracle', {
      task: task.description,
      explorationResults: explorations,
    })
    
    if (oracleGuidance.concerns.length > 0) {
      return { action: 'clarify', concerns: oracleGuidance.concerns }
    }
  }
  
  // Phase 3: Implementation delegation
  const implementer = selectImplementer(task, explorations)
  return await syncTask(implementer, task)
}

function selectImplementer(task: Task, context: any): string {
  if (task.category === 'frontend-visual') return 'frontend-ui-ux-engineer'
  if (task.category === 'documentation') return 'document-writer'
  if (task.complexity === 'multi-step') return 'general'
  return 'cent' // Self-handle
}
```

---

## Background Task System

```typescript
// src/agents/background/manager.ts
export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>()
  
  async launch(agent: string, prompt: string): Promise<string> {
    const taskId = generateTaskId()
    
    const task: BackgroundTask = {
      id: taskId,
      agent,
      prompt,
      status: 'running',
      startedAt: Date.now(),
    }
    
    this.tasks.set(taskId, task)
    
    // Run in background
    this.executeAsync(task)
    
    return taskId
  }
  
  private async executeAsync(task: BackgroundTask): Promise<void> {
    try {
      const result = await this.runAgent(task.agent, task.prompt)
      task.status = 'completed'
      task.result = result
      
      // Trigger notification hook
      await hooks.trigger('background.complete', task.id, result)
    } catch (error) {
      task.status = 'failed'
      task.error = error
      
      await hooks.trigger('background.error', task.id, error)
    }
  }
  
  getOutput(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId)
  }
  
  cancelAll(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'running') {
        task.status = 'cancelled'
      }
    }
  }
}
```

---

## File Structure

```
src/agents/
├── index.ts                    # Agent registry
├── types.ts                    # Type definitions
├── cent/
│   ├── index.ts               # Main orchestrator
│   ├── delegation.ts          # Delegation logic
│   └── phases.ts              # 6-phase workflow
├── explore.ts                  # Codebase exploration
├── librarian.ts               # Documentation research
├── oracle.ts                  # Expert advisor (NEW)
├── plan.ts                    # Read-only planning (NEW)
├── general.ts                 # Multi-step tasks (NEW)
├── frontend-ui-ux-engineer.ts # UI/UX specialist (NEW)
├── document-writer.ts         # Documentation (NEW)
├── sisyphus.ts                # Long-running tasks
└── background/
    ├── manager.ts             # Background task manager
    ├── types.ts               # Task types
    └── storage.ts             # Task persistence
```

---

## Success Criteria

- [ ] Oracle agent provides quality guidance
- [ ] Plan agent correctly denies file edits
- [ ] Frontend engineer creates visually stunning output
- [ ] Background tasks run in parallel
- [ ] Task notifications work
- [ ] Delegation selects correct implementer

---

**Owner**: TBD
**Start Date**: TBD

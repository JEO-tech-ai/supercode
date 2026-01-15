# Phase 2: Core Features Work Breakdown

> **Duration**: Week 3-4 | **Priority**: 🟡 High

---

## Overview

Phase 2 adds core features that differentiate the unified platform:
- New agent types
- MCP server expansion
- Background task system
- Ralph Loop automation

---

## Work Items

### WI-2.1: Oracle Agent

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add expert technical advisor agent from oh-my-opencode.

**Tasks**:
- [ ] Create `src/agents/oracle.ts`
- [ ] Configure system prompt for advisory role
- [ ] Set capabilities (read-only, no code gen)
- [ ] Register in agent registry

**Acceptance Criteria**:
- Oracle provides architectural guidance
- Does not generate code directly
- Uses high-tier model (GPT-5.2)

**Dependencies**: None

---

### WI-2.2: Plan Agent (Read-Only)

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add read-only planning agent from OpenCode.

**Tasks**:
- [ ] Create `src/agents/plan.ts`
- [ ] Configure tool denials (write, edit blocked)
- [ ] Implement codebase exploration focus
- [ ] Add architecture analysis prompts

**Acceptance Criteria**:
- Plan agent cannot modify files
- Provides detailed analysis
- Tool denial works correctly

**Dependencies**: None

---

### WI-2.3: Frontend UI/UX Engineer Agent

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add visual design specialist agent.

**Tasks**:
- [ ] Create `src/agents/frontend-ui-ux-engineer.ts`
- [ ] Configure design-focused system prompt
- [ ] Enable visual code generation
- [ ] Add styling expertise

**Acceptance Criteria**:
- Creates visually stunning UI
- Focuses on aesthetics
- Generates working CSS/components

**Dependencies**: None

---

### WI-2.4: Background Task Manager

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Implement parallel background task execution.

**Tasks**:
- [ ] Create `src/agents/background/manager.ts`
- [ ] Implement task launching
- [ ] Add task status tracking
- [ ] Create notification system
- [ ] Add cancellation support

**Acceptance Criteria**:
- Tasks run in parallel
- Status tracking works
- Notifications trigger
- Cancellation works

**Dependencies**: WI-1.4 (Hook system)

---

### WI-2.5: Session Notification Hook

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Notify users when background tasks complete.

**Tasks**:
- [ ] Create `src/hooks/session-notification.ts`
- [ ] Inject notifications into active session
- [ ] Handle multiple concurrent tasks
- [ ] Format notification messages

**Acceptance Criteria**:
- Notifications appear in TUI
- Task IDs are correct
- Multiple tasks handled

**Dependencies**: WI-2.4

---

### WI-2.6: Ralph Loop Hook

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Implement autonomous development loop.

**Tasks**:
- [ ] Create `src/hooks/ralph-loop/`
- [ ] Implement completion promise detection
- [ ] Add continuation injection
- [ ] Create iteration tracking
- [ ] Add max iteration limit

**Acceptance Criteria**:
- Loop continues until DONE promise
- Iteration count tracked
- Max iterations respected
- State persists across messages

**Dependencies**: WI-1.4

---

### WI-2.7: Todo Continuation Enforcer

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Ensure incomplete todos trigger continuation.

**Tasks**:
- [ ] Create `src/hooks/todo-continuation-enforcer.ts`
- [ ] Track todo list state
- [ ] Detect task end without completion
- [ ] Inject continuation reminder

**Acceptance Criteria**:
- Incomplete todos trigger reminder
- Completed todos don't trigger
- Reminder is clear and actionable

**Dependencies**: WI-1.4

---

### WI-2.8: Built-in MCP Servers

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Add built-in MCP servers from oh-my-opencode.

**Tasks**:
- [ ] Create `src/mcp/servers/websearch-exa.ts`
- [ ] Create `src/mcp/servers/grep-app.ts`
- [ ] Create `src/mcp/servers/context7.ts`
- [ ] Register in MCP registry
- [ ] Add configuration options

**Acceptance Criteria**:
- Web search works
- GitHub search works
- Documentation lookup works
- All servers configurable

**Dependencies**: None

---

### WI-2.9: Agent Delegation Enhancement

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Improve Cent's delegation logic.

**Tasks**:
- [ ] Create `src/agents/cent/delegation.ts`
- [ ] Implement parallel exploration phase
- [ ] Add Oracle consultation for complex tasks
- [ ] Create implementer selection logic
- [ ] Update Cent to use delegation

**Acceptance Criteria**:
- Parallel exploration works
- Oracle consulted when needed
- Correct agent selected
- Delegation transparent to user

**Dependencies**: WI-2.1, WI-2.2, WI-2.4

---

## Testing Requirements

### Unit Tests
- [ ] Each agent configuration
- [ ] Background task launching
- [ ] Task notification
- [ ] Ralph loop logic
- [ ] Todo tracking
- [ ] MCP server tools

### Integration Tests
- [ ] Agent delegation flow
- [ ] Background task completion
- [ ] Ralph loop full cycle
- [ ] MCP tool invocation

---

## Deliverables

| Deliverable | Description | Due |
|-------------|-------------|-----|
| New Agents | oracle, plan, frontend | End of Day 3 |
| Background System | Task manager + notifications | End of Day 6 |
| Autonomous Hooks | Ralph loop, todo enforcer | End of Day 8 |
| MCP Servers | websearch, grep-app, context7 | End of Day 9 |
| Delegation Logic | Enhanced Cent | End of Day 10 |

---

## Definition of Done

- [ ] All new agents work correctly
- [ ] Background tasks run in parallel
- [ ] Ralph loop completes autonomous tasks
- [ ] MCP servers functional
- [ ] Delegation selects appropriate agents
- [ ] All tests pass

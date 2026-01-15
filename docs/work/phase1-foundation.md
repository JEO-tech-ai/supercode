# Phase 1: Foundation Work Breakdown

> **Duration**: Week 1-2 | **Priority**: 🔴 Critical

---

## Overview

Phase 1 establishes the core infrastructure needed for all subsequent phases:
- Provider abstraction layer
- Enhanced hook system
- Basic error recovery

---

## Work Items

### WI-1.1: AI SDK Integration

**Status**: 🔴 TODO | **Effort**: 3 days | **Owner**: TBD

**Description**: Add Vercel AI SDK dependencies and create provider abstraction layer.

**Tasks**:
- [ ] Add dependencies to package.json
  ```bash
  bun add ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google @ai-sdk/openai-compatible
  ```
- [ ] Create `src/provider/types.ts` with type definitions
- [ ] Create `src/provider/registry.ts` with ProviderRegistry class
- [ ] Create provider loaders for each provider type

**Acceptance Criteria**:
- All providers register correctly
- API keys load from environment/config
- TypeScript compiles without errors

**Dependencies**: None

---

### WI-1.2: Localhost Model Support

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Enable localhost models (Ollama, LM Studio) via OpenAI-compatible API.

**Tasks**:
- [ ] Create `src/provider/loaders/localhost.ts`
- [ ] Add localhost configuration schema
- [ ] Test with Ollama
- [ ] Test with LM Studio
- [ ] Document setup instructions

**Acceptance Criteria**:
- Ollama models work correctly
- LM Studio models work correctly
- Configuration is straightforward

**Dependencies**: WI-1.1

---

### WI-1.3: Streaming Integration

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Replace direct fetch calls with AI SDK's streamText function.

**Tasks**:
- [ ] Create `src/session/llm.ts` with streaming logic
- [ ] Update ModelRouter to use new streaming
- [ ] Handle tool calls within stream
- [ ] Update session message persistence

**Acceptance Criteria**:
- Streaming works across all providers
- Tool calls execute during stream
- Messages persist correctly

**Dependencies**: WI-1.1

---

### WI-1.4: Core Hook Infrastructure

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Enhance hook system to support oh-my-opencode-level hooks.

**Tasks**:
- [ ] Define comprehensive hook types
- [ ] Create HookRegistry with async support
- [ ] Add hook lifecycle management
- [ ] Create hook configuration loader

**Acceptance Criteria**:
- Hooks trigger at correct points
- Async hooks work correctly
- Hook ordering is consistent

**Dependencies**: None

---

### WI-1.5: Context Window Monitor Hook

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Implement preemptive context compaction at 85% usage.

**Tasks**:
- [ ] Create `src/hooks/context-window-monitor.ts`
- [ ] Implement token counting per provider
- [ ] Create compaction strategy
- [ ] Add configuration options

**Acceptance Criteria**:
- Compaction triggers at 85%
- Recent messages preserved
- Token count accurate

**Dependencies**: WI-1.4

---

### WI-1.6: Error Recovery Hook

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Implement resilient error recovery for API failures.

**Tasks**:
- [ ] Create `src/hooks/anthropic-context-window-limit-recovery/`
- [ ] Detect context window errors
- [ ] Implement message pruning strategies
- [ ] Handle rate limit errors

**Acceptance Criteria**:
- Context errors trigger recovery
- Rate limits wait and retry
- Recovery is transparent to user

**Dependencies**: WI-1.4

---

## Testing Requirements

### Unit Tests
- [ ] ProviderRegistry initialization
- [ ] Each provider loader
- [ ] Streaming function
- [ ] Hook triggering
- [ ] Context monitoring
- [ ] Error detection

### Integration Tests
- [ ] Full streaming conversation
- [ ] Provider switching mid-session
- [ ] Context compaction trigger
- [ ] Error recovery cycle

---

## Deliverables

| Deliverable | Description | Due |
|-------------|-------------|-----|
| Provider Package | `src/provider/*` | End of Day 3 |
| Streaming Module | `src/session/llm.ts` | End of Day 5 |
| Hook System | `src/hooks/*` | End of Day 8 |
| Tests | Unit + Integration | End of Day 10 |
| Documentation | Updated README | End of Day 10 |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI SDK breaking changes | Low | High | Pin versions |
| Ollama API differences | Medium | Medium | Test multiple versions |
| Token counting variance | Medium | Low | Use provider tokenizers |

---

## Definition of Done

- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Localhost models work
- [ ] Streaming consistent across providers
- [ ] Hooks trigger correctly
- [ ] Documentation updated

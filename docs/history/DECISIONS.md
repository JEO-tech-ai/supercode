# Architecture Decisions Record

This document records significant architecture decisions made during the SuperCode unification project.

---

## ADR-001: Keep React/Ink TUI (vs. Migrate to SolidJS)

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
OpenCode uses SolidJS/@opentui/solid for its TUI, providing fine-grained reactivity and better performance. SuperCode currently uses React/Ink.

**Decision**:
Keep React/Ink and enhance it rather than migrate to SolidJS.

**Rationale**:
- Lower risk and faster implementation
- SuperCode already has working TUI with React/Ink
- Adding missing features (themes, syntax, mouse) is straightforward
- Migration would require complete rewrite
- SolidJS benefits are marginal for TUI use case

**Consequences**:
- Positive: Faster Phase 3 completion
- Positive: Existing components reusable
- Negative: May revisit for v2.0 if performance issues arise

---

## ADR-002: Use AI SDK for Provider Abstraction

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
SuperCode directly calls provider APIs (fetch to anthropic, openai, etc.). This requires separate implementations for each provider.

**Decision**:
Adopt Vercel AI SDK for all provider interactions.

**Rationale**:
- 75+ providers supported out of the box
- Consistent streaming interface
- Built-in tool calling support
- Localhost models via OpenAI-compatible API
- Active community and maintenance

**Consequences**:
- Positive: Immediate access to 75+ providers
- Positive: Localhost models work immediately
- Positive: Reduced maintenance burden
- Negative: Dependency on external package
- Negative: API surface locked to AI SDK design

---

## ADR-003: Port oh-my-opencode Hooks (vs. Build from Scratch)

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
oh-my-opencode has 30+ production-tested hooks. SuperCode has basic hook system.

**Decision**:
Port hooks from oh-my-opencode rather than building from scratch.

**Rationale**:
- Hooks are production-tested
- Complex edge cases already handled
- Reduces development time significantly
- oh-my-opencode is open source (SUL-1.0 license)

**Consequences**:
- Positive: Faster development
- Positive: Proven reliability
- Positive: Feature parity with oh-my-opencode
- Negative: Need to adapt to SuperCode architecture
- Negative: May need to understand existing code deeply

---

## ADR-004: Namespace Claude Code Items

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
Loading Claude Code commands, agents, and plugins could conflict with SuperCode built-in items.

**Decision**:
Use namespace prefixes for all Claude Code items:
- Commands: `claude:name`
- Agents: `claude:name`
- Plugins: `plugin:name:tool`

**Rationale**:
- Prevents naming conflicts
- Clear indication of item source
- Easy to filter by source
- Consistent with oh-my-opencode approach

**Consequences**:
- Positive: No conflicts
- Positive: Clear provenance
- Negative: Longer command names
- Negative: Users must remember prefix

---

## ADR-005: Token-Optimized Skill Formats

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
Skills can be large (2000+ tokens). Loading multiple skills could exhaust context.

**Decision**:
Support three skill formats:
- SKILL.md (full, ~2000 tokens)
- SKILL.compact.md (88% reduction, ~250 tokens)
- SKILL.toon (95% reduction, ~110 tokens)

**Rationale**:
- Toon format for most operations (minimal context usage)
- Compact for moderate detail
- Full for comprehensive guidance
- User/agent can choose appropriate level

**Consequences**:
- Positive: Dramatic token savings
- Positive: Flexible detail levels
- Negative: Must maintain 3 formats per skill
- Negative: Toon format requires parsing knowledge

---

## ADR-006: Background Tasks for Parallel Exploration

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
Sequential agent calls are slow. Exploration and research tasks can run in parallel.

**Decision**:
Implement background task system for parallel agent execution.

**Rationale**:
- Explore and librarian tasks are independent
- Parallel execution significantly faster
- oh-my-opencode proves this pattern works
- User experience improved with notifications

**Consequences**:
- Positive: Faster task completion
- Positive: Better resource utilization
- Negative: More complex state management
- Negative: Race condition potential

---

## ADR-007: Cent as Unified Orchestrator

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
SuperCode has Cent, OpenCode has Sisyphus-like build agent. Need unified orchestrator.

**Decision**:
Keep Cent as the main orchestrator, enhance with Sisyphus patterns.

**Rationale**:
- Cent already has 6-phase workflow
- SuperCode users familiar with Cent
- Add delegation patterns from OpenCode
- Add expert consultation from oh-my-opencode

**Consequences**:
- Positive: Continuity for SuperCode users
- Positive: Best of both approaches
- Negative: Cent becomes more complex

---

## ADR-008: Localhost Models as Default Option

**Date**: 2026-01-15

**Status**: Accepted

**Context**:
Cloud models require API keys and incur costs. Localhost models are free and private.

**Decision**:
Make localhost models a first-class citizen with easy configuration.

**Rationale**:
- Free to use (no API costs)
- Privacy (data stays local)
- Ollama adoption growing rapidly
- Good for development/testing

**Consequences**:
- Positive: Cost savings for users
- Positive: Privacy protection
- Negative: Requires local GPU/compute
- Negative: Performance varies by hardware

---

## Decision Template

```markdown
## ADR-XXX: Title

**Date**: YYYY-MM-DD

**Status**: Proposed | Accepted | Deprecated | Superseded

**Context**:
What is the issue that we're seeing that is motivating this decision?

**Decision**:
What is the change that we're proposing/decided to do?

**Rationale**:
Why is this change being proposed?

**Consequences**:
What becomes easier or more difficult after this change?
```

---

**Last Updated**: 2026-01-15

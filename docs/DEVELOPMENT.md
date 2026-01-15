# SuperCode Development Guide

> Internal documentation for contributors and maintainers.
> **Goal**: Upgrade SuperCode to OpenCode-level capabilities while integrating oh-my-opencode enhancements.

---

## Project Overview

This documentation tracks the development roadmap for **SuperCode** - a standalone AI-powered coding assistant with advanced TUI capabilities.

### Target Projects

| Project | Role | Key Features |
|---------|------|--------------|
| **SuperCode** | Base Platform | React/Ink TUI, Multi-agent (Cent), MCP support |
| **OpenCode** | Reference Implementation | SolidJS TUI, 75+ providers, Client/Server architecture |
| **oh-my-opencode** | Enhancement Plugin | Ralph Loop, Antigravity Auth, Claude Code compatibility |
| **.agent-skills** | Skill Framework | 46 skills, token-optimized formats, multi-agent routing |

---

## Documentation Structure

```
docs/
├── DEVELOPMENT.md                     # This file (development guide)
├── FEATURE_COMPARISON.md              # Detailed feature gap analysis
├── plan/                              # Planning documents
│   ├── 01-provider-abstraction.md     # AI SDK integration
│   ├── 02-tui-enhancement.md          # SolidJS TUI upgrade
│   ├── 03-hook-system.md              # Resilient hooks system
│   ├── 04-agent-orchestration.md      # Multi-agent improvements
│   ├── 05-mcp-integration.md          # MCP protocol enhancement
│   ├── 06-claude-code-compat.md       # Claude Code compatibility
│   ├── 07-skill-integration.md        # .agent-skills integration
│   └── 08-unified-platform.md         # Final unification plan
├── work/                              # Implementation breakdown
│   ├── phase1-foundation.md           # Phase 1 work items
│   ├── phase2-features.md             # Phase 2 work items
│   ├── phase3-integration.md          # Phase 3 work items
│   └── phase4-polish.md               # Phase 4 work items
└── history/                           # Progress tracking
    ├── CHANGELOG.md                   # Version history
    ├── DECISIONS.md                   # Architecture decisions
    └── PROGRESS.md                    # Sprint-by-sprint progress
```

---

## Quick Links

### Planning
- [Feature Comparison](./FEATURE_COMPARISON.md) - Full gap analysis
- [Provider Abstraction Plan](./plan/01-provider-abstraction.md)
- [TUI Enhancement Plan](./plan/02-tui-enhancement.md)

### Implementation
- [Phase 1: Foundation](./work/phase1-foundation.md)
- [Phase 2: Core Features](./work/phase2-features.md)

### Tracking
- [Progress Log](./history/PROGRESS.md)
- [Architecture Decisions](./history/DECISIONS.md)

---

## Timeline Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| **Phase 1** | Week 1-2 | Provider abstraction, AI SDK integration |
| **Phase 2** | Week 3-4 | Hook system, Resilient features |
| **Phase 3** | Week 5-6 | TUI enhancement, Claude Code compat |
| **Phase 4** | Week 7-8 | Skill integration, Final unification |

---

## Getting Started

1. Review [Feature Comparison](./FEATURE_COMPARISON.md) for gap analysis
2. Check [Plan Documents](./plan/) for detailed strategies
3. Follow [Work Breakdown](./work/) for implementation steps
4. Track progress in [History](./history/)

---

**Last Updated**: 2026-01-15
**Version**: 0.1.0

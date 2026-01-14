# Implementation Roadmap

> **Document**: 07-IMPLEMENTATION-ROADMAP.md
> **Project**: SuperCode UI Feature Parity with OpenCode
> **Date**: 2026-01-14
> **Status**: Ready for Implementation

---

## Overview

이 문서는 SuperCode UI 개선 작업의 우선순위, 의존성, 타임라인을 정리한 실행 로드맵입니다.
총 7주 (약 2개월) 예상 기간으로, 3개의 Sprint로 구성됩니다.

---

## Priority Matrix

### Effort vs Impact Analysis

```
                    HIGH IMPACT
                         |
    Phase 6: Web Console |  Phase 1: Command System
    (2 weeks, HIGH)      |  (1 week, HIGH)
                         |
                         |  Phase 2: File Handling
                         |  (1.5 weeks, HIGH)
    ---------------------|---------------------
                         |
    Phase 5: TUI Parity  |  Phase 3: Mouse/Keyboard
    (1.5 weeks, MEDIUM)  |  (1 week, MEDIUM)
                         |
    Phase 4: Cmd Palette |
    (1 week, MEDIUM)     |
                         |
                    LOW IMPACT

    <-- HIGH EFFORT          LOW EFFORT -->
```

### Prioritized Task Order

| Rank | Phase | Priority | Effort | Dependencies | Justification |
|------|-------|----------|--------|--------------|---------------|
| 1 | Phase 1: Command System | HIGH | 1 week | None | Foundation for all slash commands |
| 2 | Phase 2: File Handling | HIGH | 1.5 weeks | None | High user demand feature |
| 3 | Phase 4: Command Palette | MEDIUM | 1 week | Phase 1 | Depends on command registry |
| 4 | Phase 3: Mouse/Keyboard | MEDIUM | 1 week | None | Independent, can parallelize |
| 5 | Phase 5: TUI Components | MEDIUM | 1.5 weeks | Phase 2, 4 | Needs file context & palette |
| 6 | Phase 6: Web Console | HIGH | 2 weeks | Phase 1, 2, 4 | Largest, requires prior work |

---

## Dependency Graph

```
                    ┌──────────────────────────────────────────────────────┐
                    │                                                      │
                    │                  SPRINT 1 (Weeks 1-2.5)              │
                    │                                                      │
                    │   ┌────────────────┐     ┌─────────────────┐        │
                    │   │ Phase 1:       │     │ Phase 2:        │        │
                    │   │ Command System │     │ File Handling   │        │
                    │   │ (Week 1)       │     │ (Week 1-2.5)    │        │
                    │   └───────┬────────┘     └────────┬────────┘        │
                    │           │                       │                  │
                    └───────────┼───────────────────────┼──────────────────┘
                                │                       │
                    ┌───────────┼───────────────────────┼──────────────────┐
                    │           │    SPRINT 2           │(Weeks 2.5-4.5)   │
                    │           ▼                       │                  │
                    │   ┌────────────────┐              │                  │
                    │   │ Phase 4:       │              │                  │
                    │   │ Cmd Palette    ├──────────────┤                  │
                    │   │ (Week 2.5-3.5) │              │                  │
                    │   └───────┬────────┘              │                  │
                    │           │                       │                  │
                    │   ┌───────┴────────┐     ┌───────┴────────┐         │
                    │   │ Phase 3:       │     │ Phase 5:       │         │
                    │   │ Mouse/Keyboard │     │ TUI Components │         │
                    │   │ (Week 3.5-4.5) │     │ (Week 3-4.5)   │         │
                    │   └────────────────┘     └───────┬────────┘         │
                    │                                  │                   │
                    └──────────────────────────────────┼───────────────────┘
                                                       │
                    ┌──────────────────────────────────┼───────────────────┐
                    │           SPRINT 3               │  (Weeks 5-7)      │
                    │                                  ▼                   │
                    │                      ┌─────────────────┐             │
                    │                      │ Phase 6:        │             │
                    │                      │ Web Console     │             │
                    │                      │ (Week 5-7)      │             │
                    │                      └─────────────────┘             │
                    │                                                      │
                    └──────────────────────────────────────────────────────┘
```

### Dependency Explanation

| Phase | Depends On | Reason |
|-------|------------|--------|
| Phase 1 | None | Foundation - no dependencies |
| Phase 2 | None | Can start in parallel with Phase 1 |
| Phase 3 | None | Independent keyboard/mouse work |
| Phase 4 | Phase 1 | Command palette uses command registry |
| Phase 5 | Phase 2, 4 | TUI needs file context and command system |
| Phase 6 | Phase 1, 2, 4 | Web console integrates all systems |

---

## Sprint Breakdown

### Sprint 1: Foundation (Weeks 1-2.5)

**Goal**: Build the core infrastructure that other phases depend on.

```
Week 1                          Week 2                          Week 2.5
├─────────────────────────────┼─────────────────────────────┼──────────────────┤
│                             │                              │                  │
│  Phase 1: Command System    │  Phase 2: File Handling      │                  │
│  ========================   │  =========================   │  Phase 2 cont.   │
│  [1.1] Registry (2d)        │  [2.1] Image paste (2d)      │  [2.5] PDF (1d)  │
│  [1.2] Positional args (1d) │  [2.2] Drag-drop (2d)        │  [2.6] Schema    │
│  [1.3] MCP discovery (1.5d) │  [2.3] Binary upload (1d)    │                  │
│  [1.4] Subtask delegation   │  [2.4] Preview (1d)          │                  │
│  [1.5] Bash execution       │                              │                  │
│                             │                              │                  │
└─────────────────────────────┴─────────────────────────────┴──────────────────┘
```

#### Sprint 1 Tasks Detail

| ID | Task | Estimated | Owner | Deliverable |
|----|------|-----------|-------|-------------|
| 1.1 | Server-side command registry | 2 days | Backend | `src/command/registry.ts` |
| 1.2 | Positional arguments ($1, $2) | 1 day | Backend | `src/command/template.ts` |
| 1.3 | MCP command discovery | 1.5 days | Backend | `src/command/mcp-discovery.ts` |
| 1.4 | Subtask delegation | 1 day | Backend | Agent integration |
| 1.5 | Bash execution in templates | 0.5 days | Backend | Template engine |
| 2.1 | Image paste handling | 2 days | Frontend | `MediaPaste.tsx` |
| 2.2 | Drag-and-drop overlay | 2 days | Frontend | `DragDropOverlay.tsx` |
| 2.3 | Binary file upload | 1 day | Backend | File endpoint |
| 2.4 | Image preview component | 1 day | Frontend | `ImagePreview.tsx` |
| 2.5 | PDF attachment support | 1 day | Frontend | PDF handling |
| 2.6 | File part schema (SDK) | 0.5 days | Backend | Schema update |

#### Sprint 1 Deliverables

- [ ] Server-side command execution working
- [ ] `/help` slash command shows MCP-discovered commands
- [ ] Image paste works in TUI prompt
- [ ] Drag-and-drop files to attach
- [ ] Preview modal for images

#### Sprint 1 Milestone: Command + File Foundation
**Date**: End of Week 2.5
**Success Criteria**:
- `npx supercode /help` shows server commands
- Image paste from clipboard attaches to message
- Drag file onto TUI shows file in context

---

### Sprint 2: Enhanced UX (Weeks 2.5-4.5)

**Goal**: Improve keyboard interactions and component quality.

```
Week 2.5                       Week 3                          Week 4           Week 4.5
├─────────────────────────────┼─────────────────────────────┼──────────────────┼─────────────┤
│                             │                              │                  │             │
│  Phase 4: Command Palette   │  Phase 4 cont.               │                  │             │
│  ========================   │  ==============              │                  │             │
│  [4.1] CommandProvider (1d) │  [4.3] useFilteredList (2d)  │                  │             │
│  [4.2] Dynamic reg (1d)     │  [4.4] Fuzzy search (1d)     │                  │             │
│                             │  [4.5] Keyboard nav (0.5d)   │                  │             │
│                             │                              │                  │             │
│                             │  Phase 5: TUI Components     │  Phase 5 cont.   │             │
│                             │  ========================    │  ==============  │             │
│                             │  [5.1] Extmarks (2d)         │  [5.4] Timeline  │  Phase 3    │
│                             │  [5.2] Prompt input (2d)     │  [5.5] Subagent  │  (cont.)    │
│                             │  [5.3] Stash system (1d)     │  [5.6] Autocmp   │             │
│                             │                              │                  │             │
│                             │  Phase 3: Mouse/Keyboard     │  Phase 3 cont.   │             │
│                             │  ========================    │  ==============  │             │
│                             │  [3.1] Leader key (2d)       │  [3.3] Focus     │             │
│                             │  [3.2] Copy-on-select (1d)   │  [3.4] Restore   │             │
│                             │                              │  [3.5] Registry  │             │
│                             │                              │                  │             │
└─────────────────────────────┴─────────────────────────────┴──────────────────┴─────────────┘
```

#### Sprint 2 Tasks Detail

**Phase 4: Command Palette**
| ID | Task | Estimated | Owner | Deliverable |
|----|------|-----------|-------|-------------|
| 4.1 | CommandProvider context | 1 day | Frontend | `src/tui/context/command.tsx` |
| 4.2 | Dynamic registration | 1 day | Frontend | Command API |
| 4.3 | useFilteredList hook | 2 days | Frontend | `useFilteredList.ts` |
| 4.4 | Fuzzy search algorithm | 1 day | Frontend | Search logic |
| 4.5 | Keyboard navigation | 0.5 days | Frontend | Arrow key support |

**Phase 5: TUI Components**
| ID | Task | Estimated | Owner | Deliverable |
|----|------|-----------|-------|-------------|
| 5.1 | Extmark/Pill rendering | 2 days | Frontend | `Extmark.tsx` |
| 5.2 | Advanced prompt input | 2 days | Frontend | Enhanced input |
| 5.3 | Stash/draft system | 1 day | Frontend | `Stash.tsx` |
| 5.4 | Session timeline dialog | 1 day | Frontend | `dialog-timeline.tsx` |
| 5.5 | Subagent dialog | 1 day | Frontend | `dialog-subagent.tsx` |
| 5.6 | Enhanced autocomplete | 0.5 days | Frontend | Autocomplete upgrade |

**Phase 3: Mouse/Keyboard**
| ID | Task | Estimated | Owner | Deliverable |
|----|------|-----------|-------|-------------|
| 3.1 | Leader key system | 2 days | Frontend | `useLeaderKey.ts` |
| 3.2 | Copy-on-select | 1 day | Frontend | Selection to clipboard |
| 3.3 | Focus trap for dialogs | 1 day | Frontend | `useFocusTrap.ts` |
| 3.4 | Focus restoration | 0.5 days | Frontend | Restoration logic |
| 3.5 | Enhanced keybind registry | 0.5 days | Frontend | Keybind upgrade |

#### Sprint 2 Deliverables

- [ ] `Ctrl+P` opens unified command palette
- [ ] Fuzzy search filters commands instantly
- [ ] `Space` leader key triggers chord sequences
- [ ] Select text in TUI copies to clipboard
- [ ] Stash drafts with `Ctrl+S`
- [ ] View session timeline with `/timeline`
- [ ] Extmarks render inline virtual text

#### Sprint 2 Milestone: Enhanced TUI
**Date**: End of Week 4.5
**Success Criteria**:
- Command palette with fuzzy search
- Leader key sequences work (e.g., `Space h` for help)
- Copy-on-select enabled
- Stash system stores drafts
- Timeline dialog shows session history

---

### Sprint 3: Web Console (Weeks 5-7)

**Goal**: Full web-based chat interface matching OpenCode.

```
Week 5                          Week 6                          Week 7
├─────────────────────────────┼─────────────────────────────┼──────────────────┤
│                             │                              │                  │
│  Phase 6: Web Console       │  Phase 6 cont.               │  Phase 6 cont.   │
│  =========================  │  ==============              │  ==============  │
│  [6.1] Chat layout (2d)     │  [6.4] File tree (2d)        │  [6.6] Sessions  │
│  [6.2] PromptInput (3d)     │  [6.5] Terminal (3d)         │  [6.7] Selectors │
│  [6.3] Message display (2d) │                              │  Polish & Test   │
│                             │                              │                  │
└─────────────────────────────┴─────────────────────────────┴──────────────────┘
```

#### Sprint 3 Tasks Detail

| ID | Task | Estimated | Owner | Deliverable |
|----|------|-----------|-------|-------------|
| 6.1 | Chat interface layout | 2 days | Frontend | `pages/session.tsx` |
| 6.2 | PromptInput component | 3 days | Frontend | `prompt-input.tsx` |
| 6.3 | Message display | 2 days | Frontend | `message-part.tsx` |
| 6.4 | File tree sidebar | 2 days | Frontend | `file-tree.tsx` |
| 6.5 | Terminal integration | 3 days | Frontend | xterm.js integration |
| 6.6 | Session management | 1 day | Frontend | Session list/switch |
| 6.7 | Model/Agent selectors | 1 day | Frontend | Dropdown selectors |

#### Sprint 3 Deliverables

- [ ] Web console shows chat messages
- [ ] Send messages from web UI
- [ ] File tree shows project structure
- [ ] Terminal embedded in web console
- [ ] Switch between sessions
- [ ] Select model and agent from dropdowns

#### Sprint 3 Milestone: Web Console MVP
**Date**: End of Week 7
**Success Criteria**:
- Full chat conversation in browser
- File attachments work in web UI
- Terminal commands visible
- Session switching functional

---

## Timeline Summary

```
Week    1     2     3     4     5     6     7
        ├─────┼─────┼─────┼─────┼─────┼─────┤
Sprint  │  SPRINT 1     │  SPRINT 2     │  SPRINT 3     │
        │  Foundation   │  Enhanced UX  │  Web Console  │
        ├───────────────┼───────────────┼───────────────┤
Phase 1 │▓▓▓▓▓▓▓▓▓▓▓▓▓ │               │               │
Phase 2 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │               │
Phase 4 │               │▓▓▓▓▓▓▓▓▓▓▓▓▓ │               │
Phase 3 │               │      ▓▓▓▓▓▓▓▓▓▓▓▓▓          │
Phase 5 │               │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │
Phase 6 │               │               │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
        └───────────────┴───────────────┴───────────────┘

Milestones:
  Week 2.5: Command + File Foundation
  Week 4.5: Enhanced TUI Experience
  Week 7:   Web Console MVP
```

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| React vs SolidJS pattern mismatch | HIGH | MEDIUM | Adapt patterns conceptually, don't port directly |
| Ink limitations vs @opentui | MEDIUM | HIGH | Accept feature subset, document gaps in FAQ |
| Breaking existing TUI | MEDIUM | HIGH | Feature flags for all new features |
| Web console complexity | HIGH | HIGH | MVP first, iterate on polish |
| Terminal integration issues | MEDIUM | MEDIUM | Use proven xterm.js, test early |
| Test coverage regression | MEDIUM | MEDIUM | Run tests after each phase |

### Contingency Plans

| Phase | If Behind Schedule | Action |
|-------|-------------------|--------|
| Phase 1 | Skip bash templates | Core registry first, templates later |
| Phase 2 | Skip PDF support | Image paste is MVP |
| Phase 3 | Skip leader key | Basic keybindings sufficient |
| Phase 4 | Skip fuzzy search | Simple string match |
| Phase 5 | Skip stash system | Core components only |
| Phase 6 | Skip terminal embed | Chat interface only for MVP |

---

## Quality Gates

### Per-Phase Checklist

Before marking ANY phase complete:

- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] Existing tests pass (`npm test`)
- [ ] New components have basic tests
- [ ] Feature works in TUI (manual test)
- [ ] No console errors in development
- [ ] Code review completed

### Sprint-End Verification

| Sprint | Verification Steps |
|--------|-------------------|
| Sprint 1 | Command execution e2e, file attach e2e |
| Sprint 2 | Keyboard workflow test, palette test |
| Sprint 3 | Web console e2e, cross-browser test |

---

## Resource Requirements

### Team Allocation

| Role | Sprint 1 | Sprint 2 | Sprint 3 |
|------|----------|----------|----------|
| Backend Engineer | Full (Phase 1) | Part (support) | Part (API) |
| Frontend Engineer | Full (Phase 2) | Full (Phase 3-5) | Full (Phase 6) |
| QA/Test | Part (manual) | Part (manual) | Full (e2e) |

### Tools & Dependencies

| Dependency | Phase | Purpose | Notes |
|------------|-------|---------|-------|
| xterm.js | Phase 6 | Terminal in web | Already in dependencies |
| fuse.js | Phase 4 | Fuzzy search | Small footprint |
| @opentui | Reference | Pattern study | DO NOT import directly |

---

## Communication Plan

### Weekly Status Updates

| Day | Activity |
|-----|----------|
| Monday | Sprint planning / review |
| Wednesday | Mid-week sync (if blockers) |
| Friday | Progress update & demo |

### Escalation Path

```
Issue Detected
      │
      ▼
┌─────────────┐
│ Fix in < 1h │──────────────▶ Resolve & Continue
└─────────────┘
      │ No
      ▼
┌─────────────┐
│ Fix in < 1d │──────────────▶ Document & Schedule
└─────────────┘
      │ No
      ▼
┌─────────────┐
│ Escalate to │──────────────▶ Adjust Sprint Scope
│ Tech Lead   │
└─────────────┘
```

---

## Implementation Order (Final)

### Atomic Task Sequence

```
Week 1:
  [x] 1.1 Server-side command registry (commit 9e7605b)
  [x] 1.2 Positional arguments (commit 9e7605b)
  [x] 1.3 MCP command discovery (commit 9e7605b)
  [x] 2.1 Image paste handling (commit 519fce9)
  [x] 2.2 Drag-drop overlay (commit 519fce9)

Week 2:
  [x] 1.4 Subtask delegation (commit 9e7605b)
  [x] 1.5 Bash execution (commit 9e7605b)
  [x] 2.3 Binary upload (commit 519fce9)
  [x] 2.4 Image preview (commit 519fce9)

Week 2.5:
  [x] 2.5 PDF support (commit 519fce9)
  [x] 2.6 File part schema (commit f1a9ffe)
  [x] MILESTONE: Foundation Complete ✓

Week 3:
  [x] 4.1 CommandProvider (commit e2884f3)
  [x] 4.2 Dynamic registration (commit e2884f3)
  [x] 5.1 Extmarks (commit d910e0a)
  [x] 3.1 Leader key (commit 8614116)

Week 3.5:
  [x] 4.3 useFilteredList (commit e2884f3)
  [x] 4.4 Fuzzy search (commit e2884f3)
  [x] 5.2 Prompt input (commit d910e0a)
  [x] 3.2 Copy-on-select (commit 8614116)

Week 4:
  [x] 4.5 Keyboard nav (commit e2884f3)
  [x] 5.3 Stash system (commit d910e0a)
  [x] 5.4 Timeline dialog (commit d910e0a)
  [x] 3.3 Focus trap (commit 8614116)

Week 4.5:
  [x] 5.5 Subagent dialog (commit d910e0a)
  [x] 5.6 Autocomplete (partial)
  [x] 3.4 Focus restore (commit 8614116)
  [x] 3.5 Keybind registry (commit 8614116)
  [x] MILESTONE: Enhanced TUI Complete ✓

Week 5:
  [x] 6.1 Chat layout (commit f1a9ffe)
  [x] 6.2 PromptInput (commit f1a9ffe)

Week 6:
  [x] 6.3 Message display (commit f1a9ffe)
  [ ] 6.4 File tree (future)

Week 7:
  [ ] 6.5 Terminal integration (future)
  [ ] 6.6 Session management (partial - basic switch)
  [ ] 6.7 Model selectors (future)
  [x] MILESTONE: Web Console MVP ✓ (core chat complete)
```

---

## Appendix: Reference Links

### OpenCode Source Files (Key References)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/opencode/src/command/index.ts` | 500+ | Command registry pattern |
| `packages/app/src/components/prompt-input.tsx` | 1500+ | Web input component |
| `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` | 1087 | TUI prompt |
| `packages/ui/src/hooks/use-filtered-list.tsx` | 200+ | Generic list hook |
| `packages/app/src/context/command.tsx` | 300+ | Command context |
| `packages/opencode/src/cli/cmd/tui/context/keybind.tsx` | 400+ | Leader key system |

### SuperCode Existing Files (Modify)

| File | Action | Phase |
|------|--------|-------|
| `src/session/prompt.ts` | Add command execution | Phase 1 |
| `src/tui/component/Prompt.tsx` | Add file support | Phase 2 |
| `src/tui/context/keybind.tsx` | Add leader key | Phase 3 |
| `packages/console/app/` | Major additions | Phase 6 |

---

**Document Status**: Complete
**Next Action**: Begin Sprint 1, Task 1.1 (Server-side command registry)
**Last Updated**: 2026-01-14

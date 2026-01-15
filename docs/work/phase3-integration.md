# Phase 3: Integration Work Breakdown

> **Duration**: Week 5-6 | **Priority**: 🟡 High

---

## Overview

Phase 3 focuses on ecosystem integration:
- TUI enhancements
- Claude Code compatibility
- Additional hooks
- Directory injectors

---

## Work Items

### WI-3.1: Theme Engine

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Add theme system with 30+ themes.

**Tasks**:
- [ ] Create `src/tui/themes/` directory
- [ ] Define Theme interface
- [ ] Port themes from OpenCode (Dracula, Nord, Catppuccin, etc.)
- [ ] Create ThemeProvider component
- [ ] Add theme selection CLI

**Acceptance Criteria**:
- 30+ themes available
- Themes switch correctly
- Theme persists across sessions

**Dependencies**: None

---

### WI-3.2: Syntax Highlighting

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add Shiki-based syntax highlighting.

**Tasks**:
- [ ] Add Shiki dependency
- [ ] Create CodeBlock component
- [ ] Support 10+ languages
- [ ] Integrate with theme system

**Acceptance Criteria**:
- Code highlighted correctly
- Colors match theme
- Performance acceptable

**Dependencies**: WI-3.1

---

### WI-3.3: Mouse Support Enhancement

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Improve mouse event handling.

**Tasks**:
- [ ] Create `src/tui/hooks/useMouse.ts`
- [ ] Handle click events
- [ ] Handle scroll events
- [ ] Add selection support

**Acceptance Criteria**:
- Clicks register correctly
- Scrolling works
- Selection visible

**Dependencies**: None

---

### WI-3.4: Scrollable Areas

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add smooth scrollable containers.

**Tasks**:
- [ ] Create ScrollBox component
- [ ] Implement keyboard scrolling
- [ ] Implement mouse scrolling
- [ ] Add scroll indicators

**Acceptance Criteria**:
- Scrolling is smooth
- Indicators show position
- Long content handled

**Dependencies**: WI-3.3

---

### WI-3.5: Claude Code Settings Loader

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Load and apply ~/.claude/settings.json.

**Tasks**:
- [ ] Create `src/features/claude-code/settings-loader.ts`
- [ ] Parse settings.json format
- [ ] Apply hooks configuration
- [ ] Handle missing file gracefully

**Acceptance Criteria**:
- Settings load correctly
- Hooks apply
- Missing file handled

**Dependencies**: None

---

### WI-3.6: Claude Code Commands Loader

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Load custom commands from ~/.claude/commands/.

**Tasks**:
- [ ] Create `src/features/claude-code/commands-loader.ts`
- [ ] Scan commands directory
- [ ] Parse command markdown files
- [ ] Register with `claude:` namespace

**Acceptance Criteria**:
- Commands load correctly
- Namespace prevents conflicts
- Commands executable

**Dependencies**: WI-3.5

---

### WI-3.7: Claude Code Agents Loader

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Load custom agents from ~/.claude/agents/.

**Tasks**:
- [ ] Create `src/features/claude-code/agents-loader.ts`
- [ ] Scan agents directory
- [ ] Parse agent markdown with frontmatter
- [ ] Register with `claude:` namespace

**Acceptance Criteria**:
- Agents load correctly
- Namespace prevents conflicts
- Agents selectable

**Dependencies**: WI-3.5

---

### WI-3.8: Claude Code Plugins Loader

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Load plugins from ~/.claude/plugins/.

**Tasks**:
- [ ] Create `src/features/claude-code/plugin-loader.ts`
- [ ] Scan plugins directory
- [ ] Parse plugin manifests
- [ ] Load plugin commands and tools
- [ ] Register with `plugin:name:` namespace

**Acceptance Criteria**:
- Plugins load correctly
- Manifest parsed
- Tools available

**Dependencies**: WI-3.5

---

### WI-3.9: Directory Injector Hooks

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Auto-inject project context.

**Tasks**:
- [ ] Create `src/hooks/directory-agents-injector/`
- [ ] Create `src/hooks/directory-readme-injector/`
- [ ] Scan project directories
- [ ] Load project-specific agents/rules
- [ ] Inject into session context

**Acceptance Criteria**:
- Project agents loaded
- README injected
- .clauderules/.opencoderules loaded

**Dependencies**: WI-1.4

---

### WI-3.10: Edit Error Recovery Hook

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Handle file edit failures gracefully.

**Tasks**:
- [ ] Create `src/hooks/edit-error-recovery/`
- [ ] Detect edit tool failures
- [ ] Suggest recovery actions
- [ ] Allow retry with modified approach

**Acceptance Criteria**:
- Edit failures detected
- Recovery suggested
- User can retry

**Dependencies**: WI-1.4

---

## Testing Requirements

### Unit Tests
- [ ] Theme loading
- [ ] Syntax highlighting
- [ ] Mouse events
- [ ] Settings parsing
- [ ] Command loading
- [ ] Plugin loading

### Integration Tests
- [ ] Full TUI with themes
- [ ] Claude Code full compat
- [ ] Directory injection

---

## Deliverables

| Deliverable | Description | Due |
|-------------|-------------|-----|
| Theme Engine | 30+ themes | End of Day 2 |
| TUI Enhancements | Syntax, mouse, scroll | End of Day 4 |
| Claude Code Compat | Full loader system | End of Day 8 |
| Directory Hooks | Injectors | End of Day 10 |

---

## Definition of Done

- [ ] TUI looks professional with themes
- [ ] Syntax highlighting works
- [ ] Claude Code plugins work
- [ ] Directory context injected
- [ ] All tests pass

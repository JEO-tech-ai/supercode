# Implementation Priority Roadmap

## Executive Summary

This document provides a prioritized implementation roadmap for bringing SuperCode's TUI to feature parity with OpenCode, organized by impact and effort.

## Priority Matrix

### P0: Critical (Must Have)
Features that are fundamental to user experience and workflow efficiency.

| Feature | Effort | Impact | Timeline |
|---------|--------|--------|----------|
| Leader Key System | Medium | High | Week 1 |
| Copy-on-Select | Low | High | Week 1 |
| Word Navigation (Ctrl+Arrow) | Low | High | Week 1 |
| Fuzzy Search in Commands | Medium | High | Week 1-2 |

### P1: High Priority (Should Have)
Features that significantly improve productivity.

| Feature | Effort | Impact | Timeline |
|---------|--------|--------|----------|
| Image/Media Paste | Medium | High | Week 2 |
| Stash/Draft System | Medium | Medium | Week 2 |
| Scroll Wheel Support | Low | Medium | Week 2 |
| Extmark Rendering | High | Medium | Week 2-3 |

### P2: Medium Priority (Nice to Have)
Features that enhance polish and advanced use cases.

| Feature | Effort | Impact | Timeline |
|---------|--------|--------|----------|
| Text Undo/Redo | Medium | Medium | Week 3 |
| MCP Resource References | Medium | Medium | Week 3 |
| Command History | Low | Medium | Week 3 |
| Session Compaction UI | Low | Low | Week 3 |

### P3: Low Priority (Future)
Features that are nice-to-have but not essential.

| Feature | Effort | Impact | Timeline |
|---------|--------|--------|----------|
| Right-Click Context Menu | Medium | Low | Week 4+ |
| Hover States | High | Low | Week 4+ |
| Tree-Sitter Highlighting | Very High | Low | Future |
| Symbol References (LSP) | High | Medium | Future |

## Detailed Implementation Plan

### Week 1: Core Input Foundations

#### Day 1-2: Leader Key System
**Files to Create/Modify:**
- `src/tui/hooks/useLeaderKey.ts` (new)
- `src/tui/component/LeaderOverlay.tsx` (new)
- `src/tui/context/keybinding.tsx` (modify)
- `src/tui/App.tsx` (integrate)

**Implementation Steps:**
1. Create `useLeaderKey` hook with timeout logic
2. Define default leader bindings (matching OpenCode's `ctrl+x` pattern)
3. Create overlay component for visual feedback
4. Integrate with existing keybinding registry

**Testing:**
- Test leader timeout (2s)
- Test key sequence detection
- Test ESC cancellation

#### Day 2-3: Word Navigation
**Files to Modify:**
- `src/tui/hooks/useCursor.ts`
- `src/tui/component/prompt/AdvancedPrompt.tsx`

**Implementation Steps:**
1. Add word boundary detection to `useCursor`
2. Handle `Ctrl+Left/Right` in input handler
3. Add `Home/End` key handling
4. Add `Ctrl+Backspace/Delete` for word deletion

**Testing:**
- Test with English text
- Test with CJK text (different word boundaries)
- Test at document boundaries

#### Day 3-4: Copy-on-Select
**Files to Create/Modify:**
- `src/tui/hooks/useClipboard.ts` (new)
- `src/tui/hooks/useMouse.ts` (modify)

**Implementation Steps:**
1. Create `useClipboard` hook with OSC 52 support
2. Add native fallback (pbcopy, xclip, wl-copy)
3. Integrate with mouse drag events
4. Copy on mouse release after drag

**Testing:**
- Test in iTerm2 (OSC 52)
- Test in Terminal.app (native fallback)
- Test in Linux terminals

#### Day 4-5: Fuzzy Search
**Files to Create/Modify:**
- `src/tui/utils/fuzzy.ts` (new)
- `src/tui/component/prompt/SlashCommands.tsx` (modify)
- `src/tui/component/prompt/FileReference.tsx` (modify)

**Implementation Steps:**
1. Implement fuzzy matching algorithm with scoring
2. Add character highlight ranges
3. Update command menu to use fuzzy search
4. Update file menu to use fuzzy search
5. Sort by score

**Testing:**
- Test edge cases (empty query, no matches)
- Test with typos
- Test highlight rendering

### Week 2: Media & Visual Enhancements

#### Day 1-2: Image Paste Support
**Files to Create/Modify:**
- `src/tui/hooks/useImagePaste.ts` (new)
- `src/tui/component/prompt/AdvancedPrompt.tsx` (modify)
- `src/tui/component/prompt/ImagePreview.tsx` (new)

**Implementation Steps:**
1. Detect paste events with image data
2. Convert to base64
3. Create preview component (ASCII or dimensions)
4. Store in message parts for submission

**Testing:**
- Test PNG paste
- Test JPEG paste
- Test with large images (compression?)

#### Day 2-3: Stash/Draft System
**Files to Create/Modify:**
- `src/tui/context/stash.tsx` (new)
- `src/tui/component/StashDialog.tsx` (new)
- `src/tui/component/prompt/SlashCommands.tsx` (add commands)

**Implementation Steps:**
1. Create stash context with persistence
2. Add `/stash`, `/stash:pop`, `/stash:list` commands
3. Create stash list dialog
4. Add leader key bindings (`<leader>s`, `<leader>p`)

**Storage:** `~/.supercoin/stash.json`

#### Day 3-4: Scroll Wheel Support
**Files to Modify:**
- `src/tui/hooks/useMouse.ts`
- `src/tui/routes/session/MessageList.tsx`

**Implementation Steps:**
1. Detect wheel events (button codes 64/65)
2. Add `onScroll` callback to mouse hook
3. Integrate with message list scrolling
4. Integrate with menu scrolling

#### Day 4-5: Extmark Rendering
**Files to Create/Modify:**
- `src/tui/component/prompt/Extmark.tsx` (new)
- `src/tui/component/prompt/AdvancedPrompt.tsx` (modify)

**Implementation Steps:**
1. Create extmark component (styled inline blocks)
2. Modify prompt to render extmarks inline
3. Handle cursor movement around extmarks
4. Add removal button

### Week 3: Polish & Advanced Features

#### Day 1-2: Text Undo/Redo
**Files to Create:**
- `src/tui/hooks/useTextHistory.ts`

**Implementation Steps:**
1. Create history stack with debouncing
2. Handle `Ctrl+Z` at prompt level (before session undo)
3. Add undo/redo indicators

#### Day 2-3: MCP Resource References
**Files to Modify:**
- `src/tui/component/prompt/FileReference.tsx`

**Implementation Steps:**
1. Query MCP servers for resources
2. Add MCP section to autocomplete menu
3. Create MCP resource extmark

#### Day 3-4: Command History
**Files to Create/Modify:**
- `src/tui/hooks/useCommandHistory.ts` (new)
- `src/tui/component/prompt/SlashCommands.tsx` (modify)

**Implementation Steps:**
1. Track command usage with frequency
2. Add "Recent" section to menu
3. Persist to `~/.supercoin/command-history.json`

#### Day 4-5: Session Compaction UI
**Files to Modify:**
- `src/tui/routes/session/MessageList.tsx`

**Implementation Steps:**
1. Detect compaction markers in session
2. Render visual separator
3. Show compacted message count

## Resource Requirements

### Development Time
- **Week 1**: 5 days (40 hours)
- **Week 2**: 5 days (40 hours)
- **Week 3**: 5 days (40 hours)
- **Total**: 15 days (120 hours)

### Files Changed Summary

**New Files (12):**
```
src/tui/hooks/useLeaderKey.ts
src/tui/hooks/useClipboard.ts
src/tui/hooks/useImagePaste.ts
src/tui/hooks/useTextHistory.ts
src/tui/hooks/useCommandHistory.ts
src/tui/utils/fuzzy.ts
src/tui/context/stash.tsx
src/tui/component/LeaderOverlay.tsx
src/tui/component/StashDialog.tsx
src/tui/component/prompt/Extmark.tsx
src/tui/component/prompt/ImagePreview.tsx
```

**Modified Files (8):**
```
src/tui/hooks/useMouse.ts
src/tui/hooks/useCursor.ts
src/tui/context/keybinding.tsx
src/tui/component/prompt/AdvancedPrompt.tsx
src/tui/component/prompt/SlashCommands.tsx
src/tui/component/prompt/FileReference.tsx
src/tui/routes/session/MessageList.tsx
src/tui/App.tsx
```

## Success Metrics

### Functional Metrics
- [ ] All P0 features working
- [ ] All P1 features working
- [ ] No regression in existing features
- [ ] Works in major terminals (iTerm2, Terminal.app, Alacritty)

### Performance Metrics
- [ ] Input latency < 16ms (60fps)
- [ ] Autocomplete response < 100ms
- [ ] No memory leaks on long sessions

### User Experience Metrics
- [ ] Leader key discoverable (overlay shows bindings)
- [ ] Fuzzy search feels responsive
- [ ] Extmarks visually clear

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Terminal compatibility issues | Medium | High | Test early on multiple terminals |
| Performance degradation | Low | High | Profile regularly, use memoization |
| ink-text-input limitations | Medium | Medium | May need to fork or replace |
| CJK cursor issues | Medium | Medium | Thorough testing with Korean/Chinese |

## Dependencies

### External Dependencies
None required - all features use built-in Node.js/terminal capabilities.

### Internal Dependencies
```
Leader Key → Keybinding System
Copy-on-Select → Mouse Hook
Extmark → File Reference Parser
Stash → Slash Commands
```

## Rollout Plan

### Phase 1: Internal Testing
- Implement P0 features
- Test with development team
- Fix critical bugs

### Phase 2: Beta Release
- Implement P1 features
- Release to early adopters
- Gather feedback

### Phase 3: General Release
- Implement P2 features
- Full documentation
- Version bump

## Appendix: OpenCode Feature Comparison

| OpenCode Feature | SuperCode Status | Priority |
|-----------------|------------------|----------|
| Leader key (`ctrl+x`) | Not implemented | P0 |
| Readline shortcuts | Partial | P0 |
| Copy-on-select | Not implemented | P0 |
| Fuzzy command search | Not implemented | P0 |
| Image paste | Not implemented | P1 |
| Draft stash | Not implemented | P1 |
| Scroll wheel | Not implemented | P1 |
| Extmark rendering | Not implemented | P1 |
| External editor | Not implemented | P2 |
| Auto-compact UI | Not implemented | P2 |
| Theme system | Implemented | Done |
| Shell mode (!) | Implemented | Done |
| File references (@) | Implemented | Done |
| Slash commands (/) | Implemented | Done |
| Mouse click | Implemented | Done |
| Session management | Implemented | Done |

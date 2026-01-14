# Input Handling Enhancement Plan

## Current Implementation

### Location
- `src/tui/component/prompt/AdvancedPrompt.tsx` - Main input component
- `src/tui/hooks/useCursor.ts` - Cursor positioning
- `src/tui/hooks/useComposition.ts` - IME composition
- `src/tui/context/keybinding.tsx` - Keyboard shortcuts

### Features
- Text input via `ink-text-input`
- CJK/wide character support in cursor
- Keybinding registry with modifiers
- Vim/Emacs keymap presets
- History navigation (up/down arrows)
- Shell mode (! prefix)
- Command mode (/ prefix)
- Reference mode (@ trigger)

### Limitations
1. **No Leader Key system** - Can't chain key sequences
2. **No multi-cursor** - Single cursor only
3. **No word jump** - Ctrl+Left/Right not working
4. **No line editing** - Home/End keys limited
5. **No undo/redo in textarea** - Only session-level undo
6. **No stash/draft system** - Can't save drafts

## OpenCode Comparison

| Feature | SuperCode | OpenCode |
|---------|-----------|----------|
| Leader Key | No | Yes (2s timeout) |
| Word Navigation | No | Yes (Ctrl+Arrow) |
| Line Navigation | Limited | Yes (Home/End) |
| Text Undo/Redo | No | Yes |
| Draft Stash | No | Yes |
| Multi-line Editing | Yes | Yes |
| IME Composition | Yes | Yes |

## Enhancement Plan

### Phase 1: Leader Key System (Priority: HIGH)

**Goal**: Implement Vim-like leader key sequences.

**Concept**:
```
Press "Space" (leader) -> Wait for next key (2s timeout)
  "s" -> Save/stash draft
  "f" -> Find files
  "g" -> Git commands
  "m" -> Model switch
  "a" -> Agent menu
```

**Implementation**:
```typescript
// src/tui/hooks/useLeaderKey.ts
interface LeaderKeyOptions {
  leader: string;  // Default: " " (space)
  timeout: number; // Default: 2000ms
  bindings: LeaderBinding[];
}

interface LeaderBinding {
  key: string;
  action: () => void;
  description: string;
  category?: string;
}

export function useLeaderKey(options: LeaderKeyOptions): {
  isLeaderActive: boolean;
  pendingKeys: string;
  showOverlay: boolean;
}
```

**Visual Feedback**:
```
┌─────────────────────────────────────┐
│ LEADER MODE (2s)                    │
├─────────────────────────────────────┤
│ [s] Stash draft                     │
│ [f] Find files                      │
│ [g] Git commands                    │
│ [m] Switch model                    │
│ [a] Agent menu                      │
│ [ESC] Cancel                        │
└─────────────────────────────────────┘
```

**Changes Required**:
- Create `useLeaderKey` hook
- Create `LeaderOverlay` component
- Integrate with keybinding system
- Add default leader bindings

### Phase 2: Word & Line Navigation (Priority: HIGH)

**Goal**: Standard text editing shortcuts.

**Shortcuts to Add**:
| Shortcut | Action |
|----------|--------|
| `Ctrl+Left` | Jump word left |
| `Ctrl+Right` | Jump word right |
| `Home` | Start of line |
| `End` | End of line |
| `Ctrl+A` | Select all |
| `Ctrl+Backspace` | Delete word left |
| `Ctrl+Delete` | Delete word right |

**Implementation**:
```typescript
// src/tui/hooks/useTextNavigation.ts
interface TextNavigationActions {
  wordLeft: () => void;
  wordRight: () => void;
  lineStart: () => void;
  lineEnd: () => void;
  deleteWordLeft: () => void;
  deleteWordRight: () => void;
  selectAll: () => void;
}

export function useTextNavigation(
  text: string,
  cursor: number,
  onChange: (text: string, cursor: number) => void
): TextNavigationActions;
```

**Word Boundary Detection**:
```typescript
function findWordBoundary(text: string, pos: number, direction: -1 | 1): number {
  const wordChars = /[\w]/;
  let i = pos + direction;
  
  // Skip whitespace
  while (i >= 0 && i < text.length && /\s/.test(text[i])) {
    i += direction;
  }
  
  // Find word boundary
  while (i >= 0 && i < text.length && wordChars.test(text[i])) {
    i += direction;
  }
  
  return direction === -1 ? i + 1 : i;
}
```

**Changes Required**:
- Create `useTextNavigation` hook
- Handle key events before `ink-text-input`
- Update cursor position manually

### Phase 3: Text Undo/Redo (Priority: MEDIUM)

**Goal**: Undo/redo within the current input buffer.

**Implementation**:
```typescript
// src/tui/hooks/useTextHistory.ts
interface TextHistoryEntry {
  text: string;
  cursor: number;
  timestamp: number;
}

export function useTextHistory(initialText: string = ""): {
  text: string;
  cursor: number;
  setText: (text: string, cursor: number) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
}
```

**Strategy**:
- Record state on significant changes (not every keystroke)
- Debounce recording (500ms after last change)
- Max history size: 50 entries
- Clear on submit

**Shortcuts**:
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo text change |
| `Ctrl+Shift+Z` | Redo text change |
| `Ctrl+Y` | Redo text change (alt) |

**Changes Required**:
- Create `useTextHistory` hook
- Integrate with `AdvancedPrompt`
- Handle Ctrl+Z at prompt level (not session level)

### Phase 4: Stash/Draft System (Priority: MEDIUM)

**Goal**: Save and restore prompt drafts.

**Implementation**:
```typescript
// src/tui/context/stash.tsx
interface StashedDraft {
  id: string;
  text: string;
  references: PromptPart[];
  timestamp: number;
  sessionId?: string;
}

interface StashContextValue {
  drafts: StashedDraft[];
  stash: (text: string, references: PromptPart[]) => string;
  pop: () => StashedDraft | null;
  apply: (id: string) => StashedDraft | null;
  drop: (id: string) => void;
  clear: () => void;
}
```

**Persistence**:
```typescript
// Storage: ~/.supercoin/stash.json
interface StashStorage {
  drafts: StashedDraft[];
  maxDrafts: number;
}
```

**Slash Commands**:
- `/stash` - Stash current input
- `/stash:pop` - Pop and apply most recent
- `/stash:list` - Show all stashed drafts
- `/stash:drop <id>` - Remove specific draft
- `/stash:clear` - Clear all drafts

**Changes Required**:
- Create `StashContext` and provider
- Add stash-related slash commands
- Create `StashListDialog` component
- Persist to filesystem

### Phase 5: Enhanced IME Support (Priority: LOW)

**Goal**: Better handling of complex input methods.

**Current Issues**:
- Composition preview may flicker
- Cursor position during composition
- Some IMEs not fully supported

**Improvements**:
```typescript
// src/tui/hooks/useComposition.ts (enhanced)
interface CompositionState {
  isComposing: boolean;
  compositionText: string;
  previewText: string;
  candidates: string[];
  selectedCandidate: number;
}
```

**Visual Improvements**:
- Show composition text inline
- Underline composing region
- Show candidate list (if available)

## New Components

### Leader Key Overlay

```tsx
// src/tui/component/LeaderOverlay.tsx
interface LeaderOverlayProps {
  visible: boolean;
  bindings: LeaderBinding[];
  pendingKeys: string;
  timeRemaining: number;
  onCancel: () => void;
}

export function LeaderOverlay({
  visible,
  bindings,
  pendingKeys,
  timeRemaining,
  onCancel,
}: LeaderOverlayProps) {
  if (!visible) return null;
  
  return (
    <Box
      position="absolute"
      bottom={5}
      left={0}
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box flexDirection="column">
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="cyan">LEADER MODE</Text>
          <Text color="gray">{(timeRemaining / 1000).toFixed(1)}s</Text>
        </Box>
        
        {pendingKeys && (
          <Text color="yellow">Keys: {pendingKeys}</Text>
        )}
        
        <Box flexDirection="column" marginTop={1}>
          {bindings.map((b) => (
            <Text key={b.key}>
              <Text color="cyan">[{b.key}]</Text> {b.description}
            </Text>
          ))}
        </Box>
        
        <Text color="gray" marginTop={1}>[ESC] Cancel</Text>
      </Box>
    </Box>
  );
}
```

### Stash List Dialog

```tsx
// src/tui/component/StashListDialog.tsx
interface StashListDialogProps {
  visible: boolean;
  drafts: StashedDraft[];
  onSelect: (draft: StashedDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}
```

## Implementation Checklist

### Phase 1: Leader Key
- [ ] Create `useLeaderKey` hook
- [ ] Add leader key detection
- [ ] Create `LeaderOverlay` component
- [ ] Define default bindings
- [ ] Add timeout logic
- [ ] Integrate with keybinding system

### Phase 2: Word/Line Navigation
- [ ] Create `useTextNavigation` hook
- [ ] Implement word boundary detection
- [ ] Add Ctrl+Arrow handlers
- [ ] Add Home/End handlers
- [ ] Add delete word handlers

### Phase 3: Text Undo/Redo
- [ ] Create `useTextHistory` hook
- [ ] Add debounced state recording
- [ ] Handle Ctrl+Z/Y at prompt level
- [ ] Add undo/redo indicators

### Phase 4: Stash System
- [ ] Create `StashContext`
- [ ] Add slash commands
- [ ] Create `StashListDialog`
- [ ] Persist to filesystem
- [ ] Add keyboard shortcuts

### Phase 5: Enhanced IME
- [ ] Improve composition handling
- [ ] Add visual composition preview
- [ ] Test with multiple IMEs

## Default Leader Key Bindings

```typescript
const DEFAULT_LEADER_BINDINGS: LeaderBinding[] = [
  // Files & Navigation
  { key: "f", action: () => trigger("file.search"), description: "Find files" },
  { key: "s", action: () => trigger("stash.push"), description: "Stash draft" },
  { key: "p", action: () => trigger("stash.pop"), description: "Pop stash" },
  
  // Git
  { key: "g", action: () => {}, description: "Git menu...", category: "git" },
  { key: "gc", action: () => trigger("git.commit"), description: "Git commit" },
  { key: "gd", action: () => trigger("git.diff"), description: "Git diff" },
  { key: "gs", action: () => trigger("git.status"), description: "Git status" },
  
  // Model & Agent
  { key: "m", action: () => trigger("model.switch"), description: "Switch model" },
  { key: "a", action: () => trigger("agent.menu"), description: "Agent menu" },
  
  // Session
  { key: "n", action: () => trigger("session.new"), description: "New session" },
  { key: "l", action: () => trigger("session.list"), description: "List sessions" },
  
  // System
  { key: "?", action: () => trigger("help.show"), description: "Show help" },
  { key: ":", action: () => trigger("palette.open"), description: "Command palette" },
];
```

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Leader Key | 3 days | None |
| Phase 2: Word/Line Nav | 2 days | None |
| Phase 3: Text Undo/Redo | 2 days | None |
| Phase 4: Stash System | 3 days | None |
| Phase 5: Enhanced IME | 2 days | None |

**Total Estimated Time**: 1.5-2 weeks

## Testing Notes

### Leader Key Testing
- Test timeout behavior
- Test nested sequences (e.g., `<leader>gc`)
- Test cancellation (ESC)
- Test with different leader keys

### Navigation Testing
- Test with CJK text (word boundaries differ)
- Test at document boundaries
- Test with empty input

### Stash Testing
- Test persistence across restarts
- Test with large drafts
- Test max stash limit

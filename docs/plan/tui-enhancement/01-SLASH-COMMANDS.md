# Slash Commands Enhancement Plan

## Current Implementation

### Location
`src/tui/component/prompt/SlashCommands.tsx`

### Features
- Category-based grouping (session, navigation, mcp, git, context, agent, debug, system)
- Icon support with visual indicators
- Keybind hints display
- Alias support for multiple trigger words
- Real-time filtering as user types

### Limitations
1. **No fuzzy search** - Only substring matching
2. **Static command list** - Can't dynamically add commands
3. **No command arguments parsing** - Basic `/command arg` split only
4. **Limited visual feedback** - No animation or transitions
5. **Fixed menu height** - No adaptive sizing

## OpenCode Comparison

| Feature | SuperCode | OpenCode |
|---------|-----------|----------|
| Fuzzy Search | No | Yes (via fzf-like) |
| Dynamic Commands | No | Yes (plugin-based) |
| Command Arguments | Basic | Advanced with types |
| Visual Transitions | No | Yes |
| Command History | No | Yes |
| Subcommands | No | Yes (`/mcp:connect`) |

## Enhancement Plan

### Phase 1: Fuzzy Search (Priority: HIGH)

**Goal**: Implement fuzzy search matching similar to VS Code command palette.

**Implementation**:
```typescript
// src/tui/utils/fuzzy.ts
export function fuzzyMatch(query: string, target: string): {
  matches: boolean;
  score: number;
  ranges: [number, number][];
}
```

**Algorithm**: 
1. Score based on consecutive matches
2. Bonus for match at word boundaries
3. Penalty for gaps between matches
4. Highlight matched characters

**Changes Required**:
- Add `fuzzy.ts` utility
- Update `SlashCommandsMenu` to use fuzzy matching
- Add highlight rendering for matched characters

### Phase 2: Command History (Priority: MEDIUM)

**Goal**: Remember and resurface recently used commands.

**Implementation**:
```typescript
// src/tui/hooks/useCommandHistory.ts
interface CommandHistoryEntry {
  command: string;
  args?: string;
  timestamp: number;
  frequency: number;
}

export function useCommandHistory(): {
  recent: CommandHistoryEntry[];
  add: (cmd: string, args?: string) => void;
  getMostUsed: (limit?: number) => CommandHistoryEntry[];
}
```

**Storage**: Persist in `~/.supercoin/command-history.json`

**Changes Required**:
- New `useCommandHistory` hook
- Update `SlashCommandsMenu` to show "Recent" section
- Sort commands by frequency when filter is empty

### Phase 3: Dynamic Command Registration (Priority: MEDIUM)

**Goal**: Allow plugins/hooks to register new slash commands.

**Implementation**:
```typescript
// src/tui/context/command.tsx
interface CommandRegistry {
  register: (command: SlashCommand) => () => void;
  unregister: (name: string) => void;
  getAll: () => SlashCommand[];
  getByCategory: (category: string) => SlashCommand[];
}
```

**Changes Required**:
- Update `CommandContext` to support dynamic registration
- Add registration API for hooks
- Update `useSlashCommands` to merge static + dynamic commands

### Phase 4: Advanced Arguments (Priority: LOW)

**Goal**: Type-safe command arguments with validation.

**Implementation**:
```typescript
interface SlashCommandArg {
  name: string;
  type: "string" | "number" | "file" | "agent" | "model";
  required?: boolean;
  default?: any;
  choices?: string[];
}

interface SlashCommandWithArgs extends SlashCommand {
  args?: SlashCommandArg[];
  onSelectWithArgs: (args: Record<string, any>) => void;
}
```

**UI Changes**:
- Show argument hints after command selection
- Auto-complete for known argument types
- Validation before execution

### Phase 5: Visual Enhancements (Priority: LOW)

**Goal**: Smooth animations and better visual hierarchy.

**Implementation**:
1. Fade-in animation on menu open
2. Scroll indicator for long lists
3. Category collapse/expand
4. Loading state for async commands

## New Commands to Add

Based on OpenCode feature parity:

| Command | Description | Category |
|---------|-------------|----------|
| `/stash` | Stash current prompt draft | session |
| `/stash:pop` | Restore stashed draft | session |
| `/stash:list` | List all stashed drafts | session |
| `/image` | Attach image from clipboard | context |
| `/screenshot` | Capture and attach screenshot | context |
| `/leader` | Show leader key bindings | system |
| `/keybinds` | Show all keyboard shortcuts | system |
| `/compact:show` | Show compaction markers | context |

## Implementation Checklist

- [ ] Add `fuzzy.ts` utility with scoring algorithm
- [ ] Update filtering in `SlashCommandsMenu`
- [ ] Add character highlighting for matches
- [ ] Create `useCommandHistory` hook
- [ ] Add "Recent" section to menu
- [ ] Persist command history
- [ ] Update `CommandContext` for dynamic registration
- [ ] Add registration API
- [ ] Add new commands listed above
- [ ] Add unit tests for fuzzy matching
- [ ] Add integration tests for command execution

## Code Examples

### Fuzzy Match Implementation

```typescript
export function fuzzyMatch(query: string, target: string): FuzzyResult {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  let queryIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;
  const ranges: [number, number][] = [];
  
  for (let i = 0; i < targetLower.length && queryIdx < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIdx]) {
      // Consecutive match bonus
      if (lastMatchIdx === i - 1) {
        score += 10;
      } else {
        score += 5;
      }
      
      // Word boundary bonus
      if (i === 0 || /\W/.test(target[i - 1])) {
        score += 20;
      }
      
      // Track range
      if (ranges.length > 0 && ranges[ranges.length - 1][1] === i) {
        ranges[ranges.length - 1][1] = i + 1;
      } else {
        ranges.push([i, i + 1]);
      }
      
      lastMatchIdx = i;
      queryIdx++;
    }
  }
  
  return {
    matches: queryIdx === queryLower.length,
    score: queryIdx === queryLower.length ? score : 0,
    ranges,
  };
}
```

### Highlighted Text Rendering

```tsx
function HighlightedText({ text, ranges }: { text: string; ranges: [number, number][] }) {
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  
  for (const [start, end] of ranges) {
    if (start > lastEnd) {
      parts.push(<Text key={lastEnd}>{text.slice(lastEnd, start)}</Text>);
    }
    parts.push(
      <Text key={start} color="yellow" bold>
        {text.slice(start, end)}
      </Text>
    );
    lastEnd = end;
  }
  
  if (lastEnd < text.length) {
    parts.push(<Text key={lastEnd}>{text.slice(lastEnd)}</Text>);
  }
  
  return <>{parts}</>;
}
```

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Fuzzy Search | 2 days | None |
| Phase 2: Command History | 2 days | None |
| Phase 3: Dynamic Registration | 3 days | Phase 1 |
| Phase 4: Advanced Arguments | 4 days | Phase 3 |
| Phase 5: Visual Enhancements | 2 days | Phase 1 |

**Total Estimated Time**: 2-3 weeks

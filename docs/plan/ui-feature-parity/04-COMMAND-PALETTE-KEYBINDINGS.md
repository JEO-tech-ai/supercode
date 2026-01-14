# Phase 4: Command Palette & Keybindings

> **Priority**: MEDIUM
> **Estimated Duration**: 1 week
> **Dependencies**: Phase 3 (Keyboard interactions)

---

## Overview

통합 명령 팔레트와 키바인딩 시스템을 구현합니다. OpenCode의 CommandProvider 패턴을 도입하여 동적 명령 등록, 퍼지 검색, 키보드 네비게이션을 지원합니다.

---

## Current State Analysis

### SuperCode Implementation

**Location**: `src/tui/ui/CommandPalette.tsx`

```typescript
// Current: Static command list with manual filtering
function CommandPalette() {
  const [filter, setFilter] = useState('')
  
  // Hardcoded commands
  const commands = [
    { id: 'new-session', label: 'New Session', action: () => {} },
    { id: 'model-select', label: 'Select Model', action: () => {} },
    // ...
  ]
  
  // Simple string matching
  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(filter.toLowerCase())
  )
  
  return (
    <Box>
      <TextInput value={filter} onChange={setFilter} />
      {filtered.map(cmd => (
        <Text key={cmd.id}>{cmd.label}</Text>
      ))}
    </Box>
  )
}
```

**Limitations**:
- Static command list
- Simple substring matching (no fuzzy search)
- Manual keyboard navigation
- No grouping/categories
- No keybind display

### OpenCode Implementation

**Location**: `opencode/packages/app/src/context/command.tsx`

```typescript
// OpenCode: Dynamic registration with full features
export interface CommandOption {
  id: string
  title: string
  description?: string
  category?: string
  keybind?: KeybindConfig
  slash?: string
  suggested?: boolean
  disabled?: boolean
  onSelect?: (source?: "palette" | "keybind" | "slash") => void
  onHighlight?: () => (() => void) | void
}

export const { use: useCommand, provider: CommandProvider } = createSimpleContext({
  name: "Command",
  init: () => {
    const [registrations, setRegistrations] = createSignal<Accessor<CommandOption[]>[]>([])
    
    // Dynamic command registration
    return {
      register(cb: () => CommandOption[]) {
        const results = createMemo(cb)
        setRegistrations(arr => [results, ...arr])
        onCleanup(() => {
          setRegistrations(arr => arr.filter(x => x !== results))
        })
      },
      trigger(id: string, source?: "palette" | "keybind" | "slash") {
        // Find and execute command
      },
      show: showPalette,
      options // All registered commands
    }
  }
})
```

**Location**: `opencode/packages/ui/src/hooks/use-filtered-list.tsx`

```typescript
// Reusable filtered list hook with fuzzy search
export function useFilteredList<T>(options: {
  items: T[] | (() => T[]) | ((query: string) => Promise<T[]>)
  key: (item: T | undefined) => string
  filterKeys: (keyof T)[]
  groupBy?: (item: T) => string
  onSelect?: (item: T | undefined) => void
})
```

---

## Implementation Plan

### Task 4.1: CommandProvider Context

**Create**: `src/tui/context/command.tsx`

```typescript
import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useMemo, 
  useEffect 
} from 'react'

export interface CommandOption {
  id: string
  title: string
  description?: string
  category?: string
  keybind?: string
  slash?: string
  suggested?: boolean
  disabled?: boolean
  onSelect?: (source?: 'palette' | 'keybind' | 'slash') => void
  onHighlight?: () => (() => void) | void
}

interface CommandRegistration {
  id: string
  getOptions: () => CommandOption[]
}

interface CommandContextValue {
  register: (id: string, getOptions: () => CommandOption[]) => () => void
  unregister: (id: string) => void
  trigger: (commandId: string, source?: 'palette' | 'keybind' | 'slash') => void
  show: () => void
  hide: () => void
  visible: boolean
  options: CommandOption[]
}

const CommandContext = createContext<CommandContextValue | null>(null)

export function CommandProvider({ children }) {
  const [registrations, setRegistrations] = useState<CommandRegistration[]>([])
  const [visible, setVisible] = useState(false)
  
  // Collect all command options from registrations
  const options = useMemo(() => {
    const seen = new Set<string>()
    const all: CommandOption[] = []
    
    for (const reg of registrations) {
      for (const opt of reg.getOptions()) {
        if (seen.has(opt.id)) continue
        seen.add(opt.id)
        all.push(opt)
      }
    }
    
    // Add suggested commands at top
    const suggested = all.filter(x => x.suggested && !x.disabled)
    
    return [
      ...suggested.map(x => ({
        ...x,
        id: 'suggested.' + x.id,
        category: 'Suggested'
      })),
      ...all
    ]
  }, [registrations])
  
  const register = useCallback((id: string, getOptions: () => CommandOption[]) => {
    setRegistrations(prev => [...prev, { id, getOptions }])
    
    // Return unregister function
    return () => {
      setRegistrations(prev => prev.filter(r => r.id !== id))
    }
  }, [])
  
  const unregister = useCallback((id: string) => {
    setRegistrations(prev => prev.filter(r => r.id !== id))
  }, [])
  
  const trigger = useCallback((commandId: string, source?: 'palette' | 'keybind' | 'slash') => {
    // Handle suggested.* prefix
    const normalizedId = commandId.startsWith('suggested.') 
      ? commandId.slice(10) 
      : commandId
    
    const option = options.find(o => 
      o.id === commandId || o.id === normalizedId || o.id === 'suggested.' + normalizedId
    )
    
    if (option && !option.disabled) {
      option.onSelect?.(source)
    }
  }, [options])
  
  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])
  
  return (
    <CommandContext.Provider value={{
      register,
      unregister,
      trigger,
      show,
      hide,
      visible,
      options
    }}>
      {children}
    </CommandContext.Provider>
  )
}

export function useCommand() {
  const context = useContext(CommandContext)
  if (!context) {
    throw new Error('useCommand must be used within CommandProvider')
  }
  return context
}

// Hook for components to register their commands
export function useCommandRegistration(
  id: string,
  getOptions: () => CommandOption[],
  deps: any[] = []
) {
  const command = useCommand()
  
  useEffect(() => {
    return command.register(id, getOptions)
  }, [id, ...deps])
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 4.2: Dynamic Command Registration

**Usage Example**:

```typescript
// src/tui/routes/session/index.tsx
function Session({ sessionID }) {
  const command = useCommand()
  const session = useSession(sessionID)
  
  // Register session-specific commands
  useCommandRegistration('session-commands', () => [
    {
      id: 'session.fork',
      title: 'Fork Session',
      description: 'Create a new branch from this point',
      category: 'Session',
      keybind: 'ctrl+shift+f',
      onSelect: () => forkSession(sessionID)
    },
    {
      id: 'session.export',
      title: 'Export Session',
      description: 'Export conversation as markdown',
      category: 'Session',
      onSelect: () => exportSession(sessionID)
    },
    {
      id: 'session.delete',
      title: 'Delete Session',
      description: 'Permanently delete this session',
      category: 'Session',
      disabled: session.isActive,
      onSelect: () => deleteSession(sessionID)
    }
  ], [sessionID, session.isActive])
}

// src/tui/app.tsx
function App() {
  // Register global commands
  useCommandRegistration('global-commands', () => [
    {
      id: 'session.new',
      title: 'New Session',
      keybind: 'ctrl+n',
      suggested: true,
      category: 'Session',
      onSelect: () => navigate('/new')
    },
    {
      id: 'model.list',
      title: 'Switch Model',
      keybind: 'ctrl+m',
      suggested: true,
      category: 'Agent',
      onSelect: () => showModelDialog()
    },
    {
      id: 'agent.list',
      title: 'Switch Agent',
      keybind: 'ctrl+a',
      category: 'Agent',
      onSelect: () => showAgentDialog()
    },
    {
      id: 'theme.switch',
      title: 'Switch Theme',
      category: 'System',
      onSelect: () => showThemeDialog()
    },
    {
      id: 'app.exit',
      title: 'Exit',
      keybind: 'ctrl+d',
      category: 'System',
      onSelect: () => exit()
    }
  ])
}
```

**Complexity**: Low
**Duration**: 0.5 days

---

### Task 4.3: useFilteredList Hook

**Create**: `src/tui/hooks/useFilteredList.ts`

```typescript
import { useState, useMemo, useCallback, useEffect } from 'react'
import Fuse from 'fuse.js'

interface FilteredListOptions<T> {
  items: T[] | (() => T[]) | ((query: string) => Promise<T[]>)
  key: (item: T | undefined) => string
  filterKeys: (keyof T)[]
  groupBy?: (item: T) => string
  onSelect?: (item: T | undefined) => void
  onHighlight?: (item: T | undefined) => void
  debounceMs?: number
}

interface FilteredListResult<T> {
  // Flat list of filtered items
  flat: T[]
  // Grouped items (if groupBy provided)
  grouped: Map<string, T[]>
  // Currently active/highlighted item key
  active: string | null
  // Set active item
  setActive: (key: string | null) => void
  // Input handler for search
  onInput: (query: string) => void
  // Keyboard handler for navigation
  onKeyDown: (event: KeyEvent) => boolean
  // Select currently active item
  select: () => void
  // Reset state
  reset: () => void
  // Current query
  query: string
  // Loading state (for async items)
  loading: boolean
}

export function useFilteredList<T>(options: FilteredListOptions<T>): FilteredListResult<T> {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [asyncItems, setAsyncItems] = useState<T[] | null>(null)
  
  // Resolve items (handle sync/async)
  const resolvedItems = useMemo(() => {
    if (asyncItems !== null) return asyncItems
    if (typeof options.items === 'function') {
      const result = (options.items as () => T[])()
      return Array.isArray(result) ? result : []
    }
    return options.items as T[]
  }, [options.items, asyncItems])
  
  // Setup Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(resolvedItems, {
      keys: options.filterKeys as string[],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true
    })
  }, [resolvedItems, options.filterKeys])
  
  // Filter items
  const flat = useMemo(() => {
    if (!query) return resolvedItems
    
    const results = fuse.search(query)
    return results.map(r => r.item)
  }, [query, fuse, resolvedItems])
  
  // Group items
  const grouped = useMemo(() => {
    if (!options.groupBy) return new Map()
    
    const groups = new Map<string, T[]>()
    for (const item of flat) {
      const group = options.groupBy(item)
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(item)
    }
    return groups
  }, [flat, options.groupBy])
  
  // Auto-select first item when list changes
  useEffect(() => {
    if (flat.length > 0) {
      setActive(options.key(flat[0]))
    } else {
      setActive(null)
    }
  }, [flat, options.key])
  
  // Call onHighlight when active changes
  useEffect(() => {
    if (!options.onHighlight) return
    
    const item = flat.find(i => options.key(i) === active)
    options.onHighlight(item)
  }, [active, flat, options.key, options.onHighlight])
  
  // Handle async items
  const onInput = useCallback(async (newQuery: string) => {
    setQuery(newQuery)
    
    // Check if items is an async function
    if (typeof options.items === 'function' && 
        options.items.constructor.name === 'AsyncFunction') {
      setLoading(true)
      try {
        const items = await (options.items as (q: string) => Promise<T[]>)(newQuery)
        setAsyncItems(items)
      } finally {
        setLoading(false)
      }
    }
  }, [options.items])
  
  // Keyboard navigation
  const onKeyDown = useCallback((event: KeyEvent): boolean => {
    const keys = flat.map(i => options.key(i))
    const currentIndex = active ? keys.indexOf(active) : -1
    
    if (event.key === 'ArrowDown' || (event.ctrl && event.key === 'n')) {
      event.preventDefault?.()
      const nextIndex = currentIndex < keys.length - 1 ? currentIndex + 1 : 0
      setActive(keys[nextIndex])
      return true
    }
    
    if (event.key === 'ArrowUp' || (event.ctrl && event.key === 'p')) {
      event.preventDefault?.()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : keys.length - 1
      setActive(keys[prevIndex])
      return true
    }
    
    if (event.key === 'Enter') {
      event.preventDefault?.()
      select()
      return true
    }
    
    if (event.key === 'Escape') {
      event.preventDefault?.()
      reset()
      return true
    }
    
    return false
  }, [flat, active, options.key])
  
  const select = useCallback(() => {
    const item = flat.find(i => options.key(i) === active)
    options.onSelect?.(item)
  }, [active, flat, options.key, options.onSelect])
  
  const reset = useCallback(() => {
    setQuery('')
    setActive(null)
    setAsyncItems(null)
  }, [])
  
  return {
    flat,
    grouped,
    active,
    setActive,
    onInput,
    onKeyDown,
    select,
    reset,
    query,
    loading
  }
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 4.4: Fuzzy Search Algorithm

The `useFilteredList` hook uses Fuse.js for fuzzy search. Additional custom scoring can be added:

```typescript
// src/tui/utils/fuzzy.ts

interface FuzzyOptions {
  threshold?: number  // 0.0 = exact match, 1.0 = match anything
  distance?: number   // Max distance between matched characters
  ignoreCase?: boolean
}

export function fuzzyMatch(
  text: string, 
  query: string, 
  options: FuzzyOptions = {}
): { score: number, matches: [number, number][] } | null {
  const { 
    threshold = 0.4, 
    distance = 100, 
    ignoreCase = true 
  } = options
  
  const normalizedText = ignoreCase ? text.toLowerCase() : text
  const normalizedQuery = ignoreCase ? query.toLowerCase() : query
  
  // Empty query matches everything
  if (!normalizedQuery) {
    return { score: 1, matches: [] }
  }
  
  // Exact substring match gets highest score
  const exactIndex = normalizedText.indexOf(normalizedQuery)
  if (exactIndex !== -1) {
    return {
      score: 1,
      matches: [[exactIndex, exactIndex + normalizedQuery.length - 1]]
    }
  }
  
  // Fuzzy matching
  let queryIdx = 0
  let textIdx = 0
  const matches: [number, number][] = []
  let matchStart = -1
  
  while (queryIdx < normalizedQuery.length && textIdx < normalizedText.length) {
    if (normalizedQuery[queryIdx] === normalizedText[textIdx]) {
      if (matchStart === -1) matchStart = textIdx
      queryIdx++
    } else if (matchStart !== -1) {
      matches.push([matchStart, textIdx - 1])
      matchStart = -1
    }
    textIdx++
  }
  
  // Complete remaining match
  if (matchStart !== -1) {
    matches.push([matchStart, textIdx - 1])
  }
  
  // Check if all query characters were found
  if (queryIdx < normalizedQuery.length) {
    return null
  }
  
  // Calculate score based on match quality
  const consecutiveBonus = matches.reduce((sum, [start, end]) => 
    sum + (end - start + 1), 0) / normalizedQuery.length
  
  const positionBonus = 1 - (matches[0]?.[0] ?? normalizedText.length) / normalizedText.length
  
  const score = (consecutiveBonus * 0.7 + positionBonus * 0.3)
  
  if (score < threshold) return null
  
  return { score, matches }
}

// Highlight matched portions
export function highlightMatches(
  text: string, 
  matches: [number, number][]
): { text: string, highlighted: boolean }[] {
  if (matches.length === 0) {
    return [{ text, highlighted: false }]
  }
  
  const result: { text: string, highlighted: boolean }[] = []
  let lastEnd = 0
  
  for (const [start, end] of matches) {
    if (start > lastEnd) {
      result.push({ text: text.slice(lastEnd, start), highlighted: false })
    }
    result.push({ text: text.slice(start, end + 1), highlighted: true })
    lastEnd = end + 1
  }
  
  if (lastEnd < text.length) {
    result.push({ text: text.slice(lastEnd), highlighted: false })
  }
  
  return result
}
```

**Complexity**: Medium
**Duration**: 0.5 days

---

### Task 4.5: Updated Command Palette UI

**Modify**: `src/tui/ui/CommandPalette.tsx`

```typescript
import { useCommand } from '../context/command'
import { useFilteredList, highlightMatches } from '../hooks/useFilteredList'
import { useFocusTrap } from '../hooks/useFocusTrap'

export function CommandPalette() {
  const command = useCommand()
  const focusTrap = useFocusTrap({ active: command.visible, returnFocus: true })
  
  const {
    flat,
    grouped,
    active,
    setActive,
    onInput,
    onKeyDown,
    select,
    reset,
    query
  } = useFilteredList({
    items: command.options.filter(o => !o.disabled),
    key: o => o?.id ?? '',
    filterKeys: ['title', 'description', 'category'],
    groupBy: o => o.category ?? '',
    onSelect: (option) => {
      if (option) {
        command.hide()
        command.trigger(option.id, 'palette')
      }
    }
  })
  
  useInput((input, key) => {
    if (key.escape) {
      command.hide()
      return
    }
    
    onKeyDown({ key: input, ...key })
  })
  
  if (!command.visible) return null
  
  return (
    <Box
      ref={focusTrap.containerRef}
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={60}
    >
      {/* Search input */}
      <Box marginBottom={1}>
        <Text color="cyan">&gt; </Text>
        <TextInput
          value={query}
          onChange={onInput}
          placeholder="Search commands..."
          focus={true}
        />
      </Box>
      
      {/* Results */}
      <Box flexDirection="column" maxHeight={15} overflow="hidden">
        {flat.length === 0 ? (
          <Text color="gray">No commands found</Text>
        ) : (
          // Group by category
          Array.from(grouped.entries()).map(([category, items]) => (
            <Box key={category} flexDirection="column">
              {category && (
                <Text color="gray" dimColor>{category}</Text>
              )}
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  option={item}
                  isActive={active === item.id}
                  query={query}
                  onHover={() => setActive(item.id)}
                  onSelect={() => select()}
                />
              ))}
            </Box>
          ))
        )}
      </Box>
      
      {/* Footer hints */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray">
          <Text color="white">Enter</Text> select  
          <Text color="white">Esc</Text> close
        </Text>
        <Text color="gray">{flat.length} commands</Text>
      </Box>
    </Box>
  )
}

function CommandItem({ option, isActive, query, onHover, onSelect }) {
  const titleParts = highlightMatches(option.title, 
    fuzzyMatch(option.title, query)?.matches ?? []
  )
  
  return (
    <Box
      paddingX={1}
      backgroundColor={isActive ? 'blue' : undefined}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <Box flexGrow={1}>
        <Text>
          {titleParts.map((part, i) => (
            <Text key={i} bold={part.highlighted} color={part.highlighted ? 'yellow' : undefined}>
              {part.text}
            </Text>
          ))}
        </Text>
        {option.description && (
          <Text color="gray"> - {option.description}</Text>
        )}
      </Box>
      {option.keybind && (
        <Text color="gray">{formatKeybind(option.keybind)}</Text>
      )}
    </Box>
  )
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

## Testing Strategy

### Unit Tests

```typescript
// tests/command/context.test.ts
describe('CommandProvider', () => {
  it('registers commands dynamically', () => {
    const { result } = renderHook(() => useCommand(), {
      wrapper: CommandProvider
    })
    
    act(() => {
      result.current.register('test', () => [
        { id: 'test.cmd', title: 'Test Command', onSelect: jest.fn() }
      ])
    })
    
    expect(result.current.options.find(o => o.id === 'test.cmd')).toBeDefined()
  })
  
  it('triggers commands by id', () => {
    const onSelect = jest.fn()
    const { result } = renderHook(() => useCommand(), {
      wrapper: CommandProvider
    })
    
    act(() => {
      result.current.register('test', () => [
        { id: 'test.cmd', title: 'Test', onSelect }
      ])
    })
    
    act(() => {
      result.current.trigger('test.cmd', 'palette')
    })
    
    expect(onSelect).toHaveBeenCalledWith('palette')
  })
})

// tests/hooks/useFilteredList.test.ts
describe('useFilteredList', () => {
  const items = [
    { id: '1', name: 'New Session', category: 'Session' },
    { id: '2', name: 'New File', category: 'File' },
    { id: '3', name: 'Select Model', category: 'Agent' }
  ]
  
  it('filters items by query', () => {
    const { result } = renderHook(() => useFilteredList({
      items,
      key: i => i?.id ?? '',
      filterKeys: ['name']
    }))
    
    act(() => {
      result.current.onInput('new')
    })
    
    expect(result.current.flat).toHaveLength(2)
  })
  
  it('groups items by category', () => {
    const { result } = renderHook(() => useFilteredList({
      items,
      key: i => i?.id ?? '',
      filterKeys: ['name'],
      groupBy: i => i.category
    }))
    
    expect(result.current.grouped.get('Session')).toHaveLength(1)
    expect(result.current.grouped.get('File')).toHaveLength(1)
  })
  
  it('handles keyboard navigation', () => {
    const { result } = renderHook(() => useFilteredList({
      items,
      key: i => i?.id ?? '',
      filterKeys: ['name']
    }))
    
    expect(result.current.active).toBe('1') // First item
    
    act(() => {
      result.current.onKeyDown({ key: 'ArrowDown' })
    })
    
    expect(result.current.active).toBe('2') // Second item
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| C1 | Dynamic registration works | Components can add commands |
| C2 | Commands cleanup on unmount | No stale commands |
| C3 | Fuzzy search filters correctly | "nsess" finds "New Session" |
| C4 | Keyboard navigation works | Arrow keys change selection |
| C5 | Enter selects command | Command executes on Enter |
| C6 | Escape closes palette | Modal closes, focus returns |
| C7 | Keybinds display correctly | Shows formatted shortcuts |
| C8 | Categories group correctly | Items grouped by category |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/tui/context/command.tsx` | CREATE | Command provider context |
| `src/tui/hooks/useFilteredList.ts` | CREATE | Generic filtered list |
| `src/tui/utils/fuzzy.ts` | CREATE | Fuzzy search utilities |
| `src/tui/ui/CommandPalette.tsx` | MODIFY | Use new context/hooks |
| `src/tui/app.tsx` | MODIFY | Wrap with CommandProvider |
| `src/tui/routes/session/*.tsx` | MODIFY | Register session commands |

---

**Next Document**: [05-TUI-COMPONENT-PARITY.md](./05-TUI-COMPONENT-PARITY.md)

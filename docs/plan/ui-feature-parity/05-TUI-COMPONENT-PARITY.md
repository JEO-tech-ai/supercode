# Phase 5: TUI Component Parity

> **Priority**: MEDIUM
> **Estimated Duration**: 1.5 weeks
> **Dependencies**: Phase 2 (File handling), Phase 4 (Command palette)

---

## Overview

TUI 컴포넌트를 OpenCode 수준으로 개선합니다. Extmark/Pill 렌더링, 고급 프롬프트 입력, Stash/Draft 시스템, 세션 타임라인, 향상된 자동완성을 구현합니다.

---

## Current State Analysis

### SuperCode TUI Components

| Component | Current State | Gap |
|-----------|--------------|-----|
| AdvancedPrompt | Basic text with @/# detection | No extmarks, no rich content |
| Autocomplete | Simple list dropdown | No fuzzy, no async loading |
| MessageList | Basic message rendering | No timeline, no navigation |
| Dialog | Modal with focus | No unified system |
| Toast | Notification system | OK (matches OpenCode) |

### OpenCode TUI Components

**Extmark System** (`prompt/index.tsx`):
- Virtual text placeholders that render differently from actual content
- Used for file references, agent mentions, pasted content summaries
- Maintains cursor position separate from visual position

**Stash System** (`prompt/stash.tsx`):
- Save drafts mid-composition
- Multiple stash entries
- Pop/list operations

**Session Timeline** (`routes/session/dialog-timeline.tsx`):
- Visual history of session states
- Fork from any point
- Navigation between states

---

## Implementation Plan

### Task 5.1: Extmark/Pill Rendering

**Create**: `src/tui/component/prompt/Extmark.tsx`

```typescript
import { Box, Text } from 'ink'

export interface ExtmarkData {
  id: string
  type: 'file' | 'agent' | 'paste'
  start: number
  end: number
  displayText: string
  actualText?: string  // For paste: full content
  metadata?: {
    path?: string      // For file
    name?: string      // For agent
    lines?: number     // For paste
  }
}

interface ExtmarkProps {
  data: ExtmarkData
  onRemove?: () => void
}

export function Extmark({ data, onRemove }: ExtmarkProps) {
  const colors = {
    file: 'blue',
    agent: 'magenta',
    paste: 'green'
  }
  
  const icons = {
    file: '@',
    agent: '@',
    paste: '[]'
  }
  
  return (
    <Box>
      <Text 
        color={colors[data.type]}
        backgroundColor="gray"
        dimColor
      >
        {' '}{data.displayText}{' '}
      </Text>
    </Box>
  )
}

// Extmark manager for the prompt
export class ExtmarkManager {
  private extmarks: Map<string, ExtmarkData> = new Map()
  private counter = 0
  
  create(data: Omit<ExtmarkData, 'id'>): string {
    const id = `extmark-${++this.counter}`
    this.extmarks.set(id, { ...data, id })
    return id
  }
  
  update(id: string, updates: Partial<ExtmarkData>): void {
    const extmark = this.extmarks.get(id)
    if (extmark) {
      this.extmarks.set(id, { ...extmark, ...updates })
    }
  }
  
  remove(id: string): void {
    this.extmarks.delete(id)
  }
  
  clear(): void {
    this.extmarks.clear()
  }
  
  getAll(): ExtmarkData[] {
    return Array.from(this.extmarks.values())
  }
  
  getByType(type: ExtmarkData['type']): ExtmarkData[] {
    return this.getAll().filter(e => e.type === type)
  }
  
  // Adjust positions when text changes
  adjustPositions(changeStart: number, delta: number): void {
    for (const extmark of this.extmarks.values()) {
      if (extmark.start >= changeStart) {
        extmark.start += delta
        extmark.end += delta
      } else if (extmark.end > changeStart) {
        extmark.end += delta
      }
    }
  }
  
  // Get extmark at position (for deletion handling)
  getAtPosition(position: number): ExtmarkData | undefined {
    for (const extmark of this.extmarks.values()) {
      if (position >= extmark.start && position <= extmark.end) {
        return extmark
      }
    }
    return undefined
  }
}
```

**Integration with AdvancedPrompt**:

```typescript
// src/tui/component/prompt/AdvancedPrompt.tsx
export function AdvancedPrompt() {
  const [text, setText] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const extmarkManager = useRef(new ExtmarkManager())
  
  // Render text with extmarks
  const renderContent = useMemo(() => {
    const extmarks = extmarkManager.current.getAll()
      .sort((a, b) => a.start - b.start)
    
    const parts: JSX.Element[] = []
    let lastEnd = 0
    
    for (const extmark of extmarks) {
      // Text before extmark
      if (extmark.start > lastEnd) {
        parts.push(
          <Text key={`text-${lastEnd}`}>
            {text.slice(lastEnd, extmark.start)}
          </Text>
        )
      }
      
      // Extmark (pill)
      parts.push(
        <Extmark 
          key={extmark.id} 
          data={extmark}
          onRemove={() => handleExtmarkRemove(extmark.id)}
        />
      )
      
      lastEnd = extmark.end
    }
    
    // Remaining text
    if (lastEnd < text.length) {
      parts.push(
        <Text key={`text-${lastEnd}`}>
          {text.slice(lastEnd)}
        </Text>
      )
    }
    
    return parts
  }, [text, extmarkManager.current.getAll()])
  
  // Handle file reference (@path)
  const handleFileReference = (path: string, startPos: number) => {
    const displayText = `@${path}`
    extmarkManager.current.create({
      type: 'file',
      start: startPos,
      end: startPos + displayText.length,
      displayText,
      metadata: { path }
    })
  }
  
  // Handle paste summary
  const handleLargePaste = (content: string, startPos: number) => {
    const lines = content.split('\n').length
    const displayText = `[Pasted ~${lines} lines]`
    const id = extmarkManager.current.create({
      type: 'paste',
      start: startPos,
      end: startPos + displayText.length,
      displayText,
      actualText: content,
      metadata: { lines }
    })
    
    // Replace pasted text with display text
    setText(prev => 
      prev.slice(0, startPos) + displayText + prev.slice(startPos + content.length)
    )
  }
  
  return (
    <Box flexDirection="column">
      <Box>
        {renderContent}
        <Cursor position={cursorPosition} />
      </Box>
    </Box>
  )
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 5.2: Stash/Draft System

**Create**: `src/tui/context/stash.tsx`

```typescript
import { createContext, useContext, useState, useCallback } from 'react'

export interface StashEntry {
  id: string
  input: string
  parts: ContentPart[]
  mode: 'normal' | 'shell'
  timestamp: number
}

interface StashContextValue {
  entries: StashEntry[]
  push: (entry: Omit<StashEntry, 'id' | 'timestamp'>) => void
  pop: () => StashEntry | undefined
  remove: (id: string) => void
  clear: () => void
  list: () => StashEntry[]
}

const StashContext = createContext<StashContextValue | null>(null)

const MAX_STASH_ENTRIES = 20

export function StashProvider({ children }) {
  const [entries, setEntries] = useState<StashEntry[]>([])
  
  const push = useCallback((entry: Omit<StashEntry, 'id' | 'timestamp'>) => {
    const newEntry: StashEntry = {
      ...entry,
      id: `stash-${Date.now()}`,
      timestamp: Date.now()
    }
    
    setEntries(prev => [newEntry, ...prev].slice(0, MAX_STASH_ENTRIES))
  }, [])
  
  const pop = useCallback(() => {
    let popped: StashEntry | undefined
    setEntries(prev => {
      if (prev.length === 0) return prev
      popped = prev[0]
      return prev.slice(1)
    })
    return popped
  }, [])
  
  const remove = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])
  
  const clear = useCallback(() => {
    setEntries([])
  }, [])
  
  const list = useCallback(() => entries, [entries])
  
  return (
    <StashContext.Provider value={{ entries, push, pop, remove, clear, list }}>
      {children}
    </StashContext.Provider>
  )
}

export function useStash() {
  const context = useContext(StashContext)
  if (!context) throw new Error('useStash must be used within StashProvider')
  return context
}
```

**Create**: `src/tui/component/dialog-stash.tsx`

```typescript
import { useStash } from '../context/stash'
import { useFilteredList } from '../hooks/useFilteredList'
import { formatRelativeTime } from '../utils/time'

interface DialogStashProps {
  onSelect: (entry: StashEntry) => void
  onClose: () => void
}

export function DialogStash({ onSelect, onClose }: DialogStashProps) {
  const stash = useStash()
  
  const { flat, active, setActive, onKeyDown } = useFilteredList({
    items: stash.entries,
    key: e => e?.id ?? '',
    filterKeys: ['input'],
    onSelect: (entry) => {
      if (entry) {
        onSelect(entry)
        stash.remove(entry.id)
        onClose()
      }
    }
  })
  
  useInput((input, key) => {
    if (key.escape) {
      onClose()
      return
    }
    
    if (key.delete && active) {
      stash.remove(active)
      return
    }
    
    onKeyDown({ key: input, ...key })
  })
  
  if (flat.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text color="gray">No stashed prompts</Text>
      </Box>
    )
  }
  
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Stashed Prompts</Text>
      <Text color="gray" dimColor>
        Enter to restore, Delete to remove, Esc to close
      </Text>
      
      <Box flexDirection="column" marginTop={1}>
        {flat.map(entry => (
          <Box
            key={entry.id}
            backgroundColor={active === entry.id ? 'blue' : undefined}
            paddingX={1}
          >
            <Box flexGrow={1}>
              <Text>
                {entry.mode === 'shell' && <Text color="yellow">! </Text>}
                {truncate(entry.input, 50)}
              </Text>
            </Box>
            <Text color="gray">{formatRelativeTime(entry.timestamp)}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 5.3: Prompt History

**Create**: `src/tui/component/prompt/history.tsx`

```typescript
import { createContext, useContext, useState, useCallback, useRef } from 'react'

export interface PromptHistoryEntry {
  input: string
  parts: ContentPart[]
  mode: 'normal' | 'shell'
}

interface PromptHistoryContextValue {
  entries: PromptHistoryEntry[]
  append: (entry: PromptHistoryEntry) => void
  move: (direction: -1 | 1, currentInput: string) => PromptHistoryEntry | undefined
  reset: () => void
}

const PromptHistoryContext = createContext<PromptHistoryContextValue | null>(null)

const MAX_HISTORY = 100

export function PromptHistoryProvider({ children }) {
  const [entries, setEntries] = useState<PromptHistoryEntry[]>([])
  const indexRef = useRef(-1)
  const savedInputRef = useRef<string>('')
  
  const append = useCallback((entry: PromptHistoryEntry) => {
    // Don't add empty or duplicate entries
    if (!entry.input.trim()) return
    
    setEntries(prev => {
      // Check for duplicate
      if (prev[0]?.input === entry.input) return prev
      return [entry, ...prev].slice(0, MAX_HISTORY)
    })
    
    // Reset navigation
    indexRef.current = -1
    savedInputRef.current = ''
  }, [])
  
  const move = useCallback((direction: -1 | 1, currentInput: string) => {
    if (entries.length === 0) return undefined
    
    // Save current input when starting navigation
    if (indexRef.current === -1 && direction === -1) {
      savedInputRef.current = currentInput
    }
    
    const newIndex = indexRef.current + (direction === -1 ? 1 : -1)
    
    // Going back to current input
    if (newIndex < 0) {
      indexRef.current = -1
      return { input: savedInputRef.current, parts: [], mode: 'normal' as const }
    }
    
    // Beyond history
    if (newIndex >= entries.length) {
      return undefined
    }
    
    indexRef.current = newIndex
    return entries[newIndex]
  }, [entries])
  
  const reset = useCallback(() => {
    indexRef.current = -1
    savedInputRef.current = ''
  }, [])
  
  return (
    <PromptHistoryContext.Provider value={{ entries, append, move, reset }}>
      {children}
    </PromptHistoryContext.Provider>
  )
}

export function usePromptHistory() {
  const context = useContext(PromptHistoryContext)
  if (!context) throw new Error('usePromptHistory must be within PromptHistoryProvider')
  return context
}
```

**Integration**:

```typescript
// In AdvancedPrompt.tsx
const history = usePromptHistory()

useInput((input, key) => {
  // Arrow up: previous history
  if (key.upArrow && cursorPosition === 0) {
    const entry = history.move(-1, text)
    if (entry) {
      setText(entry.input)
      setMode(entry.mode)
      restoreExtmarks(entry.parts)
    }
    return
  }
  
  // Arrow down: next history
  if (key.downArrow && cursorPosition === text.length) {
    const entry = history.move(1, text)
    if (entry) {
      setText(entry.input)
      setMode(entry.mode)
      restoreExtmarks(entry.parts)
    }
    return
  }
})

// On submit
const handleSubmit = () => {
  history.append({ input: text, parts: getExtmarkParts(), mode })
  // ... rest of submit logic
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 5.4: Session Timeline Dialog

**Create**: `src/tui/component/dialog-timeline.tsx`

```typescript
import { useSession } from '../hooks/useSession'
import { formatRelativeTime } from '../utils/time'

interface TimelineEntry {
  id: string
  type: 'user' | 'assistant' | 'tool'
  summary: string
  timestamp: number
  tokens?: number
}

interface DialogTimelineProps {
  sessionID: string
  onFork: (messageID: string) => void
  onClose: () => void
}

export function DialogTimeline({ sessionID, onFork, onClose }: DialogTimelineProps) {
  const session = useSession(sessionID)
  const [selected, setSelected] = useState<string | null>(null)
  
  // Build timeline from messages
  const timeline = useMemo(() => {
    return session.messages.map(msg => ({
      id: msg.id,
      type: msg.role as TimelineEntry['type'],
      summary: summarizeMessage(msg),
      timestamp: msg.time.created,
      tokens: msg.usage?.totalTokens
    }))
  }, [session.messages])
  
  useInput((input, key) => {
    if (key.escape) {
      onClose()
      return
    }
    
    if (key.upArrow) {
      const idx = timeline.findIndex(e => e.id === selected)
      if (idx > 0) setSelected(timeline[idx - 1].id)
      return
    }
    
    if (key.downArrow) {
      const idx = timeline.findIndex(e => e.id === selected)
      if (idx < timeline.length - 1) setSelected(timeline[idx + 1].id)
      return
    }
    
    if (key.return && selected) {
      onFork(selected)
      onClose()
      return
    }
  })
  
  return (
    <Box flexDirection="column" borderStyle="round" padding={1} width={70}>
      <Text bold>Session Timeline</Text>
      <Text color="gray">Select a point to fork from</Text>
      
      <Box flexDirection="column" marginTop={1} maxHeight={20} overflow="hidden">
        {timeline.map((entry, index) => (
          <Box key={entry.id} flexDirection="row">
            {/* Timeline connector */}
            <Box width={3}>
              <Text color="gray">
                {index === 0 ? '?' : '?'}
              </Text>
            </Box>
            
            {/* Entry */}
            <Box
              flexGrow={1}
              backgroundColor={selected === entry.id ? 'blue' : undefined}
              paddingX={1}
            >
              <Box width={10}>
                <Text color={getTypeColor(entry.type)}>
                  {entry.type}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text>{truncate(entry.summary, 35)}</Text>
              </Box>
              <Text color="gray">{formatRelativeTime(entry.timestamp)}</Text>
            </Box>
          </Box>
        ))}
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray">
          <Text color="white">Enter</Text> fork from selected point
        </Text>
      </Box>
    </Box>
  )
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'user': return 'cyan'
    case 'assistant': return 'green'
    case 'tool': return 'yellow'
    default: return 'gray'
  }
}

function summarizeMessage(msg: Message): string {
  if (msg.role === 'user') {
    const text = msg.parts.find(p => p.type === 'text')?.text ?? ''
    return text.slice(0, 50)
  }
  if (msg.role === 'assistant') {
    const text = msg.parts.find(p => p.type === 'text')?.text ?? ''
    return text.slice(0, 50)
  }
  return 'Tool execution'
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

### Task 5.5: Enhanced Autocomplete

**Modify**: `src/tui/component/prompt/Autocomplete.tsx`

```typescript
import { useFilteredList } from '../../hooks/useFilteredList'
import { useSDK } from '../../context/sdk'

interface AutocompleteItem {
  type: 'file' | 'agent' | 'command'
  value: string
  display: string
  description?: string
  icon?: string
}

interface AutocompleteProps {
  query: string
  type: 'file' | 'agent' | 'command' | null
  onSelect: (item: AutocompleteItem) => void
  onClose: () => void
}

export function Autocomplete({ query, type, onSelect, onClose }: AutocompleteProps) {
  const sdk = useSDK()
  
  const {
    flat,
    active,
    setActive,
    onKeyDown,
    loading
  } = useFilteredList<AutocompleteItem>({
    items: async (q) => {
      if (!type) return []
      
      switch (type) {
        case 'file':
          const paths = await sdk.searchFiles(q)
          return paths.map(path => ({
            type: 'file' as const,
            value: path,
            display: path,
            icon: getFileIcon(path)
          }))
          
        case 'agent':
          const agents = sdk.getAgents()
          return agents
            .filter(a => a.name.includes(q))
            .map(a => ({
              type: 'agent' as const,
              value: a.name,
              display: `@${a.name}`,
              description: a.description
            }))
            
        case 'command':
          const commands = await sdk.getCommands()
          return commands
            .filter(c => c.name.includes(q))
            .map(c => ({
              type: 'command' as const,
              value: c.name,
              display: `/${c.name}`,
              description: c.description
            }))
      }
    },
    key: item => item?.value ?? '',
    filterKeys: ['value', 'display', 'description'],
    onSelect
  })
  
  useInput((input, key) => {
    if (key.escape) {
      onClose()
      return
    }
    
    onKeyDown({ key: input, ...key })
  })
  
  if (!type || flat.length === 0) return null
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      padding={1}
      maxHeight={10}
    >
      {loading && <Text color="gray">Loading...</Text>}
      
      {flat.slice(0, 8).map(item => (
        <Box
          key={item.value}
          backgroundColor={active === item.value ? 'blue' : undefined}
          paddingX={1}
        >
          <Text color={getItemColor(item.type)}>
            {item.icon && `${item.icon} `}
            {item.display}
          </Text>
          {item.description && (
            <Text color="gray"> - {truncate(item.description, 30)}</Text>
          )}
        </Box>
      ))}
      
      {flat.length > 8 && (
        <Text color="gray" dimColor>
          +{flat.length - 8} more
        </Text>
      )}
    </Box>
  )
}

function getItemColor(type: string): string {
  switch (type) {
    case 'file': return 'blue'
    case 'agent': return 'magenta'
    case 'command': return 'cyan'
    default: return 'white'
  }
}

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const icons: Record<string, string> = {
    ts: '?',
    tsx: '?',
    js: '?',
    json: '{}',
    md: '#',
    css: '?',
    // Add more as needed
  }
  return icons[ext ?? ''] ?? '?'
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 5.6: Subagent Dialog

**Create**: `src/tui/component/dialog-subagent.tsx`

```typescript
interface SubagentStatus {
  id: string
  name: string
  status: 'running' | 'completed' | 'error'
  progress?: number
  message?: string
  startTime: number
  endTime?: number
}

interface DialogSubagentProps {
  sessionID: string
  onClose: () => void
}

export function DialogSubagent({ sessionID, onClose }: DialogSubagentProps) {
  const [subagents, setSubagents] = useState<SubagentStatus[]>([])
  
  // Subscribe to subagent updates
  useEffect(() => {
    return subscribeToSubagents(sessionID, (update) => {
      setSubagents(prev => {
        const existing = prev.findIndex(s => s.id === update.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], ...update }
          return updated
        }
        return [...prev, update]
      })
    })
  }, [sessionID])
  
  useInput((_, key) => {
    if (key.escape) onClose()
  })
  
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Background Tasks</Text>
      
      {subagents.length === 0 ? (
        <Text color="gray">No background tasks</Text>
      ) : (
        subagents.map(agent => (
          <Box key={agent.id} flexDirection="column" marginY={1}>
            <Box>
              <Text color="cyan">{agent.name}</Text>
              <Text color={getStatusColor(agent.status)}>
                {' '}[{agent.status}]
              </Text>
            </Box>
            
            {agent.progress !== undefined && (
              <Box>
                <ProgressBar progress={agent.progress} width={40} />
                <Text color="gray"> {agent.progress}%</Text>
              </Box>
            )}
            
            {agent.message && (
              <Text color="gray" dimColor>{agent.message}</Text>
            )}
          </Box>
        ))
      )}
    </Box>
  )
}

function ProgressBar({ progress, width }: { progress: number, width: number }) {
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  
  return (
    <Text>
      <Text color="green">{'?'.repeat(filled)}</Text>
      <Text color="gray">{'?'.repeat(empty)}</Text>
    </Text>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'yellow'
    case 'completed': return 'green'
    case 'error': return 'red'
    default: return 'gray'
  }
}
```

**Complexity**: Medium
**Duration**: 1 day

---

## Testing Strategy

### Unit Tests

```typescript
// tests/component/extmark.test.ts
describe('ExtmarkManager', () => {
  it('creates extmarks with unique IDs', () => {
    const manager = new ExtmarkManager()
    const id1 = manager.create({ type: 'file', start: 0, end: 5, displayText: '@file' })
    const id2 = manager.create({ type: 'agent', start: 6, end: 10, displayText: '@agent' })
    
    expect(id1).not.toBe(id2)
    expect(manager.getAll()).toHaveLength(2)
  })
  
  it('adjusts positions on text change', () => {
    const manager = new ExtmarkManager()
    manager.create({ type: 'file', start: 10, end: 15, displayText: '@file' })
    
    // Insert 5 characters at position 5
    manager.adjustPositions(5, 5)
    
    const extmark = manager.getAll()[0]
    expect(extmark.start).toBe(15)
    expect(extmark.end).toBe(20)
  })
})

// tests/context/stash.test.ts
describe('StashProvider', () => {
  it('pushes and pops entries in LIFO order', () => {
    const { result } = renderHook(() => useStash(), { wrapper: StashProvider })
    
    act(() => {
      result.current.push({ input: 'first', parts: [], mode: 'normal' })
      result.current.push({ input: 'second', parts: [], mode: 'normal' })
    })
    
    expect(result.current.entries).toHaveLength(2)
    
    let popped
    act(() => {
      popped = result.current.pop()
    })
    
    expect(popped?.input).toBe('second')
    expect(result.current.entries).toHaveLength(1)
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| T1 | Extmarks render as pills | @file shows as colored pill |
| T2 | Paste summary works | Large paste shows "[Pasted ~N lines]" |
| T3 | Stash push/pop works | Can save and restore drafts |
| T4 | History navigation works | Up/Down cycles through history |
| T5 | Timeline shows messages | Visual representation of session |
| T6 | Fork from timeline works | Creates new session branch |
| T7 | Autocomplete is async | File search loads without blocking |
| T8 | Subagent status displays | Background tasks show progress |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/tui/component/prompt/Extmark.tsx` | CREATE | Extmark rendering |
| `src/tui/component/prompt/AdvancedPrompt.tsx` | MODIFY | Integrate extmarks |
| `src/tui/context/stash.tsx` | CREATE | Stash state management |
| `src/tui/component/dialog-stash.tsx` | CREATE | Stash list dialog |
| `src/tui/component/prompt/history.tsx` | CREATE | Prompt history |
| `src/tui/component/dialog-timeline.tsx` | CREATE | Session timeline |
| `src/tui/component/prompt/Autocomplete.tsx` | MODIFY | Enhanced async autocomplete |
| `src/tui/component/dialog-subagent.tsx` | CREATE | Background task status |

---

**Next Document**: [06-WEB-CONSOLE-UI.md](./06-WEB-CONSOLE-UI.md)

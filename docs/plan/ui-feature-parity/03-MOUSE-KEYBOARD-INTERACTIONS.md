# Phase 3: Mouse & Keyboard Interactions

> **Priority**: MEDIUM
> **Estimated Duration**: 1 week
> **Dependencies**: None

---

## Overview

고급 키보드 및 마우스 인터랙션을 구현합니다. Vim 스타일 리더 키 시스템, TUI에서의 copy-on-select, 포커스 트랩 및 복원 로직을 포함합니다.

---

## Current State Analysis

### SuperCode Implementation

**Strengths**:
- Full SGR/X10/URXVT mouse protocol support (`src/tui/hooks/useMouse.ts`)
- Centralized keybinding registry
- Vim/Emacs preset support

**Gaps**:
- No leader key system
- No copy-on-select
- No focus trap for dialogs
- No automatic focus restoration

### OpenCode Implementation

**Location**: `opencode/packages/opencode/src/cli/cmd/tui/context/keybind.tsx`

```typescript
// Leader key system (Vim-style)
const [leader, setLeader] = createSignal(false)

// When leader key pressed, enter "leader mode"
// Next keypress is interpreted as a chorded command
// e.g., Leader + n = new session, Leader + m = model select

// Copy-on-select in TUI
onMouseUp={async () => {
  const text = renderer.getSelection()?.getSelectedText()
  if (text && text.length > 0) {
    // OSC52 for terminal clipboard
    const base64 = Buffer.from(text).toString("base64")
    const osc52 = `\x1b]52;c;${base64}\x07`
    renderer.writeOut(osc52)
    
    await Clipboard.copy(text)
    toast.show({ message: "Copied to clipboard" })
    renderer.clearSelection()
  }
}

// Focus trap for dialogs
const dialogFocusTrap = {
  autofocusEl: () => firstFocusableElement,
  refocus: () => previousFocusedElement?.focus()
}
```

---

## Implementation Plan

### Task 3.1: Leader Key System

**Create**: `src/tui/hooks/useLeaderKey.ts`

```typescript
import { useState, useCallback, useEffect } from 'react'
import { useInput } from 'ink'

interface LeaderKeyConfig {
  key: string  // Default: Space or Ctrl+Space
  timeout: number  // ms before leader mode expires
  bindings: Record<string, () => void>
}

interface LeaderKeyState {
  active: boolean
  buffer: string
  timestamp: number
}

export function useLeaderKey(config: LeaderKeyConfig) {
  const [state, setState] = useState<LeaderKeyState>({
    active: false,
    buffer: '',
    timestamp: 0
  })
  
  // Reset after timeout
  useEffect(() => {
    if (!state.active) return
    
    const timer = setTimeout(() => {
      setState({ active: false, buffer: '', timestamp: 0 })
    }, config.timeout)
    
    return () => clearTimeout(timer)
  }, [state.active, state.timestamp, config.timeout])
  
  const handleInput = useCallback((input: string, key: any) => {
    // Check for leader key activation
    if (isLeaderKey(input, key, config.key)) {
      setState({
        active: true,
        buffer: '',
        timestamp: Date.now()
      })
      return true // consumed
    }
    
    // If in leader mode, check bindings
    if (state.active) {
      const newBuffer = state.buffer + input
      
      // Check exact match
      if (config.bindings[newBuffer]) {
        config.bindings[newBuffer]()
        setState({ active: false, buffer: '', timestamp: 0 })
        return true
      }
      
      // Check if prefix of any binding
      const hasPrefix = Object.keys(config.bindings).some(b => 
        b.startsWith(newBuffer)
      )
      
      if (hasPrefix) {
        setState(s => ({ ...s, buffer: newBuffer, timestamp: Date.now() }))
        return true
      }
      
      // No match, exit leader mode
      setState({ active: false, buffer: '', timestamp: 0 })
      return false
    }
    
    return false
  }, [state, config])
  
  useInput(handleInput)
  
  return {
    active: state.active,
    buffer: state.buffer,
    reset: () => setState({ active: false, buffer: '', timestamp: 0 })
  }
}

function isLeaderKey(input: string, key: any, leaderKey: string): boolean {
  if (leaderKey === 'space') return input === ' '
  if (leaderKey === 'ctrl+space') return key.ctrl && input === ' '
  if (leaderKey === 'ctrl+g') return key.ctrl && input === 'g'
  return input === leaderKey
}

// Default bindings
export const DEFAULT_LEADER_BINDINGS = {
  'n': 'session.new',
  's': 'session.list',
  'm': 'model.list',
  'a': 'agent.list',
  't': 'theme.list',
  'h': 'help.show',
  'c': 'prompt.clear',
  'p': 'command.palette',
  'q': 'app.exit'
}
```

**Integration with Context**:

```typescript
// src/tui/context/keybind.tsx
export function KeybindProvider({ children }) {
  const command = useCommand()
  
  const leaderKey = useLeaderKey({
    key: 'ctrl+space',
    timeout: 2000,
    bindings: Object.fromEntries(
      Object.entries(DEFAULT_LEADER_BINDINGS).map(([key, commandId]) => [
        key,
        () => command.trigger(commandId)
      ])
    )
  })
  
  return (
    <KeybindContext.Provider value={{ ...keybindState, leader: leaderKey }}>
      {children}
      {leaderKey.active && (
        <LeaderKeyIndicator buffer={leaderKey.buffer} />
      )}
    </KeybindContext.Provider>
  )
}

function LeaderKeyIndicator({ buffer }) {
  return (
    <Box position="absolute" bottom={0} right={0}>
      <Text backgroundColor="yellow" color="black">
        {' '} LEADER {buffer && `+ ${buffer}`} {' '}
      </Text>
    </Box>
  )
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 3.2: Copy-on-Select (TUI)

**Modify**: `src/tui/hooks/useMouse.ts`

```typescript
import { useClipboard } from './useClipboard'

interface SelectionState {
  start: { x: number, y: number } | null
  end: { x: number, y: number } | null
  text: string
}

export function useMouse(options: MouseOptions) {
  const clipboard = useClipboard()
  const [selection, setSelection] = useState<SelectionState>({
    start: null,
    end: null,
    text: ''
  })
  
  // Existing mouse protocol handling...
  
  const handleMouseUp = async (event: MouseEvent) => {
    // Get selected text from terminal buffer
    const selectedText = getSelectedText(selection.start, selection.end)
    
    if (selectedText && selectedText.length > 0) {
      // Copy to clipboard using OSC 52
      await copyWithOSC52(selectedText)
      
      // Also copy to system clipboard
      await clipboard.write(selectedText)
      
      // Show toast notification
      options.onCopy?.(selectedText)
      
      // Clear selection
      setSelection({ start: null, end: null, text: '' })
    }
    
    options.onMouseUp?.(event)
  }
  
  return {
    ...existingReturn,
    selection,
    clearSelection: () => setSelection({ start: null, end: null, text: '' })
  }
}

// OSC 52 clipboard sequence for terminal
async function copyWithOSC52(text: string) {
  const base64 = Buffer.from(text).toString('base64')
  
  // Build OSC 52 sequence
  let osc52 = `\x1b]52;c;${base64}\x07`
  
  // Handle tmux passthrough
  if (process.env.TMUX) {
    osc52 = `\x1bPtmux;\x1b${osc52}\x1b\\`
  }
  
  // Write to stdout
  process.stdout.write(osc52)
}

function getSelectedText(start: Point | null, end: Point | null): string {
  if (!start || !end) return ''
  
  // Get text from terminal buffer between start and end positions
  // This requires access to the terminal buffer/screen content
  // Implementation depends on the TUI framework being used
  
  return '' // Placeholder
}
```

**Web Console Implementation**:

```typescript
// packages/console/app/src/hooks/useCopyOnSelect.ts
import { onMount, onCleanup } from 'solid-js'
import { showToast } from '@supercoin/ui/toast'

export function useCopyOnSelect() {
  const handleMouseUp = async () => {
    const selection = window.getSelection()
    const text = selection?.toString()
    
    if (text && text.length > 0) {
      try {
        await navigator.clipboard.writeText(text)
        showToast({
          message: 'Copied to clipboard',
          variant: 'info'
        })
      } catch (error) {
        console.warn('Copy failed:', error)
      }
    }
  }
  
  onMount(() => {
    document.addEventListener('mouseup', handleMouseUp)
  })
  
  onCleanup(() => {
    document.removeEventListener('mouseup', handleMouseUp)
  })
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

### Task 3.3: Focus Trap for Dialogs

**Create**: `src/tui/hooks/useFocusTrap.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useFocus } from 'ink'

interface FocusTrapOptions {
  active: boolean
  autoFocus?: boolean
  returnFocus?: boolean
}

export function useFocusTrap(options: FocusTrapOptions) {
  const containerRef = useRef<any>(null)
  const previousFocusRef = useRef<any>(null)
  const { focus, isFocused } = useFocus({ autoFocus: false })
  
  // Store previous focus when trap activates
  useEffect(() => {
    if (options.active) {
      previousFocusRef.current = document.activeElement
      
      if (options.autoFocus && containerRef.current) {
        focus(containerRef.current)
      }
    }
  }, [options.active, options.autoFocus])
  
  // Return focus when trap deactivates
  useEffect(() => {
    return () => {
      if (options.returnFocus && previousFocusRef.current) {
        try {
          previousFocusRef.current.focus?.()
        } catch (e) {
          // Ignore if element no longer exists
        }
      }
    }
  }, [options.returnFocus])
  
  // Tab key handler to trap focus within container
  const handleTabKey = useCallback((key: any) => {
    if (!options.active || !key.tab) return false
    
    const focusableElements = getFocusableElements(containerRef.current)
    if (focusableElements.length === 0) return false
    
    const currentIndex = focusableElements.indexOf(document.activeElement)
    
    if (key.shift) {
      // Shift+Tab: go to previous
      const prevIndex = currentIndex <= 0 
        ? focusableElements.length - 1 
        : currentIndex - 1
      focusableElements[prevIndex]?.focus?.()
    } else {
      // Tab: go to next
      const nextIndex = currentIndex >= focusableElements.length - 1 
        ? 0 
        : currentIndex + 1
      focusableElements[nextIndex]?.focus?.()
    }
    
    return true // consumed
  }, [options.active])
  
  return {
    containerRef,
    handleTabKey,
    returnFocus: () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus?.()
      }
    }
  }
}

function getFocusableElements(container: any): any[] {
  if (!container) return []
  
  // In Ink/React TUI context, focusable elements are components
  // with useFocus hook. This is a simplified implementation.
  return []
}
```

**Usage in Dialog**:

```typescript
// src/tui/ui/Dialog.tsx
export function Dialog({ open, onClose, children }) {
  const focusTrap = useFocusTrap({
    active: open,
    autoFocus: true,
    returnFocus: true
  })
  
  useInput((input, key) => {
    if (key.escape) {
      focusTrap.returnFocus()
      onClose()
      return
    }
    
    focusTrap.handleTabKey(key)
  })
  
  if (!open) return null
  
  return (
    <Box ref={focusTrap.containerRef} borderStyle="round">
      {children}
    </Box>
  )
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 3.4: Focus Restoration Logic

**Create**: `src/tui/context/focus.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface FocusStackEntry {
  id: string
  element: any
  timestamp: number
}

interface FocusContextValue {
  push: (id: string, element: any) => void
  pop: (id: string) => void
  restore: () => void
  current: () => FocusStackEntry | undefined
}

const FocusContext = createContext<FocusContextValue | null>(null)

export function FocusProvider({ children }) {
  const stackRef = useRef<FocusStackEntry[]>([])
  
  const push = useCallback((id: string, element: any) => {
    stackRef.current.push({
      id,
      element,
      timestamp: Date.now()
    })
  }, [])
  
  const pop = useCallback((id: string) => {
    const index = stackRef.current.findIndex(entry => entry.id === id)
    if (index !== -1) {
      stackRef.current.splice(index, 1)
    }
  }, [])
  
  const restore = useCallback(() => {
    const entry = stackRef.current.pop()
    if (entry?.element) {
      try {
        entry.element.focus?.()
      } catch (e) {
        // Element may no longer exist
      }
    }
  }, [])
  
  const current = useCallback(() => {
    return stackRef.current[stackRef.current.length - 1]
  }, [])
  
  return (
    <FocusContext.Provider value={{ push, pop, restore, current }}>
      {children}
    </FocusContext.Provider>
  )
}

export function useFocusStack() {
  const context = useContext(FocusContext)
  if (!context) throw new Error('useFocusStack must be within FocusProvider')
  return context
}

// HOC for components that should save/restore focus
export function withFocusRestore<P extends object>(
  Component: React.ComponentType<P>,
  id: string
) {
  return function WrappedComponent(props: P) {
    const focusStack = useFocusStack()
    const elementRef = useRef<any>(null)
    
    useEffect(() => {
      // Save current focus when this component mounts
      focusStack.push(id, document.activeElement)
      
      return () => {
        // Restore focus when unmounting
        focusStack.pop(id)
        focusStack.restore()
      }
    }, [])
    
    return <Component {...props} ref={elementRef} />
  }
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 3.5: Enhanced Keybind Registry

**Modify**: `src/tui/context/keybind.tsx`

```typescript
import { createContext, useContext, useState, useMemo, useCallback } from 'react'

interface Keybind {
  id: string
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  description: string
  action: () => void
  category?: string
  enabled?: boolean
}

interface KeybindConfig {
  [id: string]: string  // e.g., { 'session.new': 'ctrl+n' }
}

// Default keybind configurations
const PRESETS = {
  default: {
    'session.new': 'ctrl+n',
    'session.list': 'ctrl+s',
    'model.list': 'ctrl+m',
    'agent.list': 'ctrl+a',
    'command.palette': 'ctrl+shift+p',
    'history.previous': 'up',
    'history.next': 'down',
    'input.submit': 'enter',
    'input.clear': 'ctrl+u',
    'input.paste': 'ctrl+v',
    'app.exit': 'ctrl+d'
  },
  vim: {
    // Vim-style with leader key
    'session.new': 'leader+n',
    'session.list': 'leader+s',
    'model.list': 'leader+m',
    'agent.list': 'leader+a',
    'command.palette': 'leader+p',
    'history.previous': 'ctrl+p',
    'history.next': 'ctrl+n',
    'input.clear': 'ctrl+c',
    'app.exit': 'leader+q'
  },
  emacs: {
    'session.new': 'ctrl+x ctrl+n',
    'session.list': 'ctrl+x ctrl+s',
    'command.palette': 'meta+x',
    'history.previous': 'ctrl+p',
    'history.next': 'ctrl+n',
    'input.clear': 'ctrl+g',
    'app.exit': 'ctrl+x ctrl+c'
  }
}

interface KeybindContextValue {
  keybinds: Keybind[]
  register: (keybind: Keybind) => void
  unregister: (id: string) => void
  match: (id: string, event: KeyEvent) => boolean
  print: (id: string) => string
  setPreset: (preset: keyof typeof PRESETS) => void
  leader: { active: boolean, buffer: string }
}

export function KeybindProvider({ children }) {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('default')
  const [customBinds, setCustomBinds] = useState<KeybindConfig>({})
  const [keybinds, setKeybinds] = useState<Keybind[]>([])
  
  // Merge preset with custom bindings
  const config = useMemo(() => ({
    ...PRESETS[preset],
    ...customBinds
  }), [preset, customBinds])
  
  const register = useCallback((keybind: Keybind) => {
    setKeybinds(prev => [...prev.filter(k => k.id !== keybind.id), keybind])
  }, [])
  
  const unregister = useCallback((id: string) => {
    setKeybinds(prev => prev.filter(k => k.id !== id))
  }, [])
  
  const match = useCallback((id: string, event: KeyEvent): boolean => {
    const keyConfig = config[id]
    if (!keyConfig) return false
    
    return parseAndMatch(keyConfig, event)
  }, [config])
  
  const print = useCallback((id: string): string => {
    const keyConfig = config[id]
    if (!keyConfig) return ''
    
    return formatKeybind(keyConfig)
  }, [config])
  
  // Leader key integration
  const leaderKey = useLeaderKey({
    key: 'ctrl+space',
    timeout: 2000,
    bindings: extractLeaderBindings(config, keybinds)
  })
  
  return (
    <KeybindContext.Provider value={{
      keybinds,
      register,
      unregister,
      match,
      print,
      setPreset,
      leader: leaderKey
    }}>
      {children}
    </KeybindContext.Provider>
  )
}

function parseAndMatch(keyConfig: string, event: KeyEvent): boolean {
  // Handle chord sequences (e.g., 'ctrl+x ctrl+n')
  const parts = keyConfig.split(' ')
  
  // For now, only handle single key combos
  if (parts.length > 1) return false
  
  const combo = parts[0]
  const modifiers = combo.split('+')
  const key = modifiers.pop()!
  
  const needsCtrl = modifiers.includes('ctrl')
  const needsAlt = modifiers.includes('alt')
  const needsShift = modifiers.includes('shift')
  const needsMeta = modifiers.includes('meta')
  
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    event.ctrl === needsCtrl &&
    event.alt === needsAlt &&
    event.shift === needsShift &&
    event.meta === needsMeta
  )
}

function formatKeybind(keyConfig: string): string {
  const isMac = process.platform === 'darwin'
  
  return keyConfig
    .replace('ctrl+', isMac ? '^' : 'Ctrl+')
    .replace('alt+', isMac ? '?' : 'Alt+')
    .replace('shift+', isMac ? '?' : 'Shift+')
    .replace('meta+', isMac ? '?' : 'Meta+')
    .replace('leader+', 'SPC ')
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

## Testing Strategy

### Unit Tests

```typescript
// tests/keyboard/leader-key.test.ts
describe('useLeaderKey', () => {
  it('activates on leader key press', () => {
    const { result } = renderHook(() => useLeaderKey({
      key: 'ctrl+space',
      timeout: 2000,
      bindings: { 'n': jest.fn() }
    }))
    
    // Simulate Ctrl+Space
    act(() => {
      result.current.handleInput(' ', { ctrl: true })
    })
    
    expect(result.current.active).toBe(true)
  })
  
  it('executes binding on key sequence', () => {
    const onNew = jest.fn()
    const { result } = renderHook(() => useLeaderKey({
      key: 'ctrl+space',
      timeout: 2000,
      bindings: { 'n': onNew }
    }))
    
    // Activate leader
    act(() => {
      result.current.handleInput(' ', { ctrl: true })
    })
    
    // Press 'n'
    act(() => {
      result.current.handleInput('n', {})
    })
    
    expect(onNew).toHaveBeenCalled()
    expect(result.current.active).toBe(false)
  })
  
  it('times out after timeout', async () => {
    jest.useFakeTimers()
    
    const { result } = renderHook(() => useLeaderKey({
      key: 'ctrl+space',
      timeout: 2000,
      bindings: { 'n': jest.fn() }
    }))
    
    act(() => {
      result.current.handleInput(' ', { ctrl: true })
    })
    
    expect(result.current.active).toBe(true)
    
    act(() => {
      jest.advanceTimersByTime(2100)
    })
    
    expect(result.current.active).toBe(false)
  })
})

// tests/mouse/copy-on-select.test.ts
describe('Copy on select', () => {
  it('copies selected text to clipboard', async () => {
    const mockClipboard = { writeText: jest.fn() }
    Object.assign(navigator, { clipboard: mockClipboard })
    
    // Simulate selection
    const selection = window.getSelection()
    // ... setup selection
    
    // Trigger mouseup
    document.dispatchEvent(new MouseEvent('mouseup'))
    
    expect(mockClipboard.writeText).toHaveBeenCalled()
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| K1 | Leader key activates | Ctrl+Space shows indicator |
| K2 | Leader sequences work | Leader+n creates new session |
| K3 | Leader timeout works | Mode exits after 2s inactivity |
| K4 | Copy-on-select (TUI) | Selected text copies to clipboard |
| K5 | Copy-on-select (Web) | Mouse selection auto-copies |
| K6 | Focus trap works | Tab cycles within dialogs |
| K7 | Focus restoration | Closing dialog returns focus |
| K8 | Preset switching | Vim/Emacs presets apply correctly |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/tui/hooks/useLeaderKey.ts` | CREATE | Leader key state machine |
| `src/tui/hooks/useFocusTrap.ts` | CREATE | Dialog focus trapping |
| `src/tui/hooks/useMouse.ts` | MODIFY | Add copy-on-select |
| `src/tui/context/keybind.tsx` | MODIFY | Enhanced registry + presets |
| `src/tui/context/focus.tsx` | CREATE | Focus stack management |
| `src/tui/ui/Dialog.tsx` | MODIFY | Integrate focus trap |
| `packages/console/app/src/hooks/useCopyOnSelect.ts` | CREATE | Web copy-on-select |

---

**Next Document**: [04-COMMAND-PALETTE-KEYBINDINGS.md](./04-COMMAND-PALETTE-KEYBINDINGS.md)

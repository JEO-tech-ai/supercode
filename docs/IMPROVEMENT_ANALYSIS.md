# SuperCode TUI Improvement Analysis

## Overview

This document analyzes the issues found in the SuperCode TUI compared to OpenCode's implementation and provides detailed solutions for each problem.

## Issue 1: Korean (CJK) Input Handling

### Problem Description

Korean input is not working correctly in the TUI. This manifests as:
- Incorrect cursor positioning when typing Korean characters
- Character display issues with multi-byte Unicode characters
- IME composition problems

### Root Cause

SuperCode's TUI uses standard JavaScript `string.length` for cursor calculations, which counts code points rather than visual character widths. Korean characters (and other CJK characters) typically have a visual width of 2 cells in terminal displays, but `string.length` counts them as 1.

**Current Implementation (supercode):**
```typescript
// FileReference.tsx - uses string indexing without width consideration
const target = relativePath.toLowerCase();
```

**OpenCode's Implementation:**
```typescript
// Uses Bun.stringWidth for accurate cursor positioning
input.cursorOffset = Bun.stringWidth(content)
const extmarkEnd = extmarkStart + Bun.stringWidth(virtualText)
```

### Solution

1. Replace all cursor position calculations with `Bun.stringWidth()` 
2. Use proper width calculation for:
   - Cursor offset positioning
   - Extmark (virtual text) boundaries
   - Text range calculations

### Files to Modify

- `src/tui/component/prompt/AdvancedPrompt.tsx`
- `src/tui/component/prompt/FileReference.tsx`
- `src/tui/component/prompt/Extmark.tsx`
- `src/tui/hooks/useClipboard.ts`

---

## Issue 2: @ File Attachment Crash (Thread Safety)

### Problem Description

The system crashes when using `@` for file attachment. The crash appears to occur in thread handling during file search operations.

### Root Cause

Multiple issues contribute to this crash:

1. **Uncontrolled Concurrent File Operations**: `useFileSearch` hook performs synchronous file system operations (`fs.readdirSync`, `fs.statSync`) without proper error boundaries or cancellation
2. **Race Conditions**: Multiple search operations can run simultaneously when typing quickly, leading to state inconsistencies
3. **Missing Abort Signals**: No mechanism to cancel in-flight operations when new searches start
4. **Uncaught Errors**: File system errors (permission denied, file not found) are silently caught but can leave state inconsistent

**Current Implementation (supercode):**
```typescript
// FileReference.tsx - synchronous operations without proper cancellation
const searchDir = (dir: string, depth: number = 0) => {
  if (depth > 6) return;
  if (results.length >= 100) return;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }); // BLOCKING!
    // ...
  } catch {
    // Silent catch - no error propagation
  }
};
```

**OpenCode's Implementation:**
```typescript
// Uses SDK-based async file search with proper cancellation
const [files] = createResource(
  () => filter(),
  async (query) => {
    const result = await sdk.client.find.files({ query: baseQuery });
    // Properly async, cancellable via SolidJS resource
  }
);
```

### Solution

1. **Add Lock Utility**: Implement read/write locks for file operations
2. **Add AsyncQueue**: Queue-based sequential processing to prevent race conditions  
3. **Add AbortController Support**: Allow cancellation of in-progress operations
4. **Async File Search**: Convert synchronous file operations to async
5. **Error Boundaries**: Proper error handling with state recovery

### Files to Modify

- `src/tui/component/prompt/FileReference.tsx`
- Create: `src/tui/utils/lock.ts`
- Create: `src/tui/utils/queue.ts`

---

## Issue 3: Line Ending Normalization

### Problem Description

Pasted content may have inconsistent line endings (`\r\n` on Windows, `\r` from some terminals) causing display issues.

### Root Cause

SuperCode doesn't normalize line endings at paste boundaries.

**OpenCode's Implementation:**
```typescript
// Normalize line endings at the boundary
const normalizedText = event.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
```

### Solution

Add line ending normalization in paste handlers.

---

## Implementation Priority

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | @ File Attachment Crash | Critical - System crash | High |
| P0 | Korean Input | High - Major UX issue | Medium |
| P1 | Line Ending Normalization | Medium - Display issues | Low |

---

## Code Changes Summary

### New Files to Create

1. **`src/tui/utils/lock.ts`** - Read/Write lock implementation
2. **`src/tui/utils/queue.ts`** - Async queue for sequential processing
3. **`src/tui/utils/string-width.ts`** - String width calculation utilities

### Files to Modify

1. **`src/tui/component/prompt/FileReference.tsx`**
   - Convert to async file search
   - Add AbortController support
   - Add proper error boundaries
   - Fix cursor width calculations

2. **`src/tui/component/prompt/AdvancedPrompt.tsx`**
   - Add line ending normalization
   - Fix cursor positioning with string width

3. **`src/tui/component/prompt/Extmark.tsx`**
   - Use string width for extmark boundaries

---

## Implementation Status (COMPLETED)

### Files Created

1. **`src/tui/utils/lock.ts`** - Read/Write lock implementation for thread-safe file operations
2. **`src/tui/utils/queue.ts`** - Async queue with debounced execution and abort support
3. **`src/tui/utils/string-width.ts`** - Unicode-aware string width calculation using Bun.stringWidth

### Files Modified

1. **`src/tui/component/prompt/FileReference.tsx`**
   - Converted from synchronous `fs.readdirSync` to async `fs/promises.readdir`
   - Added `createDebouncedAsync` for proper debouncing with abort support
   - Added `AbortController` integration for cancellation
   - Search state now includes `aborted` flag to stop in-progress operations
   - Added proper error handling throughout async operations

2. **`src/tui/component/prompt/AdvancedPrompt.tsx`**
   - Added line ending normalization: `newValue.replace(/\r\n/g, "\n").replace(/\r/g, "\n")`

3. **`src/tui/component/prompt/Extmark.tsx`**
   - Added import for `getStringWidth`
   - Updated `createFileExtmark`, `createAgentExtmark`, `createPasteExtmark`, `createURLExtmark` to use `getStringWidth()` for proper CJK character width calculation

### Key Changes Summary

| Issue | Solution | Status |
|-------|----------|--------|
| Korean input cursor issues | Implemented `getStringWidth()` utility using `Bun.stringWidth` | DONE |
| @ file attachment crash | Converted to async with AbortController and debouncing | DONE |
| Race conditions | Added `createDebouncedAsync` with proper cancellation | DONE |
| Line ending issues | Added normalization in handleChange | DONE |

---

## Testing Checklist

- [ ] Korean text input displays correctly
- [ ] Korean text cursor positions correctly
- [ ] Emoji input displays correctly
- [ ] @ autocomplete opens without crash
- [ ] File search completes without crash
- [ ] Rapid typing during @ autocomplete doesn't crash
- [ ] Pasted content with different line endings displays correctly
- [ ] Multiple concurrent @ operations don't cause race conditions

---

## References

- OpenCode TUI Implementation: `/Users/supercent/Documents/Github/opencode/packages/opencode/src/cli/cmd/tui/`
- Bun stringWidth: Native Bun function for Unicode-aware string width calculation
- OpenCode Lock utility: `/Users/supercent/Documents/Github/opencode/packages/opencode/src/util/lock.ts`
- OpenCode Queue utility: `/Users/supercent/Documents/Github/opencode/packages/opencode/src/util/queue.ts`

---

## React/TSX Optimizations (Added)

### Performance Improvements Applied

| File | Optimization | Impact |
|------|-------------|--------|
| `FileReference.tsx` | Cached regex in `matchGlob` with LRU eviction | Prevents repeated regex compilation |
| `FileReference.tsx` | Memoized `maxDisplayLen` calculation | Avoids iterating options on every render |
| `AdvancedPrompt.tsx` | Memoized `highlightColor` | Prevents object recreation |
| `AdvancedPrompt.tsx` | Memoized `hasHistory` check | Avoids array length check in render |
| `SlashCommands.tsx` | Memoized `maxNameLen` and `renderCommands` | Prevents recalculation on every render |
| `MessageList.tsx` | Wrapped `MessageItem` in `React.memo` | Prevents re-render of all messages during streaming |
| `toast.tsx` | Added timeout cleanup on unmount | Fixes memory leak from orphaned timeouts |
| `toast.tsx` | Track timeouts in ref for proper cleanup | Enables dismiss/clear to clean up timers |

### Key Patterns Applied

1. **Regex Caching**: Cache compiled regex patterns with size limits to prevent memory bloat
2. **React.memo**: Applied to list item components to prevent cascading re-renders
3. **useMemo for expensive computations**: Max length calculations, grouped data structures
4. **Proper cleanup**: All timeouts tracked and cleared on unmount/dismiss

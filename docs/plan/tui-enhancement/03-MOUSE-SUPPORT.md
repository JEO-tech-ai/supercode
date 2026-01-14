# Mouse Support Enhancement Plan

## Current Implementation

### Location
`src/tui/hooks/useMouse.ts`

### Features
- SGR mouse protocol support (`\x1b[<...m/M`)
- X10 mouse protocol support (`\x1b[M...`)
- URXVT mouse protocol support
- Button detection (left, right, middle)
- Modifier key tracking (Shift, Alt, Ctrl)
- Click, double-click, drag events
- Position tracking (x, y coordinates)
- `useFocusOnClick` for bounded click areas

### Limitations
1. **No copy-on-select** - Text selection doesn't auto-copy
2. **No scroll wheel handling** - No wheel events processed
3. **No hover states** - No mouseover effects
4. **No right-click context menu** - Right-click not utilized
5. **No drag-to-select text** - Selection not connected to clipboard

## OpenCode Comparison

| Feature | SuperCode | OpenCode |
|---------|-----------|----------|
| Click Events | Yes | Yes |
| Double-Click | Yes | Yes |
| Drag Events | Yes | Yes |
| Copy-on-Select | No | Yes (OSC 52) |
| Scroll Wheel | No | Yes |
| Right-Click Menu | No | No |
| Hover States | No | Limited |

## Enhancement Plan

### Phase 1: Copy-on-Select (Priority: HIGH)

**Goal**: Automatically copy selected text to clipboard when mouse is released.

**Implementation**:
```typescript
// src/tui/hooks/useClipboard.ts
interface ClipboardOptions {
  useOSC52?: boolean;  // Use terminal OSC 52 escape
  fallbackToNative?: boolean;  // Use pbcopy/xclip
}

export function useClipboard(options?: ClipboardOptions): {
  copy: (text: string) => Promise<boolean>;
  paste: () => Promise<string | null>;
}
```

**OSC 52 Implementation**:
```typescript
function copyViaOSC52(text: string): void {
  const base64 = Buffer.from(text).toString("base64");
  process.stdout.write(`\x1b]52;c;${base64}\x07`);
}
```

**Fallback for unsupported terminals**:
```typescript
async function copyViaNative(text: string): Promise<void> {
  const { platform } = process;
  
  if (platform === "darwin") {
    // Use pbcopy
    const proc = spawn("pbcopy");
    proc.stdin.write(text);
    proc.stdin.end();
  } else if (platform === "linux") {
    // Try xclip, then xsel, then wl-copy
    // ...
  }
}
```

**Changes Required**:
- Create `useClipboard` hook
- Integrate with `useMouse` drag events
- Track selection start/end during drag
- Copy on mouse release

### Phase 2: Scroll Wheel Support (Priority: MEDIUM)

**Goal**: Handle mouse wheel events for scrolling content.

**Wheel Event Detection**:
```typescript
// In SGR protocol, wheel events are:
// Button 64 = wheel up
// Button 65 = wheel down

function parseWheelEvent(buttonCode: number): "up" | "down" | null {
  if (buttonCode === 64) return "up";
  if (buttonCode === 65) return "down";
  return null;
}
```

**Hook Extension**:
```typescript
interface UseMouseOptions {
  // ... existing options
  onScroll?: (direction: "up" | "down", pos: MousePosition) => void;
}
```

**Changes Required**:
- Extend `useMouse` to detect wheel events
- Add `onScroll` callback option
- Integrate with scrollable components (message list, menus)

### Phase 3: Text Selection Tracking (Priority: MEDIUM)

**Goal**: Track text selection across terminal content.

**Implementation**:
```typescript
// src/tui/hooks/useTextSelection.ts
interface TextSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

export function useTextSelection(content: string[]): {
  selection: TextSelection | null;
  isSelecting: boolean;
  clearSelection: () => void;
}
```

**Visual Feedback**:
```tsx
function SelectableText({ line, lineNumber, selection }: Props) {
  const isSelected = (col: number) => {
    if (!selection) return false;
    // Check if this position is within selection range
    // ...
  };
  
  return (
    <Text>
      {line.split("").map((char, col) => (
        <Text
          key={col}
          backgroundColor={isSelected(col) ? "blue" : undefined}
          color={isSelected(col) ? "white" : undefined}
        >
          {char}
        </Text>
      ))}
    </Text>
  );
}
```

**Changes Required**:
- Create `useTextSelection` hook
- Calculate text content from terminal positions
- Apply selection styling
- Connect to clipboard

### Phase 4: Right-Click Context Menu (Priority: LOW)

**Goal**: Show context-sensitive menu on right-click.

**Implementation**:
```typescript
interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (item: ContextMenuItem) => void;
  onClose: () => void;
}

interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
}
```

**Common Menu Items**:
```typescript
const DEFAULT_MENU_ITEMS: ContextMenuItem[] = [
  { label: "Copy", icon: "📋", shortcut: "Ctrl+C", action: () => copy() },
  { label: "Paste", icon: "📥", shortcut: "Ctrl+V", action: () => paste() },
  { separator: true },
  { label: "Select All", shortcut: "Ctrl+A", action: () => selectAll() },
  { separator: true },
  { label: "Search...", icon: "🔍", action: () => openSearch() },
];
```

**Changes Required**:
- Create `ContextMenu` component
- Track right-click position
- Render menu at position
- Handle item selection

### Phase 5: Hover States (Priority: LOW)

**Goal**: Visual feedback when hovering over interactive elements.

**Challenge**: Terminal mouse tracking typically only reports button events, not pure movement. However, when mouse tracking mode `1002` (button event tracking) or `1003` (any event tracking) is enabled, we get movement reports.

**Implementation**:
```typescript
interface UseHoverOptions {
  bounds: { x: number; y: number; width: number; height: number };
  onEnter?: () => void;
  onLeave?: () => void;
}

export function useHover(options: UseHoverOptions): {
  isHovered: boolean;
}
```

**Enable Full Tracking**:
```typescript
// Enable all mouse events (including movement)
process.stdout.write("\x1b[?1003h");

// Disable on cleanup
process.stdout.write("\x1b[?1003l");
```

**Note**: Full mouse tracking increases CPU usage. Use sparingly.

## Updated useMouse Hook

```typescript
export interface UseMouseOptions {
  enabled?: boolean;
  enableDrag?: boolean;
  enableScroll?: boolean;
  enableHover?: boolean;
  onMouseDown?: (pos: MousePosition) => void;
  onMouseUp?: (pos: MousePosition) => void;
  onMouseMove?: (pos: MousePosition) => void;
  onClick?: (pos: MousePosition) => void;
  onDoubleClick?: (pos: MousePosition) => void;
  onScroll?: (direction: "up" | "down", pos: MousePosition) => void;
  onDragStart?: (pos: MousePosition) => void;
  onDrag?: (start: MousePosition, current: MousePosition) => void;
  onDragEnd?: (start: MousePosition, end: MousePosition, text?: string) => void;
}

export interface MouseState {
  position: MousePosition;
  isPressed: boolean;
  isDragging: boolean;
  lastClick: MousePosition | null;
  dragStart: MousePosition | null;
  selectedText: string | null;
}
```

## Implementation Checklist

### Phase 1: Copy-on-Select
- [ ] Create `useClipboard` hook
- [ ] Implement OSC 52 copy
- [ ] Add native fallback (pbcopy, xclip)
- [ ] Track selection during drag
- [ ] Copy on mouse release
- [ ] Add visual selection highlight

### Phase 2: Scroll Wheel
- [ ] Detect wheel events in mouse protocol
- [ ] Add `onScroll` callback
- [ ] Integrate with message list scrolling
- [ ] Integrate with menu scrolling

### Phase 3: Text Selection
- [ ] Create `useTextSelection` hook
- [ ] Map terminal coords to content
- [ ] Apply selection styling
- [ ] Connect to clipboard hook

### Phase 4: Right-Click Menu
- [ ] Create `ContextMenu` component
- [ ] Define common menu items
- [ ] Handle right-click detection
- [ ] Position menu correctly

### Phase 5: Hover States
- [ ] Enable full mouse tracking (opt-in)
- [ ] Create `useHover` hook
- [ ] Add hover styling to interactive elements

## Code Examples

### OSC 52 Clipboard

```typescript
// src/tui/hooks/useClipboard.ts
import { spawn } from "child_process";

export function useClipboard(options: ClipboardOptions = {}) {
  const { useOSC52 = true, fallbackToNative = true } = options;
  
  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (useOSC52) {
      try {
        const base64 = Buffer.from(text).toString("base64");
        process.stdout.write(`\x1b]52;c;${base64}\x07`);
        return true;
      } catch {
        if (!fallbackToNative) return false;
      }
    }
    
    // Native fallback
    return copyNative(text);
  }, [useOSC52, fallbackToNative]);
  
  const paste = useCallback(async (): Promise<string | null> => {
    // Note: OSC 52 paste is less widely supported
    // Most terminals don't allow reading clipboard for security
    return pasteNative();
  }, []);
  
  return { copy, paste };
}

async function copyNative(text: string): Promise<boolean> {
  const { platform } = process;
  
  return new Promise((resolve) => {
    let proc;
    
    if (platform === "darwin") {
      proc = spawn("pbcopy");
    } else if (platform === "linux") {
      // Try wayland first, then X11
      if (process.env.WAYLAND_DISPLAY) {
        proc = spawn("wl-copy");
      } else {
        proc = spawn("xclip", ["-selection", "clipboard"]);
      }
    } else if (platform === "win32") {
      proc = spawn("clip");
    } else {
      resolve(false);
      return;
    }
    
    proc.stdin.write(text);
    proc.stdin.end();
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}
```

### Scroll Wheel Detection

```typescript
function parseSGRMouse(data: string): MouseEvent | null {
  const match = data.match(SGR_MOUSE_REGEX);
  if (!match) return null;
  
  const buttonCode = parseInt(match[1], 10);
  const x = parseInt(match[2], 10) - 1;
  const y = parseInt(match[3], 10) - 1;
  const isRelease = match[4] === "m";
  
  // Check for scroll wheel
  if (buttonCode === 64) {
    return { type: "scroll", direction: "up", x, y };
  }
  if (buttonCode === 65) {
    return { type: "scroll", direction: "down", x, y };
  }
  
  return {
    type: isRelease ? "release" : "press",
    button: parseButton(buttonCode),
    x,
    y,
    modifiers: parseModifiers(buttonCode),
  };
}
```

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Copy-on-Select | 2 days | None |
| Phase 2: Scroll Wheel | 1 day | None |
| Phase 3: Text Selection | 3 days | Phase 1 |
| Phase 4: Right-Click Menu | 2 days | None |
| Phase 5: Hover States | 2 days | None |

**Total Estimated Time**: 1.5-2 weeks

## Terminal Compatibility Notes

| Feature | iTerm2 | Terminal.app | Alacritty | Kitty | WezTerm |
|---------|--------|--------------|-----------|-------|---------|
| SGR Mouse | Yes | Yes | Yes | Yes | Yes |
| Scroll Events | Yes | Limited | Yes | Yes | Yes |
| OSC 52 Copy | Yes | No | Yes | Yes | Yes |
| Full Tracking | Yes | Yes | Yes | Yes | Yes |

**Recommendation**: Detect terminal capabilities at startup and adapt behavior accordingly.

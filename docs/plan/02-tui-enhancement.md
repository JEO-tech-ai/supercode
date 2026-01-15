# Plan: TUI Enhancement

> **Priority**: 🟢 Medium | **Phase**: 3 | **Duration**: 1 week

---

## Objective

Enhance SuperCode's Terminal User Interface to match OpenCode's premium experience:
- Theme engine with 30+ themes
- Full mouse support
- Advanced syntax highlighting
- Split panes and scrollable areas

---

## Current State (SuperCode)

- **Framework**: React/Ink
- **Features**: Basic TUI, agent status sidebar
- **Limitations**: Basic themes, limited mouse support

## Target State (OpenCode)

- **Framework**: SolidJS/@opentui/solid
- **Features**: Premium TUI, 30+ themes, full mouse, Shiki syntax

---

## Decision Point

### Option A: Enhance React/Ink (Recommended)
- Lower risk, faster implementation
- Keep existing codebase
- Add missing features incrementally

### Option B: Migrate to SolidJS
- Higher risk, longer timeline
- Better long-term performance
- Complete rewrite required

**Recommendation**: Start with Option A, evaluate Option B for v2.0

---

## Implementation Steps (Option A)

### Step 1: Theme Engine

```typescript
// src/tui/themes/index.ts
export interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textMuted: string
    accent: string
    error: string
    warning: string
    success: string
  }
  syntax: SyntaxTheme
}

// Built-in themes
export const themes = {
  dracula: {...},
  nord: {...},
  catppuccin: {...},
  oneDark: {...},
  // ... 30+ themes
}
```

### Step 2: Syntax Highlighting

```bash
bun add shiki
```

```typescript
// src/tui/components/CodeBlock.tsx
import { getHighlighter } from 'shiki'

export function CodeBlock({ code, language }: Props) {
  const highlighter = await getHighlighter({
    themes: [currentTheme.syntax],
    langs: [language]
  })
  
  return <Box>{highlighter.codeToHtml(code, { lang: language })}</Box>
}
```

### Step 3: Mouse Support Enhancement

```typescript
// src/tui/hooks/useMouse.ts
import { useInput } from 'ink'

export function useMouse() {
  useInput((input, key) => {
    if (key.mouse) {
      // Handle mouse events
    }
  })
}
```

### Step 4: Scrollable Areas

```typescript
// src/tui/components/ScrollBox.tsx
import { Box, useInput } from 'ink'

export function ScrollBox({ children, height }: Props) {
  const [scrollOffset, setScrollOffset] = useState(0)
  
  useInput((input, key) => {
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1))
    if (key.downArrow) setScrollOffset(o => o + 1)
  })
  
  return (
    <Box height={height} overflow="hidden">
      <Box marginTop={-scrollOffset}>{children}</Box>
    </Box>
  )
}
```

---

## New Files

```
src/tui/
├── themes/
│   ├── index.ts           # Theme registry
│   ├── dracula.ts         # Dracula theme
│   ├── nord.ts            # Nord theme
│   ├── catppuccin.ts      # Catppuccin theme
│   └── ...                # 30+ themes
├── components/
│   ├── CodeBlock.tsx      # Syntax highlighted code
│   ├── ScrollBox.tsx      # Scrollable container
│   ├── SplitPane.tsx      # Split view
│   └── ThemeProvider.tsx  # Theme context
└── hooks/
    ├── useMouse.ts        # Mouse support
    ├── useTheme.ts        # Theme access
    └── useScroll.ts       # Scroll state
```

---

## Success Criteria

- [ ] 30+ themes available
- [ ] Syntax highlighting for 10+ languages
- [ ] Mouse click support
- [ ] Smooth scrolling
- [ ] Theme persistence

---

**Owner**: TBD
**Start Date**: TBD

# SuperCode TUI Enhancement Plan

## Overview

This document outlines the comprehensive plan to enhance SuperCode's TUI to match and exceed OpenCode's capabilities. Based on a detailed analysis of both codebases, we've identified key feature gaps and implementation strategies.

## Current State Analysis

### SuperCode TUI (React/Ink)
- **Slash Commands**: Well-implemented with categories, icons, and keybind hints
- **File References**: Functional with fuzzy search and glob patterns
- **Mouse Support**: Full SGR/X10/URXVT protocol support
- **Keyboard**: Centralized keybinding registry with Vim/Emacs presets
- **Input**: AdvancedPrompt with CJK character support

### OpenCode TUI (SolidJS/@opentui)
- **Leader Key System**: Vim-like transient key sequences
- **Extmark Rendering**: Rich inline reference visualization
- **Tree-Sitter**: Syntax highlighting in terminal
- **Media Paste**: Image/SVG paste to base64
- **Stash System**: Draft management
- **Copy-on-Select**: Automatic clipboard integration

## Feature Gap Summary

| Feature | SuperCode | OpenCode | Priority |
|---------|-----------|----------|----------|
| Leader Key System | No | Yes | HIGH |
| Image/Media Paste | No | Yes | HIGH |
| Copy-on-Select | No | Yes | MEDIUM |
| Stash/Draft System | No | Yes | MEDIUM |
| Extmark Rendering | Basic | Advanced | MEDIUM |
| Tree-Sitter Highlighting | No | Yes | LOW |
| Session Compaction UI | No | Yes | LOW |
| Command Palette Fuzzy | Basic | Advanced | MEDIUM |

## Implementation Phases

### Phase 1: Core Input Enhancements (Week 1-2)
1. Leader Key system implementation
2. Enhanced file reference rendering
3. Copy-on-select mouse integration

### Phase 2: Media & Draft Support (Week 2-3)
1. Image paste handling
2. SVG paste handling
3. Stash/draft system

### Phase 3: Visual Enhancements (Week 3-4)
1. Session compaction markers
2. Enhanced autocomplete UI
3. Animation improvements

### Phase 4: Advanced Features (Week 4+)
1. Tree-Sitter integration (optional)
2. Advanced command palette
3. Performance optimizations

## Success Criteria

1. **Functional Parity**: All OpenCode TUI features work in SuperCode
2. **Performance**: No degradation in input latency
3. **Compatibility**: Works with existing hooks and agents
4. **User Experience**: Intuitive and consistent with existing patterns

## Related Documents

- [01-SLASH-COMMANDS.md](./01-SLASH-COMMANDS.md) - Slash command improvements
- [02-FILE-REFERENCES.md](./02-FILE-REFERENCES.md) - File attachment features
- [03-MOUSE-SUPPORT.md](./03-MOUSE-SUPPORT.md) - Mouse interaction features
- [04-INPUT-HANDLING.md](./04-INPUT-HANDLING.md) - Keyboard/input improvements
- [05-IMPLEMENTATION-PRIORITY.md](./05-IMPLEMENTATION-PRIORITY.md) - Prioritized roadmap

## Architecture Considerations

### React/Ink vs SolidJS

SuperCode uses React/Ink while OpenCode uses SolidJS. Key differences:

| Aspect | React/Ink | SolidJS/@opentui |
|--------|-----------|------------------|
| Reactivity | Virtual DOM diffing | Fine-grained signals |
| Performance | Good with memoization | Excellent by default |
| Ecosystem | Large (ink-text-input, etc) | Limited |

**Strategy**: Adapt OpenCode patterns to React/Ink idioms rather than direct port.

### File Structure

```
src/tui/
├── component/
│   └── prompt/
│       ├── AdvancedPrompt.tsx      # Main input (enhance)
│       ├── SlashCommands.tsx       # Enhance with fuzzy
│       ├── FileReference.tsx       # Add extmark rendering
│       ├── LeaderKey.tsx           # NEW: Leader key system
│       ├── MediaPaste.tsx          # NEW: Image/SVG handling
│       └── Stash.tsx               # NEW: Draft management
├── hooks/
│   ├── useMouse.ts                 # Add copy-on-select
│   ├── useLeaderKey.ts             # NEW: Leader key hook
│   └── useClipboard.ts             # NEW: Clipboard integration
└── context/
    └── stash.tsx                   # NEW: Draft/stash context
```

## Testing Strategy

1. **Unit Tests**: Each new hook and component
2. **Integration Tests**: Prompt interactions
3. **E2E Tests**: Full workflow scenarios
4. **Manual Testing**: Real terminal environments (iTerm2, Terminal.app, alacritty)

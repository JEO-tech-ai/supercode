# File References Enhancement Plan

## Current Implementation

### Location
`src/tui/component/prompt/FileReference.tsx`

### Features
- Fuzzy file search with directory traversal (6 levels max)
- Glob pattern support (`*.ts`, `**/*.tsx`)
- Line range support (`@file.ts#10-20`)
- Agent mentions (`@explorer`, `@analyst`)
- File type icons based on extension
- File size display
- Debounced search (100ms)

### Limitations
1. **No visual rendering in textarea** - References shown as plain text
2. **No image preview** - Can't preview image references
3. **No directory content expansion** - Can't see directory contents inline
4. **Limited symbol search** - No LSP-based symbol completion
5. **No URL references** - Can't attach web URLs
6. **No MCP resource references** - Can't reference MCP resources

## OpenCode Comparison

| Feature | SuperCode | OpenCode |
|---------|-----------|----------|
| Extmark Rendering | No | Yes (inline styled blocks) |
| Image Preview | No | Yes (ASCII preview) |
| MCP Resources | No | Yes (via autocomplete) |
| Symbol References | No | Yes (LSP-based) |
| URL References | No | Yes |
| Directory Expansion | No | Yes |
| Drag & Drop | No | No |

## Enhancement Plan

### Phase 1: Extmark Rendering (Priority: HIGH)

**Goal**: Render file references as styled inline blocks, similar to VS Code's file pills.

**Concept**:
```
Input:  Check @src/index.ts#10-20 and @explorer for issues
Render: Check [📘 src/index.ts:10-20] and [🔍 explorer] for issues
```

**Implementation**:
```typescript
// src/tui/component/prompt/Extmark.tsx
interface ExtmarkProps {
  type: "file" | "agent" | "url" | "symbol";
  display: string;
  icon: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export function Extmark({ type, display, icon, color, onRemove }: ExtmarkProps) {
  return (
    <Box borderStyle="round" borderColor={color} paddingX={1}>
      <Text>{icon} </Text>
      <Text color={color}>{display}</Text>
      {onRemove && (
        <Text color="gray" onClick={onRemove}> ×</Text>
      )}
    </Box>
  );
}
```

**Changes Required**:
- Create `Extmark.tsx` component
- Update `AdvancedPrompt` to render extmarks inline
- Modify text rendering to split at reference boundaries
- Handle cursor movement around extmarks

### Phase 2: Image Reference Support (Priority: HIGH)

**Goal**: Allow attaching images via paste or reference.

**Implementation**:
```typescript
// src/tui/hooks/useImagePaste.ts
interface ImagePasteResult {
  type: "image";
  data: string;  // base64
  mimeType: string;
  size: { width: number; height: number };
}

export function useImagePaste(options: {
  onPaste: (image: ImagePasteResult) => void;
  enabled?: boolean;
}): void;
```

**Detection**:
1. Listen for paste events with image MIME types
2. Convert to base64
3. Create reference with thumbnail preview

**ASCII Preview** (optional):
```typescript
function imageToAscii(base64: string, maxWidth: number): string {
  // Convert image to grayscale ASCII representation
  // Use characters like: ░▒▓█
}
```

**Changes Required**:
- Add `useImagePaste` hook
- Update paste event handling in `AdvancedPrompt`
- Add image preview component
- Store image data in message parts

### Phase 3: MCP Resource References (Priority: MEDIUM)

**Goal**: Reference MCP resources in prompts.

**Implementation**:
```typescript
interface MCPResourceReference {
  type: "mcp-resource";
  server: string;
  uri: string;
  name: string;
  mimeType?: string;
}
```

**Autocomplete Integration**:
- When typing `@mcp:`, show available MCP servers
- After server selection, show available resources
- Insert as `@mcp:server/resource-uri`

**Changes Required**:
- Update `FileReferenceMenu` to show MCP resources
- Add MCP resource fetching
- Create resource preview component

### Phase 4: URL References (Priority: MEDIUM)

**Goal**: Attach and preview web URLs.

**Implementation**:
```typescript
interface URLReference {
  type: "url";
  url: string;
  title?: string;
  favicon?: string;
  preview?: string;  // OG description
}
```

**Features**:
- Auto-detect URLs in input
- Fetch metadata (title, favicon, og:description)
- Render as extmark with preview tooltip

**Changes Required**:
- Add URL detection regex
- Add metadata fetching (optional, can be done by agent)
- Create URL extmark component

### Phase 5: Symbol References (Priority: LOW)

**Goal**: Reference code symbols using LSP.

**Implementation**:
```typescript
interface SymbolReference {
  type: "symbol";
  name: string;
  kind: "function" | "class" | "variable" | "type";
  file: string;
  line: number;
}
```

**Autocomplete**:
- Trigger with `@#` or `@@`
- Query LSP for workspace symbols
- Show kind icon and file location

**Changes Required**:
- Integrate with existing LSP tools
- Add symbol autocomplete section
- Create symbol extmark component

## File Reference Menu Improvements

### Current Structure
```
AGENTS
  🔍 @explorer        Fast codebase search
  📊 @analyst         Architecture review
FILES
  📘 @src/index.ts    12KB  ts
  📁 @src/components/ Directory
```

### Enhanced Structure
```
RECENT                         [r]
  📘 @src/index.ts#10-20       Last used 5m ago
  🔍 @explorer                 Last used 1h ago

AGENTS                         [a]
  🔍 @explorer        Fast codebase search
  📊 @analyst         Architecture review

MCP RESOURCES                  [m]
  📦 @mcp:filesystem/workspace
  🌐 @mcp:github/repo

FILES                          [f]
  📘 @src/index.ts    12KB  ts
  📁 @src/components/ 15 items

URLS                           [u]
  🌐 @https://docs.example.com
```

## Implementation Checklist

### Phase 1: Extmark Rendering
- [ ] Create `Extmark.tsx` component
- [ ] Add inline rendering logic to prompt
- [ ] Handle cursor navigation around extmarks
- [ ] Add extmark removal (× button)
- [ ] Style different reference types

### Phase 2: Image References
- [ ] Create `useImagePaste` hook
- [ ] Add paste event detection
- [ ] Convert images to base64
- [ ] Add image preview in menu
- [ ] Store in message parts

### Phase 3: MCP Resources
- [ ] Add MCP resource fetching
- [ ] Update autocomplete to show resources
- [ ] Create MCP resource extmark
- [ ] Handle resource content injection

### Phase 4: URL References
- [ ] Add URL detection
- [ ] Create URL extmark component
- [ ] Optional: Add metadata fetching

### Phase 5: Symbol References
- [ ] Integrate LSP symbol search
- [ ] Add symbol autocomplete
- [ ] Create symbol extmark

## Code Examples

### Inline Extmark Rendering

```tsx
function RenderPromptWithExtmarks({ text, parts }: { text: string; parts: PromptPart[] }) {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort parts by position in text
  const sortedParts = parts
    .filter(p => p.type !== "text")
    .sort((a, b) => text.indexOf(`@${a.displayPath}`) - text.indexOf(`@${b.displayPath}`));
  
  for (const part of sortedParts) {
    const refText = `@${part.displayPath}`;
    const index = text.indexOf(refText, lastIndex);
    
    if (index > lastIndex) {
      elements.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex, index)}</Text>);
    }
    
    if (part.type === "file") {
      elements.push(
        <Extmark
          key={`e-${index}`}
          type="file"
          display={part.displayPath}
          icon={getFileIcon(part.displayPath)}
          color="cyan"
        />
      );
    } else if (part.type === "agent") {
      elements.push(
        <Extmark
          key={`e-${index}`}
          type="agent"
          display={part.name}
          icon={getAgentIcon(part.name)}
          color="magenta"
        />
      );
    }
    
    lastIndex = index + refText.length;
  }
  
  if (lastIndex < text.length) {
    elements.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Text>);
  }
  
  return <Box flexWrap="wrap">{elements}</Box>;
}
```

### Image Paste Hook

```typescript
export function useImagePaste(options: {
  onPaste: (image: ImagePasteResult) => void;
  enabled?: boolean;
}) {
  const { onPaste, enabled = true } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleData = (data: Buffer) => {
      // Check for OSC 52 clipboard data
      const str = data.toString();
      
      // Look for base64 image data
      const base64Match = str.match(/^data:image\/(png|jpeg|gif|webp);base64,(.+)$/);
      if (base64Match) {
        onPaste({
          type: "image",
          mimeType: `image/${base64Match[1]}`,
          data: base64Match[2],
          size: { width: 0, height: 0 }, // Would need image parsing
        });
      }
    };
    
    process.stdin.on("data", handleData);
    return () => process.stdin.off("data", handleData);
  }, [enabled, onPaste]);
}
```

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Extmark Rendering | 3 days | None |
| Phase 2: Image References | 3 days | Phase 1 |
| Phase 3: MCP Resources | 2 days | Phase 1 |
| Phase 4: URL References | 1 day | Phase 1 |
| Phase 5: Symbol References | 3 days | Phase 1, LSP integration |

**Total Estimated Time**: 2-3 weeks

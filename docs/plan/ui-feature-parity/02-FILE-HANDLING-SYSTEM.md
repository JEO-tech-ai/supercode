# Phase 2: File Handling System

> **Priority**: HIGH
> **Estimated Duration**: 1.5 weeks
> **Dependencies**: None (can run parallel with Phase 1)

---

## Overview

SuperCode의 파일 처리 시스템을 OpenCode 수준으로 개선합니다. 현재 텍스트 기반 파일 참조에서 이미지 붙여넣기, 드래그앤드롭, 바이너리 업로드, 미리보기까지 확장합니다.

---

## Current State Analysis

### SuperCode Implementation

**Location**: `src/tui/component/prompt/FileReference.tsx`

```typescript
// Current: Text-based file references only
// User types @path/to/file.ts and it becomes a reference
function FileReference({ path }: { path: string }) {
  return (
    <Text color="blue">@{path}</Text>
  )
}

// Limitations:
// - Text references only (no binary files)
// - No image paste/upload
// - No drag-and-drop
// - No preview functionality
// - Agent must use 'read' tool to access file content
```

### OpenCode Implementation

**Location**: `opencode/packages/app/src/components/prompt-input.tsx`

```typescript
// OpenCode: Full binary file support
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]
const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"]

// Image attachment with base64 encoding
const addImageAttachment = async (file: File) => {
  const reader = new FileReader()
  reader.onload = () => {
    const attachment: ImageAttachmentPart = {
      type: "image",
      id: crypto.randomUUID(),
      filename: file.name,
      mime: file.type,
      dataUrl: reader.result as string  // base64 encoded
    }
    prompt.set([...prompt.current(), attachment], cursorPosition)
  }
  reader.readAsDataURL(file)
}

// Drag and drop with visual overlay
const handleGlobalDrop = async (event: DragEvent) => {
  event.preventDefault()
  setStore("dragging", false)
  
  const dropped = event.dataTransfer?.files
  for (const file of Array.from(dropped)) {
    if (ACCEPTED_FILE_TYPES.includes(file.type)) {
      await addImageAttachment(file)
    }
  }
}

// Paste handling for images
const handlePaste = async (event: ClipboardEvent) => {
  const items = Array.from(clipboardData.items)
  const imageItems = items.filter(item => ACCEPTED_FILE_TYPES.includes(item.type))
  
  for (const item of imageItems) {
    const file = item.getAsFile()
    if (file) await addImageAttachment(file)
  }
}
```

**Key Features**:
- Image paste from clipboard (Ctrl+V)
- Drag-and-drop with visual overlay
- Base64 encoding for binary transfer
- Inline preview thumbnails
- Full-size preview modal
- PDF attachment support

---

## Implementation Plan

### Task 2.1: Image Paste Handling (TUI)

**Create**: `src/tui/hooks/useClipboard.ts`

```typescript
import { useEffect, useState } from 'react'

interface ClipboardContent {
  type: 'text' | 'image'
  data: string  // text or base64
  mime?: string
  filename?: string
}

export function useClipboard() {
  const [hasImage, setHasImage] = useState(false)
  
  // Read clipboard content
  async function read(): Promise<ClipboardContent | null> {
    // For TUI, we need to use different approaches:
    // 1. Check if file path was pasted (detect image file paths)
    // 2. Use OSC 52 for clipboard access in supported terminals
    // 3. Fall back to system clipboard via native bindings
    
    try {
      // Try native clipboard access
      const result = await readNativeClipboard()
      if (result) return result
      
      // Fallback: Check if pasted text is a file path
      const text = await readTextClipboard()
      if (isImagePath(text)) {
        return await readImageFromPath(text)
      }
      
      return { type: 'text', data: text }
    } catch (error) {
      console.warn('Clipboard read failed:', error)
      return null
    }
  }
  
  // Write to clipboard (for copy-on-select)
  async function write(content: string): Promise<void> {
    await writeToClipboard(content)
  }
  
  return { read, write, hasImage }
}

// Helper: Read image from file path
async function readImageFromPath(path: string): Promise<ClipboardContent | null> {
  try {
    const file = Bun.file(path)
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    
    return {
      type: 'image',
      data: base64,
      mime: file.type,
      filename: path.split('/').pop()
    }
  } catch {
    return null
  }
}

// Helper: Check if path is an image
function isImagePath(text: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
  const normalized = text.trim().toLowerCase()
  return imageExtensions.some(ext => normalized.endsWith(ext))
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 2.2: Image Paste Handling (Web Console)

**Create**: `packages/console/app/src/hooks/useImagePaste.ts`

```typescript
import { createSignal, onMount, onCleanup } from 'solid-js'

interface ImageAttachment {
  id: string
  filename: string
  mime: string
  dataUrl: string
}

const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'
]

export function useImagePaste(onAttach: (attachment: ImageAttachment) => void) {
  const [isPasting, setIsPasting] = createSignal(false)
  
  const handlePaste = async (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData
    if (!clipboardData) return
    
    const items = Array.from(clipboardData.items)
    const fileItems = items.filter(item => ACCEPTED_TYPES.includes(item.type))
    
    if (fileItems.length === 0) return
    
    event.preventDefault()
    setIsPasting(true)
    
    for (const item of fileItems) {
      const file = item.getAsFile()
      if (!file) continue
      
      const reader = new FileReader()
      reader.onload = () => {
        onAttach({
          id: crypto.randomUUID(),
          filename: file.name || `pasted-${Date.now()}`,
          mime: file.type,
          dataUrl: reader.result as string
        })
      }
      reader.readAsDataURL(file)
    }
    
    setIsPasting(false)
  }
  
  onMount(() => {
    document.addEventListener('paste', handlePaste)
  })
  
  onCleanup(() => {
    document.removeEventListener('paste', handlePaste)
  })
  
  return { isPasting }
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 2.3: Drag-and-Drop UI

**Create**: `packages/console/app/src/components/DragDropOverlay.tsx`

```tsx
import { Show, createSignal, onMount, onCleanup } from 'solid-js'
import { Icon } from '@supercoin/ui/icon'

interface DragDropOverlayProps {
  onDrop: (files: File[]) => void
  acceptedTypes: string[]
}

export function DragDropOverlay(props: DragDropOverlayProps) {
  const [isDragging, setIsDragging] = createSignal(false)
  
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    const hasFiles = event.dataTransfer?.types.includes('Files')
    if (hasFiles) setIsDragging(true)
  }
  
  const handleDragLeave = (event: DragEvent) => {
    // Only trigger when leaving the document
    if (!event.relatedTarget) {
      setIsDragging(false)
    }
  }
  
  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    
    const files = event.dataTransfer?.files
    if (!files) return
    
    const acceptedFiles = Array.from(files).filter(file =>
      props.acceptedTypes.includes(file.type)
    )
    
    if (acceptedFiles.length > 0) {
      props.onDrop(acceptedFiles)
    }
  }
  
  onMount(() => {
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
  })
  
  onCleanup(() => {
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('dragleave', handleDragLeave)
    document.removeEventListener('drop', handleDrop)
  })
  
  return (
    <Show when={isDragging()}>
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-surface-raised/90 border-2 border-dashed border-primary rounded-lg">
        <div class="flex flex-col items-center gap-2 text-text-weak">
          <Icon name="photo" class="size-12" />
          <span class="text-lg font-medium">Drop images or PDFs here</span>
          <span class="text-sm">Supported: PNG, JPEG, GIF, WebP, PDF</span>
        </div>
      </div>
    </Show>
  )
}
```

**TUI Version** (simplified):

```typescript
// src/tui/component/DragDropHint.tsx
import { Box, Text } from 'ink'

interface DragDropHintProps {
  visible: boolean
}

export function DragDropHint({ visible }: DragDropHintProps) {
  if (!visible) return null
  
  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text color="cyan">
        Paste image path or use Ctrl+V to attach from clipboard
      </Text>
    </Box>
  )
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 2.4: Image Preview Component

**Create**: `packages/console/app/src/components/ImagePreview.tsx`

```tsx
import { Show } from 'solid-js'
import { Dialog } from '@supercoin/ui/dialog'
import { IconButton } from '@supercoin/ui/icon-button'

interface ImagePreviewProps {
  src: string
  alt: string
  onClose: () => void
}

export function ImagePreview(props: ImagePreviewProps) {
  return (
    <Dialog title="Image Preview" onClose={props.onClose}>
      <div class="relative max-w-4xl max-h-[80vh]">
        <img
          src={props.src}
          alt={props.alt}
          class="object-contain w-full h-full rounded-lg"
        />
        <div class="absolute top-2 right-2 flex gap-2">
          <IconButton
            icon="download"
            variant="secondary"
            onClick={() => downloadImage(props.src, props.alt)}
          />
          <IconButton
            icon="close"
            variant="ghost"
            onClick={props.onClose}
          />
        </div>
      </div>
    </Dialog>
  )
}

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
```

**Inline Thumbnail Component**:

```tsx
// packages/console/app/src/components/ImageThumbnail.tsx
interface ImageThumbnailProps {
  attachment: ImageAttachment
  onRemove: () => void
  onPreview: () => void
}

export function ImageThumbnail(props: ImageThumbnailProps) {
  return (
    <div class="relative group size-16">
      <Show
        when={props.attachment.mime.startsWith('image/')}
        fallback={
          <div class="size-full rounded-md bg-surface-base flex items-center justify-center border">
            <Icon name="document" class="size-6 text-text-weak" />
          </div>
        }
      >
        <img
          src={props.attachment.dataUrl}
          alt={props.attachment.filename}
          class="size-full rounded-md object-cover border cursor-pointer hover:border-primary transition-colors"
          onClick={props.onPreview}
        />
      </Show>
      <button
        onClick={props.onRemove}
        class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-surface-raised border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
      >
        <Icon name="close" class="size-3" />
      </button>
      <div class="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 rounded-b-md">
        <span class="text-10 text-white truncate block">
          {props.attachment.filename}
        </span>
      </div>
    </div>
  )
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

### Task 2.5: File Part Schema (SDK)

**Modify**: `packages/sdk/src/types.ts`

```typescript
import { z } from 'zod'

export const FilePartSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  messageID: z.string(),
  type: z.literal('file'),
  mime: z.string(),
  filename: z.string().optional(),
  url: z.string(),  // file:// or data: URL
  source: z.object({
    type: z.enum(['file', 'paste', 'drop']),
    path: z.string().optional(),
    text: z.object({
      start: z.number(),
      end: z.number(),
      value: z.string()  // Display text in prompt
    }).optional()
  }).optional()
})

export const ImageAttachmentPartSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  filename: z.string(),
  mime: z.string(),
  dataUrl: z.string()  // base64 encoded
})

export const AgentPartSchema = z.object({
  id: z.string(),
  type: z.literal('agent'),
  name: z.string(),
  source: z.object({
    value: z.string(),  // @agentname
    start: z.number(),
    end: z.number()
  }).optional()
})

// Combined prompt content types
export const ContentPartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string(),
    start: z.number(),
    end: z.number()
  }),
  FilePartSchema,
  ImageAttachmentPartSchema,
  AgentPartSchema
])

export type FilePart = z.infer<typeof FilePartSchema>
export type ImageAttachmentPart = z.infer<typeof ImageAttachmentPartSchema>
export type AgentPart = z.infer<typeof AgentPartSchema>
export type ContentPart = z.infer<typeof ContentPartSchema>
```

**Complexity**: Medium
**Duration**: 0.5 days

---

### Task 2.6: TUI Image Paste Integration

**Modify**: `src/tui/component/prompt/AdvancedPrompt.tsx`

```typescript
import { useClipboard } from '../../hooks/useClipboard'
import { ImageIndicator } from './ImageIndicator'

export function AdvancedPrompt() {
  const clipboard = useClipboard()
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  
  // Handle Ctrl+V for image paste
  useInput(async (input, key) => {
    if (key.ctrl && input === 'v') {
      const content = await clipboard.read()
      
      if (content?.type === 'image') {
        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
          filename: content.filename ?? `image-${Date.now()}`,
          mime: content.mime ?? 'image/png',
          dataUrl: `data:${content.mime};base64,${content.data}`
        }
        setAttachments(prev => [...prev, attachment])
        return // Prevent default paste
      }
    }
  })
  
  // Handle pasted file paths
  const handleInput = (value: string) => {
    // Check if pasted text is an image path
    const match = value.match(/^['"]?([^'"]+\.(png|jpg|jpeg|gif|webp|svg))['"]?$/i)
    if (match) {
      handleImagePath(match[1])
      return
    }
    
    setValue(value)
  }
  
  async function handleImagePath(path: string) {
    try {
      const file = Bun.file(path.replace(/\\ /g, ' '))
      
      if (file.type === 'image/svg+xml') {
        // Handle SVG as text
        const content = await file.text()
        addTextPart(`[SVG: ${file.name}]`, content)
        return
      }
      
      if (file.type.startsWith('image/')) {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          filename: file.name ?? path.split('/').pop() ?? 'image',
          mime: file.type,
          dataUrl: `data:${file.type};base64,${base64}`
        }])
      }
    } catch (error) {
      // Not a valid image path, treat as regular input
      setValue(value)
    }
  }
  
  return (
    <Box flexDirection="column">
      {/* Image attachment indicators */}
      {attachments.length > 0 && (
        <Box gap={1} marginBottom={1}>
          {attachments.map((att, i) => (
            <ImageIndicator
              key={att.id}
              index={i + 1}
              filename={att.filename}
              onRemove={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
            />
          ))}
        </Box>
      )}
      
      {/* Main input */}
      <TextInput
        value={value}
        onChange={handleInput}
        placeholder="Type message... (Paste image path or Ctrl+V for clipboard)"
      />
    </Box>
  )
}

// Compact image indicator for TUI
function ImageIndicator({ index, filename, onRemove }) {
  return (
    <Box>
      <Text color="cyan">[Image {index}]</Text>
      <Text color="gray"> {filename.slice(0, 15)}</Text>
    </Box>
  )
}
```

**Complexity**: High
**Duration**: 2 days

---

## API Integration

### Backend: Handle File Parts

**Modify**: `src/server/routes/session.ts`

```typescript
// Session prompt endpoint with file support
app.post('/session/:sessionID/prompt', async (c) => {
  const { sessionID } = c.req.param()
  const body = await c.req.json()
  
  // Process file parts
  const fileParts = body.parts.filter(p => p.type === 'file')
  
  for (const part of fileParts) {
    if (part.url.startsWith('data:')) {
      // Base64 encoded file - store temporarily
      const stored = await storeTemporaryFile(part)
      part.storedPath = stored.path
    } else if (part.url.startsWith('file://')) {
      // Local file reference - validate path
      const filePath = part.url.replace('file://', '')
      if (!await fileExists(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }
    }
  }
  
  // Send to session processor
  await processPrompt({
    sessionID,
    ...body,
    parts: body.parts
  })
  
  return c.json({ success: true })
})

async function storeTemporaryFile(part: FilePart): Promise<{ path: string }> {
  // Extract base64 data
  const base64Match = part.url.match(/^data:([^;]+);base64,(.+)$/)
  if (!base64Match) throw new Error('Invalid data URL')
  
  const [, mime, data] = base64Match
  const buffer = Buffer.from(data, 'base64')
  
  // Store in temp directory
  const ext = mime.split('/')[1]
  const filename = `${part.id}.${ext}`
  const tempPath = `/tmp/supercode/uploads/${filename}`
  
  await Bun.write(tempPath, buffer)
  
  return { path: tempPath }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/file-handling/clipboard.test.ts
describe('useClipboard', () => {
  it('detects image file paths', () => {
    expect(isImagePath('/path/to/image.png')).toBe(true)
    expect(isImagePath('screenshot.jpg')).toBe(true)
    expect(isImagePath('document.pdf')).toBe(false)
    expect(isImagePath('regular text')).toBe(false)
  })
  
  it('reads image from path', async () => {
    // Create temp image file
    const testImage = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG header
    await Bun.write('/tmp/test.png', testImage)
    
    const result = await readImageFromPath('/tmp/test.png')
    expect(result?.type).toBe('image')
    expect(result?.mime).toBe('image/png')
  })
})

// tests/file-handling/drag-drop.test.ts
describe('DragDropOverlay', () => {
  it('filters accepted file types', () => {
    const accepted = ['image/png', 'image/jpeg']
    const files = [
      new File([''], 'image.png', { type: 'image/png' }),
      new File([''], 'doc.pdf', { type: 'application/pdf' }),
      new File([''], 'photo.jpg', { type: 'image/jpeg' })
    ]
    
    const filtered = files.filter(f => accepted.includes(f.type))
    expect(filtered).toHaveLength(2)
  })
})
```

### Integration Tests

```typescript
// tests/file-handling/integration.test.ts
describe('File attachment flow', () => {
  it('attaches image and sends with prompt', async () => {
    // Simulate image paste
    const imageData = 'data:image/png;base64,iVBORw0KGgo...'
    
    const response = await fetch('/session/test/prompt', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Analyze this image',
        parts: [{
          id: 'img-1',
          type: 'file',
          mime: 'image/png',
          filename: 'screenshot.png',
          url: imageData
        }]
      })
    })
    
    expect(response.ok).toBe(true)
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| F1 | Image paste works in TUI | Ctrl+V attaches image from clipboard |
| F2 | Image paste works in Web | Paste event captures images |
| F3 | Drag-and-drop works | Files dropped show in attachment area |
| F4 | Thumbnails display | Attached images show preview |
| F5 | Full preview modal | Click thumbnail opens full-size |
| F6 | PDF attachment works | PDF files can be attached |
| F7 | Backend handles files | Files stored and passed to agents |
| F8 | Multimodal agents receive files | Images available to vision models |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/tui/hooks/useClipboard.ts` | CREATE | Clipboard access hook |
| `src/tui/component/prompt/ImageIndicator.tsx` | CREATE | TUI image indicator |
| `packages/console/app/src/hooks/useImagePaste.ts` | CREATE | Web paste hook |
| `packages/console/app/src/components/DragDropOverlay.tsx` | CREATE | Drop zone UI |
| `packages/console/app/src/components/ImagePreview.tsx` | CREATE | Preview modal |
| `packages/console/app/src/components/ImageThumbnail.tsx` | CREATE | Inline thumbnail |
| `packages/sdk/src/types.ts` | MODIFY | Add file part schemas |
| `src/tui/component/prompt/AdvancedPrompt.tsx` | MODIFY | Integrate image paste |
| `src/server/routes/session.ts` | MODIFY | Handle file uploads |

---

**Next Document**: [03-MOUSE-KEYBOARD-INTERACTIONS.md](./03-MOUSE-KEYBOARD-INTERACTIONS.md)

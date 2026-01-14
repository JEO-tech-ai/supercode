# Phase 6: Web Console UI

> **Priority**: HIGH
> **Estimated Duration**: 2 weeks
> **Dependencies**: Phase 1 (Commands), Phase 2 (File handling), Phase 4 (Command palette)

---

## Overview

완전한 웹 콘솔 채팅 인터페이스를 구현합니다. 현재 SuperCode의 웹 콘솔은 대시보드만 제공하지만, OpenCode 수준의 전체 채팅 인터페이스를 구현합니다.

---

## Current State Analysis

### SuperCode Web Console

**Location**: `packages/console/app/`

```
packages/console/app/
├── src/
│   ├── routes/
│   │   ├── index.tsx          # Dashboard only
│   │   └── agents/            # Agent management
│   └── context/
│       └── auth.tsx           # Authentication
```

**Current Features**:
- Agent dashboard
- Basic authentication
- No chat interface
- No file handling
- No session management

### OpenCode Web Console

**Location**: `opencode/packages/app/`

```
packages/app/
├── src/
│   ├── pages/
│   │   ├── session.tsx        # Full chat interface
│   │   ├── layout.tsx         # App layout with sidebar
│   │   └── home.tsx           # Session list
│   ├── components/
│   │   ├── prompt-input.tsx   # Rich input with file support
│   │   ├── file-tree.tsx      # Project file browser
│   │   ├── terminal.tsx       # Integrated terminal
│   │   ├── dialog-*.tsx       # Various dialogs
│   │   └── session-*.tsx      # Session components
│   └── context/
│       ├── sdk.tsx            # SDK provider
│       ├── sync.tsx           # Real-time sync
│       ├── command.tsx        # Command provider
│       ├── file.tsx           # File state
│       └── prompt.tsx         # Prompt state
```

**Key Features**:
- Full chat interface with rich input
- Session management with tabs
- File tree sidebar
- Integrated terminal (xterm.js)
- Real-time sync
- Command palette
- Drag-and-drop file support

---

## Implementation Plan

### Task 6.1: Core Layout Structure

**Create**: `packages/console/app/src/pages/layout.tsx`

```tsx
import { ParentComponent, Show, createSignal, createMemo } from 'solid-js'
import { useSDK } from '../context/sdk'
import { useSync } from '../context/sync'
import { Sidebar } from '../components/sidebar'
import { CommandPalette } from '../components/command-palette'
import { useCommand } from '../context/command'

export const Layout: ParentComponent = (props) => {
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false)
  const [sidebarWidth, setSidebarWidth] = createSignal(280)
  const command = useCommand()
  const sdk = useSDK()
  const sync = useSync()
  
  return (
    <div class="flex h-screen bg-surface-base text-text-strong">
      {/* Sidebar */}
      <Show when={!sidebarCollapsed()}>
        <Sidebar 
          width={sidebarWidth()} 
          onWidthChange={setSidebarWidth}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </Show>
      
      {/* Main content */}
      <main class="flex-1 flex flex-col overflow-hidden">
        {props.children}
      </main>
      
      {/* Command palette overlay */}
      <Show when={command.visible}>
        <CommandPalette />
      </Show>
    </div>
  )
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 6.2: Session Chat Page

**Create**: `packages/console/app/src/pages/session.tsx`

```tsx
import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js'
import { useParams, useNavigate } from '@solidjs/router'
import { useSDK } from '../context/sdk'
import { useSync } from '../context/sync'
import { useCommand } from '../context/command'
import { PromptInput } from '../components/prompt-input'
import { SessionHeader } from '../components/session-header'
import { MessagePart } from '../components/message-part'

export default function SessionPage() {
  const params = useParams()
  const navigate = useNavigate()
  const sdk = useSDK()
  const sync = useSync()
  const command = useCommand()
  
  let messagesContainerRef: HTMLDivElement | undefined
  
  const session = createMemo(() => 
    sync.data.session.find(s => s.id === params.id)
  )
  
  const messages = createMemo(() => 
    sync.data.message[params.id] ?? []
  )
  
  const status = createMemo(() => 
    sync.data.session_status[params.id] ?? { type: 'idle' }
  )
  
  const isWorking = createMemo(() => status().type !== 'idle')
  
  // Register session-specific commands
  onMount(() => {
    const unregister = command.register('session', () => [
      {
        id: 'session.fork',
        title: 'Fork Session',
        description: 'Create a new branch from current point',
        slash: 'fork',
        onSelect: () => handleFork()
      },
      {
        id: 'session.export',
        title: 'Export Session',
        description: 'Export as markdown',
        slash: 'export',
        onSelect: () => handleExport()
      },
      {
        id: 'session.clear',
        title: 'Clear Session',
        description: 'Start fresh in this session',
        slash: 'clear',
        onSelect: () => handleClear()
      }
    ])
    
    onCleanup(unregister)
  })
  
  // Auto-scroll to bottom on new messages
  createEffect(() => {
    messages()
    if (messagesContainerRef) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight
    }
  })
  
  async function handleFork() {
    const newSession = await sdk.client.session.fork({ 
      sessionID: params.id,
      messageID: messages().at(-1)?.id
    })
    if (newSession.data) {
      navigate(`/session/${newSession.data.id}`)
    }
  }
  
  async function handleExport() {
    const markdown = await sdk.client.session.export({ sessionID: params.id })
    // Download as file
    const blob = new Blob([markdown.data ?? ''], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${params.id}.md`
    a.click()
  }
  
  async function handleClear() {
    await sdk.client.session.clear({ sessionID: params.id })
  }
  
  return (
    <div class="flex flex-col h-full">
      {/* Session header */}
      <SessionHeader 
        session={session()} 
        status={status()} 
      />
      
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        class="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <Show 
          when={messages().length > 0}
          fallback={
            <div class="flex items-center justify-center h-full text-text-weak">
              <p>Start a conversation...</p>
            </div>
          }
        >
          <For each={messages()}>
            {(message) => (
              <div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div class={`max-w-3xl ${message.role === 'user' ? 'bg-surface-raised' : ''} rounded-lg p-4`}>
                  <For each={sync.data.part[message.id] ?? []}>
                    {(part) => <MessagePart part={part} />}
                  </For>
                </div>
              </div>
            )}
          </For>
        </Show>
        
        {/* Working indicator */}
        <Show when={isWorking()}>
          <div class="flex items-center gap-2 text-text-weak">
            <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span>Working...</span>
          </div>
        </Show>
      </div>
      
      {/* Input */}
      <div class="border-t border-border-base p-4">
        <PromptInput sessionID={params.id} />
      </div>
    </div>
  )
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 6.3: PromptInput Component

**Create**: `packages/console/app/src/components/prompt-input.tsx`

```tsx
import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { useSDK } from '../context/sdk'
import { useSync } from '../context/sync'
import { useLocal } from '../context/local'
import { usePrompt } from '../context/prompt'
import { useCommand } from '../context/command'
import { Icon } from '@supercoin/ui/icon'
import { Button } from '@supercoin/ui/button'
import { ImageThumbnail } from './image-thumbnail'
import { DragDropOverlay } from './drag-drop-overlay'

interface PromptInputProps {
  sessionID?: string
  onSubmit?: () => void
}

const ACCEPTED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
const PLACEHOLDERS = [
  'Fix a TODO in the codebase',
  'What is the tech stack?',
  'Fix broken tests',
  'Explain how authentication works'
]

export function PromptInput(props: PromptInputProps) {
  let editorRef: HTMLDivElement | undefined
  
  const sdk = useSDK()
  const sync = useSync()
  const local = useLocal()
  const prompt = usePrompt()
  const command = useCommand()
  
  const [store, setStore] = createStore({
    popover: null as 'at' | 'slash' | null,
    placeholder: Math.floor(Math.random() * PLACEHOLDERS.length),
    dragging: false,
    mode: 'normal' as 'normal' | 'shell',
    imageAttachments: [] as ImageAttachment[]
  })
  
  const status = createMemo(() => 
    sync.data.session_status[props.sessionID ?? ''] ?? { type: 'idle' }
  )
  
  const working = createMemo(() => status().type !== 'idle')
  
  // Global paste handler
  const handlePaste = async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return
    
    for (const item of Array.from(items)) {
      if (ACCEPTED_FILE_TYPES.includes(item.type)) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) await addImageAttachment(file)
        return
      }
    }
  }
  
  // Global drag handlers
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer?.types.includes('Files')) {
      setStore('dragging', true)
    }
  }
  
  const handleDragLeave = (event: DragEvent) => {
    if (!event.relatedTarget) {
      setStore('dragging', false)
    }
  }
  
  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    setStore('dragging', false)
    
    const files = event.dataTransfer?.files
    if (!files) return
    
    for (const file of Array.from(files)) {
      if (ACCEPTED_FILE_TYPES.includes(file.type)) {
        await addImageAttachment(file)
      }
    }
  }
  
  onMount(() => {
    document.addEventListener('paste', handlePaste)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
  })
  
  onCleanup(() => {
    document.removeEventListener('paste', handlePaste)
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('dragleave', handleDragLeave)
    document.removeEventListener('drop', handleDrop)
  })
  
  async function addImageAttachment(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const attachment: ImageAttachment = {
        id: crypto.randomUUID(),
        filename: file.name,
        mime: file.type,
        dataUrl: reader.result as string
      }
      setStore('imageAttachments', prev => [...prev, attachment])
    }
    reader.readAsDataURL(file)
  }
  
  function removeImageAttachment(id: string) {
    setStore('imageAttachments', prev => prev.filter(a => a.id !== id))
  }
  
  async function handleSubmit(event: Event) {
    event.preventDefault()
    
    const text = prompt.current().trim()
    if (!text && store.imageAttachments.length === 0) {
      if (working()) {
        await sdk.client.session.abort({ sessionID: props.sessionID! })
      }
      return
    }
    
    const model = local.model.current()
    const agent = local.agent.current()
    
    if (!model || !agent) {
      // Show error toast
      return
    }
    
    // Handle shell mode
    if (store.mode === 'shell') {
      await sdk.client.session.shell({
        sessionID: props.sessionID!,
        agent: agent.name,
        model: { providerID: model.providerID, modelID: model.modelID },
        command: text
      })
      prompt.reset()
      setStore('mode', 'normal')
      return
    }
    
    // Handle slash commands
    if (text.startsWith('/')) {
      const [cmdName, ...args] = text.split(' ')
      const commandName = cmdName.slice(1)
      const customCommand = sync.data.command.find(c => c.name === commandName)
      
      if (customCommand) {
        await sdk.client.session.command({
          sessionID: props.sessionID!,
          command: commandName,
          arguments: args.join(' '),
          agent: agent.name,
          model: `${model.providerID}/${model.modelID}`
        })
        prompt.reset()
        setStore('imageAttachments', [])
        return
      }
    }
    
    // Normal prompt
    const parts = [
      { id: crypto.randomUUID(), type: 'text' as const, text },
      ...store.imageAttachments.map(att => ({
        id: crypto.randomUUID(),
        type: 'file' as const,
        mime: att.mime,
        url: att.dataUrl,
        filename: att.filename
      }))
    ]
    
    await sdk.client.session.prompt({
      sessionID: props.sessionID!,
      agent: agent.name,
      model: { providerID: model.providerID, modelID: model.modelID },
      parts
    })
    
    prompt.reset()
    setStore('imageAttachments', [])
    props.onSubmit?.()
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    // Enter to submit (without shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
      return
    }
    
    // Shell mode with !
    if (event.key === '!' && prompt.cursor() === 0) {
      setStore('mode', 'shell')
      event.preventDefault()
      return
    }
    
    // Escape to exit shell mode or abort
    if (event.key === 'Escape') {
      if (store.mode === 'shell') {
        setStore('mode', 'normal')
      } else if (working()) {
        sdk.client.session.abort({ sessionID: props.sessionID! })
      }
      return
    }
  }
  
  return (
    <div class="relative">
      {/* Drag overlay */}
      <Show when={store.dragging}>
        <DragDropOverlay />
      </Show>
      
      {/* Image attachments */}
      <Show when={store.imageAttachments.length > 0}>
        <div class="flex flex-wrap gap-2 mb-2">
          <For each={store.imageAttachments}>
            {(attachment) => (
              <ImageThumbnail
                attachment={attachment}
                onRemove={() => removeImageAttachment(attachment.id)}
              />
            )}
          </For>
        </div>
      </Show>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} class="relative">
        <div 
          class={`
            rounded-lg border transition-colors
            ${store.mode === 'shell' ? 'border-primary' : 'border-border-base'}
            focus-within:border-primary
          `}
        >
          {/* Mode indicator */}
          <Show when={store.mode === 'shell'}>
            <div class="px-3 py-1 text-sm text-primary border-b border-border-base">
              Shell Mode - Enter command
            </div>
          </Show>
          
          {/* Contenteditable input */}
          <div
            ref={editorRef}
            contenteditable="true"
            class={`
              w-full px-4 py-3 min-h-[60px] max-h-[240px] overflow-y-auto
              text-text-strong focus:outline-none
              ${store.mode === 'shell' ? 'font-mono' : ''}
            `}
            onInput={(e) => prompt.set(e.currentTarget.textContent ?? '')}
            onKeyDown={handleKeyDown}
            data-placeholder={
              store.mode === 'shell' 
                ? 'Enter shell command...' 
                : `Ask anything... "${PLACEHOLDERS[store.placeholder]}"`
            }
          />
          
          {/* Footer */}
          <div class="flex items-center justify-between px-3 py-2 border-t border-border-base">
            <div class="flex items-center gap-2">
              <span class="text-sm text-text-weak">
                {local.agent.current()?.name}
              </span>
              <span class="text-sm text-text-weak">
                {local.model.current()?.modelID}
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              <Show when={working()}>
                <Button 
                  variant="ghost" 
                  size="small"
                  onClick={() => sdk.client.session.abort({ sessionID: props.sessionID! })}
                >
                  <Icon name="stop" class="size-4" />
                  Stop
                </Button>
              </Show>
              
              <Button type="submit" size="small" disabled={working()}>
                <Icon name="send" class="size-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 6.4: Message Part Renderer

**Create**: `packages/console/app/src/components/message-part.tsx`

```tsx
import { Show, Switch, Match, createMemo } from 'solid-js'
import { Icon } from '@supercoin/ui/icon'
import { CodeBlock } from './code-block'
import { ToolResult } from './tool-result'

interface MessagePartProps {
  part: Part
}

export function MessagePart(props: MessagePartProps) {
  return (
    <Switch>
      <Match when={props.part.type === 'text'}>
        <TextPart text={(props.part as TextPart).text} />
      </Match>
      
      <Match when={props.part.type === 'tool-call'}>
        <ToolCallPart part={props.part as ToolCallPart} />
      </Match>
      
      <Match when={props.part.type === 'tool-result'}>
        <ToolResultPart part={props.part as ToolResultPart} />
      </Match>
      
      <Match when={props.part.type === 'file'}>
        <FilePart part={props.part as FilePart} />
      </Match>
      
      <Match when={props.part.type === 'error'}>
        <ErrorPart part={props.part as ErrorPart} />
      </Match>
    </Switch>
  )
}

function TextPart(props: { text: string }) {
  const rendered = createMemo(() => {
    // Parse markdown-like syntax
    return parseContent(props.text)
  })
  
  return (
    <div class="prose prose-sm max-w-none text-text-strong">
      {rendered()}
    </div>
  )
}

function ToolCallPart(props: { part: ToolCallPart }) {
  const [expanded, setExpanded] = createSignal(false)
  
  return (
    <div class="border border-border-base rounded-lg overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-3 py-2 bg-surface-raised hover:bg-surface-raised-hover"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div class="flex items-center gap-2">
          <Icon name="tool" class="size-4 text-text-weak" />
          <span class="font-medium">{props.part.toolName}</span>
        </div>
        <Icon 
          name={expanded() ? 'chevron-up' : 'chevron-down'} 
          class="size-4 text-text-weak" 
        />
      </button>
      
      <Show when={expanded()}>
        <div class="px-3 py-2 bg-surface-base border-t border-border-base">
          <pre class="text-xs overflow-x-auto">
            {JSON.stringify(props.part.args, null, 2)}
          </pre>
        </div>
      </Show>
    </div>
  )
}

function ToolResultPart(props: { part: ToolResultPart }) {
  const isCode = createMemo(() => {
    const content = props.part.result
    return typeof content === 'string' && 
      (content.includes('\n') || content.length > 100)
  })
  
  return (
    <div class="border-l-2 border-primary pl-3 my-2">
      <Show 
        when={isCode()}
        fallback={<span class="text-text-weak">{String(props.part.result)}</span>}
      >
        <CodeBlock 
          code={String(props.part.result)} 
          language={detectLanguage(props.part.toolName)}
        />
      </Show>
    </div>
  )
}

function FilePart(props: { part: FilePart }) {
  const isImage = createMemo(() => 
    props.part.mime?.startsWith('image/')
  )
  
  return (
    <Show 
      when={isImage()}
      fallback={
        <div class="flex items-center gap-2 text-text-weak">
          <Icon name="document" class="size-4" />
          <span>{props.part.filename}</span>
        </div>
      }
    >
      <img 
        src={props.part.url} 
        alt={props.part.filename}
        class="max-w-md rounded-lg border border-border-base"
      />
    </Show>
  )
}

function ErrorPart(props: { part: ErrorPart }) {
  return (
    <div class="flex items-start gap-2 p-3 bg-error/10 border border-error rounded-lg">
      <Icon name="alert-circle" class="size-5 text-error shrink-0" />
      <div class="text-error">
        <p class="font-medium">{props.part.error.name}</p>
        <p class="text-sm">{props.part.error.message}</p>
      </div>
    </div>
  )
}

function detectLanguage(toolName: string): string {
  if (toolName.includes('bash')) return 'bash'
  if (toolName.includes('grep')) return 'text'
  if (toolName.includes('read')) return 'text'
  return 'text'
}
```

**Complexity**: Medium
**Duration**: 1.5 days

---

### Task 6.5: Sidebar Component

**Create**: `packages/console/app/src/components/sidebar.tsx`

```tsx
import { createSignal, createMemo, Show, For } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import { useSync } from '../context/sync'
import { useLocal } from '../context/local'
import { Icon } from '@supercoin/ui/icon'
import { Button } from '@supercoin/ui/button'

interface SidebarProps {
  width: number
  onWidthChange: (width: number) => void
  onCollapse: () => void
}

export function Sidebar(props: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const sync = useSync()
  const local = useLocal()
  
  const sessions = createMemo(() => 
    sync.data.session
      .filter(s => !s.parentID)
      .sort((a, b) => b.time.updated - a.time.updated)
  )
  
  const currentSessionID = createMemo(() => {
    const match = location.pathname.match(/\/session\/(.+)/)
    return match?.[1]
  })
  
  return (
    <div 
      class="flex flex-col h-full border-r border-border-base bg-surface-raised"
      style={{ width: `${props.width}px` }}
    >
      {/* Header */}
      <div class="flex items-center justify-between p-3 border-b border-border-base">
        <span class="font-semibold text-lg">SuperCode</span>
        <Button variant="ghost" size="small" onClick={props.onCollapse}>
          <Icon name="sidebar-left" class="size-4" />
        </Button>
      </div>
      
      {/* New session button */}
      <div class="p-2">
        <Button 
          class="w-full justify-start"
          onClick={() => navigate('/new')}
        >
          <Icon name="plus" class="size-4 mr-2" />
          New Session
        </Button>
      </div>
      
      {/* Sessions list */}
      <div class="flex-1 overflow-y-auto">
        <div class="px-2 py-1">
          <span class="text-xs font-medium text-text-weak uppercase">Sessions</span>
        </div>
        
        <For each={sessions()}>
          {(session) => (
            <button
              class={`
                w-full flex items-center gap-2 px-3 py-2 text-left
                hover:bg-surface-raised-hover transition-colors
                ${currentSessionID() === session.id ? 'bg-surface-raised-hover' : ''}
              `}
              onClick={() => navigate(`/session/${session.id}`)}
            >
              <Icon name="message-square" class="size-4 text-text-weak shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm">{session.title || 'Untitled'}</p>
                <p class="text-xs text-text-weak">
                  {formatRelativeTime(session.time.updated)}
                </p>
              </div>
            </button>
          )}
        </For>
      </div>
      
      {/* Footer */}
      <div class="border-t border-border-base p-2">
        <div class="flex items-center gap-2 px-2 py-1">
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate">{local.model.current()?.modelID}</p>
            <p class="text-xs text-text-weak truncate">
              {local.agent.current()?.name}
            </p>
          </div>
          <Button variant="ghost" size="small">
            <Icon name="settings" class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Complexity**: Medium
**Duration**: 1 day

---

### Task 6.6: Context Providers

**Create**: `packages/console/app/src/context/sdk.tsx`

```tsx
import { createContext, useContext, ParentComponent, createMemo } from 'solid-js'
import { createOpencodeClient, type OpencodeClient } from '@supercoin/sdk'
import { usePlatform } from './platform'

interface SDKContextValue {
  client: OpencodeClient
  url: string
  directory: string
}

const SDKContext = createContext<SDKContextValue>()

interface SDKProviderProps {
  url: string
  directory?: string
}

export const SDKProvider: ParentComponent<SDKProviderProps> = (props) => {
  const platform = usePlatform()
  
  const client = createMemo(() => 
    createOpencodeClient({
      baseUrl: props.url,
      fetch: platform.fetch,
      directory: props.directory ?? process.cwd(),
      throwOnError: true
    })
  )
  
  return (
    <SDKContext.Provider value={{
      client: client(),
      url: props.url,
      directory: props.directory ?? process.cwd()
    }}>
      {props.children}
    </SDKContext.Provider>
  )
}

export function useSDK() {
  const context = useContext(SDKContext)
  if (!context) throw new Error('useSDK must be used within SDKProvider')
  return context
}
```

**Create**: `packages/console/app/src/context/sync.tsx`

```tsx
import { createContext, useContext, ParentComponent, createSignal, onMount, onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { useSDK } from './sdk'

interface SyncData {
  session: Session[]
  message: Record<string, Message[]>
  part: Record<string, Part[]>
  session_status: Record<string, SessionStatus>
  provider: Provider[]
  agent: Agent[]
  command: Command[]
  config: Config
}

interface SyncContextValue {
  status: 'loading' | 'partial' | 'complete'
  data: SyncData
  session: {
    get: (id: string) => Session | undefined
  }
}

const SyncContext = createContext<SyncContextValue>()

export const SyncProvider: ParentComponent = (props) => {
  const sdk = useSDK()
  const [status, setStatus] = createSignal<'loading' | 'partial' | 'complete'>('loading')
  
  const [data, setData] = createStore<SyncData>({
    session: [],
    message: {},
    part: {},
    session_status: {},
    provider: [],
    agent: [],
    command: [],
    config: {}
  })
  
  onMount(async () => {
    // Initial fetch
    try {
      const [sessions, providers, agents, commands, config] = await Promise.all([
        sdk.client.session.list(),
        sdk.client.provider.list(),
        sdk.client.agent.list(),
        sdk.client.command.list(),
        sdk.client.config.get()
      ])
      
      setData(produce(draft => {
        draft.session = sessions.data ?? []
        draft.provider = providers.data ?? []
        draft.agent = agents.data ?? []
        draft.command = commands.data ?? []
        draft.config = config.data ?? {}
      }))
      
      setStatus('complete')
    } catch (error) {
      console.error('Sync failed:', error)
      setStatus('partial')
    }
    
    // Subscribe to real-time updates
    const eventSource = sdk.client.events.subscribe()
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleEvent(data)
    }
    
    onCleanup(() => {
      eventSource.close()
    })
  })
  
  function handleEvent(event: any) {
    // Handle different event types
    switch (event.type) {
      case 'session.created':
        setData('session', prev => [...prev, event.data])
        break
      case 'session.updated':
        setData('session', prev => 
          prev.map(s => s.id === event.data.id ? { ...s, ...event.data } : s)
        )
        break
      case 'message.created':
        setData('message', event.data.sessionID, prev => [...(prev ?? []), event.data])
        break
      case 'part.created':
        setData('part', event.data.messageID, prev => [...(prev ?? []), event.data])
        break
      case 'status.updated':
        setData('session_status', event.data.sessionID, event.data.status)
        break
    }
  }
  
  return (
    <SyncContext.Provider value={{
      status: status(),
      data,
      session: {
        get: (id) => data.session.find(s => s.id === id)
      }
    }}>
      {props.children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) throw new Error('useSync must be used within SyncProvider')
  return context
}
```

**Complexity**: High
**Duration**: 2 days

---

### Task 6.7: File Tree Component

**Create**: `packages/console/app/src/components/file-tree.tsx`

```tsx
import { createSignal, createMemo, Show, For } from 'solid-js'
import { Icon } from '@supercoin/ui/icon'
import { useSDK } from '../context/sdk'

interface FileNode {
  path: string
  name: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  onSelect: (path: string) => void
}

export function FileTree(props: FileTreeProps) {
  const sdk = useSDK()
  const [tree, setTree] = createSignal<FileNode[]>([])
  const [loading, setLoading] = createSignal(true)
  const [expandedDirs, setExpandedDirs] = createSignal<Set<string>>(new Set())
  
  onMount(async () => {
    try {
      const files = await sdk.client.files.tree()
      setTree(files.data ?? [])
    } finally {
      setLoading(false)
    }
  })
  
  function toggleDir(path: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }
  
  function renderNode(node: FileNode, depth: number = 0) {
    const isExpanded = expandedDirs().has(node.path)
    
    return (
      <div>
        <button
          class="w-full flex items-center gap-1 py-1 px-2 hover:bg-surface-raised-hover text-left"
          style={{ "padding-left": `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDir(node.path)
            } else {
              props.onSelect(node.path)
            }
          }}
        >
          <Show 
            when={node.type === 'directory'}
            fallback={<Icon name="document" class="size-4 text-text-weak" />}
          >
            <Icon 
              name={isExpanded ? 'folder-open' : 'folder'} 
              class="size-4 text-primary" 
            />
          </Show>
          <span class="text-sm truncate">{node.name}</span>
        </button>
        
        <Show when={node.type === 'directory' && isExpanded && node.children}>
          <For each={node.children}>
            {(child) => renderNode(child, depth + 1)}
          </For>
        </Show>
      </div>
    )
  }
  
  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base">
        <span class="text-sm font-medium">Files</span>
        <Button variant="ghost" size="small" onClick={loadTree}>
          <Icon name="refresh" class="size-4" />
        </Button>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <Show 
          when={!loading()}
          fallback={
            <div class="p-4 text-center text-text-weak">Loading...</div>
          }
        >
          <For each={tree()}>
            {(node) => renderNode(node)}
          </For>
        </Show>
      </div>
    </div>
  )
}
```

**Complexity**: Medium
**Duration**: 1 day

---

## Testing Strategy

### Integration Tests

```typescript
// tests/console/session.test.ts
describe('Session Page', () => {
  it('displays messages from session', async () => {
    render(() => <SessionPage />, {
      wrapper: ({ children }) => (
        <SDKProvider url="http://localhost:3000">
          <SyncProvider>
            <Router>
              {children}
            </Router>
          </SyncProvider>
        </SDKProvider>
      )
    })
    
    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })
  
  it('sends message on submit', async () => {
    const sdk = { client: { session: { prompt: vi.fn() } } }
    
    render(() => <PromptInput sessionID="test" />, {
      wrapper: createWrapper({ sdk })
    })
    
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello world')
    await userEvent.keyboard('{Enter}')
    
    expect(sdk.client.session.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionID: 'test',
        parts: [{ type: 'text', text: 'Hello world' }]
      })
    )
  })
})
```

---

## Success Criteria

| ID | Criteria | Validation |
|----|----------|------------|
| W1 | Layout renders correctly | Sidebar + main content |
| W2 | Session list displays | Shows all sessions |
| W3 | Chat messages display | User and assistant messages |
| W4 | Message sending works | Prompt submits and appears |
| W5 | Image paste works | Ctrl+V attaches image |
| W6 | Drag-drop works | Files can be dropped |
| W7 | Commands work | /slash commands execute |
| W8 | Real-time sync works | New messages appear live |

---

## Files to Create

| File | Description |
|------|-------------|
| `pages/layout.tsx` | App layout with sidebar |
| `pages/session.tsx` | Chat session page |
| `pages/home.tsx` | Session list / new session |
| `components/prompt-input.tsx` | Rich text input |
| `components/message-part.tsx` | Message renderer |
| `components/sidebar.tsx` | Navigation sidebar |
| `components/file-tree.tsx` | File browser |
| `components/image-thumbnail.tsx` | Image preview |
| `components/drag-drop-overlay.tsx` | Drop zone |
| `context/sdk.tsx` | SDK provider |
| `context/sync.tsx` | Real-time sync |
| `context/local.tsx` | Local state |
| `context/command.tsx` | Command provider |
| `context/prompt.tsx` | Prompt state |

---

**Next Document**: [07-IMPLEMENTATION-ROADMAP.md](./07-IMPLEMENTATION-ROADMAP.md)

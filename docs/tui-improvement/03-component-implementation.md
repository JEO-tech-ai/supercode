# UI 컴포넌트 구현 상세

> **Version**: 1.0.0
> **최종 업데이트**: 2026-01-12

---

## 1. Logo 컴포넌트

### 구현

```typescript
// src/tui/component/logo.tsx
import { useTheme } from "@tui/context/theme"

const LOGO_ART = [
  [`                     `, `            ▄     `],
  [`█▀▀ █░░█ █▀▀█ █▀▀▀ █▀▀█ `, `█▀▀▀ █▀▀█ ░▀█▀░ █▀▀▄`],
  [`▀▀█ █░░█ █░░█ █▀▀▀ █▄▄▀ `, `█░░░ █░░█ ░░█░░ █░░█`],
  [`▀▀▀ ░▀▀▀ █▀▀▀ ▀▀▀▀ ▀░▀▀ `, `▀▀▀▀ ▀▀▀▀ ▀▀▀▀▀ ▀  ▀`],
]

export function Logo() {
  const { theme } = useTheme()

  return (
    <box flexDirection="column" alignItems="center">
      {LOGO_ART.map((row) => (
        <box flexDirection="row">
          <text fg={theme.textMuted}>{row[0]}</text>
          <text fg={theme.primary}>{row[1]}</text>
        </box>
      ))}
    </box>
  )
}
```

---

## 2. Prompt 컴포넌트

### 인터페이스

```typescript
// src/tui/component/prompt/index.tsx
export interface PromptRef {
  current: { input: string; parts: unknown[] } | null
  set: (value: { input: string; parts: unknown[] }) => void
  submit: () => void
  focus: () => void
  blur: () => void
}

interface PromptProps {
  ref?: (ref: PromptRef) => void
  hint?: JSX.Element
  onSubmit?: (input: string) => void
  placeholder?: string
}
```

### 구현

```typescript
import { createSignal, onMount, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useRoute } from "@tui/context/route"
import { useKeyboard } from "@opentui/solid"

export function Prompt(props: PromptProps) {
  const { theme } = useTheme()
  const route = useRoute()
  const [input, setInput] = createSignal("")
  const [focused, setFocused] = createSignal(false)
  const [cursorPos, setCursorPos] = createSignal(0)

  const ref: PromptRef = {
    get current() {
      return input() ? { input: input(), parts: [] } : null
    },
    set(value) {
      setInput(value.input)
      setCursorPos(value.input.length)
    },
    submit() {
      handleSubmit()
    },
    focus() {
      setFocused(true)
    },
    blur() {
      setFocused(false)
    },
  }

  onMount(() => {
    props.ref?.(ref)
  })

  const handleSubmit = () => {
    const value = input().trim()
    if (!value) return
    
    props.onSubmit?.(value)
    
    // 새 세션으로 이동
    route.navigate({
      type: "session",
      sessionID: crypto.randomUUID(),
    })
  }

  useKeyboard((evt) => {
    if (!focused()) return

    if (evt.name === "return") {
      handleSubmit()
      return
    }

    if (evt.name === "backspace") {
      setInput((prev) => prev.slice(0, -1))
      setCursorPos((prev) => Math.max(0, prev - 1))
      return
    }

    if (evt.char && evt.char.length === 1) {
      setInput((prev) => prev + evt.char)
      setCursorPos((prev) => prev + 1)
    }
  })

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={focused() ? theme.primary : theme.border}
      padding={1}
    >
      <box flexDirection="row" gap={1}>
        <text fg={theme.primary}>❯</text>
        <text fg={theme.text}>
          {input() || (
            <span style={{ fg: theme.textMuted }}>
              {props.placeholder ?? "Ask anything..."}
            </span>
          )}
        </text>
        <Show when={focused()}>
          <text fg={theme.primary}>▌</text>
        </Show>
      </box>
      <Show when={props.hint}>
        <box marginTop={1}>{props.hint}</box>
      </Show>
    </box>
  )
}
```

---

## 3. Border 컴포넌트

### 구현

```typescript
// src/tui/component/border.tsx
import { ParentComponent } from "solid-js"
import { useTheme } from "@tui/context/theme"

interface BorderProps {
  title?: string
  variant?: "rounded" | "single" | "double" | "heavy"
}

const BORDERS = {
  rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
}

export const Border: ParentComponent<BorderProps> = (props) => {
  const { theme } = useTheme()
  const b = () => BORDERS[props.variant ?? "rounded"]

  return (
    <box
      borderStyle={props.variant ?? "rounded"}
      borderColor={theme.border}
    >
      <Show when={props.title}>
        <box position="absolute" top={-1} left={2}>
          <text fg={theme.textMuted}> {props.title} </text>
        </box>
      </Show>
      {props.children}
    </box>
  )
}
```

---

## 4. DialogCommand (커맨드 팔레트)

### 인터페이스

```typescript
// src/tui/component/dialog-command.tsx
interface Command {
  title: string
  value: string
  keybind?: string
  category?: string
  suggested?: boolean
  disabled?: boolean
  onSelect: (dialog: DialogContextValue) => void
}

interface CommandContextValue {
  register: (commands: () => Command[]) => void
  trigger: (value: string) => void
  open: () => void
}
```

### 구현

```typescript
import { createSignal, For, Show, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useDialog } from "@tui/ui/dialog"
import { useKeybind } from "@tui/context/keybind"

export function CommandProvider(props: ParentComponent) {
  const dialog = useDialog()
  const keybind = useKeybind()
  const [registries] = createSignal<(() => Command[])[]>([])

  const register = (commands: () => Command[]) => {
    registries().push(commands)
  }

  const allCommands = createMemo(() => {
    return registries().flatMap((r) => r())
  })

  const trigger = (value: string) => {
    const cmd = allCommands().find((c) => c.value === value)
    if (cmd && !cmd.disabled) {
      cmd.onSelect(dialog)
    }
  }

  const open = () => {
    dialog.replace(() => <CommandPalette commands={allCommands()} />)
  }

  // Ctrl+X로 열기
  useKeyboard((evt) => {
    if (keybind.matches("command_palette", evt)) {
      open()
    }
  })

  return (
    <CommandContext.Provider value={{ register, trigger, open }}>
      {props.children}
    </CommandContext.Provider>
  )
}

function CommandPalette(props: { commands: Command[] }) {
  const { theme } = useTheme()
  const dialog = useDialog()
  const [search, setSearch] = createSignal("")
  const [selected, setSelected] = createSignal(0)

  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    return props.commands
      .filter((c) => !c.disabled)
      .filter((c) => 
        c.title.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
  })

  const grouped = createMemo(() => {
    const groups: Record<string, Command[]> = {}
    for (const cmd of filtered()) {
      const cat = cmd.category ?? "General"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(cmd)
    }
    return groups
  })

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      dialog.clear()
      return
    }

    if (evt.name === "return") {
      const cmd = filtered()[selected()]
      if (cmd) cmd.onSelect(dialog)
      return
    }

    if (evt.name === "up") {
      setSelected((prev) => Math.max(0, prev - 1))
      return
    }

    if (evt.name === "down") {
      setSelected((prev) => Math.min(filtered().length - 1, prev + 1))
      return
    }
  })

  return (
    <box
      position="absolute"
      top="20%"
      left="center"
      width={60}
      maxHeight={20}
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.background}
    >
      <box padding={1} borderBottom={theme.border}>
        <text fg={theme.textMuted}>❯ </text>
        <text fg={theme.text}>{search()}</text>
      </box>
      <scrollbox>
        <For each={Object.entries(grouped())}>
          {([category, commands]) => (
            <box flexDirection="column">
              <text fg={theme.textMuted} bold>{category}</text>
              <For each={commands}>
                {(cmd, index) => (
                  <box
                    backgroundColor={
                      filtered().indexOf(cmd) === selected()
                        ? theme.selection
                        : undefined
                    }
                    padding={[0, 1]}
                  >
                    <text fg={theme.text}>{cmd.title}</text>
                    <box flexGrow={1} />
                    <Show when={cmd.keybind}>
                      <text fg={theme.textMuted}>{cmd.keybind}</text>
                    </Show>
                  </box>
                )}
              </For>
            </box>
          )}
        </For>
      </scrollbox>
    </box>
  )
}
```

---

## 5. Toast 컴포넌트

### 구현

```typescript
// src/tui/ui/toast.tsx
import { For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"

interface ToastItem {
  id: number
  title?: string
  message: string
  variant: "info" | "success" | "warning" | "error"
}

function ToastContainer(props: { toasts: ToastItem[] }) {
  const { theme } = useTheme()

  const variantColor = (variant: ToastItem["variant"]) => {
    switch (variant) {
      case "success": return theme.success
      case "warning": return theme.warning
      case "error": return theme.error
      default: return theme.primary
    }
  }

  const variantIcon = (variant: ToastItem["variant"]) => {
    switch (variant) {
      case "success": return "✓"
      case "warning": return "⚠"
      case "error": return "✗"
      default: return "ℹ"
    }
  }

  return (
    <box position="absolute" bottom={2} right={2} flexDirection="column" gap={1}>
      <For each={props.toasts}>
        {(toast) => (
          <box
            borderStyle="rounded"
            borderColor={variantColor(toast.variant)}
            backgroundColor={theme.background}
            padding={1}
            minWidth={30}
          >
            <box flexDirection="row" gap={1}>
              <text fg={variantColor(toast.variant)}>{variantIcon(toast.variant)}</text>
              <box flexDirection="column">
                <Show when={toast.title}>
                  <text fg={theme.text} bold>{toast.title}</text>
                </Show>
                <text fg={theme.textMuted}>{toast.message}</text>
              </box>
            </box>
          </box>
        )}
      </For>
    </box>
  )
}

export function Toast() {
  const { toasts } = useToast()
  return <ToastContainer toasts={toasts} />
}
```

---

## 6. Session Header/Footer

### Header

```typescript
// src/tui/routes/session/header.tsx
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useRouteData } from "@tui/context/route"

export function SessionHeader() {
  const { theme } = useTheme()
  const route = useRouteData("session")
  const sync = useSync()
  
  const session = () => sync.session.get(route.sessionID)
  const model = () => session()?.model ?? "unknown"

  return (
    <box
      borderBottom={theme.border}
      padding={[0, 2]}
      flexDirection="row"
      height={3}
    >
      <text fg={theme.text} bold>
        {session()?.title ?? "New Session"}
      </text>
      <box flexGrow={1} />
      <text fg={theme.textMuted}>{model()}</text>
    </box>
  )
}
```

### Footer

```typescript
// src/tui/routes/session/footer.tsx
import { useTheme } from "@tui/context/theme"
import { useKeybind } from "@tui/context/keybind"

export function SessionFooter() {
  const { theme } = useTheme()

  return (
    <box
      borderTop={theme.border}
      padding={[0, 2]}
      flexDirection="row"
      height={1}
      gap={2}
    >
      <text fg={theme.textMuted}>
        <span fg={theme.text}>ctrl+x</span> commands
      </text>
      <text fg={theme.textMuted}>
        <span fg={theme.text}>ctrl+s</span> sessions
      </text>
      <text fg={theme.textMuted}>
        <span fg={theme.text}>ctrl+m</span> models
      </text>
      <box flexGrow={1} />
      <text fg={theme.textMuted}>
        <span fg={theme.text}>?</span> help
      </text>
    </box>
  )
}
```

---

## 7. Session 라우트

### 구현

```typescript
// src/tui/routes/session/index.tsx
import { Show, For, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { Prompt } from "@tui/component/prompt"
import { SessionHeader } from "./header"
import { SessionFooter } from "./footer"
import { Toast } from "@tui/ui/toast"

export function Session() {
  const { theme } = useTheme()
  const route = useRouteData("session")
  const sync = useSync()

  const session = () => sync.session.get(route.sessionID)
  const messages = createMemo(() => session()?.messages ?? [])

  return (
    <box flexDirection="column" height="100%">
      <SessionHeader />
      
      <scrollbox flexGrow={1} padding={2}>
        <For each={messages()}>
          {(msg) => (
            <box marginBottom={1}>
              <text fg={msg.role === "user" ? theme.primary : theme.text}>
                {msg.role === "user" ? "❯ " : ""}
                {msg.content}
              </text>
            </box>
          )}
        </For>
      </scrollbox>

      <box padding={2}>
        <Prompt
          onSubmit={(input) => {
            // 메시지 전송 처리
            sync.session.sendMessage(route.sessionID, input)
          }}
        />
      </box>

      <SessionFooter />
      <Toast />
    </box>
  )
}
```

---

## 8. Home 라우트

### 구현

```typescript
// src/tui/routes/home.tsx
import { Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { Logo } from "@tui/component/logo"
import { Prompt } from "@tui/component/prompt"
import { Toast } from "@tui/ui/toast"
import { useSync } from "@tui/context/sync"
import { VERSION } from "@/version"

export function Home() {
  const { theme } = useTheme()
  const sync = useSync()

  const mcpCount = () => Object.keys(sync.data.mcp).length

  return (
    <>
      <box
        flexGrow={1}
        justifyContent="center"
        alignItems="center"
        padding={2}
        gap={1}
      >
        <Logo />
        <box width="100%" maxWidth={75} paddingTop={1}>
          <Prompt placeholder="What would you like to do?" />
        </box>
        <Toast />
      </box>

      <box
        padding={[1, 2]}
        flexDirection="row"
        gap={2}
      >
        <text fg={theme.textMuted}>{process.cwd()}</text>
        <box flexGrow={1} />
        <Show when={mcpCount() > 0}>
          <text fg={theme.text}>
            <span fg={theme.success}>⊙</span> {mcpCount()} MCP
          </text>
        </Show>
        <text fg={theme.textMuted}>{VERSION}</text>
      </box>
    </>
  )
}
```

---

**Previous**: [02-context-implementation.md](./02-context-implementation.md)
**Next**: [04-migration-guide.md](./04-migration-guide.md)

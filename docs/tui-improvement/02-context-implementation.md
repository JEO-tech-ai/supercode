# 컨텍스트 프로바이더 구현 상세

> **Version**: 1.0.0
> **최종 업데이트**: 2026-01-12

---

## 1. ExitProvider

앱 종료를 관리하는 가장 기본적인 프로바이더입니다.

### 인터페이스

```typescript
// src/tui/context/exit.tsx
import { createContext, useContext, ParentComponent } from "solid-js"

interface ExitContextValue {
  exit: () => Promise<void>
}

const ExitContext = createContext<ExitContextValue>()

export const ExitProvider: ParentComponent<{
  onExit?: () => Promise<void>
}> = (props) => {
  const exit = async () => {
    await props.onExit?.()
  }

  return (
    <ExitContext.Provider value={{ exit }}>
      {props.children}
    </ExitContext.Provider>
  )
}

export function useExit() {
  const context = useContext(ExitContext)
  if (!context) throw new Error("useExit must be used within ExitProvider")
  return context.exit
}
```

---

## 2. KVProvider (로컬 스토리지)

간단한 키-값 저장소로 사용자 설정을 유지합니다.

### 인터페이스

```typescript
// src/tui/context/kv.tsx
import { createContext, useContext, ParentComponent } from "solid-js"
import { createStore } from "solid-js/store"

interface KVContextValue {
  get: <T>(key: string, defaultValue: T) => T
  set: <T>(key: string, value: T) => void
  remove: (key: string) => void
}

// 파일 기반 저장소 경로
const KV_FILE = ".supercoin/kv.json"

export const KVProvider: ParentComponent = (props) => {
  const [store, setStore] = createStore<Record<string, unknown>>({})

  // 초기화 시 파일에서 로드
  // ...

  const get = <T,>(key: string, defaultValue: T): T => {
    return (store[key] as T) ?? defaultValue
  }

  const set = <T,>(key: string, value: T) => {
    setStore(key, value)
    // 파일에 저장
  }

  const remove = (key: string) => {
    setStore(key, undefined)
  }

  return (
    <KVContext.Provider value={{ get, set, remove }}>
      {props.children}
    </KVContext.Provider>
  )
}

export function useKV() {
  const context = useContext(KVContext)
  if (!context) throw new Error("useKV must be used within KVProvider")
  return context
}
```

---

## 3. RouteProvider (라우팅)

홈과 세션 간 라우팅을 관리합니다.

### 라우트 타입

```typescript
// src/tui/context/route.tsx
type RouteData =
  | { type: "home"; initialPrompt?: { input: string; parts: unknown[] } }
  | { type: "session"; sessionID: string }

interface RouteContextValue {
  data: RouteData
  navigate: (route: RouteData) => void
  back: () => void
}
```

### 구현

```typescript
import { createContext, useContext, ParentComponent } from "solid-js"
import { createStore } from "solid-js/store"

const RouteContext = createContext<RouteContextValue>()

export const RouteProvider: ParentComponent = (props) => {
  const [route, setRoute] = createStore<RouteData>({ type: "home" })
  const history: RouteData[] = []

  const navigate = (newRoute: RouteData) => {
    history.push({ ...route })
    setRoute(newRoute)
  }

  const back = () => {
    const prev = history.pop()
    if (prev) setRoute(prev)
  }

  return (
    <RouteContext.Provider value={{ data: route, navigate, back }}>
      {props.children}
    </RouteContext.Provider>
  )
}

export function useRoute() {
  const context = useContext(RouteContext)
  if (!context) throw new Error("useRoute must be used within RouteProvider")
  return context
}

// 타입 안전한 라우트 데이터 접근
export function useRouteData<T extends RouteData["type"]>(type: T) {
  const route = useRoute()
  if (route.data.type !== type) {
    throw new Error(`Expected route type ${type}, got ${route.data.type}`)
  }
  return route.data as Extract<RouteData, { type: T }>
}
```

---

## 4. ThemeProvider (테마)

테마 색상과 모드를 관리합니다.

### 테마 구조

```typescript
// src/tui/context/theme/theme.tsx
interface Theme {
  name: string
  background: string
  text: string
  textMuted: string
  primary: string
  secondary: string
  accent: string
  success: string
  warning: string
  error: string
  border: string
  selection: string
}

interface ThemeContextValue {
  theme: Theme
  mode: () => "dark" | "light"
  setMode: (mode: "dark" | "light") => void
  setTheme: (name: string) => void
  themes: string[]
}
```

### 기본 테마 (catppuccin-mocha)

```json
// src/tui/context/theme/catppuccin.json
{
  "name": "catppuccin",
  "dark": {
    "background": "#1e1e2e",
    "text": "#cdd6f4",
    "textMuted": "#6c7086",
    "primary": "#89b4fa",
    "secondary": "#f5c2e7",
    "accent": "#fab387",
    "success": "#a6e3a1",
    "warning": "#f9e2af",
    "error": "#f38ba8",
    "border": "#313244",
    "selection": "#45475a"
  },
  "light": {
    "background": "#eff1f5",
    "text": "#4c4f69",
    "textMuted": "#9ca0b0",
    "primary": "#1e66f5",
    "secondary": "#ea76cb",
    "accent": "#fe640b",
    "success": "#40a02b",
    "warning": "#df8e1d",
    "error": "#d20f39",
    "border": "#ccd0da",
    "selection": "#acb0be"
  }
}
```

### 구현

```typescript
import { createContext, useContext, ParentComponent, createSignal, createMemo } from "solid-js"
import catppuccin from "./catppuccin.json"
import dracula from "./dracula.json"
import nord from "./nord.json"
import monokai from "./monokai.json"
import tokyoNight from "./tokyo-night.json"

const themes = { catppuccin, dracula, nord, monokai, "tokyo-night": tokyoNight }

export const ThemeProvider: ParentComponent<{
  mode?: "dark" | "light"
}> = (props) => {
  const kv = useKV()
  const [mode, setMode] = createSignal<"dark" | "light">(props.mode ?? "dark")
  const [themeName, setThemeName] = createSignal(kv.get("theme", "catppuccin"))

  const theme = createMemo(() => {
    const t = themes[themeName()] ?? themes.catppuccin
    return { name: t.name, ...t[mode()] }
  })

  const setTheme = (name: string) => {
    if (themes[name]) {
      setThemeName(name)
      kv.set("theme", name)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: theme(),
        mode,
        setMode,
        setTheme,
        themes: Object.keys(themes),
      }}
    >
      {props.children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
```

---

## 5. KeybindProvider (키바인딩)

단축키를 관리합니다.

### 기본 키바인딩

```typescript
// src/tui/context/keybind.tsx
const DEFAULT_KEYBINDS = {
  // 시스템
  command_palette: { key: "x", ctrl: true },
  exit: { key: "c", ctrl: true },
  help: { key: "?", shift: true },
  
  // 세션
  session_list: { key: "s", ctrl: true },
  session_new: { key: "n", ctrl: true },
  
  // 모델
  model_list: { key: "m", ctrl: true },
  model_cycle: { key: "Tab", ctrl: true },
  
  // 테마
  theme_list: { key: "t", ctrl: true },
  
  // 상태
  status_view: { key: "i", ctrl: true },
}

interface Keybind {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

interface KeybindContextValue {
  keybinds: typeof DEFAULT_KEYBINDS
  matches: (name: keyof typeof DEFAULT_KEYBINDS, event: KeyboardEvent) => boolean
  set: (name: string, keybind: Keybind) => void
}
```

### 구현

```typescript
import { createContext, useContext, ParentComponent } from "solid-js"
import { createStore } from "solid-js/store"
import { useKeyboard } from "@opentui/solid"

export const KeybindProvider: ParentComponent = (props) => {
  const kv = useKV()
  const [keybinds, setKeybinds] = createStore({
    ...DEFAULT_KEYBINDS,
    ...kv.get("keybinds", {}),
  })

  const matches = (name: keyof typeof DEFAULT_KEYBINDS, event: KeyboardEvent) => {
    const kb = keybinds[name]
    if (!kb) return false
    
    return (
      event.key.toLowerCase() === kb.key.toLowerCase() &&
      !!event.ctrlKey === !!kb.ctrl &&
      !!event.altKey === !!kb.alt &&
      !!event.shiftKey === !!kb.shift &&
      !!event.metaKey === !!kb.meta
    )
  }

  const set = (name: string, keybind: Keybind) => {
    setKeybinds(name, keybind)
    kv.set("keybinds", { ...keybinds })
  }

  return (
    <KeybindContext.Provider value={{ keybinds, matches, set }}>
      {props.children}
    </KeybindContext.Provider>
  )
}

export function useKeybind() {
  const context = useContext(KeybindContext)
  if (!context) throw new Error("useKeybind must be used within KeybindProvider")
  return context
}
```

---

## 6. DialogProvider (다이얼로그)

모달 다이얼로그를 관리합니다.

### 인터페이스

```typescript
// src/tui/ui/dialog.tsx
import { createContext, useContext, ParentComponent, JSX, createSignal } from "solid-js"

interface DialogContextValue {
  show: (content: () => JSX.Element) => void
  replace: (content: () => JSX.Element) => void
  clear: () => void
  isOpen: () => boolean
}

export const DialogProvider: ParentComponent = (props) => {
  const [content, setContent] = createSignal<(() => JSX.Element) | null>(null)

  const show = (c: () => JSX.Element) => {
    setContent(() => c)
  }

  const replace = (c: () => JSX.Element) => {
    setContent(() => c)
  }

  const clear = () => {
    setContent(null)
  }

  const isOpen = () => content() !== null

  return (
    <DialogContext.Provider value={{ show, replace, clear, isOpen }}>
      {props.children}
      <Show when={content()}>
        {content()!()}
      </Show>
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error("useDialog must be used within DialogProvider")
  return context
}
```

---

## 7. ToastProvider (토스트)

알림을 관리합니다.

### 인터페이스

```typescript
// src/tui/ui/toast.tsx
interface ToastOptions {
  title?: string
  message: string
  variant?: "info" | "success" | "warning" | "error"
  duration?: number
}

interface ToastContextValue {
  show: (options: ToastOptions) => void
  error: (error: Error | string) => void
}

export const ToastProvider: ParentComponent = (props) => {
  const [toasts, setToasts] = createStore<ToastOptions[]>([])

  const show = (options: ToastOptions) => {
    const toast = { ...options, id: Date.now() }
    setToasts((prev) => [...prev, toast])
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== toast))
    }, options.duration ?? 3000)
  }

  const error = (err: Error | string) => {
    show({
      message: typeof err === "string" ? err : err.message,
      variant: "error",
      duration: 5000,
    })
  }

  return (
    <ToastContext.Provider value={{ show, error }}>
      {props.children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}
```

---

## 전체 프로바이더 조합

```typescript
// src/tui/app.tsx
export function tui(options: TuiOptions) {
  return new Promise<void>(async (resolve) => {
    const mode = await detectTerminalMode()
    const onExit = async () => {
      await options.onExit?.()
      resolve()
    }

    render(() => (
      <ErrorBoundary fallback={ErrorComponent}>
        <ExitProvider onExit={onExit}>
          <KVProvider>
            <ToastProvider>
              <RouteProvider>
                <ThemeProvider mode={mode}>
                  <KeybindProvider>
                    <DialogProvider>
                      <App />
                    </DialogProvider>
                  </KeybindProvider>
                </ThemeProvider>
              </RouteProvider>
            </ToastProvider>
          </KVProvider>
        </ExitProvider>
      </ErrorBoundary>
    ))
  })
}
```

---

**Previous**: [01-IMPLEMENTATION_PLAN.md](./01-IMPLEMENTATION_PLAN.md)
**Next**: [03-component-implementation.md](./03-component-implementation.md)

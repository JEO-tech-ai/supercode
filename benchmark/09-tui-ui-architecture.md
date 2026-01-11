# OpenCode TUI/UI Architecture Benchmark

## Overview

OpenCode의 UI 시스템은 두 가지 주요 패키지로 구성됩니다:

1. **TUI (Terminal User Interface)** - `packages/opencode/src/cli/cmd/tui/`
   - SolidJS 기반 터미널 렌더링 (`@opentui/solid`)
   - 터미널 네이티브 컴포넌트 시스템
   - 복잡한 상태 관리와 키바인딩 시스템

2. **Web UI** - `packages/ui/src/`
   - SolidJS 기반 웹 컴포넌트
   - Kobalte UI 프리미티브 사용
   - Tailwind CSS 스타일링

## 1. TUI 아키텍처

### 1.1 핵심 의존성

```typescript
// packages/opencode/package.json
{
  "dependencies": {
    "@opentui/solid": "workspace:*",
    "@opentui/core": "workspace:*",
    "solid-js": "1.9.10"
  }
}
```

### 1.2 애플리케이션 진입점

**파일:** `packages/opencode/src/cli/cmd/tui/app.tsx`

```typescript
import { render, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"

export function tui(input: {
  url: string
  args: Args
  directory?: string
  fetch?: typeof fetch
  events?: EventSource
  onExit?: () => Promise<void>
}) {
  return new Promise<void>(async (resolve) => {
    const mode = await getTerminalBackgroundColor()
    
    render(
      () => (
        <ErrorBoundary fallback={...}>
          <ArgsProvider {...input.args}>
            <ExitProvider onExit={onExit}>
              <KVProvider>
                <ToastProvider>
                  <RouteProvider>
                    <SDKProvider url={input.url} directory={input.directory}>
                      <SyncProvider>
                        <ThemeProvider mode={mode}>
                          <LocalProvider>
                            <KeybindProvider>
                              <PromptStashProvider>
                                <DialogProvider>
                                  <CommandProvider>
                                    <FrecencyProvider>
                                      <PromptHistoryProvider>
                                        <PromptRefProvider>
                                          <App />
                                        </PromptRefProvider>
                                      </PromptHistoryProvider>
                                    </FrecencyProvider>
                                  </CommandProvider>
                                </DialogProvider>
                              </PromptStashProvider>
                            </KeybindProvider>
                          </LocalProvider>
                        </ThemeProvider>
                      </SyncProvider>
                    </SDKProvider>
                  </RouteProvider>
                </ToastProvider>
              </KVProvider>
            </ExitProvider>
          </ArgsProvider>
        </ErrorBoundary>
      ),
      {
        targetFps: 60,
        gatherStats: false,
        exitOnCtrlC: false,
        useKittyKeyboard: {},
      }
    )
  })
}
```

### 1.3 Context Provider 계층 구조

| Provider | 역할 | 파일 |
|----------|------|------|
| `ArgsProvider` | CLI 인자 관리 | `context/args.tsx` |
| `ExitProvider` | 앱 종료 핸들링 | `context/exit.tsx` |
| `KVProvider` | 로컬 키-값 저장소 | `context/kv.tsx` |
| `ToastProvider` | 알림 토스트 | `ui/toast.tsx` |
| `RouteProvider` | 라우팅 상태 | `context/route.tsx` |
| `SDKProvider` | API 클라이언트 | `context/sdk.tsx` |
| `SyncProvider` | 실시간 동기화 | `context/sync.tsx` |
| `ThemeProvider` | 테마/컬러 시스템 | `context/theme.tsx` |
| `LocalProvider` | 로컬 설정 | `context/local.tsx` |
| `KeybindProvider` | 키바인딩 | `context/keybind.tsx` |
| `PromptStashProvider` | 프롬프트 임시저장 | `component/prompt/stash.tsx` |
| `DialogProvider` | 다이얼로그 스택 | `ui/dialog.tsx` |
| `CommandProvider` | 명령 팔레트 | `component/dialog-command.tsx` |
| `FrecencyProvider` | 최근/자주 사용 추적 | `component/prompt/frecency.tsx` |
| `PromptHistoryProvider` | 프롬프트 히스토리 | `component/prompt/history.tsx` |
| `PromptRefProvider` | 프롬프트 레퍼런스 | `context/prompt.tsx` |

### 1.4 라우팅 시스템

**파일:** `context/route.tsx`

```typescript
type RouteData = 
  | { type: "home"; initialPrompt?: PromptInfo }
  | { type: "session"; sessionID: string; initialPrompt?: PromptInfo }

function App() {
  const route = useRoute()
  
  return (
    <box width={dimensions().width} height={dimensions().height}>
      <Switch>
        <Match when={route.data.type === "home"}>
          <Home />
        </Match>
        <Match when={route.data.type === "session"}>
          <Session />
        </Match>
      </Switch>
    </box>
  )
}
```

## 2. 테마 시스템

### 2.1 테마 구조

**파일:** `context/theme.tsx`

```typescript
type ThemeColors = {
  // Primary Colors
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  
  // Status Colors
  error: RGBA
  warning: RGBA
  success: RGBA
  info: RGBA
  
  // Text Colors
  text: RGBA
  textMuted: RGBA
  selectedListItemText: RGBA
  
  // Background Colors
  background: RGBA
  backgroundPanel: RGBA
  backgroundElement: RGBA
  backgroundMenu: RGBA
  
  // Border Colors
  border: RGBA
  borderActive: RGBA
  borderSubtle: RGBA
  
  // Diff Colors
  diffAdded: RGBA
  diffRemoved: RGBA
  diffContext: RGBA
  diffHunkHeader: RGBA
  diffHighlightAdded: RGBA
  diffHighlightRemoved: RGBA
  diffAddedBg: RGBA
  diffRemovedBg: RGBA
  diffContextBg: RGBA
  diffLineNumber: RGBA
  diffAddedLineNumberBg: RGBA
  diffRemovedLineNumberBg: RGBA
  
  // Markdown Colors
  markdownText: RGBA
  markdownHeading: RGBA
  markdownLink: RGBA
  markdownLinkText: RGBA
  markdownCode: RGBA
  markdownBlockQuote: RGBA
  markdownEmph: RGBA
  markdownStrong: RGBA
  markdownHorizontalRule: RGBA
  markdownListItem: RGBA
  markdownListEnumeration: RGBA
  markdownImage: RGBA
  markdownImageText: RGBA
  markdownCodeBlock: RGBA
  
  // Syntax Highlighting
  syntaxComment: RGBA
  syntaxKeyword: RGBA
  syntaxFunction: RGBA
  syntaxVariable: RGBA
  syntaxString: RGBA
  syntaxNumber: RGBA
  syntaxType: RGBA
  syntaxOperator: RGBA
  syntaxPunctuation: RGBA
}
```

### 2.2 테마 JSON 포맷

**파일:** `context/theme/opencode.json`

```json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep9": "#fab283",
    "lightStep9": "#3b7dd8"
  },
  "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    }
  }
}
```

### 2.3 내장 테마 목록

```typescript
export const DEFAULT_THEMES = {
  aura, ayu, catppuccin, "catppuccin-frappe", "catppuccin-macchiato",
  cobalt2, cursor, dracula, everforest, flexoki, github, gruvbox,
  kanagawa, material, matrix, mercury, monokai, nightowl, nord,
  "one-dark", "osaka-jade", opencode, orng, "lucent-orng",
  palenight, rosepine, solarized, synthwave84, tokyonight,
  vesper, vercel, zenburn
}
```

### 2.4 다크/라이트 모드 자동 감지

```typescript
async function getTerminalBackgroundColor(): Promise<"dark" | "light"> {
  if (!process.stdin.isTTY) return "dark"
  
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      const str = data.toString()
      const match = str.match(/\x1b]11;([^\x07\x1b]+)/)
      if (match) {
        const color = match[1]
        // Parse RGB and calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        resolve(luminance > 0.5 ? "light" : "dark")
      }
    }
    
    process.stdin.setRawMode(true)
    process.stdin.on("data", handler)
    process.stdout.write("\x1b]11;?\x07")  // Query terminal background
    
    setTimeout(() => resolve("dark"), 1000)
  })
}
```

## 3. TUI 컴포넌트 시스템

### 3.1 기본 요소

OpenTUI는 터미널 네이티브 JSX 요소를 제공합니다:

```tsx
// 기본 Box 레이아웃
<box
  width={dimensions().width}
  height={dimensions().height}
  backgroundColor={theme.background}
  flexDirection="row"
  gap={1}
  padding={2}
>
  {children}
</box>

// 텍스트 렌더링
<text fg={theme.text} attributes={TextAttributes.BOLD}>
  Hello World
</text>

// 스크롤 박스
<scrollbox
  flexGrow={1}
  stickyScroll={true}
  stickyStart="bottom"
  scrollAcceleration={scrollAcceleration()}
>
  {content}
</scrollbox>

// 코드 하이라이팅
<code
  filetype="markdown"
  drawUnstyledText={false}
  streaming={true}
  syntaxStyle={syntax()}
  content={markdown}
  conceal={true}
/>
```

### 3.2 Dialog 시스템

**파일:** `ui/dialog.tsx`

```typescript
function init() {
  const [store, setStore] = createStore({
    stack: [] as { element: JSX.Element; onClose?: () => void }[],
    size: "medium" as "medium" | "large",
  })

  useKeyboard((evt) => {
    if (evt.name === "escape" && store.stack.length > 0) {
      const current = store.stack.at(-1)!
      current.onClose?.()
      setStore("stack", store.stack.slice(0, -1))
      evt.preventDefault()
      evt.stopPropagation()
    }
  })

  return {
    clear() { /* 모든 다이얼로그 닫기 */ },
    replace(input: any, onClose?: () => void) { /* 다이얼로그 교체 */ },
    get stack() { return store.stack },
  }
}

export function Dialog(props: ParentProps<{ size?: "medium" | "large"; onClose: () => void }>) {
  const dimensions = useTerminalDimensions()
  const { theme } = useTheme()

  return (
    <box
      onMouseUp={() => props.onClose?.()}
      width={dimensions().width}
      height={dimensions().height}
      alignItems="center"
      position="absolute"
      paddingTop={dimensions().height / 4}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
    >
      <box
        onMouseUp={(e) => e.stopPropagation()}
        width={props.size === "large" ? 80 : 60}
        backgroundColor={theme.backgroundPanel}
      >
        {props.children}
      </box>
    </box>
  )
}
```

### 3.3 Toast 시스템

**파일:** `ui/toast.tsx`

```typescript
export type ToastOptions = {
  variant: "info" | "success" | "warning" | "error"
  message: string
  title?: string
  duration?: number
}

function init() {
  const [store, setStore] = createStore({
    currentToast: null as ToastOptions | null,
  })

  return {
    show(options: ToastOptions) {
      const { duration = 3000, ...currentToast } = options
      setStore("currentToast", currentToast)
      setTimeout(() => setStore("currentToast", null), duration)
    },
    error: (err: Error) => {
      toast.show({ variant: "error", message: err.message })
    },
  }
}

export function Toast() {
  const toast = useToast()
  const { theme } = useTheme()

  return (
    <Show when={toast.currentToast}>
      {(current) => (
        <box
          position="absolute"
          top={2}
          right={2}
          maxWidth={60}
          backgroundColor={theme.backgroundPanel}
          borderColor={theme[current().variant]}
          border={["left", "right"]}
        >
          <text fg={theme.text}>{current().message}</text>
        </box>
      )}
    </Show>
  )
}
```

### 3.4 Border 스타일

**파일:** `component/border.tsx`

```typescript
export const EmptyBorder = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
}

export const SplitBorder = {
  border: ["left", "right"],
  customBorderChars: {
    ...EmptyBorder,
    vertical: "┃",
  },
}
```

## 4. 키바인딩 시스템

### 4.1 키바인드 Context

**파일:** `context/keybind.tsx`

```typescript
export const { use: useKeybind, provider: KeybindProvider } = createSimpleContext({
  name: "Keybind",
  init: () => {
    const sync = useSync()
    const keybinds = createMemo(() => {
      return pipe(
        sync.data.config.keybinds ?? {},
        mapValues((value) => Keybind.parse(value))
      )
    })
    
    const [store, setStore] = createStore({ leader: false })

    useKeyboard(async (evt) => {
      if (!store.leader && result.match("leader", evt)) {
        leader(true)
        return
      }
    })

    return {
      get all() { return keybinds() },
      get leader() { return store.leader },
      
      match(key: keyof KeybindsConfig, evt: ParsedKey) {
        const keybind = keybinds()[key]
        if (!keybind) return false
        const parsed = Keybind.fromParsedKey(evt, store.leader)
        return keybind.some(k => Keybind.match(k, parsed))
      },
      
      print(key: keyof KeybindsConfig) {
        const first = keybinds()[key]?.at(0)
        if (!first) return ""
        return Keybind.toString(first)
      },
    }
  },
})
```

### 4.2 주요 키바인딩 설정

```typescript
const KEYBINDS: KeybindsConfig = {
  leader: "ctrl+x",
  app_exit: ["ctrl+c", "ctrl+d"],
  input_submit: ["enter", "ctrl+enter"],
  session_new: "<leader>n",
  session_list: "<leader>l",
  model_list: "<leader>m",
  agent_list: "<leader>a",
  session_interrupt: "ctrl+c",
  messages_copy: "<leader>y",
  // ...
}
```

## 5. Prompt 컴포넌트

### 5.1 프롬프트 구조

**파일:** `component/prompt/index.tsx`

```typescript
export type PromptProps = {
  sessionID?: string
  visible?: boolean
  disabled?: boolean
  onSubmit?: () => void
  ref?: (ref: PromptRef) => void
  hint?: JSX.Element
}

export type PromptRef = {
  focused: boolean
  current: PromptInfo
  set(prompt: PromptInfo): void
  reset(): void
  blur(): void
  focus(): void
  submit(): void
}

export function Prompt(props: PromptProps) {
  let input: TextareaRenderable
  let autocomplete: AutocompleteRef
  
  const keybind = useKeybind()
  const local = useLocal()
  const sdk = useSDK()
  const { theme, syntax } = useTheme()
  
  // Extmark 스타일 (파일/에이전트 참조 하이라이팅)
  const fileStyleId = syntax().getStyleId("extmark.file")!
  const agentStyleId = syntax().getStyleId("extmark.agent")!
  
  return (
    <box border={["top"]} borderColor={theme.border}>
      <textarea
        ref={(r) => (input = r)}
        placeholder={PLACEHOLDERS[store.placeholder]}
        cursorColor={props.disabled ? theme.backgroundElement : theme.text}
        syntaxStyle={syntax()}
      />
      <Autocomplete ref={(r) => (autocomplete = r)} />
    </box>
  )
}
```

### 5.2 자동완성 시스템

```typescript
// 파일 경로 자동완성: @ 트리거
// 에이전트 자동완성: / 트리거
// 히스토리 자동완성: 위/아래 화살표
```

## 6. Web UI 컴포넌트 (packages/ui)

### 6.1 Button 컴포넌트

**파일:** `packages/ui/src/components/button.tsx`

```typescript
export interface ButtonProps extends ComponentProps<typeof Kobalte> {
  size?: "small" | "normal" | "large"
  variant?: "primary" | "secondary" | "ghost"
  icon?: IconProps["name"]
}

export function Button(props: ButtonProps) {
  const [split, rest] = splitProps(props, ["variant", "size", "icon"])
  return (
    <Kobalte
      {...rest}
      data-component="button"
      data-size={split.size || "normal"}
      data-variant={split.variant || "secondary"}
    >
      <Show when={split.icon}>
        <Icon name={split.icon!} size="small" />
      </Show>
      {props.children}
    </Kobalte>
  )
}
```

### 6.2 Dialog 컴포넌트

**파일:** `packages/ui/src/components/dialog.tsx`

```typescript
export interface DialogProps extends ParentProps {
  title?: JSXElement
  description?: JSXElement
  action?: JSXElement
}

export function Dialog(props: DialogProps) {
  return (
    <div data-component="dialog">
      <div data-slot="dialog-container">
        <Kobalte.Content data-slot="dialog-content">
          <Show when={props.title || props.action}>
            <div data-slot="dialog-header">
              <Kobalte.Title data-slot="dialog-title">{props.title}</Kobalte.Title>
              <Kobalte.CloseButton as={IconButton} icon="close" variant="ghost" />
            </div>
          </Show>
          <div data-slot="dialog-body">{props.children}</div>
        </Kobalte.Content>
      </div>
    </div>
  )
}
```

### 6.3 Icon 시스템

**파일:** `packages/ui/src/components/icon.tsx`

```typescript
const icons = {
  "arrow-up": `<path d="M9.99991 2.24121L16.0921 8.33343..." />`,
  "close": `<path d="M3.75 3.75L16.25 16.25M16.25 3.75L3.75 16.25" />`,
  "check": `<path d="M5 11.9657L8.37838 14.7529L15 5.83398" />`,
  // 60+ 아이콘 정의
}

export interface IconProps {
  name: keyof typeof icons
  size?: "small" | "normal" | "large"
}

export function Icon(props: IconProps) {
  return (
    <div data-component="icon" data-size={props.size || "normal"}>
      <svg viewBox="0 0 20 20" innerHTML={icons[props.name]} />
    </div>
  )
}
```

### 6.4 Markdown 렌더러

**파일:** `packages/ui/src/components/markdown.tsx`

```typescript
export function Markdown(props: { text: string; cacheKey?: string }) {
  const marked = useMarked()
  
  const [html] = createResource(
    () => props.text,
    async (markdown) => {
      const hash = checksum(markdown)
      const cached = cache.get(props.cacheKey ?? hash)
      if (cached?.hash === hash) return cached.html
      
      const next = await marked.parse(markdown)
      cache.set(props.cacheKey ?? hash, { hash, html: next })
      return next
    }
  )
  
  return <div data-component="markdown" innerHTML={html.latest} />
}
```

## 7. Supercoin 구현 권장사항

### 7.1 필수 구현 컴포넌트

| 컴포넌트 | 우선순위 | 복잡도 |
|----------|----------|--------|
| ThemeProvider | 높음 | 중간 |
| DialogProvider | 높음 | 낮음 |
| ToastProvider | 높음 | 낮음 |
| KeybindProvider | 중간 | 중간 |
| PromptComponent | 높음 | 높음 |

### 7.2 테마 시스템 구현

```typescript
// supercoin/src/cli/ui/theme.ts
export interface Theme {
  primary: string
  secondary: string
  error: string
  warning: string
  success: string
  text: string
  textMuted: string
  background: string
  backgroundPanel: string
  border: string
}

export const DEFAULT_THEME: Theme = {
  primary: "#fab283",
  secondary: "#5c9cf5",
  error: "#e06c75",
  warning: "#f5a742",
  success: "#7fd88f",
  text: "#eeeeee",
  textMuted: "#808080",
  background: "#0a0a0a",
  backgroundPanel: "#141414",
  border: "#484848",
}
```

### 7.3 간소화된 Dialog 시스템

```typescript
// supercoin/src/cli/ui/dialog.ts
import * as clack from "@clack/prompts"

export const Dialog = {
  confirm: (message: string) => clack.confirm({ message }),
  text: (message: string, placeholder?: string) => 
    clack.text({ message, placeholder }),
  select: <T>(message: string, options: { value: T; label: string }[]) =>
    clack.select({ message, options }),
}
```

### 7.4 Toast 시스템

```typescript
// supercoin/src/cli/ui/toast.ts
import * as clack from "@clack/prompts"

export const Toast = {
  info: (message: string) => clack.log.info(message),
  success: (message: string) => clack.log.success(message),
  warning: (message: string) => clack.log.warning(message),
  error: (message: string) => clack.log.error(message),
}
```

## 8. 기술 스택 비교

| 항목 | OpenCode | Supercoin 권장 |
|------|----------|----------------|
| UI Framework | SolidJS | @clack/prompts |
| Terminal Renderer | @opentui/solid | 직접 ANSI 출력 |
| Theme Format | JSON | TypeScript 객체 |
| State Management | solid-js/store | Zustand 또는 내장 |
| Keybindings | Custom KeybindProvider | readline 기반 |

## 9. 구현 로드맵

### Phase 1: 기본 UI 인프라 (2주)
- [ ] Theme 시스템 구현
- [ ] 기본 컬러 팔레트 정의
- [ ] @clack/prompts 통합

### Phase 2: 핵심 컴포넌트 (2주)
- [ ] Toast/알림 시스템
- [ ] Dialog/모달 시스템
- [ ] Prompt 입력 컴포넌트

### Phase 3: 고급 기능 (3주)
- [ ] Keybinding 시스템
- [ ] 자동완성 (파일/명령어)
- [ ] 세션 뷰어

### Phase 4: 테마 확장 (1주)
- [ ] 다중 테마 지원
- [ ] 사용자 정의 테마 로딩
- [ ] 다크/라이트 모드 자동 감지

## 10. 참고 파일 경로

```
opencode/packages/opencode/src/cli/cmd/tui/
├── app.tsx                    # 메인 애플리케이션
├── context/
│   ├── theme.tsx              # 테마 시스템
│   ├── keybind.tsx            # 키바인딩
│   ├── route.tsx              # 라우팅
│   ├── sdk.tsx                # API 클라이언트
│   ├── sync.tsx               # 실시간 동기화
│   └── local.tsx              # 로컬 설정
├── ui/
│   ├── dialog.tsx             # 다이얼로그
│   ├── toast.tsx              # 토스트
│   └── spinner.ts             # 로딩 스피너
├── component/
│   ├── prompt/                # 프롬프트 입력
│   │   ├── index.tsx
│   │   ├── autocomplete.tsx
│   │   └── history.tsx
│   ├── border.tsx             # 보더 스타일
│   └── dialog-*.tsx           # 각종 다이얼로그
└── routes/
    ├── home.tsx               # 홈 화면
    └── session/               # 세션 화면
        ├── index.tsx
        ├── header.tsx
        ├── footer.tsx
        └── sidebar.tsx

opencode/packages/ui/src/
├── components/
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── icon.tsx
│   ├── markdown.tsx
│   └── toast.tsx
└── context/
    ├── data.tsx
    └── marked.tsx
```

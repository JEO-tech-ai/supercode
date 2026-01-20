# Phase 1 Prompt 2: Plugin Architecture 구현

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@opencode/packages/plugin/src/ Plugin SDK 전체 분석.
- Plugin interface
- Tool plugin 등록
- Hook plugin 등록
- Plugin lifecycle
핵심 패턴을 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode의 Plugin Architecture를 확장해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/opencode/packages/plugin/src/`
- `/Users/supercent/Documents/Github/oh-my-opencode/src/index.ts` (hook factory 패턴)
- `/Users/supercent/Documents/Github/supercode/src/plugin/` (기존 코드)

**구현 위치**: `src/plugin/`

**수정/추가할 파일들**:

1. **src/plugin/types.ts** - 타입 확장
```typescript
export interface PluginContext {
  client: SuperCodeClient;
  project: ProjectMetadata;
  directory: string;
  serverUrl: string;
  shell: ShellInterface;
  config: PluginConfig;
  permission: PermissionManager;  // Phase 1에서 구현한 것
}

export interface PluginHook<T = void> {
  name: HookName;
  handler: (ctx: PluginContext, ...args: unknown[]) => Promise<T>;
  priority?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  args: z.ZodObject<any>;
  execute: (args: unknown, ctx: PluginContext) => Promise<string>;
}

export interface AuthPlugin {
  name: string;
  authenticate: (ctx: PluginContext) => Promise<AuthResult>;
  refresh?: (ctx: PluginContext, token: string) => Promise<AuthResult>;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;

  onLoad?: (ctx: PluginContext) => Promise<void>;
  onUnload?: (ctx: PluginContext) => Promise<void>;

  tools?: ToolDefinition[];
  hooks?: PluginHook[];
  config?: (ctx: PluginContext) => Partial<SuperCodeConfig>;
  auth?: AuthPlugin;
}
```

2. **src/plugin/loader.ts** - 플러그인 로더
- npm 패키지 로드
- 로컬 파일 로드
- 플러그인 검증
- lifecycle 관리

3. **src/plugin/hooks.ts** - Hook 확장
- 새로운 hook types 추가:
  - chat.message
  - chat.params
  - permission.ask
  - tool.execute.before
  - tool.execute.after
  - experimental.* hooks

4. **src/plugin/tools.ts** - Tool plugin 지원
- ToolDefinition → Tool 변환
- Tool registry 통합
- Permission wrapper 자동 적용

5. **src/plugin/index.ts** - Exports 업데이트

**요구사항**:
- 기존 src/plugin/registry.ts와 호환
- Dynamic import 사용
- 에러 격리 (한 플러그인 실패가 다른 것에 영향 X)
- 로깅 추가

**설정 예시** (supercode.json):
```jsonc
{
  "plugins": [
    "supercode-plugin-example",     // npm package
    "./plugins/my-local-plugin.ts"  // local file
  ]
}
```

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep plugin"
```

# Phase 3 Prompt 2: AST-Grep 통합

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@oh-my-opencode/src/tools/ast-grep/ AST-Grep 도구 분석.
- Search tool 구현
- Replace tool 구현
- 지원 언어 목록
- Pattern 문법
핵심 구현 패턴을 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode에 AST-Grep 도구를 통합해주세요.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/oh-my-opencode/src/tools/ast-grep/`
- AST-Grep 공식 문서: https://ast-grep.github.io/

**구현 위치**: `src/core/tools/ast-grep/`

**구현할 파일들**:

1. **src/core/tools/ast-grep/types.ts**
```typescript
export type SupportedLanguage =
  | 'typescript' | 'javascript' | 'python' | 'go' | 'rust'
  | 'java' | 'kotlin' | 'c' | 'cpp' | 'csharp' | 'ruby'
  | 'php' | 'swift' | 'scala' | 'haskell' | 'lua' | 'elixir'
  | 'html' | 'css' | 'json' | 'yaml' | 'bash' | 'dockerfile'
  | 'sql' | 'graphql' | 'markdown';

export interface AstMatch {
  file: string;
  language: string;
  text: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  captures?: Record<string, string>;
}
```

2. **src/core/tools/ast-grep/search.ts**
```typescript
// ast_search tool
args: z.object({
  pattern: z.string().describe('AST pattern (sg syntax)'),
  path: z.string().optional(),
  lang: z.enum([/* supported languages */]),
  strictness: z.enum(['exact', 'fuzzy']).default('exact'),
});

// sg --pattern 'PATTERN' --lang LANG PATH --json
```

3. **src/core/tools/ast-grep/replace.ts**
```typescript
// ast_replace tool
args: z.object({
  pattern: z.string(),
  replacement: z.string().describe('Replacement with $1, $2 captures'),
  path: z.string().optional(),
  lang: z.enum([/* supported languages */]),
  dryRun: z.boolean().default(true),
});

// sg --pattern 'PATTERN' --rewrite 'REPLACEMENT' --lang LANG PATH
```

4. **src/core/tools/ast-grep/patterns.ts**
```typescript
// 언어별 자주 사용되는 패턴 라이브러리
export const COMMON_PATTERNS = {
  typescript: {
    asyncFunctions: 'async function $NAME($$$PARAMS) { $$$BODY }',
    reactComponents: 'function $NAME($PROPS): JSX.Element { $$$BODY }',
    useState: 'const [$STATE, $SETTER] = useState($INITIAL)',
    consoleLog: 'console.log($$$ARGS)',
    tryCatch: 'try { $$$TRY } catch ($ERR) { $$$CATCH }',
  },
  python: {
    functions: 'def $NAME($$$PARAMS): $$$BODY',
    classes: 'class $NAME($$$BASES): $$$BODY',
    imports: 'import $MODULE',
  },
  // ... more languages
};
```

5. **src/core/tools/ast-grep/index.ts**

**Pattern 문법 설명** (도구 description에 포함):
- `$NAME` - 단일 노드 캡처
- `$$$ARGS` - 여러 노드 캡처
- `$_` - 아무 노드 매칭 (캡처 안함)

**요구사항**:
- sg CLI 호출 (ast-grep 설치 필요)
- 25개 언어 지원
- Pattern capture 지원
- Dry run 기본값 true
- 결과 포맷팅

**설치 확인**:
```bash
# ast-grep 설치 확인
which sg || echo "ast-grep not installed"
```

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "which sg"  # ast-grep 설치 확인
```

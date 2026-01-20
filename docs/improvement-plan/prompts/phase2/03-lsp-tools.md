# Phase 2 Prompt 3: Enhanced LSP Tools 구현

## 사전 준비

### Gemini 분석 (먼저 실행)
```
ask-gemini "@oh-my-opencode/src/tools/lsp/ 전체 LSP 도구 분석.
- 각 도구의 인터페이스
- LSP client 연결 방식
- 결과 포맷팅
핵심 구현 패턴을 추출해줘."
```

---

## 실행 프롬프트

### 프롬프트 시작

SuperCode의 LSP Tools를 확장해주세요. 기존 4개 도구에 6개를 추가합니다.

**참조 프로젝트**:
- `/Users/supercent/Documents/Github/oh-my-opencode/src/tools/lsp/`
- `/Users/supercent/Documents/Github/supercode/src/core/tools/lsp/` (기존)

**구현 위치**: `src/core/tools/lsp/`

**기존 도구** (유지):
- hover.ts
- goto.ts
- references.ts
- rename.ts

**추가할 도구들**:

1. **src/core/tools/lsp/codeActions.ts**
```typescript
// lsp_code_actions
// Get available code actions (quick fixes, refactorings)
args: {
  file: string,
  line: number,
  character: number,
  diagnostics?: string[]
}
```

2. **src/core/tools/lsp/diagnostics.ts**
```typescript
// lsp_diagnostics
// Get all errors/warnings for a file
args: {
  file: string,
  severity?: 'error' | 'warning' | 'info' | 'hint'
}
```

3. **src/core/tools/lsp/workspaceSymbols.ts**
```typescript
// lsp_workspace_symbols
// Search symbols across workspace
args: {
  query: string,
  limit?: number
}
```

4. **src/core/tools/lsp/documentSymbols.ts**
```typescript
// lsp_document_symbols
// Get all symbols in a file
args: {
  file: string,
  kind?: 'function' | 'class' | 'variable' | 'interface' | 'all'
}
```

5. **src/core/tools/lsp/signatureHelp.ts**
```typescript
// lsp_signature_help
// Get function signature at position
args: {
  file: string,
  line: number,
  character: number
}
```

6. **src/core/tools/lsp/completions.ts** (확장)
```typescript
// lsp_completions
// Get completion suggestions
args: {
  file: string,
  line: number,
  character: number,
  triggerKind?: 'invoked' | 'character' | 'incomplete'
}
```

**공통 유틸리티 필요**:
- `getLSPClient(filePath)` - 언어에 맞는 LSP 클라이언트 반환
- `fileUriFromPath(path)` - file:// URI 변환
- `formatDiagnostics(diagnostics)` - 진단 결과 포맷팅
- `formatSymbols(symbols)` - 심볼 결과 포맷팅

**요구사항**:
- Zod로 args 정의
- 언어별 LSP 자동 선택
- 결과를 읽기 쉬운 형식으로 포맷
- 에러 시 친화적 메시지

**src/core/tools/lsp/index.ts 업데이트**:
```typescript
export * from './hover';
export * from './goto';
export * from './references';
export * from './rename';
export * from './codeActions';
export * from './diagnostics';
export * from './workspaceSymbols';
export * from './documentSymbols';
export * from './signatureHelp';
export * from './completions';
```

기존 supercode 코드 스타일을 따라주세요.

### 프롬프트 끝

---

## 검증 명령

```bash
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep lsp"
```

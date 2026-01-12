# Phase 3: 도구 시스템 개선 - 완료

## 개요
Oh-My-OpenCode의 LSP 및 AST-Grep 도구 시스템을 SuperCode에 통합.

## 완료된 작업

### 3.1 LSP 타입 시스템 (`src/core/tools/lsp/types.ts`)
- Position, Range, Location 인터페이스
- HoverResult, Diagnostic, CodeAction 타입
- WorkspaceEdit, TextEdit 타입
- SymbolInfo, DocumentSymbol 타입
- LSPServerConfig, LSPServerState 타입

### 3.2 LSP 상수 (`src/core/tools/lsp/constants.ts`)
- 31개 언어 서버 설정 (BUILTIN_SERVERS)
- 파일 확장자-언어 매핑 (EXTENSION_LANGUAGE_MAP)
- 심볼 종류/심각도 이름 (SYMBOL_KIND_NAMES, SEVERITY_NAMES)
- 작업 공간 루트 마커 (WORKSPACE_ROOT_MARKERS)
- 설치 힌트 (LSP_INSTALL_HINTS)

### 3.3 LSP 클라이언트 (`src/core/tools/lsp/client.ts`)
- LSPClient 클래스 (JSON-RPC 2.0 메시징)
- LSPServerManager 싱글톤 (서버 풀링, 참조 카운팅)
- withLspClient 헬퍼 함수
- 자동 유휴 정리 (5분 타임아웃)

### 3.4 LSP 유틸리티 (`src/core/tools/lsp/utils.ts`)
- formatHoverResult: 호버 결과 포맷팅
- formatLocations: 위치 목록 포맷팅
- formatDocumentSymbols: 심볼 포맷팅
- formatDiagnostics: 진단 포맷팅
- applyWorkspaceEdit: 다중 파일 편집 적용
- formatCodeActions: 코드 액션 포맷팅

### 3.5 LSP 도구 11개 (`src/core/tools/lsp/tools.ts`)
1. `lsp_hover` - 심볼 문서 조회
2. `lsp_goto_definition` - 정의로 이동
3. `lsp_find_references` - 참조 찾기
4. `lsp_document_symbols` - 문서 심볼 목록
5. `lsp_workspace_symbols` - 작업 공간 심볼 검색
6. `lsp_diagnostics` - 진단 조회
7. `lsp_servers` - 사용 가능한 서버 목록
8. `lsp_prepare_rename` - 이름 변경 준비
9. `lsp_rename` - 이름 변경 실행
10. `lsp_code_actions` - 코드 액션 조회
11. `lsp_code_action_resolve` - 코드 액션 해결

### 3.6 AST-Grep 타입 (`src/core/tools/ast-grep/types.ts`)
- CliMatch, SgResult 인터페이스
- CliLanguage 타입 (25개 언어)
- RunOptions, EnvironmentCheckResult 타입

### 3.7 AST-Grep CLI (`src/core/tools/ast-grep/cli.ts`)
- getAstGrepPath: 바이너리 경로 탐색
- runSg: CLI 실행 및 결과 파싱
- checkEnvironment: 환경 검사
- formatSearchResult, formatReplaceResult: 결과 포맷팅

### 3.8 AST-Grep 도구 3개 (`src/core/tools/ast-grep/tools.ts`)
1. `ast_grep_search` - AST 패턴 검색
2. `ast_grep_replace` - AST 패턴 치환 (dry-run 지원)
3. `ast_grep_check` - 환경 검사

### 3.9 도구 레지스트리 업데이트
- `src/core/tools/adapter.ts`: LSP, AST-Grep 도구 등록
- `src/core/tools/index.ts`: 새 도구 내보내기
- `src/tools/types.ts`: 'code' 카테고리 추가

## 파일 목록

### 신규 생성
```
src/core/tools/lsp/
├── types.ts       - LSP 타입 정의
├── constants.ts   - 서버 설정, 상수
├── client.ts      - LSP 클라이언트
├── utils.ts       - 유틸리티 함수
├── tools.ts       - 11개 도구 정의
└── index.ts       - 모듈 내보내기

src/core/tools/ast-grep/
├── types.ts       - AST-Grep 타입
├── cli.ts         - CLI 래퍼
├── tools.ts       - 3개 도구 정의
└── index.ts       - 모듈 내보내기
```

### 수정됨
```
src/core/tools/adapter.ts  - 도구 등록
src/core/tools/index.ts    - 내보내기 추가
src/tools/types.ts         - 'code' 카테고리
```

## 도구 총계
- 기존: 8개 (bash, read, write, edit, grep, glob, todo_write, todo_read)
- LSP: 11개
- AST-Grep: 3개
- **총합: 22개 도구**

## 검증
```bash
# TypeScript 검사 통과
cd packages/console/core && bun tsc --noEmit
```

## 완료 일시
2026-01-12

# 실행 프롬프트 가이드

> 이 디렉토리의 프롬프트들은 순서대로 실행하여 SuperCode 개선 작업을 수행합니다.

## 멀티 에이전트 워크플로우

각 프롬프트는 다음 패턴으로 실행됩니다:

```
1. Gemini 분석 (선행) → 참조 코드 분석
2. Claude 구현 → 코드 작성
3. Codex 검증 → 테스트 및 빌드
```

## 실행 순서

### Phase 1: Foundation (기반)
```
prompts/phase1/
├── 01-permission-system.md     ← 먼저 실행
└── 02-plugin-architecture.md   ← 다음 실행
```

### Phase 2: Core Features (핵심 기능)
```
prompts/phase2/
├── 01-background-agent-manager.md
├── 02-ralph-loop.md
├── 03-lsp-tools.md
└── 04-session-compaction.md
```

### Phase 3: Advanced (고급 기능)
```
prompts/phase3/
├── 01-sisyphus-orchestrator.md
├── 02-ast-grep.md
├── 03-config-layers.md
└── 04-hook-lifecycle.md
```

### Phase 4: Polish (완성도)
```
prompts/phase4/
├── 01-agent-skills-integration.md
├── 02-documentation.md
└── 03-testing.md
```

## 사용 방법

### 1. Gemini 분석 실행
각 프롬프트 파일의 "사전 준비" 섹션을 먼저 실행:

```bash
# Gemini CLI 사용
ask-gemini "@opencode/packages/opencode/src/permission/ Permission 시스템 분석..."
```

### 2. Claude 구현 실행
프롬프트 파일의 "실행 프롬프트" 섹션을 Claude에게 전달:

```
SuperCode에 Permission System을 구현해주세요...
```

### 3. Codex 검증 실행
각 프롬프트 파일의 "검증 명령" 섹션 실행:

```bash
# Codex CLI 사용
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck"
```

## 체크리스트

### Phase 1 완료 조건
- [ ] Permission System 구현 완료
- [ ] Plugin Architecture 확장 완료
- [ ] typecheck 통과
- [ ] 기본 테스트 통과

### Phase 2 완료 조건
- [ ] Background Agent Manager 구현
- [ ] Ralph Loop 구현
- [ ] LSP Tools 추가 (6개)
- [ ] Session Compaction 고도화
- [ ] 모든 테스트 통과

### Phase 3 완료 조건
- [ ] Sisyphus Orchestrator 고도화
- [ ] AST-Grep 통합
- [ ] Config 5-layer
- [ ] Hook lifecycle 확장
- [ ] 통합 테스트 통과

### Phase 4 완료 조건
- [ ] .agent-skills 통합
- [ ] 문서 정비
- [ ] E2E 테스트
- [ ] 최종 빌드 성공

## 문제 해결

### 타입 에러 발생 시
```bash
# 상세 에러 확인
shell "cd /Users/supercent/Documents/Github/supercode && bun run typecheck 2>&1 | head -50"
```

### 테스트 실패 시
```bash
# 특정 테스트 디버깅
shell "cd /Users/supercent/Documents/Github/supercode && bun test --grep 'permission' --verbose"
```

### 빌드 실패 시
```bash
# 전체 빌드 로그 확인
shell "cd /Users/supercent/Documents/Github/supercode && bun run build 2>&1"
```

## 참조 프로젝트 경로

| 프로젝트 | 경로 |
|----------|------|
| supercode | `/Users/supercent/Documents/Github/supercode` |
| opencode | `/Users/supercent/Documents/Github/opencode` |
| oh-my-opencode | `/Users/supercent/Documents/Github/oh-my-opencode` |
| .agent-skills | `/Users/supercent/Documents/Github/.agent-skills` |

# Phase 1: 프로젝트 구조 비교 - 완료

## 실행일시
2026-01-12

## 비교 결과 요약

### 1. 디렉토리 구조

| 항목 | Oh-My-OpenCode | SuperCode | 일치 |
|------|----------------|-----------|------|
| 소스 코드 | src/ | src/ | O |
| 패키지 | - | packages/ (monorepo) | SuperCode 추가 |
| 테스트 | tests/ | tests/ | O |
| 문서 | docs/ | docs/ | O |
| CLI | src/cli/ | src/cli/ | O |
| 에이전트 | src/agents/ | src/services/agents/ | O (경로 다름) |
| 훅 | src/hooks/ | src/core/hooks/ | O (경로 다름) |
| 도구 | src/tools/ | src/core/tools/ | O (경로 다름) |
| 인증 | src/auth/ | src/services/auth/ | O (경로 다름) |

### 2. 빌드 시스템

| 항목 | Oh-My-OpenCode | SuperCode | 비고 |
|------|----------------|-----------|------|
| 런타임 | Bun | Bun | 동일 |
| 패키지 매니저 | Bun | Bun 1.3.5 | 동일 |
| 빌드 도구 | Bun bundler | Turbo + Bun | SuperCode 확장 |
| 타입 체크 | TypeScript | TypeScript | 동일 |
| 모노레포 | X | Turbo workspaces | SuperCode 추가 |

### 3. 설정 시스템

| 항목 | Oh-My-OpenCode | SuperCode | 일치 |
|------|----------------|-----------|------|
| 스키마 검증 | Zod | Zod | O |
| 설정 파일 | JSONC | JSON | 유사 |
| 환경 설정 | XDG 기반 | 프로젝트 기반 | 다름 |

### 4. 진입점

| 진입점 | Oh-My-OpenCode | SuperCode | 비고 |
|--------|----------------|-----------|------|
| CLI | src/cli/index.ts | src/cli/index.ts | 동일 |
| 라이브러리 | src/index.ts (Plugin) | src/supercoin.ts | 다름 |
| 서버 | - | packages/server/ | SuperCode 추가 |

---

## 핵심 차이점

### SuperCode 장점
1. **Monorepo 구조**: Turbo 기반 워크스페이스로 확장성 높음
2. **Desktop 앱**: Tauri 기반 데스크톱 앱 지원
3. **Web Console**: Solid.js 기반 웹 콘솔
4. **서버 패키지**: Hono 기반 HTTP 서버
5. **더 구조화된 디렉토리**: services/, core/ 분리

### Oh-My-OpenCode 장점
1. **OpenCode 플러그인**: Claude Code 플러그인으로 동작
2. **더 많은 훅**: 40+ 훅 (SuperCode: 22+)
3. **다양한 모델 지원**: 모델별 폴백 전략
4. **Ralph Loop**: 자율 실행 루프

---

## 검증 상태

| 항목 | 상태 |
|------|------|
| 디렉토리 구조 | PASS |
| 빌드 시스템 | PASS |
| 설정 시스템 | PASS |
| 진입점 | PASS |

**Phase 1 완료**: 프로젝트 구조가 유사하며, SuperCode가 더 확장된 형태

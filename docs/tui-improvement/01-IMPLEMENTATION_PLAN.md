# SuperCoin TUI 개선 구현 계획

> **Version**: 1.0.0
> **최종 업데이트**: 2026-01-12
> **목표**: OpenCode 수준의 Text UI 달성

---

## Implementation Plan

### Priority 1: Critical (기반 구축)

- [ ] TUI 프레임워크 마이그레이션
  - [ ] @opentui/solid, @opentui/core, solid-js 의존성 설치
  - [ ] tsconfig.json SolidJS JSX 설정
  - [ ] 빌드 스크립트 업데이트 (bun build)
  
- [ ] 프로바이더 계층 구조 구현
  - [ ] `src/tui/context/exit.tsx` - 앱 종료 관리
  - [ ] `src/tui/context/route.tsx` - 라우팅 시스템
  - [ ] `src/tui/context/theme.tsx` - 테마 관리
  - [ ] `src/tui/context/kv.tsx` - 로컬 스토리지
  - [ ] `src/tui/context/keybind.tsx` - 키바인딩

- [ ] 기본 App 컴포넌트 (`src/tui/app.tsx`)
  - [ ] 프로바이더 중첩 구조
  - [ ] 에러 바운더리
  - [ ] 라우트 스위치 (Home/Session)

### Priority 2: High (핵심 UI)

- [ ] Home 라우트 (`src/tui/routes/home.tsx`)
  - [ ] 로고 컴포넌트 표시
  - [ ] 프롬프트 입력 영역
  - [ ] 상태 표시줄 (MCP, 버전)
  - [ ] 힌트/팁 영역

- [ ] Session 라우트 (`src/tui/routes/session/`)
  - [ ] `index.tsx` - 메인 세션 뷰
  - [ ] `header.tsx` - 세션 헤더
  - [ ] `footer.tsx` - 푸터 (키바인드 힌트)
  - [ ] 메시지 리스트 뷰

- [ ] 프롬프트 컴포넌트 (`src/tui/component/prompt/`)
  - [ ] `index.tsx` - 메인 프롬프트
  - [ ] 텍스트 입력 처리
  - [ ] 멀티라인 지원
  - [ ] 제출 처리

- [ ] 다이얼로그 시스템 (`src/tui/ui/dialog.tsx`)
  - [ ] DialogProvider 컨텍스트
  - [ ] 기본 다이얼로그 컴포넌트
  - [ ] dialog.show(), dialog.clear() API

### Priority 3: Medium (고급 기능)

- [ ] 테마 시스템 구현
  - [ ] `src/tui/context/theme/` 폴더 구조
  - [ ] 5개 기본 테마 (catppuccin, dracula, nord, monokai, tokyo-night)
  - [ ] ThemeProvider 컴포넌트
  - [ ] 다크/라이트 모드 감지

- [ ] 키바인딩 시스템
  - [ ] 기본 키바인딩 정의
  - [ ] KeybindProvider 컴포넌트
  - [ ] 단축키 매핑 (Ctrl+X, Ctrl+K 등)

- [ ] 커맨드 팔레트 (`src/tui/component/dialog-command.tsx`)
  - [ ] 커맨드 레지스트리
  - [ ] 검색/필터 기능
  - [ ] 카테고리별 그룹화

- [ ] 토스트 알림 (`src/tui/ui/toast.tsx`)
  - [ ] ToastProvider
  - [ ] toast.show() API
  - [ ] 자동 사라짐 타이머

### Priority 4: Low (완성도)

- [ ] 세션 UI 완성
  - [ ] 사이드바 (`sidebar.tsx`)
  - [ ] 타임라인 뷰 (`dialog-timeline.tsx`)
  - [ ] 메시지 상세 (`dialog-message.tsx`)

- [ ] 프롬프트 고급 기능
  - [ ] `history.tsx` - 히스토리 네비게이션
  - [ ] `autocomplete.tsx` - 자동완성
  - [ ] `frecency.tsx` - 빈도 기반 정렬
  - [ ] `stash.tsx` - 임시 저장

- [ ] 추가 다이얼로그
  - [ ] DialogModel - 모델 선택
  - [ ] DialogAgent - 에이전트 선택
  - [ ] DialogSessionList - 세션 목록
  - [ ] DialogThemeList - 테마 선택
  - [ ] DialogStatus - 상태 표시

- [ ] 전체 테마 확장 (31개)

## Completed

- [x] 분석 보고서 작성 (00-analysis.md)
- [x] 구현 계획 작성 (01-IMPLEMENTATION_PLAN.md)
- [x] TUI 프레임워크 설정 (React/Ink)
- [x] 컨텍스트 시스템 구현 (Theme, Route, Dialog, Toast, Command)
- [x] UI 컴포넌트 구현 (Logo, Border, Prompt, Toast, CommandPalette)
- [x] 라우트 구현 (Home, Session)
- [x] CLI 통합 (`supercoin tui`, `--classic` 플래그)
- [x] 5개 테마 구현 (catppuccin, dracula, nord, tokyo-night, monokai)
- [x] README.md 업데이트
- [x] 검증 보고서 작성 (04-verification-report.md)

---

## 파일 구조 (목표)

```
src/tui/
├── app.tsx                     # 메인 앱 엔트리포인트
├── index.ts                    # TUI 내보내기
├── context/                    # 컨텍스트 프로바이더들
│   ├── exit.tsx               # 앱 종료 관리
│   ├── route.tsx              # 라우팅
│   ├── kv.tsx                 # 로컬 스토리지
│   ├── keybind.tsx            # 키바인딩
│   ├── prompt.tsx             # 프롬프트 ref
│   ├── sync.tsx               # 데이터 동기화
│   ├── local.tsx              # 로컬 상태
│   └── theme/                 # 테마 시스템
│       ├── theme.tsx          # ThemeProvider
│       ├── catppuccin.json
│       ├── dracula.json
│       ├── nord.json
│       ├── monokai.json
│       └── tokyo-night.json
├── routes/                     # 라우트 컴포넌트들
│   ├── home.tsx               # 홈 화면
│   └── session/               # 세션 화면
│       ├── index.tsx
│       ├── header.tsx
│       ├── footer.tsx
│       ├── sidebar.tsx
│       └── dialog-*.tsx
├── component/                  # 재사용 컴포넌트
│   ├── logo.tsx               # 로고
│   ├── border.tsx             # 테두리
│   ├── prompt/                # 프롬프트 시스템
│   │   ├── index.tsx
│   │   ├── history.tsx
│   │   ├── autocomplete.tsx
│   │   └── stash.tsx
│   ├── dialog-command.tsx     # 커맨드 팔레트
│   ├── dialog-model.tsx       # 모델 선택
│   ├── dialog-agent.tsx       # 에이전트 선택
│   ├── dialog-session-list.tsx
│   └── dialog-theme-list.tsx
├── ui/                         # 기본 UI 컴포넌트
│   ├── dialog.tsx             # 다이얼로그 베이스
│   ├── toast.tsx              # 토스트 알림
│   ├── spinner.tsx            # 로딩 스피너
│   └── dialog-*.tsx           # 유틸리티 다이얼로그
└── util/                       # 유틸리티
    ├── clipboard.ts           # 클립보드
    ├── terminal.ts            # 터미널 유틸
    └── editor.ts              # 에디터 연동
```

---

## 의존성 추가

```bash
# 핵심 의존성
bun add @opentui/solid @opentui/core solid-js

# 유틸리티
bun add open  # URL 열기
```

### tsconfig.json 수정

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js"
  }
}
```

---

## 마이그레이션 단계별 가이드

### Step 1: 의존성 설치

```bash
cd /Users/jangyoung/Documents/Github/supercoin
bun add @opentui/solid @opentui/core solid-js
```

### Step 2: 기본 구조 생성

```bash
mkdir -p src/tui/{context,routes,component,ui,util}
mkdir -p src/tui/context/theme
mkdir -p src/tui/routes/session
mkdir -p src/tui/component/prompt
```

### Step 3: 컨텍스트 구현 순서

1. `exit.tsx` - 가장 단순, 의존성 없음
2. `kv.tsx` - 로컬 스토리지
3. `route.tsx` - 라우팅
4. `theme.tsx` - 테마 (kv 의존)
5. `keybind.tsx` - 키바인딩

### Step 4: UI 컴포넌트 구현 순서

1. `ui/dialog.tsx` - 다이얼로그 베이스
2. `ui/toast.tsx` - 토스트
3. `component/logo.tsx` - 로고
4. `component/prompt/index.tsx` - 프롬프트

### Step 5: 라우트 구현 순서

1. `routes/home.tsx` - 홈 화면
2. `routes/session/index.tsx` - 세션 기본
3. `routes/session/header.tsx` - 헤더
4. `routes/session/footer.tsx` - 푸터

### Step 6: 메인 앱 통합

1. `app.tsx` - 프로바이더 조합
2. `index.ts` - 내보내기
3. CLI 진입점 연결

---

## 검증 체크리스트

### 기능 검증

- [ ] `supercoin` 실행 시 TUI 표시
- [ ] 홈 화면에서 로고 및 프롬프트 표시
- [ ] 프롬프트 입력 및 제출 동작
- [ ] Ctrl+C로 정상 종료
- [ ] 테마 전환 동작
- [ ] 커맨드 팔레트 (Ctrl+X) 동작
- [ ] 세션 전환 동작
- [ ] 토스트 알림 표시

### 성능 검증

- [ ] 시작 시간 < 500ms
- [ ] 입력 반응 시간 < 50ms
- [ ] 메모리 사용량 < 100MB

### 호환성 검증

- [ ] macOS Terminal.app
- [ ] iTerm2
- [ ] VS Code 터미널
- [ ] tmux 환경

---

**Previous**: [00-analysis.md](./00-analysis.md)
**Next**: [02-context-implementation.md](./02-context-implementation.md)

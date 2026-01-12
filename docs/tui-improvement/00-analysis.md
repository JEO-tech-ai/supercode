# SuperCoin TUI 개선 분석 보고서

> **목표**: OpenCode 수준의 Text UI 및 기능 구현
> **작성일**: 2026-01-12
> **상태**: 분석 완료

---

## 1. 현재 상태 비교

### SuperCoin (현재)

| 항목 | 구현 상태 | 설명 |
|------|-----------|------|
| **UI 프레임워크** | @clack/prompts | 단순 CLI 프롬프트 라이브러리 |
| **라우팅** | ❌ 없음 | 단일 메뉴 루프 |
| **테마** | ❌ 없음 | 하드코딩된 ANSI 색상 |
| **키바인딩** | ❌ 없음 | Ctrl+C만 처리 |
| **다이얼로그** | ❌ 없음 | clack.select만 사용 |
| **프롬프트** | 기본 | clack.text 기반 |
| **세션 UI** | 기본 | 리스트만 표시 |
| **토스트** | ❌ 없음 | clack.log 사용 |
| **커맨드 팔레트** | ❌ 없음 | - |

### OpenCode (타겟)

| 항목 | 구현 상태 | 설명 |
|------|-----------|------|
| **UI 프레임워크** | @opentui/solid | SolidJS 기반 반응형 TUI |
| **라우팅** | ✅ 완전 | Home, Session 등 라우트 시스템 |
| **테마** | ✅ 31개 | JSON 기반 테마 시스템 |
| **키바인딩** | ✅ 완전 | 커스텀 단축키 지원 |
| **다이얼로그** | ✅ 풍부 | 12+ 다이얼로그 타입 |
| **프롬프트** | ✅ 고급 | Autocomplete, History, Frecency |
| **세션 UI** | ✅ 풍부 | 타임라인, Fork, 사이드바 |
| **토스트** | ✅ 완전 | 알림 시스템 |
| **커맨드 팔레트** | ✅ 완전 | Ctrl+K 스타일 |

---

## 2. OpenCode TUI 아키텍처 분석

### 2.1 프로바이더 계층 구조

```
ArgsProvider
  └── ExitProvider
        └── KVProvider (로컬 스토리지)
              └── ToastProvider
                    └── RouteProvider (라우팅)
                          └── SDKProvider (API 통신)
                                └── SyncProvider (데이터 동기화)
                                      └── ThemeProvider (테마)
                                            └── LocalProvider (로컬 상태)
                                                  └── KeybindProvider (키바인딩)
                                                        └── PromptStashProvider
                                                              └── DialogProvider
                                                                    └── CommandProvider
                                                                          └── FrecencyProvider
                                                                                └── PromptHistoryProvider
                                                                                      └── PromptRefProvider
                                                                                            └── App
```

### 2.2 핵심 컴포넌트

1. **라우트 시스템** (`context/route.tsx`)
   - Home: 초기 화면, 로고, 프롬프트
   - Session: 대화 화면, 메시지, 사이드바

2. **다이얼로그 시스템** (`ui/dialog.tsx`, `component/dialog-*.tsx`)
   - DialogModel: 모델 선택
   - DialogAgent: 에이전트 선택
   - DialogSessionList: 세션 목록
   - DialogThemeList: 테마 선택
   - DialogCommand: 커맨드 팔레트
   - DialogStatus: 상태 표시
   - DialogMcp: MCP 서버 관리

3. **프롬프트 시스템** (`component/prompt/`)
   - index.tsx: 메인 프롬프트 컴포넌트
   - autocomplete.tsx: 자동완성
   - history.tsx: 히스토리 관리
   - frecency.tsx: 빈도 기반 정렬
   - stash.tsx: 임시 저장

4. **테마 시스템** (`context/theme/`)
   - 31개 JSON 테마 파일
   - 다크/라이트 모드 자동 감지
   - 실시간 테마 전환

5. **키바인딩 시스템** (`context/keybind.tsx`)
   - 커스텀 단축키 매핑
   - 키 조합 처리 (Ctrl, Alt, Shift)

### 2.3 세션 라우트 구조

```
Session/
├── header.tsx      # 세션 헤더 (제목, 모델 정보)
├── footer.tsx      # 푸터 (상태, 키바인드 힌트)
├── sidebar.tsx     # 사이드바 (세션 목록, 빠른 전환)
├── index.tsx       # 메인 세션 뷰
├── permission.tsx  # 권한 요청 UI
├── question.tsx    # 질문 처리
└── dialog-*.tsx    # 세션 관련 다이얼로그
```

---

## 3. 개선 범위 정의

### Priority 1: Critical (필수)

- [ ] SolidJS + @opentui/solid로 TUI 프레임워크 마이그레이션
- [ ] 라우트 시스템 구현 (Home, Session)
- [ ] 프롬프트 컴포넌트 구현 (기본 입력)
- [ ] 다이얼로그 시스템 기초 구현

### Priority 2: High (중요)

- [ ] 테마 시스템 구현 (최소 5개 테마)
- [ ] 키바인딩 시스템 구현
- [ ] 커맨드 팔레트 구현 (Ctrl+X)
- [ ] 토스트 알림 시스템

### Priority 3: Medium (보통)

- [ ] 세션 UI 개선 (타임라인, 메시지 뷰)
- [ ] 프롬프트 고급 기능 (히스토리, 자동완성)
- [ ] 사이드바 구현
- [ ] 모델/에이전트 선택 다이얼로그

### Priority 4: Low (선택)

- [ ] Frecency 알고리즘
- [ ] 프롬프트 Stash 기능
- [ ] 31개 전체 테마
- [ ] 터미널 제목 관리

---

## 4. 기술 스택 결정

### 선택: SolidJS + @opentui/solid

**이유**:
1. OpenCode와 동일한 기술 스택으로 코드 참조 용이
2. 반응형 UI로 복잡한 상태 관리 가능
3. 높은 성능 (Virtual DOM 없음)
4. 컴포넌트 기반 아키텍처

### 필요 의존성

```json
{
  "dependencies": {
    "@opentui/solid": "^0.x.x",
    "@opentui/core": "^0.x.x",
    "solid-js": "^1.x.x"
  }
}
```

---

## 5. 마이그레이션 전략

### Phase 1: 기반 구축 (1-2일)
1. 의존성 설치 및 빌드 설정
2. 프로바이더 계층 구조 구현
3. 기본 App 컴포넌트

### Phase 2: 핵심 UI (2-3일)
1. Home 라우트 (로고, 프롬프트)
2. Session 라우트 (메시지 뷰)
3. 기본 다이얼로그

### Phase 3: 고급 기능 (2-3일)
1. 테마 시스템
2. 키바인딩
3. 커맨드 팔레트

### Phase 4: 완성 (1-2일)
1. 세션 UI 완성
2. 프롬프트 고급 기능
3. 테스트 및 검증

---

## References

- OpenCode TUI: `packages/opencode/src/cli/cmd/tui/`
- @opentui/solid: https://github.com/anomalyco/opentui
- SolidJS: https://www.solidjs.com/

---

**Next**: [01-IMPLEMENTATION_PLAN.md](./01-IMPLEMENTATION_PLAN.md)

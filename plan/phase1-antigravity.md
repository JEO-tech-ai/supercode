# Phase 1: Google Antigravity 인증 추가

## 목표

기존 다중 프로바이더(Claude, Codex, Gemini)를 유지하면서 Google Antigravity OAuth 인증 추가

---

## 작업 목록

### 1.1 타입 및 상수 정의
- [ ] `src/services/auth/antigravity/types.ts` - 토큰 및 프로젝트 타입
- [ ] `src/services/auth/antigravity/constants.ts` - OAuth 상수

### 1.2 OAuth 구현
- [ ] `src/services/auth/antigravity/oauth.ts` - PKCE, 콜백 서버
- [ ] `src/services/auth/antigravity/token.ts` - 토큰 저장/갱신

### 1.3 프로젝트 컨텍스트
- [ ] `src/services/auth/antigravity/project.ts` - loadCodeAssist API

### 1.4 프로바이더 통합
- [ ] `src/services/auth/antigravity/provider.ts` - AuthProvider 구현
- [ ] `src/services/auth/antigravity/index.ts` - Export 통합

### 1.5 기존 코드 수정
- [ ] `src/services/auth/types.ts` - AuthProviderName 추가
- [ ] `src/services/auth/hub.ts` - AntigravityAuthProvider 등록
- [ ] `src/config/schema.ts` - antigravity 설정

---

## 참조 파일

```
/Users/supercent/Documents/Github/oh-my-opencode/src/auth/antigravity/
├── oauth.ts       (362줄) - PKCE, buildAuthURL, exchangeCode
├── token.ts       (178줄) - 토큰 갱신
├── project.ts     (150줄) - loadCodeAssist API
├── types.ts       (80줄)  - AntigravityTokens 등
├── constants.ts   (30줄)  - CLIENT_ID, SCOPES
└── plugin.ts      (394줄) - OpenCode 통합
```

---

## 검증 방법

```bash
# 로그인 테스트
bun src/cli/index.ts auth login antigravity

# 상태 확인
bun src/cli/index.ts auth status

# 토큰 갱신 테스트
bun src/cli/index.ts auth refresh antigravity
```

---

## 위험 요소

| 위험 | 완화 방안 |
|------|----------|
| OAuth 클라이언트 ID 관리 | 환경 변수 기반 |
| PKCE 보안 | @openauthjs/openauth 라이브러리 활용 |
| 토큰 만료 | 5분 전 사전 갱신 |

---

## 예상 결과

```typescript
// AuthProviderName 확장
type AuthProviderName = "claude" | "codex" | "gemini" | "antigravity";

// AuthHub에서 사용
const authHub = new AuthHub();
await authHub.login("antigravity");
```

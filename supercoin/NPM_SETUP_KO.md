# SuperCoin - npm 패키지 설정 완료 🎉

## 완료된 작업

### 1. npm 패키지 설정 ✅
**package.json 업데이트**:
- `bin` 엔트리 포인트 설정: `"supercoin": "./dist/cli/index.js"`
- npm 메타데이터 추가 (repository, bugs, homepage)
- `files` 필드 추가로 배포 파일 지정
- Node.js 엔진 요구사항: `>=18.0.0`

### 2. 빌드 시스템 구성 ✅
**esbuild 설정**:
- CLI 진입점에 `#!/usr/bin/env node` shebang 추가
- Node.js 플랫폼 타겟으로 빌드
- 실행 권한 자동 부여

### 3. 인터랙티브 TUI (GUI) 추가 ✅
**@clack/prompts 기반 인터랙티브 메뉴**:
```
🪙 SuperCoin - Unified AI CLI Hub

What would you like to do?
❯ 💬 Start Chat
  🔐 Authentication  
  🤖 Models
  ⚙️  Configuration
  🌐 Server
  🩺 Doctor
```

**주요 기능**:
- 프로바이더 선택 (Ollama, LM Studio, Claude, Gemini 등)
- 모델 커스터마이징 프롬프트
- 실시간 스트리밍 응답
- 프로그레스 스피너와 상태 업데이트
- 아름다운 터미널 UI

### 4. 문서화 업데이트 ✅
**README.md 개선**:
- npm 설치 가이드 추가
- 인터랙티브 모드 사용법 설명
- npm 퍼블리싱 가이드 추가
- 모든 예제를 `supercoin` 명령어로 업데이트

## 사용 방법

### 설치

#### npm으로 설치 (권장)
```bash
# 전역 설치
npm install -g supercoin

# 또는 npx로 바로 실행 (설치 불필요)
npx supercoin

# 설치 확인
supercoin --version
```

#### 로컬 개발 (현재)
```bash
# 프로젝트 디렉토리에서
cd /Users/jangyoung/Documents/Github/supercode/supercoin

# 글로벌 심볼릭 링크 생성
npm link

# 이제 어디서든 사용 가능
supercoin
```

### 인터랙티브 모드 (GUI)

#### 실행 방법
```bash
# 인수 없이 실행하면 인터랙티브 메뉴 표시
supercoin
```

#### 화면 구성
```
🪙 SuperCoin - Unified AI CLI Hub

┌  What would you like to do?
│
│  ○ 💬 Start Chat
│    Chat with AI models
│
│  ○ 🔐 Authentication
│    Manage provider authentication
│
│  ○ 🤖 Models
│    List and manage AI models
│
│  ○ ⚙️  Configuration
│    View and edit settings
│
│  ○ 🌐 Server
│    Manage local auth server
│
│  ○ 🩺 Doctor
│    Run system diagnostics
│
└  (Use arrow keys and Enter)
```

#### Chat 플로우
1. **프로바이더 선택**:
   ```
   Select AI provider
   ❯ 🦙 Ollama (Local)        Privacy-first, cost-free
     💻 LM Studio (Local)     Run models locally
     🔧 llama.cpp (Local)     Raw performance
     🤖 Claude (Anthropic)    Requires API key
     ⚡ Codex (OpenAI)        Requires API key
     🔮 Gemini (Google)       Requires API key or OAuth
   ```

2. **모델 커스터마이징** (선택):
   ```
   ┌  Customize model?
   │  ○ Yes  / ● No
   └
   ```

3. **프롬프트 입력**:
   ```
   ┌  Your prompt
   │  Ask me anything...
   └
   ```

4. **응답 스트리밍**:
   ```
   ◆  ollama (llama3:latest) is thinking...
   
   [실시간 스트리밍 응답 출력]
   
   ✔  Complete
   ◇  Tokens: 45 in / 123 out
   ```

### 커맨드라인 모드

#### 직접 프롬프트 전달
```bash
# 기본 프로바이더 사용 (ollama)
supercoin "What is AI?"

# 프로바이더와 모델 지정
supercoin --provider ollama -m llama3 "Explain TypeScript"
supercoin -p anthropic -m claude-opus-4-5 "Write a poem"

# 파라미터 조정
supercoin -t 0.9 --max-tokens 2000 "Creative story"

# 자세한 출력 (토큰 사용량 표시)
supercoin -v "Question"

# 조용한 모드 (프로바이더 정보 숨김)
supercoin -q "Question"
```

#### TUI 비활성화
```bash
# --no-tui 플래그로 인터랙티브 메뉴 건너뛰기
supercoin --no-tui
# 도움말 표시됨
```

### 프로젝트 설정

**opencode.json** 생성:
```json
{
  "provider": "ollama",
  "model": "llama3:latest",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

그 후 간단히 실행:
```bash
supercoin
# 또는
supercoin "Your question"
```

## 테스트 결과

### ✅ 성공한 테스트

1. **npm link**: ✅ 전역 명령어로 설치됨
   ```bash
   $ which supercoin
   /Users/jangyoung/.nvm/versions/node/v22.19.0/bin/supercoin
   ```

2. **도움말 출력**: ✅ 정상 작동
   ```bash
   $ supercoin --help
   Usage: supercoin [options] [command] [prompt...]
   ...
   ```

3. **CLI 모드**: ✅ 프롬프트 인식 및 실행
   ```bash
   $ supercoin "test prompt"
   [supercoin] Provider: ollama | Model: llama3.2
   ```

4. **빌드 결과**: ✅ 실행 가능한 파일 생성
   ```bash
   $ head -3 dist/cli/index.js
   #!/usr/bin/env node
   
   // src/cli/index.ts
   ```

## npm 퍼블리싱 준비

### 퍼블리시 전 체크리스트

1. **버전 업데이트**:
   ```bash
   npm version patch  # 0.1.0 → 0.1.1
   # 또는
   npm version minor  # 0.1.0 → 0.2.0
   # 또는
   npm version major  # 0.1.0 → 1.0.0
   ```

2. **빌드**:
   ```bash
   bun run build
   ```

3. **로컬 테스트**:
   ```bash
   npm link
   supercoin --version
   supercoin "test"
   ```

4. **패키지 내용 확인**:
   ```bash
   npm pack --dry-run
   ```

### 퍼블리시 (준비되면)

```bash
# npm 로그인 (처음 한 번만)
npm login

# 퍼블리시
npm publish

# 확인
npm view supercoin
```

### 설치 테스트

```bash
# 다른 디렉토리에서
npm install -g supercoin

# 또는 npx로
npx supercoin
```

## 주요 변경사항

### package.json
```json
{
  "name": "supercoin",
  "version": "0.1.0",
  "bin": {
    "supercoin": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/JEO-tech-ai/supercode.git",
    "directory": "supercoin"
  }
}
```

### src/cli/index.ts
```typescript
#!/usr/bin/env node

// 인터랙티브 모드 함수 추가
async function runInteractiveMode() {
  clack.intro("🪙 SuperCoin - Unified AI CLI Hub");
  
  const action = await clack.select({
    message: "What would you like to do?",
    options: [
      { value: "chat", label: "💬 Start Chat", hint: "Chat with AI models" },
      { value: "auth", label: "🔐 Authentication", hint: "Manage provider authentication" },
      // ... 더 많은 옵션
    ],
  });
  
  // ... 액션 처리
}

// main 함수에서 프롬프트 없으면 인터랙티브 모드 실행
if (!prompt && options.tui !== false) {
  await runInteractiveMode();
  return;
}
```

### scripts/build.ts
```typescript
build({
  entryPoints: ["./src/cli/index.ts"],
  bundle: true,
  platform: "node",  // neutral → node로 변경
  target: "node18",
  outfile: "./dist/cli/index.js",
  format: "esm",
  // shebang은 소스 파일에 이미 있음
})
```

## 다음 단계

### 즉시 가능
1. **로컬에서 테스트**: `supercoin` 명령어 사용
2. **인터랙티브 모드 체험**: `supercoin` (인수 없이)
3. **ollama 모델 다운로드**: `ollama pull llama3`
4. **채팅 테스트**: `supercoin "Hello AI"`

### npm 퍼블리시 준비 시
1. 버전 업데이트 (`npm version patch`)
2. CHANGELOG.md 작성 (선택)
3. npm 계정 준비
4. `npm publish` 실행

### 추가 개선 가능 사항
1. **설정 마법사**: 첫 실행 시 대화형 설정
2. **대화 히스토리**: 이전 대화 불러오기
3. **즐겨찾기 프롬프트**: 자주 쓰는 프롬프트 저장
4. **테마 선택**: TUI 색상 테마 커스터마이징
5. **플러그인 시스템**: 커스텀 기능 추가

## 파일 구조

```
supercoin/
├── dist/                       # 빌드 결과물 (배포용)
│   └── cli/
│       └── index.js           # 실행 가능한 CLI 진입점
├── src/
│   └── cli/
│       └── index.ts           # 소스 (인터랙티브 모드 포함)
├── package.json                # npm 설정 (bin 포함)
├── scripts/
│   └── build.ts               # esbuild 설정
└── README.md                   # 업데이트된 문서
```

## 커밋 이력

```
82c48d1 - feat: add interactive TUI and npm publishing support
33938e7 - chore: add LICENSE, CONTRIBUTING.md, and .gitignore
9d533c3 - docs: update README for GitHub deployment and fix maxOutputTokens parameter
cad5cd1 - refactor: migrate all agents to use AI SDK streaming
```

## 요약

SuperCoin이 이제 **npm 패키지로 배포 가능**하며, **OpenCode와 유사한 인터랙티브 TUI**를 제공합니다!

**설치 방법**:
- `npm install -g supercoin`
- 또는 `npx supercoin`

**실행 방법**:
- `supercoin` (인터랙티브 GUI)
- `supercoin "question"` (직접 명령)

**준비 완료**! 🚀

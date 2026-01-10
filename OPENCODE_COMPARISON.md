# OpenCode vs SuperCoin: 프로젝트 구조 및 동작 흐름 비교 분석

> **목적**: OpenCode의 아키텍처를 분석하고, SuperCoin을 OpenCode 구조로 개선하되 Cent를 사용하고 localhost를 통해 동작하도록 설계

---

## 📋 목차

1. [OpenCode 프로젝트 구조](#1-opencode-프로젝트-구조)
2. [SuperCoin 현재 구조](#2-supercoin-현재-구조)
3. [핵심 아키텍처 차이점](#3-핵심-아키텍처-차이점)
4. [동작 흐름 비교](#4-동작-흐름-비교)
5. [개선 방향: SuperCoin → OpenCode 구조](#5-개선-방향-supercoin--opencode-구조)
6. [Localhost 모델 통합 가이드](#6-localhost-모델-통합-가이드)
7. [구현 로드맵](#7-구현-로드맵)

---

## 1. OpenCode 프로젝트 구조

### 1.1 전체 디렉토리 구조

```
opencode/
├── packages/
│   ├── opencode/              # 메인 CLI 패키지
│   │   ├── src/
│   │   │   ├── agent/         # Sisyphus 및 서브 에이전트
│   │   │   ├── provider/      # AI 모델 프로바이더 추상화
│   │   │   ├── session/       # 세션 관리 및 LLM 스트리밍
│   │   │   ├── tool/          # 도구 시스템 (bash, file, search 등)
│   │   │   ├── config/        # 설정 로더 (global, project, remote)
│   │   │   ├── auth/          # 인증 관리 (OAuth, API Key)
│   │   │   └── cli/           # CLI 진입점
│   │   └── package.json
│   ├── web/                   # 웹 대시보드 (Next.js)
│   └── models/                # Models.dev 통합
└── docs/
```

### 1.2 핵심 컴포넌트

#### **A. Cent Agent (Main Orchestrator)**

```typescript
// packages/opencode/src/agent/coin.ts
export class CoinAgent {
  async execute(userInput: string, context: SessionContext) {
    // 1. 사용자 입력 분석
    const intent = await this.analyzeIntent(userInput)
    
    // 2. 적절한 서브 에이전트 선택 및 위임
    if (intent.type === 'explore') {
      return await this.delegateToExplore(userInput, context)
    } else if (intent.type === 'implement') {
      return await this.delegateToExecutor(userInput, context)
    }
    
    // 3. 결과 취합 및 사용자에게 응답
    return this.synthesizeResponse(results)
  }
  
  private async delegateToExplore(...) {
    // 서브 에이전트에게 작업 위임
    const exploreAgent = this.registry.get('explore')
    return await exploreAgent.run(...)
  }
}
```

**주요 역할:**
- 사용자 의도 파악 (intent classification)
- 서브 에이전트 오케스트레이션 (delegation)
- 컨텍스트 관리 (session state)
- 결과 통합 (result synthesis)

#### **B. Provider Abstraction (AI 모델 통합)**

```typescript
// packages/opencode/src/provider/provider.ts
export namespace Provider {
  // 프로바이더별 추상화
  const BUNDLED_PROVIDERS: Record<string, (options: any) => SDK> = {
    "@ai-sdk/anthropic": createAnthropic,
    "@ai-sdk/openai": createOpenAI,
    "@ai-sdk/google": createGoogleGenerativeAI,
    "@ai-sdk/openai-compatible": createOpenAICompatible, // Ollama, LM Studio 등
  }
  
  // 모델 로드
  async function getLanguage(model: Model): Promise<LanguageModelV2> {
    const provider = BUNDLED_PROVIDERS[model.api.npm]
    const sdk = provider({
      apiKey: await getApiKey(model.providerID),
      baseURL: model.api.url
    })
    
    return sdk.languageModel(model.id)
  }
}
```

**핵심 기능:**
- 75+ 프로바이더 지원 (AI SDK 기반)
- OpenAI-compatible API 지원 (Ollama, LM Studio, llama.cpp)
- 런타임 프로바이더 스위칭
- 자동 토큰 관리 및 스트리밍

#### **C. Session Management**

```typescript
// packages/opencode/src/session/session.ts
export class Session {
  id: string
  messages: Message[]
  tools: Tool[]
  context: {
    workdir: string
    model: string
    temperature: number
  }
  
  async stream(input: string) {
    const result = await streamText({
      model: this.getModel(),
      messages: [...this.messages, { role: 'user', content: input }],
      tools: this.tools,
      onFinish: (completion) => {
        this.messages.push({ role: 'assistant', content: completion.text })
      }
    })
    
    return result
  }
}
```

**세션 라이프사이클:**
1. 세션 생성 (`Session.create(workdir, model)`)
2. 메시지 누적 (conversation history)
3. 도구 호출 추적 (tool call history)
4. 세션 저장/복원 (persistence)

#### **D. Tool System**

```typescript
// packages/opencode/src/tool/registry.ts
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()
  
  register(name: string, tool: Tool) {
    this.tools.set(name, tool)
  }
  
  async execute(name: string, args: any, context: ToolContext) {
    const tool = this.tools.get(name)
    return await tool.execute(args, context)
  }
}

// 도구 예시
export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute bash commands',
  parameters: z.object({
    command: z.string(),
    workdir: z.string().optional()
  }),
  execute: async (args, context) => {
    const result = await execCommand(args.command, args.workdir)
    return { stdout: result.stdout, stderr: result.stderr }
  }
}
```

---

## 2. SuperCoin 현재 구조

### 2.1 디렉토리 구조

```
supercoin/
├── src/
│   ├── cli/                   # CLI 커맨드
│   │   ├── commands/
│   │   │   ├── auth.ts       # 인증 관리
│   │   │   ├── models.ts     # 모델 선택
│   │   │   ├── config.ts     # 설정
│   │   │   └── server.ts     # 서버 관리
│   │   └── index.ts
│   ├── services/
│   │   ├── auth/             # 인증 서비스
│   │   │   ├── hub.ts        # AuthHub (중앙 관리)
│   │   │   ├── claude.ts     # Claude 프로바이더
│   │   │   ├── codex.ts      # Codex 프로바이더
│   │   │   └── gemini.ts     # Gemini 프로바이더
│   │   ├── models/           # 모델 라우터
│   │   │   ├── router.ts     # ModelRouter
│   │   │   └── providers/
│   │   │       ├── anthropic.ts
│   │   │       ├── openai.ts
│   │   │       └── google.ts
│   │   ├── agents/           # 에이전트 시스템
│   │   │   ├── coin.ts       # Coin 에이전트 (메인)
│   │   │   ├── explorer.ts   # 탐색 에이전트
│   │   │   ├── analyst.ts    # 분석 에이전트
│   │   │   ├── executor.ts   # 실행 에이전트
│   │   │   └── registry.ts   # 에이전트 레지스트리
│   │   └── background/
│   │       └── concurrency-manager.ts
│   ├── core/                 # 핵심 시스템
│   │   ├── session.ts        # 세션 관리
│   │   ├── tools/            # 도구 시스템
│   │   │   ├── bash.ts
│   │   │   ├── file.ts
│   │   │   └── search.ts
│   │   └── hooks/            # 훅 시스템
│   ├── server/               # Hono 서버
│   │   ├── routes/
│   │   │   └── auth-callback.ts
│   │   └── store/
│   │       ├── token-store.ts
│   │       └── oauth-state-store.ts
│   ├── config/
│   │   ├── schema.ts         # Zod 스키마
│   │   └── loader.ts         # 설정 로더
│   └── supercoin.ts          # 메인 클래스
├── tests/
└── package.json
```

### 2.2 핵심 클래스: SuperCoin

```typescript
// src/supercoin.ts
export class SuperCoin {
  private config: SuperCoinConfig
  private _auth: AuthHub
  private _models: ModelRouter
  
  async chat(message: string) {
    const response = await this.models.route({
      messages: [{ role: 'user', content: message }]
    })
    return response.content
  }
  
  async runAgent(agentName: string, prompt: string) {
    const agent = this.getAgents().get(agentName)
    return await agent.execute(prompt, { sessionId, workdir })
  }
}
```

### 2.3 현재 모델 통합 방식

```typescript
// src/services/models/router.ts
export class ModelRouter {
  async route(request: ChatRequest): Promise<ChatResponse> {
    const provider = this.getProvider(this.currentModel.provider)
    
    // 각 프로바이더별로 직접 API 호출
    if (provider.name === 'anthropic') {
      return await this.callAnthropic(request)
    } else if (provider.name === 'openai') {
      return await this.callOpenAI(request)
    }
  }
  
  private async callAnthropic(request: ChatRequest) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': await this.auth.getToken('claude'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(...)
    })
    
    return await response.json()
  }
}
```

**문제점:**
- 각 프로바이더마다 개별 구현 필요 (중복 코드)
- 스트리밍 지원 불일치
- 도구 호출 통합 부족
- localhost 모델 지원 어려움

---

## 3. 핵심 아키텍처 차이점

### 3.1 비교표

| 구분 | OpenCode | SuperCoin | 차이점 |
|------|----------|-----------|--------|
 | **메인 에이전트** | Sisyphus | Cent | 이름만 다름, 역할 유사 |
| **모델 통합** | AI SDK + Provider 추상화 | 직접 API 호출 | OpenCode가 훨씬 확장성 높음 |
| **프로바이더 수** | 75+ (Ollama, LM Studio 포함) | 3개 (Claude, Codex, Gemini) | OpenCode가 압도적 |
| **localhost 지원** | ✅ OpenAI-compatible API | ❌ 지원 안 함 | 핵심 차이 |
| **스트리밍** | AI SDK 통합 | 부분 지원 | OpenCode가 안정적 |
| **도구 시스템** | 통합 Tool Registry | 개별 구현 | 유사하지만 OpenCode가 체계적 |
| **설정 시스템** | Remote + Global + Project | Global only | OpenCode가 유연함 |
| **인증** | OAuth + API Key | OAuth + API Key | 유사 (SuperCoin이 최근 개선됨) |

### 3.2 OpenCode의 강점

1. **Provider 추상화**: AI SDK 기반으로 75+ 프로바이더 자동 지원
2. **localhost 모델**: Ollama, LM Studio, llama.cpp 즉시 사용 가능
3. **스트리밍 일관성**: 모든 프로바이더에서 동일한 인터페이스
4. **설정 계층**: Remote → Global → Project → Environment
5. **Models.dev 통합**: 최신 모델 메타데이터 자동 업데이트

### 3.3 SuperCoin의 강점

1. **최신 OAuth 구현**: PKCE + CSRF 보호 (RFC 9700 준수)
2. **Multi-account 지원**: 프로바이더당 최대 10개 계정
3. **TypeScript 타입 안전성**: 강력한 Zod 스키마
4. **경량**: 의존성 최소화 (Bun 기반)

---

## 4. 동작 흐름 비교

### 4.1 OpenCode: 사용자 입력 → 응답

```
[사용자]
  ↓ 입력: "Refactor this function"
  
[CLI 진입점]
  ↓ packages/opencode/src/cli/index.ts
  
[Sisyphus Agent]
  ↓ 의도 분석: "code refactoring" → IMPLEMENT 분류
  ↓ 컨텍스트 로드: 현재 파일, git status, 프로젝트 구조
  
[Provider.getLanguage()]
  ↓ 모델 선택: config.model → "opencode/gpt-5.1-codex"
  ↓ SDK 로드: @ai-sdk/openai
  ↓ 인증: API 키 자동 로드
  
[Session.stream()]
  ↓ System prompt: "You are Sisyphus, an AI coding agent..."
  ↓ 메시지 구성: [system, ...history, user]
  ↓ 도구 등록: { bash, read, write, search, ... }
  ↓ streamText() 호출
  
[AI SDK Streaming]
  ↓ 실시간 응답 스트리밍
  ↓ 도구 호출 감지 → Tool.execute()
  ↓ 결과 반환
  
[Sisyphus]
  ↓ 결과 검증
  ↓ 후속 작업 필요 시 서브 에이전트 호출
  
[사용자]
  ← 응답 출력
```

### 4.2 SuperCoin: 사용자 입력 → 응답

```
[사용자]
  ↓ 입력: "Refactor this function"
  
[CLI 진입점]
  ↓ src/cli/index.ts
  
[SuperCoin.runAgent('coin', prompt)]
  ↓ src/services/agents/coin.ts
  
[Coin Agent]
  ↓ 프롬프트 준비
  
[ModelRouter.route()]
  ↓ src/services/models/router.ts
  ↓ 현재 모델 확인: "anthropic/claude-sonnet-4"
  
[AuthHub.getToken('claude')]
  ↓ src/services/auth/hub.ts → claude.ts
  ↓ TokenStore에서 API 키 로드
  
[AnthropicProvider.callAPI()]
  ↓ src/services/models/providers/anthropic.ts
  ↓ fetch('https://api.anthropic.com/v1/messages', ...)
  ↓ 응답 대기 (non-streaming)
  
[Coin Agent]
  ↓ 결과 반환
  
[사용자]
  ← 응답 출력
```

### 4.3 핵심 차이점

| 단계 | OpenCode | SuperCoin |
|------|----------|-----------|
| **모델 로드** | Provider.getLanguage() (추상화) | 직접 프로바이더 선택 |
| **인증** | 자동 (config + env + auth.json) | AuthHub 수동 호출 |
| **스트리밍** | streamText() (AI SDK) | fetch() 직접 호출 |
| **도구 호출** | 자동 감지 및 실행 | 수동 구현 필요 |
| **에러 처리** | AI SDK 내장 | 각 프로바이더별 구현 |

---

## 5. 개선 방향: SuperCoin → OpenCode 구조

### 5.1 목표

1. ✅ **Sisyphus → Cent 변경**: 에이전트 이름만 변경
2. ✅ **AI SDK 통합**: Provider 추상화 레이어 추가
3. ✅ **localhost 지원**: Ollama, LM Studio 등 로컬 모델 사용
4. ✅ **Zen 모델 제거**: 기본 모델을 localhost로 설정
5. ✅ **스트리밍 개선**: AI SDK의 streamText 활용
6. ✅ **설정 계층화**: Project config 우선순위 추가

### 5.2 새로운 아키텍처

```
supercoin/
├── src/
│   ├── provider/                    # 🆕 AI SDK 기반 프로바이더 추상화
│   │   ├── registry.ts             # 프로바이더 레지스트리
│   │   ├── loaders/
│   │   │   ├── anthropic.ts        # Anthropic 로더
│   │   │   ├── openai.ts           # OpenAI 로더
│   │   │   ├── google.ts           # Google 로더
│   │   │   └── localhost.ts        # 🆕 Localhost 로더 (Ollama, LM Studio)
│   │   └── types.ts
│   ├── session/                     # 🆕 세션 관리 개선
│   │   ├── manager.ts              # 세션 매니저
│   │   ├── llm.ts                  # 🆕 LLM 스트리밍 (AI SDK)
│   │   └── context.ts              # 컨텍스트 관리
│   ├── agents/
│   │   ├── coin.ts                 # ✏️ Sisyphus → Cent (이름 변경)
│   │   ├── explorer.ts
│   │   └── ...
│   ├── config/
│   │   ├── schema.ts               # ✏️ Provider 설정 추가
│   │   └── loader.ts               # ✏️ Project config 우선순위
│   └── ...
└── opencode.json                    # 🆕 Project-level config
```

### 5.3 핵심 변경 사항

#### **A. Provider 추상화 추가**

```typescript
// src/provider/registry.ts
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai-compatible'

export class ProviderRegistry {
  private providers = new Map<string, Provider>()
  
  register(name: string, config: ProviderConfig) {
    let sdk
    
    if (name === 'anthropic') {
      sdk = anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL
      })
    } else if (name === 'localhost') {
      // Ollama, LM Studio 등
      sdk = createOpenAI({
        baseURL: config.baseURL || 'http://localhost:11434/v1',
        apiKey: 'dummy' // localhost는 API 키 불필요
      })
    }
    
    this.providers.set(name, { sdk, config })
  }
  
  async getLanguageModel(provider: string, model: string) {
    const p = this.providers.get(provider)
    return p.sdk(model)
  }
}
```

#### **B. LLM 스트리밍 통합**

```typescript
// src/session/llm.ts
import { streamText } from 'ai'

export async function stream(input: StreamInput) {
  const provider = await getProvider(input.model.provider)
  const languageModel = await provider.getLanguageModel(input.model.id)
  
  return streamText({
    model: languageModel,
    messages: input.messages,
    tools: input.tools,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    onFinish: (completion) => {
      saveToSession(completion)
    }
  })
}
```

#### **C. Coin 에이전트 (이름 변경)**

```typescript
// src/agents/coin.ts (기존 coin.ts에서 Sisyphus 로직 통합)
export class CoinAgent implements Agent {
  name = 'coin'
  
  async execute(prompt: string, context: AgentContext) {
    // Sisyphus와 동일한 오케스트레이션 로직
    const intent = await this.analyzeIntent(prompt)
    
    if (intent.type === 'explore') {
      return await this.delegateToExplore(prompt, context)
    } else if (intent.type === 'implement') {
      return await this.delegateToExecutor(prompt, context)
    }
    
    // 직접 처리
    return await this.handleDirectly(prompt, context)
  }
  
  private async handleDirectly(prompt: string, context: AgentContext) {
    const session = getSession(context.sessionId)
    
    // AI SDK 스트리밍 사용
    const result = await stream({
      model: { provider: 'localhost', id: 'llama3' },
      messages: session.messages.concat({ role: 'user', content: prompt }),
      tools: session.tools
    })
    
    return result
  }
}
```

---

## 6. Localhost 모델 통합 가이드

### 6.1 설정 파일 구조

```jsonc
// opencode.json (프로젝트 루트)
{
  "$schema": "https://opencode.ai/config.json",
  "model": "localhost/llama3:latest",           // 기본 모델을 localhost로 설정
  "small_model": "localhost/qwen2.5-coder:7b",  // 경량 작업용 모델
  
  "provider": {
    "localhost": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Ollama",
      "options": {
        "baseURL": "http://localhost:11434/v1"  // Ollama 기본 포트
      },
      "models": {
        "llama3:latest": {
          "name": "Llama 3 70B (local)",
          "capabilities": {
            "temperature": true,
            "reasoning": true,
            "toolcall": true,
            "input": { "text": true },
            "output": { "text": true }
          },
          "limit": {
            "context": 32768,
            "output": 4096
          }
        },
        "qwen2.5-coder:7b": {
          "name": "Qwen 2.5 Coder 7B (local)",
          "capabilities": {
            "temperature": true,
            "toolcall": true,
            "input": { "text": true },
            "output": { "text": true }
          },
          "limit": {
            "context": 8192,
            "output": 2048
          }
        }
      }
    }
  }
}
```

### 6.2 Ollama 설정 방법

```bash
# 1. Ollama 설치 (macOS)
brew install ollama

# 2. Ollama 서비스 시작
ollama serve

# 3. 모델 다운로드
ollama pull llama3:latest
ollama pull qwen2.5-coder:7b

# 4. API 엔드포인트 확인
curl http://localhost:11434/v1/models
```

**응답 예시:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "llama3:latest",
      "object": "model",
      "owned_by": "library"
    }
  ]
}
```

### 6.3 LM Studio 설정 방법

```jsonc
{
  "provider": {
    "lmstudio": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LM Studio (local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"  // LM Studio 기본 포트
      },
      "models": {
        "qwen3-coder": {
          "name": "Qwen3-Coder (LM Studio)",
          "limit": {
            "context": 32768,
            "output": 8192
          }
        }
      }
    }
  }
}
```

**LM Studio 시작:**
1. LM Studio 앱 실행
2. "Local Server" 탭 선택
3. "Start Server" 클릭
4. 포트 1234에서 OpenAI-compatible API 제공

### 6.4 llama.cpp 설정 방법

```bash
# 1. llama.cpp 빌드
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# 2. 모델 다운로드 (GGUF 포맷)
mkdir models
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf -P models/

# 3. 서버 시작
./llama-server -m models/llama-2-7b-chat.Q4_K_M.gguf --port 8080 --host 127.0.0.1
```

**SuperCoin 설정:**
```jsonc
{
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama-server (local)",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1"
      },
      "models": {
        "llama-2-7b-chat": {
          "name": "Llama 2 7B Chat (local)",
          "limit": {
            "context": 4096,
            "output": 2048
          }
        }
      }
    }
  }
}
```

---

## 7. 구현 로드맵

### Phase 1: Provider 추상화 레이어 추가 (1주)

**작업 항목:**
- [ ] AI SDK 의존성 추가 (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, `ai`)
- [ ] `src/provider/registry.ts` 구현
- [ ] `src/provider/loaders/` 각 프로바이더 로더 구현
- [ ] `src/session/llm.ts` 스트리밍 통합
- [ ] 기존 ModelRouter를 Provider 추상화 사용하도록 마이그레이션

**검증:**
```typescript
// 테스트 코드
const provider = new ProviderRegistry()
provider.register('anthropic', { apiKey: 'sk-...' })

const model = await provider.getLanguageModel('anthropic', 'claude-sonnet-4')
const result = await streamText({ model, messages: [...] })

console.log(result.text) // ✅ 응답 출력
```

---

### Phase 2: Localhost 모델 통합 (3일)

**작업 항목:**
- [ ] `opencode.json` 스키마 정의
- [ ] Localhost provider 로더 구현
- [ ] Ollama 연동 테스트
- [ ] LM Studio 연동 테스트
- [ ] 설정 파일 로더에서 localhost 우선순위 처리

**검증:**
```bash
# Ollama 시작
ollama serve
ollama pull llama3

# SuperCoin 실행
supercoin chat "Hello world"
# → localhost/llama3 모델로 응답
```

---

### Phase 3: Coin 에이전트 통합 (5일)

**작업 항목:**
- [ ] 기존 `coin.ts`에 Sisyphus 로직 통합
- [ ] 서브 에이전트 위임 로직 구현
- [ ] 세션 컨텍스트 관리 개선
- [ ] 도구 호출 자동화 (AI SDK tools)
- [ ] 에러 핸들링 및 재시도 로직

**검증:**
```typescript
const coin = new SuperCoin({ config })
await coin.initialize()

const result = await coin.runAgent('coin', 'Refactor this function to use async/await')
// → Coin이 코드 분석, 리팩토링 제안, 파일 수정까지 자동 수행
```

---

### Phase 4: 설정 계층화 (3일)

**작업 항목:**
- [ ] Project config (`opencode.json`) 우선순위 추가
- [ ] Global config (`~/.config/supercoin/config.json`) 지원
- [ ] Environment variable 오버라이드
- [ ] 설정 병합 로직 (remote → global → project → env)

**우선순위:**
```
Environment Variables (최우선)
  ↓
Project Config (opencode.json)
  ↓
Global Config (~/.config/supercoin/config.json)
  ↓
Default Values
```

---

### Phase 5: 테스트 및 문서화 (5일)

**작업 항목:**
- [ ] Unit tests (provider, session, llm)
- [ ] Integration tests (Ollama, LM Studio)
- [ ] E2E tests (전체 워크플로우)
- [ ] README 업데이트 (localhost 설정 가이드)
- [ ] Migration guide (기존 SuperCoin → 새 구조)

---

## 8. 예상 파일 변경 사항

### 8.1 새로 추가될 파일

```
src/
├── provider/
│   ├── registry.ts                 # 🆕 프로바이더 레지스트리
│   ├── types.ts                    # 🆕 타입 정의
│   └── loaders/
│       ├── anthropic.ts            # 🆕 Anthropic 로더
│       ├── openai.ts               # 🆕 OpenAI 로더
│       ├── google.ts               # 🆕 Google 로더
│       └── localhost.ts            # 🆕 Localhost 로더
├── session/
│   └── llm.ts                      # 🆕 LLM 스트리밍 (AI SDK)
└── config/
    └── project-loader.ts           # 🆕 Project config 로더
```

### 8.2 수정될 파일

```
src/
├── agents/
│   └── coin.ts                     # ✏️ Sisyphus 로직 통합
├── services/
│   └── models/
│       └── router.ts               # ✏️ Provider 추상화 사용
├── config/
│   ├── schema.ts                   # ✏️ Provider 설정 추가
│   └── loader.ts                   # ✏️ 계층화된 설정 로드
└── supercoin.ts                    # ✏️ Provider 초기화
```

### 8.3 제거될 파일

```
src/services/models/providers/
├── anthropic.ts                    # ❌ 제거 (Provider로 대체)
├── openai.ts                       # ❌ 제거
└── google.ts                       # ❌ 제거
```

---

## 9. 마이그레이션 체크리스트

### 사용자 관점 (Breaking Changes)

- [ ] **설정 파일 변경**: `config.toml` → `opencode.json`
- [ ] **모델 ID 형식**: `anthropic/claude-sonnet-4` → `localhost/llama3`
- [ ] **CLI 명령어**: 기존과 동일 (호환성 유지)
- [ ] **인증**: 기존 토큰 스토어 유지 (변경 없음)

### 개발자 관점

- [ ] **의존성 추가**: AI SDK 패키지 설치
- [ ] **API 변경**: `ModelRouter.route()` → `Provider.getLanguageModel()`
- [ ] **스트리밍**: 직접 fetch → `streamText()`
- [ ] **에러 처리**: AI SDK 에러 타입 사용

---

## 10. FAQ

### Q1: 왜 OpenCode 구조를 따라야 하나요?

**A:** OpenCode는 이미 75+ 프로바이더를 지원하는 검증된 아키텍처입니다. AI SDK를 활용하면:
- localhost 모델을 즉시 사용 가능
- 프로바이더별 API 차이를 신경 쓸 필요 없음
- 스트리밍, 도구 호출, 에러 처리가 통합됨
- 새로운 프로바이더 추가가 매우 쉬움

### Q2: Sisyphus → Cent으로 이름만 바꾸면 되나요?

**A:** 거의 맞습니다. 핵심 로직은 동일하게 유지하되, SuperCoin의 기존 아키텍처와 잘 통합하는 것이 중요합니다. Coin은:
- Sisyphus의 오케스트레이션 로직을 그대로 사용
- SuperCoin의 Provider 추상화와 통합
- localhost 모델을 기본으로 사용

### Q3: 기존 사용자의 설정은 어떻게 마이그레이션하나요?

**A:** 자동 마이그레이션 스크립트 제공:
```bash
supercoin migrate-config
# → config.toml → opencode.json 자동 변환
# → 기존 API 키 유지
# → localhost 모델 추천
```

### Q4: Zen 모델 없이도 괜찮나요?

**A:** 네, 문제없습니다. Zen은 편의성을 위한 것이고, localhost 모델로도 충분히 강력합니다:
- Llama 3 70B: GPT-4급 성능
- Qwen 2.5 Coder: 코딩 특화
- 비용 무료 (로컬 실행)
- 프라이버시 보장

---

## 11. 결론

OpenCode의 아키텍처를 SuperCoin에 통합하면:

✅ **확장성**: 75+ 프로바이더 즉시 지원  
✅ **localhost 우선**: Ollama, LM Studio로 무료 사용  
✅ **스트리밍 개선**: AI SDK의 안정적인 스트리밍  
✅ **Sisyphus → Cent**: 검증된 오케스트레이션 로직  
✅ **호환성**: 기존 인증, 설정 시스템 유지

**다음 단계**: Phase 1부터 시작하여 5주 내 완료 목표

# Plan: Provider Abstraction Layer

> **Priority**: 🔴 Critical | **Phase**: 1 | **Duration**: 1 week

---

## Objective

Replace direct API calls with a unified Provider Abstraction Layer using the Vercel AI SDK, enabling:
- 75+ provider support
- Localhost model integration (Ollama, LM Studio)
- Consistent streaming interface
- Automatic token management

---

## Current State (SuperCode)

```typescript
// src/services/models/router.ts - Current approach
export class ModelRouter {
  async route(request: ChatRequest): Promise<ChatResponse> {
    if (provider === 'anthropic') {
      return await fetch('https://api.anthropic.com/v1/messages', {...})
    } else if (provider === 'openai') {
      return await fetch('https://api.openai.com/v1/chat/completions', {...})
    }
  }
}
```

**Problems**:
- Each provider requires separate implementation
- Inconsistent streaming support
- No localhost model support
- Duplicated error handling

---

## Target State (OpenCode Pattern)

```typescript
// src/provider/registry.ts - Target approach
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai-compatible'

export class ProviderRegistry {
  private static BUNDLED_PROVIDERS = {
    "@ai-sdk/anthropic": anthropic,
    "@ai-sdk/openai": openai,
    "@ai-sdk/google": google,
    "@ai-sdk/openai-compatible": createOpenAI,
  }
  
  async getLanguageModel(provider: string, model: string) {
    const sdk = this.BUNDLED_PROVIDERS[provider]
    return sdk({ apiKey: await this.getApiKey(provider) }).languageModel(model)
  }
}
```

---

## Implementation Steps

### Step 1: Add AI SDK Dependencies

```bash
bun add ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google @ai-sdk/openai-compatible
```

### Step 2: Create Provider Types

```typescript
// src/provider/types.ts
export interface ProviderConfig {
  name: string
  npm: string
  baseURL?: string
  apiKey?: string
}

export interface ModelConfig {
  id: string
  provider: string
  capabilities: ModelCapabilities
  limits: ModelLimits
}

export interface ModelCapabilities {
  temperature: boolean
  reasoning: boolean
  toolcall: boolean
  vision: boolean
}

export interface ModelLimits {
  context: number
  output: number
}
```

### Step 3: Create Provider Registry

```typescript
// src/provider/registry.ts
export class ProviderRegistry {
  private providers = new Map<string, any>()
  
  register(name: string, config: ProviderConfig): void {
    // Load provider SDK dynamically
  }
  
  async getLanguageModel(provider: string, model: string): Promise<LanguageModelV2> {
    // Return configured model instance
  }
  
  listProviders(): ProviderConfig[] {
    // Return all registered providers
  }
}
```

### Step 4: Create Localhost Provider Loader

```typescript
// src/provider/loaders/localhost.ts
import { createOpenAI } from '@ai-sdk/openai-compatible'

export function createLocalhostProvider(config: LocalhostConfig) {
  return createOpenAI({
    baseURL: config.baseURL || 'http://localhost:11434/v1',
    apiKey: 'dummy', // Localhost doesn't need API key
  })
}

// Supported localhost servers:
// - Ollama: http://localhost:11434/v1
// - LM Studio: http://127.0.0.1:1234/v1
// - llama.cpp: http://127.0.0.1:8080/v1
```

### Step 5: Update LLM Streaming

```typescript
// src/session/llm.ts
import { streamText } from 'ai'

export async function stream(input: StreamInput) {
  const model = await registry.getLanguageModel(input.provider, input.model)
  
  return streamText({
    model,
    messages: input.messages,
    tools: input.tools,
    temperature: input.temperature,
    onFinish: (completion) => {
      saveToSession(input.sessionId, completion)
    }
  })
}
```

### Step 6: Migrate ModelRouter

```typescript
// src/services/models/router.ts - Updated
export class ModelRouter {
  private registry = new ProviderRegistry()
  
  async route(request: ChatRequest): Promise<ChatResponse> {
    const result = await stream({
      provider: this.currentModel.provider,
      model: this.currentModel.id,
      messages: request.messages,
      tools: request.tools,
    })
    
    return result
  }
}
```

---

## File Changes

### New Files
```
src/provider/
├── types.ts           # Type definitions
├── registry.ts        # Provider registry
├── index.ts           # Public exports
└── loaders/
    ├── anthropic.ts   # Anthropic loader
    ├── openai.ts      # OpenAI loader
    ├── google.ts      # Google loader
    └── localhost.ts   # Localhost loader (Ollama, LM Studio)
```

### Modified Files
```
src/services/models/router.ts      # Use ProviderRegistry
src/core/session/manager.ts        # Update streaming
src/agents/cent.ts                 # Update model access
package.json                       # Add AI SDK deps
```

### Deleted Files
```
src/services/models/providers/anthropic.ts  # Replaced
src/services/models/providers/openai.ts     # Replaced
src/services/models/providers/google.ts     # Replaced
```

---

## Configuration Schema

```typescript
// supercode.json schema addition
{
  "provider": {
    "localhost": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Ollama",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "llama3:latest": {
          "name": "Llama 3 70B",
          "limits": { "context": 32768, "output": 4096 }
        }
      }
    }
  }
}
```

---

## Testing Plan

### Unit Tests
- [ ] ProviderRegistry initialization
- [ ] Provider loader for each type
- [ ] Model configuration parsing
- [ ] API key retrieval

### Integration Tests
- [ ] Anthropic streaming
- [ ] OpenAI streaming
- [ ] Ollama localhost streaming
- [ ] Tool calling across providers

### E2E Tests
- [ ] Full conversation with provider switch
- [ ] Localhost model fallback

---

## Success Criteria

- [ ] All existing tests pass
- [ ] Localhost models (Ollama) work correctly
- [ ] Streaming works consistently across providers
- [ ] Tool calling works across providers
- [ ] No breaking changes to CLI interface

---

## Dependencies

- **Requires**: None (first phase)
- **Blocks**: Hook system, Agent improvements

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI SDK breaking changes | High | Pin versions, test thoroughly |
| Ollama API differences | Medium | Test with multiple Ollama versions |
| Token counting variance | Low | Use provider-specific tokenizers |

---

**Owner**: TBD
**Start Date**: TBD
**Target Completion**: TBD

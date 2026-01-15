# Feature Comparison: SuperCode vs OpenCode vs oh-my-opencode

> Comprehensive analysis of feature gaps and enhancement opportunities
> **Updated**: 2026-01-15 (Post-exploration findings)

---

## Executive Summary

| Metric | SuperCode | OpenCode | oh-my-opencode | Target |
|--------|-----------|----------|----------------|--------|
| **Provider Support** | ✅ 7 (AI SDK) | 20+ bundled | N/A (plugin) | 25+ |
| **TUI Framework** | React/Ink | SolidJS | N/A | React/Ink (keep) |
| **Agent Types** | ✅ 7 | 4 | 3 (subagents) | 8+ |
| **Hook System** | Basic | Advanced | 30+ hooks | 30+ |
| **MCP Support** | ✅ Full (bridge) | Full | Enhanced | Full+ |
| **Localhost Models** | ✅ Yes (Ollama/LM Studio) | Yes | N/A | ✅ Done |
| **Claude Code Compat** | Partial | No | Full | Full |
| **Antigravity Auth** | ✅ Yes | No | Yes | ✅ Done |

---

## 1. Core Architecture

### 1.1 Technology Stack

| Component | SuperCode | OpenCode | Gap Analysis |
|-----------|-----------|----------|--------------|
| **Runtime** | Bun 1.3.5 | Bun 1.3.5 | ✅ Same |
| **Package Manager** | Bun + Turborepo | Bun + Turborepo | ✅ Same |
| **TUI Framework** | React/Ink | SolidJS/@opentui/solid | ✅ Keep React/Ink (mature) |
| **AI Integration** | ✅ AI SDK (full registry) | AI SDK (full) | ✅ Already integrated |
| **Server Framework** | Hono | Hono | ✅ Same |
| **Infrastructure** | SST v3 | SST v3 | ✅ Same |

### 1.2 Monorepo Structure

| SuperCode | OpenCode | Notes |
|-----------|----------|-------|
| `src/` | `packages/opencode/src/` | OpenCode has deeper modularization |
| `packages/*` | `packages/*` | Similar workspace structure |
| `infra/` | `infra/` | Both use SST |
| N/A | `packages/plugin/` | 🔴 Need dedicated plugin package |
| N/A | `packages/sdk/` | 🔴 Need SDK package |

---

## 2. AI Provider Integration

### 2.1 Current Provider Support

| Provider | SuperCode | OpenCode | oh-my-opencode |
|----------|-----------|----------|----------------|
| Anthropic/Claude | ✅ AI SDK + OAuth | ✅ Full | ✅ Enhanced |
| OpenAI | ✅ AI SDK + API Key | ✅ Full | ✅ |
| Google/Gemini | ✅ AI SDK + OAuth | ✅ Full | ✅ Antigravity |
| **Ollama (Localhost)** | ✅ Yes | ✅ Yes | N/A |
| **LM Studio** | ✅ Yes | ✅ Yes | N/A |
| **llama.cpp** | ✅ Yes | ✅ Yes | N/A |
| **SuperCent** | ✅ Native | 🔴 No | N/A |
| **OpenAI-Compatible** | ⚠️ Via Ollama | ✅ Yes | N/A |
| Azure OpenAI | 🔴 No | ✅ Yes | N/A |
| AWS Bedrock | 🔴 No | ✅ Yes | N/A |
| Groq | 🔴 No | ✅ Yes | N/A |
| DeepInfra | 🔴 No | ✅ Yes | N/A |
| Vertex AI | 🔴 No | ✅ Yes | N/A |

### 2.2 Provider Abstraction

**SuperCode Implementation** (ALREADY EXISTS):
```typescript
// src/services/models/ai-sdk/registry.ts - Factory/Registry Pattern
const PROVIDER_REGISTRY = {
  anthropic: createAnthropic,
  openai: createOpenAI,
  google: createGoogleGenerativeAI,
  ollama: createOllama,
  'lm-studio': createLMStudio,
  'llama.cpp': createLlamaCpp,
  supercent: createSuperCent,
}

// src/services/models/router.ts - Model Router Pattern
class ModelRouter {
  route(modelId: string): LanguageModel
  aliases: Map<string, string>  // e.g., 'sonnet' -> 'anthropic/claude-sonnet-4-5'
  fallback: Model
}
```

**Gap**: SuperCode has dual systems (legacy + AI SDK) that need unification. OpenCode has 20+ bundled providers.

**Action Required**: 
1. Unify `ProviderName` and `AISDKProviderName` types
2. Add remaining providers (Bedrock, Azure, Vertex, Groq, DeepInfra)

---

## 3. Agent System

### 3.1 Agent Comparison

| Agent Type | SuperCode | OpenCode | oh-my-opencode |
|------------|-----------|----------|----------------|
| **Main Orchestrator** | ✅ Cent | build (default) | N/A |
| **Exploration** | ✅ explore | explore | N/A |
| **Planning** | ⚠️ N/A | plan (read-only) | N/A |
| **General Tasks** | ⚠️ N/A | general | N/A |
| **Librarian** | ✅ librarian | N/A | librarian |
| **Oracle** | ✅ oracle | N/A | oracle |
| **Frontend UI/UX** | ✅ frontend-engineer | N/A | frontend-ui-ux-engineer |
| **Sisyphus** | ✅ sisyphus | N/A | N/A |
| **Document Writer** | ✅ document-writer | N/A | N/A |

### 3.2 Agent Orchestration Patterns

**SuperCode Pattern** (Current):
- ✅ 6-phase Cent orchestrator
- ✅ Event-driven delegation (`src/cli/run/events.ts`)
- ✅ UltraWork high-power mode
- ✅ Background task parallelization
- ✅ Session-scoped context with compaction

**OpenCode Pattern**:
- Agents defined in single registry
- Hook-based delegation
- Session-scoped context

**oh-my-opencode Enhancements to Add**:
- Expert subagent model routing
- Multi-account load balancing
- Ralph Loop autonomous development

**Current Architecture** (ALREADY IMPLEMENTED):
```
┌─────────────────────────────────────────────────────┐
│                   Cent (Orchestrator)               │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ explore │ │librarian│ │  oracle │ │ frontend  │ │
│  │  agent  │ │  agent  │ │  agent  │ │  engineer │ │
│  └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │sisyphus │ │document │ │  plan   │ ← TODO       │
│  │  agent  │ │  writer │ │  agent  │               │
│  └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## 4. Hook System

### 4.1 Hook Categories

| Category | SuperCode | OpenCode | oh-my-opencode |
|----------|-----------|----------|----------------|
| **Session Lifecycle** | Basic | Advanced | ✅ 30+ hooks |
| **Tool Execution** | Basic | Advanced | ✅ Enhanced |
| **Context Management** | ⚠️ Partial | ✅ Full | ✅ Preemptive |
| **Error Recovery** | 🔴 No | ⚠️ Basic | ✅ Resilient |
| **Compaction** | ⚠️ Manual | ✅ Auto | ✅ Preemptive |

### 4.2 oh-my-opencode Hooks to Integrate

| Hook | Purpose | Priority |
|------|---------|----------|
| `ralph-loop` | Autonomous development loop | 🔴 Critical |
| `context-window-monitor` | Preemptive compaction at 85% | 🔴 Critical |
| `anthropic-context-window-limit-recovery` | Error recovery | 🟡 High |
| `session-notification` | Background task completion | 🟡 High |
| `todo-continuation-enforcer` | Task tracking | 🟡 High |
| `tool-output-truncator` | Large output handling | 🟢 Medium |
| `edit-error-recovery` | Edit failure handling | 🟢 Medium |
| `directory-agents-injector` | Auto-load project agents | 🟢 Medium |
| `directory-readme-injector` | Context injection | 🟢 Medium |
| `auto-update-checker` | Version monitoring | 🟢 Medium |

---

## 5. TUI (Terminal User Interface)

### 5.1 Framework Comparison

| Aspect | SuperCode (React/Ink) | OpenCode (SolidJS) |
|--------|----------------------|-------------------|
| **Reactivity** | Virtual DOM | Fine-grained signals |
| **Performance** | Good | Excellent |
| **Bundle Size** | Larger | Smaller |
| **Mouse Support** | Basic | Full |
| **Theme System** | Basic | Dozens of themes |
| **Scrolling** | Basic | Smooth scrollbox |

### 5.2 TUI Features Gap

| Feature | SuperCode | OpenCode | Action |
|---------|-----------|----------|--------|
| Theme Engine | 🔴 No | ✅ 30+ themes | Implement |
| Mouse Events | ⚠️ Basic | ✅ Full | Enhance |
| Syntax Highlighting | ⚠️ Basic | ✅ Shiki | Upgrade |
| Split Panes | 🔴 No | ✅ Yes | Add |
| Agent Status Sidebar | ✅ Yes | ⚠️ Basic | Keep |
| Markdown Rendering | ⚠️ Basic | ✅ Advanced | Upgrade |

---

## 6. MCP (Model Context Protocol)

### 6.1 MCP Implementation

| Feature | SuperCode | OpenCode | oh-my-opencode |
|---------|-----------|----------|----------------|
| **Server Management** | ✅ Basic | ✅ Full | ✅ Enhanced |
| **Built-in Servers** | 🔴 None | ⚠️ Few | ✅ websearch, grep-app |
| **Skill-based MCP** | 🔴 No | 🔴 No | ✅ Playwright, etc. |
| **Server Discovery** | 🔴 No | ⚠️ Manual | ✅ Auto |

### 6.2 oh-my-opencode MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| `websearch-exa` | Web search via Exa AI | 🟡 High |
| `grep-app` | GitHub code search | 🟡 High |
| `context7` | Documentation lookup | 🟢 Medium |

---

## 7. Authentication

### 7.1 Auth Comparison

| Feature | SuperCode | OpenCode | oh-my-opencode |
|---------|-----------|----------|----------------|
| **OAuth PKCE** | ✅ Yes | ✅ Yes | ✅ Enhanced |
| **API Key Storage** | ✅ Secure | ✅ Secure | ✅ Secure |
| **Multi-Account** | ✅ Antigravity | 🔴 No | ✅ Antigravity |
| **Account Rotation** | ✅ Yes | 🔴 No | ✅ Rate limit handling |
| **Google OAuth** | ✅ Yes | ✅ Yes | ✅ Multi-account |
| **Thinking Validation** | ✅ Yes | 🔴 No | ✅ Yes |

### 7.2 Antigravity Auth Features (ALREADY IN SUPERCODE)

Located in `src/services/auth/antigravity/`:
- ✅ Multi-account load balancing (up to 10 accounts per provider)
- ✅ Automatic rate limit detection and account rotation
- ✅ "Thinking" block validation for reasoning models
- ✅ Account health monitoring

---

## 8. Claude Code Compatibility

### 8.1 Compatibility Matrix

| Feature | SuperCode | OpenCode | oh-my-opencode |
|---------|-----------|----------|----------------|
| **settings.json** | ⚠️ Partial | 🔴 No | ✅ Full |
| **~/.claude/commands/** | 🔴 No | 🔴 No | ✅ Yes |
| **~/.claude/agents/** | 🔴 No | 🔴 No | ✅ Yes |
| **Plugin Loading** | 🔴 No | 🔴 No | ✅ Yes |
| **.clauderules** | 🔴 No | ✅ .opencoderules | ✅ Both |
| **Marketplace Plugins** | 🔴 No | 🔴 No | ✅ Namespaced |

### 8.2 Integration Strategy

oh-my-opencode provides a **Claude Code Compatibility Layer** that:
1. Scans `~/.claude/` for plugins, skills, commands
2. Namespaces them (e.g., `plugin:command`)
3. Makes them available in OpenCode sessions

**Action**: Port this compatibility layer to SuperCode

---

## 9. Skill Integration (.agent-skills)

### 9.1 Current Support

| Feature | SuperCode | OpenCode | .agent-skills |
|---------|-----------|----------|---------------|
| **Skill Loading** | ✅ Yes | 🔴 No | ✅ Full |
| **Token Optimization** | ⚠️ Basic | 🔴 No | ✅ 3 formats |
| **Multi-Agent Routing** | ✅ Yes | 🔴 No | ✅ Full |
| **MCP Integration** | ✅ Yes (bridge) | ✅ Yes | ✅ Yes |

### 9.2 SuperCode Skill Features (ALREADY IMPLEMENTED)

Located in `src/features/skill-loader/`:
- ✅ Skill file loading and parsing
- ✅ Integration with agent system
- ⚠️ Token optimization (needs 3-format support: full, compact, toon)

---

## 10. Summary: Priority Actions (REVISED)

### ✅ Already Done (No Action Needed)
- ✅ AI SDK provider abstraction with registry pattern
- ✅ Localhost model support (Ollama, LM Studio, llama.cpp)
- ✅ 7 agents (Cent, explore, librarian, oracle, frontend, sisyphus, document-writer)
- ✅ Antigravity Auth with multi-account support
- ✅ MCP bridge integration
- ✅ Skill loader feature
- ✅ Session compaction

### Critical (Week 1-2)
1. 🔴 Unify ProviderName types (legacy + AI SDK)
2. 🔴 Hook system implementation (Ralph Loop, context-window-monitor)
3. 🔴 Error recovery hooks

### High (Week 3-4)
1. Add remaining providers (Bedrock, Azure, Vertex, Groq, DeepInfra)
2. Claude Code compatibility layer (~/.claude/ loading)
3. Plan agent (read-only exploration)

### Medium (Week 5-6)
1. TUI enhancement (themes, advanced syntax highlighting)
2. Token-optimized skill formats (compact, toon)
3. Additional hooks from oh-my-opencode

### Low (Week 7-8)
1. Documentation polish
2. SDK package extraction
3. Plugin package extraction

---

## 11. Technical Debt

| Issue | Impact | Resolution |
|-------|--------|------------|
| Dual provider systems (legacy + AI SDK) | 🔴 High | Unify types and router |
| Missing cloud providers (Bedrock, Azure) | 🟡 Medium | Add to AI SDK registry |
| No hook system | 🔴 High | Port oh-my-opencode hooks |
| Basic TUI theming | 🟢 Low | Add theme engine |

---

**Last Updated**: 2026-01-15
**Version**: 2.0.0 (Post-exploration revision)

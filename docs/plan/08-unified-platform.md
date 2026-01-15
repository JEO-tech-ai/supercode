# Plan: Unified Platform Integration

> **Priority**: 🟡 High | **Phase**: 4 | **Duration**: 1 week

---

## Objective

Finalize the unification of SuperCode, OpenCode, and oh-my-opencode features into a single, cohesive platform that:
- Matches OpenCode's feature set
- Includes oh-my-opencode's enhancements
- Integrates .agent-skills framework
- Provides seamless developer experience

---

## Unified Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SuperCode Unified                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Provider Abstraction                       │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │ │
│  │  │Anthropic│ │ OpenAI  │ │ Google  │ │ Ollama  │ │LM Studio │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Agent Orchestration                       │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │ │
│  │  │  Cent   │ │ Explore │ │ Oracle  │ │Librarian│ │ Frontend │ │ │
│  │  │(orch)   │ │         │ │         │ │         │ │ Engineer │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  Hook System │ │ MCP Servers  │ │ Skill System │ │ Claude CC  │ │
│  │  (30+ hooks) │ │ (web,git,etc)│ │ (46 skills)  │ │ (compat)   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      TUI / CLI Layer                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │ │
│  │  │ Themes  │ │ Syntax  │ │ Mouse   │ │ Scroll  │ │ Sidebar  │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Checklist

### From OpenCode (✅ Target Complete)
- [x] Provider abstraction (75+ providers)
- [x] Localhost model support
- [x] SolidJS-quality TUI
- [x] Theme engine
- [x] Syntax highlighting (Shiki)
- [x] Client/server architecture
- [x] Agent types (build, plan, explore, general)
- [x] Full MCP support

### From oh-my-opencode (✅ Target Complete)
- [x] Ralph Loop (autonomous development)
- [x] Context Window Monitor
- [x] Error Recovery hooks
- [x] Antigravity Auth (multi-account)
- [x] Session Notification
- [x] Todo Continuation
- [x] Claude Code Compatibility
- [x] Built-in MCP servers

### From .agent-skills (✅ Target Complete)
- [x] 46 skills loaded
- [x] Token-optimized formats
- [x] Multi-agent routing
- [x] Skill query CLI
- [x] MCP integration

### SuperCode Native (✅ Keep)
- [x] Cent orchestrator
- [x] UltraWork mode
- [x] React/Ink TUI (enhanced)
- [x] Agent status sidebar

---

## Integration Points

### 1. Initialization Flow

```typescript
// src/index.ts
async function main() {
  // 1. Load configuration
  const config = await loadConfig()
  
  // 2. Initialize provider abstraction
  await providerRegistry.initialize(config.providers)
  
  // 3. Initialize hook system
  await hookRegistry.initialize()
  hookRegistry.registerBuiltIn(builtInHooks)
  
  // 4. Load Claude Code compatibility
  if (config.claudeCode.enabled) {
    await initializeClaudeCodeCompat()
  }
  
  // 5. Load skills
  if (config.skills.enabled) {
    await skillLoader.loadFromDirectory(config.skills.path)
    await agentRouter.loadConfig(config.skills.agentRoutingPath)
  }
  
  // 6. Initialize MCP servers
  await mcpRegistry.initialize(config.mcp.servers)
  
  // 7. Initialize agents
  await agentRegistry.initialize([
    centAgent,
    exploreAgent,
    oracleAgent,
    librarianAgent,
    planAgent,
    generalAgent,
    frontendEngineerAgent,
    documentWriterAgent,
  ])
  
  // 8. Start TUI or run command
  if (options.tui) {
    await startTUI(config)
  } else {
    await runCommand(options.command)
  }
}
```

### 2. Message Flow

```
User Input
    ↓
[Hook: chat.params]
    ↓
[Skill Matching] → Inject skill context
    ↓
[Agent Router] → Select agents
    ↓
[Cent Orchestrator]
    ↓
[Background Tasks] → explore, librarian (parallel)
    ↓
[Provider Abstraction] → AI SDK streaming
    ↓
[Hook: tool.execute.before]
    ↓
[Tool Execution]
    ↓
[Hook: tool.execute.after]
    ↓
[Hook: chat.message]
    ↓
[Context Window Monitor] → Compact if needed
    ↓
[TUI Rendering]
    ↓
User Output
```

---

## Configuration Schema (Unified)

```jsonc
// supercode.json
{
  "$schema": "https://supercode.dev/schema.json",
  
  // Provider configuration
  "model": "localhost/llama3:latest",
  "small_model": "localhost/qwen2.5-coder:7b",
  
  "provider": {
    "localhost": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Ollama",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {...}
    }
  },
  
  // Agent configuration
  "agents": {
    "cent": { "model": "anthropic/claude-sonnet-4" },
    "oracle": { "model": "openai/gpt-5.2-codex" },
    "explore": { "model": "anthropic/claude-haiku" }
  },
  
  // Hook configuration
  "hooks": {
    "ralph-loop": { "enabled": true, "maxIterations": 100 },
    "context-window-monitor": { "enabled": true, "threshold": 0.85 },
    "error-recovery": { "enabled": true }
  },
  
  // MCP configuration
  "mcp": {
    "servers": {
      "websearch-exa": { "enabled": true },
      "grep-app": { "enabled": true }
    }
  },
  
  // Claude Code compatibility
  "claudeCode": {
    "enabled": true,
    "loadCommands": true,
    "loadAgents": true
  },
  
  // Skills configuration
  "skills": {
    "enabled": true,
    "paths": ["~/.agent-skills"],
    "defaultMode": "toon"
  },
  
  // TUI configuration
  "tui": {
    "theme": "catppuccin",
    "mouseSupport": true,
    "syntaxHighlighting": true
  }
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Each component in isolation
- [ ] Hook triggering
- [ ] Skill loading
- [ ] Agent delegation

### Integration Tests
- [ ] Full message flow
- [ ] Provider switching
- [ ] MCP tool calls
- [ ] Background tasks

### E2E Tests
- [ ] Complete user workflow
- [ ] Ralph Loop completion
- [ ] Multi-agent task
- [ ] Error recovery

---

## Migration Guide

### For SuperCode Users
1. Run `supercode upgrade`
2. Configuration auto-migrates
3. New features available immediately

### For OpenCode Users
1. Install SuperCode
2. Run `supercode migrate --from opencode`
3. Settings imported

### For Claude Code Users
1. Install SuperCode
2. ~/.claude/ auto-detected
3. Commands/agents available with `claude:` prefix

---

## Success Criteria

- [ ] All OpenCode features present
- [ ] All oh-my-opencode hooks working
- [ ] All 46 skills loadable
- [ ] Claude Code plugins compatible
- [ ] Performance equal or better
- [ ] Documentation complete

---

## Timeline Summary

| Week | Phase | Focus |
|------|-------|-------|
| 1-2 | Phase 1 | Provider abstraction, Hook system |
| 3-4 | Phase 2 | Agent orchestration, MCP servers |
| 5-6 | Phase 3 | TUI enhancement, Claude Code compat |
| 7-8 | Phase 4 | Skill integration, Final unification |

---

**Target Version**: SuperCode 1.0.0
**Target Date**: TBD

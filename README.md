# SuperCode

<div align="center">

![SuperCode](https://img.shields.io/badge/SUPERCODE-v0.5.0-blueviolet?style=for-the-badge&logo=supervision&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Agents](https://img.shields.io/badge/AGENTS-10+-orange?style=for-the-badge)](https://github.com/JEO-tech-ai/supercode)
[![Hooks](https://img.shields.io/badge/HOOKS-25+-ff69b4?style=for-the-badge)](https://github.com/JEO-tech-ai/supercode)

**Modern AI-Powered Coding Assistant with OpenCode-Level TUI**

*Privacy-first | Multi-provider | Multi-agent | Open Source*

[Installation](#installation) • [Magic Words](#-the-magic-words) • [Agents](#multi-agent-system) • [Hooks](#-hook-system-25) • [Configuration](#configuration)

</div>

---

## Reviews

> "The Ralph Loop is terrifying. I walked away to get lunch, and when I came back, it had refactored the entire auth service, updated the tests, and was waiting for my approval."
> — *Lead Developer*

> "SuperCode's context-monitor saved me hours of manual context management. It's like having a senior dev who actually understands token limits."
> — *Senior Architect*

---

## Just Skip Reading

### It's the Age of Agents
- **Just paste this repo into your Claude/ChatGPT and ask it to explain.**
- Ask why it's good, what features make it different, and what actually gets better.

### 🪄 The Magic Words

**Don't want to read all this? Just include these keywords in your prompt:**

| Magic Word | Effect |
| :--- | :--- |
| `ultrawork` / `ulw` | **Full Power Mode.** Activates all agents, parallel execution, deep exploration, and relentless execution until 100% completion. |
| `search` / `find` | **Maximized Search.** Triggers Explorer and Librarian agents to crawl your entire codebase. |
| `analyze` / `investigate` | **Deep Analysis.** Multi-phase expert consultation with AST-grep and LSP tools. |
| `ralph mode` / `/ralph` | **Autonomous Loop.** Code → Test → Fail → Refactor → Repeat until Green. |

That's it. The agent figures out the rest automatically.

---

## What is SuperCode?

SuperCode is a **standalone AI-powered coding assistant CLI** designed for developers who demand more than chat capabilities. It is a full multi-agent system built on a React/Ink TUI, featuring a sophisticated hook system that monitors your context, enforces project rules, and automates the tedious parts of engineering.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SuperCode v0.4.1                                                 claude-4  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: @explorer find all React components @src/                            │
│                                                                             │
│  [Explorer] Found 23 React components in src/components/                    │
│     - Button.tsx (42 lines)                                                 │
│     - Modal.tsx (128 lines)                                                 │
│     - ...                                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  > /help                                                                    │
│    / commands  @ files/agents  ! shell  [up][down] history                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture

```
                        ┌───────────────────────────┐
                        │       USER INTERFACE      │
                        │   (React/Ink TUI + CLI)   │
                        └─────────────┬─────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             │                 ORCHESTRATION LAYER             │
             │        (Cent Orchestrator / Sisyphus Agent)     │
             └────────────────────────┬────────────────────────┘
                                      │
    ┌─────────────┬───────────────────┼───────────────────┬─────────────┐
    │   AGENTS    │                   │                   │    TOOLS    │
    │ (Explorer,  │                 HOOKS                 │ (AST-grep,  │
    │  Librarian, │  (Ralph Loop, Context Monitor,        │  LSP, MCP,  │
    │  Frontend)  │   Todo Continuation, Rules Injector)  │  PTY)       │
    └─────────────┴───────────────────┼───────────────────┴─────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             │                 PROVIDER ADAPTER                │
             │    (Anthropic, OpenAI, Google, Ollama/Local)    │
             └─────────────────────────────────────────────────┘
```

---

## Features

### Core Features
- **Multi-Provider Support**: Claude, Codex, Gemini, Ollama, OpenAI, and localhost models
- **Local-First**: Default to Ollama/local LLMs for privacy and cost-free development
- **AI SDK Integration**: Universal provider abstraction powered by Vercel AI SDK
- **Project Configuration**: Per-project settings via `supercode.json`
- **API-based Provider Configuration**: Configure providers via HTTP API without authentication
- **Mouse Support**: Terminal mouse click handling for enhanced TUI interaction
- **Cursor Position Management**: Wide character and Korean text support for accurate cursor positioning

### Provider Configuration API

Configure AI providers without authentication via HTTP API:

```bash
# List all providers
curl http://localhost:3000/provider

# Configure a provider with API key
curl -X POST http://localhost:3000/provider/anthropic \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk-ant-..."}'

# Set current model (no auth required for local models)
curl -X POST http://localhost:3000/provider/model \
  -H "Content-Type: application/json" \
  -d '{"model": "local/llama3.3:latest"}'

# List all available models
curl http://localhost:3000/provider/models

# Reset provider configuration
curl -X DELETE http://localhost:3000/provider/anthropic
```

**Features:**
- Runtime provider configuration without restarts
- API key injection via environment variables
- Model switching with automatic validation
- Support for all providers (anthropic, openai, google, local)

### Local Provider

Native support for local LLM services with OpenAI-compatible API:

```bash
# Use local models (Ollama, LM Studio, llama.cpp)
supercode --provider local --model llama3.3:latest

# Quick aliases
supercode -m llama      # local/llama3.3:latest
supercode -m qwen       # local/qwen2.5-coder:latest
supercode -m deepseek   # local/deepseek-coder-v2:latest
```

**Features:**
- Auto-discovery of models from `/api/tags` and `/models` endpoints
- Context window inference from model names
- Capability detection (coding, vision, long_context)
- Zero authentication required for local services

### Cent Agent - 6-Phase Multi-Agent Orchestrator

Advanced multi-agent coordination system with structured workflow:

| Phase | Name | Description |
|-------|------|-------------|
| 0 | **Intent** | Classify user intent and determine task type |
| 1 | **Context** | Gather relevant codebase context |
| 2 | **Decomposition** | Break complex tasks into subtasks |
| 3 | **Delegation** | Assign subtasks to specialized agents |
| 4 | **Execution** | Execute tasks with appropriate tools |
| 5 | **Verification** | Verify results and ensure completion |

```bash
# Enable Cent agent
supercode --orchestrator cent
```

### Ralph Loop - Autonomous Development Mode

Self-referential development loop for autonomous task completion:

```bash
# Start Ralph Loop
/ralph "implement user authentication with JWT"

# Or use trigger patterns
ralph mode: build the entire feature
ralph loop: refactor all components
```

**Features:**
- Persistent state storage across sessions
- Dual completion detection (`<promise>DONE</promise>` tag)
- Configurable iteration limits (default: 100)
- Session recovery on restart
- Auto-continuation with context preservation

---

## Multi-Agent System

| Agent | Icon | Description | Capabilities |
|-------|------|-------------|--------------|
| **cent** | 🧠 | 6-phase multi-agent orchestrator | coordinate, delegate, verify |
| **explorer** | 🔍 | Fast codebase search & navigation | grep, find, semantic-search |
| **analyst** | 📊 | Architecture & security review | analyze, review, security-scan |
| **librarian** | 📚 | Documentation & package expert | deps, upgrade, audit, docs |
| **frontend** | 🎨 | UI/UX specialist | component, style, accessibility |
| **docwriter** | ✍️ | Technical documentation writer | readme, api-docs, comments |
| **executor** | ⚡ | Command & script execution | shell, npm, docker |
| **reviewer** | 🔬 | Code review & best practices | review, lint, suggest |
| **multimodal** | 👁️ | Image & screenshot analysis | vision, ocr, diagram |
| **sisyphus** | 🔄 | Persistent long-running tasks | long-task, retry, checkpoint |

### Agent Mentions (`@agent`)
```bash
@explorer find all test files
@analyst review the architecture
@frontend create a new button component
@docwriter generate API documentation
@librarian audit dependencies
@multimodal analyze this screenshot
@cent orchestrate complex refactoring
```

---

## ⚓ Hook System (25+)

Hooks are the "superpowers" of SuperCode. They run in the background during every interaction.

### Session & Lifecycle Hooks
| Hook | Description |
|------|-------------|
| `session-recovery` | Auto-recover from session errors |
| `session-lifecycle` | Track session states and metadata |
| `session-notification` | OS notifications when agents go idle |

### Context Window Management
| Hook | Description |
|------|-------------|
| `context-window-monitor` | Real-time token usage tracking |
| `context-window-limit-recovery` | Auto-switch models on limit errors |
| `preemptive-compaction` | Proactive context summarization at 85% |
| `compaction-context-injector` | Preserve critical context during compaction |

### Tool & Validation Hooks
| Hook | Description |
|------|-------------|
| `tool-output-truncator` | Prevent large outputs from bloating context |
| `tool-call-monitor` | Track tool usage statistics |
| `thinking-block-validator` | Validate thinking blocks |
| `edit-error-recovery` | Auto-retry failed file edits |
| `comment-checker` | Prevent excessive AI comments |

### Context Injection Hooks
| Hook | Description |
|------|-------------|
| `rules-injector` | Auto-inject `.claude/rules/` project rules |
| `directory-readme-injector` | Inject relevant README context |
| `directory-agents-injector` | Inject `AGENTS.md` context |
| `prompt-context-injector` | Dynamic context injection |

### Automation Hooks
| Hook | Description |
|------|-------------|
| `ralph-loop` | Autonomous development loop |
| `todo-continuation` | Force completion of all TODO items with countdown and abort detection |
| `keyword-detector` | Detect magic words (ultrawork, search, analyze) |
| `think-mode` | Auto-detect when extended thinking is needed |
| `auto-slash-command` | Automatic slash command handling |
| `background-notification` | Notify on background task completion |
| `agent-usage-reminder` | Encourage specialized agent usage |

### Environment Hooks
| Hook | Description |
|------|-------------|
| `non-interactive-env` | Fix git/tools in non-interactive shells |
| `interactive-bash-session` | Support for interactive terminal tools |
| `empty-message-sanitizer` | Prevent API errors from empty messages |

---

## Advanced TUI

### Slash Commands (`/`)
| Category | Commands |
|----------|----------|
| **Session** | `/new`, `/session`, `/undo`, `/redo`, `/rename`, `/copy`, `/export`, `/timeline`, `/fork` |
| **Navigation** | `/models`, `/agents`, `/theme`, `/provider` |
| **MCP** | `/mcp`, `/mcp:connect`, `/mcp:disconnect`, `/mcp:tools`, `/mcp:resources` |
| **Git** | `/diff`, `/commit`, `/status`, `/log`, `/branch`, `/pr` |
| **Context** | `/compact`, `/context`, `/cost`, `/plan`, `/files` |
| **Agent** | `/spawn`, `/monitor`, `/stop`, `/ralph` |
| **Skills** | `/skills`, `/skill <id>`, `/ultrawork`, `/ulw`, `/gemini`, `/codex`, `/cent` |
| **Debug** | `/bug`, `/doctor`, `/logs`, `/version` |
| **System** | `/help`, `/commands`, `/config`, `/lsp`, `/sidebar`, `/fullscreen`, `/exit` |

### File References (`@`)
```bash
@src/index.ts           # Attach a file
@src/index.ts#10-20     # Attach specific lines
@src/components/        # Attach a directory
@**/*.tsx               # Glob patterns
```

### Shell Mode (`!`)
```bash
! npm install
! git status
! docker ps
```

### Mouse Support

SuperCode now supports terminal mouse interactions:
- **Click to focus**: Click on input areas to focus
- **Click to position**: Click within text to move cursor
- **Double-click**: Select words or trigger actions
- **Drag support**: Select text ranges (when enabled)

### Real-time Monitoring Sidebar

```
┌──────────────────────────────┐
│ Session: Code Review         │
│    abc123...                 │
├──────────────────────────────┤
│ Context                      │
│ [============      ] 68%     │
│ 87,234 / 128k                │
│ Input: 45,123  Output: 42,111│
│ Cost: $0.0234                │
├──────────────────────────────┤
│ Agents (2)                   │
│ [*] explorer     running 45% │
│ [v] analyst      completed   │
├──────────────────────────────┤
│ MCP (3/3)                    │
│ [*] gemini-cli    tools: 12  │
│ [*] codex-cli     tools: 8   │
│ [*] filesystem    tools: 5   │
├──────────────────────────────┤
│ Todo (3/5)                   │
│ [-] Implement auth           │
│ [ ] Add tests                │
│ [v] Setup CI                 │
├──────────────────────────────┤
│ Git                          │
│ Branch: feature/auth         │
│ +2 ~3 ?1                     │
└──────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+X` | Open command palette |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+N` | New session |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Fullscreen |
| `Ctrl+C` | Exit (when prompt empty) |
| `Esc` | Go back / Close dialog |
| `Up/Down` | Navigate history / autocomplete |
| `Tab` | Select autocomplete item |
| `/` | Start slash command |
| `@` | Start file/agent reference |
| `!` | Enter shell mode |

### Themes

- **Catppuccin** (default) - Soothing pastel theme
- **Dracula** - Dark theme with vibrant colors
- **Nord** - Arctic, north-bluish color palette
- **Tokyo Night** - Clean dark theme inspired by Tokyo
- **Monokai** - Classic high-contrast theme

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (**required**)
- [Ollama](https://ollama.com) (recommended for local AI models)

### Quick Install

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/JEO-tech-ai/supercode.git
cd supercode
bun install

# Run
bun src/cli/index.ts
```

### Global Installation

```bash
bun link
supercode --help
```

### For LLM Agents

<details>
<summary>Instructions for LLM Agents (click to expand)</summary>

If you're an LLM Agent helping set up SuperCode, follow these steps:

#### Step 1: Verify Prerequisites
```bash
# Check Bun installation
bun --version  # Should be 1.0+

# Check if Ollama is running (optional, for local models)
curl -s http://localhost:11434/api/tags | head -c 100
```

#### Step 2: Clone and Install
```bash
git clone https://github.com/JEO-tech-ai/supercode.git
cd supercode
bun install
```

#### Step 3: Verify Installation
```bash
# Run doctor to check setup
bun src/cli/index.ts doctor

# Start the TUI
bun src/cli/index.ts
```

#### Step 4: Configure Providers
```bash
# For cloud providers (Anthropic, OpenAI, Google)
supercode auth setup anthropic
supercode auth setup openai
supercode auth setup google

# For local models (Ollama)
ollama pull llama3.3:latest
supercode --provider local --model llama3.3:latest
```

</details>

---

## Usage

### Launch TUI

```bash
# Start the TUI (default)
supercode

# With specific provider and model
supercode --provider anthropic --model claude-4

# Classic mode (legacy @clack/prompts)
supercode --classic
```

### Quick Examples

```bash
# Start with local model (default, privacy-first)
supercode

# Use Claude
supercode --provider anthropic --model claude-4-sonnet

# Use OpenAI
supercode --provider openai --model gpt-4-turbo

# Use Gemini
supercode --provider google --model gemini-2.0-flash

# Use local Ollama models
supercode --provider local --model llama3.3:latest
```

---

## Configuration

### Project Configuration (`supercode.json`)

```jsonc
{
  // Default model for all operations
  "default_model": "local/llama3.3:latest",
  
  // Fallback chain if primary model fails
  "fallback_models": ["anthropic/claude-sonnet-4-5", "google/gemini-3-flash"],
  
  // Provider configuration
  "providers": {
    "local": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1",
      "apiType": "ollama",
      "defaultModel": "llama3.3:latest"
    },
    "anthropic": {
      "enabled": true
      // API key from environment: ANTHROPIC_API_KEY
    }
  },
  
  // Orchestrator settings
  "orchestrator": {
    "enabled": true,
    "defaultOrchestrator": "cent"
  },
  
  // Hook configuration
  "hooks": {
    "ralphLoop": true,
    "todoContinuation": true,
    "contextWindowMonitor": true,
    "commentChecker": true,
    "rulesInjector": true
  },
  
  // Agent settings
  "agents": {
    "default": "explorer",
    "maxConcurrent": 3
  },
  
  // Context management
  "context": {
    "maxTokens": 128000,
    "autoCompact": true,
    "compactionThreshold": 0.85
  }
}
```

### Hook Configuration

Disable specific hooks via configuration:

```jsonc
{
  "disabled_hooks": [
    "session-notification",  // Disable OS notifications
    "comment-checker"        // Allow AI comments
  ]
}
```

Available hooks: `todo-continuation`, `context-window-monitor`, `session-recovery`, `session-notification`, `comment-checker`, `tool-output-truncator`, `directory-agents-injector`, `directory-readme-injector`, `empty-task-response-detector`, `think-mode`, `keyword-detector`, `auto-slash-command`, `background-notification`, `ralph-loop`, `interactive-bash-session`, `non-interactive-env`, `empty-message-sanitizer`, `agent-usage-reminder`, `compaction-context-injector`, `rules-injector`, `preemptive-compaction`, `edit-error-recovery`

---

## Troubleshooting: Doctor Command

If things go wrong, run `supercode doctor`:

```bash
supercode doctor
```

It checks for:
- [x] Bun version compatibility
- [x] API key validity for all configured providers
- [x] Connectivity to local Ollama instances
- [x] Missing optional dependencies (AST-grep, Playwright)
- [x] Permission issues in the current directory
- [x] Configuration file validity

---

## MCP (Model Context Protocol) Integration

SuperCode supports MCP servers for extended capabilities:

```bash
# View MCP status
/mcp

# Connect to a server
/mcp:connect

# List available tools
/mcp:tools
```

### Configuring MCP Servers

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/path/to/workspace"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

---

## Project Structure

```
supercode/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   │   ├── commands/           # CLI command handlers
│   │   ├── components/         # Dashboard components
│   │   └── run/                # Runtime execution
│   ├── tui/                    # Text User Interface
│   │   ├── component/          # Reusable UI components
│   │   ├── context/            # React contexts
│   │   └── routes/             # TUI screens
│   ├── services/               # Business logic
│   │   ├── agents/             # Multi-agent system (10 agents)
│   │   ├── auth/               # Provider authentication
│   │   ├── models/             # AI model management
│   │   └── pty/                # PTY/terminal management
│   ├── core/                   # Core functionality
│   │   ├── hooks/              # Hook system (25+ hooks)
│   │   ├── tools/              # Tool implementations
│   │   ├── session/            # Session management
│   │   └── knowledge/          # Knowledge management
│   └── config/                 # Configuration management
├── packages/                   # Monorepo packages
└── supercode.json              # Project configuration
```

---

## Roadmap

### Completed
- [x] Multi-provider support (Claude, Codex, Gemini, Ollama)
- [x] Advanced TUI with slash commands
- [x] File reference with glob patterns
- [x] Multi-agent system (10 agents)
- [x] Real-time sidebar monitoring
- [x] MCP server integration
- [x] LSP integration panel
- [x] Session state management
- [x] Local LLM provider (Ollama, LM Studio, llama.cpp)
- [x] Cent Agent (6-phase orchestrator)
- [x] Ralph Loop (autonomous mode)
- [x] Hook system (25+ hooks)
- [x] Korean Unicode text input
- [x] Stream monitoring metrics
- [x] Extended keyboard shortcuts (vim/emacs presets)
- [x] Skills System (multi-agent workflow)
- [x] UltraWork mode (multi-agent orchestration)

### In Progress
- [ ] Image paste support
- [ ] Session sharing
- [ ] Git integration (diff view, commit helper)

### Planned
- [ ] Plugin system
- [ ] Voice input support
- [ ] Collaborative sessions (Multi-user)
- [ ] WASM-based sandbox for safe code execution

---

## Development

```bash
# Run in development
bun src/cli/index.ts

# Type check
bun run typecheck

# Run tests
bun test

# Build
bun turbo run build --filter='!@supercoin/desktop'
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

**Note**: All PRs must pass the verification suite.

---

## License

MIT (c) SuperCode Contributors

---

<div align="center">

Made with Bun, React/Ink, and TypeScript

**[GitHub](https://github.com/JEO-tech-ai/supercode)** | **[Documentation](https://supercode.dev/docs)** | **[Discord](https://discord.gg/supercode)**

*"Coding at the speed of thought, verified by the power of agents."*

</div>

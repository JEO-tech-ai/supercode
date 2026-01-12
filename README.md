# SuperCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)

Modern AI-powered coding assistant with an **OpenCode-level** advanced Text User Interface.

**Privacy-first | Multi-provider | Multi-agent | Open Source**

```
+-----------------------------------------------------------------------------+
|  SuperCode v0.4.0                                                 claude-4  |
+-----------------------------------------------------------------------------+
|                                                                             |
|  User: @explorer find all React components @src/                            |
|                                                                             |
|  [Explorer] Found 23 React components in src/components/                    |
|     - Button.tsx (42 lines)                                                 |
|     - Modal.tsx (128 lines)                                                 |
|     - ...                                                                   |
|                                                                             |
+-----------------------------------------------------------------------------+
|  > /help                                                                    |
|    / commands  @ files/agents  ! shell  [up][down] history                  |
+-----------------------------------------------------------------------------+
```

## Features

### Core Features
- **Multi-Provider Support**: Claude, Codex, Gemini, Ollama, OpenAI, and localhost models
- **Local-First**: Default to Ollama/local LLMs for privacy and cost-free development
- **AI SDK Integration**: Universal provider abstraction powered by Vercel AI SDK
- **Project Configuration**: Per-project settings via `supercode.json`

### NEW: Local Provider (v0.4.0)

Native support for local LLM services with OpenAI-compatible API:

```bash
# Use local models (Ollama, LM Studio, llama.cpp)
supercode --provider local --model llama3.3:latest

# Quick aliases
supercode -m llama      # local/llama3.3:latest
supercode -m qwen       # local/qwen2.5-coder:latest
supercode -m deepseek   # local/deepseek-coder-v2:latest
supercode -m mistral    # local/mistral:latest
```

**Features:**
- Auto-discovery of models from `/api/tags` and `/models` endpoints
- Context window inference from model names
- Capability detection (coding, vision, long_context)
- Zero authentication required for local services
- Model caching with 1-minute TTL

### NEW: Cent Agent - 6-Phase Multi-Agent Orchestrator (v0.4.0)

Advanced multi-agent coordination system with structured workflow:

| Phase | Name | Description |
|-------|------|-------------|
| 0 | **Intent** | Classify user intent and determine task type |
| 1 | **Context** | Gather relevant codebase context |
| 2 | **Decomposition** | Break complex tasks into subtasks |
| 3 | **Delegation** | Assign subtasks to specialized agents |
| 4 | **Execution** | Execute tasks with appropriate tools |
| 5 | **Verification** | Verify results and ensure completion |

**Multi-Agent Coordination:**
- Claude (Orchestrator) - Strategic planning and decision making
- Gemini-CLI (Analyst) - Code analysis and research
- Codex-CLI (Executor) - Code generation and execution

```bash
# Enable Cent agent
supercode --orchestrator cent
```

### NEW: Ralph Loop - Autonomous Development Mode (v0.4.0)

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
- Configurable iteration limits
- Session recovery on restart
- Auto-continuation with context preservation

### Advanced TUI (OpenCode-level)

#### Slash Commands (`/`)
| Category | Commands |
|----------|----------|
| **Session** | `/new`, `/session`, `/undo`, `/redo`, `/rename`, `/copy`, `/export`, `/timeline`, `/fork`, `/share` |
| **Navigation** | `/models`, `/agents`, `/theme`, `/provider` |
| **MCP** | `/mcp`, `/mcp:connect`, `/mcp:disconnect`, `/mcp:tools`, `/mcp:resources` |
| **Git** | `/diff`, `/commit`, `/status`, `/log`, `/branch`, `/pr` |
| **Context** | `/compact`, `/context`, `/cost`, `/plan`, `/files` |
| **Agent** | `/spawn`, `/monitor`, `/stop`, `/ralph` |
| **Debug** | `/bug`, `/doctor`, `/logs`, `/version` |
| **System** | `/help`, `/commands`, `/config`, `/lsp`, `/sidebar`, `/fullscreen`, `/exit` |

#### File References (`@`)
```bash
# Attach a file
@src/index.ts

# Attach specific lines
@src/index.ts#10-20
@src/index.ts:10-20   # Alternative syntax

# Attach a directory
@src/components/

# Glob patterns
@**/*.tsx
@src/**/*.test.ts
```

#### Agent Mentions (`@agent`)
```bash
# Use specialized sub-agents
@explorer find all test files
@analyst review the architecture
@frontend create a new button component
@docwriter generate API documentation
@executor run npm install
@reviewer check for security issues
@librarian audit dependencies
@multimodal analyze this screenshot
@cent orchestrate complex refactoring
```

#### Shell Mode (`!`)
```bash
! npm install
! git status
! docker ps
```

### Multi-Agent System

| Agent | Description | Capabilities |
|-------|-------------|--------------|
| **explorer** | Fast codebase search & navigation | grep, find, semantic-search |
| **analyst** | Architecture & security review | analyze, review, security-scan |
| **frontend** | UI/UX specialist | component, style, accessibility |
| **docwriter** | Technical documentation writer | readme, api-docs, comments |
| **executor** | Command & script execution | shell, npm, docker |
| **reviewer** | Code review & best practices | review, lint, suggest |
| **librarian** | Dependency & package management | deps, upgrade, audit |
| **multimodal** | Image & screenshot analysis | vision, ocr, diagram |
| **sisyphus** | Persistent long-running tasks | long-task, retry, checkpoint |
| **cent** | 6-phase multi-agent orchestrator | coordinate, delegate, verify |

### Real-time Monitoring Sidebar

```
+------------------------------+
| Session: Code Review         |
|    abc123...                 |
+------------------------------+
| Context                      |
| [============      ] 68%     |
| 87,234 / 128k                |
| Input: 45,123  Output: 42,111|
| Cost: $0.0234                |
+------------------------------+
| Agents (2)                   |
| [*] explorer     running 45% |
| [v] analyst      completed   |
+------------------------------+
| MCP (3/3)                    |
| [*] gemini-cli    tools: 12  |
| [*] codex-cli     tools: 8   |
| [*] filesystem    tools: 5   |
+------------------------------+
| LSP (2)                      |
| [*] typescript               |
| [*] python                   |
+------------------------------+
| Todo (3/5)                   |
| [-] Implement auth           |
| [ ] Add tests                |
| [v] Setup CI                 |
+------------------------------+
| Files (4)                    |
| M auth.ts        +45 -12     |
| A config.ts      +89         |
| M index.ts       +3  -1      |
+------------------------------+
| Git                          |
| Branch: feature/auth         |
| +2 ~3 ?1                     |
+------------------------------+
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
| `1-7` | Toggle sidebar sections |

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

## Usage

### Launch TUI

```bash
# Start the TUI (default)
supercode

# Or explicitly
supercode tui

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

## Configuration

### Project Configuration (`supercode.json`)

```json
{
  "default_model": "local/llama3.3:latest",
  "fallback_models": ["anthropic/claude-sonnet-4-5", "google/gemini-3-flash"],
  "providers": {
    "local": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1",
      "apiType": "ollama",
      "defaultModel": "llama3.3:latest"
    },
    "anthropic": {
      "enabled": true
    }
  },
  "orchestrator": {
    "enabled": true,
    "defaultOrchestrator": "cent"
  },
  "hooks": {
    "ralphLoop": true
  },
  "agents": {
    "default": "explorer",
    "maxConcurrent": 3
  },
  "context": {
    "maxTokens": 128000,
    "autoCompact": true
  }
}
```

### Provider Configuration

```bash
# Set default provider
supercode config set provider local

# Configure API keys (for cloud providers)
supercode auth setup anthropic
supercode auth setup openai
supercode auth setup google
```

## Project Structure

```
supercode/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   │   ├── commands/           # CLI command handlers
│   │   └── run/                # Runtime execution
│   ├── tui/                    # Text User Interface
│   │   ├── component/          # Reusable UI components
│   │   │   ├── prompt/
│   │   │   │   ├── AdvancedPrompt.tsx   # Main prompt with / @ ! support
│   │   │   │   ├── SlashCommands.tsx    # Slash command menu (60+ commands)
│   │   │   │   ├── FileReference.tsx    # File/agent autocomplete with glob
│   │   │   │   └── History.tsx          # Prompt history
│   │   │   ├── Sidebar.tsx              # Real-time monitoring sidebar
│   │   │   ├── SubAgentMonitor.tsx      # Agent status monitor
│   │   │   ├── MCPPanel.tsx             # MCP server management
│   │   │   ├── LSPPanel.tsx             # LSP server integration
│   │   │   ├── Border.tsx
│   │   │   └── Logo.tsx
│   │   ├── context/            # React contexts
│   │   └── routes/             # TUI screens
│   ├── services/               # Business logic
│   │   ├── agents/             # Multi-agent system (10 agents)
│   │   ├── auth/               # Provider authentication
│   │   ├── models/             # AI model management
│   │   │   └── providers/      # Provider implementations
│   │   │       ├── anthropic.ts
│   │   │       ├── openai.ts
│   │   │       ├── google.ts
│   │   │       └── local.ts    # NEW: Local LLM provider
│   │   └── pty/                # PTY/terminal management
│   ├── core/                   # Core functionality
│   │   ├── hooks/              # Session hooks
│   │   │   └── ralph-loop/     # NEW: Ralph Loop hook
│   │   ├── knowledge/          # Knowledge management
│   │   ├── session/            # Session management
│   │   └── tools/              # Tool implementations
│   ├── agents/                 # Agent definitions
│   │   ├── sisyphus/           # Sisyphus agent
│   │   └── cent/               # NEW: Cent orchestrator agent
│   └── config/                 # Configuration management
├── packages/                   # Monorepo packages
│   ├── ui/                     # Shared UI components
│   ├── server/                 # Server package
│   ├── shared/                 # Shared utilities
│   ├── auth/                   # Authentication
│   └── database/               # Database utilities
├── docs/                       # Documentation
├── tests/                      # Test suites
└── supercode.json              # Project configuration
```

## Themes

### Available Themes
- **Catppuccin** (default) - Soothing pastel theme
- **Dracula** - Dark theme with vibrant colors
- **Nord** - Arctic, north-bluish color palette
- **Tokyo Night** - Clean dark theme inspired by Tokyo
- **Monokai** - Classic high-contrast theme

### Switch Theme

```bash
# Via slash command
/theme

# Or press Ctrl+X and search "theme"
```

## MCP (Model Context Protocol) Integration

SuperCode supports MCP servers for extended capabilities:

```bash
# View MCP status
/mcp

# Connect to a server
/mcp:connect

# List available tools
/mcp:tools

# List resources
/mcp:resources
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

## Development

```bash
# Run in development
bun src/cli/index.ts

# Type check
bun run typecheck

# Run tests
bun test

# Build (excludes desktop package)
bun turbo run build --filter='!@supercoin/desktop'
```

## Roadmap

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
- [ ] Korean Unicode text input
- [ ] Stream monitoring metrics
- [ ] Extended keyboard shortcuts
- [ ] Image paste support
- [ ] Session sharing
- [ ] Git integration (diff view, commit helper)
- [ ] Plugin system
- [ ] Voice input support

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT (c) SuperCode Contributors

---

Made with Bun, React/Ink, and TypeScript

**[GitHub](https://github.com/JEO-tech-ai/supercode)** | **[Documentation](https://supercode.dev/docs)** | **[Discord](https://discord.gg/supercode)**

# SuperCoin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)

Unified AI CLI hub for Claude, Codex, Gemini, SuperCent, and localhost models.

**Privacy-first • Cost-free • Multi-provider • Open Source**


- **Multi-Provider Support**: Seamlessly switch between Claude (Anthropic), Codex (OpenAI), Gemini (Google), SuperCent, and localhost models (Ollama, LM Studio, llama.cpp)
- **Localhost-First**: Default provider is Ollama for privacy and cost-free local development
- **Unified Authentication**: Single hub for managing all provider credentials with OAuth 2.0 + PKCE support
- **Model Router**: Intelligent model selection with automatic fallback
- **AI SDK Integration**: Universal provider abstraction powered by Vercel AI SDK
- **Interactive TUI**: Beautiful command-line interface powered by @clack/prompts
- **Project Configuration**: Per-project settings via `supercoin.json`
- **Extensible**: Advanced hook system (36 hooks) and multi-agent orchestration (9 agents)
- **LSP Integration**: 11 Language Server Protocol tools for code intelligence
- **AST-Grep**: AST-aware code search and transformation



- **Todo Management**: Built-in todowrite/todoread tools for task tracking
- **Agent Dashboard**: Real-time Ink-based TUI dashboard for monitoring agent status and task progress
- **UltraWork Mode**: High-performance mode for complex tasks using high-IQ models and continuous loops
- **Ralph Loop**: Autonomous self-referential development loop that persists until task completion

## Installation

### Install from npm (Recommended)

> **Note**: This package must be published to npm before it can be installed via `npm install -g supercoin`.

```bash
# Publish first (if you are the maintainer)
npm publish

# Then install globally
npm install -g supercoin

# Or use with npx
npx supercoin
```

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Ollama](https://ollama.com) (recommended for local models)
- [Bun](https://bun.sh) (optional, for development only)

### Install from GitHub (Source)

```bash
# Clone repository
git clone https://github.com/JEO-tech-ai/supercoin.git
cd supercoin

# Install dependencies
npm install

# Build project
npm run build

# Install globally (use sudo if needed)
sudo npm install -g .
# Or if you have npm global write permission:
npm link

# Verify installation
supercoin --help
```

> **Note**: This method is recommended as it avoids potential build issues that can occur with direct npm install from git URL.

### Install from GitHub (Development)

```bash
# Clone repository
git clone https://github.com/JEO-tech-ai/supercoin.git
cd supercoin

# Install dependencies
bun install

# Run directly with Bun
bun src/cli/index.ts --help
```

### Build from Source

```bash
# Type check
bun run lint

# Run tests
bun test

# Build (optional - not required with Bun)
bun run build
```

## Quick Start

### Interactive Mode (Default - Chat First)

```bash
# Simply run supercoin without arguments
supercoin

# You'll see an ASCII logo and direct chat prompt:
#
#                      ▄     
# █▀▀ █░░█ █▀▀█ █▀▀▀ █▀▀█  █▀▀▀ █▀▀█ ░▀█▀░ █▀▀▄
# ▀▀█ █░░█ █░░█ █▀▀▀ █▄▄▀  █░░░ █░░█ ░░█░░ █░░█
# ▀▀▀ ░▀▀▀ █▀▀▀ ▀▀▀▀ ▀░▀▀  ▀▀▀▀ ▀▀▀▀ ▀▀▀▀▀ ▀  ▀
#
# 🪙 SuperCoin - Unified AI CLI Hub
#
# | Provider ollama/llama3:latest
# ◆ Type your message, or /help for commands, /menu for options
#
# > Ask me anything... (Ctrl+C to exit)
```

**Interactive Features**:
- Direct chat mode by default (just start typing!)
- Slash commands: `/help`, `/menu`, `/session`, `/auth`, `/models`, `/config`, `/exit`
- ASCII logo display
- Beautiful terminal UI powered by @clack/prompts
- Real-time streaming responses
- Provider auto-detection from project config

### Command-Line Mode

#### Using Localhost Models (Recommended)

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Interactive mode (GUI)
supercoin

# Or direct command-line mode
supercoin "Hello, what is 2+2?"
# Output: Provider: ollama | Model: llama3:latest
#         The answer is 4.

# With flags
supercoin --provider ollama -m llama3 "Explain AI"
```

#### Using API-Based Providers

```bash
# Login to providers
supercoin auth login --gemini      # OAuth or API Key
supercoin auth login --claude      # API Key
supercoin auth login --codex       # API Key

# Chat with specific provider
supercoin --provider anthropic -m claude-sonnet-4-20250514 "Hello"
supercoin --provider google -m gemini-2.0-flash "Hello"
```

#### Disable Interactive Mode

```bash
# Use --no-tui flag to skip interactive menu
supercoin --no-tui
# Shows help instead

# Or provide a prompt directly
supercoin "your question here"
```

#### Project Configuration

Create `supercoin.json` in your project root:

```json
{
  "provider": "ollama",
  "model": "llama3:latest",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

Alternative filenames: `.supercoin.json` (legacy: `opencode.json`, `.opencode.json`)

Then simply run:

```bash
supercoin
# Or
supercoin "Your prompt here"
```

## CLI Usage

### Interactive Mode (Default)

```bash
# Run without arguments to launch chat mode
supercoin

# Direct chat input is shown:
# > Ask me anything...
#
# Use slash commands for navigation:
# /help   - Show available commands
# /menu   - Open menu for advanced options
# /session - Manage sessions
# /auth   - Authentication
# /models - List models
# /config - Configuration
# /exit   - Exit

### Basic Chat (Command-Line)

```bash
# Use default provider (ollama)
supercoin "What is TypeScript?"

# Specify provider and model
supercoin --provider anthropic -m claude-sonnet-4-20250514 "Explain AI"
supercoin -p google -m gemini-2.0-flash "Hello world"

# Adjust parameters
supercoin -t 0.9 --max-tokens 1000 "Creative writing prompt"

# Verbose output (shows token usage)
supercoin -v "Your question"

# Quiet mode (no provider info)
supercoin -q "Your question"

# Disable TUI (force help)
supercoin --no-tui
```

### Available Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-p, --provider` | AI provider | `--provider ollama` |
| `-m, --model` | Model ID | `-m llama3:latest` |
| `-t, --temperature` | Temperature (0-2) | `-t 0.7` |
| `--max-tokens` | Max output tokens | `--max-tokens 2048` |
| `--base-url` | Custom base URL | `--base-url http://localhost:11434/v1` |
| `--no-tui` | Disable interactive UI | `--no-tui` |
| `-v, --verbose` | Show token usage | `-v` |
| `-q, --quiet` | Minimal output | `-q` |

## ⚡ Advanced Capabilities

### Hook System (36 Hooks)

SuperCoin features a comprehensive hook system for extensibility:

| Category | Hooks |
|----------|-------|
| **Session** | session.start, session.end, session.idle, session.error, session.compacting |
| **Message** | message.before, message.after |
| **Tool** | tool.before, tool.after, tool.error |
| **Agent** | agent.spawn, agent.complete, agent.error |
| **Context** | context.window.warning, context.window.critical, context.compacting |

**Core Hooks (12):**
- **Session Recovery**: Automatic session resumption on failure
- **Session Lifecycle**: Track session states and transitions
- **Context Window Monitor**: Token usage tracking and warnings
- **Context Window Limit Recovery**: Handle token limit errors
- **Preemptive Compaction**: Smart context management before limits
- **Edit Error Recovery**: Automatic fix for common edit errors
- **Thinking Block Validator**: Validation for extended thinking responses
- **Tool Output Truncator**: Intelligent output size management
- **Tool Call Monitor**: Track tool usage statistics
- **Rules Injector**: Inject CLAUDE.md and .rules files
- **Directory README Injector**: Inject README.md context
- **Prompt Context Injector**: Dynamic context injection

**Advanced Hooks (14):**
- **Session Notification**: OS-level notifications for session events
- **Background Notification**: Notify on background task completion
- **Comment Checker**: Detect TODO/FIXME in generated code
- **Directory Agents Injector**: Inject AGENTS.md configuration
- **Compaction Context Injector**: Context for session compaction
- **Think Mode**: Extended reasoning on "think" keywords
- **Keyword Detector**: Activate modes based on keywords
- **Auto Slash Command**: Process /plan, /review, /test commands
- **Agent Usage Reminder**: Suggest agent usage over direct tools
- **Empty Task Response Detector**: Detect empty Task responses
- **Ralph Loop**: Autonomous task completion loop
- **Interactive Bash Session**: Track tmux/screen sessions
- **Non-Interactive Env**: Set env vars for non-interactive commands
- **Empty Message Sanitizer**: Ensure non-empty message content

### LSP Tools (11 Tools)

Code intelligence powered by Language Server Protocol:

| Tool | Description |
|------|-------------|
| `lsp_hover` | Get documentation and type info at cursor |
| `lsp_goto_definition` | Jump to symbol definition |
| `lsp_find_references` | Find all references to a symbol |
| `lsp_document_symbols` | List all symbols in a file |
| `lsp_workspace_symbols` | Search symbols across workspace |
| `lsp_diagnostics` | Get errors and warnings |
| `lsp_servers` | List available LSP servers |
| `lsp_prepare_rename` | Check if rename is valid |
| `lsp_rename` | Rename symbol across files |
| `lsp_code_actions` | Get quick fixes and refactorings |
| `lsp_code_action_resolve` | Apply a code action |

**Supported Languages**: TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, and 20+ more.

### AST-Grep Tools (3 Tools)

AST-aware code search and transformation:

| Tool | Description |
|------|-------------|
| `ast_grep_search` | Search code patterns with AST awareness |
| `ast_grep_replace` | Replace code patterns (dry-run supported) |
| `ast_grep_check` | Check AST-Grep environment |

**Features:**
- Meta-variables: `$VAR` for single node, `$$$` for multiple
- Pattern matching across 25 languages
- Dry-run mode for safe preview

### Multi-Agent System (9 Agents)

Sisyphus-style orchestration with specialized agents:

| Agent | Category | Purpose |
|-------|----------|---------|
| **Coin** | Orchestrator | Master coordinator, delegation, verification |
| **Explorer** | Exploration | Fast internal codebase search |
| **Librarian** | Exploration | External research (GitHub, docs, web) |
| **Analyst** | Advisor | Architecture, security, performance review |
| **Frontend** | Specialist | UI/UX, styling, visual design |
| **Doc Writer** | Specialist | Technical documentation |
| **Executor** | Utility | Command execution, automation |
| **Code Reviewer** | Utility | Code review with severity levels |
| **Multimodal** | Utility | PDF/image analysis |

**Delegation System:**
- Dynamic prompt generation based on available agents
- Cost-aware agent selection (FREE, CHEAP, EXPENSIVE)
- Parallel background execution for exploration agents

### UltraWork Mode
For tasks requiring maximum precision and multi-step reasoning, activate **UltraWork Mode**.
- **Activation**: Include `ultrawork`, `ulw`, or `@ultrawork` in your prompt to trigger high-intensity orchestration.
- **High-IQ Models**: Automatically upgrades the model selection to high-performance providers (e.g., Claude Sonnet 4, Gemini 2.0 Pro).
- **Maximum Parallelism**: Spawns multiple background agents in parallel to handle independent sub-tasks simultaneously.
- **Extended Autonomy**: Increases the loop limit up to 50 iterations for deep research and complex implementations.

### Agent Dashboard
Monitor your AI workforce in real-time with the sleek, Ink-based TUI dashboard.
- **Command**: `supercoin dashboard` or select `📊 Dashboard` from the interactive menu.
- **Live Visualization**: Real-time tracking of agent states (idle, running, completed, failed).
- **UltraWork Support**: Visual distinction for UltraWork mode (Yellow accent vs Blue).
- **Task Summary**: Instant overview of Todo progress, system logs, and token usage.
- **Interactive**: Refresh and manage the session directly from the TUI.

### Ralph Loop
The **Ralph Loop** is SuperCoin's autonomous development engine that ensures goals are met through continuous iteration.
- **Self-Referential Planning**: After each execution, the agent triggers a `session.idle` hook to evaluate the remaining Todo items.
- **Continuous Execution**: If tasks are still pending, the agent autonomously plans the next steps and re-enters the loop.
- **Zero-Intervention**: Capable of handling end-to-end development workflows—from architecture analysis to implementation and verification—without user input between steps.

## Commands

### Run

The `run` command provides session-aware execution:

```bash
# Run with a message (creates new session)
supercoin run "Explain the difference between let and const"

# Continue the last session
supercoin run --continue "Follow up question"
supercoin run -c "Continue the conversation"

# Resume a specific session
supercoin run --session <session-id> "Continue this session"
supercoin run -s abc123 "Resume session"

# Specify model in provider/model format
supercoin run -m anthropic/claude-sonnet-4 "Your prompt"

# Custom session title
supercoin run --title "My Research" "Start research task"

# JSON output format
supercoin run --format json "Your prompt"
```

**Run Command Features:**
- Automatic session creation and persistence
- Session continuation with `--continue` or `--session` flags
- OpenCode-style output formatting (provider info, session ID)
- JSON output support for scripting

### Sessions

Manage persistent sessions:

```bash
# List all sessions
supercoin session list
supercoin session ls

# List with options
supercoin session list -n 5              # Limit to 5 most recent
supercoin session list --format json     # JSON output
supercoin session list --status active   # Filter by status

# Show session details
supercoin session show <session-id>
supercoin session show abc123 --format json

# Delete a session
supercoin session delete <session-id>
supercoin session rm abc123 --force

# View session statistics
supercoin session stats
supercoin session stats --format json
```

**Session Features:**
- Persistent session storage with automatic saving
- Session filtering by status, provider, model
- Token usage tracking across sessions
- Encryption support (AES-256-GCM)

### Authentication

SuperCoin supports both **API Key** and **OAuth 2.0 + PKCE** authentication with multi-account management for rate limit avoidance.

```bash
# Interactive login (choose OAuth or API Key)
supercoin auth login

# Login to specific provider
supercoin auth login --claude      # API Key only (OAuth has known issues)
supercoin auth login --codex       # API Key only
supercoin auth login --gemini      # OAuth (Antigravity) or API Key

# Login with API key directly
supercoin auth login --claude --api-key <your-key>
supercoin auth login --codex --api-key <your-key>
supercoin auth login --gemini --api-key <your-key>

# Check authentication status (shows all accounts)
supercoin auth status

# Refresh OAuth tokens
supercoin auth refresh
supercoin auth refresh --gemini

# Logout
supercoin auth logout --all
supercoin auth logout --gemini
```

#### Multi-Account Support

Store up to 10 accounts per provider to avoid rate limits:

```bash
# Each OAuth login creates a unique account ID
supercoin auth login --gemini  # Creates account_1234567890

# View all accounts
supercoin auth status
# Output shows accountId and accountCount for each provider

# Accounts are automatically load-balanced when making API requests
```

#### OAuth Authentication (Gemini)

Gemini supports OAuth 2.0 with PKCE for secure browser-based authentication:

1. Run `supercoin auth login --gemini`
2. Select "OAuth with Antigravity (Recommended)"
3. Browser opens to Google OAuth consent page
4. Grant permissions
5. Return to CLI - authentication complete!

**Security Features:**
- PKCE (S256 challenge method) prevents authorization code interception
- State parameter validation protects against CSRF attacks
- Tokens encrypted with AES-256-GCM
- Automatic refresh token rotation
- Secure state cleanup (10-minute expiry)

### Models

```bash
# List all available models
supercoin models list

# Filter by provider
supercoin models list --provider anthropic

# Get model details
supercoin models info anthropic/claude-sonnet-4

# Set default model
supercoin models set-default anthropic/claude-sonnet-4

# Show current model
supercoin models current
```

### Configuration

```bash
# Show current configuration
supercoin config list

# Get specific config value
supercoin config get default_model

# Set config value
supercoin config set default_model anthropic/claude-sonnet-4-20250514

# Show configuration file paths
supercoin config path
```

### Server

```bash
# Start local auth server
supercoin server start

# Stop server
supercoin server stop

# Check server status
supercoin server status
```

### Diagnostics

```bash
# Run system diagnostics
supercoin doctor
```

## Configuration

### Global Configuration

SuperCoin uses a configuration file located at `~/.config/supercoin/config.json`.

```json
{
  "default_model": "anthropic/claude-sonnet-4-20250514",
  "fallback_models": [
    "openai/gpt-4o",
    "google/gemini-2.0-flash"
  ],
  "providers": {
    "anthropic": { "enabled": true },
    "openai": { "enabled": true },
    "google": { "enabled": true },
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1",
      "defaultModel": "llama3:latest"
    },
    "lmstudio": {
      "enabled": true,
      "baseUrl": "http://localhost:1234/v1"
    }
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1"
  }
}
```

### Project Configuration

Create `supercoin.json` or `.supercoin.json` in your project (legacy: `opencode.json`, `.opencode.json`):

```json
{
  "provider": "ollama",
  "model": "llama3:latest",
  "temperature": 0.7,
  "maxTokens": 4096,
  "streaming": true
}
```

**Configuration Hierarchy** (highest priority first):
1. CLI flags (`--provider`, `--model`, etc.)
2. Project config (`supercoin.json` / `.supercoin.json`)
3. Legacy config (`opencode.json` / `.opencode.json`)
4. Global config (`~/.config/supercoin/config.json`)
5. Defaults (provider: `ollama`, model: `llama3.2`)

## Supported Models

### API Providers

| Provider | Model ID | Context |
|----------|----------|---------|
| Anthropic | claude-sonnet-4-20250514 | 200K |
| Anthropic | claude-3-5-sonnet-20241022 | 200K |
| Anthropic | claude-3-5-haiku-20241022 | 200K |
| OpenAI | gpt-4o | 128K |
| OpenAI | gpt-4o-mini | 128K |
| OpenAI | o1 | 200K |
| OpenAI | o1-mini | 128K |
| Google | gemini-2.0-flash | 1M |
| Google | gemini-1.5-pro | 2M |
| Google | gemini-1.5-flash | 1M |

### Localhost Providers

| Provider | Setup | Models |
|----------|-------|--------|
| **Ollama** | `curl -fsSL https://ollama.com/install.sh \| sh` | llama3, gemma2, qwen, phi, mistral, and 100+ more |
| **LM Studio** | Download from [lmstudio.ai](https://lmstudio.ai) | All GGUF models |
| **llama.cpp** | Build from [source](https://github.com/ggerganov/llama.cpp) | All GGUF models |

#### Ollama Quick Start

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Popular models
ollama pull llama3           # Meta Llama 3 (8B)
ollama pull gemma2:2b        # Google Gemma 2 (2B)
ollama pull qwen3:4b         # Alibaba Qwen (4B)
ollama pull phi3             # Microsoft Phi-3 (3.8B)

# List installed models
ollama list

# Use with SuperCoin
supercoin --provider ollama -m llama3 "Your prompt"
```

#### LM Studio Setup

```bash
# 1. Download from https://lmstudio.ai
# 2. Start local server (default: http://localhost:1234)
# 3. Load a model in the UI

# Use with SuperCoin
supercoin --provider lmstudio -m your-model "Your prompt"
```

#### llama.cpp Setup

```bash
# Build llama.cpp server
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make server

# Start server (default: http://localhost:8080)
./build/bin/llama-server -m models/your-model.gguf

# Use with SuperCoin
supercoin --provider llamacpp --base-url http://localhost:8080/v1 "Your prompt"
```

## Project Structure

```
supercoin/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   ├── config/                 # Configuration schema and loaders
│   │   ├── loader.ts          # Global config
│   │   ├── project.ts         # Project config (supercoin.json)
│   │   └── schema.ts          # Zod schemas
│   ├── core/                   # Core functionality (tools, hooks, session)
│   ├── server/                 # Local auth server (Hono)
│   │   ├── store/             # Token and OAuth state storage
│   │   └── routes/            # HTTP routes
│   ├── services/
│   │   ├── auth/              # Authentication (OAuth, API keys)
│   │   ├── models/
│   │   │   ├── ai-sdk/        # AI SDK integration
│   │   │   │   ├── types.ts   # Provider types
│   │   │   │   ├── registry.ts # Provider registry
│   │   │   │   └── stream.ts  # Streaming service
│   │   │   └── providers/     # Legacy direct API implementations
│   │   └── agents/            # Agent system
│   └── shared/                 # Shared utilities (logger, errors)
│   ├── tests/                      # Test files (143 tests)
│   │   ├── unit/                  # Unit tests
│   │   └── e2e/                   # End-to-end tests
│   └── examples/                   # Usage examples
│   └── examples/                   # Usage examples
```

## SuperCoin Monorepo (New)

New packages introduced for the console and desktop applications:

- `packages/console/app` - SolidStart web console
- `packages/console/core` - Console business logic
- `packages/ui` - SolidJS UI component library
- `packages/shared` - Shared utilities
- `packages/database` - Drizzle ORM + SQLite/D1 schemas
- `packages/auth` - GitHub OAuth + session management
- `packages/server` - Hono API worker for Cloudflare
- `packages/desktop` - Tauri 2.x desktop wrapper
- `infra/` + `sst.config.ts` - SST v3 Cloudflare infrastructure

### Monorepo Development

```bash
# Install dependencies
bun install

# Typecheck all packages
bun turbo typecheck

# Run web console
cd packages/console/app
bun run dev

# Database (SQLite)
cd packages/database
bun run db:generate
bun run db:push

# Desktop (requires Rust)
cd packages/desktop
bun run dev
```

### Infrastructure (SST v3)

```bash
# Required Cloudflare credentials
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_D1_DATABASE_ID=...

# Required auth secrets
export GITHUB_CLIENT_ID=...
export GITHUB_CLIENT_SECRET=...
export JWT_SECRET=...

# Local simulation
bunx sst dev --stage dev

# Deploy
bunx sst deploy --stage staging
```

## Publishing to npm

### Prepare for Publishing

```bash
# Update version in package.json
npm version patch  # or minor, major

# Build the project
bun run build

# Test the build locally
npm link
supercoin --version

# Verify package contents
npm pack --dry-run
```

### Publish

```bash
# Login to npm (first time only)
npm login

# Publish to npm
npm publish

# Verify published package
npm view supercoin
```

### Install Published Package

```bash
# Global installation
npm install -g supercoin

# Or use with npx
npx supercoin
```

## Development

```bash
# Run tests
bun test

# Run tests with coverage
bun test:coverage

# Type check
bun lint

# Build
bun run build
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai) - Universal provider abstraction
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js)
- **Interactive UI**: [@clack/prompts](https://github.com/natemoo-re/clack) - Beautiful terminal prompts
- **HTTP Server**: [Hono](https://hono.dev) - Lightweight OAuth callback server
- **Validation**: [Zod](https://zod.dev)
- **Language**: TypeScript

### TUI Architecture

SuperCoin features a chat-first CLI interface:

1. **Interactive Mode** (default): Rich terminal UI with `@clack/prompts`
   - Direct chat input by default (no menu navigation required)
   - Slash commands for navigation (`/menu`, `/session`, `/help`, etc.)
   - ASCII logo display on startup
   - Real-time spinners and progress updates
   - Consistent cancel handling via `CancelledError`
   - Styled output with UI utilities (`src/shared/ui.ts`)

2. **Command-Line Mode**: Direct execution with flags
   - Full control via `--provider`, `--model`, etc.
   - JSON output support for scripting
   - Quiet mode for minimal output

### AI SDK Providers

SuperCoin uses Vercel AI SDK for universal provider support:

- `@ai-sdk/anthropic` - Claude models
- `@ai-sdk/openai` - OpenAI, Codex, Ollama, LM Studio, llama.cpp (OpenAI-compatible)
- `@ai-sdk/google` - Gemini models

This architecture allows adding 75+ providers with minimal code.

## Implementation Status

### ✅ Phase 1: Terminal & PTY Management
- [x] PTY types and interfaces (`src/services/pty/types.ts`)
- [x] PTY Manager implementation (`src/services/pty/manager.ts`)
- [x] Prompt detection system (`src/services/pty/prompt-detector.ts`)
- [x] Node-pty dependency installed
- [x] PTY integration with bash tool (`src/core/tools/bash-pty.ts`)
- [x] Session cache for PTY (`src/core/session/cache.ts`)

### ✅ Phase 2: Command Execution & Tool Discovery
- [x] Tool types and schema validation (`src/tools/types.ts`)
- [x] Tool registry implementation (`src/tools/registry.ts`)
- [x] Command executor with timeout and rate limiting (`src/core/tools/command-executor.ts`)
- [x] Tool discovery and search (`src/tools/discovery.ts`)
- [x] Tool templates and generation (`src/tools/generator.ts`)
- [x] Integration with existing tools (`src/core/tools/adapter.ts`)
- [x] Dual registry support for backwards compatibility

### ✅ Phase 3: Session Management
- [x] Session types and state management (`src/core/session/types.ts`)
- [x] Session manager with persistence (`src/core/session/manager.ts`)
- [x] Session caching with LRU/LFU/FIFO eviction (`src/core/session/cache.ts`)
- [x] Session export/import (`src/core/session/exporter.ts`)
- [x] Encryption support (AES-256-GCM)

### ✅ Phase 4: Knowledge Base & Documentation
- [x] Knowledge base types and interfaces (`src/core/knowledge/types.ts`)
- [x] Knowledge base manager with search (`src/core/knowledge/manager.ts`)
- [x] Self-documentation generator (`src/core/knowledge/generator.ts`)
- [x] Interactive help system (`src/core/knowledge/help.ts`)

### ✅ Phase 5: Advanced Features
- [x] AI client manager (`src/services/models/ai-sdk/`)
- [x] Multi-provider support (OpenAI, Anthropic, Google, Ollama)
- [x] Agent system (`src/services/agents/`)
- [x] Background task concurrency (`src/services/background/`)
- [x] Authentication system with OAuth 2.0 + PKCE (`src/services/auth/`)
- [x] TUI utilities with consistent styling (`src/shared/ui.ts`)
- [x] CancelledError for graceful user cancellation
- [ ] Smart CLI shell (planned)
- [ ] Workflow automation engine (planned)
- [ ] Plugin system (planned)

### ✅ Phase 6: Hook System Enhancement (36 Hooks)
- [x] Hook registry with 18 event types (`src/core/hooks/`)
- [x] Session recovery hooks (`src/core/hooks/session-recovery/`)
- [x] Context window management (`src/core/hooks/context-window-limit-recovery/`)
- [x] Preemptive compaction (`src/core/hooks/preemptive-compaction/`)
- [x] Edit error recovery (`src/core/hooks/edit-error-recovery/`)
- [x] Thinking block validator (`src/core/hooks/thinking-block-validator.ts`)
- [x] Tool output truncator (`src/core/hooks/tool-output-truncator.ts`)
- [x] Rules injector (`src/core/hooks/rules-injector/`)
- [x] Context window monitor (`src/core/hooks/context-window-monitor.ts`)
- [x] Session notification (`src/core/hooks/session-notification.ts`)
- [x] Background notification (`src/core/hooks/background-notification.ts`)
- [x] Comment checker (`src/core/hooks/comment-checker.ts`)
- [x] Directory agents injector (`src/core/hooks/directory-agents-injector.ts`)
- [x] Think mode (`src/core/hooks/think-mode.ts`)
- [x] Keyword detector (`src/core/hooks/keyword-detector.ts`)
- [x] Auto slash command (`src/core/hooks/auto-slash-command.ts`)
- [x] Ralph loop (`src/core/hooks/ralph-loop.ts`)
- [x] Interactive bash session (`src/core/hooks/interactive-bash-session.ts`)
- [x] Non-interactive env (`src/core/hooks/non-interactive-env.ts`)
- [x] Empty message sanitizer (`src/core/hooks/empty-message-sanitizer.ts`)
- [x] Agent usage reminder (`src/core/hooks/agent-usage-reminder.ts`)
- [x] Compaction context injector (`src/core/hooks/compaction-context-injector.ts`)

### ✅ Phase 7: Tool System Enhancement
- [x] LSP types and client (`src/core/tools/lsp/`)
- [x] 11 LSP tools (hover, definition, references, symbols, diagnostics, rename, code actions)
- [x] 31 built-in LSP server configurations
- [x] AST-Grep CLI wrapper (`src/core/tools/ast-grep/cli.ts`)
- [x] 3 AST-Grep tools (search, replace, check)
- [x] Tool registry update with 'code' category

### ✅ Phase 8: Agent System Enhancement
- [x] Agent metadata system (`AgentPromptMetadata`)
- [x] Sisyphus prompt builder (`src/services/agents/sisyphus/`)
- [x] Dynamic delegation table generation
- [x] 3 new agents: Librarian, Frontend, Multimodal
- [x] Metadata for existing agents (Explorer, Analyst, DocWriter)
- [x] Cost-aware agent selection (FREE, CHEAP, EXPENSIVE)

### Test Coverage
- **155 tests passing**
- Unit tests for core functionality
- E2E tests for workflow integration
- Authentication tests (skipped without API keys)

## License

MIT

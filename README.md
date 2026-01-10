# SuperCoin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)

Unified AI CLI hub for Claude, Codex, Gemini, and localhost models.

**Privacy-first • Cost-free • Multi-provider • Open Source**


- **Multi-Provider Support**: Seamlessly switch between Claude (Anthropic), Codex (OpenAI), Gemini (Google), and localhost models (Ollama, LM Studio, llama.cpp)
- **Localhost-First**: Default provider is Ollama for privacy and cost-free local development
- **Unified Authentication**: Single hub for managing all provider credentials with OAuth 2.0 + PKCE support
- **Model Router**: Intelligent model selection with automatic fallback
- **AI SDK Integration**: Universal provider abstraction powered by Vercel AI SDK
- **Interactive TUI**: Beautiful command-line interface powered by @clack/prompts
- **Project Configuration**: Per-project settings via `opencode.json`
- **Extensible**: Hook system and agent configuration



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

### Install from GitHub (Source)

You can install directly from the repository without needing Bun installed:

```bash
npm install -g git+https://github.com/JEO-tech-ai/supercode.git#main
```

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Ollama](https://ollama.com) (recommended for local models)
- [Bun](https://bun.sh) (optional, for development only)

### Install from GitHub (Development)

```bash
# Clone the repository
git clone https://github.com/JEO-tech-ai/supercode.git
cd supercode/supercoin

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

### Interactive Mode (GUI/TUI)

```bash
# Simply run supercoin without arguments
supercoin

# You'll see an interactive menu:
# 🪙 SuperCoin - Unified AI CLI Hub
#
# What would you like to do?
# ❯ 💬 Start Chat
#   🔐 Authentication
#   🤖 Models
#   ⚙️  Configuration
#   🌐 Server
#   🩺 Doctor
```

**Interactive Features**:
- Beautiful terminal UI powered by @clack/prompts
- Provider selection with visual indicators
- Model customization prompts
- Real-time streaming responses
- Progress spinners and status updates

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
supercoin --provider anthropic -m claude-opus-4-5 "Hello"
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

Create `opencode.json` in your project root:

```json
{
  "provider": "ollama",
  "model": "llama3:latest",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

Alternative filenames: `.opencode.json` or `supercoin.json`

Then simply run:

```bash
supercoin
# Or
supercoin "Your prompt here"
```

## CLI Usage

### Interactive Mode (Default)

```bash
# Run without arguments to launch interactive TUI
supercoin

# Navigate with arrow keys and Enter
# Select from:
# - 💬 Start Chat
# - 🔐 Authentication
# - 🤖 Models
# - ⚙️  Configuration
# - 🌐 Server
# - 🩺 Doctor
```

### Basic Chat (Command-Line)

```bash
# Use default provider (ollama)
supercoin "What is TypeScript?"

# Specify provider and model
supercoin --provider anthropic -m claude-opus-4-5 "Explain AI"
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

### UltraWork Mode
For tasks requiring maximum precision and multi-step reasoning, activate **UltraWork Mode**.
- **Activation**: Include `ultrawork`, `ulw`, or `@ultrawork` in your prompt to trigger high-intensity orchestration.
- **High-IQ Models**: Automatically upgrades the model selection to high-performance providers (e.g., Claude 3.5 Opus, Gemini 1.5 Pro).
- **Maximum Parallelism**: Spawns multiple background agents in parallel to handle independent sub-tasks simultaneously.
- **Extended Autonomy**: Increases the loop limit up to 50 iterations for deep research and complex implementations.

### Agent Dashboard
Monitor your AI workforce in real-time with the sleek, Ink-based TUI dashboard.
- **Command**: `supercoin dashboard` or select `📊 Dashboard` from the interactive menu.
- **Live Visualization**: Real-time tracking of agent states (idle, running, completed, failed).
- **Task Summary**: Instant overview of Todo progress, system logs, and token usage.
- **Interactive**: Refresh and manage the session directly from the TUI.

### Ralph Loop
The **Ralph Loop** is SuperCoin's autonomous development engine that ensures goals are met through continuous iteration.
- **Self-Referential Planning**: After each execution, the agent triggers a `session.idle` hook to evaluate the remaining Todo items.
- **Continuous Execution**: If tasks are still pending, the agent autonomously plans the next steps and re-enters the loop.
- **Zero-Intervention**: Capable of handling end-to-end development workflows—from architecture analysis to implementation and verification—without user input between steps.

## Commands

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
supercoin config show

# Get specific config value
supercoin config get default_model

# Set config value
supercoin config set default_model anthropic/claude-opus-4
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
  "default_model": "anthropic/claude-sonnet-4-5",
  "fallback_models": [
    "openai/gpt-5.2",
    "google/gemini-3-flash"
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

Create `opencode.json`, `.opencode.json`, or `supercoin.json` in your project:

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
2. Project config (`opencode.json`)
3. Global config (`~/.config/supercoin/config.json`)
4. Defaults (provider: `ollama`, model: `llama3.2`)

## Supported Models

### API Providers

| Provider | Model ID | Context |
|----------|----------|---------|
| Anthropic | claude-opus-4-5 | 200K |
| Anthropic | claude-sonnet-4-5 | 200K |
| Anthropic | claude-haiku-4-5 | 200K |
| OpenAI | gpt-5.2 | 200K |
| OpenAI | gpt-4o | 128K |
| OpenAI | o3 | 200K |
| OpenAI | o1 | 128K |
| Google | gemini-3-pro | 2M |
| Google | gemini-3-flash | 1M |
| Google | gemini-2.0-flash | 1M |

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
│   │   ├── opencode.ts        # Project config (opencode.json)
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
├── tests/                      # Test files (142 tests)
│   ├── unit/                  # Unit tests
│   └── e2e/                   # End-to-end tests
└── examples/                   # Usage examples
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
- **Interactive UI**: [@clack/prompts](https://github.com/natemoo-re/clack)
- **HTTP Server**: [Hono](https://hono.dev)
- **Validation**: [Zod](https://zod.dev)
- **Language**: TypeScript

### AI SDK Providers

SuperCoin uses Vercel AI SDK for universal provider support:

- `@ai-sdk/anthropic` - Claude models
- `@ai-sdk/openai` - OpenAI, Codex, Ollama, LM Studio, llama.cpp (OpenAI-compatible)
- `@ai-sdk/google` - Gemini models

This architecture allows adding 75+ providers with minimal code.

## License

MIT

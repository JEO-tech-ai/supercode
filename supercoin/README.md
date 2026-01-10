# SuperCoin

Unified AI CLI hub for Claude, Codex, and Gemini.

## Features

- **Multi-Provider Support**: Seamlessly switch between Claude (Anthropic), Codex (OpenAI), and Gemini (Google)
- **Unified Authentication**: Single hub for managing all provider credentials
- **Model Router**: Intelligent model selection with automatic fallback
- **Interactive TUI**: Beautiful command-line interface powered by @clack/prompts
- **Extensible**: Hook system and agent configuration

## Installation

```bash
# Clone the repository
git clone https://github.com/supercent/supercoin.git
cd supercoin

# Install dependencies
bun install
```

## Quick Start

```bash
# Run CLI
bun start

# Development mode with hot reload
bun dev
```

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

SuperCoin uses a TOML configuration file located at `~/.config/supercoin/config.toml`.

```toml
# Default model
default_model = "anthropic/claude-sonnet-4"

# Fallback models
fallback_models = [
  "openai/gpt-4o",
  "google/gemini-2.0-flash"
]

# Provider settings
[providers.anthropic]
enabled = true

[providers.openai]
enabled = true

[providers.google]
enabled = true

# Server settings
[server]
port = 3100
host = "127.0.0.1"
autoStart = true

# Experimental features
[experimental]
preemptive_compaction = false
parallel_agents = true
```

## Supported Models

| Provider | Model ID | Context |
|----------|----------|---------|
| Anthropic | anthropic/claude-opus-4 | 200K |
| Anthropic | anthropic/claude-sonnet-4 | 200K |
| OpenAI | openai/gpt-4o | 128K |
| OpenAI | openai/o1 | 200K |
| Google | google/gemini-2.5-pro | 1M |
| Google | google/gemini-2.0-flash | 1M |

## Project Structure

```
supercoin/
├── src/
│   ├── cli/           # CLI entry point and commands
│   ├── config/        # Configuration schema and loader
│   ├── core/          # Core functionality (tools, hooks, session)
│   ├── server/        # Local auth server (Hono)
│   ├── services/      # Auth and model services
│   └── shared/        # Shared utilities (logger, errors)
├── tests/             # Test files
└── examples/          # Usage examples
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
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js)
- **Interactive UI**: [@clack/prompts](https://github.com/natemoo-re/clack)
- **HTTP Server**: [Hono](https://hono.dev)
- **Validation**: [Zod](https://zod.dev)
- **Language**: TypeScript

## License

MIT

# SuperCoin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)

Modern AI-powered coding assistant with an advanced Text User Interface.

**Privacy-first • Multi-provider • Open Source**

## Features

### Core Features
- **Multi-Provider Support**: Claude, Codex, Gemini, Ollama, and localhost models
- **Localhost-First**: Default to Ollama for privacy and cost-free local development
- **AI SDK Integration**: Universal provider abstraction powered by Vercel AI SDK
- **Project Configuration**: Per-project settings via `supercoin.json`

### Advanced TUI (OpenCode-level)
- **Slash Commands**: `/new`, `/models`, `/agents`, `/theme`, `/help`, and more
- **File References**: `@filename.ts` to attach files, `@file.ts#10-20` for line ranges
- **Agent Mentions**: `@explorer`, `@analyst`, `@frontend`, `@docwriter` sub-agents
- **Sidebar Monitor**: Real-time view of context, tokens, agents, MCP servers, and todos
- **Command Palette**: Quick access to all commands with `Ctrl+X`
- **Theme System**: 5 themes (Catppuccin, Dracula, Nord, Tokyo Night, Monokai)
- **History Navigation**: Arrow keys to navigate prompt history
- **Shell Mode**: Type `!` to enter shell command mode

### Multi-Agent System
- **9 Specialized Agents**: explorer, analyst, frontend, docwriter, executor, reviewer, and more
- **Sub-agent Monitoring**: Real-time status in sidebar
- **Agent Orchestration**: Coordinate multiple agents for complex tasks

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (**required**)
- [Ollama](https://ollama.com) (recommended for local AI models)

### Quick Install

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/JEO-tech-ai/supercoin.git
cd supercoin
bun install

# Run
bun src/cli/index.ts
```

### Global Installation

```bash
bun link
supercoin --help
```

## Usage

### Launch TUI

```bash
# Start the new TUI (default)
supercoin

# Or explicitly
supercoin tui

# Classic mode (legacy @clack/prompts)
supercoin --classic
```

### Slash Commands

| Command | Description |
|---------|-------------|
| `/new` | Create a new session |
| `/session` | List and switch sessions |
| `/models` | Switch AI model |
| `/agents` | Switch agent |
| `/theme` | Change theme |
| `/status` | Show system status |
| `/help` | Show help |
| `/commands` | Show all commands |
| `/exit` | Exit the app |

**Session Commands** (when in a session):
- `/undo` - Undo the last message
- `/redo` - Redo the last message
- `/rename` - Rename this session
- `/copy` - Copy session transcript
- `/export` - Export session to file
- `/timeline` - Jump to message in timeline
- `/fork` - Fork from current message

### File References

```
# Attach a file
@src/index.ts

# Attach specific lines
@src/index.ts#10-20

# Attach a directory
@src/components/
```

### Agent Mentions

```
# Use a sub-agent
@explorer find all test files

# Multiple agents
@analyst review the architecture @reviewer check for bugs
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+X` | Open command palette |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+C` | Exit (when prompt empty) |
| `Esc` | Go back / Close dialog |
| `↑↓` | Navigate history / autocomplete |
| `Tab` | Select autocomplete item |
| `/` | Start slash command |
| `@` | Start file/agent reference |
| `!` | Enter shell mode |

## Configuration

Create a `supercoin.json` in your project root:

```json
{
  "provider": "ollama",
  "model": "rnj-1",
  "theme": "catppuccin",
  "mode": "dark"
}
```

### Provider Configuration

```bash
# Set default provider
supercoin config set provider ollama

# Configure API keys
supercoin auth setup anthropic
supercoin auth setup openai
supercoin auth setup google
```

## Project Structure

```
supercoin/
├── src/
│   ├── cli/           # CLI entry point and commands
│   ├── tui/           # Text User Interface
│   │   ├── component/ # Reusable UI components
│   │   │   ├── prompt/
│   │   │   │   ├── AdvancedPrompt.tsx  # Main prompt with / @ ! support
│   │   │   │   ├── SlashCommands.tsx   # Slash command menu
│   │   │   │   ├── FileReference.tsx   # File/agent autocomplete
│   │   │   │   └── History.tsx         # Prompt history
│   │   │   ├── Sidebar.tsx   # Session sidebar
│   │   │   ├── Border.tsx
│   │   │   └── Logo.tsx
│   │   ├── context/   # React contexts
│   │   │   ├── theme/
│   │   │   ├── route.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   └── command.tsx
│   │   ├── routes/    # TUI screens
│   │   │   ├── Home.tsx
│   │   │   └── session/
│   │   ├── ui/        # UI overlays
│   │   │   ├── CommandPalette.tsx
│   │   │   └── Toast.tsx
│   │   └── App.tsx    # Root component
│   ├── providers/     # AI provider integrations
│   ├── config/        # Configuration management
│   └── agents/        # Agent definitions
├── docs/
│   └── tui-improvement/  # TUI implementation docs
└── supercoin.json     # Project configuration
```

## Development

```bash
# Run in development
bun src/cli/index.ts

# Type check
bun run typecheck

# Run tests
bun test
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

## Roadmap

- [ ] MCP (Model Context Protocol) server integration
- [ ] LSP integration for code intelligence
- [ ] Git integration (diff view, commit helper)
- [ ] Image paste support
- [ ] Session sharing
- [ ] More themes and customization options

## License

MIT © SuperCoin Contributors

---

Made with ❤️ using Bun, React/Ink, and TypeScript

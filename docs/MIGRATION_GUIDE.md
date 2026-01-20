# Migration Guide: OpenCode to SuperCode

This guide helps you migrate from OpenCode to SuperCode, covering configuration changes, feature mappings, and common migration tasks.

## Overview

SuperCode is fully compatible with OpenCode configurations while offering additional features:

| Feature | OpenCode | SuperCode |
|---------|----------|-----------|
| Config Files | `opencode.json` | `supercode.json` (also reads `opencode.json`) |
| Env Prefix | `OPENCODE_*` | `SUPERCODE_*` (also reads `OPENCODE_*`) |
| Hooks | Plugin-based | Built-in + Claude Code compatible |
| Local Models | Basic support | Full Ollama/LM Studio/llama.cpp support |
| Agent System | Sisyphus | Cent (6-phase orchestrator) |

---

## Quick Migration

### Step 1: Rename Config File (Optional)

SuperCode reads `opencode.json` automatically, but you can rename it:

```bash
# Rename config file
mv opencode.json supercode.json

# Or keep both (SuperCode prefers supercode.json)
cp opencode.json supercode.json
```

### Step 2: Update Environment Variables (Optional)

SuperCode reads both prefixes, but new features use `SUPERCODE_*`:

```bash
# Old (still works)
export OPENCODE_PROVIDER=ollama
export OPENCODE_MODEL=llama3

# New (recommended)
export SUPERCODE_DEFAULT_MODEL=ollama/llama3.3
export SUPERCODE_PROVIDERS_OLLAMA_BASEURL=http://localhost:11434/v1
```

### Step 3: Verify Migration

```bash
# Check config is loaded
supercode config list --sources

# Run doctor to verify setup
supercode doctor
```

---

## Configuration Migration

### Basic Config

**OpenCode (`opencode.json`):**
```json
{
  "provider": "ollama",
  "model": "llama3",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

**SuperCode (`supercode.json`):**
```json
{
  "default_model": "ollama/llama3",
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1"
    }
  }
}
```

### Provider Configuration

**OpenCode:**
```json
{
  "providers": {
    "ollama": {
      "baseURL": "http://localhost:11434"
    }
  }
}
```

**SuperCode:**
```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1"
    },
    "anthropic": {
      "enabled": true
    },
    "local": {
      "enabled": true,
      "baseUrl": "http://localhost:1234/v1"
    }
  }
}
```

### Model Format

SuperCode uses `provider/model` format:

| OpenCode | SuperCode |
|----------|-----------|
| `llama3` with `provider: ollama` | `ollama/llama3` |
| `claude-3-sonnet` with `provider: anthropic` | `anthropic/claude-sonnet-4-5` |
| `gpt-4` with `provider: openai` | `openai/gpt-4` |

---

## Environment Variables

### Mapping Table

| OpenCode | SuperCode | Description |
|----------|-----------|-------------|
| `OPENCODE_PROVIDER` | `SUPERCODE_PROVIDER` | Default provider |
| `OPENCODE_MODEL` | `SUPERCODE_MODEL` | Default model |
| `OPENCODE_BASE_URL` | `SUPERCODE_BASE_URL` | Provider base URL |
| - | `SUPERCODE_DEFAULT_MODEL` | Full model spec (provider/model) |
| - | `SUPERCODE_SERVER_PORT` | Server port |
| - | `SUPERCODE_SERVER_HOST` | Server host |

### New Environment Variables

SuperCode adds hierarchical environment variable support:

```bash
# Nested config via underscore
export SUPERCODE_PROVIDERS_OLLAMA_BASEURL="http://localhost:11434/v1"
export SUPERCODE_PROVIDERS_ANTHROPIC_ENABLED="true"
export SUPERCODE_SERVER_PORT="3100"
export SUPERCODE_SERVER_HOST="0.0.0.0"
```

---

## Hooks Migration

### OpenCode Hooks

If you used OpenCode plugins/hooks:

```javascript
// opencode-plugin.js
module.exports = {
  onMessage: async (message) => { /* ... */ },
  onToolCall: async (tool, args) => { /* ... */ }
}
```

### SuperCode Built-in Hooks

SuperCode has 30+ built-in hooks that replace most plugin functionality:

| Plugin Functionality | SuperCode Hook |
|---------------------|----------------|
| Context monitoring | `context-window-monitor` |
| Auto-compaction | `preemptive-compaction` |
| Tool tracking | `tool-call-monitor` |
| Project rules | `rules-injector` |
| Auto-test loop | `ralph-loop` |
| TODO enforcement | `todo-continuation` |

### Disabling Hooks

```json
{
  "disabled_hooks": [
    "comment-checker",
    "session-notification"
  ]
}
```

---

## Agent Migration

### OpenCode Sisyphus Agent

OpenCode used the Sisyphus agent for orchestration.

### SuperCode Cent Agent

SuperCode uses the Cent agent with a 6-phase workflow:

1. **Intent Analysis** - Understand user request
2. **Context Gathering** - Collect relevant information
3. **Task Decomposition** - Break down complex tasks
4. **Delegation** - Assign to specialized agents
5. **Execution** - Run tasks with monitoring
6. **Verification** - Validate results

**Usage:**
```bash
@cent orchestrate complex refactoring
```

### Agent Mapping

| OpenCode | SuperCode | Description |
|----------|-----------|-------------|
| sisyphus | cent | Main orchestrator |
| - | explorer | Codebase navigation |
| - | analyst | Code analysis |
| - | librarian | Documentation |
| - | executor | Command execution |
| - | frontend | UI/UX specialist |

---

## CLI Commands

### Command Mapping

| OpenCode | SuperCode | Description |
|----------|-----------|-------------|
| `opencode` | `supercode` | Main command |
| `opencode run` | `supercode run` | Run with prompt |
| `opencode --continue` | `supercode run --continue` | Continue session |
| `opencode config` | `supercode config` | Config management |

### New Commands

```bash
# Config management
supercode config list           # List all config
supercode config list --sources # Show config sources
supercode config path           # Show config file paths
supercode config set <key> <value> --global  # Set global config
supercode config set <key> <value> --project # Set project config
supercode config init           # Create config file

# Doctor command
supercode doctor               # Diagnose setup issues

# Auth
supercode auth login           # Interactive auth
supercode auth status          # Check auth status
```

---

## Global Config

### Location

SuperCode uses `~/.config/supercode/config.json` for global settings:

```bash
# Create global config
supercode config init --global

# Or manually
mkdir -p ~/.config/supercode
cat > ~/.config/supercode/config.json << 'EOF'
{
  "default_model": "ollama/llama3.3",
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1"
    }
  }
}
EOF
```

### Priority

Config loading priority (highest to lowest):

1. **Environment Variables** - `SUPERCODE_*`, `OPENCODE_*`
2. **Project Config** - `supercode.json`, `.supercode.json`, `opencode.json`
3. **Global Config** - `~/.config/supercode/config.json`
4. **Defaults** - Built-in default values

---

## Localhost Models

### OpenCode Local Setup

```json
{
  "provider": "ollama",
  "baseURL": "http://localhost:11434"
}
```

### SuperCode Local Setup

SuperCode provides enhanced localhost support:

```json
{
  "default_model": "ollama/llama3.3",
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1"
    },
    "local": {
      "enabled": true,
      "baseUrl": "http://localhost:1234/v1"
    }
  }
}
```

**Supported Local Servers:**
- Ollama (`http://localhost:11434/v1`)
- LM Studio (`http://localhost:1234/v1`)
- llama.cpp (`http://localhost:8080/v1`)
- Any OpenAI-compatible server

---

## Common Migration Issues

### Issue: Config Not Loading

**Symptom:** SuperCode uses defaults instead of your config.

**Solution:**
```bash
# Check config sources
supercode config list --sources

# Verify file exists and is valid JSON
cat supercode.json | jq .

# Check for syntax errors
supercode config list --json
```

### Issue: Ollama Not Connecting

**Symptom:** "Failed to connect to local LLM server"

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check URL format (must include /v1)
# Wrong: http://localhost:11434
# Right: http://localhost:11434/v1

# Update config
supercode config set providers.ollama.baseUrl "http://localhost:11434/v1"
```

### Issue: Environment Variables Not Working

**Symptom:** Env vars are ignored.

**Solution:**
```bash
# Check variable is set
echo $SUPERCODE_DEFAULT_MODEL

# Verify format (use underscores for nested paths)
export SUPERCODE_PROVIDERS_OLLAMA_BASEURL="http://localhost:11434/v1"

# Restart shell or source profile
source ~/.bashrc
```

### Issue: Old Model Names

**Symptom:** Model not found errors.

**Solution:** Update to new model naming:

```bash
# Old format
export OPENCODE_MODEL=llama3

# New format (provider/model)
export SUPERCODE_DEFAULT_MODEL=ollama/llama3.3
```

---

## Feature Comparison

| Feature | OpenCode | SuperCode |
|---------|----------|-----------|
| TUI | Basic | Full React/Ink TUI |
| Hooks | Plugin system | 30+ built-in hooks |
| Agents | Sisyphus | 10+ specialized agents |
| Claude Code | Partial | Full compatibility |
| Local Models | Basic | Ollama/LM Studio/llama.cpp |
| Config Layers | Project only | Env + Project + Global |
| MCP Support | Basic | Full + embedded in skills |
| Skills | Basic | Full with MCP embedding |

---

## Getting Help

```bash
# View help
supercode --help

# Run diagnostics
supercode doctor

# View config
supercode config list

# Check auth status
supercode auth status
```

**Resources:**
- [README](../README.md)
- [GitHub Issues](https://github.com/JEO-tech-ai/supercode/issues)
- [Contributing Guide](../CONTRIBUTING.md)

---

## Appendix: Full Config Example

**Complete `supercode.json`:**

```json
{
  "default_model": "ollama/llama3.3",
  "fallback_models": [
    "anthropic/claude-sonnet-4-5",
    "openai/gpt-4o"
  ],
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434/v1"
    },
    "anthropic": {
      "enabled": true
    },
    "openai": {
      "enabled": true
    },
    "google": {
      "enabled": true
    },
    "local": {
      "enabled": true,
      "baseUrl": "http://localhost:1234/v1"
    }
  },
  "server": {
    "port": 3100,
    "host": "127.0.0.1",
    "autoStart": true
  },
  "orchestrator": {
    "defaultOrchestrator": "cent",
    "maxConcurrentAgents": 3
  },
  "disabled_hooks": [],
  "disabled_agents": []
}
```

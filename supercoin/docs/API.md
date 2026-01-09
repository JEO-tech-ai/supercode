# SuperCoin API Documentation

## Overview

SuperCoin provides a unified TypeScript API for working with multiple AI providers (Claude, Codex, Gemini).

## Installation

```bash
npm install supercoin
```

## Quick Start

```typescript
import SuperCoin from 'supercoin';

const supercoin = new SuperCoin({
  workdir: process.cwd(),
  config: {
    default_model: 'anthropic/claude-sonnet-4-5',
  }
});

await supercoin.initialize();

const response = await supercoin.chat('Hello, world!');
console.log(response.content);
```

## Core API

### SuperCoin

```typescript
class SuperCoin {
  constructor(config: SuperCoinConfig)
  async initialize(): Promise<void>
  
  auth: AuthHub
  
  models: ModelRouter
  
  agents: IAgentRegistry
  
  todos: ITodoManager
  
  background: IBackgroundManager
  
  sessions: ISessionManager
  
  hooks: IHookRegistry
  
  tools: IToolRegistry
  
  async chat(prompt: string, options?: ChatOptions): Promise<AIResponse>
  
  async complete(request: AIRequest, options?: CompleteOptions): Promise<AIResponse>
  
  async spawnBackground(agentName, prompt, description): Promise<string>
  
  getBackgroundOutput(taskId, wait?): Promise<AgentResult | null>
}
```

## Authentication

### AuthHub

```typescript
auth.status(): Promise<AuthStatus[]>
auth.login(provider: AuthProviderName): Promise<AuthResult[]>
auth.logout(provider?: AuthProviderName): Promise<void>
auth.refresh(provider: AuthProviderName): Promise<TokenData>
auth.getToken(provider: AuthProviderName): Promise<string | null>
auth.isAuthenticated(provider: AuthProviderName): Promise<boolean>
```

### Providers

#### Claude (Anthropic)
```typescript
import { ClaudeAuthProvider } from 'supercoin';

const claude = new ClaudeAuthProvider();
await claude.login({ apiKey: 'sk-ant-...' });
```

#### Codex (OpenAI)
```typescript
import { CodexAuthProvider } from 'supercoin';

const codex = new CodexAuthProvider();
await codex.login({ apiKey: 'sk-...' });
```

#### Gemini (Google)
```typescript
import { GeminiAuthProvider } from 'supercoin';

const gemini = new GeminiAuthProvider();
await gemini.login();
```

## Models

### ModelRouter

```typescript
import { getModelRouter } from 'supercoin';

const router = getModelRouter({
  defaultModel: 'anthropic/claude-sonnet-4-5',
  fallbackModels: ['openai/gpt-5.2', 'google/gemini-3-flash'],
});

const currentModel = router.getCurrentModel();
const models = router.listModels();
const modelInfo = router.getModelInfo('anthropic/claude-sonnet-4-5');

await router.setModel('openai/gpt-5.2');
```

### Model Aliases

| Alias | Full Model ID |
|-------|--------------|
| `claude` | `anthropic/claude-sonnet-4-5` |
| `sonnet` | `anthropic/claude-sonnet-4-5` |
| `opus` | `anthropic/claude-opus-4-5` |
| `haiku` | `anthropic/claude-haiku-4-5` |
| `gpt` | `openai/gpt-5.2` |
| `gpt-5` | `openai/gpt-5.2` |
| `o1` | `openai/o1` |
| `o3` | `openai/o3` |
| `gemini` | `google/gemini-3-flash` |
| `flash` | `google/gemini-3-flash` |
| `pro` | `google/gemini-3-pro` |

## Agents

### Agent Registry

```typescript
import { getAgentRegistry } from 'supercoin';

const registry = getAgentRegistry();
const agents = registry.list();
const explorer = registry.get('explorer');
```

### Available Agents

| Agent | Default Model | Purpose |
|--------|---------------|---------|
| **Orchestrator** | Claude Sonnet 4.5 | Request classification, task planning |
| **Explorer** | Claude Haiku 4.5 | Code navigation, search, discovery |
| **Analyst** | Gemini 3 Flash | Large context analysis (1M tokens) |
| **Executor** | GPT-5.2 | Command execution, tool usage |
| **Code Reviewer** | Claude Opus 4.5 | Deep code review, quality analysis |
| **Doc Writer** | Gemini 3 Pro | Documentation generation |

### Agent Request

```typescript
interface AgentRequest {
  sessionId: string;
  agentName: AgentName;
  prompt: string;
  context?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}
```

## Hooks

### Hook Registry

```typescript
import { getHookRegistry } from 'supercoin';

const hooks = getHookRegistry();
hooks.register({
  name: 'my-hook',
  events: ['pre_tool_use'],
  handler: async (context) => { /* ... */ }
});
```

### Hook Events

- `pre_compact`
- `pre_tool_use`
- `post_tool_use`
- `pre_model_request`
- `post_model_request`

### Built-in Hooks

1. **Todo Continuation**: Automatically continues work from TODOs
2. **Logging**: Logs all operations
3. **Context Injection**: Injects project context

## Tools

### Tool Registry

```typescript
import { getToolRegistry } from 'supercoin';

const tools = getToolRegistry();
tools.list();
const tool = tools.get('bash');
```

### Available Tools

| Tool | Description |
|-------|-------------|
| **bash** | Execute shell commands |
| **read** | Read file contents |
| **write** | Write file contents |
| **edit** | Edit file contents |
| **grep** | Search file contents |
| **glob** | Find files by pattern |
| **session** | Session management |

## Configuration

### Configuration Schema

```typescript
interface SuperCoinConfig {
  default_model: string;
  fallback_models: string[];
  providers?: {
    anthropic?: { enabled?: boolean; apiKey?: string; baseUrl?: string };
    openai?: { enabled?: boolean; apiKey?: string; baseUrl?: string };
    google?: { enabled?: boolean; apiKey?: string; clientId?: string; clientSecret?: string; baseUrl?: string };
  };
  agents?: Record<string, { model?: string; disabled?: boolean }>;
  disabled_hooks?: string[];
  server?: { port?: number; host?: string; autoStart?: boolean };
}
```

### Config Priority

1. CLI arguments (`--model`, `--temperature`, `--max-tokens`)
2. Environment variables (`SUPERCOIN_DEFAULT_MODEL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`)
3. Project config (`.supercoin/config.json`)
4. User config (`~/.config/supercoin/config.json`)
5. Built-in defaults

## CLI Usage

### Basic Commands

```bash
supercoin "Hello, world!"
supercoin -m gpt "What's the weather?"
supercoin --temperature 0.7 "Tell me a story"
```

### Authentication

```bash
supercoin auth login
supercoin auth status
supercoin auth logout --claude
supercoin auth refresh --gemini
```

### Models

```bash
supercoin models list
supercoin models info anthropic/claude-opus-4-5
supercoin models set-default openai/gpt-5.2
```

### Agents

```bash
supercoin agent list
supercoin agent spawn explorer "Find all TypeScript files"
supercoin agent status <task-id>
```

### Server

```bash
supercoin server start
supercoin server status
supercoin server stop
```

### Configuration

```bash
supercoin config
supercoin config get default_model
supercoin config set default_model anthropic/claude-sonnet-4-5
```

### Development

```bash
supercoin dev
supercoin build
supercoin test
```

## Background Tasks

### Background Manager

```typescript
import { getBackgroundManager } from 'supercoin';

const bg = getBackgroundManager();

const taskId = await bg.spawn({
  sessionId: 'session-id',
  agent: 'explorer',
  prompt: 'Search for bugs',
  description: 'Find all bugs',
});

const status = bg.getStatus(taskId);
const output = await bg.getOutput(taskId, true);
bg.cancel(taskId);
```

### Concurrency Limits

- **Default**: 3 concurrent tasks per provider
- **Configurable**: Per-provider limits in config
- **Queue Management**: Automatic queuing when limits reached

## Sessions

### Session Manager

```typescript
import { getSessionManager } from 'supercoin';

const sessions = getSessionManager();
const session = sessions.create(process.cwd(), 'anthropic/claude-sonnet-4-5');

sessions.setCurrent(session.id);
sessions.addMessage(session.id, {
  role: 'user',
  content: 'Hello!',
});

const messages = sessions.getMessages(session.id);
sessions.end(session.id);
```

## Error Handling

### Error Types

```typescript
import { SuperCoinError, AuthError, ModelError, ConfigError, NetworkError, AgentError } from 'supercoin';
```

### Example Error Handling

```typescript
try {
  const response = await supercoin.chat('Hello');
} catch (error) {
  if (error instanceof AuthError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof ModelError) {
    console.error('Model error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Building

### Build System

```bash
bun run build
```

Builds both:
- CLI entry point (`dist/cli/index.js`)
- Library entry point (`dist/index.js`)

### esbuild Configuration

```typescript
// scripts/build.ts
import { build } from 'esbuild';

await build({
  entryPoints: ['./src/cli/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: './dist/cli/index.js',
  sourcemap: true,
  external: ['@clack/prompts', 'commander', 'zod', 'hono'],
});
```

## Testing

### Running Tests

```bash
bun test
bun test --coverage
```

### Test Structure

```
tests/
├── unit/
│   ├── auth/
│   ├── models/
│   ├── agents/
│   ├── core/
│   └── utils/
├── integration/
│   ├── auth-flow/
│   ├── model-routing/
│   └── agent-workflow/
├── e2e/
│   └── scenarios/
├── fixtures/
│   └── helpers/
```

## Development

### Development Mode

```bash
bun run dev
```

Starts development server with hot reload.

### Type Checking

```bash
bun run lint
```

Validates TypeScript without emitting files.

## Project Structure

```
supercoin/
├── src/
│   ├── cli/              # CLI commands
│   ├── config/            # Configuration management
│   ├── core/              # Hooks, tools, sessions
│   ├── services/
│   │   ├── auth/         # Authentication providers
│   │   ├── models/       # Model router & providers
│   │   └── agents/       # Agent system
│   ├── server/            # HTTP server & routes
│   ├── shared/            # Logger, errors
│   └── supercoin.ts      # Main API class
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/             # End-to-end tests
├── scripts/            # Build scripts
├── docs/               # Documentation
├── examples/           # Sample applications
├── work/               # Work tracking
├── plan/               # Plan documents
└── package.json
```

## Security

- **Token Storage**: AES-256-GCM encrypted storage in local filesystem
- **No Cloud Exposure**: Tokens never sent to external servers except provider APIs
- **Local-Only Server**: Binds to 127.0.0.1 only
- **Type Safety**: Full TypeScript coverage with Zod validation

## License

MIT License - see LICENSE file for details

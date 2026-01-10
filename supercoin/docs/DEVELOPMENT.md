# SuperCoin Development Guide

## Overview

SuperCoin is a unified AI CLI hub for Claude, Codex, and Gemini. This guide covers development, testing, and contribution guidelines.

## Getting Started

```bash
# Clone repository
git clone https://github.com/JEO-tech-ai/supercode.git
cd supercoin

# Install dependencies
npm install

# Development mode
bun run dev

# Run tests
bun test

# Type check
bun run lint

# Build
bun run build
```

## Project Structure

```
supercoin/
├── src/
│   ├── cli/              # CLI commands
│   ├── config/            # Configuration management
│   ├── core/              # Hooks, Tools, Sessions
│   ├── services/
│   │   ├── auth/         # Authentication providers
│   │   ├── models/       # Model router & providers
│   │   ├── agents/       # Agent system
│   │   └── background/   # Background task management
│   ├── server/            # HTTP server & routes
│   ├── shared/            # Utilities
│   └── supercoin.ts      # Main API class
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/             # End-to-end tests
│   ├── fixtures/           # Test data
│   └── helpers/           # Test utilities
├── scripts/             # Build scripts
├── docs/               # Documentation
├── work/               # Work tracking
├── plan/               # Planning documents
└── package.json
```

## Development Workflow

### 1. Feature Development

1. Create feature branch
   ```bash
   git checkout -b feature/new-feature
   ```

2. Implement changes
   - Follow code patterns
   - Add tests
   - Update documentation

3. Test changes
   ```bash
   bun test
   ```

4. Commit changes
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. Push and create PR
   ```bash
   git push origin feature/new-feature
   ```

### 2. Testing Guidelines

#### Unit Tests
- Location: `tests/unit/`
- Naming: `[feature].test.ts`
- Structure: One test file per module
- Coverage: Aim for >80%

#### Integration Tests
- Location: `tests/integration/`
- Naming: `[feature].e2e.test.ts`
- Scope: End-to-end workflows

#### E2E Tests
- Location: `tests/e2e/`
- Naming: `[scenario].e2e.test.ts`
- Focus: Real-world usage patterns

### 3. Code Patterns

#### File Organization
- CLI commands → `src/cli/commands/`
- Services → `src/services/`
- Shared utilities → `src/shared/`
- Tools → `src/core/tools/`

#### Naming Conventions
- Classes: `PascalCase` (e.g., `ModelRouter`)
- Functions: `camelCase` (e.g., `getModelInfo`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `ANTIGRAVITY_CLIENT_ID`)
- Interfaces: `I` prefix (e.g., `IAuthProvider`)

#### Type Safety
- Always use Zod for runtime validation
- Use TypeScript interfaces for all public APIs
- Avoid `as any`, `@ts-ignore`, `@ts-expect-error`
- Use strict TypeScript mode

### 4. Configuration

#### Priority Order
1. CLI arguments (`--model`, `--temperature`)
2. Environment variables (`SUPERCOIN_DEFAULT_MODEL`, `ANTHROPIC_API_KEY`)
3. `.supercoin/config.json` (project-level)
4. `~/.config/supercoin/config.json` (user-level)
5. Built-in defaults

#### Config Example

See `.supercoin/config.example.json` for reference.

### 5. Building

```bash
# Development build
bun run dev

# Production build
bun run build

# Type check only
bun run lint
```

### 6. Documentation

- **API Reference**: `docs/API.md`
- **Architecture**: See `plan/` folder
- **Work Tracking**: See `work/` folder

### 7. Git Workflow

#### Branch Strategy
- `main` - Production releases
- `feature/*` - Feature development
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

#### Commit Message Format
```
<type>: <scope>: <short description>

Examples:
feat: add Gemini OAuth support
fix: correct model alias resolution
docs: update API reference
```

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test suite
bun test tests/unit/auth

# Type check
bun run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Create a pull request

## License

MIT License - see LICENSE file for details

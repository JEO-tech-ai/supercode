# Contributing to SuperCode

Thank you for your interest in contributing to SuperCode! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (required)
- [Ollama](https://ollama.com) (recommended for testing local models)
- Git
- A GitHub account

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/supercode.git
cd supercode/supercode

# Install dependencies
bun install

# Run tests to verify setup
bun test

# Try the CLI
bun src/cli/index.ts "Hello world"
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 2. Make Your Changes

- Write clean, readable TypeScript code
- Follow existing code patterns and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/your-test.test.ts

# Type check
bun run lint

# Test the CLI manually
bun src/cli/index.ts "test prompt"
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Feature
git commit -m "feat: add support for new AI provider"

# Bug fix
git commit -m "fix: resolve token refresh issue"

# Documentation
git commit -m "docs: update installation guide"

# Refactor
git commit -m "refactor: simplify auth flow"

# Tests
git commit -m "test: add unit tests for model router"

# Chore
git commit -m "chore: update dependencies"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear title following commit conventions
- Description of what changed and why
- Reference to related issues (if any)
- Screenshots/demos for UI changes

## Code Guidelines

### TypeScript Style

```typescript
// ✅ Good: Use TypeScript types
interface UserConfig {
  provider: string;
  model: string;
}

// ❌ Bad: Avoid any
const config: any = loadConfig();

// ✅ Good: Use async/await
async function fetchData() {
  const result = await apiCall();
  return result;
}

// ❌ Bad: Avoid promise chains when async/await is clearer
function fetchData() {
  return apiCall().then(result => result);
}
```

### Error Handling

```typescript
// ✅ Good: Specific error types
import { AuthError } from "@/shared/errors";

if (!apiKey) {
  throw new AuthError("API key is required");
}

// ❌ Bad: Generic errors
throw new Error("Something went wrong");
```

### Testing

```typescript
// ✅ Good: Descriptive test names
test("should refresh OAuth token when expired", async () => {
  // Test implementation
});

// ❌ Bad: Vague test names
test("token test", async () => {
  // Test implementation
});
```

## Project Structure

Understanding the codebase structure:

```
supercode/
├── src/
│   ├── cli/                    # CLI commands and entry point
│   ├── config/                 # Configuration management
│   ├── core/                   # Core functionality (tools, hooks)
│   ├── server/                 # Local auth server
│   ├── services/
│   │   ├── auth/              # Authentication logic
│   │   ├── models/            # AI model integrations
│   │   │   └── ai-sdk/        # AI SDK abstraction
│   │   └── agents/            # Agent system
│   └── shared/                 # Shared utilities
├── tests/
│   ├── unit/                  # Unit tests
│   └── e2e/                   # End-to-end tests
└── examples/                   # Usage examples
```

## Adding New Features

### Adding a New AI Provider

1. Update provider registry in `src/services/models/ai-sdk/registry.ts`
2. Add provider configuration to schema in `src/config/schema.ts`
3. Add authentication support in `src/services/auth/` (if needed)
4. Add tests in `tests/unit/ai-sdk-registry.test.ts`
5. Update README with provider documentation

### Adding a New CLI Command

1. Create command file in `src/cli/commands/`
2. Register command in `src/cli/index.ts`
3. Add tests in `tests/e2e/`
4. Update README with command documentation

### Adding a New Agent

1. Create agent file in `src/services/agents/`
2. Extend `BaseAgent` class
3. Register in `src/services/agents/registry.ts`
4. Add tests in `tests/unit/` and `tests/e2e/`
5. Update documentation

## Testing Guidelines

### Unit Tests

- Test individual functions and classes in isolation
- Mock external dependencies
- Aim for high coverage of critical paths

```typescript
import { describe, test, expect } from "bun:test";

describe("TokenStore", () => {
  test("should encrypt tokens with AES-256-GCM", async () => {
    const store = new TokenStore();
    const token = "secret_token";
    
    const encrypted = await store.encrypt(token);
    const decrypted = await store.decrypt(encrypted);
    
    expect(decrypted).toBe(token);
  });
});
```

### E2E Tests

- Test complete user workflows
- Use actual integrations (with test providers)
- Verify CLI output and behavior

```typescript
import { describe, test, expect } from "bun:test";
import { $ } from "bun";

describe("E2E: CLI Chat", () => {
  test("should chat with Ollama", async () => {
    const result = await $`bun src/cli/index.ts "Hello"`.text();
    expect(result).toContain("Provider: ollama");
  });
});
```

## Documentation

When adding features, update:

1. **README.md** - User-facing documentation
2. **Code Comments** - Complex logic explanations
3. **JSDoc** - Public API documentation
4. **CONTRIBUTING.md** - Developer guidelines (this file)

## Pull Request Process

1. **Before Submitting:**
   - ✅ All tests pass (`bun test`)
   - ✅ No type errors (`bun run lint`)
   - ✅ Code follows project conventions
   - ✅ Documentation updated
   - ✅ Commits follow conventional commits

2. **PR Description Should Include:**
   - What problem does this solve?
   - What changes were made?
   - How to test the changes?
   - Any breaking changes?
   - Related issues/PRs

3. **Review Process:**
   - Maintainers will review within 1-3 days
   - Address feedback and push updates
   - Once approved, maintainers will merge

## Common Issues

### Tests Failing Locally

```bash
# Clear test cache
rm -rf node_modules/.cache

# Reinstall dependencies
bun install

# Run tests again
bun test
```

### Type Errors After Dependency Update

```bash
# Regenerate lock file
rm bun.lockb
bun install

# Type check
bun run lint
```

### CLI Not Working

```bash
# Verify Ollama is running
ollama list

# Check config
cat ~/.config/supercode/config.json

# Run with verbose output
bun src/cli/index.ts -v "test"
```

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community (link in README)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow GitHub's community guidelines

## License

By contributing to SuperCode, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SuperCode! 🚀

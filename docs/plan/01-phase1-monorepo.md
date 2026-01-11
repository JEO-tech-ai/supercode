# Phase 1: Monorepo Migration

> **Phase**: 1 of 7
> **Priority**: High
> **Estimated Duration**: 2 days
> **Dependencies**: None

---

## Objective

현재 단일 패키지 CLI 애플리케이션을 Bun + Turborepo 기반 모노레포 구조로 마이그레이션합니다.

## Current State Analysis

### Existing Structure
```
supercoin/
├── src/
│   ├── cli/                # CLI entry point and commands
│   ├── core/               # Sessions, hooks, tool registry
│   ├── config/             # Configuration loading
│   ├── services/           # AI models, agents, auth
│   ├── server/             # Hono local server
│   ├── shared/             # Common utilities
│   └── supercoin.ts        # Main orchestrator
├── scripts/                # Build scripts
├── tests/                  # Test files
└── package.json            # Single package config
```

### Key Files to Migrate
- `src/cli/` → `packages/cli/src/`
- `src/core/` → `packages/core/src/`
- `src/services/` → `packages/core/src/services/`
- `src/shared/` → `packages/core/src/shared/`
- `src/config/` → `packages/config/src/`

---

## Target Structure

```
supercoin/
├── packages/
│   ├── cli/                    # CLI Application
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   └── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── core/                   # Core Business Logic
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── session/
│   │   │   ├── hooks/
│   │   │   ├── tools/
│   │   │   └── supercoin.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── services/               # Services Layer
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── models/
│   │   │   ├── agents/
│   │   │   └── background/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── server/                 # HTTP Server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   └── store/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/                 # Shared Utilities
│   │   ├── src/
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   └── ui.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                 # Shared Configurations
│       ├── tsconfig/
│       │   ├── base.json
│       │   └── package.json
│       └── eslint/
│           ├── index.js
│           └── package.json
├── turbo.json
├── package.json               # Workspace root
└── bun.lock
```

---

## Implementation Steps

### Step 1.1: Root Workspace Setup

**File: `package.json` (root)**
```json
{
  "name": "supercoin",
  "private": true,
  "packageManager": "bun@1.3.5",
  "workspaces": [
    "packages/*",
    "packages/config/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.3.3"
  }
}
```

### Step 1.2: Turborepo Configuration

**File: `turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "cache": false
    },
    "lint": {
      "cache": false
    }
  }
}
```

### Step 1.3: Base TypeScript Configuration

**File: `packages/config/tsconfig/base.json`**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["bun-types"]
  }
}
```

### Step 1.4: Shared Package

**File: `packages/shared/package.json`**
```json
{
  "name": "@supercoin/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./logger": "./src/logger.ts",
    "./errors": "./src/errors.ts",
    "./ui": "./src/ui.ts"
  },
  "dependencies": {
    "@clack/prompts": "^0.7.0"
  },
  "devDependencies": {
    "@supercoin/tsconfig": "workspace:*",
    "typescript": "^5.3.3"
  }
}
```

### Step 1.5: Core Package

**File: `packages/core/package.json`**
```json
{
  "name": "@supercoin/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./session": "./src/session/index.ts",
    "./hooks": "./src/hooks.ts",
    "./tools": "./src/tools/index.ts"
  },
  "dependencies": {
    "@supercoin/shared": "workspace:*",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@supercoin/tsconfig": "workspace:*",
    "typescript": "^5.3.3"
  }
}
```

### Step 1.6: Services Package

**File: `packages/services/package.json`**
```json
{
  "name": "@supercoin/services",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./auth": "./src/auth/index.ts",
    "./models": "./src/models/index.ts",
    "./agents": "./src/agents/index.ts"
  },
  "dependencies": {
    "@supercoin/core": "workspace:*",
    "@supercoin/shared": "workspace:*",
    "@ai-sdk/anthropic": "^3.0.9",
    "@ai-sdk/google": "^3.0.6",
    "@ai-sdk/openai": "^3.0.7",
    "ai": "^6.0.26"
  },
  "devDependencies": {
    "@supercoin/tsconfig": "workspace:*",
    "typescript": "^5.3.3"
  }
}
```

### Step 1.7: CLI Package

**File: `packages/cli/package.json`**
```json
{
  "name": "supercoin",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "supercoin": "./src/index.ts"
  },
  "dependencies": {
    "@supercoin/core": "workspace:*",
    "@supercoin/services": "workspace:*",
    "@supercoin/shared": "workspace:*",
    "commander": "^12.0.0",
    "ink": "^6.6.0",
    "react": "^19.2.3"
  },
  "devDependencies": {
    "@supercoin/tsconfig": "workspace:*",
    "@types/react": "^19.2.7",
    "typescript": "^5.3.3"
  }
}
```

---

## Migration Checklist

### Files to Move

| Source | Destination |
|--------|-------------|
| `src/shared/logger.ts` | `packages/shared/src/logger.ts` |
| `src/shared/errors.ts` | `packages/shared/src/errors.ts` |
| `src/shared/ui.ts` | `packages/shared/src/ui.ts` |
| `src/core/session/` | `packages/core/src/session/` |
| `src/core/hooks.ts` | `packages/core/src/hooks.ts` |
| `src/services/auth/` | `packages/services/src/auth/` |
| `src/services/models/` | `packages/services/src/models/` |
| `src/services/agents/` | `packages/services/src/agents/` |
| `src/cli/` | `packages/cli/src/` |
| `src/server/` | `packages/server/src/` |
| `src/supercoin.ts` | `packages/core/src/supercoin.ts` |

### Import Path Updates

```typescript
// Before
import logger from "./shared/logger";
import { getAuthHub } from "./services/auth/hub";

// After
import { logger } from "@supercoin/shared/logger";
import { getAuthHub } from "@supercoin/services/auth";
```

---

## Verification Commands

```bash
# 1. Install dependencies
bun install

# 2. Type check all packages
bun turbo typecheck

# 3. Build all packages
bun turbo build

# 4. Run tests
bun turbo test

# 5. Run CLI
bun packages/cli/src/index.ts --help
```

---

## Success Criteria

- [ ] All packages have valid `package.json` with workspace references
- [ ] `turbo.json` correctly defines task dependencies
- [ ] TypeScript references work across packages
- [ ] `bun turbo typecheck` passes
- [ ] `bun turbo build` succeeds
- [ ] Existing 143 tests still pass
- [ ] CLI runs correctly: `bun packages/cli/src/index.ts --help`

---

## Rollback Plan

If migration fails:
1. Keep original `src/` directory intact during migration
2. Use git branches for safe experimentation
3. Only delete original after full verification

---

**Next**: [Phase 2: UI Component Library](./02-phase2-ui-library.md)

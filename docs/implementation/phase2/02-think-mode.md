# Phase 2.2: Think Mode Hook

> Priority: P1 (High)
> Effort: 1-2 days
> Dependencies: None

## Overview

Think Mode controls the thinking/reasoning budget for models that support extended thinking (like Claude with extended thinking, o1, etc.). It injects thinking budget parameters into requests based on configuration.

## Current State in SuperCode

### Existing Files
```
src/core/hooks/types.ts   # HookResult has thinkingBudget field
```

### What Exists
- HookResult type includes `thinkingBudget` field
- Model provider infrastructure

### What's Missing
- Think mode hook implementation
- Budget configuration
- Model capability detection

## Implementation Plan

### File Structure
```
src/core/hooks/think-mode.ts   # Single file implementation
```

### Implementation (`think-mode.ts`)

```typescript
import type { Hook, HookContext, HookResult } from './types';
import { Log } from '../../shared/logger';

export interface ThinkModeConfig {
  enabled: boolean;
  defaultBudget: number;        // Default thinking tokens
  maxBudget: number;            // Maximum allowed
  minBudget: number;            // Minimum allowed
  modelBudgets: Record<string, number>;  // Per-model overrides
}

export const DEFAULT_CONFIG: ThinkModeConfig = {
  enabled: true,
  defaultBudget: 10000,
  maxBudget: 100000,
  minBudget: 1000,
  modelBudgets: {
    'claude-3-5-sonnet': 8000,
    'claude-3-opus': 16000,
    'claude-opus-4': 32000,
    'o1': 50000,
    'o1-mini': 20000,
  },
};

// Models that support extended thinking
const THINKING_MODELS = new Set([
  'claude-3-5-sonnet',
  'claude-3-opus',
  'claude-opus-4',
  'claude-4',
  'o1',
  'o1-mini',
  'o1-preview',
]);

export interface ThinkModeOptions {
  config?: Partial<ThinkModeConfig>;
  getCurrentModel?: () => string | undefined;
}

export function createThinkModeHook(
  options: ThinkModeOptions = {}
): Hook {
  const config: ThinkModeConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  const getCurrentModel = options.getCurrentModel ?? (() => undefined);

  function supportsThinking(model: string): boolean {
    const normalized = model.toLowerCase();
    
    for (const supported of THINKING_MODELS) {
      if (normalized.includes(supported)) {
        return true;
      }
    }
    
    return false;
  }

  function getBudgetForModel(model: string): number {
    const normalized = model.toLowerCase();
    
    // Check for exact match first
    for (const [key, budget] of Object.entries(config.modelBudgets)) {
      if (normalized.includes(key.toLowerCase())) {
        return Math.min(Math.max(budget, config.minBudget), config.maxBudget);
      }
    }
    
    return config.defaultBudget;
  }

  return {
    name: 'think-mode',
    description: 'Controls thinking budget for models with extended thinking',
    priority: 80, // Run early to set budget
    events: ['request.before', 'message.before'],

    handler: async (context: HookContext): Promise<HookResult | void> => {
      if (!config.enabled) return;

      const { event, data } = context;
      
      // Get current model
      const model = (data as { model?: string })?.model ?? getCurrentModel();
      
      if (!model) return;

      // Check if model supports thinking
      if (!supportsThinking(model)) {
        return;
      }

      // Get budget for this model
      const budget = getBudgetForModel(model);

      Log.debug(`[think-mode] Setting thinking budget`, { 
        model, 
        budget 
      });

      return {
        thinkingBudget: budget,
      };
    },
  };
}

// Utility to parse thinking budget from user input
export function parseThinkingBudget(input: string): number | null {
  const match = input.match(/--think(?:ing)?[=:]?\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Utility to check if thinking should be disabled
export function shouldDisableThinking(input: string): boolean {
  return /--no-think(?:ing)?/i.test(input);
}
```

## Integration

### Usage with AI SDK

```typescript
// When making model calls
const hook = createThinkModeHook();
const result = await hook.handler({ 
  event: 'request.before', 
  sessionId, 
  data: { model: 'claude-opus-4' } 
});

if (result?.thinkingBudget) {
  // Apply to Anthropic request
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: result.thinkingBudget,
    },
    messages: [...],
  });
}
```

## Testing

```typescript
describe('ThinkModeHook', () => {
  it('should return budget for supported models');
  it('should return undefined for unsupported models');
  it('should use model-specific budgets');
  it('should respect min/max bounds');
});

describe('parseThinkingBudget', () => {
  it('should parse --think=10000');
  it('should parse --thinking:5000');
  it('should return null for no match');
});
```

## Success Criteria

- [ ] Detects thinking-capable models
- [ ] Returns appropriate budget
- [ ] Respects per-model configuration
- [ ] Integrates with AI SDK calls

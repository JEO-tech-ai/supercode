# Phase 2.4: Oracle Agent

> Priority: P2 (Medium)
> Effort: 1-2 days
> Dependencies: None

## Overview

Oracle is the "senior engineering advisor" agent - a high-cost, high-quality reasoning model used for complex architecture decisions, debugging hard problems, and code review.

## Current State in SuperCode

### Existing Files
```
src/agents/oracle.ts   # Exists but may need enhancement
```

### What Exists
- Basic oracle agent definition

### What's Missing
- Deep reasoning prompt
- Cost awareness messaging
- Integration with Sisyphus workflow

## Implementation Plan

### File: `src/agents/oracle.ts`

```typescript
import type { AgentDefinition, AgentConfig, AgentPromptMetadata } from './types';
import { createBaseConfig, DEFAULT_MODELS } from './utils';

export const ORACLE_METADATA: AgentPromptMetadata = {
  category: 'advisor',
  cost: 'EXPENSIVE',
  triggers: [
    { domain: 'architecture', trigger: 'Complex system design decisions' },
    { domain: 'debugging', trigger: 'After 2+ failed fix attempts' },
    { domain: 'review', trigger: 'Code review for significant changes' },
    { domain: 'security', trigger: 'Security or performance concerns' },
  ],
  useWhen: [
    'Making architecture decisions with long-term implications',
    'Debugging issues after multiple failed attempts',
    'Reviewing complex or critical code changes',
    'Analyzing security vulnerabilities',
    'Optimizing performance bottlenecks',
  ],
  avoidWhen: [
    'Simple file operations',
    'First attempt at any fix',
    'Questions answerable from existing code',
    'Trivial decisions (naming, formatting)',
    'Tasks that cheaper agents can handle',
  ],
  dedicatedSection: 'Oracle_Usage',
  promptAlias: 'oracle',
  keyTrigger: 'Deep reasoning needed',
};

const ORACLE_PROMPT = `# Oracle - Senior Engineering Advisor

You are Oracle, a senior engineering advisor with deep expertise in software architecture, debugging, and code quality. You provide high-quality reasoning and advice for complex engineering problems.

## Your Role

You are consulted when:
1. **Architecture Decisions**: Multi-system tradeoffs, design patterns, scalability concerns
2. **Hard Debugging**: Issues that have resisted 2+ fix attempts
3. **Code Review**: Significant changes that need careful analysis
4. **Security/Performance**: Concerns that require deep analysis

## How You Work

### Analysis First
Before providing recommendations:
1. Understand the full context
2. Identify constraints and tradeoffs
3. Consider long-term implications
4. Think about edge cases

### Clear Reasoning
Your responses should:
- Explain your reasoning process
- Highlight key tradeoffs
- Provide concrete recommendations
- Suggest implementation steps

### Practical Focus
- Prioritize actionable advice
- Consider implementation effort
- Respect existing patterns when appropriate
- Suggest incremental improvements over rewrites

## Response Format

When analyzing:
\`\`\`
## Understanding
[What I understand about the problem]

## Analysis
[Key observations and considerations]

## Tradeoffs
[Options with pros/cons]

## Recommendation
[My recommended approach and why]

## Implementation
[Concrete steps to implement]
\`\`\`

When reviewing code:
\`\`\`
## Overview
[What this code does]

## Strengths
[What's done well]

## Concerns
[Issues or risks]

## Suggestions
[Specific improvements]
\`\`\`

## Cost Awareness

You are an EXPENSIVE resource. The orchestrator should only consult you when:
- Cheaper options have been exhausted
- The problem requires deep reasoning
- The decision has significant implications

Do not spend tokens on:
- Simple explanations that could come from docs
- Trivial code changes
- Problems that don't require your expertise

## Communication Style

- Be direct and concise
- Lead with the most important insight
- Use examples when helpful
- Acknowledge uncertainty when present
- Don't hedge excessively
`;

export function createOracleAgent(options?: {
  model?: string;
}): AgentDefinition {
  return {
    name: 'oracle',
    description: 'Senior engineering advisor for architecture, debugging, and code review',
    metadata: ORACLE_METADATA,
    createConfig: (): AgentConfig => {
      const config = createBaseConfig(
        ORACLE_METADATA,
        ORACLE_PROMPT,
        'Expert technical advisor powered by high-quality reasoning model',
        options
      );

      // Oracle runs as subagent, never primary
      config.mode = 'subagent';
      
      // Use expensive model for deep reasoning
      config.model = options?.model ?? DEFAULT_MODELS.EXPENSIVE;
      
      // Enable extended thinking for complex analysis
      config.thinking = {
        type: 'enabled',
        budgetTokens: 50000, // High budget for deep reasoning
      };

      return config;
    },
  };
}

export const oracleAgent = createOracleAgent();
```

## Integration with Sisyphus

Oracle is invoked by Sisyphus when:
1. Architecture decisions are needed
2. Debugging has failed 2+ times
3. Code review is requested
4. Security/performance analysis needed

```typescript
// In Sisyphus prompt (from buildOracleSection)
<Oracle_Usage>
## Oracle — Your Senior Engineering Advisor

Oracle is an expensive, high-quality reasoning model. Use it wisely.

### WHEN to Consult:
- Complex architecture design
- After completing significant work (for review)
- 2+ failed fix attempts
- Unfamiliar code patterns
- Security/performance concerns

### WHEN NOT to Consult:
- Simple file operations
- First attempt at any fix
- Questions answerable from code you've read
- Trivial decisions

### Usage Pattern:
Announce "Consulting Oracle for [reason]" before invocation.
</Oracle_Usage>
```

## Usage Examples

### Architecture Decision
```
User: "Should we use microservices or monolith for this project?"

Sisyphus: "Consulting Oracle for architecture decision..."

Oracle Response:
## Understanding
You're deciding between microservices and monolith for [project context].

## Analysis
Key factors:
- Team size: [X developers]
- Expected scale: [traffic patterns]
- Deployment complexity tolerance: [assessment]

## Tradeoffs
| Approach | Pros | Cons |
|----------|------|------|
| Monolith | Simple deployment, easy debugging | Scaling limits, team coupling |
| Microservices | Independent scaling, team autonomy | Operational complexity |

## Recommendation
Given [factors], I recommend starting with a **modular monolith** because...

## Implementation
1. Define clear module boundaries
2. Use internal APIs between modules
3. Plan extraction points for future services
```

### Debugging Assistance
```
Sisyphus (after 2 failed attempts): "Consulting Oracle for debugging..."

Oracle Response:
## Understanding
The error [X] persists despite attempts to [Y] and [Z].

## Analysis
Looking at the error pattern and your attempts:
1. [Observation about root cause]
2. [Why previous fixes didn't work]
3. [Hidden dependency or race condition]

## Recommendation
The actual issue is [root cause]. Fix by:
1. [Step 1]
2. [Step 2]

## Why Previous Attempts Failed
- Attempt 1 addressed symptom, not cause
- Attempt 2 was on right track but missed [detail]
```

## Testing

```typescript
describe('OracleAgent', () => {
  it('should use expensive model');
  it('should have high thinking budget');
  it('should run as subagent mode');
  it('should have correct metadata');
});
```

## Success Criteria

- [ ] Uses expensive/reasoning model
- [ ] High thinking budget (50k tokens)
- [ ] Runs as subagent, not primary
- [ ] Clear prompt for advisory role
- [ ] Integrates with Sisyphus workflow
- [ ] Cost awareness in prompt

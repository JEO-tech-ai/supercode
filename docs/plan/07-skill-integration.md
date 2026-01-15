# Plan: .agent-skills Integration

> **Priority**: 🟡 High | **Phase**: 3 | **Duration**: 1 week

---

## Objective

Integrate the .agent-skills framework into SuperCode:
- Load 46 skills across 8 categories
- Support token-optimized formats (SKILL.md, SKILL.compact.md, SKILL.toon)
- Enable multi-agent routing
- Provide skill query CLI

---

## .agent-skills Overview

```
.agent-skills/
├── backend/               # 6 skills
├── frontend/              # 4 skills
├── code-quality/          # 6 skills
├── infrastructure/        # 6 skills
├── documentation/         # 4 skills
├── project-management/    # 6 skills
├── search-analysis/       # 4 skills
├── utilities/             # 9 skills
├── agent-routing.yaml     # Multi-agent config
├── skills.json            # Manifest
└── skill-query-handler.py # Query CLI
```

---

## Skill Format Support

### 1. SKILL.md (Full)

```markdown
---
name: api-design
description: Design RESTful and GraphQL APIs
tags: [api-design, REST, GraphQL, OpenAPI]
platforms: [Claude, ChatGPT, Gemini]
allowed-tools: [Read, Write, Edit]
---

# API Design Skill

## When to use
Use when creating new APIs, refactoring existing endpoints...

## Instructions
1. Define resource endpoints
2. Choose HTTP methods
3. Design request/response formats
...
```

### 2. SKILL.compact.md (88% reduction)

```markdown
# api-design
REST/GraphQL API design skill

## Steps
1. Define resources → 2. HTTP methods → 3. Formats → 4. Versioning

## Best Practices
- Use nouns for resources
- Consistent naming
...
```

### 3. SKILL.toon (95% reduction)

```
N:api-design
D:Design REST/GraphQL APIs
G:api,REST,GraphQL,OpenAPI
U:Creating/refactoring APIs
S:1.Resources→2.Methods→3.Formats→4.Versioning
R:Nouns for resources|Consistent naming|Version URLs
```

---

## Skill Loader Implementation

```typescript
// src/skills/loader.ts
export class SkillLoader {
  private skills = new Map<string, Skill>()
  
  async loadFromDirectory(dir: string): Promise<void> {
    const skillFiles = await glob(`${dir}/**/SKILL.md`)
    
    for (const file of skillFiles) {
      const skill = await this.parseSkill(file)
      this.skills.set(skill.name, skill)
      
      // Load compact and toon versions if available
      const compactPath = file.replace('SKILL.md', 'SKILL.compact.md')
      const toonPath = file.replace('SKILL.md', 'SKILL.toon')
      
      if (await exists(compactPath)) {
        skill.compactContent = await readFile(compactPath, 'utf-8')
      }
      if (await exists(toonPath)) {
        skill.toonContent = await readFile(toonPath, 'utf-8')
      }
    }
  }
  
  async parseSkill(filePath: string): Promise<Skill> {
    const content = await readFile(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)
    
    return {
      name: frontmatter.name,
      description: frontmatter.description,
      category: this.getCategoryFromPath(filePath),
      tags: frontmatter.tags || [],
      platforms: frontmatter.platforms || ['Claude'],
      allowedTools: frontmatter['allowed-tools'] || [],
      content: body,
      path: filePath,
    }
  }
  
  getSkill(name: string, mode: 'full' | 'compact' | 'toon' = 'toon'): string {
    const skill = this.skills.get(name)
    if (!skill) throw new Error(`Skill ${name} not found`)
    
    switch (mode) {
      case 'full': return skill.content
      case 'compact': return skill.compactContent || skill.content
      case 'toon': return skill.toonContent || skill.compactContent || skill.content
    }
  }
  
  search(query: string): Skill[] {
    const queryLower = query.toLowerCase()
    
    return Array.from(this.skills.values())
      .filter(skill => 
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower) ||
        skill.tags.some(tag => tag.toLowerCase().includes(queryLower))
      )
      .slice(0, 10)
  }
  
  matchQuery(query: string): Skill | undefined {
    // Use NLP or keyword matching to find best skill
    const keywords = extractKeywords(query)
    
    let bestMatch: Skill | undefined
    let bestScore = 0
    
    for (const skill of this.skills.values()) {
      const score = calculateRelevance(skill, keywords)
      if (score > bestScore) {
        bestScore = score
        bestMatch = skill
      }
    }
    
    return bestScore > 0.5 ? bestMatch : undefined
  }
}
```

---

## Multi-Agent Routing

```typescript
// src/skills/agent-routing.ts
export interface AgentRoutingConfig {
  patterns: PatternRule[]
  defaults: {
    orchestrator: string
    analyst: string
    executor: string
  }
}

export class AgentRouter {
  private config: AgentRoutingConfig
  
  async loadConfig(path: string): Promise<void> {
    const yaml = await readFile(path, 'utf-8')
    this.config = parseYaml(yaml)
  }
  
  routeTask(task: Task): AgentAssignment {
    // Match task to patterns
    for (const pattern of this.config.patterns) {
      if (this.matchesPattern(task, pattern)) {
        return {
          orchestrator: pattern.orchestrator || this.config.defaults.orchestrator,
          analyst: pattern.analyst || this.config.defaults.analyst,
          executor: pattern.executor || this.config.defaults.executor,
        }
      }
    }
    
    return this.config.defaults
  }
  
  private matchesPattern(task: Task, pattern: PatternRule): boolean {
    if (pattern.keywords) {
      return pattern.keywords.some(kw => 
        task.description.toLowerCase().includes(kw.toLowerCase())
      )
    }
    if (pattern.category) {
      return task.category === pattern.category
    }
    return false
  }
}
```

---

## CLI Commands

```typescript
// src/cli/commands/skill.ts
export const skillCommand = new Command('skill')
  .description('Manage and query skills')
  
  .command('list')
  .description('List all available skills')
  .action(async () => {
    const skills = skillLoader.listAll()
    console.table(skills.map(s => ({
      name: s.name,
      category: s.category,
      description: s.description.slice(0, 50) + '...',
    })))
  })
  
  .command('search <query>')
  .description('Search for skills')
  .action(async (query) => {
    const results = skillLoader.search(query)
    console.table(results)
  })
  
  .command('show <name>')
  .option('-m, --mode <mode>', 'Output mode: full, compact, toon', 'toon')
  .description('Show skill content')
  .action(async (name, options) => {
    const content = skillLoader.getSkill(name, options.mode)
    console.log(content)
  })
  
  .command('match <query>')
  .description('Match query to best skill')
  .action(async (query) => {
    const skill = skillLoader.matchQuery(query)
    if (skill) {
      console.log(`Matched: ${skill.name}`)
      console.log(skillLoader.getSkill(skill.name, 'toon'))
    } else {
      console.log('No matching skill found')
    }
  })
```

---

## Configuration

```jsonc
// supercode.json
{
  "skills": {
    "enabled": true,
    "paths": [
      "~/.agent-skills",
      "./.agent-skills"
    ],
    "defaultMode": "toon",  // Token-optimized by default
    "autoLoad": true,
    "agentRouting": true
  }
}
```

---

## File Structure

```
src/skills/
├── index.ts              # Public exports
├── loader.ts             # Skill loader
├── parser.ts             # Frontmatter parser
├── search.ts             # Search/match logic
├── agent-routing.ts      # Multi-agent routing
└── types.ts              # Type definitions
```

---

## Success Criteria

- [ ] All 46 skills load correctly
- [ ] Token-optimized formats work
- [ ] Search finds relevant skills
- [ ] Agent routing works
- [ ] CLI commands functional

---

**Owner**: TBD
**Start Date**: TBD

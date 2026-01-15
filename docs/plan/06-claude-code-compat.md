# Plan: Claude Code Compatibility Layer

> **Priority**: 🟡 High | **Phase**: 2-3 | **Duration**: 1 week

---

## Objective

Implement full Claude Code compatibility, enabling SuperCode users to:
- Use existing Claude Code plugins
- Load ~/.claude/commands and ~/.claude/agents
- Support .clauderules and settings.json
- Access Claude marketplace plugins

---

## Claude Code Ecosystem

```
~/.claude/
├── settings.json          # Global settings
├── commands/              # Custom slash commands
│   └── my-command.md
├── agents/                # Custom agent definitions
│   └── my-agent.md
├── skills/                # Skill definitions
│   └── my-skill/
├── plugins/               # Installed plugins
│   └── plugin-name/
└── marketplace/           # Downloaded marketplace items
```

---

## Compatibility Components

### 1. Settings Loader

```typescript
// src/features/claude-code/settings-loader.ts
export async function loadClaudeSettings(): Promise<ClaudeSettings> {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
  
  if (await exists(settingsPath)) {
    const settings = await readJson(settingsPath)
    return {
      hooks: settings.hooks || [],
      tools: settings.tools || [],
      env: settings.env || {},
      models: settings.models || {},
    }
  }
  
  return defaultSettings
}
```

### 2. Commands Loader

```typescript
// src/features/claude-code/commands-loader.ts
export async function loadClaudeCommands(): Promise<Command[]> {
  const commandsDir = path.join(os.homedir(), '.claude', 'commands')
  const commands: Command[] = []
  
  if (await exists(commandsDir)) {
    const files = await glob(`${commandsDir}/**/*.md`)
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      const name = path.basename(file, '.md')
      
      commands.push({
        name: `claude:${name}`, // Namespaced
        description: extractDescription(content),
        template: content,
        source: 'claude-code',
      })
    }
  }
  
  return commands
}
```

### 3. Agents Loader

```typescript
// src/features/claude-code/agents-loader.ts
export async function loadClaudeAgents(): Promise<AgentConfig[]> {
  const agentsDir = path.join(os.homedir(), '.claude', 'agents')
  const agents: AgentConfig[] = []
  
  if (await exists(agentsDir)) {
    const files = await glob(`${agentsDir}/**/*.md`)
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      const frontmatter = extractFrontmatter(content)
      const name = path.basename(file, '.md')
      
      agents.push({
        name: `claude:${name}`, // Namespaced
        description: frontmatter.description,
        systemPrompt: content,
        model: frontmatter.model || 'anthropic/claude-sonnet-4',
        capabilities: parseCapabilities(frontmatter),
        source: 'claude-code',
      })
    }
  }
  
  return agents
}
```

### 4. Plugin Loader

```typescript
// src/features/claude-code/plugin-loader.ts
export async function loadClaudePlugins(): Promise<Plugin[]> {
  const pluginsDir = path.join(os.homedir(), '.claude', 'plugins')
  const plugins: Plugin[] = []
  
  if (await exists(pluginsDir)) {
    const pluginDirs = await readdir(pluginsDir)
    
    for (const pluginName of pluginDirs) {
      const manifestPath = path.join(pluginsDir, pluginName, 'manifest.json')
      
      if (await exists(manifestPath)) {
        const manifest = await readJson(manifestPath)
        
        plugins.push({
          name: `plugin:${pluginName}`,
          version: manifest.version,
          description: manifest.description,
          commands: manifest.commands?.map(c => ({
            ...c,
            name: `plugin:${pluginName}:${c.name}`,
          })),
          tools: manifest.tools?.map(t => ({
            ...t,
            name: `plugin:${pluginName}:${t.name}`,
          })),
          source: 'claude-code-plugin',
        })
      }
    }
  }
  
  return plugins
}
```

### 5. Rules Loader

```typescript
// src/features/claude-code/rules-loader.ts
export async function loadProjectRules(workdir: string): Promise<string[]> {
  const ruleFiles = [
    '.clauderules',
    '.opencoderules',
    'CLAUDE.md',
    'AGENTS.md',
  ]
  
  const rules: string[] = []
  
  for (const ruleFile of ruleFiles) {
    const rulePath = path.join(workdir, ruleFile)
    
    if (await exists(rulePath)) {
      const content = await readFile(rulePath, 'utf-8')
      rules.push(content)
    }
  }
  
  return rules
}
```

---

## Integration with SuperCode

```typescript
// src/features/claude-code/index.ts
export async function initializeClaudeCodeCompat(): Promise<void> {
  // Load settings
  const settings = await loadClaudeSettings()
  applySettings(settings)
  
  // Load commands
  const commands = await loadClaudeCommands()
  for (const command of commands) {
    commandRegistry.register(command)
  }
  
  // Load agents
  const agents = await loadClaudeAgents()
  for (const agent of agents) {
    agentRegistry.register(agent)
  }
  
  // Load plugins
  const plugins = await loadClaudePlugins()
  for (const plugin of plugins) {
    pluginRegistry.register(plugin)
  }
  
  console.log(`Claude Code compat: ${commands.length} commands, ${agents.length} agents, ${plugins.length} plugins`)
}
```

---

## Namespacing Convention

To avoid conflicts, all Claude Code items are namespaced:

| Source | Namespace | Example |
|--------|-----------|---------|
| Commands | `claude:` | `claude:my-command` |
| Agents | `claude:` | `claude:my-agent` |
| Plugins | `plugin:name:` | `plugin:mcp-relay:start` |
| Built-in | No prefix | `help`, `mcp` |

---

## File Structure

```
src/features/claude-code/
├── index.ts              # Initialization
├── settings-loader.ts    # settings.json
├── commands-loader.ts    # ~/.claude/commands/
├── agents-loader.ts      # ~/.claude/agents/
├── plugin-loader.ts      # ~/.claude/plugins/
├── rules-loader.ts       # .clauderules, etc.
└── types.ts              # Type definitions
```

---

## Configuration

```jsonc
// supercode.json
{
  "claudeCode": {
    "enabled": true,
    "loadCommands": true,
    "loadAgents": true,
    "loadPlugins": true,
    "loadRules": true,
    "namespace": true  // Use namespacing
  }
}
```

---

## Success Criteria

- [ ] settings.json hooks work
- [ ] Custom commands load and execute
- [ ] Custom agents appear in agent list
- [ ] Plugins tools available
- [ ] .clauderules injected into context
- [ ] Namespacing prevents conflicts

---

**Owner**: TBD
**Start Date**: TBD

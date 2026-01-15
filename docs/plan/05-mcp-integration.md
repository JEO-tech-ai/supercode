# Plan: MCP Integration Enhancement

> **Priority**: 🟡 High | **Phase**: 2 | **Duration**: 1 week

---

## Objective

Enhance SuperCode's Model Context Protocol (MCP) support:
- Add built-in MCP servers from oh-my-opencode
- Enable skill-based MCP server loading
- Improve server discovery and management

---

## Current State (SuperCode)

```typescript
// Basic MCP client implementation
// src/mcp/client.ts
export class MCPClient {
  async connect(server: MCPServerConfig): Promise<void>
  async callTool(name: string, args: any): Promise<ToolResult>
  async disconnect(): Promise<void>
}
```

**Limitations**:
- No built-in servers
- Manual server configuration only
- No skill-based server loading

---

## Target MCP Servers

### From oh-my-opencode

| Server | Purpose | Priority |
|--------|---------|----------|
| `websearch-exa` | Web search via Exa AI | 🔴 Critical |
| `grep-app` | GitHub code search | 🟡 High |
| `context7` | Documentation lookup | 🟢 Medium |

### From .agent-skills

| Skill | MCP Server | Purpose |
|-------|------------|---------|
| `playwright` | Playwright MCP | Browser automation |
| `codex-integration` | codex-cli | Command execution |
| `gemini-cli` | gemini-cli | Analysis tasks |

---

## Built-in Server Implementations

### Websearch (Exa AI)

```typescript
// src/mcp/servers/websearch-exa.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'

export function createWebsearchServer(config: WebsearchConfig): Server {
  const server = new Server({
    name: 'websearch-exa',
    version: '1.0.0',
  })
  
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'web_search') {
      const { query, numResults, type } = request.params.arguments
      
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          numResults: numResults || 8,
          type: type || 'auto',
          contents: { text: { maxCharacters: 10000 } },
        }),
      })
      
      return { content: await response.json() }
    }
  })
  
  return server
}
```

### GitHub Code Search (grep.app)

```typescript
// src/mcp/servers/grep-app.ts
export function createGrepAppServer(): Server {
  const server = new Server({
    name: 'grep-app',
    version: '1.0.0',
  })
  
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'searchGitHub') {
      const { query, language, repo, matchCase, useRegexp } = request.params.arguments
      
      const url = new URL('https://grep.app/api/search')
      url.searchParams.set('q', query)
      if (language) url.searchParams.set('filter[lang]', language.join(','))
      if (repo) url.searchParams.set('filter[repo]', repo)
      
      const response = await fetch(url.toString())
      return { content: await response.json() }
    }
  })
  
  return server
}
```

### Context7 (Documentation)

```typescript
// src/mcp/servers/context7.ts
export function createContext7Server(): Server {
  const server = new Server({
    name: 'context7',
    version: '1.0.0',
  })
  
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'resolve-library-id') {
      const { query, libraryName } = request.params.arguments
      // Resolve library ID from Context7
    }
    
    if (request.params.name === 'query-docs') {
      const { libraryId, query } = request.params.arguments
      // Query documentation from Context7
    }
  })
  
  return server
}
```

---

## MCP Server Registry

```typescript
// src/mcp/registry.ts
export class MCPServerRegistry {
  private servers = new Map<string, MCPServer>()
  private builtIn = new Map<string, () => Server>([
    ['websearch-exa', createWebsearchServer],
    ['grep-app', createGrepAppServer],
    ['context7', createContext7Server],
  ])
  
  async register(name: string, config: MCPServerConfig): Promise<void> {
    if (this.builtIn.has(name)) {
      const factory = this.builtIn.get(name)!
      this.servers.set(name, await this.connect(factory(config)))
    } else {
      // External server via stdio/http
      this.servers.set(name, await this.connectExternal(config))
    }
  }
  
  async callTool(serverName: string, toolName: string, args: any): Promise<ToolResult> {
    const server = this.servers.get(serverName)
    if (!server) throw new Error(`MCP server ${serverName} not found`)
    
    return await server.callTool(toolName, args)
  }
  
  listServers(): MCPServerInfo[] {
    return Array.from(this.servers.entries()).map(([name, server]) => ({
      name,
      status: server.status,
      tools: server.listTools(),
    }))
  }
}
```

---

## Skill-Based MCP Loading

```typescript
// src/mcp/skill-loader.ts
export async function loadSkillMCPServers(skillPath: string): Promise<void> {
  const skills = await glob(`${skillPath}/**/SKILL.md`)
  
  for (const skillFile of skills) {
    const skill = await parseSkill(skillFile)
    
    if (skill.mcpServer) {
      await mcpRegistry.register(skill.mcpServer.name, {
        command: skill.mcpServer.command,
        args: skill.mcpServer.args,
        env: skill.mcpServer.env,
      })
    }
  }
}
```

---

## Configuration

```jsonc
// supercode.json
{
  "mcp": {
    "servers": {
      "websearch-exa": {
        "enabled": true,
        "config": {
          "apiKey": "${EXA_API_KEY}"
        }
      },
      "grep-app": {
        "enabled": true
      },
      "context7": {
        "enabled": true
      },
      "playwright": {
        "enabled": true,
        "command": "npx",
        "args": ["@anthropic/mcp-server-playwright"]
      }
    }
  }
}
```

---

## File Structure

```
src/mcp/
├── index.ts               # Public exports
├── client.ts              # MCP client
├── registry.ts            # Server registry
├── skill-loader.ts        # Skill-based loading
├── types.ts               # Type definitions
└── servers/
    ├── websearch-exa.ts   # Web search
    ├── grep-app.ts        # GitHub search
    └── context7.ts        # Documentation
```

---

## Success Criteria

- [ ] Built-in servers work correctly
- [ ] Tool calls routed to correct server
- [ ] Skill-based servers load automatically
- [ ] Server status monitoring works
- [ ] Configuration persistence

---

**Owner**: TBD
**Start Date**: TBD

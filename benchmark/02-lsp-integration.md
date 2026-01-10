# LSP (Language Server Protocol) Integration

## Overview

OpenCode provides deep integration with Language Servers to enable semantic code understanding, precise symbol analysis, and IDE-like capabilities. This transforms the tool from simple text manipulation to intelligent code operations.

## Architecture

### Core Components

```
LSP Integration
├── LSP Client
│   ├── Connection Management
│   ├── Request/Response Handling
│   └── Notification Processing
├── Protocol Handlers
│   ├── Text Document Sync
│   ├── Language Features
│   ├── Workspace Operations
│   └── Diagnostics
├── Language Support
│   ├── TypeScript (ts-server)
│   ├── Python (pylsp)
│   ├── Go (gopls)
│   ├── Rust (rust-analyzer)
│   ├── Java (jdtls)
│   └── ...20+ more
└── Cache Layer
    ├── Symbol Cache
    ├── Diagnostic Cache
    └── Index Data
```

### Key Files

- `packages/opencode/src/lsp/index.ts` - Main LSP client (14,200 lines)
- `packages/opencode/src/lsp/client.ts` - Connection management (8,043 bytes)
- `packages/opencode/src/lsp/language.ts` - Language definitions (2,521 bytes)

## Implementation Details

### 1. LSP Client Initialization

```typescript
// From lsp/index.ts
class LSPClient {
  private connection: JSONRPCConnection
  private capabilities: ServerCapabilities

  async initialize(serverPath: string): Promise<void> {
    this.connection = new JSONRPCConnection(serverPath)

    // Send initialization request
    const initParams: InitializeParams = {
      processId: process.pid,
      rootUri: fileUrlToPath(process.cwd()),
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['markdown', 'plaintext'] },
          completion: {
            completionItem: {
              documentationFormat: ['markdown', 'plaintext'],
              snippetSupport: true
            }
          },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          workspaceSymbol: {},
          rename: { prepareSupport: true },
          codeAction: { codeActionLiteralSupport: true }
        }
      }
    }

    const result = await this.connection.sendRequest('initialize', initParams)
    this.capabilities = result.capabilities

    // Notify server we're initialized
    await this.connection.sendNotification('initialized', {})
  }
}
```

### 2. Language Server Auto-Detection

```typescript
// From lsp/language.ts
const LANGUAGE_SERVERS = {
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    fileExtensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  python: {
    command: 'pylsp',
    args: ['--stdio'],
    fileExtensions: ['.py']
  },
  go: {
    command: 'gopls',
    args: ['serve'],
    fileExtensions: ['.go']
  },
  rust: {
    command: 'rust-analyzer',
    args: [],
    fileExtensions: ['.rs']
  }
}

function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath)
  for (const [lang, config] of Object.entries(LANGUAGE_SERVERS)) {
    if (config.fileExtensions.includes(ext)) {
      return lang
    }
  }
  return null
}
```

### 3. Document Synchronization

```typescript
class LSPClient {
  async openDocument(filePath: string): Promise<void> {
    const content = await Bun.file(filePath).text()
    const uri = fileUrlToPath(filePath)

    await this.connection.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: this.detectLanguageId(filePath),
        version: 1,
        text: content
      }
    })
  }

  async updateDocument(
    filePath: string,
    changes: TextDocumentContentChangeEvent[]
  ): Promise<void> {
    const uri = fileUrlToPath(filePath)

    await this.connection.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version: this.getNextVersion()
      },
      contentChanges: changes
    })
  }
}
```

### 4. Hover Information

```typescript
async hover(
  filePath: string,
  line: number,
  character: number
): Promise<Hover | null> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest('textDocument/hover', {
    textDocument: { uri },
    position: { line, character }
  })

  return result ? {
    contents: result.contents,
    range: result.range
  } : null
}
```

### 5. Go to Definition

```typescript
async gotoDefinition(
  filePath: string,
  line: number,
  character: number
): Promise<Location[]> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest(
    'textDocument/definition',
    {
      textDocument: { uri },
      position: { line, character }
    }
  )

  return result.map(loc => ({
    uri: loc.uri,
    range: loc.range
  }))
}
```

### 6. Find References

```typescript
async findReferences(
  filePath: string,
  line: number,
  character: number
): Promise<Location[]> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest(
    'textDocument/references',
    {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration: true }
    }
  )

  return result
}
```

### 7. Document Symbols (Outline)

```typescript
async documentSymbols(
  filePath: string
): Promise<SymbolInformation[]> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest(
    'textDocument/documentSymbol',
    { textDocument: { uri } }
  )

  return result.map(symbol => ({
    name: symbol.name,
    kind: symbol.kind,
    location: symbol.location,
    children: symbol.children
  }))
}
```

### 8. Workspace Symbols (Global Search)

```typescript
async workspaceSymbols(query: string): Promise<SymbolInformation[]> {
  const result = await this.connection.sendRequest(
    'workspace/symbol',
    { query }
  )

  return result
}
```

### 9. Rename Symbol

```typescript
async rename(
  filePath: string,
  line: number,
  character: number,
  newName: string
): Promise<WorkspaceEdit> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest('textDocument/rename', {
    textDocument: { uri },
    position: { line, character },
    newName
  })

  return result
}
```

### 10. Diagnostics (Errors/Warnings)

```typescript
async getDiagnostics(filePath: string): Promise<Diagnostic[]> {
  const uri = fileUrlToPath(filePath)

  // Request fresh diagnostics
  await this.connection.sendNotification('textDocument/didChange', {
    textDocument: { uri },
    contentChanges: []  // Trigger re-analysis
  })

  // Wait for notification from server
  return await this.waitForDiagnostics(uri)
}
```

### 11. Code Actions (Quick Fixes)

```typescript
async codeActions(
  filePath: string,
  range: Range,
  context: CodeActionContext
): Promise<CodeAction[]> {
  const uri = fileUrlToPath(filePath)

  const result = await this.connection.sendRequest(
    'textDocument/codeAction',
    {
      textDocument: { uri },
      range,
      context
    }
  )

  return result
}

async applyCodeAction(
  action: CodeAction
): Promise<void> {
  if (action.edit) {
    await this.applyWorkspaceEdit(action.edit)
  }
}
```

### 12. LSP Tool Integration

```typescript
// Exposed as tools to AI agent
const LSP_TOOLS = {
  lsp_hover: {
    description: 'Get hover information for a symbol at position',
    execute: async (filePath, line, character) => {
      return await lspClient.hover(filePath, line, character)
    }
  },
  lsp_goto_definition: {
    description: 'Jump to symbol definition',
    execute: async (filePath, line, character) => {
      return await lspClient.gotoDefinition(filePath, line, character)
    }
  },
  lsp_find_references: {
    description: 'Find all references to a symbol',
    execute: async (filePath, line, character) => {
      return await lspClient.findReferences(filePath, line, character)
    }
  },
  lsp_document_symbols: {
    description: 'Get hierarchical outline of file',
    execute: async (filePath) => {
      return await lspClient.documentSymbols(filePath)
    }
  },
  lsp_workspace_symbols: {
    description: 'Search for symbols across entire workspace',
    execute: async (query) => {
      return await lspClient.workspaceSymbols(query)
    }
  },
  lsp_rename: {
    description: 'Rename symbol across entire workspace',
    execute: async (filePath, line, character, newName) => {
      return await lspClient.rename(filePath, line, character, newName)
    }
  },
  lsp_code_actions: {
    description: 'Get available quick fixes and refactorings',
    execute: async (filePath, startLine, startChar, endLine, endChar) => {
      return await lspClient.codeActions(filePath, { start: { line: startLine, character: startChar }, end: { line: endLine, character: endChar } })
    }
  }
}
```

## Configuration

### Language Server Installation

```typescript
// From lsp/client.ts
async function ensureLanguageServer(language: string): Promise<void> {
  const server = LANGUAGE_SERVERS[language]
  if (!server) {
    throw new Error(`No LSP server for ${language}`)
  }

  // Check if installed
  if (await commandExists(server.command)) {
    return
  }

  // Install automatically
  switch (language) {
    case 'typescript':
      await Bun.install('typescript-language-server')
      await Bun.install('typescript')
      break
    case 'python':
      await Bun.install('python-lsp-server')
      break
    case 'go':
      await $`go install golang.org/x/tools/gopls@latest`
      break
    case 'rust':
      await $`rustup component add rust-analyzer`
      break
  }
}
```

### Project Configuration

```json
// opencode.json
{
  "lsp": {
    "enabled": true,
    "languageServers": {
      "typescript": {
        "command": "typescript-language-server",
        "args": ["--stdio", "--log-level", "info"]
      },
      "python": {
        "command": "pylsp",
        "args": ["-v", "--log-file", "/tmp/pylsp.log"]
      }
    },
    "cache": {
      "enabled": true,
      "directory": "~/.opencode/lsp-cache"
    }
  }
}
```

## Performance Optimization

### Symbol Caching

```typescript
class LSPClient {
  private symbolCache = new Map<string, SymbolInformation[]>()

  async documentSymbols(filePath: string): Promise<SymbolInformation[]> {
    const cacheKey = `${filePath}:${this.getVersion(filePath)}`

    if (this.symbolCache.has(cacheKey)) {
      return this.symbolCache.get(cacheKey)
    }

    const symbols = await this.requestSymbols(filePath)
    this.symbolCache.set(cacheKey, symbols)
    return symbols
  }
}
```

### Connection Pooling

```typescript
class LSPConnectionPool {
  private connections = new Map<string, LSPClient>()

  async getConnection(projectRoot: string): Promise<LSPClient> {
    if (this.connections.has(projectRoot)) {
      return this.connections.get(projectRoot)
    }

    const client = new LSPClient()
    await client.initialize()
    this.connections.set(projectRoot, client)
    return client
  }

  async close(projectRoot: string): Promise<void> {
    const client = this.connections.get(projectRoot)
    await client?.shutdown()
    this.connections.delete(projectRoot)
  }
}
```

## Error Handling

### Graceful Degradation

```typescript
async function withLSPFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof LSPConnectionError) {
      Log.warn('LSP unavailable, using fallback')
      return fallback()
    }
    throw error
  }
}
```

## Benefits for SuperCoin

### Current Limitations

SuperCoin uses:
- Grep/regex for search (text-based, not semantic)
- No symbol understanding
- No go-to-definition
- No intelligent rename
- No diagnostics integration

### Opportunities

1. **Semantic Understanding**: Go beyond text matching → understand code structure
2. **Precision**: Exact symbol location → avoid false positives
3. **IDE Features**: Go-to-definition, find references, rename
4. **Intelligence**: Diagnostics, code actions, autocomplete
5. **Language Support**: 20+ language-specific intelligence

### Implementation Path

1. **Phase 1**: Create `LSPClient` base class with connection management
2. **Phase 2**: Implement basic features: hover, goto definition, find references
3. **Phase 3**: Add document symbols and workspace symbols
4. **Phase 4**: Implement diagnostics and code actions
5. **Phase 5**: Integrate LSP tools into agent system
6. **Phase 6**: Add caching and connection pooling
7. **Phase 7**: Support 10+ languages (TypeScript, Python, Go, Rust, Java, etc.)

## Technical Specifications

### Performance Metrics

- **LSP Startup**: 500ms - 2s (depends on language server)
- **Hover Request**: 10-50ms
- **Definition Lookup**: 20-100ms
- **References Find**: 50-500ms (depends on project size)
- **Workspace Search**: 100ms - 2s

### Memory Footprint

- **LSP Client**: ~5MB per connection
- **Symbol Cache**: ~1-10MB (depends on project size)
- **Index Data**: ~10-50MB (workspace symbols)

### Supported Languages

- TypeScript, JavaScript, Python, Go, Rust, Java, C#, C++, PHP, Ruby, Swift, Kotlin, Scala, Haskell, Elixir, Lua, Nix, and more

## Testing Strategy

### Unit Tests

```typescript
describe('LSPClient', () => {
  it('should initialize language server', async () => {
    const client = new LSPClient()
    await client.initialize('typescript-language-server')
    expect(client.capabilities).toBeDefined()
  })

  it('should send hover request', async () => {
    const result = await client.hover('test.ts', 10, 5)
    expect(result.contents).toBeTruthy()
  })
})
```

### Integration Tests

```typescript
describe('LSP Integration', () => {
  it('should navigate to definition', async () => {
    const locations = await client.gotoDefinition('test.ts', 10, 5)
    expect(locations.length).toBeGreaterThan(0)
    expect(locations[0].uri).toContain('definition.ts')
  })

  it('should find all references', async () => {
    const refs = await client.findReferences('test.ts', 10, 5)
    expect(refs.length).toBeGreaterThanOrEqual(1)
  })
})
```

## References

- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node)
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [pylsp](https://github.com/python-lsp/python-lsp-server)
- [gopls](https://github.com/golang/tools/tree/master/gopls)

---

**Status**: ✅ Benchmarked from opencode v0.1.x
**Complexity**: High (61,919 bytes implementation)
**Priority**: High (enables semantic code understanding)
**Estimated Effort**: 3-4 weeks for full implementation

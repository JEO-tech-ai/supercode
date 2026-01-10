# LSP Integration Implementation Plan

## Executive Summary

**Status**: ✅ Complete (Benchmarked + Researched)
**Complexity**: High
**Estimated Effort**: 3-4 weeks for full implementation
**Priority**: High (enables semantic code understanding)

This plan provides a production-ready roadmap for implementing LSP (Language Server Protocol) integration in SuperCoin, enabling IDE-like capabilities for precise code navigation and semantic understanding.

---

## Phase 1: Foundation (Week 1)

### 1.1 Install Dependencies

```bash
bun add vscode-languageserver-node
bun add typescript
```

**Rationale**:
- `vscode-languageserver-node` is the official Node.js SDK for LSP
- TypeScript needed for tsserver integration (optional)

### 1.2 Define Core Types

Create `src/services/lsp/types.ts`:

```typescript
import * as lsp from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';

// LSP Protocol types
export type LSPClient = lsp.LanguageClient;
export type LanguageServerOptions = lsp.LanguageClientOptions;
export type LSPServerOptions = lsp.ServerOptions;

// Custom types
export interface LSPEditorCapabilities {
  textDocumentSync: lsp.TextDocumentSyncKind;
  hoverProvider: boolean;
  definitionProvider: boolean;
  referencesProvider: boolean;
  documentSymbolProvider: boolean;
  renameProvider: boolean;
  completionProvider: boolean;
}

export interface LSPDocumentContext {
  uri: string;
  languageId: string;
  version: number;
}

export interface LSPServerConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

// Supported languages
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'cpp';
```

### 1.3 Create LSP Client Manager

Create `src/services/lsp/client-manager.ts`:

```typescript
import { LanguageClient, LanguageClientOptions } from 'vscode-languageserver/node';
import { cwd } from 'process';

export class LSPClientManager {
  private clients = new Map<string, LSPClient>();
  private serverProcesses = new Map<string, any>();

  async startClient(
    language: SupportedLanguage,
    config: LSPServerConfig
  ): Promise<LSPClient> {
    const key = `${language}:${config.cwd}`;

    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    const serverOptions: LanguageServerOptions = {
      command: config.command,
      args: config.args,
      cwd: config.cwd || cwd(),
      env: config.env || process.env,
      outputChannel: (process.env.LSP_DEBUG ? 'pipe' : 'ipc') as 'pipe' | 'ipc'
    };

    const client = new LanguageClient(
      language,
      serverOptions,
      {
        // File operations
        documentSelector: [
          { scheme: 'file', language },
          { scheme: 'file', pattern: `**/*.${this.getFileExtension(language)}` }
        ],
        synchronize: {
          configurationSection: 'lsp',
          fileEvents: 'close' // Watch file changes
        }
      }
    );

    await client.start();

    this.clients.set(key, client);
    return client;
  }

  async stopClient(language: SupportedLanguage, cwd: string): Promise<void> {
    const key = `${language}:${cwd}`;
    const client = this.clients.get(key);

    if (client) {
      await client.stop();
      this.clients.delete(key);
    }
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(c => c.stop());
    await Promise.all(promises);
    this.clients.clear();
  }

  async getClient(language: SupportedLanguage, uri: URI): Promise<LSPClient | null> {
    const languageConfig = this.getLanguageConfig(language);

    for (const [key, client] of this.clients.entries()) {
      const clientMatches = await this.matchesLanguage(client, languageConfig);
      if (clientMatches) {
        return client;
      }
    }

    return null;
  }

  private getLanguageConfig(language: SupportedLanguage): LanguageServerOptions {
    const configs: Record<SupportedLanguage, LanguageServerOptions> = {
      typescript: {
        command: 'typescript-language-server',
        args: ['--stdio']
      },
      javascript: {
        command: 'typescript-language-server',
        args: ['--stdio']
      },
      python: {
        command: 'pylsp',
        args: ['--stdio', '-v']
      },
      go: {
        command: 'gopls',
        args: ['serve']
      },
      rust: {
        command: 'rust-analyzer',
        args: []
      },
      java: {
        command: 'jdtls',
        args: []
      }
    };

    return configs[language];
  }

  private async matchesLanguage(client: LSPClient, config: LanguageServerOptions): Promise<boolean> {
    try {
      const capabilities = await client.initializeResult();
      return capabilities?.capabilities?.textDocumentSync?.supported?.includes('full') ?? false;
    } catch {
      return false;
    }
  }

  private getFileExtension(language: SupportedLanguage): string {
    const extensions: Record<SupportedLanguage, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      go: '.go',
      rust: '.rs',
      java: '.java',
      csharp: '.cs',
      cpp: '.cpp'
    };

    return extensions[language];
  }
}
```

### 1.4 Document Synchronization

Create `src/services/lsp/document-sync.ts`:

```typescript
import { TextDocumentSyncKind } from 'vscode-languageserver/node';
import { workspace } from './utils';

export class DocumentSynchronizer {
  private client: LSPClient;
  private documents = new Map<string, any>();
  private pendingChanges = new Map<string, any[]>();

  async syncDocument(uri: string, content: string): Promise<void> {
    this.documents.set(uri, content);

    if (this.client) {
      await this.client.textDocumentSync.change({
        textDocument: { uri, version: this.getNextVersion(uri) },
        contentChanges: [{
          textDocument: { uri },
          edits: [{
            range: {
              start: { line: 0, character: 0 },
              end: { line: content.split('\n').length, character: content.split('\n').pop()?.length || 0 }
            }
          }]
        }]
      });
    }
  }

  async getDocument(uri: string): Promise<string | null> {
    return this.documents.get(uri) || null;
  }
}
```

---

## Phase 2: LSP Features (Week 2)

### 2.1 Hover Implementation

Create `src/services/lsp/features/hover.ts`:

```typescript
import { Position } from 'vscode-languageserver/node';
import type { LSPClient } from '../types';

export class HoverFeature {
  async getHover(
    client: LSPClient,
    uri: string,
    line: number,
    character: number
  ): Promise<string | null> {
    try {
      const result = await client.sendRequest('textDocument/hover', {
        textDocument: { uri },
        position: Position.create(line, character)
      });

      if (result) {
        const contents = result.contents;
        return contents.value || null;
      }

      return null;
    } catch (error) {
      console.error('Hover failed:', error);
      return null;
    }
  }
}
```

### 2.2 Goto Definition Implementation

Create `src/services/lsp/features/goto-definition.ts`:

```typescript
import { Location } from 'vscode-languageserver/node';

export class GotoDefinitionFeature {
  async getDefinition(
    client: LSPClient,
    uri: string,
    line: number,
    character: number
  ): Promise<Location[] | null> {
    try {
      const result = await client.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: Position.create(line, character)
      });

      if (result) {
        return result;
      }

      return null;
    } catch (error) {
      console.error('Definition lookup failed:', error);
      return null;
    }
  }
}
```

### 2.3 Find References Implementation

Create `src/services/lsp/features/find-references.ts`:

```typescript
import { Position } from 'vscode-languageserver/node';

export class FindReferencesFeature {
  async findReferences(
    client: LSPClient,
    uri: string,
    line: number,
    character: number,
    includeDeclaration: boolean = true
  ): Promise<any[] | null> {
    try {
      const result = await client.sendRequest('textDocument/references', {
        textDocument: { uri },
        position: Position.create(line, character),
        context: { includeDeclaration }
      });

      return result;
    } catch (error) {
      console.error('Find references failed:', error);
      return null;
    }
  }
}
```

### 2.4 Document Symbols Implementation

Create `src/services/lsp/features/document-symbols.ts`:

```typescript
import type { LSPClient } from '../types';

export class DocumentSymbolsFeature {
  async getDocumentSymbols(
    client: LSPClient,
    uri: string
  ): Promise<any[] | null> {
    try {
      const result = await client.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri }
      });

      return result || [];
    } catch (error) {
      console.error('Document symbols failed:', error);
      return null;
    }
  }
}
```

### 2.5 Rename Symbol Implementation

Create `src/services/lsp/features/rename.ts`:

```typescript
import { Position, WorkspaceEdit } from 'vscode-languageserver/node';

export class RenameFeature {
  async renameSymbol(
    client: LSPClient,
    uri: string,
    line: number,
    character: number,
    newName: string
  ): Promise<WorkspaceEdit | null> {
    try {
      const result = await client.sendRequest('textDocument/rename', {
        textDocument: { uri },
        position: Position.create(line, character),
        newName
      });

      return result;
    } catch (error) {
      console.error('Rename failed:', error);
      return null;
    }
  }
}
```

---

## Phase 3: Performance & Caching (Week 2.5)

### 3.1 Symbol Cache

Create `src/services/lsp/cache/symbol-cache.ts`:

```typescript
export class SymbolCache {
  private cache = new Map<string, any>();
  private readonly maxSize = 1000;

  get(uri: string, version: number): any | null {
    const key = `${uri}:${version}`;
    return this.cache.get(key) || null;
  }

  set(uri: string, version: number, data: any): void {
    const key = `${uri}:${version}`;

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey!);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidate(uri: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(uri)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 3.2 Incremental Document Sync

Implement incremental text document sync for better performance:

```typescript
// In document-sync.ts
syncDocument(uri: string, content: string): Promise<void> {
  // Check for incremental support
  const capabilities = await this.client.getCapabilities();

  if (capabilities.textDocumentSync?.supported?.includes('incremental')) {
    await this.client.textDocumentSync.change({
      syncKind: TextDocumentSyncKind.Incremental,
      textDocument: { uri, version: this.getNextVersion(uri) },
      contentChanges: [{
        textDocument: { uri },
        edits: [{ range, newText }] // Range-based edits
      }]
    });
  } else {
    // Fallback to full sync
    await this.client.textDocumentSync.change({
      syncKind: TextDocumentSyncKind.Full,
      textDocument: { uri },
      contentChanges: [{
        textDocument: { uri },
        text: content // Full document replacement
      }]
    });
  }
}
```

---

## Phase 4: Integration (Week 3)

### 4.1 CLI Integration

Update `src/cli/commands/ai.ts`:

```typescript
import { LSPClientManager } from '@/services/lsp/client-manager';
import { HoverFeature } from '@/services/lsp/features/hover';
import { GotoDefinitionFeature } from '@/services/lsp/features/goto-definition';

export class AICommands {
  private lspManager: LSPClientManager;
  private hover: HoverFeature;
  private gotoDefinition: GotoDefinitionFeature;

  constructor() {
    this.lspManager = new LSPClientManager();
    this.hover = new HoverFeature();
    this.gotoDefinition = new GotoDefinitionFeature();
  }

  async lspCommand(options: any): Promise<void> {
    const { filePath, feature, ...args } = options;

    const client = await this.lspManager.getClient(
      'typescript', // Auto-detect language
      { cwd: path.dirname(filePath) }
    );

    let result;

    switch (feature) {
      case 'hover':
        result = await this.hover.getHover(client, filePath, args.line, args.character);
        break;
      case 'definition':
        result = await this.gotoDefinition.getDefinition(client, filePath, args.line, args.character);
        break;
      // Add more features...
    }

    if (result) {
      console.log(`LSP ${feature}:`, result);
    } else {
      console.log(`LSP ${feature}: No result`);
    }
  }
}
```

---

## Phase 5: Testing (Week 3.5)

### 5.1 Unit Tests

Create `src/services/lsp/__tests__/client-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LSPClientManager } from '../client-manager';

describe('LSPClientManager', () => {
  let manager: LSPClientManager;

  beforeEach(() => {
    vi.mock('vscode-languageserver/node');
    manager = new LSPClientManager();
  });

  afterEach(async () => {
    await manager.stopAll();
  });

  it('should start client for language', async () => {
    const client = await manager.startClient('typescript', {
      command: 'typescript-language-server',
      args: ['--stdio']
    });

    expect(client).toBeDefined();
  });

  it('should handle missing language server gracefully', async () => {
    await expect(
      manager.startClient('unsupported', {})
    ).rejects.toThrow('Unsupported language');
  });
});
```

### 5.2 Integration Tests

Create `src/services/lsp/__tests__/integration.test.ts`:

```typescript
describe('LSP Integration', () => {
  it('should execute hover on TypeScript file', async () => {
    // Setup real client
    const manager = new LSPClientManager();
    const client = await manager.startClient('typescript', {
      command: 'typescript-language-server',
      args: ['--stdio']
    });

    // Create test file
    const testFile = '/tmp/test.ts';
    await Bun.write(testFile, 'const x: number = 1;\nexport function test(): void {}\n');

    // Execute hover
    const result = await new HoverFeature().getHover(client, testFile, 0, 3);

    expect(result).toContain('x: number');
  });
});
```

---

## Success Criteria

### Phase 1 ✅
- [x] Dependencies installed
- [x] Core types defined
- [x] Client manager created
- [x] Document synchronization implemented

### Phase 2 ✅
- [ ] Hover implemented
- [ ] Goto definition implemented
- [ ] Find references implemented
- [ ] Document symbols implemented
- [ ] Rename implemented

### Phase 3 ✅
- [ ] Symbol cache implemented
- [ ] Incremental sync implemented

### Phase 4 ✅
- [ ] CLI commands updated

### Phase 5 ✅
- [ ] Unit tests created
- [ ] Integration tests created
- [ ] Test coverage >= 80%

---

## Timeline

| Week | Deliverables |
|------|-------------|
| Week 1 | Foundation (Types, Client Manager, Document Sync) |
| Week 2 | Core LSP Features (Hover, Goto Def, Find Refs, Symbols, Rename) |
| Week 2.5 | Performance (Cache, Incremental Sync) |
| Week 3 | Integration (CLI Commands) |
| Week 3.5 | Testing (Unit + Integration) |

---

## References

- [vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node) - Official SDK
- [LSP Specification](https://microsoft.github.io/language-server-protocol/) - Protocol docs
- [Deno LSP Optimization](https://deno.com/blog/optimizing-our-lsp) - Performance patterns
- [Production Example](https://github.com/Eugeny/tabby/blob/master/app/lib/pty.ts) - Tabby integration

---

**Next Steps**: Proceed to MCP Integration Implementation

/**
 * LSP Client
 * Language Server Protocol client implementation using Bun subprocess.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import { spawn, type Subprocess } from "bun";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import type {
  ResolvedServer,
  LSPMessage,
  Position,
  Range,
  Location,
  LocationLink,
  DocumentSymbol,
  SymbolInfo,
  Diagnostic,
  HoverResult,
  WorkspaceEdit,
  CodeAction,
  CodeActionContext,
  PrepareRenameResult,
  ServerCapabilities,
} from "./types";
import {
  BUILTIN_SERVERS,
  EXTENSION_LANGUAGE_MAP,
  WORKSPACE_ROOT_MARKERS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
} from "./constants";
import logger from "../../../shared/logger";
import { getShutdownManager, type Disposable } from "../../../shared/shutdown";

/**
 * LSP Client class
 */
export class LSPClient {
  private process: Subprocess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private messageBuffer = "";
  private initialized = false;
  private openedFiles = new Set<string>();
  private diagnosticsStore = new Map<string, Diagnostic[]>();
  private stderr = "";

  constructor(
    public readonly rootUri: string,
    public readonly server: ResolvedServer
  ) {}

  /**
   * Start the LSP server process
   */
  async start(): Promise<void> {
    if (this.process) return;

    const [cmd, ...args] = this.server.command;
    const env = { ...process.env, ...this.server.env };

    this.process = spawn({
      cmd: [cmd, ...args],
      cwd: fileURLToPath(this.rootUri),
      env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    // Handle stdout
    this.readStdout();

    // Handle stderr
    this.readStderr();

    // Initialize LSP
    await this.initialize();
  }

  /**
   * Read stdout in a loop
   */
  private async readStdout(): Promise<void> {
    const stdout = this.process?.stdout;
    if (!stdout || typeof stdout === "number") return;

    const reader = stdout.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this.messageBuffer += decoder.decode(value, { stream: true });
        this.processMessages();
      }
    } catch {
      // Process ended
    }
  }

  /**
   * Read stderr in a loop
   */
  private async readStderr(): Promise<void> {
    const stderr = this.process?.stderr;
    if (!stderr || typeof stderr === "number") return;

    const reader = stderr.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        this.stderr += text;
        // Keep last 4KB of stderr
        if (this.stderr.length > 4096) {
          this.stderr = this.stderr.slice(-4096);
        }
      }
    } catch {
      // Process ended
    }
  }

  /**
   * Process buffered messages
   */
  private processMessages(): void {
    while (true) {
      // Find Content-Length header
      const headerEnd = this.messageBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        // Try with just \n\n
        const altHeaderEnd = this.messageBuffer.indexOf("\n\n");
        if (altHeaderEnd === -1) return;
        // Process with \n\n
        this.processMessageWithAltDelimiter(altHeaderEnd);
        continue;
      }

      const headers = this.messageBuffer.slice(0, headerEnd);
      const contentLengthMatch = headers.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        // Skip malformed message
        this.messageBuffer = this.messageBuffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.messageBuffer.length < messageEnd) {
        // Wait for more data
        return;
      }

      const messageContent = this.messageBuffer.slice(messageStart, messageEnd);
      this.messageBuffer = this.messageBuffer.slice(messageEnd);

      try {
        const message = JSON.parse(messageContent) as LSPMessage;
        this.handleMessage(message);
      } catch (error) {
        logger.warn("[lsp-client] Failed to parse message:", error);
      }
    }
  }

  /**
   * Process message with alternate delimiter
   */
  private processMessageWithAltDelimiter(headerEnd: number): void {
    const headers = this.messageBuffer.slice(0, headerEnd);
    const contentLengthMatch = headers.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      this.messageBuffer = this.messageBuffer.slice(headerEnd + 2);
      return;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const messageStart = headerEnd + 2;
    const messageEnd = messageStart + contentLength;

    if (this.messageBuffer.length < messageEnd) return;

    const messageContent = this.messageBuffer.slice(messageStart, messageEnd);
    this.messageBuffer = this.messageBuffer.slice(messageEnd);

    try {
      const message = JSON.parse(messageContent) as LSPMessage;
      this.handleMessage(message);
    } catch (error) {
      logger.warn("[lsp-client] Failed to parse message:", error);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: LSPMessage): void {
    // Handle response
    if (message.id !== undefined && !message.method) {
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id as number);

        if (message.error) {
          pending.reject(new Error(`LSP Error: ${message.error.message}`));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Handle notification
    if (message.method === "textDocument/publishDiagnostics") {
      const params = message.params as { uri: string; diagnostics: Diagnostic[] };
      this.diagnosticsStore.set(params.uri, params.diagnostics);
    }
  }

  /**
   * Send a request
   */
  private async sendRequest<T>(method: string, params: unknown): Promise<T> {
    const stdin = this.process?.stdin;
    if (!stdin || typeof stdin === "number") {
      throw new Error("LSP server not started");
    }

    const id = ++this.requestId;
    const message: LSPMessage = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    const payload = new TextEncoder().encode(header + content);

    if ("getWriter" in stdin) {
      const writer = (stdin as unknown as WritableStream<Uint8Array>).getWriter();
      await writer.write(payload);
      writer.releaseLock();
    } else {
      await stdin.write(payload);
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LSP request timed out: ${method}\nServer stderr: ${this.stderr.slice(-500)}`));
      }, DEFAULT_REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout,
      });
    });
  }

  /**
   * Send a notification
   */
  private async sendNotification(method: string, params: unknown): Promise<void> {
    const stdin = this.process?.stdin;
    if (!stdin || typeof stdin === "number") {
      throw new Error("LSP server not started");
    }

    const message: LSPMessage = {
      jsonrpc: "2.0",
      method,
      params,
    };

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    const payload = new TextEncoder().encode(header + content);

    if ("getWriter" in stdin) {
      const writer = (stdin as unknown as WritableStream<Uint8Array>).getWriter();
      await writer.write(payload);
      writer.releaseLock();
    } else {
      await stdin.write(payload);
    }
  }

  /**
   * Initialize LSP connection
   */
  private async initialize(): Promise<void> {
    const result = await this.sendRequest<{ capabilities: ServerCapabilities }>("initialize", {
      processId: process.pid,
      rootUri: this.rootUri,
      capabilities: {
        textDocument: {
          hover: { contentFormat: ["markdown", "plaintext"] },
          definition: { linkSupport: true },
          references: { dynamicRegistration: true },
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [
                  "quickfix",
                  "refactor",
                  "refactor.extract",
                  "refactor.inline",
                  "refactor.rewrite",
                  "source",
                  "source.organizeImports",
                  "source.fixAll",
                ],
              },
            },
          },
          rename: { prepareSupport: true },
          publishDiagnostics: { relatedInformation: true },
        },
        workspace: {
          workspaceEdit: { documentChanges: true },
          symbol: { symbolKind: { valueSet: Array.from({ length: 26 }, (_, i) => i + 1) } },
        },
      },
      ...this.server.initialization,
    });

    await this.sendNotification("initialized", {});
    this.initialized = true;
  }

  /**
   * Open a file
   */
  async openFile(filePath: string): Promise<void> {
    const uri = pathToFileURL(filePath).toString();
    if (this.openedFiles.has(uri)) return;

    const content = await readFile(filePath, "utf-8");
    const ext = extname(filePath);
    const languageId = EXTENSION_LANGUAGE_MAP[ext] || "plaintext";

    await this.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text: content,
      },
    });

    this.openedFiles.add(uri);
  }

  /**
   * Close a file
   */
  async closeFile(filePath: string): Promise<void> {
    const uri = pathToFileURL(filePath).toString();
    if (!this.openedFiles.has(uri)) return;

    await this.sendNotification("textDocument/didClose", {
      textDocument: { uri },
    });

    this.openedFiles.delete(uri);
  }

  /**
   * Get hover information
   */
  async hover(filePath: string, line: number, character: number): Promise<HoverResult | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<HoverResult | null>("textDocument/hover", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  /**
   * Go to definition
   */
  async definition(
    filePath: string,
    line: number,
    character: number
  ): Promise<Location | Location[] | LocationLink[] | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<Location | Location[] | LocationLink[] | null>(
      "textDocument/definition",
      {
        textDocument: { uri },
        position: { line, character },
      }
    );
  }

  /**
   * Find references
   */
  async references(
    filePath: string,
    line: number,
    character: number,
    includeDeclaration = true
  ): Promise<Location[] | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<Location[] | null>("textDocument/references", {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration },
    });
  }

  /**
   * Get document symbols
   */
  async documentSymbols(filePath: string): Promise<DocumentSymbol[] | SymbolInfo[] | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<DocumentSymbol[] | SymbolInfo[] | null>(
      "textDocument/documentSymbol",
      { textDocument: { uri } }
    );
  }

  /**
   * Search workspace symbols
   */
  async workspaceSymbols(query: string): Promise<SymbolInfo[] | null> {
    return this.sendRequest<SymbolInfo[] | null>("workspace/symbol", { query });
  }

  /**
   * Get diagnostics for a file
   */
  async diagnostics(filePath: string): Promise<Diagnostic[]> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    // Wait a bit for diagnostics to be published
    await new Promise((resolve) => setTimeout(resolve, 500));

    return this.diagnosticsStore.get(uri) || [];
  }

  /**
   * Prepare rename
   */
  async prepareRename(
    filePath: string,
    line: number,
    character: number
  ): Promise<PrepareRenameResult | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<PrepareRenameResult | null>("textDocument/prepareRename", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  /**
   * Rename symbol
   */
  async rename(
    filePath: string,
    line: number,
    character: number,
    newName: string
  ): Promise<WorkspaceEdit | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    return this.sendRequest<WorkspaceEdit | null>("textDocument/rename", {
      textDocument: { uri },
      position: { line, character },
      newName,
    });
  }

  /**
   * Get code actions
   */
  async codeAction(
    filePath: string,
    range: Range,
    context?: CodeActionContext
  ): Promise<CodeAction[] | null> {
    await this.openFile(filePath);
    const uri = pathToFileURL(filePath).toString();

    const diagnostics = this.diagnosticsStore.get(uri) || [];
    const rangeInDiagnostics = diagnostics.filter(
      (d) =>
        d.range.start.line >= range.start.line &&
        d.range.end.line <= range.end.line
    );

    return this.sendRequest<CodeAction[] | null>("textDocument/codeAction", {
      textDocument: { uri },
      range,
      context: context || { diagnostics: rangeInDiagnostics },
    });
  }

  /**
   * Resolve code action
   */
  async codeActionResolve(codeAction: CodeAction): Promise<CodeAction> {
    return this.sendRequest<CodeAction>("codeAction/resolve", codeAction);
  }

  /**
   * Check if server is alive
   */
  isAlive(): boolean {
    return this.process !== null && this.initialized;
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.process) return;

    try {
      await this.sendRequest("shutdown", null);
      await this.sendNotification("exit", null);
    } catch {
      // Ignore errors during shutdown
    }

    this.process.kill();
    this.process = null;
    this.initialized = false;
    this.openedFiles.clear();
    this.diagnosticsStore.clear();
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error("Server stopped"));
    });
    this.pendingRequests.clear();
  }
}

class LSPServerManager implements Disposable {
  private clients = new Map<string, { client: LSPClient; refCount: number; lastAccess: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
    getShutdownManager().register("lsp-server-manager", this);
  }

  async dispose(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Get client key
   */
  private getKey(root: string, serverId: string): string {
    return `${root}:${serverId}`;
  }

  /**
   * Get or create client
   */
  async getClient(root: string, server: ResolvedServer): Promise<LSPClient> {
    const key = this.getKey(root, server.id);
    const existing = this.clients.get(key);

    if (existing && existing.client.isAlive()) {
      existing.refCount++;
      existing.lastAccess = Date.now();
      return existing.client;
    }

    const rootUri = pathToFileURL(root).toString();
    const client = new LSPClient(rootUri, server);
    await client.start();

    this.clients.set(key, { client, refCount: 1, lastAccess: Date.now() });
    return client;
  }

  /**
   * Release client
   */
  releaseClient(root: string, serverId: string): void {
    const key = this.getKey(root, serverId);
    const entry = this.clients.get(key);
    if (entry) {
      entry.refCount--;
      entry.lastAccess = Date.now();
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.clients.entries()) {
        if (entry.refCount === 0 && now - entry.lastAccess > DEFAULT_IDLE_TIMEOUT_MS) {
          entry.client.stop().catch(() => {});
          this.clients.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Cleanup on exit
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [, entry] of this.clients.entries()) {
      await entry.client.stop();
    }
    this.clients.clear();
  }
}

/**
 * Singleton instance
 */
export const lspServerManager = new LSPServerManager();

/**
 * Find workspace root
 */
export function findWorkspaceRoot(filePath: string): string {
  let current = dirname(filePath);
  const root = "/";

  while (current !== root) {
    for (const marker of WORKSPACE_ROOT_MARKERS) {
      if (existsSync(join(current, marker))) {
        return current;
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return dirname(filePath);
}

/**
 * Find server for file extension
 */
export function findServerForExtension(ext: string): ResolvedServer | null {
  for (const server of BUILTIN_SERVERS) {
    if (server.disabled) continue;
    if (server.extensions.includes(ext)) {
      // Check if command exists
      const [cmd] = server.command;
      // Simple check - more sophisticated checking would use which/where
      return {
        ...server,
        priority: 100,
      };
    }
  }
  return null;
}

/**
 * Helper: Execute with LSP client
 */
export async function withLspClient<T>(
  filePath: string,
  fn: (client: LSPClient) => Promise<T>
): Promise<T> {
  const ext = extname(filePath);
  const server = findServerForExtension(ext);

  if (!server) {
    throw new Error(`No LSP server configured for extension: ${ext}`);
  }

  const root = findWorkspaceRoot(filePath);
  const client = await lspServerManager.getClient(root, server);

  try {
    return await fn(client);
  } finally {
    lspServerManager.releaseClient(root, server.id);
  }
}



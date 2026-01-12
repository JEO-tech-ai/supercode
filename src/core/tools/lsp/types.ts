/**
 * LSP Types
 * Type definitions for Language Server Protocol integration.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * Position in a text document (0-based)
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * Range in a text document
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * Location in a file
 */
export interface Location {
  uri: string;
  range: Range;
}

/**
 * Location link (extended location with origin)
 */
export interface LocationLink {
  originSelectionRange?: Range;
  targetUri: string;
  targetRange: Range;
  targetSelectionRange: Range;
}

/**
 * Symbol information
 */
export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  location: Location;
  containerName?: string;
}

/**
 * Document symbol (hierarchical)
 */
export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

/**
 * Symbol kinds (LSP standard)
 */
export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

/**
 * Diagnostic severity
 */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/**
 * Diagnostic information
 */
export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

/**
 * Related diagnostic information
 */
export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

/**
 * Hover result
 */
export interface HoverResult {
  contents: MarkupContent | MarkedString | MarkedString[];
  range?: Range;
}

/**
 * Markup content
 */
export interface MarkupContent {
  kind: "plaintext" | "markdown";
  value: string;
}

/**
 * Marked string (legacy format)
 */
export type MarkedString = string | { language: string; value: string };

/**
 * Text edit
 */
export interface TextEdit {
  range: Range;
  newText: string;
}

/**
 * Versioned text document identifier
 */
export interface VersionedTextDocumentIdentifier {
  uri: string;
  version: number;
}

/**
 * Text document edit
 */
export interface TextDocumentEdit {
  textDocument: VersionedTextDocumentIdentifier;
  edits: TextEdit[];
}

/**
 * Create file operation
 */
export interface CreateFile {
  kind: "create";
  uri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

/**
 * Rename file operation
 */
export interface RenameFile {
  kind: "rename";
  oldUri: string;
  newUri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

/**
 * Delete file operation
 */
export interface DeleteFile {
  kind: "delete";
  uri: string;
  options?: { recursive?: boolean; ignoreIfNotExists?: boolean };
}

/**
 * Resource operation (create, rename, or delete)
 */
export type ResourceOperation = CreateFile | RenameFile | DeleteFile;

/**
 * Workspace edit
 */
export interface WorkspaceEdit {
  changes?: { [uri: string]: TextEdit[] };
  documentChanges?: (TextDocumentEdit | ResourceOperation)[];
}

/**
 * Code action kind
 */
export type CodeActionKind =
  | "quickfix"
  | "refactor"
  | "refactor.extract"
  | "refactor.inline"
  | "refactor.rewrite"
  | "source"
  | "source.organizeImports"
  | "source.fixAll"
  | string;

/**
 * Code action
 */
export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  disabled?: { reason: string };
  edit?: WorkspaceEdit;
  command?: Command;
  data?: unknown;
}

/**
 * Command
 */
export interface Command {
  title: string;
  command: string;
  arguments?: unknown[];
}

/**
 * Code action context
 */
export interface CodeActionContext {
  diagnostics: Diagnostic[];
  only?: CodeActionKind[];
  triggerKind?: CodeActionTriggerKind;
}

/**
 * Code action trigger kind
 */
export enum CodeActionTriggerKind {
  Invoked = 1,
  Automatic = 2,
}

/**
 * Prepare rename result
 */
export type PrepareRenameResult =
  | Range
  | { range: Range; placeholder: string }
  | { defaultBehavior: boolean };

/**
 * LSP server configuration
 */
export interface LSPServerConfig {
  id: string;
  command: string[];
  extensions: string[];
  disabled?: boolean;
  env?: Record<string, string>;
  initialization?: Record<string, unknown>;
}

/**
 * Resolved server configuration
 */
export interface ResolvedServer {
  id: string;
  command: string[];
  extensions: string[];
  priority: number;
  env?: Record<string, string>;
  initialization?: Record<string, unknown>;
}

/**
 * Server lookup result
 */
export interface ServerLookupResult {
  status: "found" | "not_configured" | "not_installed";
  server?: ResolvedServer;
  error?: string;
}

/**
 * Apply result for workspace edits
 */
export interface ApplyResult {
  success: boolean;
  filesModified: string[];
  totalEdits: number;
  errors: string[];
}

/**
 * LSP request/response message
 */
export interface LSPMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * LSP initialize params
 */
export interface InitializeParams {
  processId: number | null;
  rootUri: string;
  capabilities: ClientCapabilities;
  initializationOptions?: unknown;
}

/**
 * Client capabilities (simplified)
 */
export interface ClientCapabilities {
  textDocument?: {
    hover?: { contentFormat?: string[] };
    definition?: { linkSupport?: boolean };
    references?: { dynamicRegistration?: boolean };
    documentSymbol?: { hierarchicalDocumentSymbolSupport?: boolean };
    codeAction?: { codeActionLiteralSupport?: { codeActionKind?: { valueSet?: string[] } } };
    rename?: { prepareSupport?: boolean };
    publishDiagnostics?: { relatedInformation?: boolean };
  };
  workspace?: {
    workspaceEdit?: { documentChanges?: boolean };
    symbol?: { symbolKind?: { valueSet?: number[] } };
  };
}

/**
 * Server capabilities (simplified)
 */
export interface ServerCapabilities {
  hoverProvider?: boolean;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: boolean | { codeActionKinds?: string[] };
  renameProvider?: boolean | { prepareProvider?: boolean };
}

/**
 * LSP Tools Module
 * Language Server Protocol integration for SuperCode.
 * Provides 11 LSP-based tools for code intelligence.
 */

// Type exports
export * from "./types";

// Constants exports
export {
  SYMBOL_KIND_NAMES,
  SEVERITY_NAMES,
  DEFAULT_MAX_REFERENCES,
  DEFAULT_MAX_SYMBOLS,
  DEFAULT_MAX_DIAGNOSTICS,
  EXTENSION_LANGUAGE_MAP,
  BUILTIN_SERVERS,
  LSP_INSTALL_HINTS,
  WORKSPACE_ROOT_MARKERS,
} from "./constants";

// Client exports
export {
  LSPClient,
  lspServerManager,
  findWorkspaceRoot,
  findServerForExtension,
  withLspClient,
} from "./client";

// Utils exports
export {
  formatHoverResult,
  formatLocation,
  formatLocations,
  formatSymbolKind,
  formatDocumentSymbol,
  formatSymbolInfo,
  formatDocumentSymbols,
  formatSeverity,
  formatDiagnostic,
  formatDiagnostics,
  formatPrepareRenameResult,
  formatCodeAction,
  formatCodeActions,
  applyTextEditsToFile,
  applyWorkspaceEdit,
  formatApplyResult,
  formatWorkspaceEdit,
} from "./utils";

// Tool exports
export {
  lspHoverTool,
  lspGotoDefinitionTool,
  lspFindReferencesTool,
  lspDocumentSymbolsTool,
  lspWorkspaceSymbolsTool,
  lspDiagnosticsTool,
  lspServersTool,
  lspPrepareRenameTool,
  lspRenameTool,
  lspCodeActionsTool,
  lspCodeActionResolveTool,
  lspTools,
} from "./tools";

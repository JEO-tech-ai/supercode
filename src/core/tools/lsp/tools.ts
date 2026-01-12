/**
 * LSP Tools
 * All 11 LSP tool definitions.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../../types";
import { withLspClient, findServerForExtension } from "./client";
import {
  formatHoverResult,
  formatLocations,
  formatDocumentSymbols,
  formatDiagnostics,
  formatPrepareRenameResult,
  formatCodeActions,
  formatWorkspaceEdit,
  formatApplyResult,
  applyWorkspaceEdit,
} from "./utils";
import { BUILTIN_SERVERS, LSP_INSTALL_HINTS } from "./constants";
import { extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import type { CodeAction, Range } from "./types";

/**
 * Common helper to resolve file path
 */
function resolveFilePath(filePath: string, context: ToolContext): string {
  if (filePath.startsWith("/")) return filePath;
  return resolve(context.workdir, filePath);
}

/**
 * Tool 1: lsp_hover
 * Get type info, docs, and signature for a symbol at position
 */
export const lspHoverTool: ToolDefinition = {
  name: "lsp_hover",
  description:
    "Get type information, documentation, and signature for a symbol at a specific position. " +
    "Use this to understand what a variable, function, or type is.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "line",
      type: "number",
      description: "Line number (1-based)",
      required: true,
    },
    {
      name: "character",
      type: "number",
      description: "Character position (0-based)",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const line = (args.line as number) - 1; // Convert to 0-based
    const character = args.character as number;

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.hover(filePath, line, character);
      });

      return {
        success: true,
        output: formatHoverResult(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 2: lsp_goto_definition
 * Jump to where a symbol is defined
 */
export const lspGotoDefinitionTool: ToolDefinition = {
  name: "lsp_goto_definition",
  description:
    "Jump to where a symbol is defined. Use this to find where a function, class, " +
    "variable, or type is originally declared.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "line",
      type: "number",
      description: "Line number (1-based)",
      required: true,
    },
    {
      name: "character",
      type: "number",
      description: "Character position (0-based)",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const line = (args.line as number) - 1;
    const character = args.character as number;

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.definition(filePath, line, character);
      });

      return {
        success: true,
        output: formatLocations(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 3: lsp_find_references
 * Find all usages of a symbol
 */
export const lspFindReferencesTool: ToolDefinition = {
  name: "lsp_find_references",
  description:
    "Find all usages/references of a symbol across the entire workspace. " +
    "Use this to see where a function is called, where a variable is used, etc.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "line",
      type: "number",
      description: "Line number (1-based)",
      required: true,
    },
    {
      name: "character",
      type: "number",
      description: "Character position (0-based)",
      required: true,
    },
    {
      name: "includeDeclaration",
      type: "boolean",
      description: "Include the declaration in results (default: true)",
      required: false,
      default: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const line = (args.line as number) - 1;
    const character = args.character as number;
    const includeDeclaration = args.includeDeclaration !== false;

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.references(filePath, line, character, includeDeclaration);
      });

      return {
        success: true,
        output: formatLocations(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 4: lsp_document_symbols
 * Get hierarchical outline of all symbols in a file
 */
export const lspDocumentSymbolsTool: ToolDefinition = {
  name: "lsp_document_symbols",
  description:
    "Get a hierarchical outline of all symbols (functions, classes, variables, etc.) " +
    "in a file. Use this to understand the structure of a file.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.documentSymbols(filePath);
      });

      return {
        success: true,
        output: formatDocumentSymbols(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 5: lsp_workspace_symbols
 * Search symbols by name across entire workspace
 */
export const lspWorkspaceSymbolsTool: ToolDefinition = {
  name: "lsp_workspace_symbols",
  description:
    "Search for symbols by name across the entire workspace. " +
    "Use this to find functions, classes, or variables by name.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to any file in the workspace (used to determine LSP server)",
      required: true,
    },
    {
      name: "query",
      type: "string",
      description: "Search query (fuzzy matching)",
      required: true,
    },
    {
      name: "limit",
      type: "number",
      description: "Maximum results (default: 50, max: 200)",
      required: false,
      default: 50,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const query = args.query as string;
    const limit = Math.min((args.limit as number) || 50, 200);

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.workspaceSymbols(query);
      });

      return {
        success: true,
        output: formatDocumentSymbols(result, limit),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 6: lsp_diagnostics
 * Get errors, warnings, and hints from the language server
 */
export const lspDiagnosticsTool: ToolDefinition = {
  name: "lsp_diagnostics",
  description:
    "Get errors, warnings, information, and hints from the language server. " +
    "Use this to check for problems BEFORE building or running tests.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "severity",
      type: "string",
      description: 'Filter by severity: "error", "warning", "information", "hint", or "all" (default)',
      required: false,
      default: "all",
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const severity = (args.severity as string) || "all";

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.diagnostics(filePath);
      });

      return {
        success: true,
        output: formatDiagnostics(result, severity),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 7: lsp_servers
 * List available LSP servers and their status
 */
export const lspServersTool: ToolDefinition = {
  name: "lsp_servers",
  description:
    "List all configured LSP servers and their installation status. " +
    "Use this to see which language servers are available.",
  parameters: [],

  async execute(_args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const lines: string[] = ["Available LSP Servers:", ""];

    for (const server of BUILTIN_SERVERS) {
      if (server.disabled) {
        lines.push(`  ${server.id}: [disabled]`);
        continue;
      }

      // Check if command exists (simplified check)
      const [cmd] = server.command;
      let status = "[available]";

      // Check common locations
      const isAvailable =
        existsSync(cmd) ||
        existsSync(`/usr/bin/${cmd}`) ||
        existsSync(`/usr/local/bin/${cmd}`) ||
        existsSync(`/opt/homebrew/bin/${cmd}`);

      if (!isAvailable) {
        status = "[not installed]";
      }

      lines.push(`  ${server.id}: ${status}`);
      lines.push(`    Extensions: ${server.extensions.join(", ")}`);

      if (!isAvailable && LSP_INSTALL_HINTS[server.id]) {
        lines.push(`    Install: ${LSP_INSTALL_HINTS[server.id]}`);
      }

      lines.push("");
    }

    return {
      success: true,
      output: lines.join("\n"),
    };
  },
};

/**
 * Tool 8: lsp_prepare_rename
 * Check if a symbol can be renamed
 */
export const lspPrepareRenameTool: ToolDefinition = {
  name: "lsp_prepare_rename",
  description:
    "Check if a symbol at the given position can be renamed. " +
    "Use this BEFORE lsp_rename to verify the rename is valid.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "line",
      type: "number",
      description: "Line number (1-based)",
      required: true,
    },
    {
      name: "character",
      type: "number",
      description: "Character position (0-based)",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const line = (args.line as number) - 1;
    const character = args.character as number;

    try {
      const result = await withLspClient(filePath, async (client) => {
        return client.prepareRename(filePath, line, character);
      });

      return {
        success: true,
        output: formatPrepareRenameResult(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 9: lsp_rename
 * Rename a symbol across the entire workspace
 */
export const lspRenameTool: ToolDefinition = {
  name: "lsp_rename",
  description:
    "Rename a symbol across the entire workspace. This will modify files! " +
    "Use lsp_prepare_rename first to check if rename is valid.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "line",
      type: "number",
      description: "Line number (1-based)",
      required: true,
    },
    {
      name: "character",
      type: "number",
      description: "Character position (0-based)",
      required: true,
    },
    {
      name: "newName",
      type: "string",
      description: "New name for the symbol",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const line = (args.line as number) - 1;
    const character = args.character as number;
    const newName = args.newName as string;

    try {
      const edit = await withLspClient(filePath, async (client) => {
        return client.rename(filePath, line, character, newName);
      });

      const result = applyWorkspaceEdit(edit);
      return {
        success: result.success,
        output: formatApplyResult(result),
        error: result.errors.length > 0 ? result.errors.join("\n") : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 10: lsp_code_actions
 * Get available quick fixes, refactorings, and source actions
 */
export const lspCodeActionsTool: ToolDefinition = {
  name: "lsp_code_actions",
  description:
    "Get available code actions (quick fixes, refactorings, source actions) for a range. " +
    "Returns a list of actions that can be applied with lsp_code_action_resolve.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "startLine",
      type: "number",
      description: "Start line number (1-based)",
      required: true,
    },
    {
      name: "startCharacter",
      type: "number",
      description: "Start character position (0-based)",
      required: true,
    },
    {
      name: "endLine",
      type: "number",
      description: "End line number (1-based)",
      required: true,
    },
    {
      name: "endCharacter",
      type: "number",
      description: "End character position (0-based)",
      required: true,
    },
    {
      name: "kind",
      type: "string",
      description: 'Filter by kind: "quickfix", "refactor", "refactor.extract", "refactor.inline", "refactor.rewrite", "source", "source.organizeImports", "source.fixAll"',
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const range: Range = {
      start: {
        line: (args.startLine as number) - 1,
        character: args.startCharacter as number,
      },
      end: {
        line: (args.endLine as number) - 1,
        character: args.endCharacter as number,
      },
    };
    const kind = args.kind as string | undefined;

    try {
      let result = await withLspClient(filePath, async (client) => {
        return client.codeAction(filePath, range, kind ? { diagnostics: [], only: [kind] } : undefined);
      });

      // Store for later resolution
      const actionsJson = result ? JSON.stringify(result) : null;

      return {
        success: true,
        output: formatCodeActions(result),
        data: { actionsJson },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool 11: lsp_code_action_resolve
 * Apply a code action from lsp_code_actions
 */
export const lspCodeActionResolveTool: ToolDefinition = {
  name: "lsp_code_action_resolve",
  description:
    "Resolve and apply a code action from lsp_code_actions. " +
    "Pass the code action JSON string from the previous call.",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "Path to the file",
      required: true,
    },
    {
      name: "codeAction",
      type: "string",
      description: "Code action JSON string from lsp_code_actions",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = resolveFilePath(args.filePath as string, context);
    const codeActionStr = args.codeAction as string;

    try {
      const codeAction = JSON.parse(codeActionStr) as CodeAction;

      const resolved = await withLspClient(filePath, async (client) => {
        return client.codeActionResolve(codeAction);
      });

      if (resolved.edit) {
        const result = applyWorkspaceEdit(resolved.edit);
        return {
          success: result.success,
          output: formatApplyResult(result),
          error: result.errors.length > 0 ? result.errors.join("\n") : undefined,
        };
      }

      if (resolved.command) {
        return {
          success: true,
          output: `Code action would execute command: ${resolved.command.command}`,
        };
      }

      return {
        success: true,
        output: "Code action resolved but has no edit or command.",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * All LSP tools
 */
export const lspTools: ToolDefinition[] = [
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
];

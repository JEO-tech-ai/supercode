/**
 * LSP Utilities
 * Formatting and helper functions for LSP tools.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Location,
  LocationLink,
  HoverResult,
  MarkupContent,
  MarkedString,
  DocumentSymbol,
  SymbolInfo,
  Diagnostic,
  CodeAction,
  PrepareRenameResult,
  WorkspaceEdit,
  TextEdit,
  TextDocumentEdit,
  ResourceOperation,
  ApplyResult,
  Range,
} from "./types";
import { SYMBOL_KIND_NAMES, SEVERITY_NAMES, DEFAULT_MAX_REFERENCES, DEFAULT_MAX_SYMBOLS, DEFAULT_MAX_DIAGNOSTICS } from "./constants";

/**
 * Format hover result
 */
export function formatHoverResult(result: HoverResult | null): string {
  if (!result) return "No hover information available.";

  const { contents } = result;

  if (typeof contents === "string") {
    return contents;
  }

  if (Array.isArray(contents)) {
    return contents
      .map((c) => {
        if (typeof c === "string") return c;
        return `\`\`\`${c.language}\n${c.value}\n\`\`\``;
      })
      .join("\n\n");
  }

  if ("kind" in contents) {
    return contents.value;
  }

  if ("language" in contents) {
    return `\`\`\`${contents.language}\n${contents.value}\n\`\`\``;
  }

  if ("value" in contents) {
    return (contents as MarkupContent).value;
  }

  return String(contents);
}

/**
 * Format location
 */
export function formatLocation(loc: Location | LocationLink): string {
  let uri: string;
  let range: Range;

  if ("uri" in loc) {
    uri = loc.uri;
    range = loc.range;
  } else {
    uri = loc.targetUri;
    range = loc.targetSelectionRange;
  }

  const filePath = uri.startsWith("file://") ? fileURLToPath(uri) : uri;
  const line = range.start.line + 1; // 1-based for display
  const char = range.start.character;

  return `${filePath}:${line}:${char}`;
}

/**
 * Format locations
 */
export function formatLocations(
  locations: Location | Location[] | LocationLink[] | null,
  maxResults = DEFAULT_MAX_REFERENCES
): string {
  if (!locations) return "No locations found.";

  const locs = Array.isArray(locations) ? locations : [locations];
  const truncated = locs.length > maxResults;
  const toShow = locs.slice(0, maxResults);

  const lines = toShow.map((loc) => formatLocation(loc));

  if (truncated) {
    lines.push(`\n... and ${locs.length - maxResults} more locations (truncated)`);
  }

  return lines.join("\n");
}

/**
 * Format symbol kind
 */
export function formatSymbolKind(kind: number): string {
  return SYMBOL_KIND_NAMES[kind] || `Unknown(${kind})`;
}

/**
 * Format document symbol (hierarchical)
 */
export function formatDocumentSymbol(symbol: DocumentSymbol, indent = ""): string {
  const kind = formatSymbolKind(symbol.kind);
  const line = symbol.range.start.line + 1;
  let result = `${indent}${kind}: ${symbol.name} (line ${line})`;

  if (symbol.children && symbol.children.length > 0) {
    for (const child of symbol.children) {
      result += "\n" + formatDocumentSymbol(child, indent + "  ");
    }
  }

  return result;
}

/**
 * Format symbol info
 */
export function formatSymbolInfo(symbol: SymbolInfo): string {
  const kind = formatSymbolKind(symbol.kind as number);
  const location = formatLocation(symbol.location);
  const container = symbol.containerName ? ` (in ${symbol.containerName})` : "";
  return `${kind}: ${symbol.name}${container} - ${location}`;
}

/**
 * Format document symbols
 */
export function formatDocumentSymbols(
  symbols: DocumentSymbol[] | SymbolInfo[] | null,
  maxResults = DEFAULT_MAX_SYMBOLS
): string {
  if (!symbols || symbols.length === 0) return "No symbols found.";

  const truncated = symbols.length > maxResults;
  const toShow = symbols.slice(0, maxResults);

  let lines: string[];

  // Check if hierarchical (DocumentSymbol) or flat (SymbolInfo)
  if ("range" in toShow[0]) {
    // DocumentSymbol
    lines = (toShow as DocumentSymbol[]).map((s) => formatDocumentSymbol(s));
  } else {
    // SymbolInfo
    lines = (toShow as SymbolInfo[]).map((s) => formatSymbolInfo(s));
  }

  if (truncated) {
    lines.push(`\n... and ${symbols.length - maxResults} more symbols (truncated)`);
  }

  return lines.join("\n");
}

/**
 * Format severity
 */
export function formatSeverity(severity: number | undefined): string {
  if (!severity) return "unknown";
  return SEVERITY_NAMES[severity] || `severity(${severity})`;
}

/**
 * Format diagnostic
 */
export function formatDiagnostic(diag: Diagnostic): string {
  const severity = formatSeverity(diag.severity);
  const line = diag.range.start.line + 1;
  const char = diag.range.start.character;
  const code = diag.code ? ` [${diag.code}]` : "";
  const source = diag.source ? ` (${diag.source})` : "";

  return `[${severity}] ${line}:${char}${code}${source}: ${diag.message}`;
}

/**
 * Format diagnostics
 */
export function formatDiagnostics(
  diagnostics: Diagnostic[],
  severityFilter?: string,
  maxResults = DEFAULT_MAX_DIAGNOSTICS
): string {
  let filtered = diagnostics;

  if (severityFilter && severityFilter !== "all") {
    const severityMap: Record<string, number> = {
      error: 1,
      warning: 2,
      information: 3,
      hint: 4,
    };
    const targetSeverity = severityMap[severityFilter];
    if (targetSeverity) {
      filtered = diagnostics.filter((d) => d.severity === targetSeverity);
    }
  }

  if (filtered.length === 0) {
    return severityFilter
      ? `No ${severityFilter} diagnostics found.`
      : "No diagnostics found.";
  }

  const truncated = filtered.length > maxResults;
  const toShow = filtered.slice(0, maxResults);
  const lines = toShow.map((d) => formatDiagnostic(d));

  if (truncated) {
    lines.push(`\n... and ${filtered.length - maxResults} more diagnostics (truncated)`);
  }

  return lines.join("\n");
}

/**
 * Format prepare rename result
 */
export function formatPrepareRenameResult(result: PrepareRenameResult | null): string {
  if (!result) return "Symbol cannot be renamed.";

  if ("defaultBehavior" in result) {
    return result.defaultBehavior
      ? "Rename is supported (default behavior)."
      : "Symbol cannot be renamed.";
  }

  if ("placeholder" in result) {
    const line = result.range.start.line + 1;
    return `Can rename at line ${line}: "${result.placeholder}"`;
  }

  // Just a range
  const line = (result as Range).start.line + 1;
  return `Can rename at line ${line}`;
}

/**
 * Format code action
 */
export function formatCodeAction(action: CodeAction, index?: number): string {
  const prefix = index !== undefined ? `[${index}] ` : "";
  const kind = action.kind ? ` (${action.kind})` : "";
  const preferred = action.isPreferred ? " ⭐" : "";
  const disabled = action.disabled ? ` [disabled: ${action.disabled.reason}]` : "";

  return `${prefix}${action.title}${kind}${preferred}${disabled}`;
}

/**
 * Format code actions
 */
export function formatCodeActions(actions: CodeAction[] | null): string {
  if (!actions || actions.length === 0) return "No code actions available.";

  return actions.map((a, i) => formatCodeAction(a, i + 1)).join("\n");
}

/**
 * Apply text edits to file
 */
export function applyTextEditsToFile(
  filePath: string,
  edits: TextEdit[]
): { success: boolean; editCount: number; error?: string } {
  try {
    if (!existsSync(filePath)) {
      return { success: false, editCount: 0, error: `File not found: ${filePath}` };
    }

    let content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Sort edits in reverse order (bottom to top) to maintain correct positions
    const sortedEdits = [...edits].sort((a, b) => {
      if (b.range.start.line !== a.range.start.line) {
        return b.range.start.line - a.range.start.line;
      }
      return b.range.start.character - a.range.start.character;
    });

    for (const edit of sortedEdits) {
      const { range, newText } = edit;
      const startLine = range.start.line;
      const endLine = range.end.line;
      const startChar = range.start.character;
      const endChar = range.end.character;

      if (startLine === endLine) {
        // Single line edit
        const line = lines[startLine] || "";
        lines[startLine] = line.slice(0, startChar) + newText + line.slice(endChar);
      } else {
        // Multi-line edit
        const firstLine = lines[startLine] || "";
        const lastLine = lines[endLine] || "";
        const newContent = firstLine.slice(0, startChar) + newText + lastLine.slice(endChar);
        lines.splice(startLine, endLine - startLine + 1, newContent);
      }
    }

    content = lines.join("\n");
    writeFileSync(filePath, content, "utf-8");

    return { success: true, editCount: edits.length };
  } catch (error) {
    return {
      success: false,
      editCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Apply workspace edit
 */
export function applyWorkspaceEdit(edit: WorkspaceEdit | null): ApplyResult {
  if (!edit) {
    return { success: true, filesModified: [], totalEdits: 0, errors: [] };
  }

  const result: ApplyResult = {
    success: true,
    filesModified: [],
    totalEdits: 0,
    errors: [],
  };

  // Handle changes (simple format)
  if (edit.changes) {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      const filePath = uri.startsWith("file://") ? fileURLToPath(uri) : uri;
      const { success, editCount, error } = applyTextEditsToFile(filePath, edits);

      if (success) {
        result.filesModified.push(filePath);
        result.totalEdits += editCount;
      } else {
        result.success = false;
        result.errors.push(`${filePath}: ${error}`);
      }
    }
  }

  // Handle documentChanges (new format with file operations)
  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      if ("kind" in change) {
        // Resource operation
        const op = change as ResourceOperation;
        try {
          if (op.kind === "create") {
            const filePath = fileURLToPath(op.uri);
            const dir = dirname(filePath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            if (!existsSync(filePath) || op.options?.overwrite) {
              writeFileSync(filePath, "", "utf-8");
              result.filesModified.push(filePath);
            }
          } else if (op.kind === "rename") {
            const oldPath = fileURLToPath(op.oldUri);
            const newPath = fileURLToPath(op.newUri);
            const dir = dirname(newPath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            renameSync(oldPath, newPath);
            result.filesModified.push(newPath);
          } else if (op.kind === "delete") {
            const filePath = fileURLToPath(op.uri);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
              result.filesModified.push(filePath);
            }
          }
        } catch (error) {
          result.success = false;
          result.errors.push(`${op.kind}: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // Text document edit
        const docEdit = change as TextDocumentEdit;
        const filePath = docEdit.textDocument.uri.startsWith("file://")
          ? fileURLToPath(docEdit.textDocument.uri)
          : docEdit.textDocument.uri;
        const { success, editCount, error } = applyTextEditsToFile(filePath, docEdit.edits);

        if (success) {
          result.filesModified.push(filePath);
          result.totalEdits += editCount;
        } else {
          result.success = false;
          result.errors.push(`${filePath}: ${error}`);
        }
      }
    }
  }

  // Deduplicate filesModified
  result.filesModified = [...new Set(result.filesModified)];

  return result;
}

/**
 * Format apply result
 */
export function formatApplyResult(result: ApplyResult): string {
  if (!result.success) {
    return `Failed to apply edits:\n${result.errors.join("\n")}`;
  }

  if (result.filesModified.length === 0) {
    return "No files were modified.";
  }

  const lines = [
    `Successfully applied ${result.totalEdits} edit(s) to ${result.filesModified.length} file(s):`,
    ...result.filesModified.map((f) => `  - ${f}`),
  ];

  return lines.join("\n");
}

/**
 * Format workspace edit (preview)
 */
export function formatWorkspaceEdit(edit: WorkspaceEdit | null): string {
  if (!edit) return "No changes to apply.";

  const changes: string[] = [];

  if (edit.changes) {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      const filePath = uri.startsWith("file://") ? fileURLToPath(uri) : uri;
      changes.push(`${filePath}: ${edits.length} edit(s)`);
    }
  }

  if (edit.documentChanges) {
    for (const change of edit.documentChanges) {
      if ("kind" in change) {
        const op = change as ResourceOperation;
        if (op.kind === "create") {
          changes.push(`Create: ${fileURLToPath(op.uri)}`);
        } else if (op.kind === "rename") {
          changes.push(`Rename: ${fileURLToPath(op.oldUri)} -> ${fileURLToPath(op.newUri)}`);
        } else if (op.kind === "delete") {
          changes.push(`Delete: ${fileURLToPath(op.uri)}`);
        }
      } else {
        const docEdit = change as TextDocumentEdit;
        const filePath = docEdit.textDocument.uri.startsWith("file://")
          ? fileURLToPath(docEdit.textDocument.uri)
          : docEdit.textDocument.uri;
        changes.push(`${filePath}: ${docEdit.edits.length} edit(s)`);
      }
    }
  }

  if (changes.length === 0) return "No changes to apply.";

  return `Changes:\n${changes.map((c) => `  - ${c}`).join("\n")}`;
}

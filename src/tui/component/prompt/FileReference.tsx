import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../context/theme";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { getStringWidth } from "../../utils/string-width";
import { createDebouncedAsync } from "../../utils/queue";

export interface FileReference {
  type: "file" | "directory";
  path: string;
  displayPath: string;
  lineRange?: { start: number; end?: number };
  size?: number;
  extension?: string;
}

export interface AgentReference {
  type: "agent";
  name: string;
  description?: string;
}

export interface SymbolReference {
  type: "symbol";
  name: string;
  kind: "function" | "class" | "variable" | "type" | "interface";
  file?: string;
  line?: number;
}

export interface URLReference {
  type: "url";
  url: string;
  title?: string;
}

export type PromptPart = 
  | FileReference 
  | AgentReference 
  | SymbolReference
  | URLReference
  | { type: "text"; text: string };

interface FileReferenceMenuProps {
  visible: boolean;
  filter: string;
  onSelect: (ref: FileReference | AgentReference) => void;
  onClose: () => void;
  selectedIndex: number;
  onNavigate: (direction: -1 | 1) => void;
  cwd?: string;
  showAgents?: boolean;
  showFiles?: boolean;
  showSymbols?: boolean;
}

// Available agents for @ mention with enhanced descriptions
const AGENTS: Array<{ name: string; description: string; icon: string; capabilities: string[] }> = [
  { 
    name: "explorer", 
    description: "Fast codebase search & navigation",
    icon: "🔍",
    capabilities: ["grep", "find", "semantic-search"]
  },
  { 
    name: "analyst", 
    description: "Architecture & security review",
    icon: "📊",
    capabilities: ["analyze", "review", "security-scan"]
  },
  { 
    name: "frontend", 
    description: "UI/UX specialist (React, Vue, etc.)",
    icon: "🎨",
    capabilities: ["component", "style", "accessibility"]
  },
  { 
    name: "docwriter", 
    description: "Technical documentation writer",
    icon: "📝",
    capabilities: ["readme", "api-docs", "comments"]
  },
  { 
    name: "executor", 
    description: "Command & script execution",
    icon: "⚡",
    capabilities: ["shell", "npm", "docker"]
  },
  { 
    name: "reviewer", 
    description: "Code review & best practices",
    icon: "👀",
    capabilities: ["review", "lint", "suggest"]
  },
  { 
    name: "librarian", 
    description: "Dependency & package management",
    icon: "📚",
    capabilities: ["deps", "upgrade", "audit"]
  },
  { 
    name: "multimodal", 
    description: "Image & screenshot analysis",
    icon: "🖼️",
    capabilities: ["vision", "ocr", "diagram"]
  },
  { 
    name: "sisyphus", 
    description: "Persistent long-running tasks",
    icon: "🏔️",
    capabilities: ["long-task", "retry", "checkpoint"]
  },
];

// File type icons
const FILE_ICONS: Record<string, string> = {
  ts: "📘",
  tsx: "📘",
  js: "📒",
  jsx: "📒",
  py: "🐍",
  rs: "🦀",
  go: "🐹",
  java: "☕",
  rb: "💎",
  php: "🐘",
  c: "🔧",
  cpp: "⚙️",
  h: "📑",
  css: "🎨",
  scss: "🎨",
  html: "🌐",
  json: "📋",
  yaml: "📄",
  yml: "📄",
  md: "📝",
  txt: "📄",
  sh: "💻",
  bash: "💻",
  zsh: "💻",
  dockerfile: "🐳",
  sql: "🗃️",
  graphql: "◈",
  default: "📄",
  directory: "📁",
};

function getFileIcon(filename: string, isDirectory: boolean): string {
  if (isDirectory) return FILE_ICONS.directory;
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const globRegexCache = new Map<string, RegExp>();

function matchGlob(pattern: string, filepath: string): boolean {
  let regex = globRegexCache.get(pattern);
  if (!regex) {
    const regexPattern = pattern
      .replace(/\*\*/g, "<<<GLOBSTAR>>>")
      .replace(/\*/g, "[^/]*")
      .replace(/<<<GLOBSTAR>>>/g, ".*")
      .replace(/\?/g, ".")
      .replace(/\./g, "\\.");
    regex = new RegExp(`^${regexPattern}$`, "i");
    globRegexCache.set(pattern, regex);
    if (globRegexCache.size > 100) {
      const firstKey = globRegexCache.keys().next().value;
      if (firstKey) globRegexCache.delete(firstKey);
    }
  }
  return regex.test(filepath);
}

// Check if query contains glob patterns
function isGlobPattern(query: string): boolean {
  return query.includes("*") || query.includes("?") || query.includes("[");
}

const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  "target",
  "vendor",
  ".idea",
  ".vscode",
];

function shouldIgnore(name: string): boolean {
  if (name.startsWith(".") && name !== ".supercoin") return true;
  return IGNORE_PATTERNS.includes(name);
}

interface SearchState {
  results: FileReference[];
  visited: Set<string>;
  aborted: boolean;
}

async function searchDirectoryAsync(
  dir: string,
  cwd: string,
  searchQuery: string,
  isGlob: boolean,
  lineRange: { start: number; end?: number } | undefined,
  state: SearchState,
  signal: AbortSignal,
  depth: number = 0
): Promise<void> {
  if (depth > 6 || state.results.length >= 100 || signal.aborted) return;

  let entries: fsSync.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  if (signal.aborted) return;

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (signal.aborted || state.results.length >= 100) break;
    if (shouldIgnore(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(cwd, fullPath);

    if (state.visited.has(fullPath)) continue;
    state.visited.add(fullPath);

    let matches = false;
    if (isGlob) {
      matches = matchGlob(searchQuery, relativePath);
    } else {
      const queryLower = searchQuery.toLowerCase();
      const targetLower = relativePath.toLowerCase();

      if (targetLower.includes(queryLower)) {
        matches = true;
      } else {
        let queryIdx = 0;
        for (let i = 0; i < targetLower.length && queryIdx < queryLower.length; i++) {
          if (targetLower[i] === queryLower[queryIdx]) {
            queryIdx++;
          }
        }
        matches = queryIdx === queryLower.length;
      }
    }

    if (matches) {
      let fileSize: number | undefined;
      if (!entry.isDirectory()) {
        try {
          const stat = await fs.stat(fullPath);
          fileSize = stat.size;
        } catch {}
      }

      const ext = entry.name.split(".").pop()?.toLowerCase();

      state.results.push({
        type: entry.isDirectory() ? "directory" : "file",
        path: fullPath,
        displayPath: relativePath + (entry.isDirectory() ? "/" : ""),
        lineRange,
        size: fileSize,
        extension: ext,
      });
    }

    if (entry.isDirectory() && state.results.length < 100 && !signal.aborted) {
      await searchDirectoryAsync(
        fullPath,
        cwd,
        searchQuery,
        isGlob,
        lineRange,
        state,
        signal,
        depth + 1
      );
    }
  }
}

export function useFileSearch(query: string, cwd: string = process.cwd()) {
  const [files, setFiles] = useState<FileReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  
  const debouncedSearchRef = useRef<ReturnType<typeof createDebouncedAsync<string, FileReference[]>> | null>(null);

  useEffect(() => {
    if (!debouncedSearchRef.current) {
      debouncedSearchRef.current = createDebouncedAsync<string, FileReference[]>(
        async (searchQuery: string, signal: AbortSignal) => {
          const rangeMatch = searchQuery.match(/^(.+?)(?:#|:)(\d+)(?:-(\d+))?$/);
          let actualQuery = searchQuery;
          let lineRange: { start: number; end?: number } | undefined;

          if (rangeMatch) {
            actualQuery = rangeMatch[1];
            lineRange = {
              start: parseInt(rangeMatch[2], 10),
              end: rangeMatch[3] ? parseInt(rangeMatch[3], 10) : undefined,
            };
          }

          const isGlob = isGlobPattern(actualQuery);
          const state: SearchState = {
            results: [],
            visited: new Set(),
            aborted: false,
          };

          signal.addEventListener("abort", () => {
            state.aborted = true;
          });

          await searchDirectoryAsync(cwd, cwd, actualQuery, isGlob, lineRange, state, signal);

          if (signal.aborted) {
            throw new Error("AbortError");
          }

          state.results.sort((a, b) => {
            const aExact = a.displayPath.toLowerCase().includes(actualQuery.toLowerCase());
            const bExact = b.displayPath.toLowerCase().includes(actualQuery.toLowerCase());
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.displayPath.length - b.displayPath.length;
          });

          return state.results.slice(0, 25);
        },
        150
      );
    }

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [cwd]);

  useEffect(() => {
    if (!query) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debouncedSearchRef.current?.execute(query).then((results) => {
      if (results) {
        setFiles(results);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [query]);

  return { files, loading, recentFiles };
}

export function FileReferenceMenu({
  visible,
  filter,
  onSelect,
  onClose,
  selectedIndex,
  onNavigate,
  cwd,
  showAgents = true,
  showFiles = true,
  showSymbols = false,
}: FileReferenceMenuProps) {
  const { theme } = useTheme();
  const { files, loading } = useFileSearch(filter, cwd);
  const [mode, setMode] = useState<"all" | "agents" | "files">("all");

  // Filter agents based on query
  const filteredAgents = useMemo(() => {
    if (!showAgents) return [];
    if (!filter) return AGENTS;
    const q = filter.toLowerCase();
    return AGENTS.filter((a) => 
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  }, [filter, showAgents]);

  // Combined options: agents first, then files
  const options = useMemo(() => {
    const result: Array<{
      type: "agent" | "file" | "directory";
      display: string;
      description: string;
      icon: string;
      value: any;
      size?: string;
    }> = [];

    // Add agents
    if (mode === "all" || mode === "agents") {
      for (const a of filteredAgents) {
        result.push({
          type: "agent",
          display: `@${a.name}`,
          description: a.description,
          icon: a.icon,
          value: a,
        });
      }
    }

    // Add files
    if ((mode === "all" || mode === "files") && showFiles) {
      for (const f of files) {
        result.push({
          type: f.type === "directory" ? "directory" : "file",
          display: `@${f.displayPath}`,
          description: f.lineRange 
            ? `Lines ${f.lineRange.start}${f.lineRange.end ? `-${f.lineRange.end}` : "+"}`
            : f.type === "directory" ? "Directory" : (f.extension || "File"),
          icon: getFileIcon(f.displayPath, f.type === "directory"),
          value: f,
          size: formatFileSize(f.size),
        });
      }
    }

    return result;
  }, [filteredAgents, files, mode, showFiles]);

  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.return || key.tab) {
      const opt = options[selectedIndex];
      if (opt?.type === "file" || opt?.type === "directory") {
        onSelect(opt.value);
      } else if (opt?.type === "agent") {
        // Return agent reference
        onSelect({
          type: "file",
          path: "",
          displayPath: opt.value.name,
        } as FileReference);
      }
      return;
    }

    if (key.upArrow) {
      onNavigate(-1);
      return;
    }

    if (key.downArrow) {
      onNavigate(1);
      return;
    }

    // Mode switching
    if (input === "a") {
      setMode(mode === "agents" ? "all" : "agents");
      return;
    }
    if (input === "f") {
      setMode(mode === "files" ? "all" : "files");
      return;
    }
  }, { isActive: visible });

  const maxDisplayLen = useMemo(() => 
    Math.max(...options.slice(0, 15).map((o) => o.display.length), 20),
    [options]
  );

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      marginBottom={1}
      paddingX={1}
      height={Math.min(18, options.length + 5)}
    >
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box gap={2}>
          <Text color={theme.text} bold>
            {loading ? "🔍 Searching..." : "📂 Files & Agents"}
          </Text>
          {/* Mode indicator */}
          <Box gap={1}>
            <Text 
              color={mode === "all" || mode === "agents" ? theme.accent : theme.textMuted}
              bold={mode === "agents"}
            >
              [a]gents
            </Text>
            <Text 
              color={mode === "all" || mode === "files" ? theme.accent : theme.textMuted}
              bold={mode === "files"}
            >
              [f]iles
            </Text>
          </Box>
        </Box>
        <Text color={theme.textMuted}>
          {options.length} results
        </Text>
      </Box>

      {/* Results */}
      {options.length === 0 ? (
        <Box paddingX={1} flexDirection="column">
          <Text color={theme.textMuted}>No matching items</Text>
          {filter && (
            <Text color={theme.textMuted} dimColor>
              Try: *.ts, src/**/*.tsx, @agent
            </Text>
          )}
        </Box>
      ) : (
        <Box flexDirection="column">
          {/* Agents section */}
          {options.some((o) => o.type === "agent") && (mode === "all" || mode === "agents") && (
            <Box flexDirection="column" marginBottom={0}>
              <Text color={theme.textMuted} dimColor>AGENTS</Text>
              {options
                .filter((o) => o.type === "agent")
                .slice(0, 4)
                .map((opt, _i) => {
                  const i = options.indexOf(opt);
                  return (
                    <Box
                      key={opt.display}
                      paddingX={1}
                      backgroundColor={i === selectedIndex ? theme.selection : undefined}
                    >
                      <Text>{opt.icon} </Text>
                      <Text
                        color={i === selectedIndex ? theme.secondary : theme.accent}
                        bold={i === selectedIndex}
                      >
                        {opt.display.padEnd(15)}
                      </Text>
                      <Text color={theme.textMuted}>
                        {opt.description.slice(0, 35)}
                      </Text>
                    </Box>
                  );
                })}
            </Box>
          )}

          {/* Files section */}
          {options.some((o) => o.type === "file" || o.type === "directory") && (mode === "all" || mode === "files") && (
            <Box flexDirection="column">
              <Text color={theme.textMuted} dimColor>FILES</Text>
              {options
                .filter((o) => o.type === "file" || o.type === "directory")
                .slice(0, 8)
                .map((opt, _i) => {
                  const i = options.indexOf(opt);
                  return (
                    <Box
                      key={opt.display}
                      paddingX={1}
                      backgroundColor={i === selectedIndex ? theme.selection : undefined}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Text>{opt.icon} </Text>
                        <Text
                          color={
                            opt.type === "directory"
                              ? i === selectedIndex ? theme.accent : theme.warning
                              : i === selectedIndex ? theme.primary : theme.text
                          }
                          bold={i === selectedIndex}
                        >
                          {opt.display.slice(0, 35)}
                          {opt.display.length > 35 ? "..." : ""}
                        </Text>
                      </Box>
                      <Box gap={1}>
                        {opt.size && (
                          <Text color={theme.textMuted}>{opt.size}</Text>
                        )}
                        <Text color={theme.textMuted}>{opt.description}</Text>
                      </Box>
                    </Box>
                  );
                })}
              {options.filter((o) => o.type === "file" || o.type === "directory").length > 8 && (
                <Box paddingLeft={1}>
                  <Text color={theme.textMuted}>
                    +{options.filter((o) => o.type === "file" || o.type === "directory").length - 8} more
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Footer hints */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color={theme.textMuted}>
          <Text color={theme.text}>↑↓</Text> navigate  
          <Text color={theme.text}> Tab</Text> select  
          <Text color={theme.text}> Esc</Text> close
        </Text>
        <Text color={theme.textMuted} dimColor>
          #line, :line-end
        </Text>
      </Box>
    </Box>
  );
}

// Parse @ references from input text
export function parseReferences(input: string): {
  text: string;
  parts: PromptPart[];
} {
  const parts: PromptPart[] = [];
  const regex = /@([\w./-]+(?:#\d+(?:-\d+)?)?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    // Add text before the reference
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        text: input.slice(lastIndex, match.index),
      });
    }

    const ref = match[1];
    
    // Check if it's an agent reference
    const agent = AGENTS.find((a) => a.name.toLowerCase() === ref.toLowerCase());
    if (agent) {
      parts.push({
        type: "agent",
        name: agent.name,
      });
    } else {
      // It's a file reference
      const hashIndex = ref.lastIndexOf("#");
      let filePath = ref;
      let lineRange: { start: number; end?: number } | undefined;

      if (hashIndex !== -1) {
        const linePart = ref.slice(hashIndex + 1);
        const lineMatch = linePart.match(/^(\d+)(?:-(\d+))?$/);
        if (lineMatch) {
          filePath = ref.slice(0, hashIndex);
          lineRange = {
            start: parseInt(lineMatch[1], 10),
            end: lineMatch[2] ? parseInt(lineMatch[2], 10) : undefined,
          };
        }
      }

      parts.push({
        type: "file",
        path: filePath,
        displayPath: ref,
        lineRange,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < input.length) {
    parts.push({
      type: "text",
      text: input.slice(lastIndex),
    });
  }

  // Clean text (remove @ references)
  const cleanText = input.replace(regex, "").trim();

  return { text: cleanText, parts };
}

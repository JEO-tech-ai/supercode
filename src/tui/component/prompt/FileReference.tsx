import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../context/theme";
import * as fs from "fs";
import * as path from "path";

export interface FileReference {
  type: "file" | "directory";
  path: string;
  displayPath: string;
  lineRange?: { start: number; end?: number };
}

export interface AgentReference {
  type: "agent";
  name: string;
}

export type PromptPart = FileReference | AgentReference | { type: "text"; text: string };

interface FileReferenceMenuProps {
  visible: boolean;
  filter: string;
  onSelect: (ref: FileReference) => void;
  onClose: () => void;
  selectedIndex: number;
  onNavigate: (direction: -1 | 1) => void;
  cwd?: string;
}

// Available agents for @ mention
const AGENTS = [
  { name: "explorer", description: "Fast codebase search" },
  { name: "analyst", description: "Architecture & security review" },
  { name: "frontend", description: "UI/UX specialist" },
  { name: "docwriter", description: "Technical documentation" },
  { name: "executor", description: "Command execution" },
  { name: "reviewer", description: "Code review" },
];

export function useFileSearch(query: string, cwd: string = process.cwd()) {
  const [files, setFiles] = useState<FileReference[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setFiles([]);
      return;
    }

    setLoading(true);

    // Parse line range from query (e.g., "file.ts#10-20")
    const hashIndex = query.lastIndexOf("#");
    let searchQuery = query;
    let lineRange: { start: number; end?: number } | undefined;

    if (hashIndex !== -1) {
      const linePart = query.slice(hashIndex + 1);
      const match = linePart.match(/^(\d+)(?:-(\d*))?$/);
      if (match) {
        searchQuery = query.slice(0, hashIndex);
        lineRange = {
          start: parseInt(match[1], 10),
          end: match[2] ? parseInt(match[2], 10) : undefined,
        };
      }
    }

    // Simple file search using fs
    const searchFiles = async () => {
      try {
        const results: FileReference[] = [];
        const searchDir = (dir: string, depth: number = 0) => {
          if (depth > 4) return; // Max depth
          
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              // Skip hidden files and common ignore patterns
              if (entry.name.startsWith(".")) continue;
              if (entry.name === "node_modules") continue;
              if (entry.name === "dist") continue;
              if (entry.name === ".git") continue;

              const fullPath = path.join(dir, entry.name);
              const relativePath = path.relative(cwd, fullPath);

              if (relativePath.toLowerCase().includes(searchQuery.toLowerCase())) {
                results.push({
                  type: entry.isDirectory() ? "directory" : "file",
                  path: fullPath,
                  displayPath: relativePath + (entry.isDirectory() ? "/" : ""),
                  lineRange,
                });
              }

              if (entry.isDirectory() && results.length < 50) {
                searchDir(fullPath, depth + 1);
              }

              if (results.length >= 50) return;
            }
          } catch {
            // Ignore permission errors
          }
        };

        searchDir(cwd);
        setFiles(results.slice(0, 20));
      } catch (error) {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchFiles, 100); // Debounce
    return () => clearTimeout(timer);
  }, [query, cwd]);

  return { files, loading };
}

export function FileReferenceMenu({
  visible,
  filter,
  onSelect,
  onClose,
  selectedIndex,
  onNavigate,
  cwd,
}: FileReferenceMenuProps) {
  const { theme } = useTheme();
  const { files, loading } = useFileSearch(filter, cwd);

  // Filter agents based on query
  const filteredAgents = useMemo(() => {
    if (!filter) return AGENTS;
    const q = filter.toLowerCase();
    return AGENTS.filter((a) => a.name.toLowerCase().includes(q));
  }, [filter]);

  // Combined options: agents first, then files
  const options = useMemo(() => {
    const agentOptions = filteredAgents.map((a) => ({
      type: "agent" as const,
      display: `@${a.name}`,
      description: a.description,
      value: a,
    }));

    const fileOptions = files.map((f) => ({
      type: "file" as const,
      display: `@${f.displayPath}`,
      description: f.type === "directory" ? "Directory" : "File",
      value: f,
    }));

    return [...agentOptions, ...fileOptions];
  }, [filteredAgents, files]);

  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.return || key.tab) {
      const opt = options[selectedIndex];
      if (opt?.type === "file") {
        onSelect(opt.value);
      } else if (opt?.type === "agent") {
        // Handle agent selection
        onClose();
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
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      marginBottom={1}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.textMuted}>
          {loading ? "Searching..." : "Files & Agents"}
        </Text>
      </Box>
      {options.length === 0 ? (
        <Box paddingX={1}>
          <Text color={theme.textMuted}>No matching items</Text>
        </Box>
      ) : (
        options.slice(0, 10).map((opt, i) => (
          <Box
            key={opt.display}
            paddingX={1}
            backgroundColor={i === selectedIndex ? theme.selection : undefined}
          >
            <Text
              color={
                opt.type === "agent"
                  ? i === selectedIndex ? theme.secondary : theme.accent
                  : i === selectedIndex ? theme.primary : theme.text
              }
            >
              {opt.display.padEnd(30)}
            </Text>
            <Text color={theme.textMuted}>{opt.description}</Text>
          </Box>
        ))
      )}
      <Box marginTop={1}>
        <Text color={theme.textMuted}>
          ↑↓ Navigate • Enter/Tab Select • Esc Close
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

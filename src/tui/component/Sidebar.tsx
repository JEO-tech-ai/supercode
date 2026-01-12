import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";

interface SidebarSection {
  title: string;
  expanded: boolean;
  items: SidebarItem[];
}

interface SidebarItem {
  name: string;
  status?: "connected" | "running" | "idle" | "error" | "completed";
  description?: string;
  count?: number;
}

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
}

interface ModifiedFile {
  path: string;
  additions: number;
  deletions: number;
}

interface SidebarProps {
  visible: boolean;
  sessionTitle?: string;
  contextTokens?: number;
  contextPercentage?: number;
  cost?: string;
  mcpServers?: { name: string; status: "connected" | "failed" | "disabled" }[];
  lspServers?: { name: string; status: "running" | "stopped" }[];
  todos?: TodoItem[];
  modifiedFiles?: ModifiedFile[];
  agents?: { name: string; status: "idle" | "running" | "completed" }[];
  onToggle?: () => void;
  width?: number;
}

function StatusDot({ status }: { status: string }) {
  const { theme } = useTheme();
  
  const color = useMemo(() => {
    switch (status) {
      case "connected":
      case "running":
      case "completed":
        return theme.success;
      case "error":
      case "failed":
        return theme.error;
      case "in_progress":
        return theme.warning;
      default:
        return theme.textMuted;
    }
  }, [status, theme]);

  return <Text color={color}>●</Text>;
}

function TodoItemDisplay({ todo }: { todo: TodoItem }) {
  const { theme } = useTheme();
  
  const icon = useMemo(() => {
    switch (todo.status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "◐";
      default:
        return "○";
    }
  }, [todo.status]);

  const color = useMemo(() => {
    switch (todo.status) {
      case "completed":
        return theme.success;
      case "in_progress":
        return theme.warning;
      default:
        return theme.textMuted;
    }
  }, [todo.status, theme]);

  return (
    <Box>
      <Text color={color}>{icon} </Text>
      <Text 
        color={todo.status === "completed" ? theme.textMuted : theme.text}
        strikethrough={todo.status === "completed"}
      >
        {todo.content.slice(0, 40)}{todo.content.length > 40 ? "..." : ""}
      </Text>
    </Box>
  );
}

export function Sidebar({
  visible,
  sessionTitle = "Session",
  contextTokens = 0,
  contextPercentage = 0,
  cost = "$0.00",
  mcpServers = [],
  lspServers = [],
  todos = [],
  modifiedFiles = [],
  agents = [],
  onToggle,
  width = 35,
}: SidebarProps) {
  const { theme } = useTheme();
  const [expanded] = useState({
    context: true,
    mcp: true,
    lsp: false,
    todo: true,
    files: true,
    agents: true,
  });

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
    >
      {/* Session Title */}
      <Box marginBottom={1}>
        <Text color={theme.text} bold>
          {sessionTitle}
        </Text>
      </Box>

      {/* Context Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={theme.text}>{expanded.context ? "▼" : "▶"} </Text>
          <Text color={theme.text} bold>Context</Text>
        </Box>
        {expanded.context && (
          <Box flexDirection="column" paddingLeft={2}>
            <Text color={theme.textMuted}>{contextTokens.toLocaleString()} tokens</Text>
            <Text color={theme.textMuted}>{contextPercentage}% used</Text>
            <Text color={theme.textMuted}>{cost} spent</Text>
          </Box>
        )}
      </Box>

      {/* Agents */}
      {agents.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.text}>{expanded.agents ? "▼" : "▶"} </Text>
            <Text color={theme.text} bold>
              Agents{" "}
              <Text color={theme.textMuted}>({agents.length})</Text>
            </Text>
          </Box>
          {expanded.agents && (
            <Box flexDirection="column" paddingLeft={2}>
              {agents.map((agent) => (
                <Box key={agent.name} gap={1}>
                  <StatusDot status={agent.status} />
                  <Text color={theme.text}>{agent.name}</Text>
                  <Text color={theme.textMuted}>
                    {agent.status === "running" ? "working..." : agent.status}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* MCP Servers */}
      {mcpServers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.text}>{expanded.mcp ? "▼" : "▶"} </Text>
            <Text color={theme.text} bold>
              MCP{" "}
              <Text color={mcpServers.some((s) => s.status === "failed") ? theme.error : theme.success}>
                ({mcpServers.filter((s) => s.status === "connected").length}/{mcpServers.length})
              </Text>
            </Text>
          </Box>
          {expanded.mcp && (
            <Box flexDirection="column" paddingLeft={2}>
              {mcpServers.map((server) => (
                <Box key={server.name} gap={1}>
                  <StatusDot status={server.status} />
                  <Text color={theme.text}>{server.name}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* LSP Servers */}
      {lspServers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.text}>{expanded.lsp ? "▼" : "▶"} </Text>
            <Text color={theme.text} bold>
              LSP{" "}
              <Text color={theme.textMuted}>
                ({lspServers.filter((s) => s.status === "running").length})
              </Text>
            </Text>
          </Box>
          {expanded.lsp && (
            <Box flexDirection="column" paddingLeft={2}>
              {lspServers.map((server) => (
                <Box key={server.name} gap={1}>
                  <StatusDot status={server.status} />
                  <Text color={theme.text}>{server.name}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Todo List */}
      {todos.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.text}>{expanded.todo ? "▼" : "▶"} </Text>
            <Text color={theme.text} bold>
              Todo{" "}
              <Text color={theme.textMuted}>
                ({todos.filter((t) => t.status === "completed").length}/{todos.length})
              </Text>
            </Text>
          </Box>
          {expanded.todo && (
            <Box flexDirection="column" paddingLeft={2}>
              {todos.slice(0, 10).map((todo) => (
                <TodoItemDisplay key={todo.id} todo={todo} />
              ))}
              {todos.length > 10 && (
                <Text color={theme.textMuted}>+{todos.length - 10} more</Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Modified Files */}
      {modifiedFiles.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={theme.text}>{expanded.files ? "▼" : "▶"} </Text>
            <Text color={theme.text} bold>
              Modified Files{" "}
              <Text color={theme.textMuted}>({modifiedFiles.length})</Text>
            </Text>
          </Box>
          {expanded.files && (
            <Box flexDirection="column" paddingLeft={2}>
              {modifiedFiles.slice(0, 8).map((file) => (
                <Box key={file.path} justifyContent="space-between">
                  <Text color={theme.text}>
                    {file.path.split("/").pop()}
                  </Text>
                  <Box gap={1}>
                    {file.additions > 0 && (
                      <Text color={theme.success}>+{file.additions}</Text>
                    )}
                    {file.deletions > 0 && (
                      <Text color={theme.error}>-{file.deletions}</Text>
                    )}
                  </Box>
                </Box>
              ))}
              {modifiedFiles.length > 8 && (
                <Text color={theme.textMuted}>+{modifiedFiles.length - 8} more</Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box flexGrow={1} />
      <Box flexDirection="column">
        <Text color={theme.textMuted}>{process.cwd().split("/").pop()}</Text>
        <Box gap={1}>
          <Text color={theme.success}>●</Text>
          <Text color={theme.text} bold>Super</Text>
          <Text color={theme.primary} bold>Coin</Text>
          <Text color={theme.textMuted}>v0.2.0</Text>
        </Box>
      </Box>
    </Box>
  );
}

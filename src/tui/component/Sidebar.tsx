import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";
import { STATUS_ICONS, getStatusIcon, SECTION, STATUS, FILE_STATUS } from "../../shared/icons";

interface SidebarSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
  count?: number;
  status?: "ok" | "warning" | "error";
}

interface SidebarItem {
  name: string;
  status?: "connected" | "running" | "idle" | "error" | "completed" | "pending" | "in_progress";
  description?: string;
  count?: number;
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
}

export interface ModifiedFile {
  path: string;
  additions: number;
  deletions: number;
  status?: "added" | "modified" | "deleted" | "renamed";
}

export interface SubAgentInfo {
  name: string;
  type: string;
  status: "idle" | "running" | "completed" | "error" | "thinking" | "tool_calling";
  progress?: number;
  tokensUsed?: number;
}

export interface MCPServerInfo {
  name: string;
  status: "connected" | "connecting" | "disconnected" | "error" | "disabled";
  toolCount?: number;
}

export interface LSPServerInfo {
  name: string;
  language: string;
  status: "running" | "stopped" | "error";
  errors?: number;
  warnings?: number;
}

interface SidebarProps {
  visible: boolean;
  sessionTitle?: string;
  sessionId?: string;
  contextTokens?: number;
  contextPercentage?: number;
  maxContextTokens?: number;
  cost?: string;
  inputTokens?: number;
  outputTokens?: number;
  mcpServers?: MCPServerInfo[];
  lspServers?: LSPServerInfo[];
  todos?: TodoItem[];
  modifiedFiles?: ModifiedFile[];
  agents?: SubAgentInfo[];
  gitBranch?: string;
  gitStatus?: { staged: number; modified: number; untracked: number };
  onToggle?: () => void;
  onSectionToggle?: (sectionId: string) => void;
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
      case "cancelled":
        return theme.error;
      case "in_progress":
      case "thinking":
      case "tool_calling":
      case "connecting":
        return theme.warning;
      default:
        return theme.textMuted;
    }
  }, [status, theme]);

  return <Text color={color}>*</Text>;
}

function ProgressBar({ 
  progress, 
  width = 15,
  showPercentage = true 
}: { 
  progress: number; 
  width?: number;
  showPercentage?: boolean;
}) {
  const { theme } = useTheme();
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  
  // Color based on percentage
  const color = progress > 90 ? theme.error : progress > 70 ? theme.warning : theme.success;
  
  return (
    <Box>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color={theme.textMuted}>{"░".repeat(empty)}</Text>
      {showPercentage && (
        <Text color={theme.textMuted}> {progress}%</Text>
      )}
    </Box>
  );
}

function TodoItemDisplay({ todo, compact = false }: { todo: TodoItem; compact?: boolean }) {
  const { theme } = useTheme();
  
  const icon = useMemo(() => {
    switch (todo.status) {
      case "completed":
        return "[+]";
      case "in_progress":
        return "[*]";
      case "cancelled":
        return "[x]";
      default:
        return "[ ]";
    }
  }, [todo.status]);

  const color = useMemo(() => {
    switch (todo.status) {
      case "completed":
        return theme.success;
      case "in_progress":
        return theme.warning;
      case "cancelled":
        return theme.error;
      default:
        return theme.textMuted;
    }
  }, [todo.status, theme]);

  const priorityIcon = todo.priority === "high" ? "!" : todo.priority === "medium" ? "·" : "";
  const maxLen = compact ? 25 : 35;

  return (
    <Box>
      <Text color={color}>{icon} </Text>
      {priorityIcon && <Text color={theme.error}>{priorityIcon}</Text>}
      <Text 
        color={todo.status === "completed" || todo.status === "cancelled" ? theme.textMuted : theme.text}
        strikethrough={todo.status === "completed" || todo.status === "cancelled"}
      >
        {todo.content.slice(0, maxLen)}{todo.content.length > maxLen ? "..." : ""}
      </Text>
    </Box>
  );
}

function AgentItemDisplay({ agent }: { agent: SubAgentInfo }) {
  const { theme } = useTheme();
  
  const statusConfig = useMemo(() => {
    switch (agent.status) {
      case "running":
        return { icon: "[*]", color: theme.success };
      case "thinking":
        return { icon: "[~]", color: theme.accent };
      case "tool_calling":
        return { icon: "[T]", color: theme.warning };
      case "completed":
        return { icon: "[+]", color: theme.success };
      case "error":
        return { icon: "[-]", color: theme.error };
      default:
        return { icon: "[ ]", color: theme.textMuted };
    }
  }, [agent.status, theme]);

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={statusConfig.color}>{statusConfig.icon}</Text>
      <Text color={theme.text}>{agent.name}</Text>
      {agent.progress !== undefined && agent.status === "running" && (
        <Text color={theme.textMuted}>{agent.progress}%</Text>
      )}
      {agent.tokensUsed !== undefined && (
        <Text color={theme.accent}>{(agent.tokensUsed / 1000).toFixed(1)}k</Text>
      )}
    </Box>
  );
}

function FileItemDisplay({ file }: { file: ModifiedFile }) {
  const { theme } = useTheme();
  
  const statusIcon = useMemo(() => {
    switch (file.status) {
      case "added": return { icon: "A", color: theme.success };
      case "deleted": return { icon: "D", color: theme.error };
      case "renamed": return { icon: "R", color: theme.accent };
      default: return { icon: "M", color: theme.warning };
    }
  }, [file.status, theme]);

  const filename = file.path.split("/").pop() || file.path;

  return (
    <Box justifyContent="space-between">
      <Box gap={1}>
        <Text color={statusIcon.color}>{statusIcon.icon}</Text>
        <Text color={theme.text}>{filename.slice(0, 18)}</Text>
      </Box>
      <Box gap={1}>
        {file.additions > 0 && (
          <Text color={theme.success}>+{file.additions}</Text>
        )}
        {file.deletions > 0 && (
          <Text color={theme.error}>-{file.deletions}</Text>
        )}
      </Box>
    </Box>
  );
}

function SectionHeader({ 
  title, 
  icon, 
  expanded, 
  count, 
  status,
  onToggle 
}: { 
  title: string; 
  icon: string; 
  expanded: boolean; 
  count?: number;
  status?: "ok" | "warning" | "error";
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  
  const statusColor = status === "error" ? theme.error : status === "warning" ? theme.warning : theme.success;
  
  return (
    <Box 
      flexDirection="row" 
      justifyContent="space-between"
      marginBottom={0}
    >
      <Box gap={1}>
        <Text color={theme.textMuted}>{expanded ? "▼" : "▶"}</Text>
        <Text>{icon}</Text>
        <Text color={theme.text} bold>{title}</Text>
      </Box>
      {count !== undefined && (
        <Text color={status ? statusColor : theme.textMuted}>
          {count}
        </Text>
      )}
    </Box>
  );
}

export function Sidebar({
  visible,
  sessionTitle = "Session",
  sessionId,
  contextTokens = 0,
  contextPercentage = 0,
  maxContextTokens = 128000,
  cost = "$0.00",
  inputTokens = 0,
  outputTokens = 0,
  mcpServers = [],
  lspServers = [],
  todos = [],
  modifiedFiles = [],
  agents = [],
  gitBranch,
  gitStatus,
  onToggle,
  onSectionToggle,
  width = 35,
}: SidebarProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState({
    context: true,
    mcp: true,
    lsp: false,
    todo: true,
    files: true,
    agents: true,
    git: true,
  });

  const toggleSection = useCallback((section: keyof typeof expanded) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
    onSectionToggle?.(section);
  }, [onSectionToggle]);

  // Computed stats
  const stats = useMemo(() => ({
    // MCP
    mcpConnected: mcpServers.filter((s) => s.status === "connected").length,
    mcpError: mcpServers.some((s) => s.status === "error"),
    mcpTools: mcpServers.reduce((sum, s) => sum + (s.toolCount || 0), 0),
    // LSP
    lspRunning: lspServers.filter((s) => s.status === "running").length,
    lspErrors: lspServers.reduce((sum, s) => sum + (s.errors || 0), 0),
    lspWarnings: lspServers.reduce((sum, s) => sum + (s.warnings || 0), 0),
    // Todos
    todosCompleted: todos.filter((t) => t.status === "completed").length,
    todosInProgress: todos.filter((t) => t.status === "in_progress").length,
    // Agents
    agentsRunning: agents.filter((a) => ["running", "thinking", "tool_calling"].includes(a.status)).length,
    agentTokens: agents.reduce((sum, a) => sum + (a.tokensUsed || 0), 0),
    // Files
    totalAdditions: modifiedFiles.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: modifiedFiles.reduce((sum, f) => sum + f.deletions, 0),
    // Git
    gitChanges: gitStatus ? gitStatus.staged + gitStatus.modified + gitStatus.untracked : 0,
  }), [mcpServers, lspServers, todos, agents, modifiedFiles, gitStatus]);

  useInput((input, key) => {
    if (!visible) return;
    
    // Number keys to toggle sections
    if (input === "1") toggleSection("context");
    if (input === "2") toggleSection("agents");
    if (input === "3") toggleSection("mcp");
    if (input === "4") toggleSection("lsp");
    if (input === "5") toggleSection("todo");
    if (input === "6") toggleSection("files");
    if (input === "7") toggleSection("git");
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Session Title */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.text} bold>
          [S] {sessionTitle.slice(0, width - 5)}
        </Text>
        {sessionId && (
          <Text color={theme.textMuted} dimColor>
            {sessionId.slice(0, 12)}...
          </Text>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Context Info */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Box flexDirection="column" marginBottom={1}>
        <SectionHeader
          title="Context"
          icon="[X]"
          expanded={expanded.context}
          status={contextPercentage > 90 ? "error" : contextPercentage > 70 ? "warning" : "ok"}
          onToggle={() => toggleSection("context")}
        />
        {expanded.context && (
          <Box flexDirection="column" paddingLeft={2}>
            <ProgressBar progress={contextPercentage} width={width - 10} showPercentage />
            <Box justifyContent="space-between">
              <Text color={theme.textMuted}>{contextTokens.toLocaleString()}</Text>
              <Text color={theme.textMuted}>/ {(maxContextTokens / 1000).toFixed(0)}k</Text>
            </Box>
            <Box justifyContent="space-between">
              <Text color={theme.accent}>↑ {inputTokens.toLocaleString()}</Text>
              <Text color={theme.secondary}>↓ {outputTokens.toLocaleString()}</Text>
            </Box>
            <Box>
              <Text color={theme.warning}>[$] {cost}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Agents */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {agents.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="Agents"
            icon="[A]"
            expanded={expanded.agents}
            count={stats.agentsRunning > 0 ? stats.agentsRunning : agents.length}
            status={stats.agentsRunning > 0 ? "warning" : "ok"}
            onToggle={() => toggleSection("agents")}
          />
          {expanded.agents && (
            <Box flexDirection="column" paddingLeft={2}>
              {agents.slice(0, 6).map((agent) => (
                <AgentItemDisplay key={agent.name} agent={agent} />
              ))}
              {agents.length > 6 && (
                <Text color={theme.textMuted}>+{agents.length - 6} more</Text>
              )}
              {stats.agentTokens > 0 && (
                <Text color={theme.accent}>
                  Σ {(stats.agentTokens / 1000).toFixed(1)}k tokens
                </Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MCP Servers */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mcpServers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="MCP"
            icon="[M]"
            expanded={expanded.mcp}
            count={stats.mcpConnected}
            status={stats.mcpError ? "error" : stats.mcpConnected === mcpServers.length ? "ok" : "warning"}
            onToggle={() => toggleSection("mcp")}
          />
          {expanded.mcp && (
            <Box flexDirection="column" paddingLeft={2}>
              {mcpServers.slice(0, 5).map((server) => (
                <Box key={server.name} gap={1} justifyContent="space-between">
                  <Box gap={1}>
                    <StatusDot status={server.status} />
                    <Text color={theme.text}>{server.name}</Text>
                  </Box>
                  {server.toolCount !== undefined && (
                    <Text color={theme.textMuted}>[T] {server.toolCount}</Text>
                  )}
                </Box>
              ))}
              {mcpServers.length > 5 && (
                <Text color={theme.textMuted}>+{mcpServers.length - 5} more</Text>
              )}
              {stats.mcpTools > 0 && (
                <Text color={theme.accent}>Σ {stats.mcpTools} tools</Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LSP Servers */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {lspServers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="LSP"
            icon="[L]"
            expanded={expanded.lsp}
            count={stats.lspRunning}
            status={stats.lspErrors > 0 ? "error" : stats.lspWarnings > 0 ? "warning" : "ok"}
            onToggle={() => toggleSection("lsp")}
          />
          {expanded.lsp && (
            <Box flexDirection="column" paddingLeft={2}>
              {lspServers.slice(0, 4).map((server) => (
                <Box key={server.name} gap={1} justifyContent="space-between">
                  <Box gap={1}>
                    <StatusDot status={server.status} />
                    <Text color={theme.text}>{server.language}</Text>
                  </Box>
                  <Box gap={1}>
                    {server.errors !== undefined && server.errors > 0 && (
                      <Text color={theme.error}>[-]{server.errors}</Text>
                    )}
                    {server.warnings !== undefined && server.warnings > 0 && (
                      <Text color={theme.warning}>[!]{server.warnings}</Text>
                    )}
                  </Box>
                </Box>
              ))}
              {lspServers.length > 4 && (
                <Text color={theme.textMuted}>+{lspServers.length - 4} more</Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Todo List */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {todos.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="Todo"
            icon="[T]"
            expanded={expanded.todo}
            count={todos.length}
            status={stats.todosInProgress > 0 ? "warning" : "ok"}
            onToggle={() => toggleSection("todo")}
          />
          {expanded.todo && (
            <Box flexDirection="column" paddingLeft={2}>
              {/* Show in-progress first */}
              {todos
                .sort((a, b) => {
                  const order = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
                  return order[a.status] - order[b.status];
                })
                .slice(0, 8)
                .map((todo) => (
                  <TodoItemDisplay key={todo.id} todo={todo} compact />
                ))}
              {todos.length > 8 && (
                <Text color={theme.textMuted}>+{todos.length - 8} more</Text>
              )}
              <Text color={theme.textMuted}>
                {stats.todosCompleted}/{todos.length} done
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Modified Files */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modifiedFiles.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="Files"
            icon="[F]"
            expanded={expanded.files}
            count={modifiedFiles.length}
            onToggle={() => toggleSection("files")}
          />
          {expanded.files && (
            <Box flexDirection="column" paddingLeft={2}>
              {modifiedFiles.slice(0, 6).map((file) => (
                <FileItemDisplay key={file.path} file={file} />
              ))}
              {modifiedFiles.length > 6 && (
                <Text color={theme.textMuted}>+{modifiedFiles.length - 6} more</Text>
              )}
              <Box gap={2}>
                <Text color={theme.success}>+{stats.totalAdditions}</Text>
                <Text color={theme.error}>-{stats.totalDeletions}</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Git Status */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {gitBranch && (
        <Box flexDirection="column" marginBottom={1}>
          <SectionHeader
            title="Git"
            icon="[G]"
            expanded={expanded.git}
            count={stats.gitChanges}
            status={stats.gitChanges > 0 ? "warning" : "ok"}
            onToggle={() => toggleSection("git")}
          />
          {expanded.git && (
            <Box flexDirection="column" paddingLeft={2}>
              <Box gap={1}>
                <Text color={theme.accent}>[B]</Text>
                <Text color={theme.text}>{gitBranch}</Text>
              </Box>
              {gitStatus && (
                <Box gap={2}>
                  {gitStatus.staged > 0 && (
                    <Text color={theme.success}>+{gitStatus.staged}</Text>
                  )}
                  {gitStatus.modified > 0 && (
                    <Text color={theme.warning}>~{gitStatus.modified}</Text>
                  )}
                  {gitStatus.untracked > 0 && (
                    <Text color={theme.error}>?{gitStatus.untracked}</Text>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Footer */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Box flexGrow={1} />
      <Box flexDirection="column" borderStyle="single" borderTop borderColor={theme.border} paddingTop={1}>
        <Box gap={1}>
          <Text color={theme.textMuted}>[D]</Text>
          <Text color={theme.text}>{process.cwd().split("/").pop()}</Text>
        </Box>
        <Box gap={1}>
          <Text color={theme.success}>*</Text>
          <Text color={theme.text} bold>Super</Text>
          <Text color={theme.primary} bold>Code</Text>
          <Text color={theme.textMuted}>v0.3.0</Text>
        </Box>
        <Text color={theme.textMuted} dimColor>
          1-7: toggle sections
        </Text>
      </Box>
    </Box>
  );
}

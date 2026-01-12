import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";

export interface LSPServer {
  id: string;
  name: string;
  language: string;
  status: "running" | "starting" | "stopped" | "error" | "crashed";
  pid?: number;
  version?: string;
  capabilities?: LSPCapabilities;
  diagnostics?: {
    errors: number;
    warnings: number;
    hints: number;
  };
  memory?: number; // MB
  lastActivity?: number;
  error?: string;
}

export interface LSPCapabilities {
  completionProvider?: boolean;
  hoverProvider?: boolean;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentFormattingProvider?: boolean;
  renameProvider?: boolean;
  codeActionProvider?: boolean;
  signatureHelpProvider?: boolean;
  diagnosticProvider?: boolean;
}

interface LSPPanelProps {
  servers: LSPServer[];
  visible?: boolean;
  expanded?: boolean;
  onStart?: (serverId: string) => void;
  onStop?: (serverId: string) => void;
  onRestart?: (serverId: string) => void;
}

// Language icons
const LANGUAGE_ICONS: Record<string, string> = {
  typescript: "📘",
  javascript: "📒",
  python: "🐍",
  rust: "🦀",
  go: "🐹",
  java: "☕",
  c: "🔧",
  cpp: "⚙️",
  csharp: "🎯",
  ruby: "💎",
  php: "🐘",
  swift: "🍎",
  kotlin: "🎨",
  scala: "🔴",
  html: "🌐",
  css: "🎨",
  json: "📋",
  yaml: "📄",
  markdown: "📝",
  default: "📦",
};

// Status indicators
const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  running: { icon: "●", color: "#50fa7b" },
  starting: { icon: "◐", color: "#f1fa8c" },
  stopped: { icon: "○", color: "#6272a4" },
  error: { icon: "✗", color: "#ff5555" },
  crashed: { icon: "💀", color: "#ff5555" },
};

// Capability icons
const CAPABILITY_ICONS: Record<keyof LSPCapabilities, string> = {
  completionProvider: "🔤",
  hoverProvider: "ℹ️",
  definitionProvider: "🔍",
  referencesProvider: "🔗",
  documentFormattingProvider: "📐",
  renameProvider: "✏️",
  codeActionProvider: "💡",
  signatureHelpProvider: "📋",
  diagnosticProvider: "🔬",
};

function formatMemory(bytes?: number): string {
  if (!bytes) return "--";
  return `${bytes.toFixed(0)}MB`;
}

function ServerItem({
  server,
  isSelected,
  isExpanded,
}: {
  server: LSPServer;
  isSelected?: boolean;
  isExpanded?: boolean;
}) {
  const { theme } = useTheme();
  const statusConfig = STATUS_CONFIG[server.status] || STATUS_CONFIG.stopped;
  const langIcon = LANGUAGE_ICONS[server.language.toLowerCase()] || LANGUAGE_ICONS.default;

  // Starting animation
  const [animFrame, setAnimFrame] = useState(0);
  useEffect(() => {
    if (server.status !== "starting") return;
    const interval = setInterval(() => {
      setAnimFrame((prev) => (prev + 1) % 4);
    }, 200);
    return () => clearInterval(interval);
  }, [server.status]);

  const spinChars = ["◐", "◓", "◑", "◒"];
  const statusIcon = server.status === "starting" 
    ? spinChars[animFrame] 
    : statusConfig.icon;

  return (
    <Box flexDirection="column">
      {/* Server header */}
      <Box 
        paddingX={1}
        backgroundColor={isSelected ? theme.selection : undefined}
      >
        <Box flexDirection="row" gap={1}>
          <Text color={statusConfig.color}>{statusIcon}</Text>
          <Text>{langIcon}</Text>
          <Text color={isSelected ? theme.primary : theme.text} bold={isSelected}>
            {server.name}
          </Text>
          {server.version && (
            <Text color={theme.textMuted}>v{server.version}</Text>
          )}
        </Box>
        <Box flexGrow={1} />
        <Box flexDirection="row" gap={2}>
          {/* Diagnostics */}
          {server.diagnostics && (
            <Box flexDirection="row" gap={1}>
              {server.diagnostics.errors > 0 && (
                <Text color={theme.error}>✗{server.diagnostics.errors}</Text>
              )}
              {server.diagnostics.warnings > 0 && (
                <Text color={theme.warning}>⚠{server.diagnostics.warnings}</Text>
              )}
              {server.diagnostics.hints > 0 && (
                <Text color={theme.accent}>💡{server.diagnostics.hints}</Text>
              )}
            </Box>
          )}
          {/* Memory */}
          {server.memory !== undefined && (
            <Text color={theme.textMuted}>{formatMemory(server.memory)}</Text>
          )}
          {/* PID */}
          {server.pid && (
            <Text color={theme.textMuted}>#{server.pid}</Text>
          )}
          <Text color={theme.textMuted}>{isExpanded ? "▼" : "▶"}</Text>
        </Box>
      </Box>

      {/* Error message */}
      {(server.status === "error" || server.status === "crashed") && server.error && (
        <Box paddingLeft={3}>
          <Text color={theme.error}>⚠ {server.error}</Text>
        </Box>
      )}

      {/* Expanded capabilities */}
      {isExpanded && server.status === "running" && server.capabilities && (
        <Box flexDirection="column" paddingLeft={3}>
          <Text color={theme.textMuted} dimColor>Capabilities:</Text>
          <Box flexDirection="row" flexWrap="wrap" gap={1} paddingLeft={1}>
            {Object.entries(server.capabilities)
              .filter(([_, enabled]) => enabled)
              .map(([cap]) => (
                <Text key={cap} color={theme.accent}>
                  {CAPABILITY_ICONS[cap as keyof LSPCapabilities] || "•"}{" "}
                  {cap.replace("Provider", "").replace(/([A-Z])/g, " $1").trim()}
                </Text>
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function LSPPanel({
  servers,
  visible = true,
  expanded = false,
  onStart,
  onStop,
  onRestart,
}: LSPPanelProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // Stats
  const stats = useMemo(() => ({
    total: servers.length,
    running: servers.filter((s) => s.status === "running").length,
    totalErrors: servers.reduce((sum, s) => sum + (s.diagnostics?.errors || 0), 0),
    totalWarnings: servers.reduce((sum, s) => sum + (s.diagnostics?.warnings || 0), 0),
    totalMemory: servers.reduce((sum, s) => sum + (s.memory || 0), 0),
  }), [servers]);

  const toggleExpand = (serverId: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  useInput((input, key) => {
    if (!visible || servers.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(servers.length - 1, prev + 1));
      return;
    }
    if (key.return || input === " ") {
      toggleExpand(servers[selectedIndex].id);
      return;
    }
    if (input === "s") {
      const server = servers[selectedIndex];
      if (server.status === "stopped" || server.status === "error" || server.status === "crashed") {
        onStart?.(server.id);
      }
      return;
    }
    if (input === "x") {
      const server = servers[selectedIndex];
      if (server.status === "running") {
        onStop?.(server.id);
      }
      return;
    }
    if (input === "r") {
      const server = servers[selectedIndex];
      onRestart?.(server.id);
      return;
    }
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1} marginBottom={1}>
        <Text color={theme.text} bold>
          🔧 LSP Servers
        </Text>
        <Box flexDirection="row" gap={2}>
          <Text color={stats.running === stats.total ? theme.success : theme.warning}>
            {stats.running}/{stats.total}
          </Text>
          {stats.totalErrors > 0 && (
            <Text color={theme.error}>✗{stats.totalErrors}</Text>
          )}
          {stats.totalWarnings > 0 && (
            <Text color={theme.warning}>⚠{stats.totalWarnings}</Text>
          )}
          <Text color={theme.textMuted}>{formatMemory(stats.totalMemory)}</Text>
        </Box>
      </Box>

      {/* Server list */}
      {servers.length === 0 ? (
        <Box paddingX={1}>
          <Text color={theme.textMuted}>No LSP servers detected</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={0}>
          {servers.map((server, i) => (
            <ServerItem
              key={server.id}
              server={server}
              isSelected={i === selectedIndex}
              isExpanded={expandedServers.has(server.id)}
            />
          ))}
        </Box>
      )}

      {/* Footer hints */}
      {expanded && servers.length > 0 && (
        <Box marginTop={1} paddingX={1}>
          <Text color={theme.textMuted}>
            <Text color={theme.text}>↑↓</Text> select  
            <Text color={theme.text}> Enter</Text> expand  
            <Text color={theme.text}> s</Text> start  
            <Text color={theme.text}> x</Text> stop  
            <Text color={theme.text}> r</Text> restart
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Compact version for sidebar
export function LSPStatus({ servers }: { servers: LSPServer[] }) {
  const { theme } = useTheme();
  const running = servers.filter((s) => s.status === "running").length;
  const hasError = servers.some((s) => s.status === "error" || s.status === "crashed");
  const totalErrors = servers.reduce((sum, s) => sum + (s.diagnostics?.errors || 0), 0);

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={hasError ? theme.error : running === servers.length ? theme.success : theme.warning}>
        ●
      </Text>
      <Text color={theme.text}>LSP</Text>
      <Text color={theme.textMuted}>({running})</Text>
      {totalErrors > 0 && (
        <Text color={theme.error}>✗{totalErrors}</Text>
      )}
    </Box>
  );
}

export default LSPPanel;

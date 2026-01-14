import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";

export interface MCPServer {
  id: string;
  name: string;
  status: "connected" | "connecting" | "disconnected" | "error" | "disabled";
  type?: "stdio" | "sse" | "websocket";
  version?: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
  lastPing?: number;
  error?: string;
  config?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  };
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: object;
  callCount?: number;
  lastUsed?: number;
}

export interface MCPResource {
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

interface MCPPanelProps {
  servers: MCPServer[];
  visible?: boolean;
  expanded?: boolean;
  onConnect?: (serverId: string) => void;
  onDisconnect?: (serverId: string) => void;
  onSelectTool?: (server: MCPServer, tool: MCPTool) => void;
  onSelectResource?: (server: MCPServer, resource: MCPResource) => void;
}

// Status indicators
const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  connected: { icon: "●", color: "#50fa7b" },
  connecting: { icon: "◐", color: "#f1fa8c" },
  disconnected: { icon: "○", color: "#6272a4" },
  error: { icon: "✗", color: "#ff5555" },
  disabled: { icon: "⊘", color: "#44475a" },
};

function ServerItem({
  server,
  isSelected,
  isExpanded,
  onToggle,
}: {
  server: MCPServer;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const { theme } = useTheme();
  const statusConfig = STATUS_CONFIG[server.status] || STATUS_CONFIG.disconnected;

  // Connection animation
  const [animFrame, setAnimFrame] = useState(0);
  useEffect(() => {
    if (server.status !== "connecting") return;
    const interval = setInterval(() => {
      setAnimFrame((prev) => (prev + 1) % 4);
    }, 200);
    return () => clearInterval(interval);
  }, [server.status]);

  const spinChars = ["◐", "◓", "◑", "◒"];
  const statusIcon = server.status === "connecting" 
    ? spinChars[animFrame] 
    : statusConfig.icon;

  const toolCount = server.tools?.length || 0;
  const resourceCount = server.resources?.length || 0;
  const promptCount = server.prompts?.length || 0;

  return (
    <Box flexDirection="column">
      {/* Server header */}
      <Box 
        paddingX={1}
        backgroundColor={isSelected ? theme.selection : undefined}
      >
        <Box flexDirection="row" gap={1}>
          <Text color={statusConfig.color}>{statusIcon}</Text>
          <Text color={isSelected ? theme.primary : theme.text} bold={isSelected}>
            {server.name}
          </Text>
          {server.version && (
            <Text color={theme.textMuted}>v{server.version}</Text>
          )}
        </Box>
        <Box flexGrow={1} />
        <Box flexDirection="row" gap={2}>
          {toolCount > 0 && (
            <Text color={theme.accent}>🛠️ {toolCount}</Text>
          )}
          {resourceCount > 0 && (
            <Text color={theme.secondary}>📦 {resourceCount}</Text>
          )}
          {promptCount > 0 && (
            <Text color={theme.warning}>💬 {promptCount}</Text>
          )}
          <Text color={theme.textMuted}>{isExpanded ? "▼" : "▶"}</Text>
        </Box>
      </Box>

      {/* Error message */}
      {server.status === "error" && server.error && (
        <Box paddingLeft={3}>
          <Text color={theme.error}>⚠ {server.error}</Text>
        </Box>
      )}

      {/* Expanded details */}
      {isExpanded && server.status === "connected" && (
        <Box flexDirection="column" paddingLeft={3} marginTop={0}>
          {/* Tools */}
          {server.tools && server.tools.length > 0 && (
            <Box flexDirection="column">
              <Text color={theme.textMuted} dimColor>Tools:</Text>
              {server.tools.slice(0, 5).map((tool) => (
                <Box key={tool.name} paddingLeft={1}>
                  <Text color={theme.text}>• {tool.name}</Text>
                  {tool.description && (
                    <Text color={theme.textMuted}> - {tool.description.slice(0, 30)}...</Text>
                  )}
                </Box>
              ))}
              {server.tools.length > 5 && (
                <Box paddingLeft={1}>
                  <Text color={theme.textMuted}>
                    +{server.tools.length - 5} more tools
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Resources */}
          {server.resources && server.resources.length > 0 && (
            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.textMuted} dimColor>Resources:</Text>
              {server.resources.slice(0, 3).map((resource) => (
                <Box key={resource.uri} paddingLeft={1}>
                  <Text color={theme.text}>• {resource.name || resource.uri}</Text>
                </Box>
              ))}
              {server.resources.length > 3 && (
                <Box paddingLeft={1}>
                  <Text color={theme.textMuted}>
                    +{server.resources.length - 3} more
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Connection info */}
          {server.config && (
            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.textMuted} dimColor>
                {server.type === "stdio" && `cmd: ${server.config.command}`}
                {server.type === "sse" && `url: ${server.config.url}`}
                {server.type === "websocket" && `ws: ${server.config.url}`}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export function MCPPanel({
  servers,
  visible = true,
  expanded = false,
  onConnect,
  onDisconnect,
  onSelectTool,
  onSelectResource,
}: MCPPanelProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // Stats
  const stats = useMemo(() => ({
    total: servers.length,
    connected: servers.filter((s) => s.status === "connected").length,
    totalTools: servers.reduce((sum, s) => sum + (s.tools?.length || 0), 0),
    totalResources: servers.reduce((sum, s) => sum + (s.resources?.length || 0), 0),
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
    if (input === "c") {
      const server = servers[selectedIndex];
      if (server.status === "disconnected" || server.status === "error") {
        onConnect?.(server.id);
      }
      return;
    }
    if (input === "d") {
      const server = servers[selectedIndex];
      if (server.status === "connected") {
        onDisconnect?.(server.id);
      }
      return;
    }
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1} marginBottom={1}>
        <Text color={theme.text} bold>
          🔌 MCP Servers
        </Text>
        <Box flexDirection="row" gap={2}>
          <Text color={stats.connected === stats.total ? theme.success : theme.warning}>
            {stats.connected}/{stats.total}
          </Text>
          <Text color={theme.accent}>🛠️ {stats.totalTools}</Text>
          <Text color={theme.secondary}>📦 {stats.totalResources}</Text>
        </Box>
      </Box>

      {/* Server list */}
      {servers.length === 0 ? (
        <Box paddingX={1}>
          <Text color={theme.textMuted}>No MCP servers configured</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={0}>
          {servers.map((server, i) => (
            <ServerItem
              key={server.id}
              server={server}
              isSelected={i === selectedIndex}
              isExpanded={expandedServers.has(server.id)}
              onToggle={() => toggleExpand(server.id)}
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
            <Text color={theme.text}> c</Text> connect  
            <Text color={theme.text}> d</Text> disconnect
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Compact version for sidebar
export function MCPStatus({ servers }: { servers: MCPServer[] }) {
  const { theme } = useTheme();
  const connected = servers.filter((s) => s.status === "connected").length;
  const hasError = servers.some((s) => s.status === "error");

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={hasError ? theme.error : connected === servers.length ? theme.success : theme.warning}>
        ●
      </Text>
      <Text color={theme.text}>MCP</Text>
      <Text color={theme.textMuted}>
        ({connected}/{servers.length})
      </Text>
    </Box>
  );
}

export default MCPPanel;

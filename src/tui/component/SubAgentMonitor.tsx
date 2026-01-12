import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";

export interface SubAgent {
  id: string;
  name: string;
  type: "explorer" | "analyst" | "frontend" | "docwriter" | "executor" | "reviewer" | "librarian" | "multimodal" | "custom";
  status: "idle" | "queued" | "running" | "thinking" | "tool_calling" | "streaming" | "completed" | "error" | "cancelled";
  progress?: number; // 0-100
  currentTask?: string;
  startTime?: number;
  endTime?: number;
  tokensUsed?: { input: number; output: number };
  toolCalls?: number;
  error?: string;
}

interface SubAgentMonitorProps {
  agents: SubAgent[];
  visible?: boolean;
  compact?: boolean;
  onSelectAgent?: (agent: SubAgent) => void;
  onStopAgent?: (agentId: string) => void;
}

// Agent type icons
const AGENT_ICONS: Record<string, string> = {
  explorer: "🔍",
  analyst: "📊",
  frontend: "🎨",
  docwriter: "📝",
  executor: "⚡",
  reviewer: "👀",
  librarian: "📚",
  multimodal: "🖼️",
  custom: "🔧",
};

// Status indicators
const STATUS_CONFIG: Record<string, { icon: string; color: string; animation?: string }> = {
  idle: { icon: "○", color: "#6272a4" },
  queued: { icon: "◷", color: "#f1fa8c" },
  running: { icon: "●", color: "#50fa7b", animation: "pulse" },
  thinking: { icon: "◐", color: "#bd93f9", animation: "spin" },
  tool_calling: { icon: "⚡", color: "#ffb86c", animation: "pulse" },
  streaming: { icon: "▶", color: "#8be9fd", animation: "stream" },
  completed: { icon: "✓", color: "#50fa7b" },
  error: { icon: "✗", color: "#ff5555" },
  cancelled: { icon: "⊘", color: "#6272a4" },
};

function formatDuration(startTime?: number, endTime?: number): string {
  if (!startTime) return "--:--";
  const end = endTime || Date.now();
  const duration = end - startTime;
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTokens(tokens?: { input: number; output: number }): string {
  if (!tokens) return "0";
  return `${((tokens.input + tokens.output) / 1000).toFixed(1)}k`;
}

function ProgressBar({ progress = 0, width = 20 }: { progress: number; width?: number }) {
  const { theme } = useTheme();
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  
  return (
    <Text>
      <Text color={theme.success}>{"█".repeat(filled)}</Text>
      <Text color={theme.textMuted}>{"░".repeat(empty)}</Text>
      <Text color={theme.textMuted}> {progress}%</Text>
    </Text>
  );
}

function AgentRow({ 
  agent, 
  isSelected, 
  compact,
  onStop 
}: { 
  agent: SubAgent; 
  isSelected?: boolean; 
  compact?: boolean;
  onStop?: () => void;
}) {
  const { theme } = useTheme();
  const statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  const icon = AGENT_ICONS[agent.type] || "🤖";

  // Animation effect for running agents
  const [animFrame, setAnimFrame] = useState(0);
  useEffect(() => {
    if (!statusConfig.animation) return;
    const interval = setInterval(() => {
      setAnimFrame((prev) => (prev + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, [statusConfig.animation]);

  const spinChars = ["◐", "◓", "◑", "◒"];
  const statusIcon = statusConfig.animation === "spin" 
    ? spinChars[animFrame] 
    : statusConfig.icon;

  if (compact) {
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={statusConfig.color}>{statusIcon}</Text>
        <Text color={isSelected ? theme.primary : theme.text}>{icon} {agent.name}</Text>
        {agent.status === "running" && agent.progress !== undefined && (
          <Text color={theme.textMuted}>{agent.progress}%</Text>
        )}
      </Box>
    );
  }

  return (
    <Box 
      flexDirection="column" 
      paddingX={1}
      paddingY={0}
      backgroundColor={isSelected ? theme.selection : undefined}
    >
      {/* Header row */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={statusConfig.color}>{statusIcon}</Text>
          <Text color={isSelected ? theme.primary : theme.text} bold>
            {icon} {agent.name}
          </Text>
          <Text color={theme.textMuted}>({agent.type})</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Text color={theme.textMuted}>{formatDuration(agent.startTime, agent.endTime)}</Text>
          <Text color={theme.accent}>{formatTokens(agent.tokensUsed)} tokens</Text>
          {agent.toolCalls !== undefined && (
            <Text color={theme.warning}>{agent.toolCalls} tools</Text>
          )}
        </Box>
      </Box>

      {/* Current task */}
      {agent.currentTask && (
        <Box paddingLeft={2}>
          <Text color={theme.textMuted} wrap="truncate">
            → {agent.currentTask.slice(0, 60)}{agent.currentTask.length > 60 ? "..." : ""}
          </Text>
        </Box>
      )}

      {/* Progress bar for running agents */}
      {agent.status === "running" && agent.progress !== undefined && (
        <Box paddingLeft={2}>
          <ProgressBar progress={agent.progress} width={30} />
        </Box>
      )}

      {/* Error message */}
      {agent.status === "error" && agent.error && (
        <Box paddingLeft={2}>
          <Text color={theme.error}>Error: {agent.error.slice(0, 50)}</Text>
        </Box>
      )}
    </Box>
  );
}

export function SubAgentMonitor({
  agents,
  visible = true,
  compact = false,
  onSelectAgent,
  onStopAgent,
}: SubAgentMonitorProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Stats
  const stats = useMemo(() => {
    return {
      total: agents.length,
      running: agents.filter((a) => ["running", "thinking", "tool_calling", "streaming"].includes(a.status)).length,
      completed: agents.filter((a) => a.status === "completed").length,
      errors: agents.filter((a) => a.status === "error").length,
      totalTokens: agents.reduce((sum, a) => sum + (a.tokensUsed?.input || 0) + (a.tokensUsed?.output || 0), 0),
      totalToolCalls: agents.reduce((sum, a) => sum + (a.toolCalls || 0), 0),
    };
  }, [agents]);

  useInput((input, key) => {
    if (!visible || agents.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(agents.length - 1, prev + 1));
      return;
    }
    if (key.return && onSelectAgent) {
      onSelectAgent(agents[selectedIndex]);
      return;
    }
    if (input === "s" && onStopAgent) {
      const agent = agents[selectedIndex];
      if (agent && ["running", "thinking", "tool_calling", "streaming"].includes(agent.status)) {
        onStopAgent(agent.id);
      }
      return;
    }
  }, { isActive: visible });

  if (!visible) return null;

  if (agents.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color={theme.textMuted}>No active agents</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header with stats */}
      {!compact && (
        <Box flexDirection="row" justifyContent="space-between" paddingX={1} marginBottom={1}>
          <Text color={theme.text} bold>
            🕵️ Agent Monitor
          </Text>
          <Box flexDirection="row" gap={2}>
            <Text color={theme.success}>✓ {stats.completed}</Text>
            <Text color={theme.warning}>● {stats.running}</Text>
            {stats.errors > 0 && <Text color={theme.error}>✗ {stats.errors}</Text>}
            <Text color={theme.textMuted}>Σ {(stats.totalTokens / 1000).toFixed(1)}k</Text>
          </Box>
        </Box>
      )}

      {/* Agent list */}
      <Box flexDirection="column" gap={compact ? 0 : 1}>
        {agents.map((agent, i) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            isSelected={i === selectedIndex}
            compact={compact}
            onStop={() => onStopAgent?.(agent.id)}
          />
        ))}
      </Box>

      {/* Footer hints */}
      {!compact && agents.length > 0 && (
        <Box marginTop={1} paddingX={1}>
          <Text color={theme.textMuted}>
            <Text color={theme.text}>↑↓</Text> select  
            <Text color={theme.text}> s</Text> stop  
            <Text color={theme.text}> Enter</Text> details
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default SubAgentMonitor;

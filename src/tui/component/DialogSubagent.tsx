import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";
import { useSession } from "../context/session";
import type { SubAgentInfo } from "./Sidebar";

interface DialogSubagentProps {
  onCancel?: (agentName: string) => void;
  onClose: () => void;
}

export function DialogSubagent({ onCancel, onClose }: DialogSubagentProps) {
  const { theme } = useTheme();
  const { state, stopAgent } = useSession();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const agents = state.subAgents;

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(agents.length - 1, prev + 1));
      return;
    }

    if (input === "c" || input === "x") {
      const agent = agents[selectedIndex];
      if (agent && isRunning(agent.status)) {
        if (onCancel) {
          onCancel(agent.name);
        } else {
          stopAgent(agent.name);
        }
      }
      return;
    }
  });

  if (agents.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        padding={1}
        width={60}
      >
        <Text bold color={theme.primary}>Background Tasks</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>No background tasks running</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            Press <Text color={theme.text}>Esc</Text> to close
          </Text>
        </Box>
      </Box>
    );
  }

  const runningCount = agents.filter((a) => isRunning(a.status)).length;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      padding={1}
      width={60}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>Background Tasks</Text>
        <Text color={theme.textMuted}>
          {" "}({runningCount} running, {agents.length} total)
        </Text>
      </Box>

      <Box flexDirection="column">
        {agents.map((agent, index) => {
          const isSelected = index === selectedIndex;
          const running = isRunning(agent.status);

          return (
            <Box
              key={agent.name}
              flexDirection="column"
              backgroundColor={isSelected ? theme.selection : undefined}
              paddingX={1}
              marginBottom={1}
            >
              <Box>
                <Box width={2}>
                  <Text color={getStatusColor(agent.status, theme)}>
                    {getStatusIcon(agent.status)}
                  </Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelected ? theme.primary : theme.text} bold>
                    {agent.name}
                  </Text>
                  <Text color={theme.textMuted}> ({agent.type})</Text>
                </Box>
                <Text color={getStatusColor(agent.status, theme)}>
                  {agent.status}
                </Text>
              </Box>

              {agent.progress !== undefined && running && (
                <Box marginLeft={2}>
                  <ProgressBar 
                    progress={agent.progress} 
                    width={40} 
                    theme={theme}
                  />
                  <Text color={theme.textMuted}> {agent.progress}%</Text>
                </Box>
              )}

              {agent.tokensUsed !== undefined && (
                <Box marginLeft={2}>
                  <Text color={theme.textMuted}>
                    {agent.tokensUsed.toLocaleString()} tokens used
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={theme.border}>
        <Text color={theme.textMuted}>
          <Text color={theme.text}>c/x</Text> cancel{" "}
          <Text color={theme.text}>Esc</Text> close
        </Text>
      </Box>
    </Box>
  );
}

interface ProgressBarProps {
  progress: number;
  width: number;
  theme: any;
}

function ProgressBar({ progress, width, theme }: ProgressBarProps) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={theme.success}>{"█".repeat(filled)}</Text>
      <Text color={theme.textMuted}>{"░".repeat(empty)}</Text>
    </Text>
  );
}

function isRunning(status: SubAgentInfo["status"]): boolean {
  return status === "running" || status === "thinking" || status === "tool_calling";
}

function getStatusColor(status: SubAgentInfo["status"], theme: any): string {
  switch (status) {
    case "running":
    case "thinking":
    case "tool_calling":
      return theme.warning || "yellow";
    case "completed":
      return theme.success || "green";
    case "error":
      return theme.error || "red";
    case "idle":
    default:
      return theme.textMuted || "gray";
  }
}

function getStatusIcon(status: SubAgentInfo["status"]): string {
  switch (status) {
    case "running":
    case "thinking":
      return "●";
    case "tool_calling":
      return "⚙";
    case "completed":
      return "✓";
    case "error":
      return "✗";
    case "idle":
    default:
      return "○";
  }
}

export default DialogSubagent;

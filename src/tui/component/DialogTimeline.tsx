import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";
import { useSession, type Message } from "../context/session";

interface TimelineEntry {
  id: string;
  index: number;
  type: "user" | "assistant" | "system" | "tool";
  summary: string;
  timestamp: number;
  tokens?: number;
  cost?: number;
}

interface DialogTimelineProps {
  onFork?: (messageIndex: number) => void;
  onJump?: (messageIndex: number) => void;
  onClose: () => void;
}

export function DialogTimeline({ onFork, onJump, onClose }: DialogTimelineProps) {
  const { theme } = useTheme();
  const { state } = useSession();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const maxVisible = 15;

  const timeline = useMemo<TimelineEntry[]>(() => {
    return state.messages.map((msg, index) => ({
      id: msg.id,
      index,
      type: msg.role,
      summary: summarizeMessage(msg),
      timestamp: msg.timestamp,
      tokens: msg.tokens ? msg.tokens.input + msg.tokens.output : undefined,
      cost: msg.cost,
    }));
  }, [state.messages]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => {
        const next = Math.max(0, prev - 1);
        if (next < scrollOffset) {
          setScrollOffset(next);
        }
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => {
        const next = Math.min(timeline.length - 1, prev + 1);
        if (next >= scrollOffset + maxVisible) {
          setScrollOffset(next - maxVisible + 1);
        }
        return next;
      });
      return;
    }

    if (key.return) {
      const entry = timeline[selectedIndex];
      if (entry && onJump) {
        onJump(entry.index);
        onClose();
      }
      return;
    }

    if (input === "f" && onFork) {
      const entry = timeline[selectedIndex];
      if (entry) {
        onFork(entry.index);
        onClose();
      }
      return;
    }
  });

  if (timeline.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        padding={1}
        width={70}
      >
        <Text bold color={theme.primary}>Session Timeline</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>No messages yet</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            Press <Text color={theme.text}>Esc</Text> to close
          </Text>
        </Box>
      </Box>
    );
  }

  const visibleEntries = timeline.slice(scrollOffset, scrollOffset + maxVisible);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      padding={1}
      width={70}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>Session Timeline</Text>
        <Text color={theme.textMuted}> ({timeline.length} messages)</Text>
      </Box>

      <Box flexDirection="column">
        {visibleEntries.map((entry, visibleIdx) => {
          const actualIndex = scrollOffset + visibleIdx;
          const isSelected = actualIndex === selectedIndex;
          const isFirst = actualIndex === 0;
          const isLast = actualIndex === timeline.length - 1;

          return (
            <Box key={entry.id} flexDirection="row">
              <Box width={3}>
                <Text color={theme.textMuted}>
                  {isFirst ? "┌" : isLast ? "└" : "├"}
                </Text>
              </Box>

              <Box
                flexGrow={1}
                backgroundColor={isSelected ? theme.selection : undefined}
                paddingX={1}
              >
                <Box width={3}>
                  <Text color={getTypeColor(entry.type, theme)}>
                    {getTypeIcon(entry.type)}
                  </Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelected ? theme.primary : theme.text}>
                    {truncate(entry.summary, 40)}
                  </Text>
                </Box>
                {entry.tokens && (
                  <Text color={theme.textMuted}>
                    {entry.tokens.toLocaleString()}t
                  </Text>
                )}
                <Text color={theme.textMuted} dimColor>
                  {" "}{formatTimestamp(entry.timestamp)}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {timeline.length > maxVisible && (
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxVisible, timeline.length)} of {timeline.length}
          </Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={theme.border}>
        <Text color={theme.textMuted}>
          <Text color={theme.text}>Enter</Text> jump{" "}
          {onFork && <><Text color={theme.text}>f</Text> fork{" "}</>}
          <Text color={theme.text}>Esc</Text> close
        </Text>
      </Box>
    </Box>
  );
}

function getTypeColor(type: string, theme: any): string {
  switch (type) {
    case "user": return theme.info || "cyan";
    case "assistant": return theme.success || "green";
    case "tool": return theme.warning || "yellow";
    case "system": return theme.textMuted || "gray";
    default: return theme.text || "white";
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "user": return "U";
    case "assistant": return "A";
    case "tool": return "T";
    case "system": return "S";
    default: return "?";
  }
}

function summarizeMessage(msg: Message): string {
  const content = msg.content || "";
  const firstLine = content.split("\n")[0];
  
  if (msg.role === "tool" && msg.toolCalls && msg.toolCalls.length > 0) {
    return `Tool: ${msg.toolCalls[0].name}`;
  }
  
  return firstLine || `[${msg.role} message]`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default DialogTimeline;

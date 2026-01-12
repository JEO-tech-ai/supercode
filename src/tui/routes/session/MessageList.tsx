import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../context/theme";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  const { theme } = useTheme();

  const isUser = message.role === "user";
  const icon = isUser ? "❯" : "◆";
  const iconColor = isUser ? theme.primary : theme.secondary;
  const textColor = isUser ? theme.text : theme.text;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        <Text color={iconColor}>{icon}</Text>
        <Text color={textColor} wrap="wrap">
          {message.content}
        </Text>
      </Box>
    </Box>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  streamingContent?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  streamingContent,
}: MessageListProps) {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Streaming indicator */}
      {isLoading && streamingContent && (
        <Box gap={1}>
          <Text color={theme.secondary}>◆</Text>
          <Text color={theme.text}>{streamingContent}</Text>
          <Text color={theme.warning}>▌</Text>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && !streamingContent && (
        <Box gap={1}>
          <Text color={theme.secondary}>◆</Text>
          <Text color={theme.textMuted}>Thinking...</Text>
        </Box>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color={theme.textMuted}>
            Type a message to start the conversation
          </Text>
        </Box>
      )}
    </Box>
  );
}

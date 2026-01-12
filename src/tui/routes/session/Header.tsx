import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../context/theme";

interface HeaderProps {
  title?: string;
  model?: string;
  provider?: string;
  status?: "idle" | "thinking" | "streaming" | "error";
}

export function Header({
  title = "New Session",
  model = "unknown",
  provider,
  status = "idle",
}: HeaderProps) {
  const { theme } = useTheme();

  const getStatusIndicator = () => {
    switch (status) {
      case "thinking":
        return { icon: "◐", color: theme.warning };
      case "streaming":
        return { icon: "●", color: theme.success };
      case "error":
        return { icon: "●", color: theme.error };
      default:
        return { icon: "○", color: theme.textMuted };
    }
  };

  const { icon, color } = getStatusIndicator();
  const modelDisplay = provider ? `${provider}/${model}` : model;

  return (
    <Box
      borderStyle="single"
      borderBottom
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.border}
      paddingX={2}
      paddingY={0}
    >
      <Box flexDirection="row" gap={2}>
        <Text color={color}>{icon}</Text>
        <Text color={theme.text} bold>
          {title}
        </Text>
      </Box>
      <Box flexGrow={1} />
      <Text color={theme.textMuted}>{modelDisplay}</Text>
    </Box>
  );
}

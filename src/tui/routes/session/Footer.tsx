import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../context/theme";

interface FooterProps {
  tokenCount?: { input: number; output: number };
}

export function Footer({ tokenCount }: FooterProps) {
  const { theme } = useTheme();

  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.border}
      paddingX={2}
      paddingY={0}
      gap={2}
    >
      <Text color={theme.textMuted}>
        <Text color={theme.text}>ctrl+x</Text> commands
      </Text>
      <Text color={theme.textMuted}>
        <Text color={theme.text}>ctrl+s</Text> sessions
      </Text>
      <Text color={theme.textMuted}>
        <Text color={theme.text}>ctrl+m</Text> models
      </Text>
      <Box flexGrow={1} />
      {tokenCount && (
        <Text color={theme.textMuted}>
          {tokenCount.input}↓ {tokenCount.output}↑
        </Text>
      )}
      <Text color={theme.textMuted}>
        <Text color={theme.text}>?</Text> help
      </Text>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../context/theme";

const LOGO_ART = [
  [`                     `, `            ▄     `],
  [`█▀▀ █░░█ █▀▀█ █▀▀▀ █▀▀█ `, `█▀▀▀ █▀▀█ ░▀█▀░ █▀▀▄`],
  [`▀▀█ █░░█ █░░█ █▀▀▀ █▄▄▀ `, `█░░░ █░░█ ░░█░░ █░░█`],
  [`▀▀▀ ░▀▀▀ █▀▀▀ ▀▀▀▀ ▀░▀▀ `, `▀▀▀▀ ▀▀▀▀ ▀▀▀▀▀ ▀  ▀`],
];

interface LogoProps {
  size?: "small" | "normal";
}

export function Logo({ size = "normal" }: LogoProps) {
  const { theme } = useTheme();

  if (size === "small") {
    return (
      <Box>
        <Text color={theme.primary} bold>
          🪙 SuperCoin
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center">
      {LOGO_ART.map((row, i) => (
        <Box key={i}>
          <Text color={theme.textMuted}>{row[0]}</Text>
          <Text color={theme.primary}>{row[1]}</Text>
        </Box>
      ))}
    </Box>
  );
}

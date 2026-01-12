import React, { type ReactNode } from "react";
import { Box, Text } from "ink";
import { useTheme } from "../context/theme";

interface BorderProps {
  children: ReactNode;
  title?: string;
  variant?: "rounded" | "single" | "double" | "heavy" | "none";
  color?: string;
  focused?: boolean;
  padding?: number;
  width?: number | string;
  height?: number | string;
}

const BORDERS = {
  rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
};

export function Border({
  children,
  title,
  variant = "rounded",
  color,
  focused = false,
  padding = 1,
  width,
  height,
}: BorderProps) {
  const { theme } = useTheme();
  const borderColor = focused ? theme.primary : (color ?? theme.border);

  if (variant === "none") {
    return <Box padding={padding}>{children}</Box>;
  }

  const b = BORDERS[variant];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={padding}
      paddingY={padding > 0 ? Math.ceil(padding / 2) : 0}
      width={width}
      height={height}
    >
      {title && (
        <Box marginTop={-1} marginLeft={1} position="absolute">
          <Text color={theme.textMuted}> {title} </Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

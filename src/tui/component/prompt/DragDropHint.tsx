import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../../context/theme";

interface DragDropHintProps {
  visible?: boolean;
  compact?: boolean;
}

export function DragDropHint({ visible = true, compact = false }: DragDropHintProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  if (compact) {
    return (
      <Box>
        <Text color={theme.textMuted}>
          <Text color={theme.text}>Ctrl+V</Text> paste image | 
          <Text color={theme.text}> path/to/image.png</Text> to attach
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.accent} bold>
        Attach files to your message:
      </Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Box>
          <Text color={theme.text}>1.</Text>
          <Text color={theme.textMuted}> Press </Text>
          <Text color={theme.primary} bold>Ctrl+V</Text>
          <Text color={theme.textMuted}> to paste image from clipboard</Text>
        </Box>
        <Box>
          <Text color={theme.text}>2.</Text>
          <Text color={theme.textMuted}> Type or paste an </Text>
          <Text color={theme.primary}>image file path</Text>
          <Text color={theme.textMuted}> (e.g., ~/screenshot.png)</Text>
        </Box>
        <Box>
          <Text color={theme.text}>3.</Text>
          <Text color={theme.textMuted}> Use </Text>
          <Text color={theme.primary}>@path/to/file</Text>
          <Text color={theme.textMuted}> to reference any file</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.textMuted} dimColor>
          Supported: PNG, JPEG, GIF, WebP, SVG, PDF
        </Text>
      </Box>
    </Box>
  );
}

interface FileDropZoneProps {
  active?: boolean;
  children?: React.ReactNode;
}

export function FileDropZone({ active = false, children }: FileDropZoneProps) {
  const { theme } = useTheme();

  if (!active) {
    return <>{children}</>;
  }

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={theme.primary}
        paddingX={2}
        paddingY={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text color={theme.primary}>
          Paste image path or press Ctrl+V
        </Text>
      </Box>
      {children}
    </Box>
  );
}

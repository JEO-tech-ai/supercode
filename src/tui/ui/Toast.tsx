import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../context/theme";
import { useToast, type ToastOptions } from "../context/toast";

const VARIANT_ICONS = {
  info: "[i]",
  success: "[+]",
  warning: "[!]",
  error: "[-]",
};

interface ToastItemProps {
  toast: ToastOptions & { id: string };
}

function ToastItem({ toast }: ToastItemProps) {
  const { theme } = useTheme();

  const getColor = () => {
    switch (toast.variant) {
      case "success":
        return theme.success;
      case "warning":
        return theme.warning;
      case "error":
        return theme.error;
      default:
        return theme.primary;
    }
  };

  const icon = VARIANT_ICONS[toast.variant ?? "info"];
  const color = getColor();

  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={0}
      flexDirection="row"
      gap={1}
      minWidth={30}
    >
      <Text color={color}>{icon}</Text>
      <Box flexDirection="column">
        {toast.title && (
          <Text color={theme.text} bold>
            {toast.title}
          </Text>
        )}
        <Text color={theme.textMuted}>{toast.message}</Text>
      </Box>
    </Box>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      gap={1}
      position="absolute"
      marginTop={2}
      marginRight={2}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </Box>
  );
}

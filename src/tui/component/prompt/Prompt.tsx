import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../../context/theme";
import { useRoute } from "../../context/route";
import { Border } from "../Border";

interface PromptProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  hint?: React.ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function Prompt({
  placeholder = "Ask anything... (Ctrl+C to exit)",
  onSubmit,
  hint,
  autoFocus = true,
  disabled = false,
}: PromptProps) {
  const { theme } = useTheme();
  const { navigate } = useRoute();
  const [value, setValue] = useState("");
  const { isFocused } = useFocus({ autoFocus, isActive: !disabled });

  const handleSubmit = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      if (onSubmit) {
        onSubmit(trimmed);
      } else {
        // Default: navigate to session
        navigate({
          type: "session",
          sessionID: `session-${Date.now()}`,
        });
      }

      setValue("");
    },
    [onSubmit, navigate]
  );

  return (
    <Border focused={isFocused} padding={1}>
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text color={theme.primary}>❯ </Text>
          {disabled ? (
            <Text color={theme.textMuted}>{placeholder}</Text>
          ) : (
            <TextInput
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              placeholder={placeholder}
              focus={isFocused}
            />
          )}
        </Box>
        {hint && (
          <Box marginTop={1}>
            {hint}
          </Box>
        )}
      </Box>
    </Border>
  );
}

// Simple prompt without border
export function SimplePrompt({
  placeholder = ">",
  onSubmit,
  autoFocus = true,
}: Omit<PromptProps, "hint">) {
  const { theme } = useTheme();
  const [value, setValue] = useState("");
  const { isFocused } = useFocus({ autoFocus });

  const handleSubmit = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      onSubmit?.(trimmed);
      setValue("");
    },
    [onSubmit]
  );

  return (
    <Box>
      <Text color={theme.primary}>{placeholder} </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        focus={isFocused}
      />
    </Box>
  );
}

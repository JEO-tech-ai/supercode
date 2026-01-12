import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../context/theme";
import { useCommand, type Command } from "../context/command";
import { Border } from "../component/Border";

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const { theme } = useTheme();
  const { commands, trigger } = useCommand();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) {
      // Show suggested commands first
      return [
        ...commands.filter((c) => c.suggested),
        ...commands.filter((c) => !c.suggested),
      ];
    }
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      const cat = cmd.category ?? "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    }
    return groups;
  }, [filtered]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const cmd = filtered[selectedIndex];
      if (cmd) {
        cmd.onSelect();
        onClose();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      return;
    }
  });

  // Flatten for index tracking
  let flatIndex = 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      width={60}
      paddingX={1}
    >
      {/* Search input */}
      <Box paddingY={1} borderStyle="single" borderBottom borderColor={theme.border}>
        <Text color={theme.textMuted}>❯ </Text>
        <TextInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSelectedIndex(0);
          }}
          placeholder="Type a command..."
        />
      </Box>

      {/* Command list */}
      <Box flexDirection="column" paddingY={1} height={15} overflow="hidden">
        {Object.entries(grouped).map(([category, cmds]) => (
          <Box key={category} flexDirection="column" marginBottom={1}>
            <Text color={theme.textMuted} dimColor bold>
              {category}
            </Text>
            {cmds.map((cmd) => {
              const isSelected = filtered.indexOf(cmd) === selectedIndex;
              const currentIndex = flatIndex++;

              return (
                <Box
                  key={cmd.id}
                  paddingX={1}
                  backgroundColor={isSelected ? theme.selection : undefined}
                >
                  <Box flexGrow={1}>
                    <Text color={isSelected ? theme.primary : theme.text}>
                      {cmd.title}
                    </Text>
                  </Box>
                  {cmd.keybind && (
                    <Text color={theme.textMuted}>{cmd.keybind}</Text>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}

        {filtered.length === 0 && (
          <Box paddingX={1}>
            <Text color={theme.textMuted}>No commands found</Text>
          </Box>
        )}
      </Box>

      {/* Footer hint */}
      <Box borderStyle="single" borderTop borderColor={theme.border} paddingY={0}>
        <Text color={theme.textMuted}>
          ↑↓ Navigate • Enter Select • Esc Close
        </Text>
      </Box>
    </Box>
  );
}

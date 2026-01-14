import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../context/theme";
import { useStash, formatStashTimestamp, truncateStashInput } from "../context/stash";
import { useFilteredList } from "../hooks/useFilteredList";
import type { StashEntry } from "../context/stash";

interface DialogStashProps {
  onSelect: (entry: StashEntry) => void;
  onClose: () => void;
}

export function DialogStash({ onSelect, onClose }: DialogStashProps) {
  const { theme } = useTheme();
  const stash = useStash();
  const [query, setQuery] = useState("");

  const {
    filtered,
    selectedIndex,
    selectedItem,
    selectNext,
    selectPrevious,
    confirm,
    isEmpty,
  } = useFilteredList({
    items: stash.entries,
    key: (e) => e.id,
    filterKeys: ["input"],
    onSelect: (entry) => {
      if (entry) {
        onSelect(entry);
        stash.remove(entry.id);
        onClose();
      }
    },
    fuzzyMatch: true,
  });

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      confirm();
      return;
    }

    if (key.upArrow) {
      selectPrevious();
      return;
    }

    if (key.downArrow) {
      selectNext();
      return;
    }

    if (key.delete && selectedItem) {
      stash.remove(selectedItem.id);
      return;
    }
  });

  if (stash.count === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        padding={1}
        width={50}
      >
        <Text bold color={theme.primary}>Stashed Prompts</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>No stashed prompts</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            Press <Text color={theme.text}>Esc</Text> to close
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      padding={1}
      width={60}
    >
      <Text bold color={theme.primary}>Stashed Prompts ({stash.count})</Text>
      
      <Box marginTop={1} flexDirection="column">
        {filtered.map((entry, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box
              key={entry.id}
              paddingX={1}
              backgroundColor={isSelected ? theme.selection : undefined}
            >
              <Box flexGrow={1}>
                <Text color={isSelected ? theme.primary : theme.text}>
                  {entry.mode === "shell" && (
                    <Text color={theme.warning}>! </Text>
                  )}
                  {truncateStashInput(entry.input, 40)}
                </Text>
              </Box>
              <Text color={theme.textMuted}>
                {formatStashTimestamp(entry.timestamp)}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={theme.border}>
        <Text color={theme.textMuted}>
          <Text color={theme.text}>Enter</Text> restore{" "}
          <Text color={theme.text}>Del</Text> remove{" "}
          <Text color={theme.text}>Esc</Text> close
        </Text>
      </Box>
    </Box>
  );
}

export default DialogStash;

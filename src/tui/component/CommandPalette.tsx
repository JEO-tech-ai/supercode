import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import {
  useCommand,
  groupCommandsByCategory,
  type CommandOption,
} from "../context/command";
import { useFilteredList, highlightMatches } from "../hooks/useFilteredList";

interface CommandPaletteProps {
  onClose?: () => void;
  width?: number;
  maxHeight?: number;
}

export function CommandPalette({
  onClose,
  width = 60,
  maxHeight = 20,
}: CommandPaletteProps) {
  const command = useCommand();
  const { visible, options, trigger, hide } = command;

  const {
    query,
    setQuery,
    filtered,
    selectedIndex,
    selectedItem,
    selectNext,
    selectPrevious,
    confirm,
    reset,
    isEmpty,
    hasQuery,
  } = useFilteredList({
    items: options.filter((o) => !o.disabled),
    key: (item) => item.id,
    filterKeys: ["title", "description", "slash", "category"],
    groupBy: (item) => item.category || "Other",
    onSelect: (item) => {
      if (item) {
        trigger(item.id, "palette");
        hide();
        reset();
        onClose?.();
      }
    },
    fuzzyMatch: true,
    maxResults: 50,
  });

  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape) {
        hide();
        reset();
        onClose?.();
        return;
      }

      if (key.downArrow || (key.ctrl && input === "n")) {
        selectNext();
        return;
      }

      if (key.upArrow || (key.ctrl && input === "p")) {
        selectPrevious();
        return;
      }

      if (key.return) {
        confirm();
        return;
      }
    },
    { isActive: visible }
  );

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible, reset]);

  if (!visible) return null;

  const grouped = groupCommandsByCategory(filtered);
  const categories = Array.from(grouped.keys());

  let currentIndex = 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      width={width}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text color="blue" bold>
          {"⌘ "}
        </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Type to search commands..."
        />
      </Box>

      <Box flexDirection="column" height={Math.min(maxHeight, filtered.length + categories.length)}>
        {isEmpty ? (
          <Text color="gray" dimColor>
            {hasQuery ? "No commands found" : "Start typing to search..."}
          </Text>
        ) : (
          categories.map((category) => {
            const items = grouped.get(category) || [];
            return (
              <Box key={category} flexDirection="column">
                <Text color="gray" dimColor>
                  {category}
                </Text>
                {items.map((item) => {
                  const isSelected = currentIndex === selectedIndex;
                  const itemIndex = currentIndex;
                  currentIndex++;

                  return (
                    <CommandItem
                      key={item.id}
                      item={item}
                      isSelected={isSelected}
                      query={query}
                    />
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
        <Text color="gray" dimColor>
          {"↑↓ navigate • Enter select • Esc close"}
        </Text>
      </Box>
    </Box>
  );
}

interface CommandItemProps {
  item: CommandOption;
  isSelected: boolean;
  query: string;
}

function CommandItem({ item, isSelected, query }: CommandItemProps) {
  const bgColor = isSelected ? "blue" : undefined;
  const textColor = isSelected ? "white" : undefined;

  return (
    <Box paddingX={1}>
      <Text backgroundColor={bgColor} color={textColor}>
        {item.icon ? `${item.icon} ` : "  "}
        <Text bold={isSelected}>
          {query ? highlightMatches(item.title, query) : item.title}
        </Text>
        {item.keybind && (
          <Text color={isSelected ? "white" : "gray"} dimColor={!isSelected}>
            {` (${item.keybind})`}
          </Text>
        )}
        {item.slash && (
          <Text color={isSelected ? "cyan" : "gray"} dimColor={!isSelected}>
            {` /${item.slash}`}
          </Text>
        )}
      </Text>
    </Box>
  );
}

export function useCommandPaletteKeybind() {
  const command = useCommand();

  useInput((input, key) => {
    if (key.ctrl && input === "x") {
      command.toggle();
    }
  });
}

export default CommandPalette;

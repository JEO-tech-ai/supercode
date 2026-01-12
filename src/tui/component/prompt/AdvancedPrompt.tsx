import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../../context/theme";
import { useRoute } from "../../context/route";
import { useToast } from "../../context/toast";
import { Border } from "../Border";
import { SlashCommandsMenu, useSlashCommands, parseSlashCommand } from "./SlashCommands";
import { FileReferenceMenu, parseReferences, type PromptPart } from "./FileReference";
import { useHistory } from "./History";

interface AdvancedPromptProps {
  sessionId?: string;
  placeholder?: string;
  onSubmit?: (input: string, parts: PromptPart[]) => void;
  hint?: React.ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  agent?: string;
  model?: string;
  provider?: string;
}

type AutocompleteMode = false | "/" | "@";

export function AdvancedPrompt({
  sessionId,
  placeholder = "Ask anything... (/ for commands, @ for files)",
  onSubmit,
  hint,
  autoFocus = true,
  disabled = false,
  agent = "default",
  model = "unknown",
  provider,
}: AdvancedPromptProps) {
  const { theme, themeName } = useTheme();
  const { navigate } = useRoute();
  const toast = useToast();
  const history = useHistory();
  const slashCommands = useSlashCommands(sessionId);
  const { isFocused } = useFocus({ autoFocus, isActive: !disabled });

  const [value, setValue] = useState("");
  const [autocompleteMode, setAutocompleteMode] = useState<AutocompleteMode>(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shellMode, setShellMode] = useState(false);

  // Handle input changes
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);

    // Detect slash command mode
    if (newValue.startsWith("/") && !newValue.includes(" ")) {
      setAutocompleteMode("/");
      setAutocompleteFilter(newValue.slice(1));
      setSelectedIndex(0);
    }
    // Detect file/agent reference mode
    else if (newValue.includes("@")) {
      const lastAt = newValue.lastIndexOf("@");
      const afterAt = newValue.slice(lastAt + 1);
      // Only show if we're right after @ or typing the reference
      if (!afterAt.includes(" ")) {
        setAutocompleteMode("@");
        setAutocompleteFilter(afterAt);
        setSelectedIndex(0);
      } else {
        setAutocompleteMode(false);
      }
    }
    // Shell mode
    else if (newValue === "!" && value === "") {
      setShellMode(true);
      setValue("");
    }
    else {
      setAutocompleteMode(false);
    }
  }, [value]);

  // Handle submit
  const handleSubmit = useCallback((input: string) => {
    if (disabled) return;
    
    const trimmed = input.trim();
    if (!trimmed) return;

    // Exit commands
    if (["exit", "quit", ":q"].includes(trimmed)) {
      process.exit(0);
    }

    // Check for slash command
    const parsed = parseSlashCommand(trimmed);
    if (parsed) {
      const cmd = slashCommands.find(
        (c) => c.name === parsed.command || c.aliases?.includes(parsed.command)
      );
      if (cmd) {
        cmd.onSelect();
        setValue("");
        setAutocompleteMode(false);
        return;
      }
    }

    // Shell mode
    if (shellMode) {
      toast.info(`Shell: ${trimmed}`);
      setValue("");
      setShellMode(false);
      history.add({ input: `!${trimmed}`, sessionId });
      // TODO: Execute shell command
      return;
    }

    // Parse references
    const { parts } = parseReferences(trimmed);

    // Add to history
    history.add({ input: trimmed, sessionId });

    // Call onSubmit
    if (onSubmit) {
      onSubmit(trimmed, parts);
    } else {
      // Default: navigate to session
      navigate({
        type: "session",
        sessionID: sessionId ?? `session-${Date.now()}`,
      });
    }

    setValue("");
    setAutocompleteMode(false);
    history.reset();
  }, [disabled, shellMode, slashCommands, onSubmit, navigate, sessionId, history, toast]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (disabled) return;

    // Escape: close autocomplete or exit shell mode
    if (key.escape) {
      if (autocompleteMode) {
        setAutocompleteMode(false);
        return;
      }
      if (shellMode) {
        setShellMode(false);
        return;
      }
      // Navigate home
      if (sessionId) {
        navigate({ type: "home" });
      }
      return;
    }

    // Arrow keys for history (when not in autocomplete)
    if (!autocompleteMode) {
      if (key.upArrow && value === "") {
        const entry = history.move(-1, value);
        if (entry) {
          setValue(entry.input);
        }
        return;
      }
      if (key.downArrow) {
        const entry = history.move(1, value);
        if (entry) {
          setValue(entry.input);
        }
        return;
      }
    }
  }, { isActive: isFocused });

  // Navigate autocomplete
  const handleNavigate = useCallback((direction: -1 | 1) => {
    setSelectedIndex((prev) => {
      const max = autocompleteMode === "/" 
        ? slashCommands.filter((c) => 
            c.name.includes(autocompleteFilter) ||
            c.aliases?.some((a) => a.includes(autocompleteFilter))
          ).length
        : 20; // Max file results
      const next = prev + direction;
      if (next < 0) return max - 1;
      if (next >= max) return 0;
      return next;
    });
  }, [autocompleteMode, autocompleteFilter, slashCommands]);

  // Handle slash command selection
  const handleSlashSelect = useCallback((cmd: { name: string; onSelect: () => void }) => {
    cmd.onSelect();
    setValue("");
    setAutocompleteMode(false);
  }, []);

  // Handle file reference selection
  const handleFileSelect = useCallback((ref: { displayPath: string }) => {
    const lastAt = value.lastIndexOf("@");
    const newValue = value.slice(0, lastAt) + `@${ref.displayPath} `;
    setValue(newValue);
    setAutocompleteMode(false);
  }, [value]);

  // Determine highlight color
  const highlightColor = shellMode ? theme.primary : theme.accent;
  const modelDisplay = provider ? `${provider}/${model}` : model;

  return (
    <Box flexDirection="column">
      {/* Autocomplete menus */}
      {autocompleteMode === "/" && (
        <SlashCommandsMenu
          visible={true}
          filter={autocompleteFilter}
          onSelect={handleSlashSelect}
          onClose={() => setAutocompleteMode(false)}
          selectedIndex={selectedIndex}
          onNavigate={handleNavigate}
        />
      )}
      {autocompleteMode === "@" && (
        <FileReferenceMenu
          visible={true}
          filter={autocompleteFilter}
          onSelect={handleFileSelect}
          onClose={() => setAutocompleteMode(false)}
          selectedIndex={selectedIndex}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main prompt */}
      <Border focused={isFocused} color={highlightColor}>
        <Box flexDirection="column" gap={1}>
          {/* Input area */}
          <Box>
            <Text color={highlightColor}>
              {shellMode ? "$ " : "❯ "}
            </Text>
            {disabled ? (
              <Text color={theme.textMuted}>{placeholder}</Text>
            ) : (
              <TextInput
                value={value}
                onChange={handleChange}
                onSubmit={handleSubmit}
                placeholder={placeholder}
                focus={isFocused}
              />
            )}
          </Box>

          {/* Status bar */}
          <Box flexDirection="row" gap={2}>
            <Text color={highlightColor}>
              {shellMode ? "Shell" : agent}
            </Text>
            {!shellMode && (
              <Box flexDirection="row" gap={1}>
                <Text color={theme.text}>{model}</Text>
                {provider && (
                  <Text color={theme.textMuted}>{provider}</Text>
                )}
              </Box>
            )}
          </Box>

          {/* Hint */}
          {hint && <Box marginTop={1}>{hint}</Box>}
        </Box>
      </Border>

      {/* Footer hints */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        {shellMode ? (
          <Text color={theme.textMuted}>
            <Text color={theme.text}>esc</Text> exit shell mode
          </Text>
        ) : (
          <>
            <Text color={theme.textMuted}>
              <Text color={theme.text}>/</Text> commands
            </Text>
            <Text color={theme.textMuted}>
              <Text color={theme.text}>@</Text> files/agents
            </Text>
            <Text color={theme.textMuted}>
              <Text color={theme.text}>!</Text> shell
            </Text>
            {history.entries.length > 0 && (
              <Text color={theme.textMuted}>
                <Text color={theme.text}>↑↓</Text> history
              </Text>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

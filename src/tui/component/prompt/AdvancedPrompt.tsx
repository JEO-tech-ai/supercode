import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import TextInput from "ink-text-input";
import { useTheme } from "../../context/theme";
import { useRoute } from "../../context/route";
import { useToast } from "../../context/toast";
import { Border } from "../Border";
import { SlashCommandsMenu, useSlashCommands, parseSlashCommand } from "./SlashCommands";
import { FileReferenceMenu, parseReferences, type PromptPart, type FileReference, type AgentReference } from "./FileReference";
import { useHistory } from "./History";
import { ImageAttachmentBar, ImagePasteHint } from "./ImageIndicator";
import { useClipboard, isSupportedFilePath, createImageAttachment, readFileFromPath, type ImageAttachment } from "../../hooks/useClipboard";

interface AdvancedPromptProps {
  sessionId?: string;
  placeholder?: string;
  onSubmit?: (input: string, parts: PromptPart[], attachments?: ImageAttachment[]) => void;
  hint?: React.ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  agent?: string;
  model?: string;
  provider?: string;
  enableImagePaste?: boolean;
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
  enableImagePaste = true,
}: AdvancedPromptProps) {
  const { theme, themeName } = useTheme();
  const { navigate } = useRoute();
  const toast = useToast();
  const history = useHistory();
  const slashCommands = useSlashCommands(sessionId);
  const clipboard = useClipboard();
  const { isFocused } = useFocus({ autoFocus, isActive: !disabled });

  const [value, setValue] = useState("");
  const [autocompleteMode, setAutocompleteMode] = useState<AutocompleteMode>(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shellMode, setShellMode] = useState(false);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [attachmentSelectedIndex, setAttachmentSelectedIndex] = useState(-1);
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);

  const handleImagePaste = useCallback(async () => {
    if (!enableImagePaste || isProcessingPaste) return;

    setIsProcessingPaste(true);
    try {
      const content = await clipboard.read();
      if (content?.type === "image") {
        const attachment = createImageAttachment(content);
        if (attachment) {
          setAttachments((prev) => [...prev, attachment]);
          toast.success(`Image attached: ${attachment.filename}`);
        }
      }
    } catch {
      toast.error("Failed to read clipboard");
    } finally {
      setIsProcessingPaste(false);
    }
  }, [enableImagePaste, isProcessingPaste, clipboard, toast]);

  const handleFilePathPaste = useCallback(
    async (path: string) => {
      if (!enableImagePaste) return false;

      const content = await readFileFromPath(path);
      if (content) {
        const attachment = createImageAttachment(content);
        if (attachment) {
          setAttachments((prev) => [...prev, attachment]);
          const fileType = content.mime === "application/pdf" ? "PDF" : "Image";
          toast.success(`${fileType} attached: ${attachment.filename}`);
          return true;
        }
      }
      return false;
    },
    [enableImagePaste, toast]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setAttachmentSelectedIndex(-1);
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setAttachmentSelectedIndex(-1);
  }, []);

  const handleChange = useCallback(
    async (newValue: string) => {
      if (enableImagePaste && isSupportedFilePath(newValue.trim())) {
        const handled = await handleFilePathPaste(newValue.trim());
        if (handled) {
          setValue("");
          return;
        }
      }

      setValue(newValue);

      if (newValue.startsWith("/") && !newValue.includes(" ")) {
        setAutocompleteMode("/");
        setAutocompleteFilter(newValue.slice(1));
        setSelectedIndex(0);
      } else if (newValue.includes("@")) {
        const lastAt = newValue.lastIndexOf("@");
        const afterAt = newValue.slice(lastAt + 1);
        if (!afterAt.includes(" ")) {
          setAutocompleteMode("@");
          setAutocompleteFilter(afterAt);
          setSelectedIndex(0);
        } else {
          setAutocompleteMode(false);
        }
      } else if (newValue === "!" && value === "") {
        setShellMode(true);
        setValue("");
      } else {
        setAutocompleteMode(false);
      }
    },
    [value, enableImagePaste, handleFilePathPaste]
  );

  const handleSubmit = useCallback(
    (input: string) => {
      if (disabled) return;

      const trimmed = input.trim();
      if (!trimmed && attachments.length === 0) return;

      if (["exit", "quit", ":q"].includes(trimmed)) {
        process.exit(0);
      }

      const parsed = parseSlashCommand(trimmed);
      if (parsed) {
        const cmd = slashCommands.find(
          (c) => c.name === parsed.command || c.aliases?.includes(parsed.command)
        );
        if (cmd) {
          cmd.onSelect();
          setValue("");
          setAutocompleteMode(false);
          clearAttachments();
          return;
        }
      }

      if (shellMode) {
        toast.info(`Shell: ${trimmed}`);
        setValue("");
        setShellMode(false);
        history.add({ input: `!${trimmed}`, sessionId });
        clearAttachments();
        return;
      }

      const { parts } = parseReferences(trimmed);

      history.add({ input: trimmed, sessionId });

      if (onSubmit) {
        onSubmit(trimmed, parts, attachments.length > 0 ? attachments : undefined);
      } else {
        navigate({
          type: "session",
          sessionID: sessionId ?? `session-${Date.now()}`,
        });
      }

      setValue("");
      setAutocompleteMode(false);
      clearAttachments();
      history.reset();
    },
    [disabled, shellMode, slashCommands, onSubmit, navigate, sessionId, history, toast, attachments, clearAttachments]
  );

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.ctrl && input === "v" && enableImagePaste) {
        handleImagePaste();
        return;
      }

      if (key.escape) {
        if (attachmentSelectedIndex >= 0) {
          setAttachmentSelectedIndex(-1);
          return;
        }
        if (autocompleteMode) {
          setAutocompleteMode(false);
          return;
        }
        if (shellMode) {
          setShellMode(false);
          return;
        }
        if (sessionId) {
          navigate({ type: "home" });
        }
        return;
      }

      if (attachments.length > 0 && key.ctrl && input === "a") {
        setAttachmentSelectedIndex((prev) => (prev === -1 ? 0 : -1));
        return;
      }

      if (attachmentSelectedIndex >= 0) {
        if (key.leftArrow) {
          setAttachmentSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (key.rightArrow) {
          setAttachmentSelectedIndex((prev) => Math.min(attachments.length - 1, prev + 1));
          return;
        }
        if (key.delete || key.backspace || input === "x") {
          removeAttachment(attachments[attachmentSelectedIndex].id);
          return;
        }
      }

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
    },
    { isActive: isFocused }
  );

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

  const handleFileSelect = useCallback(
    (ref: FileReference | AgentReference) => {
      const lastAt = value.lastIndexOf("@");
      const displayPath = ref.type === "agent" ? ref.name : ref.displayPath;
      const newValue = value.slice(0, lastAt) + `@${displayPath} `;
      setValue(newValue);
      setAutocompleteMode(false);
    },
    [value]
  );

  // Determine highlight color
  const highlightColor = shellMode ? theme.primary : theme.accent;
  const modelDisplay = provider ? `${provider}/${model}` : model;

  return (
    <Box flexDirection="column">
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

      {enableImagePaste && attachments.length > 0 && (
        <Box marginBottom={1}>
          <ImageAttachmentBar
            attachments={attachments}
            selectedIndex={attachmentSelectedIndex}
            onRemove={removeAttachment}
          />
        </Box>
      )}

      <Border focused={isFocused} color={highlightColor}>
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color={highlightColor}>{shellMode ? "$ " : "❯ "}</Text>
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
            {isProcessingPaste && (
              <Text color={theme.textMuted}> (pasting...)</Text>
            )}
          </Box>

          <Box flexDirection="row" gap={2}>
            <Text color={highlightColor}>{shellMode ? "Shell" : agent}</Text>
            {!shellMode && (
              <Box flexDirection="row" gap={1}>
                <Text color={theme.text}>{model}</Text>
                {provider && <Text color={theme.textMuted}>{provider}</Text>}
              </Box>
            )}
          </Box>

          {hint && <Box marginTop={1}>{hint}</Box>}
        </Box>
      </Border>

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
            {enableImagePaste && (
              <Text color={theme.textMuted}>
                <Text color={theme.text}>Ctrl+V</Text> paste image
              </Text>
            )}
            {history.entries.length > 0 && (
              <Text color={theme.textMuted}>
                <Text color={theme.text}>↑↓</Text> history
              </Text>
            )}
            {attachments.length > 0 && (
              <Text color={theme.textMuted}>
                <Text color={theme.text}>Ctrl+A</Text> select attachments
              </Text>
            )}
          </>
        )}
      </Box>

      {enableImagePaste && !shellMode && attachments.length === 0 && clipboard.hasImage && (
        <Box marginTop={1}>
          <ImagePasteHint hasClipboardImage={true} />
        </Box>
      )}
    </Box>
  );
}

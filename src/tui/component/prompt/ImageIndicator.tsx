import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../context/theme";
import type { ImageAttachment } from "../../hooks/useClipboard";
import { formatBytes, getBase64Size } from "../../hooks/useClipboard";

interface ImageIndicatorProps {
  attachment: ImageAttachment;
  index: number;
  selected?: boolean;
  onRemove?: () => void;
}

export function ImageIndicator({ attachment, index, selected = false, onRemove }: ImageIndicatorProps) {
  const { theme } = useTheme();

  const truncatedName =
    attachment.filename.length > 12 ? `${attachment.filename.slice(0, 9)}...` : attachment.filename;

  const base64Data = attachment.dataUrl.split(",")[1] || "";
  const sizeStr = formatBytes(getBase64Size(base64Data));

  return (
    <Box>
      <Text color={selected ? theme.accent : theme.primary}>[</Text>
      <Text color={selected ? theme.accent : "cyan"}>Image {index}</Text>
      <Text color={theme.textMuted}>: {truncatedName}</Text>
      <Text color={theme.textMuted} dimColor>
        {" "}
        ({sizeStr})
      </Text>
      <Text color={selected ? theme.accent : theme.primary}>]</Text>
      {onRemove && selected && (
        <Text color={theme.error}> [x]</Text>
      )}
    </Box>
  );
}

interface ImageAttachmentBarProps {
  attachments: ImageAttachment[];
  selectedIndex?: number;
  onRemove?: (id: string) => void;
  onSelect?: (index: number) => void;
}

export function ImageAttachmentBar({
  attachments,
  selectedIndex = -1,
  onRemove,
  onSelect,
}: ImageAttachmentBarProps) {
  const { theme } = useTheme();

  if (attachments.length === 0) return null;

  return (
    <Box flexDirection="row" gap={1} flexWrap="wrap">
      {attachments.map((attachment, i) => (
        <ImageIndicator
          key={attachment.id}
          attachment={attachment}
          index={i + 1}
          selected={i === selectedIndex}
          onRemove={onRemove ? () => onRemove(attachment.id) : undefined}
        />
      ))}
      {attachments.length > 0 && (
        <Text color={theme.textMuted} dimColor>
          {attachments.length} file{attachments.length > 1 ? "s" : ""} attached
        </Text>
      )}
    </Box>
  );
}

interface ImagePasteHintProps {
  hasClipboardImage?: boolean;
  visible?: boolean;
}

export function ImagePasteHint({ hasClipboardImage = false, visible = true }: ImagePasteHintProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Box>
      {hasClipboardImage ? (
        <Text color={theme.success}>
          Image detected in clipboard - press <Text bold>Ctrl+V</Text> to attach
        </Text>
      ) : (
        <Text color={theme.textMuted}>
          Paste image path or <Text color={theme.text}>Ctrl+V</Text> to attach from clipboard
        </Text>
      )}
    </Box>
  );
}

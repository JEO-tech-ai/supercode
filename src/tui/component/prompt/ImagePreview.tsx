import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../context/theme";
import type { ImageAttachment } from "../../hooks/useClipboard";
import { formatBytes, getBase64Size } from "../../hooks/useClipboard";

interface ImagePreviewDialogProps {
  attachment: ImageAttachment | null;
  onClose: () => void;
  onCopyPath?: () => void;
  onOpenExternal?: () => void;
}

export function ImagePreviewDialog({
  attachment,
  onClose,
  onCopyPath,
  onOpenExternal,
}: ImagePreviewDialogProps) {
  const { theme } = useTheme();

  useInput(
    (input, key) => {
      if (key.escape || input === "q") {
        onClose();
        return;
      }
      if (input === "c" && onCopyPath) {
        onCopyPath();
        return;
      }
      if (input === "o" && onOpenExternal) {
        onOpenExternal();
        return;
      }
    },
    { isActive: !!attachment }
  );

  if (!attachment) return null;

  const base64Data = attachment.dataUrl.split(",")[1] || "";
  const size = getBase64Size(base64Data);
  const isImage = attachment.mime.startsWith("image/");
  const isPdf = attachment.mime === "application/pdf";

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.primary}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={theme.accent} bold>
          {isImage ? "Image" : isPdf ? "PDF" : "File"} Preview
        </Text>
        <Text color={theme.textMuted}>[q] close</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box>
          <Text color={theme.text}>Filename: </Text>
          <Text color={theme.primary}>{attachment.filename}</Text>
        </Box>
        <Box>
          <Text color={theme.text}>Type: </Text>
          <Text color={theme.textMuted}>{attachment.mime}</Text>
        </Box>
        <Box>
          <Text color={theme.text}>Size: </Text>
          <Text color={theme.textMuted}>{formatBytes(size)}</Text>
        </Box>
        <Box>
          <Text color={theme.text}>ID: </Text>
          <Text color={theme.textMuted} dimColor>
            {attachment.id.slice(0, 8)}...
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.textMuted}>
          Note: Terminal cannot display images inline.
        </Text>
        {isImage && (
          <Text color={theme.textMuted}>
            The image will be sent to the AI model for analysis.
          </Text>
        )}
      </Box>

      <Box marginTop={1} gap={2}>
        {onCopyPath && (
          <Text color={theme.textMuted}>
            <Text color={theme.text}>[c]</Text> copy path
          </Text>
        )}
        {onOpenExternal && (
          <Text color={theme.textMuted}>
            <Text color={theme.text}>[o]</Text> open in viewer
          </Text>
        )}
      </Box>
    </Box>
  );
}

interface AttachmentDetailsProps {
  attachment: ImageAttachment;
  compact?: boolean;
}

export function AttachmentDetails({ attachment, compact = false }: AttachmentDetailsProps) {
  const { theme } = useTheme();

  const base64Data = attachment.dataUrl.split(",")[1] || "";
  const size = getBase64Size(base64Data);
  const isImage = attachment.mime.startsWith("image/");
  const isPdf = attachment.mime === "application/pdf";

  const icon = isImage ? "🖼️" : isPdf ? "📄" : "📁";

  if (compact) {
    return (
      <Box>
        <Text>{icon} </Text>
        <Text color={theme.text}>{attachment.filename}</Text>
        <Text color={theme.textMuted}> ({formatBytes(size)})</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text>{icon} </Text>
        <Text color={theme.primary} bold>
          {attachment.filename}
        </Text>
      </Box>
      <Box paddingLeft={3}>
        <Text color={theme.textMuted}>
          {attachment.mime} • {formatBytes(size)}
        </Text>
      </Box>
    </Box>
  );
}

interface AttachmentListProps {
  attachments: ImageAttachment[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  compact?: boolean;
}

export function AttachmentList({
  attachments,
  selectedIndex = -1,
  onSelect,
  compact = false,
}: AttachmentListProps) {
  const { theme } = useTheme();

  if (attachments.length === 0) return null;

  return (
    <Box flexDirection="column">
      <Text color={theme.textMuted} dimColor>
        Attachments ({attachments.length}):
      </Text>
      <Box flexDirection={compact ? "row" : "column"} gap={compact ? 1 : 0} flexWrap="wrap">
        {attachments.map((attachment, index) => (
          <Box
            key={attachment.id}
            backgroundColor={index === selectedIndex ? theme.selection : undefined}
            paddingX={compact ? 0 : 1}
          >
            <AttachmentDetails attachment={attachment} compact={compact} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

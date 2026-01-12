import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../../context/theme";
import { useRoute } from "../../context/route";
import { useToast } from "../../context/toast";
import { useCommand } from "../../context/command";

export interface SlashCommand {
  name: string;
  aliases?: string[];
  description: string;
  category?: "session" | "navigation" | "system" | "agent";
  disabled?: boolean;
  onSelect: () => void;
}

interface SlashCommandsProps {
  visible: boolean;
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
  onNavigate: (direction: -1 | 1) => void;
}

export function useSlashCommands(sessionId?: string) {
  const { navigate } = useRoute();
  const toast = useToast();
  const { openPalette, trigger } = useCommand();

  const commands: SlashCommand[] = useMemo(() => {
    const baseCommands: SlashCommand[] = [
      // Session commands
      {
        name: "new",
        aliases: ["clear"],
        description: "Create a new session",
        category: "session",
        onSelect: () => navigate({ type: "home" }),
      },
      {
        name: "session",
        aliases: ["resume", "continue"],
        description: "List and switch sessions",
        category: "session",
        onSelect: () => trigger("session.list"),
      },
      
      // Navigation commands
      {
        name: "models",
        description: "Switch AI model",
        category: "navigation",
        onSelect: () => trigger("model.list"),
      },
      {
        name: "agents",
        description: "Switch agent",
        category: "navigation",
        onSelect: () => trigger("agent.list"),
      },
      {
        name: "theme",
        description: "Switch theme",
        category: "navigation",
        onSelect: () => trigger("theme.list"),
      },
      
      // System commands
      {
        name: "status",
        description: "Show system status",
        category: "system",
        onSelect: () => trigger("status.view"),
      },
      {
        name: "help",
        description: "Show help",
        category: "system",
        onSelect: () => trigger("help.show"),
      },
      {
        name: "commands",
        description: "Show all commands",
        category: "system",
        onSelect: () => openPalette(),
      },
      {
        name: "config",
        description: "Edit configuration",
        category: "system",
        onSelect: () => toast.info("Config editor coming soon"),
      },
      {
        name: "exit",
        aliases: ["quit", "q"],
        description: "Exit the app",
        category: "system",
        onSelect: () => process.exit(0),
      },
    ];

    // Session-specific commands (only when in a session)
    if (sessionId) {
      baseCommands.unshift(
        {
          name: "undo",
          description: "Undo the last message",
          category: "session",
          onSelect: () => trigger("session.undo"),
        },
        {
          name: "redo",
          description: "Redo the last message",
          category: "session",
          onSelect: () => trigger("session.redo"),
        },
        {
          name: "rename",
          description: "Rename this session",
          category: "session",
          onSelect: () => trigger("session.rename"),
        },
        {
          name: "copy",
          description: "Copy session transcript",
          category: "session",
          onSelect: () => trigger("session.copy"),
        },
        {
          name: "export",
          description: "Export session to file",
          category: "session",
          onSelect: () => trigger("session.export"),
        },
        {
          name: "timeline",
          description: "Jump to message in timeline",
          category: "session",
          onSelect: () => trigger("session.timeline"),
        },
        {
          name: "fork",
          description: "Fork from current message",
          category: "session",
          onSelect: () => trigger("session.fork"),
        },
      );
    }

    return baseCommands;
  }, [sessionId, navigate, toast, openPalette, trigger]);

  return commands;
}

export function SlashCommandsMenu({
  visible,
  filter,
  onSelect,
  onClose,
  selectedIndex,
  onNavigate,
}: SlashCommandsProps) {
  const { theme } = useTheme();
  const commands = useSlashCommands();

  const filtered = useMemo(() => {
    if (!filter) return commands;
    const q = filter.toLowerCase();
    return commands.filter((cmd) => {
      if (cmd.name.toLowerCase().includes(q)) return true;
      if (cmd.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [commands, filter]);

  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const cmd = filtered[selectedIndex];
      if (cmd) {
        onSelect(cmd);
      }
      return;
    }

    if (key.upArrow) {
      onNavigate(-1);
      return;
    }

    if (key.downArrow) {
      onNavigate(1);
      return;
    }
  }, { isActive: visible });

  if (!visible || filtered.length === 0) return null;

  // Find max command name length for alignment
  const maxNameLen = Math.max(...filtered.map((c) => c.name.length));

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      marginBottom={1}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.textMuted}>Slash Commands</Text>
      </Box>
      {filtered.slice(0, 10).map((cmd, i) => (
        <Box
          key={cmd.name}
          paddingX={1}
          backgroundColor={i === selectedIndex ? theme.selection : undefined}
        >
          <Text
            color={i === selectedIndex ? theme.primary : theme.text}
          >
            /{cmd.name.padEnd(maxNameLen + 2)}
          </Text>
          <Text color={theme.textMuted}>{cmd.description}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color={theme.textMuted}>
          ↑↓ Navigate • Enter Select • Esc Close
        </Text>
      </Box>
    </Box>
  );
}

export function parseSlashCommand(input: string): { command: string; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  
  const [command, ...argParts] = trimmed.slice(1).split(/\s+/);
  return {
    command: command.toLowerCase(),
    args: argParts.join(" "),
  };
}

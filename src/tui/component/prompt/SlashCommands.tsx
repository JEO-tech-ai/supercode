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
  category?: "session" | "navigation" | "system" | "agent" | "mcp" | "git" | "context" | "debug";
  disabled?: boolean;
  icon?: string;
  keybind?: string;
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
      // ═══════════════════════════════════════════════════════════
      // SESSION COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "new",
        aliases: ["clear", "reset"],
        description: "Create a new session",
        category: "session",
        icon: "✨",
        onSelect: () => navigate({ type: "home" }),
      },
      {
        name: "session",
        aliases: ["resume", "continue", "list"],
        description: "List and switch sessions",
        category: "session",
        icon: "📋",
        onSelect: () => trigger("session.list"),
      },
      
      // ═══════════════════════════════════════════════════════════
      // NAVIGATION COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "models",
        aliases: ["model", "m"],
        description: "Switch AI model",
        category: "navigation",
        icon: "🤖",
        onSelect: () => trigger("model.list"),
      },
      {
        name: "agents",
        aliases: ["agent", "a"],
        description: "Switch or spawn agent",
        category: "navigation",
        icon: "🕵️",
        onSelect: () => trigger("agent.list"),
      },
      {
        name: "theme",
        aliases: ["themes", "t"],
        description: "Switch theme (catppuccin, dracula, nord, tokyo, monokai)",
        category: "navigation",
        icon: "🎨",
        onSelect: () => trigger("theme.list"),
      },
      {
        name: "provider",
        aliases: ["providers", "p"],
        description: "Switch AI provider",
        category: "navigation",
        icon: "☁️",
        onSelect: () => trigger("provider.list"),
      },

      // ═══════════════════════════════════════════════════════════
      // MCP COMMANDS (Model Context Protocol)
      // ═══════════════════════════════════════════════════════════
      {
        name: "mcp",
        aliases: ["servers"],
        description: "Show MCP servers status",
        category: "mcp",
        icon: "🔌",
        onSelect: () => trigger("mcp.status"),
      },
      {
        name: "mcp:connect",
        aliases: ["connect"],
        description: "Connect to MCP server",
        category: "mcp",
        icon: "🔗",
        onSelect: () => trigger("mcp.connect"),
      },
      {
        name: "mcp:disconnect",
        aliases: ["disconnect"],
        description: "Disconnect MCP server",
        category: "mcp",
        icon: "🔓",
        onSelect: () => trigger("mcp.disconnect"),
      },
      {
        name: "mcp:tools",
        aliases: ["tools"],
        description: "List available MCP tools",
        category: "mcp",
        icon: "🛠️",
        onSelect: () => trigger("mcp.tools"),
      },
      {
        name: "mcp:resources",
        aliases: ["resources"],
        description: "List MCP resources",
        category: "mcp",
        icon: "📦",
        onSelect: () => trigger("mcp.resources"),
      },

      // ═══════════════════════════════════════════════════════════
      // GIT COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "diff",
        aliases: ["changes", "d"],
        description: "Show git diff of changes",
        category: "git",
        icon: "📝",
        onSelect: () => trigger("git.diff"),
      },
      {
        name: "commit",
        aliases: ["ci"],
        description: "Commit staged changes",
        category: "git",
        icon: "💾",
        onSelect: () => trigger("git.commit"),
      },
      {
        name: "status",
        aliases: ["st"],
        description: "Show git status",
        category: "git",
        icon: "📊",
        onSelect: () => trigger("git.status"),
      },
      {
        name: "log",
        description: "Show git log",
        category: "git",
        icon: "📜",
        onSelect: () => trigger("git.log"),
      },
      {
        name: "branch",
        aliases: ["br"],
        description: "Switch or create branch",
        category: "git",
        icon: "🌿",
        onSelect: () => trigger("git.branch"),
      },
      {
        name: "pr",
        aliases: ["pull-request"],
        description: "Create pull request",
        category: "git",
        icon: "🔀",
        onSelect: () => trigger("git.pr"),
      },

      // ═══════════════════════════════════════════════════════════
      // CONTEXT COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "compact",
        aliases: ["compress", "summarize"],
        description: "Compact/compress context window",
        category: "context",
        icon: "📦",
        onSelect: () => trigger("context.compact"),
      },
      {
        name: "context",
        aliases: ["ctx"],
        description: "View context usage and history",
        category: "context",
        icon: "📊",
        onSelect: () => trigger("context.view"),
      },
      {
        name: "cost",
        aliases: ["usage", "tokens"],
        description: "Show token usage and cost",
        category: "context",
        icon: "💰",
        onSelect: () => trigger("context.cost"),
      },
      {
        name: "plan",
        aliases: ["todo", "tasks"],
        description: "View/edit task plan",
        category: "context",
        icon: "📋",
        onSelect: () => trigger("context.plan"),
      },
      {
        name: "files",
        aliases: ["modified", "changed"],
        description: "Show modified files",
        category: "context",
        icon: "📁",
        onSelect: () => trigger("context.files"),
      },

      // ═══════════════════════════════════════════════════════════
      // AGENT COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "spawn",
        aliases: ["run"],
        description: "Spawn a sub-agent",
        category: "agent",
        icon: "🚀",
        onSelect: () => trigger("agent.spawn"),
      },
      {
        name: "monitor",
        aliases: ["watch"],
        description: "Monitor running agents",
        category: "agent",
        icon: "👁️",
        onSelect: () => trigger("agent.monitor"),
      },
      {
        name: "stop",
        aliases: ["kill", "abort"],
        description: "Stop running agent",
        category: "agent",
        icon: "🛑",
        onSelect: () => trigger("agent.stop"),
      },

      // ═══════════════════════════════════════════════════════════
      // DEBUG COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "bug",
        aliases: ["report", "issue"],
        description: "Report a bug",
        category: "debug",
        icon: "🐛",
        onSelect: () => trigger("debug.bug"),
      },
      {
        name: "doctor",
        aliases: ["health", "check"],
        description: "Run diagnostics",
        category: "debug",
        icon: "🏥",
        onSelect: () => trigger("debug.doctor"),
      },
      {
        name: "logs",
        aliases: ["log"],
        description: "View logs",
        category: "debug",
        icon: "📜",
        onSelect: () => trigger("debug.logs"),
      },
      {
        name: "version",
        aliases: ["v"],
        description: "Show version info",
        category: "debug",
        icon: "ℹ️",
        onSelect: () => trigger("debug.version"),
      },

      // ═══════════════════════════════════════════════════════════
      // SYSTEM COMMANDS
      // ═══════════════════════════════════════════════════════════
      {
        name: "help",
        aliases: ["h", "?"],
        description: "Show help",
        category: "system",
        icon: "❓",
        keybind: "ctrl+h",
        onSelect: () => trigger("help.show"),
      },
      {
        name: "commands",
        aliases: ["cmd", "palette"],
        description: "Show all commands",
        category: "system",
        icon: "⌨️",
        keybind: "ctrl+x",
        onSelect: () => openPalette(),
      },
      {
        name: "config",
        aliases: ["settings", "prefs"],
        description: "Edit configuration",
        category: "system",
        icon: "⚙️",
        onSelect: () => trigger("config.edit"),
      },
      {
        name: "lsp",
        description: "Show LSP servers status",
        category: "system",
        icon: "🔧",
        onSelect: () => trigger("lsp.status"),
      },
      {
        name: "sidebar",
        aliases: ["panel"],
        description: "Toggle sidebar",
        category: "system",
        icon: "📐",
        keybind: "ctrl+b",
        onSelect: () => trigger("sidebar.toggle"),
      },
      {
        name: "fullscreen",
        aliases: ["maximize", "fs"],
        description: "Toggle fullscreen mode",
        category: "system",
        icon: "🖥️",
        keybind: "ctrl+f",
        onSelect: () => trigger("view.fullscreen"),
      },
      {
        name: "exit",
        aliases: ["quit", "q"],
        description: "Exit the app",
        category: "system",
        icon: "🚪",
        keybind: "ctrl+c",
        onSelect: () => process.exit(0),
      },
    ];

    // ═══════════════════════════════════════════════════════════
    // SESSION-SPECIFIC COMMANDS (only when in a session)
    // ═══════════════════════════════════════════════════════════
    if (sessionId) {
      baseCommands.unshift(
        {
          name: "undo",
          aliases: ["u", "back"],
          description: "Undo the last message",
          category: "session",
          icon: "↩️",
          keybind: "ctrl+z",
          onSelect: () => trigger("session.undo"),
        },
        {
          name: "redo",
          aliases: ["r", "forward"],
          description: "Redo the last message",
          category: "session",
          icon: "↪️",
          keybind: "ctrl+y",
          onSelect: () => trigger("session.redo"),
        },
        {
          name: "rename",
          description: "Rename this session",
          category: "session",
          icon: "✏️",
          onSelect: () => trigger("session.rename"),
        },
        {
          name: "copy",
          aliases: ["cp"],
          description: "Copy session transcript",
          category: "session",
          icon: "📋",
          keybind: "ctrl+shift+c",
          onSelect: () => trigger("session.copy"),
        },
        {
          name: "export",
          aliases: ["save"],
          description: "Export session to file",
          category: "session",
          icon: "💾",
          onSelect: () => trigger("session.export"),
        },
        {
          name: "timeline",
          aliases: ["history", "jump"],
          description: "Jump to message in timeline",
          category: "session",
          icon: "⏱️",
          onSelect: () => trigger("session.timeline"),
        },
        {
          name: "fork",
          aliases: ["branch", "clone"],
          description: "Fork from current message",
          category: "session",
          icon: "🔱",
          onSelect: () => trigger("session.fork"),
        },
        {
          name: "share",
          description: "Share session link",
          category: "session",
          icon: "🔗",
          onSelect: () => trigger("session.share"),
        },
      );
    }

    return baseCommands;
  }, [sessionId, navigate, toast, openPalette, trigger]);

  return commands;
}

// Category labels and colors
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  session: { label: "Session", color: "#8be9fd" },
  navigation: { label: "Navigation", color: "#bd93f9" },
  mcp: { label: "MCP", color: "#ff79c6" },
  git: { label: "Git", color: "#ffb86c" },
  context: { label: "Context", color: "#50fa7b" },
  agent: { label: "Agent", color: "#f1fa8c" },
  debug: { label: "Debug", color: "#ff5555" },
  system: { label: "System", color: "#6272a4" },
};

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
      if (cmd.category?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [commands, filter]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Map<string, SlashCommand[]> = new Map();
    for (const cmd of filtered) {
      const category = cmd.category || "system";
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }
    return groups;
  }, [filtered]);

  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose();
      return;
    }

    if (key.return || key.tab) {
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
  const maxNameLen = Math.max(...filtered.map((c) => c.name.length), 12);

  // Flatten with indices for selection tracking
  let flatIndex = 0;
  const renderCommands: Array<{ type: "header"; category: string } | { type: "command"; cmd: SlashCommand; index: number }> = [];
  
  for (const [category, cmds] of groupedCommands) {
    renderCommands.push({ type: "header", category });
    for (const cmd of cmds) {
      renderCommands.push({ type: "command", cmd, index: flatIndex++ });
    }
  }

  // Limit displayed items
  const displayLimit = 15;
  const startIndex = Math.max(0, Math.min(selectedIndex - 5, filtered.length - displayLimit));
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      marginBottom={1}
      paddingX={1}
      maxHeight={20}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text color={theme.text} bold>
          Slash Commands
        </Text>
        <Text color={theme.textMuted}>
          {filtered.length} commands
        </Text>
      </Box>

      {/* Render grouped commands */}
      {Array.from(groupedCommands.entries()).slice(0, 5).map(([category, cmds]) => {
        const config = CATEGORY_CONFIG[category] || { label: category, color: theme.textMuted };
        return (
          <Box key={category} flexDirection="column" marginBottom={1}>
            <Box marginBottom={0}>
              <Text color={config.color} bold dimColor>
                {config.label.toUpperCase()}
              </Text>
            </Box>
            {cmds.slice(0, 5).map((cmd) => {
              const idx = filtered.indexOf(cmd);
              const isSelected = idx === selectedIndex;
              return (
                <Box
                  key={cmd.name}
                  paddingX={1}
                  backgroundColor={isSelected ? theme.selection : undefined}
                >
                  {/* Icon */}
                  <Text>{cmd.icon || "•"} </Text>
                  
                  {/* Command name */}
                  <Text
                    color={isSelected ? theme.primary : theme.text}
                    bold={isSelected}
                  >
                    /{cmd.name.padEnd(maxNameLen)}
                  </Text>
                  
                  {/* Description */}
                  <Text color={theme.textMuted}>
                    {cmd.description.slice(0, 35)}
                    {cmd.description.length > 35 ? "..." : ""}
                  </Text>
                  
                  {/* Keybind if exists */}
                  {cmd.keybind && (
                    <Text color={theme.accent}> [{cmd.keybind}]</Text>
                  )}
                </Box>
              );
            })}
          </Box>
        );
      })}

      {/* Footer hints */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color={theme.textMuted}>
          <Text color={theme.text}>↑↓</Text> Navigate  
          <Text color={theme.text}> Enter</Text> Select  
          <Text color={theme.text}> Esc</Text> Close
        </Text>
        {filtered.length > displayLimit && (
          <Text color={theme.textMuted}>
            +{filtered.length - displayLimit} more
          </Text>
        )}
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

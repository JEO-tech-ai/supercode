import React from "react";
import { Box, Text, useStdout } from "ink";
import { useTheme } from "../context/theme";
import { useCommand, useCommandRegistration } from "../context/command";
import { useToast } from "../context/toast";
import { Logo } from "../component/Logo";
import { AdvancedPrompt } from "../component/prompt/AdvancedPrompt";
import { ToastContainer } from "../ui/Toast";

const VERSION = "0.2.0";

interface HomeProps {
  mcpCount?: number;
  directory?: string;
}

export function Home({ mcpCount = 0, directory }: HomeProps) {
  const { theme, themeName, setTheme, themes, toggleMode, mode } = useTheme();
  const { show: openPalette } = useCommand();
  const toast = useToast();
  const { stdout } = useStdout();

  const cwd = directory ?? process.cwd();
  const shortCwd = cwd.replace(process.env.HOME ?? "", "~");

  useCommandRegistration(
    "home",
    () => [
      {
        id: "theme.list",
        title: "Switch Theme",
        category: "System",
        keybind: "Ctrl+T",
        onSelect: () => {
          const currentIndex = themes.indexOf(themeName);
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex]);
          toast.info(`Theme: ${themes[nextIndex]}`);
        },
      },
      {
        id: "theme.toggle_mode",
        title: `Toggle Mode (${mode})`,
        category: "System",
        onSelect: () => {
          toggleMode();
          toast.info(`Mode: ${mode === "dark" ? "light" : "dark"}`);
        },
      },
      {
        id: "help",
        title: "Show Help",
        category: "System",
        keybind: "?",
        onSelect: () => {
          toast.info("Press Ctrl+X for commands, Ctrl+C to exit");
        },
      },
    ],
    [themeName, mode, themes, setTheme, toggleMode, toast]
  );

  const hint = (
    <Box flexDirection="row" gap={2}>
      <Text color={theme.textMuted}>
        <Text color={theme.text}>ctrl+x</Text> commands
      </Text>
      <Text color={theme.textMuted}>
        <Text color={theme.text}>ctrl+c</Text> exit
      </Text>
    </Box>
  );

  return (
    <Box flexDirection="column" height={stdout?.rows ?? 24}>
      {/* Main content - centered */}
      <Box
        flexGrow={1}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        paddingX={2}
        gap={1}
      >
        <Logo />
        
        <Box marginTop={2} width={75}>
          <AdvancedPrompt
            placeholder="What would you like to do? (/ commands, @ files)"
            hint={hint}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box
        paddingX={2}
        paddingY={1}
        flexDirection="row"
        gap={2}
      >
        <Text color={theme.textMuted}>{shortCwd}</Text>
        <Box flexGrow={1} />
        {mcpCount > 0 && (
          <Box gap={1}>
            <Text color={theme.success}>⊙</Text>
            <Text color={theme.text}>{mcpCount} MCP</Text>
          </Box>
        )}
        <Text color={theme.textMuted}>v{VERSION}</Text>
      </Box>

      {/* Toast overlay */}
      <ToastContainer />
    </Box>
  );
}

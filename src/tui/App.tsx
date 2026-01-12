import React, { useEffect, useCallback } from "react";
import { Box, useApp, useInput, useStdout } from "ink";
import {
  ThemeProvider,
  RouteProvider,
  DialogProvider,
  ToastProvider,
  CommandProvider,
  useRoute,
  useCommand,
  useToast,
  useTheme,
} from "./context";
import { Home } from "./routes/Home";
import { Session } from "./routes/session";
import { CommandPalette } from "./ui/CommandPalette";
import { HistoryProvider } from "./component/prompt/History";
import type { PromptPart } from "./component/prompt/FileReference";

interface AppContentProps {
  provider?: string;
  model?: string;
  onSendMessage?: (message: string, sessionId: string) => Promise<string>;
}

function AppContent({ provider, model, onSendMessage }: AppContentProps) {
  const { route, navigate } = useRoute();
  const { theme } = useTheme();
  const { openPalette, closePalette, isPaletteOpen, register } = useCommand();
  const toast = useToast();
  const { exit } = useApp();

  // Global key bindings
  useInput((input, key) => {
    // Ctrl+X: Command palette
    if (key.ctrl && input === "x") {
      if (isPaletteOpen) {
        closePalette();
      } else {
        openPalette();
      }
      return;
    }

    // Ctrl+C: Exit
    if (key.ctrl && input === "c") {
      exit();
      return;
    }

    // Escape: Close palette or go back
    if (key.escape) {
      if (isPaletteOpen) {
        closePalette();
      } else if (route.type !== "home") {
        navigate({ type: "home" });
      }
      return;
    }
  });

  // Register global commands
  useEffect(() => {
    const unregister = register([
      {
        id: "app.exit",
        title: "Exit",
        category: "System",
        keybind: "ctrl+c",
        onSelect: () => exit(),
      },
      {
        id: "session.new",
        title: "New Session",
        category: "Session",
        keybind: "ctrl+n",
        suggested: route.type === "session",
        onSelect: () => navigate({ type: "home" }),
      },
      {
        id: "home",
        title: "Go Home",
        category: "Navigation",
        keybind: "esc",
        onSelect: () => navigate({ type: "home" }),
      },
    ]);

    return unregister;
  }, [register, exit, navigate, route.type]);

  return (
    <Box flexDirection="column" minHeight="100%">
      {/* Route content */}
      {route.type === "home" && <Home />}
      {route.type === "session" && (
        <Session
          provider={provider}
          model={model}
          onSendMessage={onSendMessage}
        />
      )}

      {/* Command palette overlay */}
      {isPaletteOpen && (
        <Box
          position="absolute"
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <CommandPalette onClose={closePalette} />
        </Box>
      )}
    </Box>
  );
}

export interface TuiAppProps {
  initialTheme?: string;
  initialMode?: "dark" | "light";
  provider?: string;
  model?: string;
  sessionId?: string;
  onSendMessage?: (message: string, sessionId: string) => Promise<string>;
}

export function TuiApp({
  initialTheme = "catppuccin",
  initialMode = "dark",
  provider,
  model,
  sessionId,
  onSendMessage,
}: TuiAppProps) {
  const initialRoute = sessionId
    ? { type: "session" as const, sessionID: sessionId }
    : { type: "home" as const };

  return (
    <ThemeProvider initialTheme={initialTheme} initialMode={initialMode}>
      <ToastProvider>
        <RouteProvider initialRoute={initialRoute}>
          <DialogProvider>
            <CommandProvider>
              <HistoryProvider>
                <AppContent
                  provider={provider}
                  model={model}
                  onSendMessage={onSendMessage}
                />
              </HistoryProvider>
            </CommandProvider>
          </DialogProvider>
        </RouteProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default TuiApp;

// SuperCoin TUI - OpenCode-style Text UI
// Main exports

export { TuiApp, type TuiAppProps } from "./App";

// Context exports
export {
  ThemeProvider,
  useTheme,
  type Theme,
} from "./context/theme";

export {
  RouteProvider,
  useRoute,
  useRouteData,
  type RouteData,
} from "./context/route";

export {
  DialogProvider,
  useDialog,
} from "./context/dialog";

export {
  ToastProvider,
  useToast,
  type ToastOptions,
} from "./context/toast";

export {
  CommandProvider,
  useCommand,
  useCommands,
  type Command,
} from "./context/command";

// Component exports
export { Logo } from "./component/Logo";
export { Border } from "./component/Border";
export { Prompt, SimplePrompt } from "./component/prompt/Prompt";

// UI exports
export { ToastContainer } from "./ui/Toast";
export { CommandPalette } from "./ui/CommandPalette";

// Route exports
export { Home } from "./routes/Home";
export { Session, Header, Footer, MessageList, type Message } from "./routes/session";

// Render helper
import React from "react";
import { render } from "ink";
import { TuiApp, type TuiAppProps } from "./App";

export function renderTui(props: TuiAppProps = {}) {
  return render(<TuiApp {...props} />);
}

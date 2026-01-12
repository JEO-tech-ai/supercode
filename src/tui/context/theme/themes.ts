// Theme definitions for SuperCoin TUI
// Based on OpenCode's theme system

export interface Theme {
  name: string;
  background: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  selection: string;
}

export const themes: Record<string, { dark: Theme; light: Theme }> = {
  catppuccin: {
    dark: {
      name: "catppuccin",
      background: "#1e1e2e",
      text: "#cdd6f4",
      textMuted: "#6c7086",
      primary: "#89b4fa",
      secondary: "#f5c2e7",
      accent: "#fab387",
      success: "#a6e3a1",
      warning: "#f9e2af",
      error: "#f38ba8",
      border: "#313244",
      selection: "#45475a",
    },
    light: {
      name: "catppuccin",
      background: "#eff1f5",
      text: "#4c4f69",
      textMuted: "#9ca0b0",
      primary: "#1e66f5",
      secondary: "#ea76cb",
      accent: "#fe640b",
      success: "#40a02b",
      warning: "#df8e1d",
      error: "#d20f39",
      border: "#ccd0da",
      selection: "#acb0be",
    },
  },
  dracula: {
    dark: {
      name: "dracula",
      background: "#282a36",
      text: "#f8f8f2",
      textMuted: "#6272a4",
      primary: "#bd93f9",
      secondary: "#ff79c6",
      accent: "#ffb86c",
      success: "#50fa7b",
      warning: "#f1fa8c",
      error: "#ff5555",
      border: "#44475a",
      selection: "#44475a",
    },
    light: {
      name: "dracula",
      background: "#f8f8f2",
      text: "#282a36",
      textMuted: "#6272a4",
      primary: "#9580ff",
      secondary: "#ff80bf",
      accent: "#ffca80",
      success: "#8aff80",
      warning: "#ffff80",
      error: "#ff9580",
      border: "#d0d0d0",
      selection: "#e0e0e0",
    },
  },
  nord: {
    dark: {
      name: "nord",
      background: "#2e3440",
      text: "#eceff4",
      textMuted: "#4c566a",
      primary: "#88c0d0",
      secondary: "#b48ead",
      accent: "#ebcb8b",
      success: "#a3be8c",
      warning: "#ebcb8b",
      error: "#bf616a",
      border: "#3b4252",
      selection: "#434c5e",
    },
    light: {
      name: "nord",
      background: "#eceff4",
      text: "#2e3440",
      textMuted: "#4c566a",
      primary: "#5e81ac",
      secondary: "#b48ead",
      accent: "#d08770",
      success: "#a3be8c",
      warning: "#ebcb8b",
      error: "#bf616a",
      border: "#d8dee9",
      selection: "#e5e9f0",
    },
  },
  "tokyo-night": {
    dark: {
      name: "tokyo-night",
      background: "#1a1b26",
      text: "#c0caf5",
      textMuted: "#565f89",
      primary: "#7aa2f7",
      secondary: "#bb9af7",
      accent: "#ff9e64",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
      border: "#292e42",
      selection: "#33467c",
    },
    light: {
      name: "tokyo-night",
      background: "#d5d6db",
      text: "#343b58",
      textMuted: "#9699a3",
      primary: "#34548a",
      secondary: "#5a4a78",
      accent: "#965027",
      success: "#485e30",
      warning: "#8f5e15",
      error: "#8c4351",
      border: "#c0c1c5",
      selection: "#b4b5b9",
    },
  },
  monokai: {
    dark: {
      name: "monokai",
      background: "#272822",
      text: "#f8f8f2",
      textMuted: "#75715e",
      primary: "#66d9ef",
      secondary: "#ae81ff",
      accent: "#fd971f",
      success: "#a6e22e",
      warning: "#e6db74",
      error: "#f92672",
      border: "#3e3d32",
      selection: "#49483e",
    },
    light: {
      name: "monokai",
      background: "#fafafa",
      text: "#272822",
      textMuted: "#75715e",
      primary: "#0089b3",
      secondary: "#7c5bb0",
      accent: "#c77800",
      success: "#7b9726",
      warning: "#b39f04",
      error: "#db2d5a",
      border: "#e0e0e0",
      selection: "#d0d0d0",
    },
  },
};

export const themeNames = Object.keys(themes);

export function getTheme(name: string, mode: "dark" | "light"): Theme {
  const themeSet = themes[name] ?? themes.catppuccin;
  return themeSet[mode];
}

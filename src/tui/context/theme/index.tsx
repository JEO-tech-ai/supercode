import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { themes, themeNames, getTheme, type Theme } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  themeName: string;
  mode: "dark" | "light";
  setTheme: (name: string) => void;
  setMode: (mode: "dark" | "light") => void;
  toggleMode: () => void;
  themes: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: string;
  initialMode?: "dark" | "light";
}

export function ThemeProvider({
  children,
  initialTheme = "catppuccin",
  initialMode = "dark",
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState(initialTheme);
  const [mode, setMode] = useState<"dark" | "light">(initialMode);

  const theme = getTheme(themeName, mode);

  const handleSetTheme = useCallback((name: string) => {
    if (themeNames.includes(name)) {
      setThemeName(name);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        mode,
        setTheme: handleSetTheme,
        setMode,
        toggleMode,
        themes: themeNames,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export { type Theme } from "./themes";

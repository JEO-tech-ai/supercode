import { createContext, createSignal, useContext, createEffect, type ParentComponent } from "solid-js";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: () => Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: () => "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>();

export const ThemeProvider: ParentComponent<{ defaultTheme?: Theme }> = (props) => {
  const [theme, setTheme] = createSignal<Theme>(props.defaultTheme ?? "system");
  
  const resolvedTheme = () => {
    const current = theme();
    if (current === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return "dark";
    }
    return current;
  };
  
  createEffect(() => {
    if (typeof document !== "undefined") {
      const resolved = resolvedTheme();
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    }
  });
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

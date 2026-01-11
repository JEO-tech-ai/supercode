import { Component } from "solid-js";
import { A } from "@solidjs/router";
import { Button, useTheme } from "@supercoin/ui";

export const Navbar: Component = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center">
        <div class="mr-4 flex">
          <A href="/" class="mr-6 flex items-center space-x-2">
            <span class="text-xl font-bold">SuperCoin</span>
          </A>
          <nav class="flex items-center space-x-6 text-sm font-medium">
            <A
              href="/models"
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              Models
            </A>
            <A
              href="/agents"
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              Agents
            </A>
            <A
              href="/settings"
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              Settings
            </A>
          </nav>
        </div>
        <div class="flex flex-1 items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setTheme(resolvedTheme() === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme() === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </div>
    </header>
  );
};

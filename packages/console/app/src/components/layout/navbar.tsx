import { Component, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Button, useTheme } from "@supercoin/ui";
import { useAuth } from "~/context/auth";

export const Navbar: Component = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.logout();
    navigate("/auth/login");
  };

  return (
    <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center">
        <div class="mr-4 flex">
          <A href="/" class="mr-6 flex items-center space-x-2">
            <span class="text-xl font-bold">SuperCoin</span>
          </A>
          <Show when={auth.isAuthenticated()}>
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
          </Show>
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
          <Show
            when={auth.isAuthenticated()}
            fallback={
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth/login")}
              >
                Sign In
              </Button>
            }
          >
            <div class="flex items-center space-x-2">
              <span class="text-sm text-muted-foreground">
                {auth.user()?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
};

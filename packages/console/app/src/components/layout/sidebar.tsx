import { Component, For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { cn } from "@supercoin/ui";

const navItems = [
  { href: "/", label: "Dashboard", icon: "Home" },
  { href: "/models", label: "Models", icon: "Cpu" },
  { href: "/agents", label: "Agents", icon: "Bot" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

export const Sidebar: Component = () => {
  const location = useLocation();

  return (
    <aside class="hidden w-64 shrink-0 border-r border-border md:block">
      <div class="flex h-full flex-col gap-2 p-4">
        <For each={navItems}>
          {(item) => (
            <A
              href={item.href}
              class={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <span class="w-5">{item.icon}</span>
              {item.label}
            </A>
          )}
        </For>
      </div>
    </aside>
  );
};

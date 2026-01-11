import { type ParentComponent, splitProps } from "solid-js";
import { Tabs as KobalteTabs } from "@kobalte/core/tabs";
import { cn } from "../utils/cn";

export const Tabs = KobalteTabs;

export const TabsList: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteTabs.List
      class={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        local.class
      )}
      {...others}
    >
      {local.children}
    </KobalteTabs.List>
  );
};

export const TabsTrigger: ParentComponent<{ class?: string; value: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children", "value"]);
  
  return (
    <KobalteTabs.Trigger
      value={local.value}
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm",
        local.class
      )}
      {...others}
    >
      {local.children}
    </KobalteTabs.Trigger>
  );
};

export const TabsContent: ParentComponent<{ class?: string; value: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children", "value"]);
  
  return (
    <KobalteTabs.Content
      value={local.value}
      class={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        local.class
      )}
      {...others}
    >
      {local.children}
    </KobalteTabs.Content>
  );
};

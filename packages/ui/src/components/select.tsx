import { type ParentComponent, splitProps, type JSX } from "solid-js";
import { Select as KobalteSelect } from "@kobalte/core/select";
import { cn } from "../utils/cn";

export const Select = KobalteSelect;
export const SelectValue = KobalteSelect.Value;

export const SelectTrigger: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteSelect.Trigger
      class={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        local.class
      )}
      {...others}
    >
      {local.children}
      <KobalteSelect.Icon class="h-4 w-4 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </KobalteSelect.Icon>
    </KobalteSelect.Trigger>
  );
};

export const SelectContent: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteSelect.Portal>
      <KobalteSelect.Content
        class={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95",
          local.class
        )}
        {...others}
      >
        <KobalteSelect.Listbox class="p-1" />
      </KobalteSelect.Content>
    </KobalteSelect.Portal>
  );
};

export const SelectItem = KobalteSelect.Item;
export const SelectItemLabel = KobalteSelect.ItemLabel;
export const SelectItemIndicator = KobalteSelect.ItemIndicator;

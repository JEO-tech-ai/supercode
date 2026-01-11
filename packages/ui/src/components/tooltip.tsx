import { type ParentComponent, splitProps } from "solid-js";
import { Tooltip as KobalteTooltip } from "@kobalte/core/tooltip";
import { cn } from "../utils/cn";

export const Tooltip = KobalteTooltip;
export const TooltipTrigger = KobalteTooltip.Trigger;

export const TooltipContent: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteTooltip.Portal>
      <KobalteTooltip.Content
        class={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
          local.class
        )}
        {...others}
      >
        {local.children}
        <KobalteTooltip.Arrow />
      </KobalteTooltip.Content>
    </KobalteTooltip.Portal>
  );
};

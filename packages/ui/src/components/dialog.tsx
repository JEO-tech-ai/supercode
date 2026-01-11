import { type ParentComponent, splitProps } from "solid-js";
import { Dialog as KobalteDialog } from "@kobalte/core/dialog";
import { cn } from "../utils/cn";

export const Dialog = KobalteDialog;
export const DialogTrigger = KobalteDialog.Trigger;
export const DialogPortal = KobalteDialog.Portal;
export const DialogClose = KobalteDialog.CloseButton;

export const DialogOverlay: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  
  return (
    <KobalteDialog.Overlay
      class={cn(
        "fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
        local.class
      )}
      {...others}
    />
  );
};

export const DialogContent: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <KobalteDialog.Content
        class={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 sm:rounded-lg",
          local.class
        )}
        {...others}
      >
        {local.children}
      </KobalteDialog.Content>
    </DialogPortal>
  );
};

export const DialogHeader: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <div class={cn("flex flex-col space-y-1.5 text-center sm:text-left", local.class)} {...others}>
      {local.children}
    </div>
  );
};

export const DialogFooter: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <div class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", local.class)} {...others}>
      {local.children}
    </div>
  );
};

export const DialogTitle: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteDialog.Title class={cn("text-lg font-semibold leading-none tracking-tight", local.class)} {...others}>
      {local.children}
    </KobalteDialog.Title>
  );
};

export const DialogDescription: ParentComponent<{ class?: string }> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  
  return (
    <KobalteDialog.Description class={cn("text-sm text-muted-foreground", local.class)} {...others}>
      {local.children}
    </KobalteDialog.Description>
  );
};

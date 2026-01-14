import { Show, type JSX } from "solid-js";

interface DragDropOverlayProps {
  isDragging: boolean;
  isProcessing?: boolean;
  error?: string | null;
  children?: JSX.Element;
}

export function DragDropOverlay(props: DragDropOverlayProps) {
  return (
    <>
      <Show when={props.isDragging}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed border-primary bg-surface-base/90">
            <div class="text-4xl">📁</div>
            <div class="text-xl font-medium text-text-strong">
              Drop files here
            </div>
            <div class="text-sm text-text-muted">
              Supported: PNG, JPEG, GIF, WebP, SVG, PDF
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.isProcessing}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="flex items-center gap-3 px-6 py-4 rounded-lg bg-surface-base border border-border">
            <div class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            <span class="text-text-strong">Processing files...</span>
          </div>
        </div>
      </Show>

      <Show when={props.error}>
        <div class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg bg-error/10 border border-error text-error">
          {props.error}
        </div>
      </Show>

      {props.children}
    </>
  );
}

interface DropZoneProps {
  isDragging: boolean;
  class?: string;
  children?: JSX.Element;
}

export function DropZone(props: DropZoneProps) {
  return (
    <div
      class={`relative transition-all duration-200 ${props.class || ""}`}
      classList={{
        "ring-2 ring-primary ring-offset-2 ring-offset-surface-base": props.isDragging,
      }}
    >
      {props.children}
    </div>
  );
}

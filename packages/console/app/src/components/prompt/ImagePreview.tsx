import { Show, createSignal, type JSX } from "solid-js";

interface ImageAttachment {
  id: string;
  filename: string;
  mime: string;
  dataUrl: string;
}

interface ImagePreviewModalProps {
  attachment: ImageAttachment | null;
  onClose: () => void;
}

export function ImagePreviewModal(props: ImagePreviewModalProps) {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleDownload = () => {
    if (!props.attachment) return;

    const link = document.createElement("a");
    link.href = props.attachment.dataUrl;
    link.download = props.attachment.filename;
    link.click();
  };

  return (
    <Show when={props.attachment}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div class="relative max-w-4xl max-h-[90vh] p-4">
          <div class="absolute top-2 right-2 flex gap-2 z-10">
            <button
              onClick={handleDownload}
              class="p-2 rounded-lg bg-surface-base/80 hover:bg-surface-raised border border-border transition-colors"
              title="Download"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={props.onClose}
              class="p-2 rounded-lg bg-surface-base/80 hover:bg-surface-raised border border-border transition-colors"
              title="Close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <Show
            when={props.attachment?.mime.startsWith("image/")}
            fallback={
              <div class="flex flex-col items-center gap-4 p-8 bg-surface-base rounded-lg border border-border">
                <svg class="w-16 h-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span class="text-text-strong font-medium">{props.attachment?.filename}</span>
                <span class="text-text-muted text-sm">{props.attachment?.mime}</span>
              </div>
            }
          >
            <img
              src={props.attachment?.dataUrl}
              alt={props.attachment?.filename}
              class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </Show>

          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg">
            <span class="text-white text-sm">{props.attachment?.filename}</span>
          </div>
        </div>
      </div>
    </Show>
  );
}

interface ImageThumbnailProps {
  attachment: ImageAttachment;
  onRemove?: () => void;
  onPreview?: () => void;
  size?: "sm" | "md" | "lg";
}

export function ImageThumbnail(props: ImageThumbnailProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const sizeClass = () => sizeClasses[props.size || "md"];

  return (
    <div class={`relative group ${sizeClass()}`}>
      <Show
        when={props.attachment.mime.startsWith("image/")}
        fallback={
          <div
            class={`${sizeClass()} rounded-md bg-surface-base flex items-center justify-center border border-border cursor-pointer hover:border-primary transition-colors`}
            onClick={props.onPreview}
          >
            <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        }
      >
        <img
          src={props.attachment.dataUrl}
          alt={props.attachment.filename}
          class={`${sizeClass()} rounded-md object-cover border border-border cursor-pointer hover:border-primary transition-colors`}
          onClick={props.onPreview}
        />
      </Show>

      <Show when={props.onRemove}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onRemove?.();
          }}
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-raised border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:border-error"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Show>

      <div class="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-white text-xs truncate block">
          {props.attachment.filename.length > 10
            ? `${props.attachment.filename.slice(0, 8)}...`
            : props.attachment.filename}
        </span>
      </div>
    </div>
  );
}

interface ImageAttachmentListProps {
  attachments: ImageAttachment[];
  onRemove?: (id: string) => void;
  onPreview?: (attachment: ImageAttachment) => void;
  size?: "sm" | "md" | "lg";
}

export function ImageAttachmentList(props: ImageAttachmentListProps) {
  const [previewAttachment, setPreviewAttachment] = createSignal<ImageAttachment | null>(null);

  const handlePreview = (attachment: ImageAttachment) => {
    if (props.onPreview) {
      props.onPreview(attachment);
    } else {
      setPreviewAttachment(attachment);
    }
  };

  return (
    <>
      <div class="flex flex-wrap gap-2">
        {props.attachments.map((attachment) => (
          <ImageThumbnail
            attachment={attachment}
            size={props.size}
            onRemove={props.onRemove ? () => props.onRemove!(attachment.id) : undefined}
            onPreview={() => handlePreview(attachment)}
          />
        ))}
      </div>

      <ImagePreviewModal
        attachment={previewAttachment()}
        onClose={() => setPreviewAttachment(null)}
      />
    </>
  );
}

import { createSignal, createMemo, Show, For, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { useCommand } from "~/context/command";
import { useDragDrop, type DragDropFile } from "~/hooks/useDragDrop";
import { useImagePaste, type ImageAttachment } from "~/hooks/useImagePaste";
import { DragDropOverlay } from "./DragDropOverlay";
import { ImageThumbnail, ImagePreviewModal } from "./ImagePreview";

const PLACEHOLDERS = [
  "Fix a TODO in the codebase",
  "What is the tech stack?",
  "Fix broken tests",
  "Explain how authentication works",
];

interface PromptInputProps {
  sessionId: string;
  disabled?: boolean;
  onSend: (content: string, attachments?: File[]) => Promise<void>;
  onAbort?: () => void;
}

export function PromptInput(props: PromptInputProps) {
  let textareaRef: HTMLTextAreaElement | undefined;

  const command = useCommand();
  const [text, setText] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [previewAttachment, setPreviewAttachment] =
    createSignal<ImageAttachment | null>(null);

  const [store, setStore] = createStore({
    mode: "normal" as "normal" | "shell",
    placeholder: Math.floor(Math.random() * PLACEHOLDERS.length),
    attachments: [] as ImageAttachment[],
  });

  const { isDragging, isProcessing, error: dragError } = useDragDrop({
    onDrop: handleFileDrop,
    disabled: props.disabled,
  });

  const { error: pasteError } = useImagePaste({
    onAttach: (attachment) => {
      setStore("attachments", [...store.attachments, attachment]);
    },
    disabled: props.disabled,
  });

  const error = createMemo(() => dragError() || pasteError());

  function handleFileDrop(files: DragDropFile[]) {
    const newAttachments: ImageAttachment[] = files.map((f) => ({
      id: crypto.randomUUID(),
      filename: f.file.name,
      mime: f.file.type,
      dataUrl: f.dataUrl,
    }));
    setStore("attachments", [...store.attachments, ...newAttachments]);
  }

  function removeAttachment(id: string) {
    setStore(
      "attachments",
      store.attachments.filter((a) => a.id !== id)
    );
  }

  async function handleSubmit(event?: Event) {
    event?.preventDefault();

    const content = text().trim();
    if (!content && store.attachments.length === 0) {
      if (props.disabled && props.onAbort) {
        props.onAbort();
      }
      return;
    }

    if (store.mode === "shell") {
      setStore("mode", "normal");
    }

    if (content.startsWith("/")) {
      const slashCmd = content.split(" ")[0].slice(1);
      const cmdOption = command.getBySlash(slashCmd);
      if (cmdOption) {
        command.trigger(cmdOption.id, "slash");
        setText("");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const files = await Promise.all(
        store.attachments.map(async (att) => {
          const response = await fetch(att.dataUrl);
          const blob = await response.blob();
          return new File([blob], att.filename, { type: att.mime });
        })
      );

      await props.onSend(content, files.length > 0 ? files : undefined);
      setText("");
      setStore("attachments", []);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key === "!" && text() === "") {
      event.preventDefault();
      setStore("mode", "shell");
      return;
    }

    if (event.key === "Escape") {
      if (store.mode === "shell") {
        setStore("mode", "normal");
      } else if (props.disabled && props.onAbort) {
        props.onAbort();
      }
      return;
    }

    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      command.toggle();
    }
  }

  function handleInput(event: InputEvent) {
    const target = event.target as HTMLTextAreaElement;
    setText(target.value);

    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  }

  onMount(() => {
    textareaRef?.focus();
  });

  return (
    <div class="relative">
      <DragDropOverlay
        isDragging={isDragging()}
        isProcessing={isProcessing()}
        error={error()}
      />

      <Show when={store.attachments.length > 0}>
        <div class="mb-2 flex flex-wrap gap-2">
          <For each={store.attachments}>
            {(attachment) => (
              <ImageThumbnail
                attachment={attachment}
                size="md"
                onRemove={() => removeAttachment(attachment.id)}
                onPreview={() => setPreviewAttachment(attachment)}
              />
            )}
          </For>
        </div>
      </Show>

      <form onSubmit={handleSubmit}>
        <div
          class={`rounded-lg border transition-colors ${
            store.mode === "shell"
              ? "border-primary"
              : "border-border focus-within:border-primary"
          }`}
        >
          <Show when={store.mode === "shell"}>
            <div class="border-b border-border px-3 py-1 text-sm text-primary">
              Shell Mode - Enter command
            </div>
          </Show>

          <textarea
            ref={textareaRef}
            value={text()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={props.disabled || isSubmitting()}
            placeholder={
              store.mode === "shell"
                ? "Enter shell command..."
                : `Ask anything... "${PLACEHOLDERS[store.placeholder]}"`
            }
            class={`w-full resize-none bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 ${
              store.mode === "shell" ? "font-mono" : ""
            }`}
            rows={1}
          />

          <div class="flex items-center justify-between border-t border-border px-3 py-2">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ctrl+K for commands</span>
              <Show when={store.attachments.length > 0}>
                <span class="text-primary">
                  {store.attachments.length} file(s) attached
                </span>
              </Show>
            </div>

            <div class="flex items-center gap-2">
              <Show when={props.disabled}>
                <button
                  type="button"
                  onClick={props.onAbort}
                  class="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Stop
                </button>
              </Show>

              <button
                type="submit"
                disabled={props.disabled || isSubmitting()}
                class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send
              </button>
            </div>
          </div>
        </div>
      </form>

      <ImagePreviewModal
        attachment={previewAttachment()}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}

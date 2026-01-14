import {
  createSignal,
  createMemo,
  createEffect,
  Show,
  For,
  onMount,
  onCleanup,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { useSDK, type Message } from "~/context/sdk";
import { useSync } from "~/context/sync";
import { useCommand, useCommandRegistration } from "~/context/command";
import { PromptInput } from "~/components/prompt/PromptInput";
import { MessagePart } from "~/components/prompt/MessagePart";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";
import { ProtectedRoute } from "~/components/auth/protected-route";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sdk = useSDK();
  const sync = useSync();
  const command = useCommand();

  let messagesContainerRef: HTMLDivElement | undefined;

  const session = createMemo(() =>
    sync.data.session.find((s) => s.id === params.id)
  );

  const messages = createMemo(() => sync.data.message[params.id] ?? []);

  const status = createMemo(
    () => sync.data.session_status[params.id] ?? { type: "idle" as const }
  );

  const isWorking = createMemo(() => status().type !== "idle");

  useCommandRegistration("session", () => [
    {
      id: "session.fork",
      title: "Fork Session",
      description: "Create a new branch from current point",
      slash: "fork",
      category: "Session",
      onSelect: () => handleFork(),
    },
    {
      id: "session.export",
      title: "Export Session",
      description: "Export as markdown",
      slash: "export",
      category: "Session",
      onSelect: () => handleExport(),
    },
    {
      id: "session.clear",
      title: "Clear Session",
      description: "Start fresh in this session",
      slash: "clear",
      category: "Session",
      onSelect: () => handleClear(),
    },
  ]);

  createEffect(() => {
    messages();
    if (messagesContainerRef) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
    }
  });

  onMount(async () => {
    await sync.refreshSession(params.id);
  });

  async function handleFork() {
    try {
      const lastMessage = messages().at(-1);
      const result = await sdk.client.session.fork({
        sessionID: params.id,
        messageID: lastMessage?.id,
      });
      if (result.data) {
        navigate(`/session/${result.data.id}`);
      }
    } catch (error) {
      console.error("Failed to fork session:", error);
    }
  }

  async function handleExport() {
    try {
      const result = await sdk.client.session.export({ sessionID: params.id });
      const markdown = result.data ?? "";

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${params.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export session:", error);
    }
  }

  async function handleClear() {
    try {
      await sdk.client.session.clear({ sessionID: params.id });
      sync.clearSession(params.id);
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  async function handleAbort() {
    try {
      await sdk.client.message.abort({ sessionID: params.id });
      sync.setSessionStatus(params.id, { type: "idle" });
    } catch (error) {
      console.error("Failed to abort:", error);
    }
  }

  async function handleSend(content: string, attachments?: File[]) {
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      if (isWorking()) {
        await handleAbort();
      }
      return;
    }

    sync.setSessionStatus(params.id, { type: "thinking" });

    try {
      await sdk.client.message.send({
        sessionID: params.id,
        content,
        attachments,
      });

      await sync.refreshSession(params.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      sync.setSessionStatus(params.id, {
        type: "error",
        error: error instanceof Error ? error.message : "Failed to send",
      });
    } finally {
      sync.setSessionStatus(params.id, { type: "idle" });
    }
  }

  return (
    <ProtectedRoute>
      <div class="flex min-h-screen flex-col">
        <Navbar />
        <div class="flex flex-1">
          <Sidebar />
          <main class="flex flex-1 flex-col overflow-hidden">
            <header class="flex items-center justify-between border-b border-border px-4 py-3">
              <div class="flex items-center gap-3">
                <h1 class="text-lg font-semibold">
                  {session()?.title || "Session"}
                </h1>
                <Show when={isWorking()}>
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    {status().type}
                  </span>
                </Show>
              </div>

              <div class="flex items-center gap-2">
                <button
                  onClick={() => command.show()}
                  class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Commands
                </button>
              </div>
            </header>

            <div
              ref={messagesContainerRef}
              class="flex-1 overflow-y-auto p-4 space-y-4"
            >
              <Show
                when={messages().length > 0}
                fallback={
                  <div class="flex h-full items-center justify-center text-muted-foreground">
                    <div class="text-center">
                      <p class="text-lg">Start a conversation</p>
                      <p class="mt-1 text-sm">
                        Type a message below to begin
                      </p>
                    </div>
                  </div>
                }
              >
                <For each={messages()}>
                  {(message) => (
                    <div
                      class={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        class={`max-w-3xl rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary"
                        }`}
                      >
                        <MessagePart
                          content={message.content}
                          role={message.role}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </Show>

              <Show when={isWorking()}>
                <div class="flex items-center gap-2 text-muted-foreground">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Working...</span>
                </div>
              </Show>
            </div>

            <div class="border-t border-border p-4">
              <PromptInput
                sessionId={params.id}
                disabled={isWorking()}
                onSend={handleSend}
                onAbort={handleAbort}
              />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

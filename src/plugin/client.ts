import type { PluginClient } from "./types";

export interface PluginClientOptions {
  directory: string;
  sessionManager?: {
    getSession: (id: string) => Promise<{
      messages?: unknown[];
      todos?: unknown[];
    } | null>;
    addMessage: (
      id: string,
      message: { role: string; content: string }
    ) => Promise<void>;
  };
  toolRegistry?: {
    execute: (
      name: string,
      args: Record<string, unknown>,
      context: { sessionId: string; workdir: string }
    ) => Promise<unknown>;
  };
  onToast?: (toast: {
    title: string;
    message: string;
    variant: string;
    duration?: number;
  }) => void;
}

export function createPluginClient(options: PluginClientOptions): PluginClient {
  const { directory, sessionManager, toolRegistry, onToast } = options;

  return {
    session: {
      messages: async ({ path }) => {
        if (!sessionManager) {
          return { data: [] };
        }
        const session = await sessionManager.getSession(path.id);
        return { data: session?.messages ?? [] };
      },

      prompt: async ({ path, body }) => {
        if (!sessionManager) return;
        const content = body.parts
          .map((part) => {
            if (typeof part === "object" && part !== null && "text" in part) {
              const text = (part as { text?: string }).text;
              return text ?? "";
            }
            return "";
          })
          .join("");
        await sessionManager.addMessage(path.id, {
          role: "user",
          content,
        });
      },

      abort: async () => {
      },

      todo: async ({ path }) => {
        if (!sessionManager) {
          return { data: [] };
        }
        const session = await sessionManager.getSession(path.id);
        return { data: session?.todos ?? [] };
      },
    },

    tui: {
      showToast: async ({ body }) => {
        if (onToast) {
          onToast(body);
        } else {
          console.log(`[Toast] ${body.title}: ${body.message}`);
        }
      },
    },

    tool: {
      execute: async (name, args) => {
        if (!toolRegistry) {
          throw new Error("Tool registry not available");
        }
        return toolRegistry.execute(name, args, {
          sessionId: "",
          workdir: directory,
        });
      },
    },
  };
}

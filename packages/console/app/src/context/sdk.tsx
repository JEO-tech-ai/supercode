import { createContext, useContext, type ParentComponent } from "solid-js";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  provider: string;
}

export interface SessionStatus {
  type: "idle" | "thinking" | "streaming" | "tool_calling" | "error";
  error?: string;
}

export interface SDKClient {
  session: {
    list: () => Promise<{ data: Session[] }>;
    get: (params: { sessionID: string }) => Promise<{ data: Session | null }>;
    create: (params: { title?: string; model?: string; provider?: string }) => Promise<{ data: Session }>;
    delete: (params: { sessionID: string }) => Promise<{ data: boolean }>;
    clear: (params: { sessionID: string }) => Promise<{ data: boolean }>;
    fork: (params: { sessionID: string; messageID?: string }) => Promise<{ data: Session }>;
    export: (params: { sessionID: string }) => Promise<{ data: string }>;
  };
  message: {
    list: (params: { sessionID: string }) => Promise<{ data: Message[] }>;
    send: (params: { sessionID: string; content: string; attachments?: File[] }) => Promise<{ data: Message }>;
    abort: (params: { sessionID: string }) => Promise<{ data: boolean }>;
  };
  provider: {
    list: () => Promise<{ data: Array<{ id: string; name: string; models: string[] }> }>;
  };
}

function createMockClient(): SDKClient {
  const sessions = new Map<string, Session>();
  const messages = new Map<string, Message[]>();

  return {
    session: {
      list: async () => ({ data: Array.from(sessions.values()) }),
      get: async ({ sessionID }) => ({ data: sessions.get(sessionID) || null }),
      create: async ({ title, model, provider }) => {
        const session: Session = {
          id: `session-${Date.now()}`,
          title: title || "New Session",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: model || "gpt-4",
          provider: provider || "openai",
        };
        sessions.set(session.id, session);
        messages.set(session.id, []);
        return { data: session };
      },
      delete: async ({ sessionID }) => {
        sessions.delete(sessionID);
        messages.delete(sessionID);
        return { data: true };
      },
      clear: async ({ sessionID }) => {
        messages.set(sessionID, []);
        return { data: true };
      },
      fork: async ({ sessionID, messageID }) => {
        const original = sessions.get(sessionID);
        const session: Session = {
          id: `session-${Date.now()}`,
          title: `Fork of ${original?.title || "Session"}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: original?.model || "gpt-4",
          provider: original?.provider || "openai",
        };
        sessions.set(session.id, session);

        const originalMessages = messages.get(sessionID) || [];
        const forkIndex = messageID
          ? originalMessages.findIndex((m) => m.id === messageID) + 1
          : originalMessages.length;
        messages.set(session.id, originalMessages.slice(0, forkIndex));

        return { data: session };
      },
      export: async ({ sessionID }) => {
        const session = sessions.get(sessionID);
        const msgs = messages.get(sessionID) || [];
        const markdown = [
          `# ${session?.title || "Session"}`,
          "",
          ...msgs.map((m) => `**${m.role}**: ${m.content}`),
        ].join("\n\n");
        return { data: markdown };
      },
    },
    message: {
      list: async ({ sessionID }) => ({ data: messages.get(sessionID) || [] }),
      send: async ({ sessionID, content }) => {
        const msg: Message = {
          id: `msg-${Date.now()}`,
          role: "user",
          content,
          timestamp: Date.now(),
        };
        const sessionMessages = messages.get(sessionID) || [];
        sessionMessages.push(msg);
        messages.set(sessionID, sessionMessages);

        setTimeout(() => {
          const response: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `Echo: ${content}`,
            timestamp: Date.now(),
          };
          sessionMessages.push(response);
        }, 500);

        return { data: msg };
      },
      abort: async () => ({ data: true }),
    },
    provider: {
      list: async () => ({
        data: [
          { id: "openai", name: "OpenAI", models: ["gpt-4", "gpt-3.5-turbo"] },
          { id: "anthropic", name: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet"] },
          { id: "ollama", name: "Ollama", models: ["llama3", "mistral"] },
        ],
      }),
    },
  };
}

interface SDKContextValue {
  client: SDKClient;
  baseUrl: string;
}

const SDKContext = createContext<SDKContextValue>();

interface SDKProviderProps {
  baseUrl?: string;
}

export const SDKProvider: ParentComponent<SDKProviderProps> = (props) => {
  const client = createMockClient();

  return (
    <SDKContext.Provider
      value={{
        client,
        baseUrl: props.baseUrl || "/api",
      }}
    >
      {props.children}
    </SDKContext.Provider>
  );
};

export function useSDK(): SDKContextValue {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error("useSDK must be used within an SDKProvider");
  }
  return context;
}

export default SDKProvider;

import {
  createContext,
  useContext,
  onMount,
  onCleanup,
  type ParentComponent,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { useSDK, type Session, type Message, type SessionStatus } from "./sdk";

export interface MessagePart {
  id: string;
  type: "text" | "code" | "image" | "file" | "tool_call" | "tool_result";
  content: string;
  language?: string;
  mimeType?: string;
  filename?: string;
  toolName?: string;
  toolStatus?: "pending" | "running" | "success" | "error";
}

interface SyncData {
  session: Session[];
  message: Record<string, Message[]>;
  part: Record<string, MessagePart[]>;
  session_status: Record<string, SessionStatus>;
}

interface SyncContextValue {
  data: SyncData;
  refresh: () => Promise<void>;
  refreshSession: (sessionId: string) => Promise<void>;
  setSessionStatus: (sessionId: string, status: SessionStatus) => void;
  addMessage: (sessionId: string, message: Message) => void;
  clearSession: (sessionId: string) => void;
}

const SyncContext = createContext<SyncContextValue>();

export const SyncProvider: ParentComponent = (props) => {
  const sdk = useSDK();

  const [data, setData] = createStore<SyncData>({
    session: [],
    message: {},
    part: {},
    session_status: {},
  });

  const refresh = async () => {
    try {
      const sessions = await sdk.client.session.list();
      setData("session", sessions.data);

      for (const session of sessions.data) {
        const messages = await sdk.client.message.list({ sessionID: session.id });
        setData("message", session.id, messages.data);
        setData("session_status", session.id, { type: "idle" });
      }
    } catch (error) {
      console.error("Failed to refresh sync data:", error);
    }
  };

  const refreshSession = async (sessionId: string) => {
    try {
      const messages = await sdk.client.message.list({ sessionID: sessionId });
      setData("message", sessionId, messages.data);
    } catch (error) {
      console.error(`Failed to refresh session ${sessionId}:`, error);
    }
  };

  const setSessionStatus = (sessionId: string, status: SessionStatus) => {
    setData("session_status", sessionId, status);
  };

  const addMessage = (sessionId: string, message: Message) => {
    setData(
      produce((state) => {
        if (!state.message[sessionId]) {
          state.message[sessionId] = [];
        }
        state.message[sessionId].push(message);
      })
    );
  };

  const clearSession = (sessionId: string) => {
    setData("message", sessionId, []);
    setData("part", sessionId, []);
  };

  onMount(() => {
    refresh();
  });

  return (
    <SyncContext.Provider
      value={{
        data,
        refresh,
        refreshSession,
        setSessionStatus,
        addMessage,
        clearSession,
      }}
    >
      {props.children}
    </SyncContext.Provider>
  );
};

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}

export default SyncProvider;

import React, { createContext, useContext, useState, useCallback, useMemo, useReducer, ReactNode } from "react";
import type { SubAgentInfo, MCPServerInfo, LSPServerInfo, TodoItem, ModifiedFile } from "../component/Sidebar";

// ═══════════════════════════════════════════════════════════════════════════
// Session State Types
// ═══════════════════════════════════════════════════════════════════════════

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  agentName?: string;
  model?: string;
  provider?: string;
  tokens?: { input: number; output: number };
  cost?: number;
  duration?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: "pending" | "running" | "success" | "error";
  startTime?: number;
  endTime?: number;
}

export interface Attachment {
  type: "file" | "image" | "url";
  name: string;
  path?: string;
  url?: string;
  content?: string;
  mimeType?: string;
  size?: number;
}

export interface SessionState {
  // Session identity
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;

  // Messages
  messages: Message[];
  streamingContent: string;
  
  // Status
  status: "idle" | "thinking" | "streaming" | "tool_calling" | "error";
  error?: string;

  // Context tracking
  contextTokens: number;
  inputTokens: number;
  outputTokens: number;
  maxContextTokens: number;
  cost: number;

  // Model configuration
  provider: string;
  model: string;
  agent: string;

  // Sub-agents
  subAgents: SubAgentInfo[];

  // External services
  mcpServers: MCPServerInfo[];
  lspServers: LSPServerInfo[];

  // Task tracking
  todos: TodoItem[];
  modifiedFiles: ModifiedFile[];

  // Git status
  gitBranch?: string;
  gitStatus?: {
    staged: number;
    modified: number;
    untracked: number;
  };

  // History for undo/redo
  undoStack: Message[][];
  redoStack: Message[][];
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Actions
// ═══════════════════════════════════════════════════════════════════════════

type SessionAction =
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: { id: string; updates: Partial<Message> } }
  | { type: "DELETE_MESSAGE"; payload: string }
  | { type: "SET_STREAMING_CONTENT"; payload: string }
  | { type: "SET_STATUS"; payload: SessionState["status"] }
  | { type: "SET_ERROR"; payload: string | undefined }
  | { type: "UPDATE_TOKENS"; payload: { input?: number; output?: number; cost?: number } }
  | { type: "SET_MODEL"; payload: { provider: string; model: string } }
  | { type: "SET_AGENT"; payload: string }
  | { type: "ADD_SUB_AGENT"; payload: SubAgentInfo }
  | { type: "UPDATE_SUB_AGENT"; payload: { name: string; updates: Partial<SubAgentInfo> } }
  | { type: "REMOVE_SUB_AGENT"; payload: string }
  | { type: "SET_MCP_SERVERS"; payload: MCPServerInfo[] }
  | { type: "UPDATE_MCP_SERVER"; payload: { name: string; updates: Partial<MCPServerInfo> } }
  | { type: "SET_LSP_SERVERS"; payload: LSPServerInfo[] }
  | { type: "UPDATE_LSP_SERVER"; payload: { name: string; updates: Partial<LSPServerInfo> } }
  | { type: "ADD_TODO"; payload: TodoItem }
  | { type: "UPDATE_TODO"; payload: { id: string; updates: Partial<TodoItem> } }
  | { type: "REMOVE_TODO"; payload: string }
  | { type: "SET_TODOS"; payload: TodoItem[] }
  | { type: "ADD_MODIFIED_FILE"; payload: ModifiedFile }
  | { type: "REMOVE_MODIFIED_FILE"; payload: string }
  | { type: "SET_MODIFIED_FILES"; payload: ModifiedFile[] }
  | { type: "SET_GIT_STATUS"; payload: { branch?: string; status?: SessionState["gitStatus"] } }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" }
  | { type: "RESET" };

// ═══════════════════════════════════════════════════════════════════════════
// Session Reducer
// ═══════════════════════════════════════════════════════════════════════════

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.payload, updatedAt: Date.now() };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        undoStack: [...state.undoStack, state.messages],
        redoStack: [],
        updatedAt: Date.now(),
      };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
        updatedAt: Date.now(),
      };

    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.payload),
        undoStack: [...state.undoStack, state.messages],
        redoStack: [],
        updatedAt: Date.now(),
      };

    case "SET_STREAMING_CONTENT":
      return { ...state, streamingContent: action.payload };

    case "SET_STATUS":
      return { ...state, status: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, status: action.payload ? "error" : state.status };

    case "UPDATE_TOKENS":
      return {
        ...state,
        inputTokens: state.inputTokens + (action.payload.input || 0),
        outputTokens: state.outputTokens + (action.payload.output || 0),
        contextTokens: state.contextTokens + (action.payload.input || 0) + (action.payload.output || 0),
        cost: state.cost + (action.payload.cost || 0),
      };

    case "SET_MODEL":
      return { ...state, provider: action.payload.provider, model: action.payload.model };

    case "SET_AGENT":
      return { ...state, agent: action.payload };

    case "ADD_SUB_AGENT":
      return {
        ...state,
        subAgents: [...state.subAgents, action.payload],
      };

    case "UPDATE_SUB_AGENT":
      return {
        ...state,
        subAgents: state.subAgents.map((a) =>
          a.name === action.payload.name ? { ...a, ...action.payload.updates } : a
        ),
      };

    case "REMOVE_SUB_AGENT":
      return {
        ...state,
        subAgents: state.subAgents.filter((a) => a.name !== action.payload),
      };

    case "SET_MCP_SERVERS":
      return { ...state, mcpServers: action.payload };

    case "UPDATE_MCP_SERVER":
      return {
        ...state,
        mcpServers: state.mcpServers.map((s) =>
          s.name === action.payload.name ? { ...s, ...action.payload.updates } : s
        ),
      };

    case "SET_LSP_SERVERS":
      return { ...state, lspServers: action.payload };

    case "UPDATE_LSP_SERVER":
      return {
        ...state,
        lspServers: state.lspServers.map((s) =>
          s.name === action.payload.name ? { ...s, ...action.payload.updates } : s
        ),
      };

    case "ADD_TODO":
      return { ...state, todos: [...state.todos, action.payload] };

    case "UPDATE_TODO":
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };

    case "REMOVE_TODO":
      return { ...state, todos: state.todos.filter((t) => t.id !== action.payload) };

    case "SET_TODOS":
      return { ...state, todos: action.payload };

    case "ADD_MODIFIED_FILE":
      return {
        ...state,
        modifiedFiles: state.modifiedFiles.some((f) => f.path === action.payload.path)
          ? state.modifiedFiles.map((f) => f.path === action.payload.path ? action.payload : f)
          : [...state.modifiedFiles, action.payload],
      };

    case "REMOVE_MODIFIED_FILE":
      return {
        ...state,
        modifiedFiles: state.modifiedFiles.filter((f) => f.path !== action.payload),
      };

    case "SET_MODIFIED_FILES":
      return { ...state, modifiedFiles: action.payload };

    case "SET_GIT_STATUS":
      return {
        ...state,
        gitBranch: action.payload.branch ?? state.gitBranch,
        gitStatus: action.payload.status ?? state.gitStatus,
      };

    case "UNDO":
      if (state.undoStack.length === 0) return state;
      const undoMessages = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        messages: undoMessages,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.messages],
      };

    case "REDO":
      if (state.redoStack.length === 0) return state;
      const redoMessages = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        messages: redoMessages,
        undoStack: [...state.undoStack, state.messages],
        redoStack: state.redoStack.slice(0, -1),
      };

    case "CLEAR":
      return {
        ...state,
        messages: [],
        streamingContent: "",
        status: "idle",
        error: undefined,
        undoStack: [...state.undoStack, state.messages],
        redoStack: [],
      };

    case "RESET":
      return createInitialState(state.id);

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Initial State Factory
// ═══════════════════════════════════════════════════════════════════════════

function createInitialState(sessionId?: string): SessionState {
  const id = sessionId || `session-${Date.now()}`;
  return {
    id,
    title: "New Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    streamingContent: "",
    status: "idle",
    contextTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    maxContextTokens: 128000,
    cost: 0,
    provider: "ollama",
    model: "rnj-1",
    agent: "default",
    subAgents: [],
    mcpServers: [],
    lspServers: [],
    todos: [],
    modifiedFiles: [],
    undoStack: [],
    redoStack: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;

  // Convenience methods
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setStreaming: (content: string) => void;
  setStatus: (status: SessionState["status"]) => void;
  setError: (error: string | undefined) => void;
  updateTokens: (tokens: { input?: number; output?: number; cost?: number }) => void;
  
  // Sub-agent management
  spawnAgent: (agent: Omit<SubAgentInfo, "status">) => void;
  updateAgent: (name: string, updates: Partial<SubAgentInfo>) => void;
  stopAgent: (name: string) => void;

  // Todo management
  addTodo: (content: string, priority?: TodoItem["priority"]) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  completeTodo: (id: string) => void;

  // File tracking
  trackFile: (file: ModifiedFile) => void;
  untrackFile: (path: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Reset
  clear: () => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════

interface SessionProviderProps {
  children: ReactNode;
  sessionId?: string;
  initialProvider?: string;
  initialModel?: string;
}

export function SessionProvider({
  children,
  sessionId,
  initialProvider = "ollama",
  initialModel = "rnj-1",
}: SessionProviderProps) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    { sessionId, initialProvider, initialModel },
    (init) => ({
      ...createInitialState(init.sessionId),
      provider: init.initialProvider,
      model: init.initialModel,
    })
  );

  // Convenience methods
  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      },
    });
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    dispatch({ type: "UPDATE_MESSAGE", payload: { id, updates } });
  }, []);

  const setStreaming = useCallback((content: string) => {
    dispatch({ type: "SET_STREAMING_CONTENT", payload: content });
  }, []);

  const setStatus = useCallback((status: SessionState["status"]) => {
    dispatch({ type: "SET_STATUS", payload: status });
  }, []);

  const setError = useCallback((error: string | undefined) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const updateTokens = useCallback((tokens: { input?: number; output?: number; cost?: number }) => {
    dispatch({ type: "UPDATE_TOKENS", payload: tokens });
  }, []);

  // Sub-agent management
  const spawnAgent = useCallback((agent: Omit<SubAgentInfo, "status">) => {
    dispatch({
      type: "ADD_SUB_AGENT",
      payload: { ...agent, status: "idle" },
    });
  }, []);

  const updateAgent = useCallback((name: string, updates: Partial<SubAgentInfo>) => {
    dispatch({ type: "UPDATE_SUB_AGENT", payload: { name, updates } });
  }, []);

  const stopAgent = useCallback((name: string) => {
    dispatch({ type: "UPDATE_SUB_AGENT", payload: { name, updates: { status: "idle" } } });
  }, []);

  // Todo management
  const addTodo = useCallback((content: string, priority?: TodoItem["priority"]) => {
    dispatch({
      type: "ADD_TODO",
      payload: {
        id: `todo-${Date.now()}`,
        content,
        status: "pending",
        priority,
      },
    });
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<TodoItem>) => {
    dispatch({ type: "UPDATE_TODO", payload: { id, updates } });
  }, []);

  const completeTodo = useCallback((id: string) => {
    dispatch({ type: "UPDATE_TODO", payload: { id, updates: { status: "completed" } } });
  }, []);

  // File tracking
  const trackFile = useCallback((file: ModifiedFile) => {
    dispatch({ type: "ADD_MODIFIED_FILE", payload: file });
  }, []);

  const untrackFile = useCallback((path: string) => {
    dispatch({ type: "REMOVE_MODIFIED_FILE", payload: path });
  }, []);

  // History
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  // Reset
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo<SessionContextValue>(() => ({
    state,
    dispatch,
    addMessage,
    updateMessage,
    setStreaming,
    setStatus,
    setError,
    updateTokens,
    spawnAgent,
    updateAgent,
    stopAgent,
    addTodo,
    updateTodo,
    completeTodo,
    trackFile,
    untrackFile,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    reset,
  }), [
    state,
    addMessage,
    updateMessage,
    setStreaming,
    setStatus,
    setError,
    updateTokens,
    spawnAgent,
    updateAgent,
    stopAgent,
    addTodo,
    updateTodo,
    completeTodo,
    trackFile,
    untrackFile,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    reset,
  ]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// Selectors (for performance optimization)
// ═══════════════════════════════════════════════════════════════════════════

export function useSessionMessages() {
  const { state } = useSession();
  return state.messages;
}

export function useSessionStatus() {
  const { state } = useSession();
  return {
    status: state.status,
    error: state.error,
    isLoading: state.status === "thinking" || state.status === "streaming" || state.status === "tool_calling",
  };
}

export function useSessionTokens() {
  const { state } = useSession();
  return {
    input: state.inputTokens,
    output: state.outputTokens,
    total: state.contextTokens,
    max: state.maxContextTokens,
    percentage: Math.round((state.contextTokens / state.maxContextTokens) * 100),
    cost: state.cost,
  };
}

export function useSessionAgents() {
  const { state, spawnAgent, updateAgent, stopAgent } = useSession();
  return {
    agents: state.subAgents,
    spawnAgent,
    updateAgent,
    stopAgent,
    runningCount: state.subAgents.filter((a) => 
      ["running", "thinking", "tool_calling"].includes(a.status)
    ).length,
  };
}

export function useSessionTodos() {
  const { state, addTodo, updateTodo, completeTodo } = useSession();
  return {
    todos: state.todos,
    addTodo,
    updateTodo,
    completeTodo,
    completedCount: state.todos.filter((t) => t.status === "completed").length,
    totalCount: state.todos.length,
  };
}

export default SessionProvider;

import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { useTheme } from "../../context/theme";
import { useRouteData } from "../../context/route";
import { useToast } from "../../context/toast";
import { useCommandRegistration } from "../../context/command";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MessageList, type Message } from "./MessageList";
import { AdvancedPrompt } from "../../component/prompt/AdvancedPrompt";
import { Sidebar } from "../../component/Sidebar";
import { ToastContainer } from "../../ui/Toast";
import type { PromptPart } from "../../component/prompt/FileReference";

interface SessionProps {
  provider?: string;
  model?: string;
  agent?: string;
  onSendMessage?: (message: string, sessionId: string, parts?: PromptPart[]) => Promise<string>;
}

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
}

interface SubAgent {
  name: string;
  type: string;
  status: "idle" | "running" | "completed";
}

export function Session({
  provider = "ollama",
  model = "rnj-1",
  agent = "default",
  onSendMessage,
}: SessionProps) {
  const { theme } = useTheme();
  const route = useRouteData("session");
  const toast = useToast();
  const { stdout } = useStdout();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [title, setTitle] = useState("New Session");
  const [status, setStatus] = useState<"idle" | "thinking" | "streaming" | "error">("idle");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Session state
  const [contextTokens, setContextTokens] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<{ path: string; additions: number; deletions: number }[]>([]);

  // Toggle sidebar
  useInput((input, key) => {
    if (key.ctrl && input === "b") {
      setSidebarVisible((prev) => !prev);
    }
  });

  // Register session-specific commands
  useCommandRegistration("session", () => [
    {
      id: "session.clear",
      title: "Clear Messages",
      category: "Session",
      onSelect: () => {
        setMessages([]);
        toast.info("Messages cleared");
      },
    },
    {
      id: "session.rename",
      title: "Rename Session",
      category: "Session",
      onSelect: () => {
        toast.info("Rename not implemented yet");
      },
    },
    {
      id: "session.undo",
      title: "Undo Last Message",
      category: "Session",
      disabled: messages.length === 0,
      onSelect: () => {
        if (messages.length >= 2) {
          setMessages((prev) => prev.slice(0, -2));
          toast.info("Undone");
        }
      },
    },
    {
      id: "session.redo",
      title: "Redo Message",
      category: "Session",
      onSelect: () => {
        toast.info("Redo not available");
      },
    },
    {
      id: "session.copy",
      title: "Copy Transcript",
      category: "Session",
      onSelect: () => {
        const transcript = messages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n");
        // Copy to clipboard would go here
        toast.success("Transcript copied");
      },
    },
    {
      id: "session.export",
      title: "Export Session",
      category: "Session",
      onSelect: () => {
        toast.info("Export not implemented yet");
      },
    },
    {
      id: "session.timeline",
      title: "Show Timeline",
      category: "Session",
      onSelect: () => {
        toast.info(`${messages.length} messages in timeline`);
      },
    },
    {
      id: "session.fork",
      title: "Fork Session",
      category: "Session",
      onSelect: () => {
        toast.info("Fork not implemented yet");
      },
    },
    {
      id: "sidebar.toggle",
      title: sidebarVisible ? "Hide Sidebar" : "Show Sidebar",
      category: "View",
      keybind: "ctrl+b",
      onSelect: () => setSidebarVisible((prev) => !prev),
    },
  ], [messages, sidebarVisible, toast]);

  const handleSubmit = useCallback(async (input: string, parts?: PromptPart[]) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStatus("thinking");
    setContextTokens((prev) => prev + input.split(/\s+/).length * 2);

    // Check for agent mentions
    const agentMentions = parts?.filter((p) => p.type === "agent") || [];
    if (agentMentions.length > 0) {
      // Add subagents
      setSubAgents(agentMentions.map((a) => ({
        name: (a as any).name,
        type: "agent",
        status: "running" as const,
      })));
    }

    try {
      if (onSendMessage) {
        const response = await onSendMessage(input, route.sessionID, parts);
        
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setContextTokens((prev) => prev + response.split(/\s+/).length * 2);

        // Update title from first response
        if (messages.length === 0) {
          const firstLine = response.split("\n")[0].slice(0, 50);
          setTitle(firstLine || "Session");
        }
      } else {
        // Demo response
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `I received your message: "${input}"${parts && parts.length > 0 ? `\n\nReferences: ${parts.map((p) => p.type).join(", ")}` : ""}`,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }

      // Mark subagents as completed
      setSubAgents((prev) => prev.map((a) => ({ ...a, status: "completed" as const })));
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      toast.error(error instanceof Error ? error : "Failed to get response");
      setSubAgents((prev) => prev.map((a) => ({ ...a, status: "idle" as const })));
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [route.sessionID, onSendMessage, toast, messages.length]);

  const terminalHeight = stdout?.rows ?? 24;
  const terminalWidth = stdout?.columns ?? 80;
  const sidebarWidth = 35;
  const mainWidth = sidebarVisible ? terminalWidth - sidebarWidth - 2 : terminalWidth;

  // Calculate context percentage
  const contextPercentage = Math.min(Math.round((contextTokens / 128000) * 100), 100);

  return (
    <Box flexDirection="row" height={terminalHeight}>
      {/* Main content */}
      <Box flexDirection="column" width={mainWidth} flexGrow={1}>
        <Header
          title={title}
          model={model}
          provider={provider}
          status={status}
        />

        <MessageList
          messages={messages}
          isLoading={isLoading}
          streamingContent={streamingContent}
        />

        <Box paddingX={2} paddingY={1}>
          <AdvancedPrompt
            sessionId={route.sessionID}
            placeholder="Continue the conversation..."
            onSubmit={handleSubmit}
            disabled={isLoading}
            agent={agent}
            model={model}
            provider={provider}
          />
        </Box>

        <Footer 
          tokenCount={contextTokens > 0 ? { input: contextTokens, output: 0 } : undefined}
        />
      </Box>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        width={sidebarWidth}
        sessionTitle={title}
        contextTokens={contextTokens}
        contextPercentage={contextPercentage}
        cost={`$${(contextTokens * 0.000001).toFixed(4)}`}
        agents={subAgents}
        todos={todos}
        modifiedFiles={modifiedFiles}
        mcpServers={[
          { name: "gemini-cli", status: "connected" },
          { name: "codex-cli", status: "connected" },
        ]}
      />

      <ToastContainer />
    </Box>
  );
}

export { Header } from "./Header";
export { Footer } from "./Footer";
export { MessageList, type Message } from "./MessageList";

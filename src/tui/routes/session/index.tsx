import React, { useState, useCallback } from "react";
import { Box, useStdout } from "ink";
import { useTheme } from "../../context/theme";
import { useRouteData } from "../../context/route";
import { useToast } from "../../context/toast";
import { useCommands } from "../../context/command";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MessageList, type Message } from "./MessageList";
import { Prompt } from "../../component/prompt/Prompt";
import { ToastContainer } from "../../ui/Toast";

interface SessionProps {
  provider?: string;
  model?: string;
  onSendMessage?: (message: string, sessionId: string) => Promise<string>;
}

export function Session({
  provider = "ollama",
  model = "rnj-1",
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

  // Register session-specific commands
  useCommands([
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
        // TODO: Show rename dialog
        toast.info("Rename not implemented yet");
      },
    },
  ], []);

  const handleSubmit = useCallback(async (input: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStatus("thinking");

    try {
      if (onSendMessage) {
        const response = await onSendMessage(input, route.sessionID);
        
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Demo response
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `Echo: ${input}`,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }

      setStatus("idle");
    } catch (error) {
      setStatus("error");
      toast.error(error instanceof Error ? error : "Failed to get response");
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [route.sessionID, onSendMessage, toast]);

  const terminalHeight = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={terminalHeight}>
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
        <Prompt
          placeholder="Continue the conversation..."
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </Box>

      <Footer />

      <ToastContainer />
    </Box>
  );
}

export { Header } from "./Header";
export { Footer } from "./Footer";
export { MessageList, type Message } from "./MessageList";

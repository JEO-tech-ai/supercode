import { Show, createMemo } from "solid-js";

interface MessagePartProps {
  content: string;
  role: "user" | "assistant" | "system" | "tool";
}

export function MessagePart(props: MessagePartProps) {
  const parts = createMemo(() => parseContent(props.content));

  return (
    <div class="space-y-2">
      <Show when={parts().length > 0} fallback={<TextPart text={props.content} />}>
        {parts().map((part) => (
          <Show
            when={part.type === "code"}
            fallback={<TextPart text={part.content} />}
          >
            <CodeBlock code={part.content} language={part.language} />
          </Show>
        ))}
      </Show>
    </div>
  );
}

interface ParsedPart {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseContent(content: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "code",
      language: match[1] || "text",
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return parts;
}

function TextPart(props: { text: string }) {
  const lines = createMemo(() => props.text.split("\n"));

  return (
    <div class="whitespace-pre-wrap">
      {lines().map((line, index) => (
        <>
          {formatInlineText(line)}
          <Show when={index < lines().length - 1}>
            <br />
          </Show>
        </>
      ))}
    </div>
  );
}

function formatInlineText(text: string): (string | HTMLElement)[] {
  const parts: (string | HTMLElement)[] = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <code class="rounded bg-muted px-1 py-0.5 font-mono text-sm">
        {match[1]}
      </code> as unknown as HTMLElement
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock(props: CodeBlockProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(props.code);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div class="overflow-hidden rounded-lg border border-border bg-muted">
      <div class="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <span class="text-xs text-muted-foreground">
          {props.language || "text"}
        </span>
        <button
          onClick={handleCopy}
          class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Copy code"
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
      <pre class="overflow-x-auto p-4">
        <code class="font-mono text-sm">{props.code}</code>
      </pre>
    </div>
  );
}

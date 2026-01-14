import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import TurndownService from "turndown";

const MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30 * 1000;
const MAX_TIMEOUT_MS = 120 * 1000;

const DESCRIPTION = `Fetches content from a specified URL and returns it in the requested format.

Usage:
- The URL must be a fully-formed valid URL
- HTTP URLs will be automatically upgraded to HTTPS
- Format options: "markdown" (default), "text", or "html"
- This tool is read-only and does not modify any files
- Results may be summarized if the content is very large

IMPORTANT: Use this tool when you need to retrieve and analyze web content.`;

export const webfetchTool: ToolDefinition = {
  name: "webfetch",
  description: DESCRIPTION,
  parameters: [
    {
      name: "url",
      type: "string",
      description: "The URL to fetch content from",
      required: true,
    },
    {
      name: "format",
      type: "string",
      description:
        'The format to return the content in (text, markdown, or html). Defaults to markdown.',
      required: false,
      default: "markdown",
    },
    {
      name: "timeout",
      type: "number",
      description: "Optional timeout in seconds (max 120)",
      required: false,
    },
  ],

  async execute(
    args: Record<string, unknown>,
    _context: ToolContext
  ): Promise<ToolResult> {
    const url = args.url as string;
    const format = (args.format as string) || "markdown";
    const timeoutSeconds = args.timeout as number | undefined;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return {
        success: false,
        error: "URL must start with http:// or https://",
      };
    }

    const timeout = Math.min(
      (timeoutSeconds ?? DEFAULT_TIMEOUT_MS / 1000) * 1000,
      MAX_TIMEOUT_MS
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const acceptHeader = getAcceptHeader(format);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: acceptHeader,
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Request failed with status code: ${response.status}`,
        };
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE_BYTES) {
        return {
          success: false,
          error: "Response too large (exceeds 5MB limit)",
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE_BYTES) {
        return {
          success: false,
          error: "Response too large (exceeds 5MB limit)",
        };
      }

      const content = new TextDecoder().decode(arrayBuffer);
      const contentType = response.headers.get("content-type") || "";
      const title = `${url} (${contentType})`;

      const output = formatContent(content, format, contentType);

      return {
        success: true,
        output,
        data: {
          url,
          contentType,
          title,
          format,
          size: arrayBuffer.byteLength,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: `Request timed out after ${timeout / 1000} seconds`,
        };
      }

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

function getAcceptHeader(format: string): string {
  switch (format) {
    case "markdown":
      return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
    case "text":
      return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
    case "html":
      return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
    default:
      return "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
  }
}

function formatContent(content: string, format: string, contentType: string): string {
  const isHtml = contentType.includes("text/html");

  switch (format) {
    case "markdown":
      return isHtml ? convertHTMLToMarkdown(content) : content;
    case "text":
      return isHtml ? extractTextFromHTML(content) : content;
    case "html":
    default:
      return content;
  }
}

function extractTextFromHTML(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  text = text
    .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function convertHTMLToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndownService.remove(["script", "style", "meta", "link"]);
  return turndownService.turndown(html);
}

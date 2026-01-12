/**
 * Antigravity Response Handler
 * Transforms Antigravity/Gemini API responses to OpenAI-compatible format
 */

import type { AntigravityError, AntigravityUsage } from "./types";

/**
 * Usage metadata extracted from Antigravity response headers
 */
export interface AntigravityUsageMetadata {
  cachedContentTokenCount?: number;
  totalTokenCount?: number;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

/**
 * Transform result with response and metadata
 */
export interface TransformResult {
  response: Response;
  usage?: AntigravityUsageMetadata;
  retryAfterMs?: number;
  error?: AntigravityError;
}

/**
 * Extract usage metadata from Antigravity response headers
 */
export function extractUsageFromHeaders(headers: Headers): AntigravityUsageMetadata | undefined {
  const cached = headers.get("x-antigravity-cached-content-token-count");
  const total = headers.get("x-antigravity-total-token-count");
  const prompt = headers.get("x-antigravity-prompt-token-count");
  const candidates = headers.get("x-antigravity-candidates-token-count");

  if (!cached && !total && !prompt && !candidates) {
    return undefined;
  }

  const usage: AntigravityUsageMetadata = {};

  if (cached) {
    const parsed = parseInt(cached, 10);
    if (!isNaN(parsed)) {
      usage.cachedContentTokenCount = parsed;
    }
  }

  if (total) {
    const parsed = parseInt(total, 10);
    if (!isNaN(parsed)) {
      usage.totalTokenCount = parsed;
    }
  }

  if (prompt) {
    const parsed = parseInt(prompt, 10);
    if (!isNaN(parsed)) {
      usage.promptTokenCount = parsed;
    }
  }

  if (candidates) {
    const parsed = parseInt(candidates, 10);
    if (!isNaN(parsed)) {
      usage.candidatesTokenCount = parsed;
    }
  }

  return Object.keys(usage).length > 0 ? usage : undefined;
}

/**
 * Extract retry-after value from error response
 */
export function extractRetryAfterMs(
  response: Response,
  errorBody?: Record<string, unknown>
): number | undefined {
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const seconds = parseFloat(retryAfterHeader);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const retryAfterMsHeader = response.headers.get("retry-after-ms");
  if (retryAfterMsHeader) {
    const ms = parseInt(retryAfterMsHeader, 10);
    if (!isNaN(ms) && ms > 0) {
      return ms;
    }
  }

  if (!errorBody) {
    return undefined;
  }

  const error = errorBody.error as Record<string, unknown> | undefined;
  if (!error?.details || !Array.isArray(error.details)) {
    return undefined;
  }

  const retryInfo = (error.details as Array<Record<string, unknown>>).find(
    (detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  );

  if (!retryInfo?.retryDelay || typeof retryInfo.retryDelay !== "string") {
    return undefined;
  }

  const match = retryInfo.retryDelay.match(/^([\d.]+)s$/);
  if (match?.[1]) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return undefined;
}

/**
 * Parse error response body
 */
export function parseErrorBody(text: string): AntigravityError | undefined {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;

    if (parsed.error && typeof parsed.error === "object") {
      const errorObj = parsed.error as Record<string, unknown>;
      return {
        message: String(errorObj.message || "Unknown error"),
        type: errorObj.type ? String(errorObj.type) : undefined,
        code: errorObj.code as string | number | undefined,
      };
    }

    if (parsed.message && typeof parsed.message === "string") {
      return {
        message: parsed.message,
        type: parsed.type ? String(parsed.type) : undefined,
        code: parsed.code as string | number | undefined,
      };
    }

    return undefined;
  } catch {
    return {
      message: text || "Unknown error",
    };
  }
}

/**
 * Transform a non-streaming Antigravity response to OpenAI-compatible format
 */
export async function transformResponse(response: Response): Promise<TransformResult> {
  const headers = new Headers(response.headers);
  const usage = extractUsageFromHeaders(headers);

  if (!response.ok) {
    const text = await response.text();
    const error = parseErrorBody(text);
    const retryAfterMs = extractRetryAfterMs(response, error ? { error } : undefined);

    let errorBody: Record<string, unknown> | undefined;
    try {
      errorBody = JSON.parse(text) as Record<string, unknown>;
    } catch {
      errorBody = { error: { message: text } };
    }

    const retryMs = extractRetryAfterMs(response, errorBody) ?? retryAfterMs;

    if (retryMs) {
      headers.set("Retry-After", String(Math.ceil(retryMs / 1000)));
      headers.set("retry-after-ms", String(retryMs));
    }

    return {
      response: new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
      usage,
      retryAfterMs: retryMs,
      error,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    return { response, usage };
  }

  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;

    let transformedBody: unknown = parsed;
    if (parsed.response !== undefined) {
      transformedBody = parsed.response;
    }

    return {
      response: new Response(JSON.stringify(transformedBody), {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
      usage,
    };
  } catch {
    return { response, usage };
  }
}

/**
 * Transform a single SSE data line
 */
function transformSseLine(line: string): string {
  if (!line.startsWith("data:")) {
    return line;
  }

  const json = line.slice(5).trim();
  if (!json || json === "[DONE]") {
    return line;
  }

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;

    if (parsed.response !== undefined) {
      return `data: ${JSON.stringify(parsed.response)}`;
    }

    return line;
  } catch {
    return line;
  }
}

/**
 * Transform SSE streaming payload
 */
export function transformStreamingPayload(payload: string): string {
  return payload.split("\n").map(transformSseLine).join("\n");
}

function createSseTransformStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const transformed = transformSseLine(line);
        controller.enqueue(encoder.encode(transformed + "\n"));
      }
    },
    flush(controller) {
      if (buffer) {
        const transformed = transformSseLine(buffer);
        controller.enqueue(encoder.encode(transformed));
      }
    },
  });
}

/**
 * Transforms a streaming SSE response from Antigravity to OpenAI format
 */
export async function transformStreamingResponse(response: Response): Promise<TransformResult> {
  const headers = new Headers(response.headers);
  const usage = extractUsageFromHeaders(headers);

  if (!response.ok) {
    const text = await response.text();
    const error = parseErrorBody(text);

    let errorBody: Record<string, unknown> | undefined;
    try {
      errorBody = JSON.parse(text) as Record<string, unknown>;
    } catch {
      errorBody = { error: { message: text } };
    }

    const retryAfterMs = extractRetryAfterMs(response, errorBody);

    if (retryAfterMs) {
      headers.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      headers.set("retry-after-ms", String(retryAfterMs));
    }

    return {
      response: new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
      usage,
      retryAfterMs,
      error,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isEventStream =
    contentType.includes("text/event-stream") || response.url.includes("alt=sse");

  if (!isEventStream) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      let transformedBody: unknown = parsed;
      if (parsed.response !== undefined) {
        transformedBody = parsed.response;
      }
      return {
        response: new Response(JSON.stringify(transformedBody), {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
        usage,
      };
    } catch {
      return {
        response: new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }),
        usage,
      };
    }
  }

  if (!response.body) {
    return { response, usage };
  }

  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type", "text/event-stream; charset=utf-8");

  const transformStream = createSseTransformStream();
  const transformedBody = response.body.pipeThrough(transformStream);

  return {
    response: new Response(transformedBody, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
    usage,
  };
}

/**
 * Check if response is a streaming SSE response
 */
export function isStreamingResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/event-stream") || response.url.includes("alt=sse");
}

/**
 * Extract thought signature from SSE payload text
 */
export function extractSignatureFromSsePayload(payload: string): string | undefined {
  const lines = payload.split("\n");
  let lastSignature: string | undefined;

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const json = line.slice(5).trim();
    if (!json || json === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;

      const response = (parsed.response || parsed) as Record<string, unknown>;
      const candidates = response.candidates as Array<Record<string, unknown>> | undefined;

      if (candidates && Array.isArray(candidates)) {
        for (const candidate of candidates) {
          const content = candidate.content as Record<string, unknown> | undefined;
          const parts = content?.parts as Array<Record<string, unknown>> | undefined;

          if (parts && Array.isArray(parts)) {
            for (const part of parts) {
              const sig = (part.thoughtSignature || part.thought_signature) as string | undefined;
              if (sig && typeof sig === "string") {
                lastSignature = sig;
              }
            }
          }
        }
      }
    } catch {
      // Continue to next line
    }
  }

  return lastSignature;
}

/**
 * Extract usage from SSE payload text
 */
export function extractUsageFromSsePayload(payload: string): AntigravityUsage | undefined {
  const lines = payload.split("\n");

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const json = line.slice(5).trim();
    if (!json || json === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;

      if (parsed.usageMetadata && typeof parsed.usageMetadata === "object") {
        const meta = parsed.usageMetadata as Record<string, unknown>;
        return {
          prompt_tokens: typeof meta.promptTokenCount === "number" ? meta.promptTokenCount : 0,
          completion_tokens:
            typeof meta.candidatesTokenCount === "number" ? meta.candidatesTokenCount : 0,
          total_tokens: typeof meta.totalTokenCount === "number" ? meta.totalTokenCount : 0,
        };
      }

      if (parsed.response && typeof parsed.response === "object") {
        const resp = parsed.response as Record<string, unknown>;
        if (resp.usageMetadata && typeof resp.usageMetadata === "object") {
          const meta = resp.usageMetadata as Record<string, unknown>;
          return {
            prompt_tokens: typeof meta.promptTokenCount === "number" ? meta.promptTokenCount : 0,
            completion_tokens:
              typeof meta.candidatesTokenCount === "number" ? meta.candidatesTokenCount : 0,
            total_tokens: typeof meta.totalTokenCount === "number" ? meta.totalTokenCount : 0,
          };
        }
      }

      if (parsed.usage && typeof parsed.usage === "object") {
        const u = parsed.usage as Record<string, unknown>;
        return {
          prompt_tokens: typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0,
          completion_tokens: typeof u.completion_tokens === "number" ? u.completion_tokens : 0,
          total_tokens: typeof u.total_tokens === "number" ? u.total_tokens : 0,
        };
      }
    } catch {
      // Continue to next line
    }
  }

  return undefined;
}

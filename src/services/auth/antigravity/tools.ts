/**
 * Antigravity Tool Normalization
 * Converts tools between OpenAI and Gemini formats.
 */

/**
 * OpenAI function tool format
 */
export interface OpenAITool {
  type: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Gemini function declaration format
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Gemini tools format
 */
export interface GeminiTools {
  functionDeclarations: GeminiFunctionDeclaration[];
}

/**
 * OpenAI tool call in response
 */
export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Gemini function call in response
 */
export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Gemini function response format
 */
export interface GeminiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

/**
 * Gemini tool result containing function calls
 */
export interface GeminiToolResult {
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}

/**
 * Normalize OpenAI-format tools to Gemini format
 */
export function normalizeToolsForGemini(tools: OpenAITool[]): GeminiTools | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const functionDeclarations: GeminiFunctionDeclaration[] = [];

  for (const tool of tools) {
    if (!tool || typeof tool !== "object") {
      continue;
    }

    const toolType = tool.type ?? "function";
    if (toolType === "function" && tool.function) {
      const declaration: GeminiFunctionDeclaration = {
        name: tool.function.name,
      };

      if (tool.function.description) {
        declaration.description = tool.function.description;
      }

      if (tool.function.parameters) {
        declaration.parameters = tool.function.parameters;
      } else {
        declaration.parameters = { type: "object", properties: {} };
      }

      functionDeclarations.push(declaration);
    } else if (toolType !== "function" && process.env.ANTIGRAVITY_DEBUG === "1") {
      console.warn(`[antigravity-tools] Unsupported tool type: "${toolType}". Tool will be skipped.`);
    }
  }

  if (functionDeclarations.length === 0) {
    return undefined;
  }

  return { functionDeclarations };
}

/**
 * Convert Gemini tool results back to OpenAI tool_call format
 */
export function normalizeToolResultsFromGemini(results: GeminiToolResult[]): OpenAIToolCall[] {
  if (!results || results.length === 0) {
    return [];
  }

  const toolCalls: OpenAIToolCall[] = [];
  let callCounter = 0;

  for (const result of results) {
    if (result.functionCall) {
      callCounter++;
      const toolCall: OpenAIToolCall = {
        id: `call_${Date.now()}_${callCounter}`,
        type: "function",
        function: {
          name: result.functionCall.name,
          arguments: JSON.stringify(result.functionCall.args ?? {}),
        },
      };
      toolCalls.push(toolCall);
    }
  }

  return toolCalls;
}

/**
 * Convert a single Gemini functionCall to OpenAI tool_call format
 */
export function convertFunctionCallToToolCall(
  functionCall: GeminiFunctionCall,
  id?: string
): OpenAIToolCall {
  return {
    id: id ?? `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "function",
    function: {
      name: functionCall.name,
      arguments: JSON.stringify(functionCall.args ?? {}),
    },
  };
}

/**
 * Check if a tool array contains any function-type tools
 */
export function hasFunctionTools(tools: OpenAITool[]): boolean {
  if (!tools || tools.length === 0) {
    return false;
  }

  return tools.some((tool) => tool.type === "function" && tool.function);
}

/**
 * Extract function declarations from already-normalized Gemini tools
 */
export function extractFunctionDeclarations(tools: unknown): GeminiFunctionDeclaration[] {
  if (!tools || typeof tools !== "object") {
    return [];
  }

  const geminiTools = tools as Record<string, unknown>;
  if (
    Array.isArray(geminiTools.functionDeclarations) &&
    geminiTools.functionDeclarations.length > 0
  ) {
    return geminiTools.functionDeclarations as GeminiFunctionDeclaration[];
  }

  if (Array.isArray(tools)) {
    const normalized = normalizeToolsForGemini(tools as OpenAITool[]);
    return normalized?.functionDeclarations ?? [];
  }

  return [];
}

/**
 * Antigravity Thinking Block Handler (Gemini only)
 *
 * Handles extraction and transformation of thinking/reasoning blocks
 * from Gemini responses. Available in `-high` model variants.
 */

/**
 * Represents a single thinking/reasoning block
 */
export interface ThinkingBlock {
  text: string;
  signature?: string;
  index?: number;
}

/**
 * Raw part structure from Gemini response
 */
export interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  type?: string;
  signature?: string;
}

/**
 * Gemini response candidate structure
 */
export interface GeminiCandidate {
  content?: {
    role?: string;
    parts?: GeminiPart[];
  };
  index?: number;
}

/**
 * Gemini response structure
 */
export interface GeminiResponse {
  id?: string;
  candidates?: GeminiCandidate[];
  content?: Array<{
    type?: string;
    text?: string;
    signature?: string;
  }>;
  model?: string;
}

/**
 * Result of thinking block extraction
 */
export interface ThinkingExtractionResult {
  thinkingBlocks: ThinkingBlock[];
  combinedThinking: string;
  hasThinking: boolean;
}

export const DEFAULT_THINKING_BUDGET = 16000;

/**
 * Check if a model variant should include thinking blocks
 */
export function shouldIncludeThinking(model: string): boolean {
  if (!model || typeof model !== "string") {
    return false;
  }

  const lowerModel = model.toLowerCase();
  return lowerModel.endsWith("-high") || lowerModel.includes("thinking");
}

/**
 * Check if a model is thinking-capable
 */
export function isThinkingCapableModel(model: string): boolean {
  if (!model || typeof model !== "string") {
    return false;
  }

  const lowerModel = model.toLowerCase();
  return (
    lowerModel.includes("thinking") ||
    lowerModel.includes("gemini-3") ||
    lowerModel.endsWith("-high")
  );
}

function isThinkingPart(part: GeminiPart): boolean {
  if (part.thought === true) {
    return true;
  }
  if (part.type === "thinking" || part.type === "reasoning") {
    return true;
  }
  return false;
}

function hasValidSignature(part: GeminiPart): boolean {
  if (part.thought === true && part.thoughtSignature) {
    return true;
  }
  if ((part.type === "thinking" || part.type === "reasoning") && part.signature) {
    return true;
  }
  return false;
}

/**
 * Extract thinking blocks from a Gemini response
 */
export function extractThinkingBlocks(response: GeminiResponse): ThinkingExtractionResult {
  const thinkingBlocks: ThinkingBlock[] = [];

  if (response.candidates && Array.isArray(response.candidates)) {
    for (const candidate of response.candidates) {
      const parts = candidate.content?.parts;
      if (!parts || !Array.isArray(parts)) {
        continue;
      }

      for (const part of parts) {
        if (!part || typeof part !== "object") {
          continue;
        }

        if (isThinkingPart(part)) {
          const block: ThinkingBlock = {
            text: part.text || "",
            index: thinkingBlocks.length,
          };

          if (part.thought === true && part.thoughtSignature) {
            block.signature = part.thoughtSignature;
          } else if (part.signature) {
            block.signature = part.signature;
          }

          thinkingBlocks.push(block);
        }
      }
    }
  }

  if (response.content && Array.isArray(response.content)) {
    for (const item of response.content) {
      if (!item || typeof item !== "object") {
        continue;
      }

      if (item.type === "thinking" || item.type === "reasoning") {
        thinkingBlocks.push({
          text: item.text || "",
          signature: item.signature,
          index: thinkingBlocks.length,
        });
      }
    }
  }

  const combinedThinking = thinkingBlocks.map((b) => b.text).join("\n\n");

  return {
    thinkingBlocks,
    combinedThinking,
    hasThinking: thinkingBlocks.length > 0,
  };
}

/**
 * Format thinking blocks for OpenAI-compatible output
 */
export function formatThinkingForOpenAI(
  thinking: ThinkingBlock[]
): Array<{ type: "reasoning"; text: string; signature?: string }> {
  if (!thinking || !Array.isArray(thinking) || thinking.length === 0) {
    return [];
  }

  return thinking.map((block) => {
    const formatted: { type: "reasoning"; text: string; signature?: string } = {
      type: "reasoning",
      text: block.text || "",
    };

    if (block.signature) {
      formatted.signature = block.signature;
    }

    return formatted;
  });
}

/**
 * Transform thinking parts in a candidate to OpenAI format
 */
export function transformCandidateThinking(candidate: GeminiCandidate): GeminiCandidate {
  if (!candidate || typeof candidate !== "object") {
    return candidate;
  }

  const content = candidate.content;
  if (!content || typeof content !== "object" || !Array.isArray(content.parts)) {
    return candidate;
  }

  const thinkingTexts: string[] = [];
  const transformedParts = content.parts.map((part) => {
    if (part && typeof part === "object" && part.thought === true) {
      thinkingTexts.push(part.text || "");
      return {
        ...part,
        type: "reasoning" as const,
        thought: undefined,
      };
    }
    return part;
  });

  const result: GeminiCandidate & { reasoning_content?: string } = {
    ...candidate,
    content: { ...content, parts: transformedParts },
  };

  if (thinkingTexts.length > 0) {
    result.reasoning_content = thinkingTexts.join("\n\n");
  }

  return result;
}

/**
 * Filter out unsigned thinking blocks
 */
export function filterUnsignedThinkingBlocks(parts: GeminiPart[]): GeminiPart[] {
  if (!parts || !Array.isArray(parts)) {
    return parts;
  }

  return parts.filter((part) => {
    if (!part || typeof part !== "object") {
      return true;
    }

    if (isThinkingPart(part)) {
      return hasValidSignature(part);
    }

    return true;
  });
}

/**
 * Transform entire response thinking parts
 */
export function transformResponseThinking(response: GeminiResponse): GeminiResponse {
  if (!response || typeof response !== "object") {
    return response;
  }

  const result: GeminiResponse = { ...response };

  if (Array.isArray(result.candidates)) {
    result.candidates = result.candidates.map(transformCandidateThinking);
  }

  if (Array.isArray(result.content)) {
    result.content = result.content.map((block) => {
      if (block && typeof block === "object" && block.type === "thinking") {
        return {
          type: "reasoning",
          text: block.text || "",
          ...(block.signature ? { signature: block.signature } : {}),
        };
      }
      return block;
    });
  }

  return result;
}

/**
 * Thinking configuration for requests
 */
export interface ThinkingConfig {
  thinkingBudget?: number;
  includeThoughts?: boolean;
}

/**
 * Normalize thinking configuration
 */
export function normalizeThinkingConfig(config: unknown): ThinkingConfig | undefined {
  if (!config || typeof config !== "object") {
    return undefined;
  }

  const record = config as Record<string, unknown>;
  const budgetRaw = record.thinkingBudget ?? record.thinking_budget;
  const includeRaw = record.includeThoughts ?? record.include_thoughts;

  const thinkingBudget =
    typeof budgetRaw === "number" && Number.isFinite(budgetRaw) ? budgetRaw : undefined;
  const includeThoughts = typeof includeRaw === "boolean" ? includeRaw : undefined;

  const enableThinking = thinkingBudget !== undefined && thinkingBudget > 0;
  const finalInclude = enableThinking ? (includeThoughts ?? false) : false;

  if (!enableThinking && finalInclude === false && thinkingBudget === undefined && includeThoughts === undefined) {
    return undefined;
  }

  const normalized: ThinkingConfig = {};
  if (thinkingBudget !== undefined) {
    normalized.thinkingBudget = thinkingBudget;
  }
  if (finalInclude !== undefined) {
    normalized.includeThoughts = finalInclude;
  }
  return normalized;
}

/**
 * Extract thinking configuration from request payload
 */
export function extractThinkingConfig(
  requestPayload: Record<string, unknown>,
  generationConfig?: Record<string, unknown>,
  extraBody?: Record<string, unknown>
): ThinkingConfig | undefined {
  const thinkingConfig =
    generationConfig?.thinkingConfig ?? extraBody?.thinkingConfig ?? requestPayload.thinkingConfig;

  if (thinkingConfig && typeof thinkingConfig === "object") {
    const config = thinkingConfig as Record<string, unknown>;
    return {
      includeThoughts: Boolean(config.includeThoughts),
      thinkingBudget:
        typeof config.thinkingBudget === "number" ? config.thinkingBudget : DEFAULT_THINKING_BUDGET,
    };
  }

  const anthropicThinking = extraBody?.thinking ?? requestPayload.thinking;
  if (anthropicThinking && typeof anthropicThinking === "object") {
    const thinking = anthropicThinking as Record<string, unknown>;
    if (thinking.type === "enabled" || thinking.budgetTokens) {
      return {
        includeThoughts: true,
        thinkingBudget:
          typeof thinking.budgetTokens === "number" ? thinking.budgetTokens : DEFAULT_THINKING_BUDGET,
      };
    }
  }

  return undefined;
}

/**
 * Resolve final thinking configuration based on model and context
 */
export function resolveThinkingConfig(
  userConfig: ThinkingConfig | undefined,
  isThinkingModel: boolean,
  isClaudeModel: boolean,
  hasAssistantHistory: boolean
): ThinkingConfig | undefined {
  if (isClaudeModel && hasAssistantHistory) {
    return { includeThoughts: false, thinkingBudget: 0 };
  }

  if (isThinkingModel && !userConfig) {
    return { includeThoughts: true, thinkingBudget: DEFAULT_THINKING_BUDGET };
  }

  return userConfig;
}

/**
 * Think Mode Detector
 * Detects think keywords in prompts to activate thinking mode.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

/**
 * English patterns for think detection
 */
const ENGLISH_PATTERNS = [/\bultrathink\b/i, /\bthink\b/i];

/**
 * Multilingual keywords for think detection
 * Supports Korean, Chinese, Japanese, Hindi, Arabic, Bengali,
 * Russian, Portuguese, Spanish, French, German, Vietnamese,
 * Turkish, Italian, Thai, Polish, Dutch, Indonesian, Ukrainian,
 * Greek, Czech, Romanian, Swedish, Hungarian, Finnish, Danish,
 * Norwegian, Hebrew, Malay
 */
const MULTILINGUAL_KEYWORDS = [
  // Korean
  "생각", "고민", "검토", "제대로",
  // Chinese (Simplified & Traditional)
  "思考", "考虑", "考慮",
  // Japanese
  "思考", "考え", "熟考",
  // Hindi
  "सोच", "विचार",
  // Arabic
  "تفكير", "تأمل",
  // Bengali
  "চিন্তা", "ভাবনা",
  // Russian
  "думать", "думай", "размышлять", "размышляй",
  // Portuguese
  "pensar", "pense", "refletir", "reflita",
  // Spanish
  "pensar", "piensa", "reflexionar", "reflexiona",
  // French
  "penser", "pense", "réfléchir", "réfléchis",
  // German
  "denken", "denk", "nachdenken",
  // Vietnamese
  "suy nghĩ", "cân nhắc",
  // Turkish
  "düşün", "düşünmek",
  // Italian
  "pensare", "pensa", "riflettere", "rifletti",
  // Thai
  "คิด", "พิจารณา",
  // Polish
  "myśl", "myśleć", "zastanów",
  // Dutch
  "denken", "denk", "nadenken",
  // Indonesian
  "berpikir", "pikir", "pertimbangkan",
  // Ukrainian
  "думати", "думай", "роздумувати",
  // Greek
  "σκέψου", "σκέφτομαι",
  // Czech
  "myslet", "mysli", "přemýšlet",
  // Romanian
  "gândește", "gândi", "reflectă",
  // Swedish
  "tänka", "tänk", "fundera",
  // Hungarian
  "gondolkodj", "gondolkodni",
  // Finnish
  "ajattele", "ajatella", "pohdi",
  // Danish
  "tænk", "tænke", "overvej",
  // Norwegian
  "tenk", "tenke", "gruble",
  // Hebrew
  "חשוב", "לחשוב", "להרהר",
  // Malay
  "fikir", "berfikir",
];

/**
 * All think patterns (English + Multilingual)
 */
const MULTILINGUAL_PATTERNS = MULTILINGUAL_KEYWORDS.map((kw) => new RegExp(kw, "i"));
const THINK_PATTERNS = [...ENGLISH_PATTERNS, ...MULTILINGUAL_PATTERNS];

/**
 * Code block patterns to exclude from detection
 */
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`]+`/g;

/**
 * Remove code blocks from text to avoid false positives
 */
function removeCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "");
}

/**
 * Detect think keywords in text
 * @param text - Text to search for think keywords
 * @returns true if think keyword detected
 */
export function detectThinkKeyword(text: string): boolean {
  const textWithoutCode = removeCodeBlocks(text);
  return THINK_PATTERNS.some((pattern) => pattern.test(textWithoutCode));
}

/**
 * Extract text content from message parts
 * @param parts - Message parts array
 * @returns Combined text content
 */
export function extractPromptText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join("");
}

/**
 * Get all supported think keywords for documentation
 */
export function getSupportedKeywords(): {
  english: RegExp[];
  multilingual: string[];
} {
  return {
    english: ENGLISH_PATTERNS,
    multilingual: MULTILINGUAL_KEYWORDS,
  };
}

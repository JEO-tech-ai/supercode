/**
 * String width calculation utilities for proper CJK/Korean character handling
 * Uses Bun.stringWidth for accurate terminal width calculation
 */

/**
 * Calculate the visual width of a string in terminal cells
 * Properly handles CJK characters, emojis, and other wide characters
 * 
 * @param str - The string to measure
 * @returns The visual width in terminal cells
 */
export function getStringWidth(str: string): number {
  // Bun provides native stringWidth function for accurate Unicode width
  if (typeof Bun !== "undefined" && typeof Bun.stringWidth === "function") {
    return Bun.stringWidth(str);
  }

  // Fallback for non-Bun environments
  // This is a simplified implementation that handles common cases
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;

    // ASCII characters
    if (code < 0x80) {
      width += 1;
      continue;
    }

    // CJK characters (includes Korean Hangul)
    if (
      (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0x9fff) || // CJK
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
      (code >= 0xfe10 && code <= 0xfe1f) || // Vertical forms
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility
      (code >= 0xff00 && code <= 0xff60) || // Fullwidth forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth signs
      (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B
      (code >= 0x30000 && code <= 0x3fffd)    // CJK Extension C
    ) {
      width += 2;
      continue;
    }

    // Emoji and other wide characters (simplified)
    if (
      (code >= 0x1f300 && code <= 0x1f9ff) || // Misc Symbols and Pictographs, Emoticons, etc.
      (code >= 0x2600 && code <= 0x26ff) ||   // Misc symbols
      (code >= 0x2700 && code <= 0x27bf)      // Dingbats
    ) {
      width += 2;
      continue;
    }

    // Default to width 1 for other characters
    width += 1;
  }

  return width;
}

/**
 * Truncate a string to fit within a specified visual width
 * Properly handles CJK characters and adds ellipsis if truncated
 * 
 * @param str - The string to truncate
 * @param maxWidth - Maximum visual width in terminal cells
 * @param ellipsis - Ellipsis string to append if truncated (default: "...")
 * @returns Truncated string
 */
export function truncateToWidth(
  str: string,
  maxWidth: number,
  ellipsis: string = "..."
): string {
  const strWidth = getStringWidth(str);
  if (strWidth <= maxWidth) return str;

  const ellipsisWidth = getStringWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) return ellipsis.slice(0, maxWidth);

  let width = 0;
  let result = "";

  for (const char of str) {
    const charWidth = getStringWidth(char);
    if (width + charWidth > targetWidth) break;
    result += char;
    width += charWidth;
  }

  return result + ellipsis;
}

/**
 * Get character index for a given visual column position
 * Useful for cursor positioning with CJK characters
 * 
 * @param str - The string to search
 * @param column - Visual column position (0-based)
 * @returns Character index at the given column
 */
export function getIndexAtColumn(str: string, column: number): number {
  let width = 0;
  let index = 0;

  for (const char of str) {
    if (width >= column) break;
    width += getStringWidth(char);
    index++;
  }

  return index;
}

/**
 * Get visual column position for a given character index
 * 
 * @param str - The string to measure
 * @param index - Character index (0-based)
 * @returns Visual column position
 */
export function getColumnAtIndex(str: string, index: number): number {
  const chars = [...str];
  let width = 0;

  for (let i = 0; i < Math.min(index, chars.length); i++) {
    width += getStringWidth(chars[i]);
  }

  return width;
}

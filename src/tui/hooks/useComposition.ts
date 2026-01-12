/**
 * Phase 2: Korean Unicode Input Support
 * Composition state tracking for IME input handling
 */

import { useState, useCallback, useRef } from "react";

/**
 * Korean character patterns for composition detection
 */
const HANGUL_JAMO_PATTERN = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
const HANGUL_SYLLABLE_PATTERN = /[\uAC00-\uD7AF]/;
const HANGUL_COMPATIBILITY_PATTERN = /[\u3130-\u318F]/;

/**
 * Check if a character is a Korean jamo (consonant/vowel)
 */
function isKoreanJamo(char: string): boolean {
  return HANGUL_JAMO_PATTERN.test(char) || HANGUL_COMPATIBILITY_PATTERN.test(char);
}

/**
 * Check if a character is a complete Korean syllable
 */
function isKoreanSyllable(char: string): boolean {
  return HANGUL_SYLLABLE_PATTERN.test(char);
}

/**
 * Check if the input contains incomplete Korean composition
 */
function hasIncompleteComposition(text: string): boolean {
  if (text.length === 0) return false;
  const lastChar = text[text.length - 1];
  return isKoreanJamo(lastChar);
}

/**
 * Check if the last character is a complete Korean syllable
 */
function endsWithCompleteSyllable(text: string): boolean {
  if (text.length === 0) return true;
  const lastChar = text[text.length - 1];
  return isKoreanSyllable(lastChar) || !isKoreanJamo(lastChar);
}

export interface CompositionState {
  /** Whether IME composition is in progress */
  isComposing: boolean;
  /** The current composition buffer */
  compositionBuffer: string;
  /** The last confirmed text */
  confirmedText: string;
}

export interface UseCompositionOptions {
  /** Debounce delay for composition end detection (ms) */
  debounceMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseCompositionReturn {
  /** Current composition state */
  state: CompositionState;
  /** Handle input change - returns whether to trigger autocomplete */
  handleChange: (newValue: string, oldValue: string) => boolean;
  /** Force end composition */
  endComposition: () => void;
  /** Check if text input should trigger autocomplete */
  shouldTriggerAutocomplete: (value: string) => boolean;
  /** Get the stable value for autocomplete filtering */
  getStableValue: (value: string) => string;
}

/**
 * Hook for handling Korean IME composition state
 *
 * This hook tracks whether the user is in the middle of composing
 * Korean characters and prevents autocomplete from triggering
 * until composition is complete.
 */
export function useComposition(options: UseCompositionOptions = {}): UseCompositionReturn {
  const { debounceMs = 100, debug = false } = options;

  const [state, setState] = useState<CompositionState>({
    isComposing: false,
    compositionBuffer: "",
    confirmedText: "",
  });

  const compositionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef<string>("");

  const log = useCallback((message: string, ...args: unknown[]) => {
    if (debug) {
      console.log(`[useComposition] ${message}`, ...args);
    }
  }, [debug]);

  /**
   * Handle input value change
   * Returns true if autocomplete should be triggered
   */
  const handleChange = useCallback((newValue: string, oldValue: string): boolean => {
    // Clear any pending composition end timeout
    if (compositionTimeoutRef.current) {
      clearTimeout(compositionTimeoutRef.current);
      compositionTimeoutRef.current = null;
    }

    const lengthDiff = newValue.length - oldValue.length;
    const isDeleting = lengthDiff < 0;

    // If deleting, composition is likely ended
    if (isDeleting) {
      log("Deletion detected, ending composition");
      setState({
        isComposing: false,
        compositionBuffer: "",
        confirmedText: newValue,
      });
      previousValueRef.current = newValue;
      return true; // OK to trigger autocomplete
    }

    // Check if the new input has incomplete Korean composition
    if (hasIncompleteComposition(newValue)) {
      log("Incomplete Korean composition detected", { newValue });
      setState({
        isComposing: true,
        compositionBuffer: newValue.slice(oldValue.length),
        confirmedText: oldValue,
      });
      previousValueRef.current = newValue;
      return false; // Don't trigger autocomplete yet
    }

    // Check if we just completed a Korean syllable
    if (state.isComposing && endsWithCompleteSyllable(newValue)) {
      log("Korean syllable completed", { newValue });

      // Use a small delay to detect if more composition is coming
      compositionTimeoutRef.current = setTimeout(() => {
        setState({
          isComposing: false,
          compositionBuffer: "",
          confirmedText: newValue,
        });
      }, debounceMs);

      previousValueRef.current = newValue;
      return true; // OK to trigger autocomplete with complete syllable
    }

    // Regular input (non-Korean or complete)
    log("Regular input", { newValue, wasComposing: state.isComposing });
    setState({
      isComposing: false,
      compositionBuffer: "",
      confirmedText: newValue,
    });
    previousValueRef.current = newValue;
    return true;
  }, [state.isComposing, debounceMs, log]);

  /**
   * Force end composition (e.g., on blur or submit)
   */
  const endComposition = useCallback(() => {
    if (compositionTimeoutRef.current) {
      clearTimeout(compositionTimeoutRef.current);
      compositionTimeoutRef.current = null;
    }

    setState(prev => ({
      isComposing: false,
      compositionBuffer: "",
      confirmedText: prev.confirmedText + prev.compositionBuffer,
    }));
  }, []);

  /**
   * Check if autocomplete should be triggered for this value
   */
  const shouldTriggerAutocomplete = useCallback((value: string): boolean => {
    return !hasIncompleteComposition(value);
  }, []);

  /**
   * Get a stable value for autocomplete filtering
   * This returns only the confirmed portion during composition
   */
  const getStableValue = useCallback((value: string): string => {
    if (state.isComposing) {
      return state.confirmedText;
    }
    return value;
  }, [state.isComposing, state.confirmedText]);

  return {
    state,
    handleChange,
    endComposition,
    shouldTriggerAutocomplete,
    getStableValue,
  };
}

/**
 * Utility function to check if a string contains Korean characters
 */
export function containsKorean(text: string): boolean {
  return HANGUL_JAMO_PATTERN.test(text) ||
         HANGUL_SYLLABLE_PATTERN.test(text) ||
         HANGUL_COMPATIBILITY_PATTERN.test(text);
}

/**
 * Normalize Korean text for fuzzy matching
 * Decomposes syllables into jamo for better matching
 */
export function normalizeKorean(text: string): string {
  // Korean syllable = (initial * 21 * 28) + (medial * 28) + final + 0xAC00
  // We can decompose for better fuzzy matching
  let result = "";

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= 0xAC00 && code <= 0xD7AF) {
      // Korean syllable - decompose to jamo
      const syllableIndex = code - 0xAC00;
      const initial = Math.floor(syllableIndex / (21 * 28));
      const medial = Math.floor((syllableIndex % (21 * 28)) / 28);
      const final = syllableIndex % 28;

      // Initial consonants
      const initials = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
      // Medial vowels
      const medials = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
      // Final consonants (0 = no final)
      const finals = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

      result += initials[initial] + medials[medial];
      if (final > 0) {
        result += finals[final];
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Fuzzy match that works well with Korean text
 */
export function koreanFuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;

  const normalizedQuery = normalizeKorean(query.toLowerCase());
  const normalizedTarget = normalizeKorean(target.toLowerCase());

  // Check if normalized query is contained in normalized target
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // Also check original strings for exact matches
  if (target.toLowerCase().includes(query.toLowerCase())) {
    return true;
  }

  // Initial consonant matching (초성 검색)
  // e.g., "ㄱㄴ" matches "가나다"
  const queryInitials = getInitialConsonants(query);
  const targetInitials = getInitialConsonants(target);

  if (queryInitials && targetInitials.includes(queryInitials)) {
    return true;
  }

  return false;
}

/**
 * Extract initial consonants from Korean text
 * e.g., "안녕하세요" -> "ㅇㄴㅎㅅㅇ"
 */
export function getInitialConsonants(text: string): string {
  const initials = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  let result = "";

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= 0xAC00 && code <= 0xD7AF) {
      const syllableIndex = code - 0xAC00;
      const initial = Math.floor(syllableIndex / (21 * 28));
      result += initials[initial];
    } else if (initials.includes(char)) {
      result += char;
    }
  }

  return result;
}

import { useState, useCallback, useMemo, useEffect } from "react";

export interface UseFilteredListOptions<T> {
  items: T[] | (() => T[]) | ((query: string) => Promise<T[]>);
  key: (item: T) => string;
  filterKeys: (keyof T)[];
  groupBy?: (item: T) => string;
  onSelect?: (item: T | undefined) => void;
  onHighlight?: (item: T | undefined) => void;
  fuzzyMatch?: boolean;
  debounceMs?: number;
  maxResults?: number;
}

export interface UseFilteredListReturn<T> {
  query: string;
  setQuery: (query: string) => void;
  filtered: T[];
  grouped: Map<string, T[]>;
  selectedIndex: number;
  selectedItem: T | undefined;
  isLoading: boolean;
  error: Error | null;
  selectNext: () => void;
  selectPrevious: () => void;
  selectFirst: () => void;
  selectLast: () => void;
  selectByIndex: (index: number) => void;
  confirm: () => void;
  reset: () => void;
  isEmpty: boolean;
  hasQuery: boolean;
}

export function useFilteredList<T>(
  options: UseFilteredListOptions<T>
): UseFilteredListReturn<T> {
  const {
    items,
    key,
    filterKeys,
    groupBy,
    onSelect,
    onHighlight,
    fuzzyMatch = true,
    debounceMs = 150,
    maxResults = 100,
  } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [asyncItems, setAsyncItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    if (typeof items === "function") {
      const itemsFn = items as (query: string) => Promise<T[]>;
      if (itemsFn.length === 1) {
        setIsLoading(true);
        setError(null);
        
        itemsFn(debouncedQuery)
          .then((result) => {
            setAsyncItems(result);
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          });
      }
    }
  }, [items, debouncedQuery]);

  const baseItems = useMemo((): T[] => {
    if (Array.isArray(items)) {
      return items;
    }
    if (typeof items === "function") {
      const fn = items as (() => T[]) | ((query: string) => Promise<T[]>);
      if (fn.length === 0) {
        return (fn as () => T[])();
      }
      return asyncItems;
    }
    return [];
  }, [items, asyncItems]);

  const filtered = useMemo((): T[] => {
    if (!debouncedQuery.trim()) {
      return baseItems.slice(0, maxResults);
    }

    const scored = baseItems
      .map((item) => ({
        item,
        score: calculateMatchScore(item, debouncedQuery, filterKeys, fuzzyMatch),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((x) => x.item);

    return scored;
  }, [baseItems, debouncedQuery, filterKeys, fuzzyMatch, maxResults]);

  const grouped = useMemo((): Map<string, T[]> => {
    if (!groupBy) {
      return new Map([["Results", filtered]]);
    }

    const groups = new Map<string, T[]>();
    for (const item of filtered) {
      const groupName = groupBy(item);
      const existing = groups.get(groupName) || [];
      groups.set(groupName, [...existing, item]);
    }
    return groups;
  }, [filtered, groupBy]);

  const selectedItem = filtered[selectedIndex];

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    onHighlight?.(selectedItem);
  }, [selectedItem, onHighlight]);

  const selectNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
  }, [filtered.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((i) => Math.max(i - 1, 0));
  }, []);

  const selectFirst = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const selectLast = useCallback(() => {
    setSelectedIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length]);

  const selectByIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < filtered.length) {
        setSelectedIndex(index);
      }
    },
    [filtered.length]
  );

  const confirm = useCallback(() => {
    onSelect?.(selectedItem);
  }, [selectedItem, onSelect]);

  const reset = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    filtered,
    grouped,
    selectedIndex,
    selectedItem,
    isLoading,
    error,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    selectByIndex,
    confirm,
    reset,
    isEmpty: filtered.length === 0,
    hasQuery: query.trim().length > 0,
  };
}

function calculateMatchScore<T>(
  item: T,
  query: string,
  filterKeys: (keyof T)[],
  fuzzyMatch: boolean
): number {
  const lowerQuery = query.toLowerCase();
  let maxScore = 0;

  for (const key of filterKeys) {
    const value = item[key];
    if (typeof value !== "string") continue;

    const lowerValue = value.toLowerCase();

    if (lowerValue === lowerQuery) {
      maxScore = Math.max(maxScore, 100);
    } else if (lowerValue.startsWith(lowerQuery)) {
      maxScore = Math.max(maxScore, 80);
    } else if (lowerValue.includes(lowerQuery)) {
      maxScore = Math.max(maxScore, 60);
    } else if (fuzzyMatch) {
      const fuzzyScore = fuzzyMatchScore(lowerValue, lowerQuery);
      maxScore = Math.max(maxScore, fuzzyScore);
    }
  }

  return maxScore;
}

function fuzzyMatchScore(text: string, pattern: string): number {
  let patternIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
      score += 10;

      if (lastMatchIdx === i - 1) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      if (i === 0 || text[i - 1] === " " || text[i - 1] === "-" || text[i - 1] === "_") {
        score += 10;
      }

      lastMatchIdx = i;
    }
  }

  if (patternIdx < pattern.length) {
    return 0;
  }

  return Math.min(score, 50);
}

export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return `${before}[${match}]${after}`;
}

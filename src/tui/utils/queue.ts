/**
 * Async Queue implementation for sequential processing
 * Ported from OpenCode's queue utility
 */

export class AsyncQueue<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private resolvers: ((value: T) => void)[] = [];

  push(item: T) {
    const resolve = this.resolvers.shift();
    if (resolve) resolve(item);
    else this.queue.push(item);
  }

  async next(): Promise<T> {
    if (this.queue.length > 0) return this.queue.shift()!;
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  async *[Symbol.asyncIterator]() {
    while (true) yield await this.next();
  }

  get length(): number {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
    this.resolvers = [];
  }
}

/**
 * Work through items with controlled concurrency
 */
export async function work<T>(
  concurrency: number,
  items: T[],
  fn: (item: T) => Promise<void>
): Promise<void> {
  const pending = [...items];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const item = pending.pop();
        if (item === undefined) return;
        await fn(item);
      }
    })
  );
}

/**
 * Debounced async function executor
 * Ensures only the latest call executes after the delay
 */
export function createDebouncedAsync<T, R>(
  fn: (arg: T, signal: AbortSignal) => Promise<R>,
  delay: number
): {
  execute: (arg: T) => Promise<R | undefined>;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let currentController: AbortController | null = null;

  return {
    execute: (arg: T): Promise<R | undefined> => {
      // Cancel any pending operation
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Abort any in-flight operation
      if (currentController) {
        currentController.abort();
        currentController = null;
      }

      return new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          currentController = new AbortController();
          try {
            const result = await fn(arg, currentController.signal);
            resolve(result);
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              resolve(undefined);
            } else {
              throw error;
            }
          } finally {
            currentController = null;
            timeoutId = null;
          }
        }, delay);
      });
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (currentController) {
        currentController.abort();
        currentController = null;
      }
    },
  };
}

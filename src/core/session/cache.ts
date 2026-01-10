import * as crypto from 'crypto';
import { Log } from '../../shared/logger';

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  accessedAt: Date;
  expiresAt?: Date;
  hits: number;
  size: number;
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  evictions: number;
}

export interface CacheConfig {
  maxSize: number;
  maxAge?: number;
  maxEntries?: number;
  evictPolicy: 'lru' | 'lfu' | 'fifo';
}

export class SessionCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 10 * 1024 * 1024,
      maxAge: undefined,
      maxEntries: 1000,
      evictPolicy: 'lru',
      ...config,
    };
  }

  set(key: string, value: T, ttl?: number): void {
    const size = this.calculateSize(value);

    if (size > this.config.maxSize) {
      Log.warn(`Cache entry too large: ${size} bytes`);
      return;
    }

    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl) : undefined;

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      accessedAt: now,
      expiresAt,
      hits: 0,
      size,
    };

    this.cache.set(key, entry);

    if (this.shouldEvict()) {
      this.evict();
    }
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.accessedAt = new Date();
    entry.hits++;
    this.stats.hits++;

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values(): T[] {
    const now = new Date();
    return Array.from(this.cache.values())
      .filter(entry => !this.isExpired(entry))
      .map(entry => entry.value);
  }

  entries(): Array<[string, T]> {
    const now = new Date();
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => !this.isExpired(entry))
      .map(([key, entry]) => [key, entry.value]);
  }

  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalSize,
      evictions: this.stats.evictions,
    };
  }

  cleanup(): number {
    let removed = 0;
    const now = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  private calculateSize(value: T): number {
    try {
      const json = JSON.stringify(value);
      return Buffer.byteLength(json, 'utf-8');
    } catch (error) {
      return 1024;
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiresAt) {
      return false;
    }

    return new Date() > entry.expiresAt;
  }

  private shouldEvict(): boolean {
    if (this.config.maxEntries && this.cache.size >= this.config.maxEntries) {
      return true;
    }

    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    return totalSize >= this.config.maxSize;
  }

  private evict(): void {
    const entries = Array.from(this.cache.entries());

    switch (this.config.evictPolicy) {
      case 'lru':
        this.evictLRU(entries);
        break;

      case 'lfu':
        this.evictLFU(entries);
        break;

      case 'fifo':
        this.evictFIFO(entries);
        break;
    }

    this.stats.evictions++;
  }

  private evictLRU(entries: Array<[string, CacheEntry<T>]>): void {
    const sorted = entries.sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime());
    const [key, entry] = sorted[0];
    this.cache.delete(key);
    Log.debug(`Evicted LRU entry: ${key} (${entry.size} bytes)`);
  }

  private evictLFU(entries: Array<[string, CacheEntry<T>]>): void {
    const sorted = entries.sort((a, b) => a[1].hits - b[1].hits);
    const [key, entry] = sorted[0];
    this.cache.delete(key);
    Log.debug(`Evicted LFU entry: ${key} (${entry.hits} hits, ${entry.size} bytes)`);
  }

  private evictFIFO(entries: Array<[string, CacheEntry<T>]>): void {
    const sorted = entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
    const [key, entry] = sorted[0];
    this.cache.delete(key);
    Log.debug(`Evicted FIFO entry: ${key} (${entry.size} bytes)`);
  }
}

export const sessionCache = new SessionCache<any>();

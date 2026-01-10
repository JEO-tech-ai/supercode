import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../../shared/logger';
import type {
  KBEntry,
  KBCategory,
  KBQuery,
  KBSearchResult,
  KBStats,
  KBImportConfig,
  KBExportConfig,
} from './types';

export class KnowledgeBaseManager extends EventEmitter {
  private entries = new Map<string, KBEntry>();
  private categories = new Map<string, KBCategory>();
  private storagePath: string;
  private index: Map<string, Set<string>> = new Map();

  constructor(storagePath: string = path.join(process.cwd(), '.supercoin', 'knowledge')) {
    super();
    this.storagePath = storagePath;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await this.loadEntries();
      await this.loadCategories();
      await this.rebuildIndex();

      Log.info('📚 Knowledge base manager initialized');
    } catch (error) {
      Log.error(`Failed to initialize knowledge base: ${(error as Error).message}`);
    }
  }

  addEntry(entry: Omit<KBEntry, 'id'>): KBEntry {
    const id = this.generateId();

    const newEntry: KBEntry = {
      id,
      ...entry,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        ...entry.metadata,
      },
    };

    this.entries.set(id, newEntry);
    this.updateIndex(newEntry);

    this.emit('entry.added', { entry: newEntry });

    Log.info(`📖 Added KB entry: ${newEntry.title} (${id})`);
    return newEntry;
  }

  getEntry(id: string): KBEntry | undefined {
    return this.entries.get(id);
  }

  updateEntry(id: string, updates: Partial<KBEntry>): KBEntry | undefined {
    const entry = this.entries.get(id);

    if (!entry) {
      return undefined;
    }

    Object.assign(entry, updates, {
      metadata: {
        ...entry.metadata,
        updatedAt: new Date(),
        ...updates.metadata,
      },
    });

    this.emit('entry.updated', { entry });
    return entry;
  }

  deleteEntry(id: string): boolean {
    const entry = this.entries.get(id);

    if (!entry) {
      return false;
    }

    this.entries.delete(id);
    this.removeFromIndex(entry);
    this.emit('entry.deleted', { id });

    Log.info(`🗑️ Deleted KB entry: ${entry.title}`);
    return true;
  }

  search(query: KBQuery): KBSearchResult[] {
    const results: KBSearchResult[] = [];
    const queryLower = query.text.toLowerCase();

    for (const [id, entry] of this.entries) {
      if (query.types && !query.types.includes(entry.type)) {
        continue;
      }

      if (query.categories && entry.category && !query.categories.includes(entry.category)) {
        continue;
      }

      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(tag => entry.tags.includes(tag));
        if (!hasTag) continue;
      }

      const score = this.calculateScore(entry, queryLower);
      if (score > 0) {
        results.push({
          entry,
          score,
          highlights: this.generateHighlights(entry, queryLower),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const offset = query.offset || 0;
    const limit = query.limit || 10;

    return results.slice(offset, offset + limit);
  }

  private calculateScore(entry: KBEntry, query: string): number {
    let score = 0;

    const titleLower = entry.title.toLowerCase();
    const descLower = entry.description.toLowerCase();
    const contentLower = entry.content.toLowerCase();

    if (titleLower.includes(query)) {
      score += 10;
    }

    if (titleLower === query) {
      score += 5;
    }

    if (descLower.includes(query)) {
      score += 3;
    }

    if (contentLower.includes(query)) {
      score += 1;
    }

    entry.tags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) {
        score += 2;
      }
    });

    return score;
  }

  private generateHighlights(entry: KBEntry, query: string): Array<{ field: string; text: string }> {
    const highlights: Array<{ field: string; text: string }> = [];

    const titleLower = entry.title.toLowerCase();
    if (titleLower.includes(query)) {
      const idx = titleLower.indexOf(query);
      highlights.push({
        field: 'title',
        text: entry.title.substring(Math.max(0, idx - 20), Math.min(entry.title.length, idx + query.length + 20)),
      });
    }

    const descLower = entry.description.toLowerCase();
    if (descLower.includes(query)) {
      const idx = descLower.indexOf(query);
      highlights.push({
        field: 'description',
        text: entry.description.substring(Math.max(0, idx - 20), Math.min(entry.description.length, idx + query.length + 20)),
      });
    }

    return highlights;
  }

  addCategory(category: Omit<KBCategory, 'id' | 'children'>): KBCategory {
    const id = this.generateId();

    const newCategory: KBCategory = {
      id,
      children: [],
      ...category,
    };

    this.categories.set(id, newCategory);

    if (newCategory.parentCategoryId) {
      const parent = this.categories.get(newCategory.parentCategoryId);
      if (parent && !parent.children.includes(id)) {
        parent.children.push(id);
      }
    }

    Log.info(`📁 Added KB category: ${newCategory.name}`);
    return newCategory;
  }

  getCategory(id: string): KBCategory | undefined {
    return this.categories.get(id);
  }

  listCategories(parentId?: string): KBCategory[] {
    const categories = Array.from(this.categories.values());

    if (parentId === undefined) {
      return categories.filter(c => !c.parentCategoryId);
    }

    return categories.filter(c => c.parentCategoryId === parentId);
  }

  getStats(): KBStats {
    const entriesByType: Record<string, number> = {
      tool: 0,
      command: 0,
      concept: 0,
      example: 0,
      faq: 0,
      troubleshooting: 0,
      'best-practice': 0,
      custom: 0,
    };

    const tagCounts = new Map<string, number>();

    for (const entry of this.entries.values()) {
      const type = entry.type as keyof typeof entriesByType;
      entriesByType[type]++;

      entry.tags.forEach(tag => {
        const count = tagCounts.get(tag) || 0;
        tagCounts.set(tag, count + 1);
      });
    }

    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalEntries: this.entries.size,
      entriesByType: entriesByType as any,
      totalCategories: this.categories.size,
      totalTags: tagCounts.size,
      topTags,
      lastUpdated: new Date(),
    };
  }

  async exportToFile(
    filePath: string,
    config: KBExportConfig
  ): Promise<void> {
    let entriesToExport = Array.from(this.entries.values());

    if (config.filter) {
      if (config.filter.types) {
        entriesToExport = entriesToExport.filter(e => config.filter!.types!.includes(e.type));
      }

      if (config.filter.categories) {
        entriesToExport = entriesToExport.filter(e => e.category && config.filter!.categories!.includes(e.category));
      }

      if (config.filter.tags) {
        entriesToExport = entriesToExport.filter(e =>
          config.filter!.tags!.some(tag => e.tags.includes(tag))
        );
      }
    }

    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      config,
      entries: entriesToExport,
    };

    const content = config.format === 'json'
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');

    Log.info(`📤 Exported ${entriesToExport.length} KB entries to ${filePath}`);
  }

  async importFromFile(filePath: string, config: KBImportConfig): Promise<number> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    let importedCount = 0;

    for (const entryData of data.entries) {
      const entryId = entryData.id || this.generateId();

      if (this.entries.has(entryId)) {
        if (config.mergeStrategy === 'skip') {
          continue;
        }

        if (config.mergeStrategy === 'replace') {
          this.entries.delete(entryId);
        }
      }

      const entry: KBEntry = {
        id: entryId,
        ...entryData,
      };

      this.entries.set(entryId, entry);
      importedCount++;
    }

    await this.rebuildIndex();

    Log.info(`📥 Imported ${importedCount} KB entries from ${filePath}`);
    return importedCount;
  }

  private async loadEntries(): Promise<void> {
    const entriesPath = path.join(this.storagePath, 'entries');

    try {
      const files = await fs.readdir(entriesPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(entriesPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: KBEntry = JSON.parse(content);

          this.entries.set(entry.id, entry);
        }
      }

      Log.info(`📚 Loaded ${this.entries.size} KB entries`);
    } catch (error) {
      Log.warn(`Failed to load KB entries: ${(error as Error).message}`);
    }
  }

  private async loadCategories(): Promise<void> {
    const categoriesPath = path.join(this.storagePath, 'categories.json');

    try {
      const content = await fs.readFile(categoriesPath, 'utf-8');
      const categories: KBCategory[] = JSON.parse(content);

      for (const category of categories) {
        this.categories.set(category.id, category);
      }

      Log.info(`📁 Loaded ${this.categories.size} KB categories`);
    } catch (error) {
      Log.warn(`Failed to load KB categories: ${(error as Error).message}`);
    }
  }

  private updateIndex(entry: KBEntry): void {
    const tokens = this.tokenize(entry.title + ' ' + entry.description + ' ' + entry.content);

    tokens.forEach(token => {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token)!.add(entry.id);
    });

    entry.tags.forEach(tag => {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set());
      }
      this.index.get(tag)!.add(entry.id);
    });
  }

  private removeFromIndex(entry: KBEntry): void {
    const tokens = this.tokenize(entry.title + ' ' + entry.description + ' ' + entry.content);

    tokens.forEach(token => {
      const entryIds = this.index.get(token);
      if (entryIds) {
        entryIds.delete(entry.id);
        if (entryIds.size === 0) {
          this.index.delete(token);
        }
      }
    });

    entry.tags.forEach(tag => {
      const entryIds = this.index.get(tag);
      if (entryIds) {
        entryIds.delete(entry.id);
        if (entryIds.size === 0) {
          this.index.delete(tag);
        }
      }
    });
  }

  private async rebuildIndex(): Promise<void> {
    this.index.clear();

    for (const entry of this.entries.values()) {
      this.updateIndex(entry);
    }

    Log.info('🔍 Rebuilt KB search index');
  }

  private tokenize(text: string): string[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);

    return Array.from(new Set(tokens));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const knowledgeBaseManager = new KnowledgeBaseManager();

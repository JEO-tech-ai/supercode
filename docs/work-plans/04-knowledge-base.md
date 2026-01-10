# Knowledge Base & Documentation Implementation Plan

## Executive Summary

**Status**: ✅ Research Complete
**Complexity**: Medium
**Estimated Effort**: 1-2 weeks
**Priority**: High (critical for user guidance and self-documentation)

This plan implements knowledge base and documentation system, enabling intelligent documentation retrieval, context-aware help, and self-documenting capabilities.

---

## Phase 1: Knowledge Base Foundation (Week 1)

### 1.1 Define Knowledge Base Types

Create `src/knowledge/types.ts`:

```typescript
export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title: string;
  content: string;
  tags: string[];
  category: KnowledgeCategory;
  metadata: KnowledgeMetadata;
  embeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export type KnowledgeType =
  | 'documentation'
  | 'tutorial'
  | 'faq'
  | 'troubleshooting'
  | 'best-practice'
  | 'example'
  | 'reference';

export type KnowledgeCategory =
  | 'getting-started'
  | 'tools'
  | 'sessions'
  | 'ai-integration'
  | 'advanced'
  | 'api'
  | 'development';

export interface KnowledgeMetadata {
  author?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  readingTime: number; // minutes
  relatedTools?: string[];
  relatedCategories?: KnowledgeCategory[];
  dependencies?: string[];
  lastVerifiedAt?: Date;
  version?: string;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  highlights: string[];
  relevance: RelevanceLevel;
}

export type RelevanceLevel = 'low' | 'medium' | 'high' | 'exact';

export interface SearchQuery {
  text: string;
  type?: KnowledgeType;
  category?: KnowledgeCategory;
  tags?: string[];
  limit?: number;
  threshold?: number;
}

export interface DocumentationContext {
  sessionId?: string;
  toolName?: string;
  category?: string;
  difficulty?: KnowledgeMetadata['difficulty'];
  recentQueries?: string[];
}
```

### 1.2 Create Knowledge Base Manager

Create `src/knowledge/manager.ts`:

```typescript
import { EventEmitter } from 'events';
import { Log } from '../shared/logger';
import type {
  KnowledgeEntry,
  SearchResult,
  SearchQuery,
  DocumentationContext,
  KnowledgeCategory,
  KnowledgeType
} from './types';

export interface KnowledgeBaseConfig {
  storagePath: string;
  enableEmbeddings: boolean;
  enableCaching: boolean;
  cacheExpiry: number;
  similarityThreshold: number;
}

export class KnowledgeBaseManager extends EventEmitter {
  private entries = new Map<string, KnowledgeEntry>();
  private searchCache = new Map<string, SearchResult[]>();
  private config: KnowledgeBaseConfig;

  constructor(config: Partial<KnowledgeBaseConfig> = {}) {
    super();
    this.config = {
      storagePath: process.cwd(),
      enableEmbeddings: false,
      enableCaching: true,
      cacheExpiry: 300000, // 5 minutes
      similarityThreshold: 0.6,
      ...config
    };
  }

  async addEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeEntry> {
    const now = new Date();
    const knowledgeEntry: KnowledgeEntry = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...entry
    };

    // Generate embeddings if enabled
    if (this.config.enableEmbeddings) {
      knowledgeEntry.embeddings = await this.generateEmbeddings(
        knowledgeEntry.title + ' ' + knowledgeEntry.content
      );
    }

    // Add to entries
    this.entries.set(knowledgeEntry.id, knowledgeEntry);

    // Clear search cache
    this.clearSearchCache();

    Log.info(`📝 Added knowledge entry: ${knowledgeEntry.title}`);

    // Emit event
    this.emit('entry:added', knowledgeEntry);

    return knowledgeEntry;
  }

  async updateEntry(
    id: string,
    updates: Partial<KnowledgeEntry>
  ): Promise<KnowledgeEntry> {
    const entry = this.entries.get(id);

    if (!entry) {
      throw new Error(`Knowledge entry not found: ${id}`);
    }

    // Apply updates
    Object.assign(entry, updates);
    entry.updatedAt = new Date();

    // Regenerate embeddings if content changed
    if (this.config.enableEmbeddings && updates.content || updates.title) {
      entry.embeddings = await this.generateEmbeddings(
        entry.title + ' ' + entry.content
      );
    }

    // Clear search cache
    this.clearSearchCache();

    Log.info(`✏️ Updated knowledge entry: ${entry.title}`);

    // Emit event
    this.emit('entry:updated', entry);

    return entry;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);

    if (!entry) {
      return false;
    }

    this.entries.delete(id);
    this.clearSearchCache();

    Log.info(`🗑️ Deleted knowledge entry: ${entry.title}`);

    // Emit event
    this.emit('entry:deleted', { id, title: entry.title });

    return true;
  }

  async getEntry(id: string): Promise<KnowledgeEntry | null> {
    return this.entries.get(id) || null;
  }

  async getAllEntries(): Promise<KnowledgeEntry[]> {
    return Array.from(this.entries.values());
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    // Check cache
    if (this.config.enableCaching) {
      const cacheKey = this.getCacheKey(query);
      const cached = this.searchCache.get(cacheKey);

      if (cached) {
        return cached;
      }
    }

    const results: SearchResult[] = [];
    const threshold = query.threshold ?? this.config.similarityThreshold;

    // If embeddings enabled, use semantic search
    if (this.config.enableEmbeddings) {
      const queryEmbedding = await this.generateEmbeddings(query.text);
      results.push(...this.semanticSearch(queryEmbedding, threshold));
    }

    // Always do keyword search as fallback
    results.push(...this.keywordSearch(query.text, threshold));

    // Filter by type, category, tags if specified
    let filtered = results;

    if (query.type) {
      filtered = filtered.filter(r => r.entry.type === query.type);
    }

    if (query.category) {
      filtered = filtered.filter(r => r.entry.category === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(r =>
        query.tags!.some(tag => r.entry.tags.includes(tag))
      );
    }

    // Sort by score and limit
    const sorted = filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10);

    // Cache results
    if (this.config.enableCaching) {
      const cacheKey = this.getCacheKey(query);
      this.searchCache.set(cacheKey, sorted);

      // Clear cache after expiry
      setTimeout(() => {
        this.searchCache.delete(cacheKey);
      }, this.config.cacheExpiry);
    }

    return sorted;
  }

  async searchWithContext(
    query: string,
    context: DocumentationContext
  ): Promise<SearchResult[]> {
    // Build enhanced query from context
    const enhancedQuery: SearchQuery = {
      text: query,
      limit: 5
    };

    // Add category from context
    if (context.category) {
      enhancedQuery.category = context.category as any;
    }

    // Add difficulty filter from context
    if (context.difficulty) {
      const entries = await this.getAllEntries();
      const matchingIds = entries
        .filter(e => e.metadata.difficulty === context.difficulty)
        .map(e => e.id);

      if (matchingIds.length > 0) {
        enhancedQuery.tags = matchingIds;
      }
    }

    // Add tool-specific context
    if (context.toolName) {
      const entries = await this.getAllEntries();
      const toolRelated = entries
        .filter(e => e.metadata.relatedTools?.includes(context.toolName!))
        .map(e => e.id);

      if (toolRelated.length > 0) {
        enhancedQuery.tags = [...(enhancedQuery.tags || []), ...toolRelated];
      }
    }

    return this.search(enhancedQuery);
  }

  async getSimilarEntries(
    entryId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    const entry = this.entries.get(entryId);

    if (!entry || !entry.embeddings) {
      return [];
    }

    const results = this.semanticSearch(entry.embeddings, 0.5);

    // Filter out the entry itself
    return results
      .filter(r => r.entry.id !== entryId)
      .slice(0, limit);
  }

  async getByCategory(category: KnowledgeCategory): Promise<KnowledgeEntry[]> {
    return Array.from(this.entries.values())
      .filter(entry => entry.category === category);
  }

  async getByType(type: KnowledgeType): Promise<KnowledgeEntry[]> {
    return Array.from(this.entries.values())
      .filter(entry => entry.type === type);
  }

  async getByTag(tag: string): Promise<KnowledgeEntry[]> {
    return Array.from(this.entries.values())
      .filter(entry => entry.tags.includes(tag));
  }

  async getAllTags(): Promise<string[]> {
    const tagSet = new Set<string>();

    for (const entry of this.entries.values()) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).sort();
  }

  async getCategories(): Promise<KnowledgeCategory[]> {
    const categorySet = new Set<KnowledgeCategory>();

    for (const entry of this.entries.values()) {
      categorySet.add(entry.category);
    }

    return Array.from(categorySet).sort();
  }

  async generateHelpText(
    query: string,
    context: DocumentationContext = {}
  ): Promise<string> {
    const results = await this.searchWithContext(query, context);

    if (results.length === 0) {
      return `I couldn't find any documentation matching "${query}". Try different keywords or browse the available topics.`;
    }

    // Format results
    let helpText = `Found ${results.length} results for "${query}":\n\n`;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const relevance = result.relevance.toUpperCase();

      helpText += `${i + 1}. **${result.entry.title}** [${relevance}]\n`;
      helpText += `   ${result.entry.content.substring(0, 200)}...\n\n`;

      if (result.highlights.length > 0) {
        helpText += `   🎯 Highlights: ${result.highlights.join(', ')}\n\n`;
      }
    }

    helpText += `\n💡 Tip: Ask for more details about any result by mentioning its title.`;

    return helpText;
  }

  async getStatistics(): Promise<{
    totalEntries: number;
    byType: Record<KnowledgeType, number>;
    byCategory: Record<KnowledgeCategory, number>;
    byDifficulty: Record<string, number>;
    totalTags: number;
    averageReadingTime: number;
  }> {
    const entries = await this.getAllEntries();

    const byType: Record<KnowledgeType, number> = {} as any;
    const byCategory: Record<KnowledgeCategory, number> = {} as any;
    const byDifficulty: Record<string, number> = {};
    let totalTags = 0;
    let totalReadingTime = 0;

    for (const entry of entries) {
      // Count by type
      byType[entry.type] = (byType[entry.type] || 0) + 1;

      // Count by category
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;

      // Count by difficulty
      const difficulty = entry.metadata.difficulty;
      byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;

      // Count tags
      totalTags += entry.tags.length;

      // Sum reading time
      totalReadingTime += entry.metadata.readingTime;
    }

    return {
      totalEntries: entries.length,
      byType,
      byCategory,
      byDifficulty,
      totalTags,
      averageReadingTime: entries.length > 0 ? totalReadingTime / entries.length : 0
    };
  }

  private generateId(): string {
    return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateEmbeddings(text: string): Promise<number[]> {
    // Placeholder for embedding generation
    // In production, use OpenAI, Cohere, or local models
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);

    for (const word of words) {
      // Simple word-based embedding
      const hash = this.hashWord(word);
      embedding[hash % 384] += 1;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private hashWord(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private semanticSearch(
    queryEmbedding: number[],
    threshold: number
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (!entry.embeddings) continue;

      const score = this.cosineSimilarity(queryEmbedding, entry.embeddings);

      if (score >= threshold) {
        results.push({
          entry,
          score,
          highlights: [],
          relevance: this.scoreToRelevance(score)
        });
      }
    }

    return results;
  }

  private keywordSearch(
    query: string,
    threshold: number
  ): SearchResult[] {
    const queryTokens = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      const text = (entry.title + ' ' + entry.content).toLowerCase();
      const score = this.calculateKeywordScore(queryTokens, text);

      if (score >= threshold) {
        // Find highlights
        const highlights = this.findHighlights(queryTokens, text);

        results.push({
          entry,
          score,
          highlights,
          relevance: this.scoreToRelevance(score)
        });
      }
    }

    return results;
  }

  private calculateKeywordScore(queryTokens: string[], text: string): number {
    let matches = 0;

    for (const token of queryTokens) {
      if (text.includes(token)) {
        matches++;
      }
    }

    return matches / queryTokens.length;
  }

  private findHighlights(queryTokens: string[], text: string): string[] {
    const highlights: string[] = [];

    for (const token of queryTokens) {
      const index = text.indexOf(token);

      if (index !== -1) {
        // Get context around match
        const start = Math.max(0, index - 20);
        const end = Math.min(text.length, index + token.length + 20);
        const highlight = '...' + text.substring(start, end) + '...';
        highlights.push(highlight);
      }
    }

    return highlights.slice(0, 3);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private scoreToRelevance(score: number): RelevanceLevel {
    if (score >= 0.9) return 'exact';
    if (score >= 0.7) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      text: query.text,
      type: query.type,
      category: query.category,
      tags: query.tags?.sort()
    });
  }

  private clearSearchCache(): void {
    this.searchCache.clear();
  }
}

// Global knowledge base instance
export const knowledgeBase = new KnowledgeBaseManager();
```

---

## Phase 2: Self-Documentation System (Week 1.5)

### 2.1 Create Documentation Generator

Create `src/knowledge/generator.ts`:

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Log } from '../shared/logger';
import type { KnowledgeEntry, KnowledgeCategory, KnowledgeType } from './types';

export interface DocGenerationOptions {
  sourceDir: string;
  outputDir: string;
  includePrivate?: boolean;
  format: 'markdown' | 'html' | 'json';
}

export class DocumentationGenerator {
  async generateFromCodebase(
    options: DocGenerationOptions
  ): Promise<{ generated: number; errors: number }> {
    const {
      sourceDir,
      outputDir,
      includePrivate = false,
      format
    } = options;

    Log.info(`🔍 Scanning codebase for documentation...`);

    const files = this.scanSourceFiles(sourceDir);

    let generated = 0;
    let errors = 0;

    for (const file of files) {
      try {
        await this.generateDocFromFile(file, outputDir, includePrivate, format);
        generated++;
      } catch (error) {
        Log.error(`Failed to generate docs for ${file}:`, error);
        errors++;
      }
    }

    Log.info(`✅ Generated ${generated} documentation files, ${errors} errors`);

    return { generated, errors };
  }

  async generateDocFromFile(
    filePath: string,
    outputDir: string,
    includePrivate: boolean,
    format: 'markdown' | 'html' | 'json'
  ): Promise<void> {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(process.cwd(), '');

    // Parse documentation comments
    const docs = this.parseDocComments(content, filePath);

    if (docs.length === 0) {
      return; // No documentation to generate
    }

    // Generate documentation
    const docContent = this.formatDocumentation(docs, format);

    // Write to output
    const outputPath = join(
      outputDir,
      relativePath.replace(/\.(ts|js|py)$/, `.${format}`)
    );

    // Ensure directory exists
    const { mkdirSync } = require('fs');
    const dirPath = outputPath.split('/').slice(0, -1).join('/');
    mkdirSync(dirPath, { recursive: true });

    writeFileSync(outputPath, docContent, 'utf-8');

    Log.debug(`📄 Generated documentation: ${outputPath}`);
  }

  parseDocComments(
    content: string,
    filePath: string
  ): Array<{
    type: 'function' | 'class' | 'interface' | 'module';
    name: string;
    description: string;
    parameters?: Array<{ name: string; type: string; description: string }>;
    returns?: string;
    examples?: string[];
    tags: string[];
  }> {
    const docs: any[] = [];

    // Match JSDoc-style comments
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
    let match;

    while ((match = jsdocRegex.exec(content)) !== null) {
      const comment = match[1];
      const lines = comment.split('\n').map(l => l.trim().replace(/^\*\s?/, ''));

      // Extract @ tags
      const tags = lines.filter(l => l.startsWith('@')).map(l => l.substring(1));

      // Extract description
      const description = lines
        .filter(l => !l.startsWith('@') && l.length > 0)
        .join(' ')
        .trim();

      // Extract function signature from next line
      const nextLineIndex = match.index + match[0].length;
      const nextLine = content.substring(nextLineIndex, nextLineIndex + 200);

      // Parse function/class/interface
      let type: 'function' | 'class' | 'interface' | 'module';
      let name: string;

      const functionMatch = nextLine.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
      const classMatch = nextLine.match(/class\s+(\w+)/);
      const interfaceMatch = nextLine.match(/interface\s+(\w+)/);

      if (functionMatch) {
        type = 'function';
        name = functionMatch[1];
      } else if (classMatch) {
        type = 'class';
        name = classMatch[1];
      } else if (interfaceMatch) {
        type = 'interface';
        name = interfaceMatch[1];
      } else {
        type = 'module';
        name = 'Module';
      }

      // Parse parameters
      const paramTags = tags.filter(t => t.startsWith('param '));
      const parameters = paramTags.map(tag => {
        const parts = tag.substring(6).trim().split(/\s+/);
        return {
          name: parts[0],
          type: parts[1] || 'any',
          description: parts.slice(2).join(' ')
        };
      });

      // Parse return
      const returnTag = tags.find(t => t.startsWith('returns '));
      const returns = returnTag ? returnTag.substring(8).trim() : undefined;

      // Parse examples
      const exampleTags = tags.filter(t => t.startsWith('example'));
      const examples = exampleTags.map(tag => tag.substring(8).trim());

      docs.push({
        type,
        name,
        description,
        parameters,
        returns,
        examples,
        tags: tags.filter(t => !t.startsWith('param') && !t.startsWith('returns') && !t.startsWith('example'))
      });
    }

    return docs;
  }

  formatDocumentation(
    docs: any[],
    format: 'markdown' | 'html' | 'json'
  ): string {
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(docs);

      case 'html':
        return this.formatAsHTML(docs);

      case 'json':
        return JSON.stringify(docs, null, 2);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private formatAsMarkdown(docs: any[]): string {
    let md = '';

    for (const doc of docs) {
      const icon = doc.type === 'function' ? '🔧' :
                  doc.type === 'class' ? '📦' :
                  doc.type === 'interface' ? '📝' : '📄';

      md += `${icon} **${doc.type.toUpperCase()}**: \`${doc.name}\`\n\n`;
      md += `${doc.description}\n\n`;

      if (doc.parameters && doc.parameters.length > 0) {
        md += '### Parameters\n\n';
        for (const param of doc.parameters) {
          md += `- **${param.name}** (\`${param.type}\`): ${param.description}\n`;
        }
        md += '\n';
      }

      if (doc.returns) {
        md += `### Returns\n\n\`${doc.returns}\`\n\n`;
      }

      if (doc.examples && doc.examples.length > 0) {
        md += '### Examples\n\n';
        for (const example of doc.examples) {
          md += '```' + example.split('\n')[0].match(/```(\w*)/)?.[1] || 'typescript' + '\n';
          md += example.replace(/```(\w*)/, '') + '\n';
          md += '```\n\n';
        }
      }

      if (doc.tags.length > 0) {
        md += `**Tags**: ${doc.tags.join(', ')}\n\n`;
      }

      md += '---\n\n';
    }

    return md;
  }

  private formatAsHTML(docs: any[]): string {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += '<meta charset="utf-8">\n';
    html += '<style>\n';
    html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n';
    html += 'code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }\n';
    html += 'pre { background: #2d2d2d; color: #f8f8f2; padding: 16px; border-radius: 6px; }\n';
    html += '</style>\n</head>\n<body>\n';

    for (const doc of docs) {
      html += `<h2>${doc.type.toUpperCase()}: <code>${doc.name}</code></h2>\n`;
      html += `<p>${doc.description}</p>\n`;

      if (doc.parameters && doc.parameters.length > 0) {
        html += '<h3>Parameters</h3>\n<ul>\n';
        for (const param of doc.parameters) {
          html += `<li><strong>${param.name}</strong> (<code>${param.type}</code>): ${param.description}</li>\n`;
        }
        html += '</ul>\n';
      }

      if (doc.returns) {
        html += `<h3>Returns</h3>\n<p><code>${doc.returns}</code></p>\n`;
      }

      html += '<hr>\n';
    }

    html += '</body>\n</html>';

    return html;
  }

  private scanSourceFiles(sourceDir: string): string[] {
    const files: string[] = [];

    const scan = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath);
        } else if (entry.isFile() && /\.(ts|js|py)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    scan(sourceDir);
    return files;
  }
}

// Global generator instance
export const docGenerator = new DocumentationGenerator();
```

---

## Phase 3: Interactive Help System (Week 2)

### 3.1 Create Help System

Create `src/knowledge/help.ts`:

```typescript
import { knowledgeBase } from './manager';
import type { SearchResult, DocumentationContext } from './types';

export class HelpSystem {
  async getQuickHelp(query: string, context?: DocumentationContext): Promise<string> {
    const results = await knowledgeBase.searchWithContext(query, context || {});

    if (results.length === 0) {
      return this.getSuggestionHelp(query);
    }

    // Find best match
    const bestMatch = results[0];

    return `📚 ${bestMatch.entry.title}\n\n${bestMatch.entry.content}\n\n`;
  }

  async getDetailedHelp(
    entryId: string,
    context?: DocumentationContext
  ): Promise<string> {
    const entry = await knowledgeBase.getEntry(entryId);

    if (!entry) {
      return `❌ Documentation entry not found: ${entryId}`;
    }

    let help = `📖 ${entry.title}\n`;
    help += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    help += `${entry.content}\n\n`;

    // Add metadata
    help += `📊 Metadata:\n`;
    help += `- Type: ${entry.type}\n`;
    help += `- Category: ${entry.category}\n`;
    help += `- Difficulty: ${entry.metadata.difficulty}\n`;
    help += `- Reading Time: ${entry.metadata.readingTime} min\n`;

    if (entry.tags.length > 0) {
      help += `- Tags: ${entry.tags.join(', ')}\n`;
    }

    if (entry.metadata.relatedTools && entry.metadata.relatedTools.length > 0) {
      help += `- Related Tools: ${entry.metadata.relatedTools.join(', ')}\n`;
    }

    // Add related entries
    const related = await knowledgeBase.getSimilarEntries(entryId, 3);

    if (related.length > 0) {
      help += `\n🔗 Related Documentation:\n`;
      for (const r of related) {
        help += `- ${r.entry.title} (${r.relevance})\n`;
      }
    }

    return help;
  }

  async getHelpForTool(toolName: string): Promise<string> {
    const results = await knowledgeBase.search({
      text: toolName,
      limit: 1,
      tags: [toolName]
    });

    if (results.length === 0) {
      return `❌ No documentation found for tool: ${toolName}\n\n💡 Try "list tools" to see available tools.`;
    }

    return this.getDetailedHelp(results[0].entry.id);
  }

  async getSuggestionHelp(query: string): Promise<string> {
    const suggestions = await this.generateSuggestions(query);

    if (suggestions.length === 0) {
      return `❓ I couldn't find any documentation matching "${query}".\n\n💡 Try:\n- Checking your spelling\n- Using different keywords\n- Asking about a specific tool or topic\n- Browsing available documentation with "list docs"`;
    }

    return `🔍 Did you mean:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n💡 Type the number or the exact name to view details.`;
  }

  async listAvailableTopics(): Promise<string> {
    const categories = await knowledgeBase.getCategories();

    let output = '📚 Available Documentation Topics:\n\n';

    for (const category of categories) {
      const entries = await knowledgeBase.getByCategory(category);
      output += `### ${this.formatCategory(category)} (${entries.length})\n`;

      for (const entry of entries.slice(0, 5)) {
        const icon = this.getIconForType(entry.type);
        output += `- ${icon} ${entry.title}\n`;
      }

      if (entries.length > 5) {
        output += `- ... and ${entries.length - 5} more\n`;
      }

      output += '\n';
    }

    output += `💡 Use "help <topic>" to get detailed information about any topic.`;

    return output;
  }

  async listAvailableTools(): Promise<string> {
    const tools = await knowledgeBase.getByType('documentation');
    const toolEntries = tools.filter(e => e.metadata.relatedTools);

    let output = '🔧 Available Tools:\n\n';

    // Group by category
    const byCategory = new Map<string, typeof toolEntries>();

    for (const entry of toolEntries) {
      const category = entry.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(entry);
    }

    // Display by category
    for (const [category, entries] of byCategory.entries()) {
      output += `### ${this.formatCategory(category)}\n`;

      for (const entry of entries) {
        output += `- **${entry.metadata.relatedTools![0]}**: ${entry.description}\n`;
      }

      output += '\n';
    }

    return output;
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    const results = await knowledgeBase.search({
      text: query,
      limit: 5,
      threshold: 0.3
    });

    return results.map(r => r.entry.title);
  }

  private formatCategory(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'documentation': return '📖';
      case 'tutorial': return '📚';
      case 'faq': return '❓';
      case 'troubleshooting': return '🔧';
      case 'best-practice': return '✨';
      case 'example': return '💡';
      case 'reference': return '📋';
      default: return '📄';
    }
  }
}

// Global help system instance
export const helpSystem = new HelpSystem();
```

---

## Phase 4: Testing & Integration (Week 3)

### 4.1 Unit Tests for Knowledge Base

Create `src/knowledge/manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBaseManager } from './manager';
import type { KnowledgeType, KnowledgeCategory } from './types';

describe('KnowledgeBaseManager', () => {
  let kb: KnowledgeBaseManager;

  beforeEach(() => {
    kb = new KnowledgeBaseManager({
      enableEmbeddings: false,
      enableCaching: false
    });
  });

  describe('addEntry', () => {
    it('should add a knowledge entry', async () => {
      const entry = await kb.addEntry({
        type: 'documentation',
        title: 'Test Entry',
        content: 'Test content',
        tags: ['test'],
        category: 'getting-started',
        metadata: {
          difficulty: 'beginner',
          readingTime: 5
        }
      });

      expect(entry.id).toBeDefined();
      expect(entry.title).toBe('Test Entry');
      expect(entry.type).toBe('documentation');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await kb.addEntry({
        type: 'documentation',
        title: 'How to use bash tool',
        content: 'The bash tool allows you to execute shell commands...',
        tags: ['bash', 'terminal'],
        category: 'tools',
        metadata: {
          difficulty: 'beginner',
          readingTime: 3
        }
      });

      await kb.addEntry({
        type: 'tutorial',
        title: 'Getting Started with SuperCoin',
        content: 'Welcome to SuperCoin, your AI-powered CLI...',
        tags: ['getting-started', 'tutorial'],
        category: 'getting-started',
        metadata: {
          difficulty: 'beginner',
          readingTime: 10
        }
      });
    });

    it('should search by text', async () => {
      const results = await kb.search({
        text: 'bash'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.title).toContain('bash');
    });

    it('should search by category', async () => {
      const results = await kb.search({
        text: 'test',
        category: 'tools'
      });

      expect(results.every(r => r.entry.category === 'tools')).toBe(true);
    });

    it('should search by tag', async () => {
      const results = await kb.search({
        text: 'test',
        tags: ['bash']
      });

      expect(results.every(r => r.entry.tags.includes('bash'))).toBe(true);
    });
  });

  describe('getEntry', () => {
    it('should retrieve entry by ID', async () => {
      const created = await kb.addEntry({
        type: 'documentation',
        title: 'Test Entry',
        content: 'Test',
        tags: [],
        category: 'getting-started',
        metadata: { difficulty: 'beginner', readingTime: 1 }
      });

      const retrieved = await kb.getEntry(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent entry', async () => {
      const retrieved = await kb.getEntry('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateEntry', () => {
    it('should update entry content', async () => {
      const entry = await kb.addEntry({
        type: 'documentation',
        title: 'Test Entry',
        content: 'Original content',
        tags: [],
        category: 'getting-started',
        metadata: { difficulty: 'beginner', readingTime: 1 }
      });

      const updated = await kb.updateEntry(entry.id, {
        content: 'Updated content'
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(entry.createdAt.getTime());
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry', async () => {
      const entry = await kb.addEntry({
        type: 'documentation',
        title: 'Test Entry',
        content: 'Test',
        tags: [],
        category: 'getting-started',
        metadata: { difficulty: 'beginner', readingTime: 1 }
      });

      const deleted = await kb.deleteEntry(entry.id);

      expect(deleted).toBe(true);

      const retrieved = await kb.getEntry(entry.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('getByCategory', () => {
    it('should filter by category', async () => {
      await kb.addEntry({
        type: 'documentation',
        title: 'Tool Doc',
        content: 'Content',
        tags: [],
        category: 'tools',
        metadata: { difficulty: 'beginner', readingTime: 1 }
      });

      await kb.addEntry({
        type: 'documentation',
        title: 'Tutorial',
        content: 'Content',
        tags: [],
        category: 'getting-started',
        metadata: { difficulty: 'beginner', readingTime: 1 }
      });

      const tools = await kb.getByCategory('tools');

      expect(tools.length).toBe(1);
      expect(tools[0].category).toBe('tools');
    });
  });
});
```

---

## Summary

This implementation plan provides:

1. **Knowledge Base System**: Full CRUD operations for documentation entries
2. **Search Capabilities**: Keyword and semantic search with caching
3. **Self-Documentation**: Auto-generate docs from code comments
4. **Interactive Help**: Context-aware help system with suggestions
5. **Documentation Management**: Categories, tags, and metadata
6. **Testing**: Comprehensive unit tests

**Key Benefits**:
- Intelligent search with relevance scoring
- Context-aware help based on current session
- Self-documenting codebase
- Easy navigation with categories and tags
- Suggestion system for related topics

**Next Steps**:
1. Implement knowledge base manager
2. Create documentation generator
3. Build interactive help system
4. Add comprehensive tests
5. Populate knowledge base with content
6. Integrate with CLI help commands

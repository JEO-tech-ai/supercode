export type KBEntryType =
  | 'tool'
  | 'command'
  | 'concept'
  | 'example'
  | 'faq'
  | 'troubleshooting'
  | 'best-practice'
  | 'custom';

export interface KBEntry {
  id: string;
  type: KBEntryType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  category?: string;
  relatedIds?: string[];
  metadata?: {
    author?: string;
    createdAt?: Date;
    updatedAt?: Date;
    version?: string;
    language?: string;
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    dependencies?: string[];
    source?: string;
  };
  references?: KBReference[];
}

export interface KBReference {
  type: 'file' | 'url' | 'code' | 'session';
  location: string;
  line?: number;
  label?: string;
}

export interface KBCategory {
  id: string;
  name: string;
  description: string;
  parentCategoryId?: string;
  children: string[];
  icon?: string;
  order: number;
}

export interface KBSearchResult {
  entry: KBEntry;
  score: number;
  highlights: Array<{ field: string; text: string }>;
}

export interface KBQuery {
  text: string;
  types?: KBEntryType[];
  categories?: string[];
  tags?: string[];
  limit?: number;
  offset?: number;
  includeRelated?: boolean;
}

export interface KBStats {
  totalEntries: number;
  entriesByType: Record<KBEntryType, number>;
  totalCategories: number;
  totalTags: number;
  topTags: Array<{ tag: string; count: number }>;
  lastUpdated: Date;
}

export interface KBImportConfig {
  format: 'json' | 'yaml' | 'markdown';
  mergeStrategy: 'replace' | 'merge' | 'skip';
  validate: boolean;
}

export interface KBExportConfig {
  format: 'json' | 'yaml' | 'markdown';
  includeMetadata: boolean;
  includeReferences: boolean;
  filter?: {
    types?: KBEntryType[];
    categories?: string[];
    tags?: string[];
  };
}

export interface KBDocumentationSection {
  id: string;
  title: string;
  content: string;
  order: number;
  parentSectionId?: string;
  subsections: string[];
}

export interface KBDocumentation {
  id: string;
  title: string;
  description: string;
  version: string;
  sections: KBDocumentationSection[];
  lastGenerated: Date;
}

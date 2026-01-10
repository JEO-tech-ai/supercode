import * as fs from 'fs/promises';
import * as path from 'path';
import { Log } from '../../shared/logger';
import type {
  KBEntry,
  KBDocumentation,
  KBDocumentationSection,
} from './types';

export class SelfDocumentationGenerator {
  private docsPath: string;

  constructor(docsPath: string = path.join(process.cwd(), '.supercoin', 'docs')) {
    this.docsPath = docsPath;
  }

  async generateFromCode(codePath: string): Promise<KBDocumentation> {
    const files = await this.scanCode(codePath);
    const sections: KBDocumentationSection[] = [];

    for (const file of files) {
      const fileSections = await this.parseFile(file);
      sections.push(...fileSections);
    }

    const documentation: KBDocumentation = {
      id: this.generateId(),
      title: 'Auto-Generated Documentation',
      description: 'Documentation automatically generated from code',
      version: '1.0.0',
      sections,
      lastGenerated: new Date(),
    };

    return documentation;
  }

  async generateFromTools(toolPaths: string[]): Promise<KBEntry[]> {
    const entries: KBEntry[] = [];

    for (const toolPath of toolPaths) {
      const entry = await this.parseToolFile(toolPath);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  async generateFromComments(codePath: string): Promise<KBEntry[]> {
    const files = await this.scanCode(codePath);
    const entries: KBEntry[] = [];

    for (const file of files) {
      const fileEntries = await this.extractComments(file);
      entries.push(...fileEntries);
    }

    return entries;
  }

  private async scanCode(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentPath: string): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    }

    await scan(dirPath);
    return files;
  }

  private async parseFile(filePath: string): Promise<KBDocumentationSection[]> {
    const sections: KBDocumentationSection[] = [];
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);

    const classPattern = /export\s+class\s+(\w+)/g;
    const functionPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
    const interfacePattern = /export\s+interface\s+(\w+)/g;

    const patterns = [
      { regex: classPattern, type: 'class' },
      { regex: functionPattern, type: 'function' },
      { regex: interfacePattern, type: 'interface' },
    ];

    for (const { regex, type } of patterns) {
      let match;
      regex.lastIndex = 0;

      while ((match = regex.exec(content)) !== null) {
        sections.push({
          id: this.generateId(),
          title: `${type}: ${match[1]}`,
          content: `Found ${type} \`${match[1]}\` in ${relativePath}`,
          order: sections.length,
          subsections: [],
        });
      }
    }

    return sections;
  }

  private async parseToolFile(filePath: string): Promise<KBEntry | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);

      const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
      const descriptionMatch = content.match(/description:\s*["']([^"']+)["']/);

      if (!nameMatch || !descriptionMatch) {
        return undefined;
      }

      const entry: KBEntry = {
        id: this.generateId(),
        type: 'tool',
        title: nameMatch[1],
        description: descriptionMatch[1],
        content: `Tool implementation found in ${relativePath}`,
        tags: ['tool', 'generated'],
        category: 'tools',
        metadata: {
          source: filePath,
          complexity: 'beginner',
          language: 'typescript',
        },
      };

      return entry;
    } catch (error) {
      Log.warn(`Failed to parse tool file ${filePath}: ${(error as Error).message}`);
      return undefined;
    }
  }

  private async extractComments(filePath: string): Promise<KBEntry[]> {
    const entries: KBEntry[] = [];
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);

    const docBlockPattern = /\/\*\*[\s\S]*?\*\//g;
    const singleLinePattern = /\/\/\s*@doc\s+(.+)/g;

    let match;

    while ((match = docBlockPattern.exec(content)) !== null) {
      const comment = match[0];
      const entry = this.parseDocBlock(comment, relativePath);
      if (entry) {
        entries.push(entry);
      }
    }

    while ((match = singleLinePattern.exec(content)) !== null) {
      const comment = match[1];
      entries.push({
        id: this.generateId(),
        type: 'example',
        title: `Inline documentation from ${relativePath}`,
        description: comment,
        content: comment,
        tags: ['inline', 'generated'],
        metadata: {
          source: filePath,
          complexity: 'beginner',
        },
      });
    }

    return entries;
  }

  private parseDocBlock(comment: string, filePath: string): KBEntry | undefined {
    const lines = comment.split('\n').map(line => line.replace(/^\s*\*?\s*/, '').trim());
    const content = lines.slice(1, -1).join('\n');

    if (!content || content.length < 10) {
      return undefined;
    }

    return {
      id: this.generateId(),
      type: 'concept',
      title: content.split('\n')[0].substring(0, 50),
      description: content.substring(0, 200),
      content,
      tags: ['documentation', 'generated'],
      metadata: {
        source: filePath,
        complexity: 'intermediate',
      },
    };
  }

  async saveDocumentation(documentation: KBDocumentation, format: 'json' | 'markdown' = 'json'): Promise<string> {
    await fs.mkdir(this.docsPath, { recursive: true });

    const fileName = `${documentation.id}.${format === 'json' ? 'json' : 'md'}`;
    const filePath = path.join(this.docsPath, fileName);

    const content = format === 'json'
      ? JSON.stringify(documentation, null, 2)
      : this.convertToMarkdown(documentation);

    await fs.writeFile(filePath, content, 'utf-8');

    Log.info(`📄 Saved documentation to ${filePath}`);
    return filePath;
  }

  private convertToMarkdown(documentation: KBDocumentation): string {
    let md = `# ${documentation.title}\n\n`;
    md += `${documentation.description}\n\n`;
    md += `**Version:** ${documentation.version}\n`;
    md += `**Last Generated:** ${documentation.lastGenerated.toISOString()}\n\n`;

    for (const section of this.sortSections(documentation.sections)) {
      md += `## ${section.title}\n\n`;
      md += `${section.content}\n\n`;

      if (section.subsections && section.subsections.length > 0) {
        for (const subsectionId of section.subsections) {
          const subsection = documentation.sections.find(s => s.id === subsectionId);
          if (subsection) {
            md += `### ${subsection.title}\n\n`;
            md += `${subsection.content}\n\n`;
          }
        }
      }
    }

    return md;
  }

  private sortSections(sections: KBDocumentationSection[]): KBDocumentationSection[] {
    return [...sections].sort((a, b) => a.order - b.order);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const selfDocumentationGenerator = new SelfDocumentationGenerator();

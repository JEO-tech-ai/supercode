/**
 * Skill Loader
 * Load and parse skill files from various sources
 */

import * as fs from "fs/promises";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import { EventEmitter } from "events";
import type {
  Skill,
  SkillFrontmatter,
  SkillSource,
  SkillLoadOptions,
  SkillRegistryEvents,
} from "./types";
import {
  getSkillPaths,
  DEFAULT_SKILL_FRONTMATTER,
  FRONTMATTER_DELIMITER,
  SKILL_INSTRUCTION_TAG,
  SKILL_CACHE_TTL,
  MAX_SKILL_FILE_SIZE,
} from "./constants";

/**
 * Skill cache entry
 */
interface SkillCacheEntry {
  skill: Skill;
  loadedAt: number;
}

/**
 * Skill Loader class
 * Handles loading, parsing, and caching of skill files
 */
export class SkillLoader extends EventEmitter {
  private cache = new Map<string, SkillCacheEntry>();
  private skillPaths: Record<SkillSource, string>;
  private cwd: string;

  constructor(cwd?: string) {
    super();
    this.cwd = cwd || process.cwd();
    this.skillPaths = getSkillPaths(this.cwd);
  }

  /**
   * Set the current working directory and update skill paths
   */
  setCwd(cwd: string): void {
    this.cwd = cwd;
    this.skillPaths = getSkillPaths(cwd);
    this.cache.clear();
  }

  /**
   * Load all skills from configured sources
   */
  async loadAll(options: SkillLoadOptions = {}): Promise<Skill[]> {
    const {
      includeProject = true,
      includeUser = true,
      includeGlobal = true,
      includeBuiltin = true,
      tags,
      agent,
      refresh = false,
    } = options;

    const skills: Skill[] = [];
    const sources: SkillSource[] = [];

    if (includeProject) sources.push("project");
    if (includeUser) sources.push("user");
    if (includeGlobal) sources.push("global");
    if (includeBuiltin) sources.push("builtin");

    for (const source of sources) {
      const sourceSkills = await this.loadFromSource(source, refresh);
      skills.push(...sourceSkills);
    }

    // Apply filters
    let filtered = skills;

    if (tags && tags.length > 0) {
      filtered = filtered.filter((skill) =>
        tags.some((tag) => skill.frontmatter.tags?.includes(tag))
      );
    }

    if (agent) {
      filtered = filtered.filter(
        (skill) => skill.frontmatter.agent === agent
      );
    }

    // Sort by priority (descending)
    filtered.sort(
      (a, b) =>
        (b.frontmatter.priority || 0) - (a.frontmatter.priority || 0)
    );

    this.emit("skills:refreshed", { count: filtered.length });
    return filtered;
  }

  /**
   * Load skills from a specific source
   */
  async loadFromSource(
    source: SkillSource,
    refresh = false
  ): Promise<Skill[]> {
    const sourcePath = this.skillPaths[source];
    const skills: Skill[] = [];

    try {
      // Check if directory exists
      await fs.access(sourcePath);

      // Find all .md files
      const files = await this.findSkillFiles(sourcePath);

      for (const file of files) {
        try {
          const skill = await this.loadSkillFile(file, source, refresh);
          if (skill) {
            skills.push(skill);
            this.emit("skill:loaded", { skill });
          }
        } catch (error) {
          this.emit("skill:error", {
            skillId: path.basename(file, ".md"),
            error: error as Error,
          });
        }
      }
    } catch {
      // Directory doesn't exist, skip silently
    }

    return skills;
  }

  /**
   * Load a single skill by ID
   */
  async loadById(skillId: string, refresh = false): Promise<Skill | null> {
    // Check cache first
    if (!refresh) {
      const cached = this.cache.get(skillId);
      if (cached && Date.now() - cached.loadedAt < SKILL_CACHE_TTL) {
        return cached.skill;
      }
    }

    // Search all sources
    const sources: SkillSource[] = ["project", "user", "global", "builtin"];

    for (const source of sources) {
      const sourcePath = this.skillPaths[source];
      const filePath = path.join(sourcePath, `${skillId}.md`);

      try {
        await fs.access(filePath);
        return await this.loadSkillFile(filePath, source, true);
      } catch {
        // File doesn't exist in this source
      }

      // Try nested paths (e.g., backend/api-design.md)
      try {
        const files = await this.findSkillFiles(sourcePath);
        const matchingFile = files.find((f) => {
          const name = path.basename(f, ".md");
          return name === skillId;
        });

        if (matchingFile) {
          return await this.loadSkillFile(matchingFile, source, true);
        }
      } catch {
        // Skip
      }
    }

    return null;
  }

  /**
   * Load a skill file and parse it
   */
  private async loadSkillFile(
    filePath: string,
    source: SkillSource,
    refresh: boolean
  ): Promise<Skill | null> {
    const skillId = this.getSkillId(filePath);

    // Check cache
    if (!refresh) {
      const cached = this.cache.get(skillId);
      if (cached && Date.now() - cached.loadedAt < SKILL_CACHE_TTL) {
        return cached.skill;
      }
    }

    // Read file
    const stat = await fs.stat(filePath);

    if (stat.size > MAX_SKILL_FILE_SIZE) {
      throw new Error(`Skill file too large: ${filePath}`);
    }

    const content = await fs.readFile(filePath, "utf-8");
    const { frontmatter, body } = this.parseFrontmatter(content);

    // Extract instruction from body
    const instruction = this.extractInstruction(body);

    const skill: Skill = {
      id: skillId,
      name: frontmatter.name || skillId,
      path: filePath,
      source,
      frontmatter: { ...DEFAULT_SKILL_FRONTMATTER, ...frontmatter },
      instruction,
      raw: content,
      mtime: stat.mtime,
    };

    // Update cache
    this.cache.set(skillId, { skill, loadedAt: Date.now() });

    return skill;
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): {
    frontmatter: Partial<SkillFrontmatter>;
    body: string;
  } {
    const lines = content.split("\n");

    // Check for frontmatter delimiter
    if (lines[0].trim() !== FRONTMATTER_DELIMITER) {
      return { frontmatter: {}, body: content };
    }

    // Find closing delimiter
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === FRONTMATTER_DELIMITER) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return { frontmatter: {}, body: content };
    }

    // Parse YAML
    const yamlContent = lines.slice(1, endIndex).join("\n");
    const body = lines.slice(endIndex + 1).join("\n").trim();

    try {
      const frontmatter = parseYaml(yamlContent) || {};
      return { frontmatter, body };
    } catch {
      return { frontmatter: {}, body: content };
    }
  }

  /**
   * Extract instruction content from body
   */
  private extractInstruction(body: string): string {
    // Look for <skill-instruction> tag
    const tagStart = `<${SKILL_INSTRUCTION_TAG}>`;
    const tagEnd = `</${SKILL_INSTRUCTION_TAG}>`;

    const startIndex = body.indexOf(tagStart);
    const endIndex = body.indexOf(tagEnd);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return body.slice(startIndex + tagStart.length, endIndex).trim();
    }

    // Return body without code blocks for instruction
    return body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  /**
   * Find all skill files in a directory
   */
  private async findSkillFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const subFiles = await this.findSkillFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get skill ID from file path
   */
  private getSkillId(filePath: string): string {
    return path.basename(filePath, ".md");
  }

  /**
   * Clear the skill cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; skills: string[] } {
    return {
      size: this.cache.size,
      skills: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global skill loader instance
 */
let globalSkillLoader: SkillLoader | null = null;

/**
 * Get the global skill loader instance
 */
export function getSkillLoader(cwd?: string): SkillLoader {
  if (!globalSkillLoader) {
    globalSkillLoader = new SkillLoader(cwd);
  } else if (cwd) {
    globalSkillLoader.setCwd(cwd);
  }
  return globalSkillLoader;
}

/**
 * Reset the global skill loader
 */
export function resetSkillLoader(): void {
  globalSkillLoader = null;
}

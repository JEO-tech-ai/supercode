import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Skill, SkillRegistry, SkillMCPConfig } from "./types";
import logger from "../../../shared/logger";

export function resolveSkillsDir(dir: string): string {
  if (dir.startsWith("~")) {
    return path.join(os.homedir(), dir.slice(1));
  }
  return dir;
}

export function loadSkillRegistry(
  config: SkillMCPConfig
): SkillRegistry | null {
  const dir = resolveSkillsDir(config.skillsDir);
  const registryPath = path.join(dir, "skills.json");

  try {
    if (!fs.existsSync(registryPath)) {
      logger.warn("[skill-mcp] skills.json not found", { path: registryPath });
      return null;
    }

    const content = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(content) as SkillRegistry;
  } catch (error) {
    logger.error("[skill-mcp] Failed to load registry", error);
    return null;
  }
}

export function loadSkillContent(
  skill: Skill,
  config: SkillMCPConfig
): string | null {
  const dir = resolveSkillsDir(config.skillsDir);
  const fullPath = path.join(dir, skill.filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      logger.warn("[skill-mcp] Skill file not found", { path: fullPath });
      return null;
    }

    let content = fs.readFileSync(fullPath, "utf-8");

    if (content.length > config.maxContentLength) {
      content =
        content.slice(0, config.maxContentLength) + "\n\n[... truncated ...]";
    }

    return content;
  } catch (error) {
    logger.error("[skill-mcp] Failed to load skill", {
      skill: skill.name,
      error,
    });
    return null;
  }
}

export function findSkill(name: string, registry: SkillRegistry): Skill | null {
  let skill = registry.skills.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );

  if (skill) return skill;

  skill = registry.skills.find(
    (s) =>
      s.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(s.name.toLowerCase())
  );

  return skill ?? null;
}

export function searchSkills(query: string, registry: SkillRegistry): Skill[] {
  const lower = query.toLowerCase();

  return registry.skills.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.category.toLowerCase().includes(lower) ||
      s.triggers.some((t) => t.toLowerCase().includes(lower))
  );
}

export function listSkillsByCategory(
  registry: SkillRegistry
): Record<string, Skill[]> {
  const byCategory: Record<string, Skill[]> = {};

  for (const skill of registry.skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  return byCategory;
}

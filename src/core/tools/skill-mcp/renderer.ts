import type { Skill, SkillRegistry, SkillMCPConfig } from "./types";

export function renderSkillList(
  registry: SkillRegistry,
  mode: SkillMCPConfig["renderMode"]
): string {
  const byCategory = groupByCategory(registry.skills);
  const lines: string[] = ["# Available Skills\n"];

  for (const [category, skills] of Object.entries(byCategory)) {
    lines.push(`## ${category}\n`);

    for (const skill of skills) {
      if (mode === "toon") {
        lines.push(`- ${skill.name}`);
      } else if (mode === "compact") {
        lines.push(`- **${skill.name}**: ${skill.description}`);
      } else {
        lines.push(`### ${skill.name}`);
        lines.push(skill.description);
        lines.push(`Triggers: ${skill.triggers.join(", ")}`);
        lines.push("");
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function renderSkillContent(
  skill: Skill,
  content: string,
  mode: SkillMCPConfig["renderMode"]
): string {
  if (mode === "toon") {
    return extractKeySections(content);
  }

  if (mode === "compact") {
    return removeVerboseSections(content);
  }

  return `# Skill: ${skill.name}\n\n${content}`;
}

function groupByCategory(skills: Skill[]): Record<string, Skill[]> {
  const result: Record<string, Skill[]> = {};

  for (const skill of skills) {
    if (!result[skill.category]) {
      result[skill.category] = [];
    }
    result[skill.category].push(skill);
  }

  return result;
}

function extractKeySections(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith("#")) {
      result.push(line);
      inSection = true;
    } else if (inSection && line.trim()) {
      result.push(line);
      inSection = false;
    }
  }

  return result.join("\n");
}

function removeVerboseSections(content: string): string {
  let result = content;

  result = result.replace(/```[\s\S]*?```/g, "[code example removed]");
  result = result.replace(/## Example[\s\S]*?(?=##|$)/gi, "");

  return result;
}

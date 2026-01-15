export interface Skill {
  name: string;
  category: string;
  description: string;
  triggers: string[];
  filePath: string;
  content?: string;
}

export interface SkillRegistry {
  version: string;
  skills: Skill[];
}

export interface SkillMCPConfig {
  skillsDir: string;
  maxContentLength: number;
  renderMode: "full" | "compact" | "toon";
}

export const DEFAULT_CONFIG: SkillMCPConfig = {
  skillsDir: "~/.agent-skills",
  maxContentLength: 50000,
  renderMode: "compact",
};

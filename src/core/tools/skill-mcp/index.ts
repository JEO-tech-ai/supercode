import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import type { SkillMCPConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import {
  loadSkillRegistry,
  loadSkillContent,
  findSkill,
  searchSkills,
} from "./loader";
import { renderSkillList, renderSkillContent } from "./renderer";
import logger from "../../../shared/logger";

export interface SkillToolOptions {
  config?: Partial<SkillMCPConfig>;
}

export function createSkillMCPTool(
  options: SkillToolOptions = {}
): ToolDefinition {
  const config: SkillMCPConfig = {
    ...DEFAULT_CONFIG,
    ...options.config,
  };

  return {
    name: "skill",
    description: `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.`,

    parameters: [
      {
        name: "name",
        type: "string",
        description: "Name of the skill to load",
        required: true,
      },
      {
        name: "action",
        type: "string",
        description: "Action to perform (default: load)",
        required: false,
        default: "load",
      },
      {
        name: "query",
        type: "string",
        description: "Search query (for search action)",
        required: false,
      },
      {
        name: "mode",
        type: "string",
        description: "Render mode (default: compact)",
        required: false,
        default: "compact",
      },
    ],

    execute: async (
      args: Record<string, unknown>,
      context: ToolContext
    ): Promise<ToolResult> => {
      const action = (args.action as string) ?? "load";
      const mode =
        (args.mode as SkillMCPConfig["renderMode"]) ?? config.renderMode;

      const registry = loadSkillRegistry(config);
      if (!registry) {
        return {
          success: false,
          error: "Skill registry not found. Run skill setup first.",
        };
      }

      if (action === "list") {
        const list = renderSkillList(registry, mode);
        return {
          success: true,
          output: list,
        };
      }

      if (action === "search") {
        const query = (args.query as string) ?? (args.name as string);
        const results = searchSkills(query, registry);

        if (results.length === 0) {
          return {
            success: true,
            output: `No skills found matching "${query}"`,
          };
        }

        const formatted = results
          .map((s) => `- **${s.name}** (${s.category}): ${s.description}`)
          .join("\n");

        return {
          success: true,
          output: `Found ${results.length} skill(s):\n\n${formatted}`,
        };
      }

      const name = args.name as string;
      const skill = findSkill(name, registry);

      if (!skill) {
        const similar = searchSkills(name, registry).slice(0, 3);
        const suggestions =
          similar.length > 0
            ? `\n\nDid you mean: ${similar.map((s) => s.name).join(", ")}?`
            : "";

        return {
          success: false,
          error: `Skill "${name}" not found.${suggestions}`,
        };
      }

      const content = loadSkillContent(skill, config);
      if (!content) {
        return {
          success: false,
          error: `Failed to load skill content for "${name}"`,
        };
      }

      const rendered = renderSkillContent(skill, content, mode);

      logger.info("[skill-mcp] Loaded skill", { skill: skill.name, mode });

      return {
        success: true,
        output: rendered,
      };
    },
  };
}

export * from "./types";
export { loadSkillRegistry, findSkill, searchSkills } from "./loader";
export { renderSkillList, renderSkillContent } from "./renderer";
export const skillMCPTool = createSkillMCPTool();

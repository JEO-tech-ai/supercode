/**
 * Skill Tool
 * Tool for agents to load and execute skills
 */

import type {
  Skill,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillLoadOptions,
} from "./types";
import type { ToolSchema, ToolExecutionContext, ExecutionResult } from "../types";
import { getSkillLoader } from "./loader";
import { AGENT_MAPPING, TOKEN_MODES } from "./constants";

/**
 * Skill tool schema for agent registration
 */
export const skillToolSchema: ToolSchema = {
  name: "skill",
  description:
    "Load and execute a skill for specialized tasks. Skills provide structured workflows for common operations like API design, code review, debugging, and more.",
  category: "ai",
  parameters: [
    {
      name: "action",
      type: "string",
      description: "Action to perform: list, load, execute, or info",
      required: true,
      enum: ["list", "load", "execute", "info"],
    },
    {
      name: "skillId",
      type: "string",
      description: "Skill ID to load or execute (required for load/execute/info)",
      required: false,
    },
    {
      name: "args",
      type: "string",
      description: "Arguments to pass to the skill execution",
      required: false,
    },
    {
      name: "tags",
      type: "array",
      description: "Filter skills by tags (for list action)",
      required: false,
    },
    {
      name: "agent",
      type: "string",
      description: "Filter skills by agent (for list action)",
      required: false,
    },
    {
      name: "tokenMode",
      type: "string",
      description: "Token optimization mode: full, compact, or toon",
      required: false,
      enum: ["full", "compact", "toon"],
      default: "compact",
    },
  ],
  returns: {
    type: "object",
    description: "Skill operation result",
  },
  examples: [
    {
      description: "List all available skills",
      parameters: { action: "list" },
      expectedOutput: { skills: [] },
    },
    {
      description: "Load a specific skill",
      parameters: { action: "load", skillId: "api-design" },
      expectedOutput: { skill: {} },
    },
    {
      description: "Execute a skill",
      parameters: {
        action: "execute",
        skillId: "code-review",
        args: "Review the authentication module",
      },
      expectedOutput: { result: {} },
    },
  ],
};

/**
 * List available skills
 */
async function listSkills(options: SkillLoadOptions): Promise<{
  skills: Array<{
    id: string;
    name: string;
    description: string;
    agent: string;
    tags: string[];
    source: string;
  }>;
}> {
  const loader = getSkillLoader();
  const skills = await loader.loadAll(options);

  return {
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.frontmatter.description,
      agent: skill.frontmatter.agent || "cent",
      tags: skill.frontmatter.tags || [],
      source: skill.source,
    })),
  };
}

/**
 * Load a skill and return its content
 */
async function loadSkill(
  skillId: string,
  tokenMode: "full" | "compact" | "toon" = "compact"
): Promise<{
  skill: Skill | null;
  instruction: string;
  tokenReduction: number;
}> {
  const loader = getSkillLoader();
  const skill = await loader.loadById(skillId);

  if (!skill) {
    return {
      skill: null,
      instruction: "",
      tokenReduction: 0,
    };
  }

  const mode = TOKEN_MODES[tokenMode];
  let instruction = skill.instruction;

  // Apply token optimization
  if (tokenMode === "compact") {
    instruction = compactInstruction(instruction);
  } else if (tokenMode === "toon") {
    instruction = toonInstruction(instruction);
  }

  return {
    skill,
    instruction,
    tokenReduction: mode.tokenReduction,
  };
}

/**
 * Get skill info without full instruction
 */
async function getSkillInfo(skillId: string): Promise<{
  found: boolean;
  info?: {
    id: string;
    name: string;
    description: string;
    agent: string;
    agentInfo: typeof AGENT_MAPPING[keyof typeof AGENT_MAPPING];
    tags: string[];
    path: string;
    source: string;
    argumentHint?: string;
    allowedTools?: string[];
  };
}> {
  const loader = getSkillLoader();
  const skill = await loader.loadById(skillId);

  if (!skill) {
    return { found: false };
  }

  const agentKey = (skill.frontmatter.agent || "cent") as keyof typeof AGENT_MAPPING;

  return {
    found: true,
    info: {
      id: skill.id,
      name: skill.name,
      description: skill.frontmatter.description,
      agent: agentKey,
      agentInfo: AGENT_MAPPING[agentKey],
      tags: skill.frontmatter.tags || [],
      path: skill.path,
      source: skill.source,
      argumentHint: skill.frontmatter.argumentHint,
      allowedTools: skill.frontmatter.allowedTools,
    },
  };
}

/**
 * Execute a skill
 */
async function executeSkill(
  skillId: string,
  args: string | undefined,
  context: SkillExecutionContext,
  tokenMode: "full" | "compact" | "toon" = "compact"
): Promise<SkillExecutionResult> {
  const startTime = Date.now();

  try {
    const { skill, instruction } = await loadSkill(skillId, tokenMode);

    if (!skill) {
      return {
        success: false,
        error: new Error(`Skill not found: ${skillId}`),
        duration: Date.now() - startTime,
      };
    }

    // Build execution prompt
    const executionPrompt = buildExecutionPrompt(skill, instruction, args);

    return {
      success: true,
      output: executionPrompt,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Build execution prompt for a skill
 */
function buildExecutionPrompt(
  skill: Skill,
  instruction: string,
  args?: string
): string {
  const agentKey = (skill.frontmatter.agent || "cent") as keyof typeof AGENT_MAPPING;
  const agentInfo = AGENT_MAPPING[agentKey];

  const prompt = `<skill-execution>
<skill-id>${skill.id}</skill-id>
<skill-name>${skill.name}</skill-name>
<agent>${agentInfo.name}</agent>
<agent-model>${agentInfo.model}</agent-model>
${args ? `<arguments>${args}</arguments>` : ""}
${skill.frontmatter.allowedTools ? `<allowed-tools>${skill.frontmatter.allowedTools.join(", ")}</allowed-tools>` : ""}

<instruction>
${instruction}
</instruction>
</skill-execution>`;

  return prompt;
}

/**
 * Compact instruction for token reduction
 */
function compactInstruction(instruction: string): string {
  return instruction
    // Remove excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Condense bullet points
    .replace(/^\s*[-*]\s+/gm, "- ")
    // Remove empty lines in code blocks
    .replace(/```(\w*)\n+/g, "```$1\n")
    .replace(/\n+```/g, "\n```")
    .trim();
}

/**
 * Toon instruction for maximum token reduction
 */
function toonInstruction(instruction: string): string {
  return instruction
    // Apply compact first
    .replace(/\n{2,}/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove emphasis
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove code blocks, keep content
    .replace(/```\w*\n([\s\S]*?)```/g, "$1")
    // Condense all whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Skill tool implementation
 */
export async function skillTool(
  params: {
    action: "list" | "load" | "execute" | "info";
    skillId?: string;
    args?: string;
    tags?: string[];
    agent?: string;
    tokenMode?: "full" | "compact" | "toon";
  },
  context: ToolExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    let output: unknown;

    switch (params.action) {
      case "list":
        output = await listSkills({
          tags: params.tags,
          agent: params.agent,
        });
        break;

      case "load":
        if (!params.skillId) {
          throw new Error("skillId is required for load action");
        }
        output = await loadSkill(params.skillId, params.tokenMode || "compact");
        break;

      case "execute":
        if (!params.skillId) {
          throw new Error("skillId is required for execute action");
        }
        output = await executeSkill(
          params.skillId,
          params.args,
          {
            sessionId: context.sessionId,
            cwd: context.cwd,
            args: params.args,
            env: context.env,
          },
          params.tokenMode || "compact"
        );
        break;

      case "info":
        if (!params.skillId) {
          throw new Error("skillId is required for info action");
        }
        output = await getSkillInfo(params.skillId);
        break;

      default:
        throw new Error(`Unknown action: ${params.action}`);
    }

    return {
      success: true,
      output,
      duration: Date.now() - startTime,
      toolName: "skill",
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error as Error,
      duration: Date.now() - startTime,
      toolName: "skill",
    };
  }
}

/**
 * Format skill list for display
 */
export function formatSkillList(
  skills: Array<{
    id: string;
    name: string;
    description: string;
    agent: string;
    tags: string[];
  }>
): string {
  if (skills.length === 0) {
    return "No skills found.";
  }

  const lines: string[] = ["Available Skills:", ""];

  // Group by agent
  const byAgent = new Map<string, typeof skills>();

  for (const skill of skills) {
    const agent = skill.agent;
    if (!byAgent.has(agent)) {
      byAgent.set(agent, []);
    }
    byAgent.get(agent)!.push(skill);
  }

  for (const [agent, agentSkills] of byAgent) {
    const agentInfo = AGENT_MAPPING[agent as keyof typeof AGENT_MAPPING];
    lines.push(`[${agentInfo?.name || agent}]`);

    for (const skill of agentSkills) {
      const tags = skill.tags.length > 0 ? ` (${skill.tags.join(", ")})` : "";
      lines.push(`  /${skill.id} - ${skill.description}${tags}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

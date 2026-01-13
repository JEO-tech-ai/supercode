import { promises as fs } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { parseFrontmatter } from "./frontmatter";
import type {
  SkillScope,
  SkillMetadata,
  LoadedSkill,
  LazyContentLoader,
  SkillDefinition,
  DiscoverSkillsOptions,
} from "./types";
import type { SkillMcpConfig } from "../skill-mcp-manager/types";

function getClaudeConfigDir(): string {
  const envConfigDir = process.env.CLAUDE_CONFIG_DIR;
  if (envConfigDir) {
    return envConfigDir;
  }
  return join(homedir(), ".claude");
}

function parseSkillMcpConfigFromFrontmatter(
  content: string
): SkillMcpConfig | undefined {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return undefined;

  try {
    const lines = frontmatterMatch[1].split(/\r?\n/);
    let inMcp = false;
    let mcpIndent = 0;
    const mcpLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === "mcp:") {
        inMcp = true;
        continue;
      }
      if (inMcp) {
        const indent = line.search(/\S/);
        if (indent === -1) continue;
        if (mcpIndent === 0) mcpIndent = indent;
        if (indent < mcpIndent && line.trim()) {
          break;
        }
        mcpLines.push(line);
      }
    }

    if (mcpLines.length > 0) {
      return {} as SkillMcpConfig;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function loadMcpJsonFromDir(
  skillDir: string
): Promise<SkillMcpConfig | undefined> {
  const mcpJsonPath = join(skillDir, "mcp.json");

  try {
    const content = await fs.readFile(mcpJsonPath, "utf-8");
    const parsed = JSON.parse(content) as Record<string, unknown>;

    if (
      parsed &&
      typeof parsed === "object" &&
      "mcpServers" in parsed &&
      parsed.mcpServers
    ) {
      return parsed.mcpServers as SkillMcpConfig;
    }

    if (parsed && typeof parsed === "object" && !("mcpServers" in parsed)) {
      const hasCommandField = Object.values(parsed).some(
        (v) =>
          v && typeof v === "object" && "command" in (v as Record<string, unknown>)
      );
      if (hasCommandField) {
        return parsed as SkillMcpConfig;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseAllowedTools(allowedTools: string | undefined): string[] | undefined {
  if (!allowedTools) return undefined;
  return allowedTools.split(/\s+/).filter(Boolean);
}

function isMarkdownFile(entry: { name: string }): boolean {
  return entry.name.endsWith(".md") || entry.name.endsWith(".markdown");
}

async function resolveSymlinkAsync(path: string): Promise<string> {
  try {
    const realPath = await fs.realpath(path);
    return realPath;
  } catch {
    return path;
  }
}

async function loadSkillFromPath(
  skillPath: string,
  resolvedPath: string,
  defaultName: string,
  scope: SkillScope
): Promise<LoadedSkill | null> {
  try {
    const content = await fs.readFile(skillPath, "utf-8");
    const { data } = parseFrontmatter<SkillMetadata>(content);
    const frontmatterMcp = parseSkillMcpConfigFromFrontmatter(content);
    const mcpJsonMcp = await loadMcpJsonFromDir(resolvedPath);
    const mcpConfig = mcpJsonMcp || frontmatterMcp;

    const skillName = data.name || defaultName;
    const originalDescription = data.description || "";
    const formattedDescription = `(${scope} - Skill) ${originalDescription}`;

    const lazyContent: LazyContentLoader = {
      loaded: false,
      content: undefined,
      load: async () => {
        if (!lazyContent.loaded) {
          const fileContent = await fs.readFile(skillPath, "utf-8");
          const { body } = parseFrontmatter<SkillMetadata>(fileContent);
          lazyContent.content = `<skill-instruction>
Base directory for this skill: ${resolvedPath}/
File references (@path) in this skill are relative to this directory.

${body.trim()}
</skill-instruction>

<user-request>
$ARGUMENTS
</user-request>`;
          lazyContent.loaded = true;
        }
        return lazyContent.content!;
      },
    };

    const definition: SkillDefinition = {
      name: skillName,
      description: formattedDescription,
      template: "",
      model: data.model,
      agent: data.agent,
      subtask: data.subtask,
      argumentHint: data["argument-hint"],
    };

    return {
      name: skillName,
      path: skillPath,
      resolvedPath,
      definition,
      scope,
      license: data.license,
      compatibility: data.compatibility,
      metadata: data.metadata,
      allowedTools: parseAllowedTools(data["allowed-tools"]),
      mcpConfig,
      lazyContent,
    };
  } catch {
    return null;
  }
}

async function loadSkillsFromDir(
  skillsDir: string,
  scope: SkillScope
): Promise<LoadedSkill[]> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills: LoadedSkill[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryPath = join(skillsDir, entry.name);

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const resolvedPath = await resolveSymlinkAsync(entryPath);
      const dirName = entry.name;

      const skillMdPath = join(resolvedPath, "SKILL.md");
      try {
        await fs.access(skillMdPath);
        const skill = await loadSkillFromPath(skillMdPath, resolvedPath, dirName, scope);
        if (skill) skills.push(skill);
        continue;
      } catch {
      }

      const namedSkillMdPath = join(resolvedPath, `${dirName}.md`);
      try {
        await fs.access(namedSkillMdPath);
        const skill = await loadSkillFromPath(
          namedSkillMdPath,
          resolvedPath,
          dirName,
          scope
        );
        if (skill) skills.push(skill);
        continue;
      } catch {
      }

      continue;
    }

    if (isMarkdownFile(entry)) {
      const skillName = basename(entry.name, ".md");
      const skill = await loadSkillFromPath(entryPath, skillsDir, skillName, scope);
      if (skill) skills.push(skill);
    }
  }

  return skills;
}

function skillsToRecord(
  skills: LoadedSkill[]
): Record<string, SkillDefinition> {
  const result: Record<string, SkillDefinition> = {};
  for (const skill of skills) {
    result[skill.name] = skill.definition;
  }
  return result;
}

export async function loadUserSkills(): Promise<Record<string, SkillDefinition>> {
  const userSkillsDir = join(getClaudeConfigDir(), "skills");
  const skills = await loadSkillsFromDir(userSkillsDir, "user");
  return skillsToRecord(skills);
}

export async function loadProjectSkills(): Promise<Record<string, SkillDefinition>> {
  const projectSkillsDir = join(process.cwd(), ".claude", "skills");
  const skills = await loadSkillsFromDir(projectSkillsDir, "project");
  return skillsToRecord(skills);
}

export async function loadOpencodeGlobalSkills(): Promise<
  Record<string, SkillDefinition>
> {
  const opencodeSkillsDir = join(homedir(), ".config", "opencode", "skill");
  const skills = await loadSkillsFromDir(opencodeSkillsDir, "opencode");
  return skillsToRecord(skills);
}

export async function loadOpencodeProjectSkills(): Promise<
  Record<string, SkillDefinition>
> {
  const opencodeProjectDir = join(process.cwd(), ".opencode", "skill");
  const skills = await loadSkillsFromDir(opencodeProjectDir, "opencode-project");
  return skillsToRecord(skills);
}

export async function discoverAllSkills(): Promise<LoadedSkill[]> {
  const [opencodeProjectSkills, projectSkills, opencodeGlobalSkills, userSkills] =
    await Promise.all([
      discoverOpencodeProjectSkills(),
      discoverProjectClaudeSkills(),
      discoverOpencodeGlobalSkills(),
      discoverUserClaudeSkills(),
    ]);

  return [
    ...opencodeProjectSkills,
    ...projectSkills,
    ...opencodeGlobalSkills,
    ...userSkills,
  ];
}

export async function discoverSkills(
  options: DiscoverSkillsOptions = {}
): Promise<LoadedSkill[]> {
  const { includeClaudeCodePaths = true } = options;

  const [opencodeProjectSkills, opencodeGlobalSkills] = await Promise.all([
    discoverOpencodeProjectSkills(),
    discoverOpencodeGlobalSkills(),
  ]);

  if (!includeClaudeCodePaths) {
    return [...opencodeProjectSkills, ...opencodeGlobalSkills];
  }

  const [projectSkills, userSkills] = await Promise.all([
    discoverProjectClaudeSkills(),
    discoverUserClaudeSkills(),
  ]);

  return [
    ...opencodeProjectSkills,
    ...projectSkills,
    ...opencodeGlobalSkills,
    ...userSkills,
  ];
}

export async function getSkillByName(
  name: string,
  options: DiscoverSkillsOptions = {}
): Promise<LoadedSkill | undefined> {
  const skills = await discoverSkills(options);
  return skills.find((s) => s.name === name);
}

export async function discoverUserClaudeSkills(): Promise<LoadedSkill[]> {
  const userSkillsDir = join(getClaudeConfigDir(), "skills");
  return loadSkillsFromDir(userSkillsDir, "user");
}

export async function discoverProjectClaudeSkills(): Promise<LoadedSkill[]> {
  const projectSkillsDir = join(process.cwd(), ".claude", "skills");
  return loadSkillsFromDir(projectSkillsDir, "project");
}

export async function discoverOpencodeGlobalSkills(): Promise<LoadedSkill[]> {
  const opencodeSkillsDir = join(homedir(), ".config", "opencode", "skill");
  return loadSkillsFromDir(opencodeSkillsDir, "opencode");
}

export async function discoverOpencodeProjectSkills(): Promise<LoadedSkill[]> {
  const opencodeProjectDir = join(process.cwd(), ".opencode", "skill");
  return loadSkillsFromDir(opencodeProjectDir, "opencode-project");
}

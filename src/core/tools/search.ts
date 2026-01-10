import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export const grepTool: ToolDefinition = {
  name: "grep",
  description: "Search for a pattern in files",
  parameters: [
    {
      name: "pattern",
      type: "string",
      description: "The regex pattern to search for",
      required: true,
    },
    {
      name: "path",
      type: "string",
      description: "The directory or file to search in",
      required: false,
    },
    {
      name: "include",
      type: "string",
      description: "File pattern to include (e.g., '*.ts')",
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || context.workdir;
    const include = args.include as string | undefined;

    const resolvedPath = path.isAbsolute(searchPath)
      ? searchPath
      : path.resolve(context.workdir, searchPath);

    try {
      const regex = new RegExp(pattern);
      const matches: Array<{ file: string; line: number; content: string }> = [];

      await searchDirectory(resolvedPath, regex, include, matches);

      if (matches.length === 0) {
        return {
          success: true,
          output: "No matches found",
          data: { matches: [] },
        };
      }

      const output = matches
        .slice(0, 100)
        .map((m) => `${m.file}:${m.line}: ${m.content.trim()}`)
        .join("\n");

      return {
        success: true,
        output,
        data: { matches: matches.slice(0, 100), total: matches.length },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

async function searchDirectory(
  dir: string,
  pattern: RegExp,
  include: string | undefined,
  matches: Array<{ file: string; line: number; content: string }>
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    if (entry.isDirectory()) {
      await searchDirectory(fullPath, pattern, include, matches);
    } else if (entry.isFile()) {
      if (include && !matchPattern(entry.name, include)) {
        continue;
      }

      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            matches.push({
              file: fullPath,
              line: i + 1,
              content: lines[i],
            });
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

function matchPattern(filename: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
  );
  return regex.test(filename);
}

export const globTool: ToolDefinition = {
  name: "glob",
  description: "Find files matching a pattern",
  parameters: [
    {
      name: "pattern",
      type: "string",
      description: "The glob pattern (e.g., '**/*.ts')",
      required: true,
    },
    {
      name: "path",
      type: "string",
      description: "The directory to search in",
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || context.workdir;

    const resolvedPath = path.isAbsolute(searchPath)
      ? searchPath
      : path.resolve(context.workdir, searchPath);

    try {
      const files: string[] = [];
      await findFiles(resolvedPath, pattern, files);

      if (files.length === 0) {
        return {
          success: true,
          output: "No files found",
          data: { files: [] },
        };
      }

      return {
        success: true,
        output: `Found ${files.length} file(s)\n\n${files.slice(0, 100).join("\n")}`,
        data: { files: files.slice(0, 100), total: files.length },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

async function findFiles(
  dir: string,
  pattern: string,
  files: string[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const parts = pattern.split("/");

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    if (entry.isDirectory()) {
      if (parts[0] === "**") {
        await findFiles(fullPath, pattern, files);
      } else if (matchPattern(entry.name, parts[0])) {
        await findFiles(fullPath, parts.slice(1).join("/"), files);
      }
    } else if (entry.isFile()) {
      const filePattern = parts[parts.length - 1];
      if (matchPattern(entry.name, filePattern)) {
        files.push(fullPath);
      }
    }
  }
}

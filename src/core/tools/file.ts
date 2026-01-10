import type { ToolDefinition, ToolContext, ToolResult } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export const readTool: ToolDefinition = {
  name: "read",
  description: "Read content from a file",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "The path to the file to read",
      required: true,
    },
    {
      name: "offset",
      type: "number",
      description: "Line number to start reading from (0-based)",
      required: false,
    },
    {
      name: "limit",
      type: "number",
      description: "Number of lines to read",
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.filePath as string;
    const offset = (args.offset as number) || 0;
    const limit = (args.limit as number) || 2000;

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context.workdir, filePath);

    try {
      const content = await fs.readFile(resolvedPath, "utf-8");
      const lines = content.split("\n");
      const selectedLines = lines.slice(offset, offset + limit);

      const numberedContent = selectedLines
        .map((line, index) => `${String(offset + index + 1).padStart(5)}| ${line}`)
        .join("\n");

      return {
        success: true,
        output: numberedContent,
        data: { totalLines: lines.length, readLines: selectedLines.length },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

export const writeTool: ToolDefinition = {
  name: "write",
  description: "Write content to a file",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "The path to the file to write",
      required: true,
    },
    {
      name: "content",
      type: "string",
      description: "The content to write",
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.filePath as string;
    const content = args.content as string;

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context.workdir, filePath);

    try {
      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(resolvedPath, content, "utf-8");

      return {
        success: true,
        output: `File written: ${resolvedPath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

export const editTool: ToolDefinition = {
  name: "edit",
  description: "Edit content in a file by replacing text",
  parameters: [
    {
      name: "filePath",
      type: "string",
      description: "The path to the file to edit",
      required: true,
    },
    {
      name: "oldString",
      type: "string",
      description: "The text to replace",
      required: true,
    },
    {
      name: "newString",
      type: "string",
      description: "The replacement text",
      required: true,
    },
    {
      name: "replaceAll",
      type: "boolean",
      description: "Replace all occurrences",
      required: false,
      default: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.filePath as string;
    const oldString = args.oldString as string;
    const newString = args.newString as string;
    const replaceAll = (args.replaceAll as boolean) || false;

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context.workdir, filePath);

    try {
      const content = await fs.readFile(resolvedPath, "utf-8");

      if (!content.includes(oldString)) {
        return {
          success: false,
          error: "oldString not found in content",
        };
      }

      const occurrences = content.split(oldString).length - 1;
      if (occurrences > 1 && !replaceAll) {
        return {
          success: false,
          error: `oldString found ${occurrences} times. Use replaceAll to replace all occurrences.`,
        };
      }

      const newContent = replaceAll
        ? content.split(oldString).join(newString)
        : content.replace(oldString, newString);

      await fs.writeFile(resolvedPath, newContent, "utf-8");

      return {
        success: true,
        output: `File edited: ${resolvedPath}`,
        data: { replacements: replaceAll ? occurrences : 1 },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

import { spawn } from "child_process";

export interface TemplateExpandOptions {
  template: string;
  args: string[];
  rawArgs: string;
  workdir: string;
  env?: Record<string, string>;
}

export interface ExpandResult {
  text: string;
  bashExecutions: Array<{
    command: string;
    output: string;
    success: boolean;
  }>;
}

export async function expandTemplate(options: TemplateExpandOptions): Promise<ExpandResult> {
  let result = options.template;
  const bashExecutions: ExpandResult["bashExecutions"] = [];

  result = expandPositionalArgs(result, options.args);

  result = result.replace(/\$ARGUMENTS/g, options.rawArgs || "");

  result = result.replace(/\{args\}/g, options.rawArgs || "");

  const bashResult = await expandBashCommands(result, options.workdir, options.env);
  result = bashResult.text;
  bashExecutions.push(...bashResult.executions);

  result = result.trim();

  return {
    text: result,
    bashExecutions,
  };
}

function expandPositionalArgs(template: string, args: string[]): string {
  let result = template;

  for (let i = 0; i < args.length; i++) {
    const pattern = new RegExp(`\\$${i + 1}(?!\\d)`, "g");
    result = result.replace(pattern, args[i]);
  }

  result = result.replace(/\$\d+/g, "");

  return result;
}

async function expandBashCommands(
  template: string,
  workdir: string,
  env?: Record<string, string>
): Promise<{ text: string; executions: ExpandResult["bashExecutions"] }> {
  const bashPattern = /`!([^`]+)`/g;
  const executions: ExpandResult["bashExecutions"] = [];
  let result = template;

  const matches: Array<{ full: string; command: string; index: number }> = [];
  let match;

  while ((match = bashPattern.exec(template)) !== null) {
    matches.push({
      full: match[0],
      command: match[1],
      index: match.index,
    });
  }

  for (const m of matches.reverse()) {
    try {
      const output = await runBashCommand(m.command, workdir, env);
      executions.unshift({
        command: m.command,
        output: output.trim(),
        success: true,
      });
      result = result.slice(0, m.index) + output.trim() + result.slice(m.index + m.full.length);
    } catch (error) {
      executions.unshift({
        command: m.command,
        output: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });
    }
  }

  return { text: result, executions };
}

async function runBashCommand(
  command: string,
  workdir: string,
  env?: Record<string, string>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-c", command], {
      cwd: workdir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => {
      proc.kill();
      reject(new Error("Command timed out after 10 seconds"));
    }, 10000);
  });
}

export function parseCommandArgs(input: string): {
  positional: string[];
  raw: string;
} {
  const trimmed = input.trim();

  if (!trimmed) {
    return { positional: [], raw: "" };
  }

  const positional: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = "";
    } else if (!inQuotes && char === " ") {
      if (current) {
        positional.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    positional.push(current);
  }

  return {
    positional,
    raw: trimmed,
  };
}

export function detectFilePaths(text: string): string[] {
  const pathPatterns = [
    /(?:^|\s)([.\/]?(?:[\w-]+\/)*[\w-]+\.\w+)(?:\s|$|:)/g,
    /@([\w\/.-]+)/g,
    /"([^"]+\.\w+)"/g,
    /'([^']+\.\w+)'/g,
  ];

  const paths = new Set<string>();

  for (const pattern of pathPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const path = match[1];
      if (path && !path.startsWith("http") && !path.includes("://")) {
        paths.add(path);
      }
    }
  }

  return Array.from(paths);
}

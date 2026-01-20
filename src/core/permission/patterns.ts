/**
 * Pattern Matching Utilities
 * Glob and wildcard pattern matching for permission rules.
 */

/**
 * Convert a glob pattern to a RegExp
 * Supports: *, **, ?, [abc], [!abc], {a,b,c}
 */
export function globToRegex(pattern: string): RegExp {
  let regex = "";
  let inBracket = false;
  let inBrace = false;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    const nextChar = pattern[i + 1];

    if (inBracket) {
      if (char === "]") {
        regex += "]";
        inBracket = false;
      } else if (char === "!" && pattern[i - 1] === "[") {
        regex += "^";
      } else {
        regex += char;
      }
      continue;
    }

    if (inBrace) {
      if (char === "}") {
        regex += ")";
        inBrace = false;
      } else if (char === ",") {
        regex += "|";
      } else {
        regex += escapeRegexChar(char);
      }
      continue;
    }

    switch (char) {
      case "*":
        if (nextChar === "*") {
          // ** matches any path including separators
          regex += ".*";
          i++;
        } else {
          // * matches any characters except path separator
          regex += "[^/]*";
        }
        break;
      case "?":
        // ? matches single character except path separator
        regex += "[^/]";
        break;
      case "[":
        regex += "[";
        inBracket = true;
        break;
      case "{":
        regex += "(";
        inBrace = true;
        break;
      case "/":
        regex += "\\/";
        break;
      default:
        regex += escapeRegexChar(char);
    }
  }

  return new RegExp(`^${regex}$`);
}

/**
 * Escape special regex characters
 */
function escapeRegexChar(char: string): string {
  const specialChars = /[.+^${}()|[\]\\]/;
  return specialChars.test(char) ? `\\${char}` : char;
}

/**
 * Test if a value matches a glob pattern
 */
export function matchGlob(pattern: string, value: string): boolean {
  // Handle exact match shortcut
  if (!pattern.includes("*") && !pattern.includes("?") && !pattern.includes("[") && !pattern.includes("{")) {
    return pattern === value;
  }

  try {
    const regex = globToRegex(pattern);
    return regex.test(value);
  } catch {
    // If pattern is invalid, fall back to exact match
    return pattern === value;
  }
}

/**
 * Test if a tool name matches a pattern
 * Supports simple wildcards for tool matching
 */
export function matchTool(pattern: string, toolName: string): boolean {
  // Exact match
  if (pattern === toolName) return true;

  // Wildcard all tools
  if (pattern === "*") return true;

  // Category prefix match (e.g., "shell.*" matches "shell.bash", "shell.exec")
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return toolName.startsWith(prefix + ".") || toolName === prefix;
  }

  // General glob match
  return matchGlob(pattern, toolName);
}

/**
 * Test if arguments match a pattern
 * Handles various argument formats
 */
export function matchArgs(
  pattern: string | undefined,
  args: Record<string, unknown> | undefined,
  argsString?: string
): boolean {
  // No pattern means match all
  if (!pattern || pattern === "*") return true;

  // No args means no match (unless pattern is *)
  if (!args && !argsString) return false;

  // If argsString is provided, use it directly
  if (argsString) {
    return matchGlob(pattern, argsString);
  }

  // Serialize args for matching
  const serialized = serializeArgs(args);
  return matchGlob(pattern, serialized);
}

/**
 * Serialize arguments to a string for pattern matching
 */
export function serializeArgs(args: Record<string, unknown> | undefined): string {
  if (!args) return "";

  // For shell commands, use the command directly
  if (typeof args.command === "string") {
    return args.command;
  }

  // For file operations, use the path
  if (typeof args.path === "string") {
    return args.path;
  }

  if (typeof args.file_path === "string") {
    return args.file_path;
  }

  // For URLs
  if (typeof args.url === "string") {
    return args.url;
  }

  // Default: JSON stringify relevant args
  const relevantKeys = Object.keys(args).filter(
    (k) => !["sessionId", "workdir", "timestamp"].includes(k)
  );
  if (relevantKeys.length === 0) return "";

  return relevantKeys.map((k) => `${k}=${String(args[k])}`).join(" ");
}

/**
 * Extract the primary argument value for display
 */
export function extractPrimaryArg(args: Record<string, unknown> | undefined): string | undefined {
  if (!args) return undefined;

  // Priority order for primary arg extraction
  const primaryKeys = ["command", "path", "file_path", "url", "query", "pattern", "name"];

  for (const key of primaryKeys) {
    if (typeof args[key] === "string") {
      return args[key] as string;
    }
  }

  return undefined;
}

/**
 * Check if a path is within a directory
 */
export function isPathWithin(targetPath: string, directory: string): boolean {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedDir = normalizePath(directory);

  return normalizedTarget.startsWith(normalizedDir + "/") || normalizedTarget === normalizedDir;
}

/**
 * Normalize a file path
 */
export function normalizePath(path: string): string {
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, "");

  // Handle home directory
  if (normalized.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    normalized = home + normalized.slice(1);
  }

  return normalized;
}

/**
 * Check if a pattern is dangerous (matches too broadly)
 */
export function isDangerousPattern(pattern: string): boolean {
  const dangerousPatterns = [
    "rm -rf /",
    "rm -rf /*",
    "rm -rf ~",
    "rm -rf ~/*",
    ":(){:|:&};:",
    "dd if=/dev/zero",
    "mkfs.",
    "> /dev/sd",
    "chmod -R 777 /",
    "chown -R",
  ];

  return dangerousPatterns.some((dp) => pattern.includes(dp));
}

/**
 * Parse command and extract executable name
 */
export function extractExecutable(command: string): string | undefined {
  const trimmed = command.trim();

  // Handle common prefixes
  const prefixes = ["sudo ", "env ", "nohup ", "nice ", "time "];
  let cleaned = trimmed;

  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // Extract first word (executable)
  const match = cleaned.match(/^([^\s]+)/);
  return match?.[1];
}

/**
 * Check if a command modifies the filesystem
 */
export function isFileSystemModification(command: string): boolean {
  const modifyingCommands = [
    "rm", "rmdir", "mv", "cp", "touch", "mkdir",
    "chmod", "chown", "ln", "install",
    "git checkout", "git reset", "git clean",
    "npm install", "yarn", "pnpm", "bun install",
    "pip install", "cargo install",
  ];

  const executable = extractExecutable(command);
  if (!executable) return false;

  // Check if command starts with any modifying command
  return modifyingCommands.some((mc) =>
    command.startsWith(mc) || executable === mc.split(" ")[0]
  );
}

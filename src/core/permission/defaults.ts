/**
 * Default Permission Rules and Configuration
 * Safe defaults with protection for critical system areas.
 */

import type { PermissionRule, PermissionConfig, PermissionRuleset } from "./types";
import { createRule } from "./rules";

/**
 * Default permission configuration
 */
export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  enabled: true,
  defaultDecision: "ask",
  askTimeout: 60000, // 60 seconds
  devModeBypass: false,
  rulesPath: undefined,
  logDecisions: false,
  trackStats: true,
  blockedPatterns: [
    "rm -rf /",
    "rm -rf /*",
    "rm -rf ~",
    "rm -rf ~/*",
    ":(){:|:&};:",
    "dd if=/dev/zero of=/dev/sd*",
    "> /dev/sd*",
    "mkfs.*",
    "chmod -R 777 /",
  ],
  trustedPatterns: [
    "ls *",
    "cat *",
    "echo *",
    "pwd",
    "whoami",
    "date",
    "which *",
    "type *",
  ],
};

/**
 * Read-only tools that are generally safe
 */
export const READ_ONLY_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
  "AskUserQuestion",
  "TodoRead",
];

/**
 * Tools that modify filesystem
 */
export const FILESYSTEM_TOOLS = [
  "Write",
  "Edit",
  "NotebookEdit",
];

/**
 * Tools that execute commands
 */
export const EXECUTION_TOOLS = [
  "Bash",
  "Task",
];

/**
 * Default safe rules for read operations
 */
export function createDefaultReadRules(): PermissionRule[] {
  return READ_ONLY_TOOLS.map((tool, index) =>
    createRule({
      tool,
      action: "allow",
      reason: "Read-only operation",
      scope: "global",
      priority: index,
      metadata: { source: "default" },
    })
  );
}

/**
 * Default rules for critical file protection
 */
export function createCriticalFileProtectionRules(): PermissionRule[] {
  const criticalPatterns = [
    // System files
    { pattern: "/etc/*", reason: "System configuration" },
    { pattern: "/var/*", reason: "System data" },
    { pattern: "/usr/*", reason: "System binaries" },
    { pattern: "/bin/*", reason: "System binaries" },
    { pattern: "/sbin/*", reason: "System binaries" },
    { pattern: "/boot/*", reason: "Boot configuration" },
    // Sensitive files
    { pattern: "*/.ssh/*", reason: "SSH credentials" },
    { pattern: "*/.aws/*", reason: "AWS credentials" },
    { pattern: "*/.gnupg/*", reason: "GPG keys" },
    { pattern: "*/credentials*", reason: "Credentials file" },
    { pattern: "*/.env*", reason: "Environment secrets" },
    { pattern: "*/.netrc", reason: "Network credentials" },
    // Package manager locks
    { pattern: "*/package-lock.json", reason: "Package lock" },
    { pattern: "*/yarn.lock", reason: "Package lock" },
    { pattern: "*/pnpm-lock.yaml", reason: "Package lock" },
    { pattern: "*/bun.lockb", reason: "Package lock" },
    { pattern: "*/Cargo.lock", reason: "Package lock" },
  ];

  return criticalPatterns.map((p, index) =>
    createRule({
      tool: "Write",
      pattern: p.pattern,
      action: "ask",
      reason: `Protected: ${p.reason}`,
      scope: "global",
      priority: 100 + index, // Higher priority than default allows
      metadata: { source: "default", tags: ["critical"] },
    })
  );
}

/**
 * Default rules for dangerous shell commands
 */
export function createDangerousCommandRules(): PermissionRule[] {
  const dangerousCommands = [
    // Destructive file operations
    { pattern: "rm -rf *", reason: "Recursive force delete" },
    { pattern: "rm -r *", reason: "Recursive delete" },
    { pattern: "rmdir *", reason: "Directory removal" },
    { pattern: "mv /* *", reason: "Moving system files" },
    // System modifications
    { pattern: "chmod *", reason: "Permission change" },
    { pattern: "chown *", reason: "Ownership change" },
    { pattern: "sudo *", reason: "Elevated privileges" },
    { pattern: "su *", reason: "User switch" },
    // Network operations
    { pattern: "curl * | *sh*", reason: "Remote script execution" },
    { pattern: "wget * | *sh*", reason: "Remote script execution" },
    // Package management (system-level)
    { pattern: "apt *", reason: "System package management" },
    { pattern: "apt-get *", reason: "System package management" },
    { pattern: "brew *", reason: "Package management" },
    { pattern: "yum *", reason: "System package management" },
    { pattern: "dnf *", reason: "System package management" },
    // Git destructive operations
    { pattern: "git push --force*", reason: "Force push" },
    { pattern: "git reset --hard*", reason: "Hard reset" },
    { pattern: "git clean -fd*", reason: "Clean untracked files" },
  ];

  return dangerousCommands.map((cmd, index) =>
    createRule({
      tool: "Bash",
      pattern: cmd.pattern,
      action: "ask",
      reason: `Dangerous: ${cmd.reason}`,
      scope: "global",
      priority: 200 + index, // High priority
      metadata: { source: "default", tags: ["dangerous"] },
    })
  );
}

/**
 * Default rules for project-scoped operations
 * These allow operations within the current project directory
 */
export function createProjectScopeRules(projectRoot: string): PermissionRule[] {
  return [
    createRule({
      tool: "Write",
      pattern: `${projectRoot}/**`,
      action: "allow",
      reason: "Within project directory",
      scope: "project",
      priority: 50,
      metadata: { source: "default" },
    }),
    createRule({
      tool: "Edit",
      pattern: `${projectRoot}/**`,
      action: "allow",
      reason: "Within project directory",
      scope: "project",
      priority: 50,
      metadata: { source: "default" },
    }),
    createRule({
      tool: "Bash",
      pattern: `cd ${projectRoot}*`,
      action: "allow",
      reason: "Navigate within project",
      scope: "project",
      priority: 50,
      metadata: { source: "default" },
    }),
  ];
}

/**
 * Create default ruleset with all default rules
 */
export function createDefaultRuleset(): PermissionRuleset {
  const rules = [
    ...createDefaultReadRules(),
    ...createCriticalFileProtectionRules(),
    ...createDangerousCommandRules(),
  ];

  return {
    id: "default",
    name: "Default Rules",
    description: "Built-in permission rules for safe operation",
    rules,
    scope: "global",
    enabled: true,
    version: 1,
  };
}

/**
 * Get risk level for a tool/args combination
 */
export function assessRiskLevel(
  tool: string,
  args?: Record<string, unknown>
): "low" | "medium" | "high" | "critical" {
  // Read-only tools are low risk
  if (READ_ONLY_TOOLS.includes(tool)) {
    return "low";
  }

  // File modification tools
  if (FILESYSTEM_TOOLS.includes(tool)) {
    if (!args) return "medium";

    const path = (args.path ?? args.file_path ?? "") as string;

    // Critical system paths
    if (
      path.startsWith("/etc/") ||
      path.startsWith("/var/") ||
      path.startsWith("/usr/") ||
      path.includes(".ssh") ||
      path.includes(".env")
    ) {
      return "critical";
    }

    // User home modifications
    if (path.startsWith(process.env.HOME ?? "~")) {
      return "medium";
    }

    return "medium";
  }

  // Command execution
  if (EXECUTION_TOOLS.includes(tool)) {
    if (!args) return "high";

    const command = (args.command ?? "") as string;

    // Critical commands
    if (
      command.includes("rm -rf") ||
      command.includes("sudo") ||
      command.includes("chmod") ||
      command.includes("dd if=")
    ) {
      return "critical";
    }

    // High risk commands
    if (
      command.includes("rm ") ||
      command.includes("mv ") ||
      command.includes("git push") ||
      command.includes("git reset")
    ) {
      return "high";
    }

    return "medium";
  }

  // Default for unknown tools
  return "medium";
}

/**
 * Check if a tool requires permission checking
 */
export function requiresPermissionCheck(tool: string): boolean {
  // These tools never need permission
  const exemptTools = [
    "AskUserQuestion",
    "TodoRead",
    "TodoWrite",
    "EnterPlanMode",
    "ExitPlanMode",
  ];

  return !exemptTools.includes(tool);
}

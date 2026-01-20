import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import {
  getPermissionManager,
  resetPermissionManager,
  createPermissionManager,
  createPermissionRequest,
  matchGlob,
  matchTool,
  matchArgs,
  serializeArgs,
  evaluateRequest,
  createRule,
  RuleStore,
  assessRiskLevel,
  isDangerousPattern,
} from "../../src/core/permission";

describe("Pattern Matching", () => {
  test("matchGlob with exact match", () => {
    expect(matchGlob("hello", "hello")).toBe(true);
    expect(matchGlob("hello", "world")).toBe(false);
  });

  test("matchGlob with wildcards", () => {
    expect(matchGlob("*.ts", "file.ts")).toBe(true);
    expect(matchGlob("*.ts", "file.js")).toBe(false);
    expect(matchGlob("src/*.ts", "src/index.ts")).toBe(true);
    expect(matchGlob("src/**/*.ts", "src/core/types.ts")).toBe(true);
  });

  test("matchGlob with single char wildcard", () => {
    expect(matchGlob("file?.ts", "file1.ts")).toBe(true);
    expect(matchGlob("file?.ts", "file12.ts")).toBe(false);
  });

  test("matchTool with exact match", () => {
    expect(matchTool("Bash", "Bash")).toBe(true);
    expect(matchTool("Bash", "Read")).toBe(false);
  });

  test("matchTool with wildcard all", () => {
    expect(matchTool("*", "Bash")).toBe(true);
    expect(matchTool("*", "Read")).toBe(true);
  });

  test("matchTool with category prefix", () => {
    expect(matchTool("shell.*", "shell.bash")).toBe(true);
    expect(matchTool("shell.*", "shell.exec")).toBe(true);
    expect(matchTool("shell.*", "file.read")).toBe(false);
  });

  test("matchArgs with pattern", () => {
    expect(matchArgs("rm *", { command: "rm -rf node_modules" }, "rm -rf node_modules")).toBe(true);
    expect(matchArgs("ls *", { command: "rm -rf node_modules" }, "rm -rf node_modules")).toBe(false);
  });

  test("serializeArgs extracts command", () => {
    expect(serializeArgs({ command: "ls -la" })).toBe("ls -la");
    expect(serializeArgs({ path: "/tmp/file.txt" })).toBe("/tmp/file.txt");
    expect(serializeArgs({ file_path: "/tmp/file.txt" })).toBe("/tmp/file.txt");
  });
});

describe("Rule Store", () => {
  let store: RuleStore;

  beforeEach(() => {
    store = new RuleStore();
  });

  test("should add and retrieve rules", () => {
    const rule = createRule({
      tool: "Bash",
      action: "allow",
      reason: "Test rule",
    });

    store.addRule(rule);
    expect(store.getRule(rule.id)).toBeDefined();
    expect(store.getRules().length).toBe(1);
  });

  test("should remove rules", () => {
    const rule = createRule({
      tool: "Bash",
      action: "allow",
    });

    store.addRule(rule);
    expect(store.removeRule(rule.id)).toBe(true);
    expect(store.getRule(rule.id)).toBeUndefined();
  });

  test("should filter rules by scope", () => {
    store.addRule(createRule({ tool: "Bash", action: "allow", scope: "session" }));
    store.addRule(createRule({ tool: "Read", action: "allow", scope: "global" }));

    expect(store.getRules("session").length).toBe(1);
    expect(store.getRules("global").length).toBe(1);
    expect(store.getRules().length).toBe(2);
  });

  test("should clear rules by scope", () => {
    store.addRule(createRule({ tool: "Bash", action: "allow", scope: "session" }));
    store.addRule(createRule({ tool: "Read", action: "allow", scope: "global" }));

    store.clearRules("session");
    expect(store.getRules("session").length).toBe(0);
    expect(store.getRules("global").length).toBe(1);
  });
});

describe("Rule Evaluation", () => {
  test("evaluateRequest returns default when no rules match", () => {
    const request = createPermissionRequest("UnknownTool");
    const result = evaluateRequest(request, [], "ask");

    expect(result.decision).toBe("ask");
    expect(result.matchedRule).toBeUndefined();
  });

  test("evaluateRequest uses last match wins", () => {
    const rules = [
      createRule({ tool: "Bash", action: "deny", priority: 1 }),
      createRule({ tool: "Bash", action: "allow", priority: 2 }), // Higher priority, evaluated later
    ];

    const request = createPermissionRequest("Bash", { command: "ls" });
    const result = evaluateRequest(request, rules, "ask");

    expect(result.decision).toBe("allow");
  });

  test("evaluateRequest matches patterns", () => {
    const rules = [
      // Use ** for shell commands that may contain /
      createRule({ tool: "Bash", pattern: "rm **", action: "deny", priority: 1 }),
      createRule({ tool: "Bash", pattern: "ls **", action: "allow", priority: 2 }),
    ];

    // createPermissionRequest sets argsString via serializeArgs
    const rmRequest = createPermissionRequest("Bash", { command: "rm -rf /" });
    const lsRequest = createPermissionRequest("Bash", { command: "ls -la" });

    // Verify argsString is set correctly
    expect(rmRequest.argsString).toBe("rm -rf /");
    expect(lsRequest.argsString).toBe("ls -la");

    expect(evaluateRequest(rmRequest, rules, "ask").decision).toBe("deny");
    expect(evaluateRequest(lsRequest, rules, "ask").decision).toBe("allow");
  });
});

describe("Permission Manager", () => {
  beforeEach(async () => {
    resetPermissionManager();
  });

  afterEach(async () => {
    resetPermissionManager();
  });

  test("should initialize and get singleton", async () => {
    const manager = getPermissionManager();
    await manager.initialize();

    expect(manager.getConfig().enabled).toBe(true);
  });

  test("should allow read-only tools by default", async () => {
    const manager = getPermissionManager();
    await manager.initialize();

    const request = createPermissionRequest("Read", { file_path: "/tmp/test.txt" });
    const result = await manager.check(request);

    expect(result.decision).toBe("allow");
  });

  test("should add and remove rules", async () => {
    const manager = getPermissionManager();
    await manager.initialize();

    const rule = manager.addRule({
      tool: "CustomTool",
      action: "deny",
    });

    expect(manager.getRules().find((r) => r.id === rule.id)).toBeDefined();

    manager.removeRule(rule.id);
    expect(manager.getRules().find((r) => r.id === rule.id)).toBeUndefined();
  });

  test("should configure manager", async () => {
    const manager = getPermissionManager();
    await manager.initialize();

    manager.configure({ enabled: false });
    expect(manager.getConfig().enabled).toBe(false);

    const request = createPermissionRequest("Bash", { command: "rm -rf /" });
    const result = await manager.check(request);

    expect(result.decision).toBe("allow"); // Disabled = allow all
  });

  test("should track statistics", async () => {
    const manager = getPermissionManager();
    await manager.initialize();
    manager.configure({ trackStats: true });

    await manager.check(createPermissionRequest("Read", { file_path: "/tmp/test.txt" }));
    await manager.check(createPermissionRequest("Read", { file_path: "/tmp/test2.txt" }));

    const stats = manager.getStats();
    expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
    expect(stats.allowed).toBeGreaterThanOrEqual(2);
  });

  test("should block dangerous patterns", async () => {
    const manager = getPermissionManager();
    await manager.initialize();

    const request = createPermissionRequest("Bash", { command: "rm -rf /" });
    const result = await manager.check(request);

    expect(result.decision).toBe("deny");
  });

  test("createPermissionManager creates isolated instance", async () => {
    const manager1 = createPermissionManager({ defaultDecision: "allow" });
    const manager2 = createPermissionManager({ defaultDecision: "deny" });

    expect(manager1.getConfig().defaultDecision).toBe("allow");
    expect(manager2.getConfig().defaultDecision).toBe("deny");
  });
});

describe("Risk Assessment", () => {
  test("assessRiskLevel for read-only tools", () => {
    expect(assessRiskLevel("Read")).toBe("low");
    expect(assessRiskLevel("Glob")).toBe("low");
    expect(assessRiskLevel("Grep")).toBe("low");
  });

  test("assessRiskLevel for filesystem tools", () => {
    expect(assessRiskLevel("Write", { path: "/tmp/test.txt" })).toBe("medium");
    expect(assessRiskLevel("Write", { path: "/etc/passwd" })).toBe("critical");
    expect(assessRiskLevel("Write", { path: "/home/user/.ssh/id_rsa" })).toBe("critical");
  });

  test("assessRiskLevel for execution tools", () => {
    expect(assessRiskLevel("Bash", { command: "ls" })).toBe("medium");
    expect(assessRiskLevel("Bash", { command: "rm -rf /" })).toBe("critical");
    expect(assessRiskLevel("Bash", { command: "sudo apt install" })).toBe("critical");
  });
});

describe("Dangerous Pattern Detection", () => {
  test("isDangerousPattern detects dangerous commands", () => {
    expect(isDangerousPattern("rm -rf /")).toBe(true);
    expect(isDangerousPattern("rm -rf /*")).toBe(true);
    expect(isDangerousPattern(":(){:|:&};:")).toBe(true);
    expect(isDangerousPattern("dd if=/dev/zero of=/dev/sda")).toBe(true);
  });

  test("isDangerousPattern allows safe commands", () => {
    expect(isDangerousPattern("ls -la")).toBe(false);
    expect(isDangerousPattern("cat file.txt")).toBe(false);
    expect(isDangerousPattern("npm install")).toBe(false);
  });
});

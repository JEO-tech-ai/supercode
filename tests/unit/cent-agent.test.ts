import { describe, test, expect, beforeEach } from "bun:test";
import {
  createCentAgent,
  centAgent,
  getCentWithBuiltinAgents,
  getPhaseInfo,
  getAllPhases,
  getNextPhase,
  getPreviousPhase,
  AGENT_NAME,
  AGENT_DESCRIPTION,
  CENT_PHASES,
  DEFAULT_MULTI_AGENT_CONFIG,
  CENT_TOOL_SELECTION,
} from "../../src/agents/cent";
import {
  buildCentPrompt,
  buildCoreIdentity,
  buildPhaseWorkflow,
  buildDelegationTable,
  buildToolSelectionTable,
  buildMultiAgentSection,
  buildSpecialistSection,
  buildExploreAgentSection,
  buildOracleAgentSection,
  getPhasePrompt,
  getTransitionHint,
  matchSkillPattern,
  buildSkillExecutionPrompt,
} from "../../src/agents/cent/prompt-builder";
import type { AvailableAgent, AgentPromptMetadata } from "../../src/agents/types";
import type { CentAgentOptions, MultiAgentConfig } from "../../src/agents/cent/types";

// =============================================================================
// Test Fixtures
// =============================================================================

const mockAgentMetadata: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  triggers: [
    { domain: "exploration", trigger: "Codebase exploration needed" },
  ],
  useWhen: ["Finding files or patterns"],
  avoidWhen: ["Simple questions"],
  keyTrigger: "explore",
};

const mockExploreAgent: AvailableAgent = {
  name: "explore",
  description: "Codebase exploration agent",
  metadata: mockAgentMetadata,
};

const mockOracleAgent: AvailableAgent = {
  name: "oracle",
  description: "Expert consultation agent",
  metadata: {
    category: "specialist",
    cost: "EXPENSIVE",
    triggers: [
      { domain: "architecture", trigger: "Complex decisions" },
    ],
    useWhen: ["Architecture decisions"],
    avoidWhen: ["Simple tasks"],
    keyTrigger: "consult",
  },
};

const mockAgents: AvailableAgent[] = [mockExploreAgent, mockOracleAgent];

// =============================================================================
// Cent Agent Definition Tests
// =============================================================================

describe("Cent Agent Definition", () => {
  test("should have correct name and description", () => {
    expect(AGENT_NAME).toBe("cent");
    expect(AGENT_DESCRIPTION).toContain("orchestrator");
    expect(AGENT_DESCRIPTION).toContain("6-phase");
  });

  test("centAgent should be a valid definition", () => {
    expect(centAgent.name).toBe("cent");
    expect(centAgent.description).toBe(AGENT_DESCRIPTION);
    expect(centAgent.metadata).toBeDefined();
    expect(centAgent.createConfig).toBeDefined();
  });

  test("createCentAgent should create valid agent", () => {
    const agent = createCentAgent();

    expect(agent.name).toBe("cent");
    expect(agent.metadata.category).toBe("orchestrator");
    expect(agent.metadata.cost).toBe("CHEAP");
  });

  test("createCentAgent should accept options", () => {
    const options: CentAgentOptions = {
      enableRalphLoop: true,
      debug: true,
    };

    const agent = createCentAgent(options);
    expect(agent.name).toBe("cent");
  });

  test("createConfig should return valid config", () => {
    const agent = createCentAgent();
    const config = agent.createConfig();

    expect(config.mode).toBe("primary");
    expect(config.prompt).toBeDefined();
    expect(config.prompt.length).toBeGreaterThan(100);
  });

  test("createConfig should include agents in prompt when provided", () => {
    const agent = createCentAgent({ availableAgents: mockAgents });
    const config = agent.createConfig();

    expect(config.prompt).toContain("explore");
    expect(config.prompt).toContain("oracle");
  });
});

// =============================================================================
// Phase Workflow Tests
// =============================================================================

describe("Cent Phase Workflow", () => {
  test("should have 6 phases", () => {
    expect(CENT_PHASES.length).toBe(6);
  });

  test("phases should be in correct order", () => {
    const phaseIds = CENT_PHASES.map((p) => p.id);
    expect(phaseIds).toEqual([
      "intent",
      "context",
      "decomposition",
      "delegation",
      "execution",
      "verification",
    ]);
  });

  test("each phase should have required properties", () => {
    for (const phase of CENT_PHASES) {
      expect(phase.id).toBeDefined();
      expect(phase.number).toBeGreaterThanOrEqual(0);
      expect(phase.name).toBeDefined();
      expect(phase.description).toBeDefined();
      expect(phase.actions.length).toBeGreaterThan(0);
    }
  });

  test("phases should have transitions", () => {
    for (const phase of CENT_PHASES) {
      expect(phase.transitions).toBeDefined();
      expect(phase.transitions!.length).toBeGreaterThan(0);
    }
  });

  test("getPhaseInfo should return correct phase", () => {
    const intent = getPhaseInfo("intent");
    expect(intent).toBeDefined();
    expect(intent?.name).toBe("Intent Classification");
    expect(intent?.number).toBe(0);

    const verification = getPhaseInfo("verification");
    expect(verification?.number).toBe(5);
  });

  test("getPhaseInfo should return undefined for invalid phase", () => {
    const result = getPhaseInfo("invalid");
    expect(result).toBeUndefined();
  });

  test("getAllPhases should return all phases", () => {
    const phases = getAllPhases();
    expect(phases.length).toBe(6);
    expect(phases).toBe(CENT_PHASES);
  });

  test("getNextPhase should return correct next phase", () => {
    expect(getNextPhase("intent")).toBe("context");
    expect(getNextPhase("context")).toBe("decomposition");
    expect(getNextPhase("decomposition")).toBe("delegation");
    expect(getNextPhase("delegation")).toBe("execution");
    expect(getNextPhase("execution")).toBe("verification");
  });

  test("getNextPhase should return null for last phase", () => {
    expect(getNextPhase("verification")).toBeNull();
  });

  test("getNextPhase should return null for invalid phase", () => {
    expect(getNextPhase("invalid")).toBeNull();
  });

  test("getPreviousPhase should return correct previous phase", () => {
    expect(getPreviousPhase("verification")).toBe("execution");
    expect(getPreviousPhase("execution")).toBe("delegation");
    expect(getPreviousPhase("context")).toBe("intent");
  });

  test("getPreviousPhase should return null for first phase", () => {
    expect(getPreviousPhase("intent")).toBeNull();
  });
});

// =============================================================================
// Prompt Builder Tests
// =============================================================================

describe("Cent Prompt Builder", () => {
  describe("buildCoreIdentity", () => {
    test("should include agent name", () => {
      const identity = buildCoreIdentity();
      expect(identity).toContain("Cent");
      expect(identity).toContain("센트");
    });

    test("should include core responsibilities", () => {
      const identity = buildCoreIdentity();
      expect(identity).toContain("Intent Classification");
      expect(identity).toContain("Context Gathering");
      expect(identity).toContain("Task Decomposition");
    });

    test("should include key principles", () => {
      const identity = buildCoreIdentity();
      expect(identity).toContain("Efficiency First");
      expect(identity).toContain("Quality Over Speed");
      expect(identity).toContain("Cost Awareness");
    });
  });

  describe("buildPhaseWorkflow", () => {
    test("should include all phases", () => {
      const workflow = buildPhaseWorkflow();
      expect(workflow).toContain("Phase 0: Intent Classification");
      expect(workflow).toContain("Phase 1: Context Gathering");
      expect(workflow).toContain("Phase 5: Verification");
    });

    test("should include phase actions", () => {
      const workflow = buildPhaseWorkflow();
      expect(workflow).toContain("Parse user request");
      expect(workflow).toContain("Identify task type");
    });

    test("should include transitions", () => {
      const workflow = buildPhaseWorkflow();
      expect(workflow).toContain("→ context");
      expect(workflow).toContain("→ complete");
    });
  });

  describe("buildDelegationTable", () => {
    test("should return empty string for empty agents", () => {
      const table = buildDelegationTable([]);
      expect(table).toBe("");
    });

    test("should include agent triggers", () => {
      const table = buildDelegationTable(mockAgents);
      expect(table).toContain("explore");
      expect(table).toContain("oracle");
      expect(table).toContain("exploration");
      expect(table).toContain("architecture");
    });

    test("should include cost information", () => {
      const table = buildDelegationTable(mockAgents);
      expect(table).toContain("CHEAP");
      expect(table).toContain("EXPENSIVE");
    });
  });

  describe("buildToolSelectionTable", () => {
    test("should include default tools", () => {
      const table = buildToolSelectionTable();
      expect(table).toContain("Read");
      expect(table).toContain("Glob");
      expect(table).toContain("Grep");
      expect(table).toContain("Edit");
      expect(table).toContain("Bash");
    });

    test("should include MCP tools", () => {
      const table = buildToolSelectionTable();
      expect(table).toContain("ask-gemini");
      expect(table).toContain("Codex");
    });
  });

  describe("buildMultiAgentSection", () => {
    test("should return guidelines without config", () => {
      const section = buildMultiAgentSection();
      expect(section).toContain("Multi-Agent Workflow");
      expect(section).toContain("Claude Code");
      expect(section).toContain("Gemini-CLI");
    });

    test("should include config status", () => {
      const config: MultiAgentConfig = {
        claude: { enabled: true, role: "orchestrator" },
        gemini: { enabled: false, role: "analyst" },
        codex: { enabled: true, role: "executor" },
      };

      const section = buildMultiAgentSection(config);
      expect(section).toContain("Enabled");
      expect(section).toContain("Disabled");
    });
  });

  describe("buildSpecialistSection", () => {
    test("should return empty for non-specialist agents", () => {
      const orchestrator: AvailableAgent = {
        name: "orch",
        description: "Main orchestrator",
        metadata: {
          category: "orchestrator",
          cost: "CHEAP",
          triggers: [],
          useWhen: [],
          avoidWhen: [],
          keyTrigger: "",
        },
      };

      const section = buildSpecialistSection([orchestrator]);
      expect(section).toBe("");
    });

    test("should include specialist agents", () => {
      const section = buildSpecialistSection(mockAgents);
      expect(section).toContain("explore");
      expect(section).toContain("oracle");
    });
  });

  describe("buildExploreAgentSection", () => {
    test("should return empty if no explore agent", () => {
      const section = buildExploreAgentSection([mockOracleAgent]);
      expect(section).toBe("");
    });

    test("should include explore details", () => {
      const section = buildExploreAgentSection([mockExploreAgent]);
      expect(section).toContain("Explore Agent");
      expect(section).toContain("exploration");
    });
  });

  describe("buildOracleAgentSection", () => {
    test("should return empty if no oracle agent", () => {
      const section = buildOracleAgentSection([mockExploreAgent]);
      expect(section).toBe("");
    });

    test("should include oracle details", () => {
      const section = buildOracleAgentSection([mockOracleAgent]);
      expect(section).toContain("Oracle Agent");
      expect(section).toContain("architecture");
    });
  });

  describe("buildCentPrompt", () => {
    test("should include all required sections", () => {
      const prompt = buildCentPrompt({
        availableAgents: mockAgents,
        includePhases: true,
        includeToolSelection: true,
        includeMultiAgent: true,
        includeRalphLoop: true,
        includeSkills: true,
      });

      expect(prompt).toContain("Cent");
      expect(prompt).toContain("6-Phase Workflow");
      expect(prompt).toContain("Delegation Table");
      expect(prompt).toContain("Tool Selection Guide");
      expect(prompt).toContain("Multi-Agent Workflow");
      expect(prompt).toContain("Ralph Loop");
      expect(prompt).toContain("Skill System");
    });

    test("should exclude sections when disabled", () => {
      const prompt = buildCentPrompt({
        availableAgents: [],
        includePhases: false,
        includeToolSelection: false,
        includeMultiAgent: false,
        includeRalphLoop: false,
        includeSkills: false,
      });

      expect(prompt).not.toContain("6-Phase Workflow");
      expect(prompt).not.toContain("Ralph Loop Integration");
      expect(prompt).not.toContain("Skill System Integration");
    });
  });
});

// =============================================================================
// Phase Prompt and Transition Tests
// =============================================================================

describe("Phase Prompts", () => {
  test("getPhasePrompt should return formatted prompt", () => {
    const prompt = getPhasePrompt("intent");

    expect(prompt).toContain("[Current Phase: 0 - Intent Classification]");
    expect(prompt).toContain("Parse, validate");  // Matches actual phase description
    expect(prompt).toContain("Parse user request");
  });

  test("getPhasePrompt should return null for invalid phase", () => {
    const prompt = getPhasePrompt("invalid");
    expect(prompt).toBeNull();
  });

  test("getTransitionHint should return transitions", () => {
    const hint = getTransitionHint("intent");

    expect(hint).toContain("Possible transitions");
    expect(hint).toContain("context");
    expect(hint).toContain("ask_user");
  });

  test("getTransitionHint should return null for invalid phase", () => {
    const hint = getTransitionHint("invalid");
    expect(hint).toBeNull();
  });
});

// =============================================================================
// Skill Pattern Matching Tests
// =============================================================================

describe("Skill Pattern Matching", () => {
  test("should match API design patterns", () => {
    const result = matchSkillPattern("api design for user service");
    expect(result).toBeDefined();
    expect(result?.skillId).toBe("api-design");
    expect(result?.confidence).toBeGreaterThan(0);
  });

  test("should match code review patterns", () => {
    const result = matchSkillPattern("please review this code");
    expect(result?.skillId).toBe("code-review");
  });

  test("should match debug patterns", () => {
    const result1 = matchSkillPattern("help me debug this function");
    expect(result1?.skillId).toBe("debug");

    const result2 = matchSkillPattern("fix bug in authentication");
    expect(result2?.skillId).toBe("debug");
  });

  test("should match documentation patterns", () => {
    const result = matchSkillPattern("write documentation for the API");
    expect(result?.skillId).toBe("documentation");
  });

  test("should match refactor patterns", () => {
    const result = matchSkillPattern("refactor this component");
    expect(result?.skillId).toBe("refactor");
  });

  test("should match test generation patterns", () => {
    const result = matchSkillPattern("generate tests for utils");
    expect(result?.skillId).toBe("test-generation");
  });

  test("should match git workflow patterns", () => {
    const result = matchSkillPattern("git commit with message");
    expect(result?.skillId).toBe("git-workflow");
  });

  test("should return null for unmatched patterns", () => {
    const result = matchSkillPattern("hello world");
    expect(result).toBeNull();
  });
});

// =============================================================================
// Skill Execution Prompt Tests
// =============================================================================

describe("Skill Execution Prompt", () => {
  test("should build skill execution prompt", () => {
    const prompt = buildSkillExecutionPrompt(
      "api-design",
      "Design RESTful API for user service"
    );

    expect(prompt).toContain("<skill-execution>");
    expect(prompt).toContain("<skill-id>api-design</skill-id>");
    expect(prompt).toContain("Design RESTful API");
    expect(prompt).toContain("6-phase workflow");
  });

  test("should include arguments when provided", () => {
    const prompt = buildSkillExecutionPrompt(
      "code-review",
      "Review the code",
      "--verbose --strict"
    );

    expect(prompt).toContain("<arguments>--verbose --strict</arguments>");
  });

  test("should not include arguments when not provided", () => {
    const prompt = buildSkillExecutionPrompt("debug", "Debug the issue");

    expect(prompt).not.toContain("<arguments>");
  });
});

// =============================================================================
// Multi-Agent Config Tests
// =============================================================================

describe("Multi-Agent Configuration", () => {
  test("DEFAULT_MULTI_AGENT_CONFIG should be valid", () => {
    expect(DEFAULT_MULTI_AGENT_CONFIG.claude).toBeDefined();
    expect(DEFAULT_MULTI_AGENT_CONFIG.claude?.enabled).toBe(true);
    expect(DEFAULT_MULTI_AGENT_CONFIG.claude?.role).toBe("orchestrator");

    expect(DEFAULT_MULTI_AGENT_CONFIG.gemini).toBeDefined();
    expect(DEFAULT_MULTI_AGENT_CONFIG.gemini?.role).toBe("analyst");
    expect(DEFAULT_MULTI_AGENT_CONFIG.gemini?.mcpTool).toBe("ask-gemini");

    expect(DEFAULT_MULTI_AGENT_CONFIG.codex).toBeDefined();
    expect(DEFAULT_MULTI_AGENT_CONFIG.codex?.role).toBe("executor");
    expect(DEFAULT_MULTI_AGENT_CONFIG.codex?.mcpTool).toBe("shell");
  });

  test("CENT_TOOL_SELECTION should include MCP tools", () => {
    const toolNames = CENT_TOOL_SELECTION.map((t) => t.tool);

    expect(toolNames).toContain("ask-gemini");
    expect(toolNames).toContain("shell (Codex)");
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Cent Agent Integration", () => {
  test("getCentWithBuiltinAgents should include all specialist agents", () => {
    // This test just ensures the function runs without error
    // In a real scenario, it would require the full agent system
    const agent = getCentWithBuiltinAgents();

    expect(agent.name).toBe("cent");
    expect(agent.createConfig).toBeDefined();
  });

  test("complete prompt generation workflow", () => {
    // Create agent with all options
    const agent = createCentAgent({
      availableAgents: mockAgents,
      multiAgentConfig: DEFAULT_MULTI_AGENT_CONFIG,
      enableRalphLoop: true,
      debug: true,
    });

    const config = agent.createConfig();

    // Verify prompt includes all key sections
    expect(config.prompt).toContain("Cent");
    expect(config.prompt).toContain("6-Phase");
    expect(config.prompt).toContain("explore");
    expect(config.prompt).toContain("oracle");
    expect(config.prompt).toContain("Multi-Agent");
    expect(config.prompt).toContain("Ralph Loop");
    expect(config.prompt).toContain("Skill System");
    expect(config.prompt).toContain("<promise>DONE</promise>");
  });
});

import { expect, test, describe } from "bun:test";
import { getAgentRegistry, initializeAgents, RequestType } from "../../src/services/agents";
import { classifyRequest } from "../../src/services/agents/coin";

describe("Agent Registry", () => {
  test("should register all agents", () => {
    initializeAgents();
    const registry = getAgentRegistry();

    expect(registry.has("coin")).toBe(true);
    expect(registry.has("explorer")).toBe(true);
    expect(registry.has("analyst")).toBe(true);
    expect(registry.has("executor")).toBe(true);
    expect(registry.has("code_reviewer")).toBe(true);
    expect(registry.has("doc_writer")).toBe(true);
  });

  test("should list all agents", () => {
    initializeAgents();
    const registry = getAgentRegistry();
    const agents = registry.list();

    expect(agents.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Request Classification", () => {
  test("should classify trivial requests", () => {
    expect(classifyRequest("What is this?")).toBe(RequestType.TRIVIAL);
    expect(classifyRequest("Explain how this works")).toBe(RequestType.TRIVIAL);
    expect(classifyRequest("Fix this typo")).toBe(RequestType.TRIVIAL);
  });

  test("should classify explicit requests", () => {
    expect(classifyRequest("run npm test")).toBe(RequestType.EXPLICIT);
    expect(classifyRequest("Create a new file")).toBe(RequestType.EXPLICIT);
    expect(classifyRequest("Install lodash")).toBe(RequestType.EXPLICIT);
  });

  test("should classify exploratory requests", () => {
    expect(classifyRequest("How does the router work?")).toBe(RequestType.EXPLORATORY);
    expect(classifyRequest("Where is the config defined?")).toBe(RequestType.EXPLORATORY);
    expect(classifyRequest("Find all usages of this function")).toBe(RequestType.EXPLORATORY);
  });

  test("should classify open-ended requests", () => {
    expect(classifyRequest("Improve this code")).toBe(RequestType.OPEN_ENDED);
    expect(classifyRequest("Refactor the auth module")).toBe(RequestType.OPEN_ENDED);
    expect(classifyRequest("Analyze the codebase")).toBe(RequestType.OPEN_ENDED);
  });

  test("should classify complex requests", () => {
    expect(classifyRequest("Add a feature and then test it")).toBe(RequestType.COMPLEX);
    expect(classifyRequest("Create the API and deploy it")).toBe(RequestType.COMPLEX);
  });
});

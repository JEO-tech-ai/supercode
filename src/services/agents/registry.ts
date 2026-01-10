import type { Agent, AgentName } from "./types";

export interface IAgentRegistry {
  register(agent: Agent): void;
  get(name: AgentName): Agent | undefined;
  has(name: AgentName): boolean;
  list(): Agent[];
  listNames(): AgentName[];
}

class AgentRegistry implements IAgentRegistry {
  private agents: Map<AgentName, Agent> = new Map();

  register(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  get(name: AgentName): Agent | undefined {
    return this.agents.get(name);
  }

  has(name: AgentName): boolean {
    return this.agents.has(name);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  listNames(): AgentName[] {
    return Array.from(this.agents.keys());
  }
}

let registryInstance: AgentRegistry | null = null;

export function getAgentRegistry(): IAgentRegistry {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
  }
  return registryInstance;
}

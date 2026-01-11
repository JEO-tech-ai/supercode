import { Component, For, createSignal } from "solid-js";
import { Card, Button } from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";

const agents = [
  {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Helps with coding tasks, debugging, and code review",
    status: "active",
  },
  {
    id: "doc-writer",
    name: "Documentation Writer",
    description: "Generates and updates documentation",
    status: "active",
  },
  {
    id: "test-generator",
    name: "Test Generator",
    description: "Creates unit and integration tests",
    status: "inactive",
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description: "Reviews code for best practices and issues",
    status: "active",
  },
];

export default function AgentsPage() {
  const [filter, setFilter] = createSignal<"all" | "active" | "inactive">(
    "all"
  );

  const filteredAgents = () => {
    if (filter() === "all") return agents;
    return agents.filter((a) => a.status === filter());
  };

  return (
    <div class="flex min-h-screen flex-col">
      <Navbar />
      <div class="flex flex-1">
        <Sidebar />
        <main class="flex-1 p-6">
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-3xl font-bold">Agents</h1>
            <Button>Create Agent</Button>
          </div>

          <div class="mb-4 flex gap-2">
            <Button
              variant={filter() === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter() === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={filter() === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("inactive")}
            >
              Inactive
            </Button>
          </div>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <For each={filteredAgents()}>
              {(agent) => (
                <Card class="p-6">
                  <div class="mb-2 flex items-start justify-between">
                    <h3 class="font-semibold">{agent.name}</h3>
                    <span
                      class={`rounded-full px-2 py-1 text-xs ${
                        agent.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <p class="mb-4 text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                  <div class="flex gap-2">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                    >
                      {agent.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </Card>
              )}
            </For>
          </div>
        </main>
      </div>
    </div>
  );
}

import { Component, For, createResource } from "solid-js";
import { Card } from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";
import { ProtectedRoute } from "~/components/auth/protected-route";

interface Stats {
  totalChats: number;
  activeModels: number;
  activeAgents: number;
  tokensUsed: number;
}

async function fetchStats(): Promise<Stats> {
  // TODO: Connect to API
  return {
    totalChats: 1234,
    activeModels: 5,
    activeAgents: 6,
    tokensUsed: 50000,
  };
}

export default function Dashboard() {
  const [stats] = createResource(fetchStats);

  const statCards = () => [
    { label: "Total Chats", value: stats()?.totalChats ?? 0, icon: "Chat" },
    { label: "Active Models", value: stats()?.activeModels ?? 0, icon: "Cpu" },
    { label: "Active Agents", value: stats()?.activeAgents ?? 0, icon: "Bot" },
    { label: "Tokens Used", value: stats()?.tokensUsed ?? 0, icon: "Hash" },
  ];

  return (
    <ProtectedRoute>
      <div class="flex min-h-screen flex-col">
        <Navbar />
        <div class="flex flex-1">
          <Sidebar />
          <main class="flex-1 p-6">
            <h1 class="mb-6 text-3xl font-bold">Dashboard</h1>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <For each={statCards()}>
                {(stat) => (
                  <Card class="p-6">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">
                        {stat.icon}
                      </span>
                      <span class="text-2xl font-bold">
                        {stat.value.toLocaleString()}
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                  </Card>
                )}
              </For>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

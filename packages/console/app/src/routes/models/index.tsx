import { Component, For, createSignal } from "solid-js";
import { Card, Button } from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";

const providers = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-sonnet-4", "claude-3.5-sonnet", "claude-3.5-haiku"],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"],
  },
  {
    id: "google",
    name: "Google",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    id: "ollama",
    name: "Ollama",
    models: ["llama3", "gemma2", "qwen", "phi"],
  },
];

export default function ModelsPage() {
  const [selectedProvider, setSelectedProvider] = createSignal("anthropic");
  const [selectedModel, setSelectedModel] = createSignal("claude-sonnet-4");

  const currentProvider = () =>
    providers.find((p) => p.id === selectedProvider());

  return (
    <div class="flex min-h-screen flex-col">
      <Navbar />
      <div class="flex flex-1">
        <Sidebar />
        <main class="flex-1 p-6">
          <h1 class="mb-6 text-3xl font-bold">Models</h1>

          <div class="grid gap-6 md:grid-cols-2">
            <Card class="p-6">
              <h2 class="mb-4 text-xl font-semibold">Model Selection</h2>

              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">Provider</label>
                  <select
                    class="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={selectedProvider()}
                    onChange={(e) => setSelectedProvider(e.currentTarget.value)}
                  >
                    <For each={providers}>
                      {(provider) => (
                        <option value={provider.id}>{provider.name}</option>
                      )}
                    </For>
                  </select>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">Model</label>
                  <select
                    class="w-full rounded-md border border-border bg-background px-3 py-2"
                    value={selectedModel()}
                    onChange={(e) => setSelectedModel(e.currentTarget.value)}
                  >
                    <For each={currentProvider()?.models ?? []}>
                      {(model) => <option value={model}>{model}</option>}
                    </For>
                  </select>
                </div>

                <Button class="w-full">Save as Default</Button>
              </div>
            </Card>

            <Card class="p-6">
              <h2 class="mb-4 text-xl font-semibold">Available Providers</h2>
              <div class="space-y-3">
                <For each={providers}>
                  {(provider) => (
                    <div class="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p class="font-medium">{provider.name}</p>
                        <p class="text-sm text-muted-foreground">
                          {provider.models.length} models
                        </p>
                      </div>
                      <span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                        Active
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

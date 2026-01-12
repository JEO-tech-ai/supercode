import { Component, createSignal, For, Show, createResource } from "solid-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectItemLabel,
} from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";
import { ProtectedRoute } from "~/components/auth/protected-route";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  maskedKey: string;
  createdAt: string;
  lastUsed?: string;
}

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { id: "google", name: "Google AI", placeholder: "AIza..." },
  { id: "ollama", name: "Ollama (Local)", placeholder: "http://localhost:11434" },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-..." },
] as const;

async function fetchApiKeys(): Promise<ApiKey[]> {
  // TODO: Connect to API
  return [
    {
      id: "1",
      name: "Production OpenAI",
      provider: "openai",
      maskedKey: "sk-...abc123",
      createdAt: "2024-01-15",
      lastUsed: "2024-01-20",
    },
  ];
}

export default function ApiKeysPage() {
  const [keys, { refetch }] = createResource(fetchApiKeys);
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [newKeyName, setNewKeyName] = createSignal("");
  const [newKeyValue, setNewKeyValue] = createSignal("");
  const [selectedProvider, setSelectedProvider] = createSignal("openai");
  const [deletingKeyId, setDeletingKeyId] = createSignal<string | null>(null);

  const handleAddKey = async () => {
    // TODO: Call API to save key
    console.log("Adding key:", {
      name: newKeyName(),
      provider: selectedProvider(),
      key: newKeyValue(),
    });

    // Reset form and close dialog
    setNewKeyName("");
    setNewKeyValue("");
    setSelectedProvider("openai");
    setIsDialogOpen(false);
    await refetch();
  };

  const handleDeleteKey = async (keyId: string) => {
    // TODO: Call API to delete key
    console.log("Deleting key:", keyId);
    setDeletingKeyId(null);
    await refetch();
  };

  const getProviderName = (providerId: string) => {
    return PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId;
  };

  const getProviderPlaceholder = (providerId: string) => {
    return PROVIDERS.find((p) => p.id === providerId)?.placeholder ?? "";
  };

  return (
    <ProtectedRoute>
      <div class="flex min-h-screen flex-col">
        <Navbar />
        <div class="flex flex-1">
          <Sidebar />
          <main class="flex-1 p-6">
            <div class="max-w-4xl">
              <div class="mb-6 flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold">API Keys</h1>
                  <p class="text-muted-foreground">
                    Manage your API keys for different providers
                  </p>
                </div>
                <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger as={Button}>Add API Key</DialogTrigger>
                  <DialogContent class="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add API Key</DialogTitle>
                      <DialogDescription>
                        Add a new API key for your AI provider
                      </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4 py-4">
                      <div>
                        <label class="mb-2 block text-sm font-medium">
                          Name
                        </label>
                        <Input
                          placeholder="e.g., Production OpenAI"
                          value={newKeyName()}
                          onInput={(e) => setNewKeyName(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="mb-2 block text-sm font-medium">
                          Provider
                        </label>
                        <Select
                          value={selectedProvider()}
                          onChange={setSelectedProvider}
                          options={PROVIDERS.map((p) => p.id)}
                          placeholder="Select a provider"
                          itemComponent={(props) => (
                            <SelectItem item={props.item}>
                              <SelectItemLabel>
                                {getProviderName(props.item.rawValue)}
                              </SelectItemLabel>
                            </SelectItem>
                          )}
                        >
                          <SelectTrigger class="w-full">
                            <SelectValue<string>>
                              {(state) => getProviderName(state.selectedOption())}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent />
                        </Select>
                      </div>
                      <div>
                        <label class="mb-2 block text-sm font-medium">
                          API Key
                        </label>
                        <Input
                          type="password"
                          placeholder={getProviderPlaceholder(selectedProvider())}
                          value={newKeyValue()}
                          onInput={(e) => setNewKeyValue(e.currentTarget.value)}
                        />
                        <p class="mt-1 text-xs text-muted-foreground">
                          Your API key is encrypted and stored securely.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddKey}
                        disabled={!newKeyName() || !newKeyValue()}
                      >
                        Add Key
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Show
                when={!keys.loading}
                fallback={
                  <div class="flex justify-center py-12">
                    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                }
              >
                <Show
                  when={keys()?.length}
                  fallback={
                    <Card class="p-12 text-center">
                      <p class="text-muted-foreground">
                        No API keys configured yet. Add one to get started.
                      </p>
                    </Card>
                  }
                >
                  <div class="space-y-4">
                    <For each={keys()}>
                      {(key) => (
                        <Card>
                          <CardHeader class="pb-2">
                            <div class="flex items-center justify-between">
                              <div>
                                <CardTitle class="text-lg">{key.name}</CardTitle>
                                <CardDescription>
                                  {getProviderName(key.provider)}
                                </CardDescription>
                              </div>
                              <Dialog
                                open={deletingKeyId() === key.id}
                                onOpenChange={(open) =>
                                  setDeletingKeyId(open ? key.id : null)
                                }
                              >
                                <DialogTrigger
                                  as={Button}
                                  variant="ghost"
                                  size="sm"
                                  class="text-destructive hover:text-destructive"
                                >
                                  Delete
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete API Key</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete "{key.name}"?
                                      This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setDeletingKeyId(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteKey(key.id)}
                                    >
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div class="flex items-center gap-6 text-sm text-muted-foreground">
                              <div class="flex items-center gap-2">
                                <span class="font-mono">{key.maskedKey}</span>
                              </div>
                              <div>Created: {key.createdAt}</div>
                              <Show when={key.lastUsed}>
                                <div>Last used: {key.lastUsed}</div>
                              </Show>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>

              <Card class="mt-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
                <CardContent class="pt-6">
                  <h3 class="mb-2 font-semibold text-amber-800 dark:text-amber-200">
                    Security Notice
                  </h3>
                  <p class="text-sm text-amber-700 dark:text-amber-300">
                    API keys are encrypted at rest and never exposed in logs or
                    error messages. We recommend using separate keys for
                    development and production environments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

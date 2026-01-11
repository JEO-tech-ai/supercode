import { Component, createSignal } from "solid-js";
import { Card, Button, Input } from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";

export default function SettingsPage() {
  const [apiKey, setApiKey] = createSignal("");
  const [saved, setSaved] = createSignal(false);

  const handleSave = () => {
    // TODO: Save settings via API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div class="flex min-h-screen flex-col">
      <Navbar />
      <div class="flex flex-1">
        <Sidebar />
        <main class="flex-1 p-6">
          <h1 class="mb-6 text-3xl font-bold">Settings</h1>

          <div class="max-w-2xl space-y-6">
            <Card class="p-6">
              <h2 class="mb-4 text-xl font-semibold">API Configuration</h2>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    OpenAI API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey()}
                    onInput={(e) => setApiKey(e.currentTarget.value)}
                  />
                  <p class="mt-1 text-xs text-muted-foreground">
                    Your API key is stored securely and never shared.
                  </p>
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <h2 class="mb-4 text-xl font-semibold">Preferences</h2>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Auto-save conversations</p>
                    <p class="text-sm text-muted-foreground">
                      Automatically save chat history
                    </p>
                  </div>
                  <input type="checkbox" checked class="h-4 w-4" />
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Show token usage</p>
                    <p class="text-sm text-muted-foreground">
                      Display token count in chat
                    </p>
                  </div>
                  <input type="checkbox" checked class="h-4 w-4" />
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <h2 class="mb-4 text-xl font-semibold">Danger Zone</h2>
              <div class="space-y-4">
                <div class="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                  <div>
                    <p class="font-medium text-destructive">Delete all data</p>
                    <p class="text-sm text-muted-foreground">
                      Permanently delete all your conversations and settings
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            </Card>

            <div class="flex justify-end gap-2">
              {saved() && (
                <span class="self-center text-sm text-green-600">Saved!</span>
              )}
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

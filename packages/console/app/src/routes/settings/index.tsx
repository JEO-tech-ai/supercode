import { Component, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input } from "@supercoin/ui";
import { Navbar } from "~/components/layout/navbar";
import { Sidebar } from "~/components/layout/sidebar";
import { ProtectedRoute } from "~/components/auth/protected-route";

export default function SettingsPage() {
  const [saved, setSaved] = createSignal(false);

  const handleSave = () => {
    // TODO: Save settings via API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ProtectedRoute>
      <div class="flex min-h-screen flex-col">
        <Navbar />
        <div class="flex flex-1">
          <Sidebar />
          <main class="flex-1 p-6">
            <h1 class="mb-6 text-3xl font-bold">Settings</h1>

            <div class="max-w-2xl space-y-6">
              <A href="/settings/api-keys">
                <Card class="cursor-pointer transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                      Manage your API keys for OpenAI, Anthropic, and other providers
                    </CardDescription>
                  </CardHeader>
                </Card>
              </A>

              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
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
                </CardContent>
              </Card>

              <Card class="border-destructive/50">
                <CardHeader>
                  <CardTitle class="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
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
    </ProtectedRoute>
  );
}

import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute } from 'solid-js/web';
import { createSignal, For } from 'solid-js';
import { A } from './button-BUb5ee2-.mjs';
import { u } from './card-xYJnUqvS.mjs';
import { q, E } from './sidebar-lSzgpHq7.mjs';
import './auth-BSPamyz9.mjs';

var g = ["<h2", ' class="mb-4 text-xl font-semibold">Model Selection</h2>'], h = ["<div", ' class="space-y-4"><div><label class="mb-2 block text-sm font-medium">Provider</label><select class="w-full rounded-md border border-border bg-background px-3 py-2"', ">", '</select></div><div><label class="mb-2 block text-sm font-medium">Model</label><select class="w-full rounded-md border border-border bg-background px-3 py-2"', ">", "</select></div><!--$-->", "<!--/--></div>"], x = ["<h2", ' class="mb-4 text-xl font-semibold">Available Providers</h2>'], $ = ["<div", ' class="space-y-3">', "</div>"], y = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Models</h1><div class="grid gap-6 md:grid-cols-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div></main></div></div>"], m = ["<option", ">", "</option>"], k = ["<div", ' class="flex items-center justify-between rounded-lg border border-border p-3"><div><p class="font-medium">', '</p><p class="text-sm text-muted-foreground"><!--$-->', '<!--/--> models</p></div><span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">Active</span></div>'];
const o = [{ id: "anthropic", name: "Anthropic", models: ["claude-sonnet-4", "claude-3.5-sonnet", "claude-3.5-haiku"] }, { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"] }, { id: "google", name: "Google", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] }, { id: "ollama", name: "Ollama", models: ["llama3", "gemma2", "qwen", "phi"] }];
function N() {
  const [i, S] = createSignal("anthropic"), [p, _] = createSignal("claude-sonnet-4"), u$1 = () => o.find((l) => l.id === i());
  return ssr(y, ssrHydrationKey(), escape(createComponent(q, {})), escape(createComponent(E, {})), escape(createComponent(u, { class: "p-6", get children() {
    return [ssr(g, ssrHydrationKey()), ssr(h, ssrHydrationKey(), ssrAttribute("value", escape(i(), true), false), escape(createComponent(For, { each: o, children: (l) => ssr(m, ssrHydrationKey() + ssrAttribute("value", escape(l.id, true), false), escape(l.name)) })), ssrAttribute("value", escape(p(), true), false), escape(createComponent(For, { get each() {
      var _a, _b;
      return (_b = (_a = u$1()) == null ? void 0 : _a.models) != null ? _b : [];
    }, children: (l) => ssr(m, ssrHydrationKey() + ssrAttribute("value", escape(l, true), false), escape(l)) })), escape(createComponent(A, { class: "w-full", children: "Save as Default" })))];
  } })), escape(createComponent(u, { class: "p-6", get children() {
    return [ssr(x, ssrHydrationKey()), ssr($, ssrHydrationKey(), escape(createComponent(For, { each: o, children: (l) => ssr(k, ssrHydrationKey(), escape(l.name), escape(l.models.length)) })))];
  } })));
}

export { N as default };
//# sourceMappingURL=index3.mjs.map

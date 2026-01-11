import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute } from 'solid-js/web';
import { createSignal, For } from 'solid-js';
import { f as fr, m as mr, g as gr, s as sr } from './sidebar-CESMpzIE.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:async_hooks';
import 'vinxi/lib/invariant';
import 'vinxi/lib/path';
import 'node:url';
import 'solid-js/web/storage';

var g = ["<h2", ' class="mb-4 text-xl font-semibold">Model Selection</h2>'], h = ["<div", ' class="space-y-4"><div><label class="mb-2 block text-sm font-medium">Provider</label><select class="w-full rounded-md border border-border bg-background px-3 py-2"', ">", '</select></div><div><label class="mb-2 block text-sm font-medium">Model</label><select class="w-full rounded-md border border-border bg-background px-3 py-2"', ">", "</select></div><!--$-->", "<!--/--></div>"], x = ["<h2", ' class="mb-4 text-xl font-semibold">Available Providers</h2>'], $ = ["<div", ' class="space-y-3">', "</div>"], y = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Models</h1><div class="grid gap-6 md:grid-cols-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div></main></div></div>"], m = ["<option", ">", "</option>"], k = ["<div", ' class="flex items-center justify-between rounded-lg border border-border p-3"><div><p class="font-medium">', '</p><p class="text-sm text-muted-foreground"><!--$-->', '<!--/--> models</p></div><span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">Active</span></div>'];
const o = [{ id: "anthropic", name: "Anthropic", models: ["claude-sonnet-4", "claude-3.5-sonnet", "claude-3.5-haiku"] }, { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"] }, { id: "google", name: "Google", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] }, { id: "ollama", name: "Ollama", models: ["llama3", "gemma2", "qwen", "phi"] }];
function C() {
  const [i, S] = createSignal("anthropic"), [p, _] = createSignal("claude-sonnet-4"), u = () => o.find((l) => l.id === i());
  return ssr(y, ssrHydrationKey(), escape(createComponent(fr, {})), escape(createComponent(mr, {})), escape(createComponent(gr, { class: "p-6", get children() {
    return [ssr(g, ssrHydrationKey()), ssr(h, ssrHydrationKey(), ssrAttribute("value", escape(i(), true), false), escape(createComponent(For, { each: o, children: (l) => ssr(m, ssrHydrationKey() + ssrAttribute("value", escape(l.id, true), false), escape(l.name)) })), ssrAttribute("value", escape(p(), true), false), escape(createComponent(For, { get each() {
      var _a, _b;
      return (_b = (_a = u()) == null ? void 0 : _a.models) != null ? _b : [];
    }, children: (l) => ssr(m, ssrHydrationKey() + ssrAttribute("value", escape(l, true), false), escape(l)) })), escape(createComponent(sr, { class: "w-full", children: "Save as Default" })))];
  } })), escape(createComponent(gr, { class: "p-6", get children() {
    return [ssr(x, ssrHydrationKey()), ssr($, ssrHydrationKey(), escape(createComponent(For, { each: o, children: (l) => ssr(k, ssrHydrationKey(), escape(l.name), escape(l.models.length)) })))];
  } })));
}

export { C as default };
//# sourceMappingURL=index32.mjs.map

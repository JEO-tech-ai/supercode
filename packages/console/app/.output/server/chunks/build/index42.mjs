import { createComponent, ssr, ssrHydrationKey, escape } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { A } from './button-BLdmMly2.mjs';
import { u as u$1, h, g, p, m } from './card-DLX-hcJH.mjs';
import { O, R, i } from './sidebar-BRvunEeq.mjs';
import { f } from './protected-route-XSdRWtP8.mjs';
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

var y = ["<div", ' class="flex items-center justify-between"><div><p class="font-medium">Auto-save conversations</p><p class="text-sm text-muted-foreground">Automatically save chat history</p></div><input type="checkbox" checked class="h-4 w-4"></div>'], b = ["<div", ' class="flex items-center justify-between"><div><p class="font-medium">Show token usage</p><p class="text-sm text-muted-foreground">Display token count in chat</p></div><input type="checkbox" checked class="h-4 w-4"></div>'], $ = ["<div", ' class="flex items-center justify-between rounded-lg border border-destructive/50 p-4"><div><p class="font-medium text-destructive">Delete all data</p><p class="text-sm text-muted-foreground">Permanently delete all your conversations and settings</p></div><!--$-->', "<!--/--></div>"], C = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Settings</h1><div class="max-w-2xl space-y-6"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--><div class="flex justify-end gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div></div></main></div></div>"], u = ["<span", ' class="self-center text-sm text-green-600">Saved!</span>'];
function j() {
  const [p$1, d] = createSignal(false), m$1 = () => {
    d(true), setTimeout(() => d(false), 2e3);
  };
  return createComponent(f, { get children() {
    return ssr(C, ssrHydrationKey(), escape(createComponent(O, {})), escape(createComponent(R, {})), escape(createComponent(i, { href: "/settings/api-keys", get children() {
      return createComponent(u$1, { class: "cursor-pointer transition-colors hover:bg-accent", get children() {
        return createComponent(h, { get children() {
          return [createComponent(g, { children: "API Keys" }), createComponent(p, { children: "Manage your API keys for OpenAI, Anthropic, and other providers" })];
        } });
      } });
    } })), escape(createComponent(u$1, { get children() {
      return [createComponent(h, { get children() {
        return [createComponent(g, { children: "Preferences" }), createComponent(p, { children: "Customize your experience" })];
      } }), createComponent(m, { class: "space-y-4", get children() {
        return [ssr(y, ssrHydrationKey()), ssr(b, ssrHydrationKey())];
      } })];
    } })), escape(createComponent(u$1, { class: "border-destructive/50", get children() {
      return [createComponent(h, { get children() {
        return [createComponent(g, { class: "text-destructive", children: "Danger Zone" }), createComponent(p, { children: "Irreversible actions" })];
      } }), createComponent(m, { get children() {
        return ssr($, ssrHydrationKey(), escape(createComponent(A, { variant: "destructive", size: "sm", children: "Delete" })));
      } })];
    } })), p$1() && u[0] + ssrHydrationKey() + u[1], escape(createComponent(A, { onClick: m$1, children: "Save Changes" })));
  } });
}

export { j as default };
//# sourceMappingURL=index42.mjs.map

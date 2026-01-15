import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { createSignal, For } from 'solid-js';
import { A as A$1 } from './button-BLdmMly2.mjs';
import { u } from './card-DLX-hcJH.mjs';
import { O, R } from './sidebar-BRvunEeq.mjs';
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

var p = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><div class="mb-6 flex items-center justify-between"><h1 class="text-3xl font-bold">Agents</h1><!--$-->', '<!--/--></div><div class="mb-4 flex gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--></div><div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">', "</div></main></div></div>"], f = ["<div", ' class="mb-2 flex items-start justify-between"><h3 class="font-semibold">', '</h3><span class="', '">', "</span></div>"], x = ["<p", ' class="mb-4 text-sm text-muted-foreground">', "</p>"], b = ["<div", ' class="flex gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"];
const d = [{ id: "code-assistant", name: "Code Assistant", description: "Helps with coding tasks, debugging, and code review", status: "active" }, { id: "doc-writer", name: "Documentation Writer", description: "Generates and updates documentation", status: "active" }, { id: "test-generator", name: "Test Generator", description: "Creates unit and integration tests", status: "inactive" }, { id: "code-reviewer", name: "Code Reviewer", description: "Reviews code for best practices and issues", status: "active" }];
function A() {
  const [a, l] = createSignal("all"), c = () => a() === "all" ? d : d.filter((i) => i.status === a());
  return ssr(p, ssrHydrationKey(), escape(createComponent(O, {})), escape(createComponent(R, {})), escape(createComponent(A$1, { children: "Create Agent" })), escape(createComponent(A$1, { get variant() {
    return a() === "all" ? "default" : "outline";
  }, size: "sm", onClick: () => l("all"), children: "All" })), escape(createComponent(A$1, { get variant() {
    return a() === "active" ? "default" : "outline";
  }, size: "sm", onClick: () => l("active"), children: "Active" })), escape(createComponent(A$1, { get variant() {
    return a() === "inactive" ? "default" : "outline";
  }, size: "sm", onClick: () => l("inactive"), children: "Inactive" })), escape(createComponent(For, { get each() {
    return c();
  }, children: (i) => createComponent(u, { class: "p-6", get children() {
    return [ssr(f, ssrHydrationKey(), escape(i.name), `rounded-full px-2 py-1 text-xs ${i.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`, escape(i.status)), ssr(x, ssrHydrationKey(), escape(i.description)), ssr(b, ssrHydrationKey(), escape(createComponent(A$1, { variant: "outline", size: "sm", children: "Configure" })), escape(createComponent(A$1, { variant: "ghost", size: "sm", class: "text-destructive hover:text-destructive", get children() {
      return i.status === "active" ? "Disable" : "Enable";
    } })))];
  } }) })));
}

export { A as default };
//# sourceMappingURL=index5.mjs.map

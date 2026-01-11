import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { createSignal, For } from 'solid-js';
import { f as fr, m as mr, s as sr, g as gr } from './sidebar-DLFaXUjq.mjs';
import './routing-CyxMTkit.mjs';

var p = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><div class="mb-6 flex items-center justify-between"><h1 class="text-3xl font-bold">Agents</h1><!--$-->', '<!--/--></div><div class="mb-4 flex gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--></div><div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">', "</div></main></div></div>"], f = ["<div", ' class="mb-2 flex items-start justify-between"><h3 class="font-semibold">', '</h3><span class="', '">', "</span></div>"], x = ["<p", ' class="mb-4 text-sm text-muted-foreground">', "</p>"], b = ["<div", ' class="flex gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div>"];
const d = [{ id: "code-assistant", name: "Code Assistant", description: "Helps with coding tasks, debugging, and code review", status: "active" }, { id: "doc-writer", name: "Documentation Writer", description: "Generates and updates documentation", status: "active" }, { id: "test-generator", name: "Test Generator", description: "Creates unit and integration tests", status: "inactive" }, { id: "code-reviewer", name: "Code Reviewer", description: "Reviews code for best practices and issues", status: "active" }];
function k() {
  const [a, l] = createSignal("all"), c = () => a() === "all" ? d : d.filter((s) => s.status === a());
  return ssr(p, ssrHydrationKey(), escape(createComponent(fr, {})), escape(createComponent(mr, {})), escape(createComponent(sr, { children: "Create Agent" })), escape(createComponent(sr, { get variant() {
    return a() === "all" ? "default" : "outline";
  }, size: "sm", onClick: () => l("all"), children: "All" })), escape(createComponent(sr, { get variant() {
    return a() === "active" ? "default" : "outline";
  }, size: "sm", onClick: () => l("active"), children: "Active" })), escape(createComponent(sr, { get variant() {
    return a() === "inactive" ? "default" : "outline";
  }, size: "sm", onClick: () => l("inactive"), children: "Inactive" })), escape(createComponent(For, { get each() {
    return c();
  }, children: (s) => createComponent(gr, { class: "p-6", get children() {
    return [ssr(f, ssrHydrationKey(), escape(s.name), `rounded-full px-2 py-1 text-xs ${s.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`, escape(s.status)), ssr(x, ssrHydrationKey(), escape(s.description)), ssr(b, ssrHydrationKey(), escape(createComponent(sr, { variant: "outline", size: "sm", children: "Configure" })), escape(createComponent(sr, { variant: "ghost", size: "sm", class: "text-destructive hover:text-destructive", get children() {
      return s.status === "active" ? "Disable" : "Enable";
    } })))];
  } }) })));
}

export { k as default };
//# sourceMappingURL=index.mjs.map

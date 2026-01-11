import { ssr, ssrHydrationKey, escape, createComponent } from 'solid-js/web';
import { createResource, For } from 'solid-js';
import { f as fr, m as mr, g as gr } from './sidebar-DLFaXUjq.mjs';
import './routing-CyxMTkit.mjs';

var v = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Dashboard</h1><div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">', "</div></main></div></div>"], p = ["<div", ' class="flex items-center justify-between"><span class="text-sm text-muted-foreground">', '</span><span class="text-2xl font-bold">', "</span></div>"], u = ["<p", ' class="mt-2 text-sm text-muted-foreground">', "</p>"];
async function f() {
  return { totalChats: 1234, activeModels: 5, activeAgents: 6, tokensUsed: 5e4 };
}
function C() {
  const [t] = createResource(f), n = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return [{ label: "Total Chats", value: (_b = (_a = t()) == null ? void 0 : _a.totalChats) != null ? _b : 0, icon: "Chat" }, { label: "Active Models", value: (_d = (_c = t()) == null ? void 0 : _c.activeModels) != null ? _d : 0, icon: "Cpu" }, { label: "Active Agents", value: (_f = (_e = t()) == null ? void 0 : _e.activeAgents) != null ? _f : 0, icon: "Bot" }, { label: "Tokens Used", value: (_h = (_g = t()) == null ? void 0 : _g.tokensUsed) != null ? _h : 0, icon: "Hash" }];
  };
  return ssr(v, ssrHydrationKey(), escape(createComponent(fr, {})), escape(createComponent(mr, {})), escape(createComponent(For, { get each() {
    return n();
  }, children: (a) => createComponent(gr, { class: "p-6", get children() {
    return [ssr(p, ssrHydrationKey(), escape(a.icon), escape(a.value.toLocaleString())), ssr(u, ssrHydrationKey(), escape(a.label))];
  } }) })));
}

export { C as default };
//# sourceMappingURL=index2.mjs.map

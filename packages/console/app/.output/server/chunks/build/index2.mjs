import { createComponent, ssr, ssrHydrationKey, escape } from 'solid-js/web';
import { createResource, For } from 'solid-js';
import { u as u$1 } from './card-xYJnUqvS.mjs';
import { q, E } from './sidebar-lSzgpHq7.mjs';
import { f as f$1 } from './protected-route-M6OqgFP0.mjs';
import './auth-BSPamyz9.mjs';
import './button-BUb5ee2-.mjs';

var u = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Dashboard</h1><div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">', "</div></main></div></div>"], v = ["<div", ' class="flex items-center justify-between"><span class="text-sm text-muted-foreground">', '</span><span class="text-2xl font-bold">', "</span></div>"], f = ["<p", ' class="mt-2 text-sm text-muted-foreground">', "</p>"];
async function h() {
  return { totalChats: 1234, activeModels: 5, activeAgents: 6, tokensUsed: 5e4 };
}
function S() {
  const [s] = createResource(h), r = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return [{ label: "Total Chats", value: (_b = (_a = s()) == null ? void 0 : _a.totalChats) != null ? _b : 0, icon: "Chat" }, { label: "Active Models", value: (_d = (_c = s()) == null ? void 0 : _c.activeModels) != null ? _d : 0, icon: "Cpu" }, { label: "Active Agents", value: (_f = (_e = s()) == null ? void 0 : _e.activeAgents) != null ? _f : 0, icon: "Bot" }, { label: "Tokens Used", value: (_h = (_g = s()) == null ? void 0 : _g.tokensUsed) != null ? _h : 0, icon: "Hash" }];
  };
  return createComponent(f$1, { get children() {
    return ssr(u, ssrHydrationKey(), escape(createComponent(q, {})), escape(createComponent(E, {})), escape(createComponent(For, { get each() {
      return r();
    }, children: (a) => createComponent(u$1, { class: "p-6", get children() {
      return [ssr(v, ssrHydrationKey(), escape(a.icon), escape(a.value.toLocaleString())), ssr(f, ssrHydrationKey(), escape(a.label))];
    } }) })));
  } });
}

export { S as default };
//# sourceMappingURL=index2.mjs.map

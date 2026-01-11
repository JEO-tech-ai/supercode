import { ssr, ssrHydrationKey, escape, createComponent, ssrElement, mergeProps } from 'solid-js/web';
import { createSignal, splitProps } from 'solid-js';
import { f as fr, m as mr, g as gr, s as sr, Z } from './sidebar-DLFaXUjq.mjs';
import './routing-CyxMTkit.mjs';

const y = (r) => {
  const [a, i] = splitProps(r, ["class", "type"]);
  return ssrElement("input", mergeProps({ get type() {
    var _a;
    return (_a = a.type) != null ? _a : "text";
  }, get class() {
    return Z("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", a.class);
  } }, i), void 0, true);
};
var $ = ["<h2", ' class="mb-4 text-xl font-semibold">API Configuration</h2>'], k = ["<div", ' class="space-y-4"><div><label class="mb-2 block text-sm font-medium">OpenAI API Key</label><!--$-->', '<!--/--><p class="mt-1 text-xs text-muted-foreground">Your API key is stored securely and never shared.</p></div></div>'], w = ["<h2", ' class="mb-4 text-xl font-semibold">Preferences</h2>'], S = ["<div", ' class="space-y-4"><div class="flex items-center justify-between"><div><p class="font-medium">Auto-save conversations</p><p class="text-sm text-muted-foreground">Automatically save chat history</p></div><input type="checkbox" checked class="h-4 w-4"></div><div class="flex items-center justify-between"><div><p class="font-medium">Show token usage</p><p class="text-sm text-muted-foreground">Display token count in chat</p></div><input type="checkbox" checked class="h-4 w-4"></div></div>'], P = ["<h2", ' class="mb-4 text-xl font-semibold">Danger Zone</h2>'], _ = ["<div", ' class="space-y-4"><div class="flex items-center justify-between rounded-lg border border-destructive/50 p-4"><div><p class="font-medium text-destructive">Delete all data</p><p class="text-sm text-muted-foreground">Permanently delete all your conversations and settings</p></div><!--$-->', "<!--/--></div></div>"], A = ["<div", ' class="flex min-h-screen flex-col"><!--$-->', '<!--/--><div class="flex flex-1"><!--$-->', '<!--/--><main class="flex-1 p-6"><h1 class="mb-6 text-3xl font-bold">Settings</h1><div class="max-w-2xl space-y-6"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--><div class="flex justify-end gap-2"><!--$-->', "<!--/--><!--$-->", "<!--/--></div></div></main></div></div>"], p = ["<span", ' class="self-center text-sm text-green-600">Saved!</span>'];
function K() {
  const [r, a] = createSignal(""), [i, o] = createSignal(false), u = () => {
    o(true), setTimeout(() => o(false), 2e3);
  };
  return ssr(A, ssrHydrationKey(), escape(createComponent(fr, {})), escape(createComponent(mr, {})), escape(createComponent(gr, { class: "p-6", get children() {
    return [ssr($, ssrHydrationKey()), ssr(k, ssrHydrationKey(), escape(createComponent(y, { type: "password", placeholder: "sk-...", get value() {
      return r();
    }, onInput: (m) => a(m.currentTarget.value) })))];
  } })), escape(createComponent(gr, { class: "p-6", get children() {
    return [ssr(w, ssrHydrationKey()), ssr(S, ssrHydrationKey())];
  } })), escape(createComponent(gr, { class: "p-6", get children() {
    return [ssr(P, ssrHydrationKey()), ssr(_, ssrHydrationKey(), escape(createComponent(sr, { variant: "destructive", size: "sm", children: "Delete" })))];
  } })), i() && p[0] + ssrHydrationKey() + p[1], escape(createComponent(sr, { onClick: u, children: "Save Changes" })));
}

export { K as default };
//# sourceMappingURL=index4.mjs.map

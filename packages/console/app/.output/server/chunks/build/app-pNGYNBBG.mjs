import { createComponent, ssr, ssrHydrationKey, isServer, getRequestEvent, delegateEvents } from 'solid-js/web';
import { U as Uo } from '../nitro/nitro.mjs';
import { Suspense, createSignal, onCleanup, children, createMemo, getOwner, sharedConfig, untrack, Show, on, createRoot } from 'solid-js';
import { e as ec, G as Gl, c as cc, j as jl, _ as _l, l as lc, a as ac, b as _t, P as Pr, B as Bl, n as nc, E as Er, o as oc } from './routing-CyxMTkit.mjs';
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

const F = (t) => (r) => {
  const { base: a } = r, n = children(() => r.children), e = createMemo(() => Gl(n(), r.base || ""));
  let i;
  const u = cc(t, e, () => i, { base: a, singleFlight: r.singleFlight, transformUrl: r.transformUrl });
  return t.create && t.create(u), createComponent(jl.Provider, { value: u, get children() {
    return createComponent(rt, { routerState: u, get root() {
      return r.root;
    }, get preload() {
      return r.rootPreload || r.rootLoad;
    }, get children() {
      return [(i = getOwner()) && null, createComponent(nt, { routerState: u, get branches() {
        return e();
      } })];
    } });
  } });
};
function rt(t) {
  const r = t.routerState.location, a = t.routerState.params, n = createMemo(() => t.preload && untrack(() => {
    t.preload({ params: a, location: r, intent: lc() || "initial" });
  }));
  return createComponent(Show, { get when() {
    return t.root;
  }, keyed: true, get fallback() {
    return t.children;
  }, children: (e) => createComponent(e, { params: a, location: r, get data() {
    return n();
  }, get children() {
    return t.children;
  } }) });
}
function nt(t) {
  if (isServer) {
    const e = getRequestEvent();
    if (e && e.router && e.router.dataOnly) {
      at(e, t.routerState, t.branches);
      return;
    }
    e && ((e.router || (e.router = {})).matches || (e.router.matches = t.routerState.matches().map(({ route: i, path: u, params: f }) => ({ path: i.originalPath, pattern: i.pattern, match: u, params: f, info: i.info }))));
  }
  const r = [];
  let a;
  const n = createMemo(on(t.routerState.matches, (e, i, u) => {
    let f = i && e.length === i.length;
    const h = [];
    for (let l = 0, w = e.length; l < w; l++) {
      const b = i && i[l], g = e[l];
      u && b && g.route.key === b.route.key ? h[l] = u[l] : (f = false, r[l] && r[l](), createRoot((y) => {
        r[l] = y, h[l] = ac(t.routerState, h[l - 1] || t.routerState.base, P(() => n()[l + 1]), () => {
          var _a;
          const p = t.routerState.matches();
          return (_a = p[l]) != null ? _a : p[0];
        });
      }));
    }
    return r.splice(e.length).forEach((l) => l()), u && f ? u : (a = h[0], h);
  }));
  return P(() => n() && a)();
}
const P = (t) => () => createComponent(Show, { get when() {
  return t();
}, keyed: true, children: (r) => createComponent(Pr.Provider, { value: r, get children() {
  return r.outlet();
} }) });
function at(t, r, a) {
  const n = new URL(t.request.url), e = _t(a, new URL(t.router.previousUrl || t.request.url).pathname), i = _t(a, n.pathname);
  for (let u = 0; u < i.length; u++) {
    (!e[u] || i[u].route !== e[u].route) && (t.router.dataOnly = true);
    const { route: f, params: h } = i[u];
    f.preload && f.preload({ params: h, location: r.location, intent: "preload" });
  }
}
function ot([t, r], a, n) {
  return [t, n ? (e) => r(n(e)) : r];
}
function st(t) {
  let r = false;
  const a = (e) => typeof e == "string" ? { value: e } : e, n = ot(createSignal(a(t.get()), { equals: (e, i) => e.value === i.value && e.state === i.state }), void 0, (e) => (!r && t.set(e), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), e));
  return t.init && onCleanup(t.init((e = t.get()) => {
    r = true, n[1](a(e)), r = false;
  })), F({ signal: n, create: t.create, utils: t.utils });
}
function it(t, r, a) {
  return t.addEventListener(r, a), () => t.removeEventListener(r, a);
}
function ut(t, r) {
  const a = t && document.getElementById(t);
  a ? a.scrollIntoView() : r && window.scrollTo(0, 0);
}
function ct(t) {
  const r = new URL(t);
  return r.pathname + r.search;
}
function lt(t) {
  let r;
  const a = { value: t.url || (r = getRequestEvent()) && ct(r.request.url) || "" };
  return F({ signal: [() => a, (n) => Object.assign(a, n)] })(t);
}
const dt = /* @__PURE__ */ new Map();
function ht(t = true, r = false, a = "/_server", n) {
  return (e) => {
    const i = e.base.path(), u = e.navigatorFactory(e.base);
    let f, h;
    function l(o) {
      return o.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function w(o) {
      if (o.defaultPrevented || o.button !== 0 || o.metaKey || o.altKey || o.ctrlKey || o.shiftKey) return;
      const s = o.composedPath().find((A) => A instanceof Node && A.nodeName.toUpperCase() === "A");
      if (!s || r && !s.hasAttribute("link")) return;
      const d = l(s), c = d ? s.href.baseVal : s.href;
      if ((d ? s.target.baseVal : s.target) || !c && !s.hasAttribute("state")) return;
      const v = (s.getAttribute("rel") || "").split(/\s+/);
      if (s.hasAttribute("download") || v && v.includes("external")) return;
      const R = d ? new URL(c, document.baseURI) : new URL(c);
      if (!(R.origin !== window.location.origin || i && R.pathname && !R.pathname.toLowerCase().startsWith(i.toLowerCase()))) return [s, R];
    }
    function b(o) {
      const s = w(o);
      if (!s) return;
      const [d, c] = s, E = e.parsePath(c.pathname + c.search + c.hash), v = d.getAttribute("state");
      o.preventDefault(), u(E, { resolve: false, replace: d.hasAttribute("replace"), scroll: !d.hasAttribute("noscroll"), state: v ? JSON.parse(v) : void 0 });
    }
    function g(o) {
      const s = w(o);
      if (!s) return;
      const [d, c] = s;
      n && (c.pathname = n(c.pathname)), e.preloadRoute(c, d.getAttribute("preload") !== "false");
    }
    function y(o) {
      clearTimeout(f);
      const s = w(o);
      if (!s) return h = null;
      const [d, c] = s;
      h !== d && (n && (c.pathname = n(c.pathname)), f = setTimeout(() => {
        e.preloadRoute(c, d.getAttribute("preload") !== "false"), h = d;
      }, 20));
    }
    function p(o) {
      if (o.defaultPrevented) return;
      let s = o.submitter && o.submitter.hasAttribute("formaction") ? o.submitter.getAttribute("formaction") : o.target.getAttribute("action");
      if (!s) return;
      if (!s.startsWith("https://action/")) {
        const c = new URL(s, _l);
        if (s = e.parsePath(c.pathname + c.search), !s.startsWith(a)) return;
      }
      if (o.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const d = dt.get(s);
      if (d) {
        o.preventDefault();
        const c = new FormData(o.target, o.submitter);
        d.call({ r: e, f: o.target }, o.target.enctype === "multipart/form-data" ? c : new URLSearchParams(c));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", b), t && (document.addEventListener("mousemove", y, { passive: true }), document.addEventListener("focusin", g, { passive: true }), document.addEventListener("touchstart", g, { passive: true })), document.addEventListener("submit", p), onCleanup(() => {
      document.removeEventListener("click", b), t && (document.removeEventListener("mousemove", y), document.removeEventListener("focusin", g), document.removeEventListener("touchstart", g)), document.removeEventListener("submit", p);
    });
  };
}
function mt(t) {
  if (isServer) return lt(t);
  const r = () => {
    const n = window.location.pathname.replace(/^\/+/, "/") + window.location.search, e = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: n + window.location.hash, state: e };
  }, a = Bl();
  return st({ get: r, set({ value: n, replace: e, scroll: i, state: u }) {
    e ? window.history.replaceState(nc(u), "", n) : window.history.pushState(u, "", n), ut(decodeURIComponent(window.location.hash.slice(1)), i), Er();
  }, init: (n) => it(window, "popstate", oc(n, (e) => {
    if (e) return !a.confirm(e);
    {
      const i = r();
      return !a.confirm(i.value, { state: i.state });
    }
  })), create: ht(t.preload, t.explicitLinks, t.actionBase, t.transformUrl), utils: { go: (n) => window.history.go(n), beforeLeave: a } })(t);
}
var ft = ["<div", ' class="flex items-center justify-center h-screen">Loading...</div>'];
function Lt() {
  return createComponent(ec, { defaultTheme: "system", get children() {
    return createComponent(mt, { root: (t) => createComponent(Suspense, { get fallback() {
      return ssr(ft, ssrHydrationKey());
    }, get children() {
      return t.children;
    } }), get children() {
      return createComponent(Uo, {});
    } });
  } });
}

export { Lt as default };
//# sourceMappingURL=app-pNGYNBBG.mjs.map

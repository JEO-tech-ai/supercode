import { createComponent, isServer, getRequestEvent, mergeProps, Dynamic, Portal, ssr, ssrHydrationKey, escape, ssrAttribute, ssrStyle, ssrStyleProperty, ssrElement } from 'solid-js/web';
import { createSignal, createEffect, createContext, createMemo, createRenderEffect, on as on$1, useContext, runWithOwner, splitProps, getOwner, startTransition, resetErrorBoundaries, batch, untrack, createComponent as createComponent$1, mergeProps as mergeProps$1, createUniqueId, onCleanup, Show, Switch, Match, onMount, createComputed, children, For, $TRACK, createRoot, DEV } from 'solid-js';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const Ur = !isServer, zr = Ur && !!DEV;
const b = (e) => typeof e == "function" && !e.length ? e() : e, xn = (e) => Array.isArray(e) ? e : e ? [e] : [];
function Hr(e, ...t) {
  return typeof e == "function" ? e(...t) : e;
}
const jr = zr ? (e) => getOwner() ? onCleanup(e) : e : onCleanup;
function qr(e, t, n, o) {
  return e.addEventListener(t, n, o), jr(e.removeEventListener.bind(e, t, n, o));
}
function Yr(e, t, n, o) {
  if (isServer) return;
  const r = () => {
    xn(b(e)).forEach((i) => {
      i && xn(b(t)).forEach((s) => qr(i, s, n, o));
    });
  };
  typeof e == "function" ? createEffect(r) : createRenderEffect(r);
}
const Mt = /* @__PURE__ */ Symbol("fallback");
function En(e) {
  for (const t of e) t.dispose();
}
function Xr(e, t, n, o = {}) {
  if (isServer) {
    const s = e();
    let l = [];
    if (s && s.length) for (let c = 0, a = s.length; c < a; c++) l.push(n(() => s[c], () => c));
    else o.fallback && (l = [o.fallback()]);
    return () => l;
  }
  const r = /* @__PURE__ */ new Map();
  return onCleanup(() => En(r.values())), () => {
    const s = e() || [];
    return s[$TRACK], untrack(() => {
      var _a, _b;
      if (!s.length) return En(r.values()), r.clear(), o.fallback ? [createRoot((d) => (r.set(Mt, { dispose: d }), o.fallback()))] : [];
      const l = new Array(s.length), c = r.get(Mt);
      if (!r.size || c) {
        c == null ? void 0 : c.dispose(), r.delete(Mt);
        for (let u = 0; u < s.length; u++) {
          const d = s[u], f = t(d, u);
          i(l, d, u, f);
        }
        return l;
      }
      const a = new Set(r.keys());
      for (let u = 0; u < s.length; u++) {
        const d = s[u], f = t(d, u);
        a.delete(f);
        const g = r.get(f);
        g ? (l[u] = g.mapped, (_a = g.setIndex) == null ? void 0 : _a.call(g, u), g.setItem(() => d)) : i(l, d, u, f);
      }
      for (const u of a) (_b = r.get(u)) == null ? void 0 : _b.dispose(), r.delete(u);
      return l;
    });
  };
  function i(s, l, c, a) {
    createRoot((u) => {
      const [d, f] = createSignal(l), g = { setItem: f, dispose: u };
      if (n.length > 1) {
        const [h, m] = createSignal(c);
        g.setIndex = m, g.mapped = n(d, h);
      } else g.mapped = n(d);
      r.set(a, g), s[c] = g.mapped;
    });
  }
}
function Gr(e) {
  const { by: t } = e;
  return createMemo(Xr(() => e.each, typeof t == "function" ? t : (n) => n[t], e.children, "fallback" in e ? { fallback: () => e.fallback } : void 0));
}
const Zr = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
function Dn(e) {
  const t = {};
  let n;
  for (; n = Zr.exec(e); ) t[n[1]] = n[2];
  return t;
}
function tt(e, t) {
  if (typeof e == "string") {
    if (typeof t == "string") return `${e};${t}`;
    e = Dn(e);
  } else typeof t == "string" && (t = Dn(t));
  return { ...e, ...t };
}
function Tn(e, t) {
  const n = [...e], o = n.indexOf(t);
  return o !== -1 && n.splice(o, 1), n;
}
function Jr(e) {
  return typeof e == "number";
}
function Be(e) {
  return Object.prototype.toString.call(e) === "[object String]";
}
function Jt(e) {
  return typeof e == "function";
}
function $e(e) {
  return (t) => `${e()}-${t}`;
}
function de(e, t) {
  return e ? e === t || e.contains(t) : false;
}
function Ye(e, t = false) {
  const { activeElement: n } = se(e);
  if (!(n == null ? void 0 : n.nodeName)) return null;
  if (co(n) && n.contentDocument) return Ye(n.contentDocument.body, t);
  if (t) {
    const o = n.getAttribute("aria-activedescendant");
    if (o) {
      const r = se(n).getElementById(o);
      if (r) return r;
    }
  }
  return n;
}
function lo(e) {
  return se(e).defaultView || window;
}
function se(e) {
  return e ? e.ownerDocument || e : document;
}
function co(e) {
  return e.tagName === "IFRAME";
}
var ao = ((e) => (e.Escape = "Escape", e.Enter = "Enter", e.Tab = "Tab", e.Space = " ", e.ArrowDown = "ArrowDown", e.ArrowLeft = "ArrowLeft", e.ArrowRight = "ArrowRight", e.ArrowUp = "ArrowUp", e.End = "End", e.Home = "Home", e.PageDown = "PageDown", e.PageUp = "PageUp", e))(ao || {});
function H(e, t) {
  return t && (Jt(t) ? t(e) : t[0](t[1], e)), e == null ? void 0 : e.defaultPrevented;
}
function ie(e) {
  return (t) => {
    for (const n of e) H(t, n);
  };
}
function ii(e) {
  return e.ctrlKey && !e.metaKey;
}
function X(e) {
  if (e) if (si()) e.focus({ preventScroll: true });
  else {
    const t = li(e);
    e.focus(), ci(t);
  }
}
var at = null;
function si() {
  if (at == null) {
    at = false;
    try {
      document.createElement("div").focus({ get preventScroll() {
        return at = true, true;
      } });
    } catch {
    }
  }
  return at;
}
function li(e) {
  let t = e.parentNode;
  const n = [], o = document.scrollingElement || document.documentElement;
  for (; t instanceof HTMLElement && t !== o; ) (t.offsetHeight < t.scrollHeight || t.offsetWidth < t.scrollWidth) && n.push({ element: t, scrollTop: t.scrollTop, scrollLeft: t.scrollLeft }), t = t.parentNode;
  return o instanceof HTMLElement && n.push({ element: o, scrollTop: o.scrollTop, scrollLeft: o.scrollLeft }), n;
}
function ci(e) {
  for (const { element: t, scrollTop: n, scrollLeft: o } of e) t.scrollTop = n, t.scrollLeft = o;
}
var fo = ["input:not([type='hidden']):not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "button:not([disabled])", "a[href]", "area[href]", "[tabindex]", "iframe", "object", "embed", "audio[controls]", "video[controls]", "[contenteditable]:not([contenteditable='false'])"], ai = [...fo, '[tabindex]:not([tabindex="-1"]):not([disabled])'], en = `${fo.join(":not([hidden]),")},[tabindex]:not([disabled]):not([hidden])`, ui = ai.join(':not([hidden]):not([tabindex="-1"]),');
function go(e, t) {
  const o = Array.from(e.querySelectorAll(en)).filter(On);
  return t && On(e) && o.unshift(e), o.forEach((r, i) => {
    if (co(r) && r.contentDocument) {
      const s = r.contentDocument.body, l = go(s, false);
      o.splice(i, 1, ...l);
    }
  }), o;
}
function On(e) {
  return ho(e) && !di(e);
}
function ho(e) {
  return e.matches(en) && tn(e);
}
function di(e) {
  return Number.parseInt(e.getAttribute("tabindex") || "0", 10) < 0;
}
function tn(e, t) {
  return e.nodeName !== "#comment" && fi(e) && gi(e, t) && (!e.parentElement || tn(e.parentElement, e));
}
function fi(e) {
  if (!(e instanceof HTMLElement) && !(e instanceof SVGElement)) return false;
  const { display: t, visibility: n } = e.style;
  let o = t !== "none" && n !== "hidden" && n !== "collapse";
  if (o) {
    if (!e.ownerDocument.defaultView) return o;
    const { getComputedStyle: r } = e.ownerDocument.defaultView, { display: i, visibility: s } = r(e);
    o = i !== "none" && s !== "hidden" && s !== "collapse";
  }
  return o;
}
function gi(e, t) {
  return !e.hasAttribute("hidden") && (e.nodeName === "DETAILS" && t && t.nodeName !== "SUMMARY" ? e.hasAttribute("open") : true);
}
function hi(e, t, n) {
  const o = (t == null ? void 0 : t.tabbable) ? ui : en, r = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, { acceptNode(i) {
    var _a;
    return ((_a = t == null ? void 0 : t.from) == null ? void 0 : _a.contains(i)) ? NodeFilter.FILTER_REJECT : i.matches(o) && tn(i) && (!(t == null ? void 0 : t.accept) || t.accept(i)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } });
  return (t == null ? void 0 : t.from) && (r.currentNode = t.from), r;
}
function pi() {
}
function mi(e) {
  return [e.clientX, e.clientY];
}
function yi(e, t) {
  const [n, o] = e;
  let r = false;
  const i = t.length;
  for (let s = i, l = 0, c = s - 1; l < s; c = l++) {
    const [a, u] = t[l], [d, f] = t[c], [, g] = t[c === 0 ? s - 1 : c - 1] || [0, 0], h = (u - f) * (n - a) - (a - d) * (o - u);
    if (f < u) {
      if (o >= f && o < u) {
        if (h === 0) return true;
        h > 0 && (o === f ? o > g && (r = !r) : r = !r);
      }
    } else if (u < f) {
      if (o > u && o <= f) {
        if (h === 0) return true;
        h < 0 && (o === f ? o < g && (r = !r) : r = !r);
      }
    } else if (o === u && (n >= d && n <= a || n >= a && n <= d)) return true;
  }
  return r;
}
function _(e, t) {
  return mergeProps$1(e, t);
}
function Cn() {
  return;
}
typeof document < "u" && (document.readyState !== "loading" ? Cn() : document.addEventListener("DOMContentLoaded", Cn));
function Ln(e, t) {
  const n = An(e, t, "left"), o = An(e, t, "top"), r = t.offsetWidth, i = t.offsetHeight;
  let s = e.scrollLeft, l = e.scrollTop;
  const c = s + e.offsetWidth, a = l + e.offsetHeight;
  n <= s ? s = n : n + r > c && (s += n + r - c), o <= l ? l = o : o + i > a && (l += o + i - a), e.scrollLeft = s, e.scrollTop = l;
}
function An(e, t, n) {
  const o = n === "left" ? "offsetLeft" : "offsetTop";
  let r = 0;
  for (; t.offsetParent && (r += t[o], t.offsetParent !== e); ) {
    if (t.offsetParent.contains(e)) {
      r -= e[o];
      break;
    }
    t = t.offsetParent;
  }
  return r;
}
var po = { border: "0", clip: "rect(0 0 0 0)", "clip-path": "inset(50%)", height: "1px", margin: "0 -1px -1px 0", overflow: "hidden", padding: "0", position: "absolute", width: "1px", "white-space": "nowrap" };
function mo(e, t) {
  const [n, o] = createSignal(In(t == null ? void 0 : t()));
  return createEffect(() => {
    var _a;
    o(((_a = e()) == null ? void 0 : _a.tagName.toLowerCase()) || In(t == null ? void 0 : t()));
  }), n;
}
function In(e) {
  return Be(e) ? e : void 0;
}
function j(e) {
  const [t, n] = splitProps(e, ["as"]);
  if (!t.as) throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");
  return createComponent(Dynamic, mergeProps(n, { get component() {
    return t.as;
  } }));
}
var vi = Object.defineProperty, ot = (e, t) => {
  for (var n in t) vi(e, n, { get: t[n], enumerable: true });
}, bi = {};
ot(bi, { Button: () => xi, Root: () => rt });
var wi = ["button", "color", "file", "image", "reset", "submit"];
function Si(e) {
  const t = e.tagName.toLowerCase();
  return t === "button" ? true : t === "input" && e.type ? wi.indexOf(e.type) !== -1 : false;
}
function rt(e) {
  let t;
  const n = _({ type: "button" }, e), [o, r] = splitProps(n, ["ref", "type", "disabled"]), i = mo(() => t, () => "button"), s = createMemo(() => {
    const a = i();
    return a == null ? false : Si({ tagName: a, type: o.type });
  }), l = createMemo(() => i() === "input"), c = createMemo(() => i() === "a" && (void 0 ) != null);
  return createComponent(j, mergeProps({ as: "button", get type() {
    return s() || l() ? o.type : void 0;
  }, get role() {
    return !s() && !c() ? "button" : void 0;
  }, get tabIndex() {
    return !s() && !c() && !o.disabled ? 0 : void 0;
  }, get disabled() {
    return s() || l() ? o.disabled : void 0;
  }, get "aria-disabled"() {
    return !s() && !l() && o.disabled ? true : void 0;
  }, get "data-disabled"() {
    return o.disabled ? "" : void 0;
  } }, r));
}
var xi = rt, pt = "data-kb-top-layer", yo, Wt = false, be = [];
function Je(e) {
  return be.findIndex((t) => t.node === e);
}
function Ei(e) {
  return be[Je(e)];
}
function Di(e) {
  return be[be.length - 1].node === e;
}
function vo() {
  return be.filter((e) => e.isPointerBlocking);
}
function Ti() {
  return [...vo()].slice(-1)[0];
}
function nn() {
  return vo().length > 0;
}
function bo(e) {
  var _a;
  const t = Je((_a = Ti()) == null ? void 0 : _a.node);
  return Je(e) < t;
}
function Oi(e) {
  be.push(e);
}
function Pi(e) {
  const t = Je(e);
  t < 0 || be.splice(t, 1);
}
function Ci() {
  for (const { node: e } of be) e.style.pointerEvents = bo(e) ? "none" : "auto";
}
function Li(e) {
  if (nn() && !Wt) {
    const t = se(e);
    yo = document.body.style.pointerEvents, t.body.style.pointerEvents = "none", Wt = true;
  }
}
function Ai(e) {
  if (nn()) return;
  const t = se(e);
  t.body.style.pointerEvents = yo, t.body.style.length === 0 && t.body.removeAttribute("style"), Wt = false;
}
var ut = { layers: be, isTopMostLayer: Di, hasPointerBlockingLayer: nn, isBelowPointerBlockingLayer: bo, addLayer: Oi, removeLayer: Pi, indexOf: Je, find: Ei, assignPointerEventToLayers: Ci, disableBodyPointerEvents: Li, restoreBodyPointerEvents: Ai }, Rt = "focusScope.autoFocusOnMount", kt = "focusScope.autoFocusOnUnmount", Kn = { bubbles: false, cancelable: true }, Fn = { stack: [], active() {
  return this.stack[0];
}, add(e) {
  var _a;
  e !== this.active() && ((_a = this.active()) == null ? void 0 : _a.pause()), this.stack = Tn(this.stack, e), this.stack.unshift(e);
}, remove(e) {
  var _a;
  this.stack = Tn(this.stack, e), (_a = this.active()) == null ? void 0 : _a.resume();
} };
function wo(e, t) {
  const [n, o] = createSignal(false), r = { pause() {
    o(true);
  }, resume() {
    o(false);
  } };
  let i = null;
  const s = (h) => {
    var _a;
    return (_a = e.onMountAutoFocus) == null ? void 0 : _a.call(e, h);
  }, l = (h) => {
    var _a;
    return (_a = e.onUnmountAutoFocus) == null ? void 0 : _a.call(e, h);
  }, c = () => se(t()), a = () => {
    const h = c().createElement("span");
    return h.setAttribute("data-focus-trap", ""), h.tabIndex = 0, Object.assign(h.style, po), h;
  }, u = () => {
    const h = t();
    return h ? go(h, true).filter((m) => !m.hasAttribute("data-focus-trap")) : [];
  }, d = () => {
    const h = u();
    return h.length > 0 ? h[0] : null;
  }, f = () => {
    const h = u();
    return h.length > 0 ? h[h.length - 1] : null;
  }, g = () => {
    const h = t();
    if (!h) return false;
    const m = Ye(h);
    return !m || de(h, m) ? false : ho(m);
  };
  createEffect(() => {
    if (isServer) return;
    const h = t();
    if (!h) return;
    Fn.add(r);
    const m = Ye(h);
    if (!de(h, m)) {
      const v = new CustomEvent(Rt, Kn);
      h.addEventListener(Rt, s), h.dispatchEvent(v), v.defaultPrevented || setTimeout(() => {
        X(d()), Ye(h) === m && X(h);
      }, 0);
    }
    onCleanup(() => {
      h.removeEventListener(Rt, s), setTimeout(() => {
        const v = new CustomEvent(kt, Kn);
        g() && v.preventDefault(), h.addEventListener(kt, l), h.dispatchEvent(v), v.defaultPrevented || X(m != null ? m : c().body), h.removeEventListener(kt, l), Fn.remove(r);
      }, 0);
    });
  }), createEffect(() => {
    if (isServer) return;
    const h = t();
    if (!h || !b(e.trapFocus) || n()) return;
    const m = (v) => {
      const p = v.target;
      (p == null ? void 0 : p.closest(`[${pt}]`)) || (de(h, p) ? i = p : X(i));
    }, y = (v) => {
      var _a;
      const w = (_a = v.relatedTarget) != null ? _a : Ye(h);
      (w == null ? void 0 : w.closest(`[${pt}]`)) || de(h, w) || X(i);
    };
    c().addEventListener("focusin", m), c().addEventListener("focusout", y), onCleanup(() => {
      c().removeEventListener("focusin", m), c().removeEventListener("focusout", y);
    });
  }), createEffect(() => {
    if (isServer) return;
    const h = t();
    if (!h || !b(e.trapFocus) || n()) return;
    const m = a();
    h.insertAdjacentElement("afterbegin", m);
    const y = a();
    h.insertAdjacentElement("beforeend", y);
    function v(w) {
      const x = d(), S = f();
      w.relatedTarget === x ? X(S) : X(x);
    }
    m.addEventListener("focusin", v), y.addEventListener("focusin", v);
    const p = new MutationObserver((w) => {
      for (const x of w) x.previousSibling === y && (y.remove(), h.insertAdjacentElement("beforeend", y)), x.nextSibling === m && (m.remove(), h.insertAdjacentElement("afterbegin", m));
    });
    p.observe(h, { childList: true, subtree: false }), onCleanup(() => {
      m.removeEventListener("focusin", v), y.removeEventListener("focusin", v), m.remove(), y.remove(), p.disconnect();
    });
  });
}
var Ii = "data-live-announcer";
function So(e) {
  createEffect(() => {
    b(e.isDisabled) || onCleanup(Ki(b(e.targets), b(e.root)));
  });
}
var je = /* @__PURE__ */ new WeakMap(), re = [];
function Ki(e, t = document.body) {
  const n = new Set(e), o = /* @__PURE__ */ new Set(), r = (c) => {
    for (const f of c.querySelectorAll(`[${Ii}], [${pt}]`)) n.add(f);
    const a = (f) => {
      if (n.has(f) || f.parentElement && o.has(f.parentElement) && f.parentElement.getAttribute("role") !== "row") return NodeFilter.FILTER_REJECT;
      for (const g of n) if (f.contains(g)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }, u = document.createTreeWalker(c, NodeFilter.SHOW_ELEMENT, { acceptNode: a }), d = a(c);
    if (d === NodeFilter.FILTER_ACCEPT && i(c), d !== NodeFilter.FILTER_REJECT) {
      let f = u.nextNode();
      for (; f != null; ) i(f), f = u.nextNode();
    }
  }, i = (c) => {
    var _a;
    const a = (_a = je.get(c)) != null ? _a : 0;
    c.getAttribute("aria-hidden") === "true" && a === 0 || (a === 0 && c.setAttribute("aria-hidden", "true"), o.add(c), je.set(c, a + 1));
  };
  re.length && re[re.length - 1].disconnect(), r(t);
  const s = new MutationObserver((c) => {
    for (const a of c) if (!(a.type !== "childList" || a.addedNodes.length === 0) && ![...n, ...o].some((u) => u.contains(a.target))) {
      for (const u of a.removedNodes) u instanceof Element && (n.delete(u), o.delete(u));
      for (const u of a.addedNodes) (u instanceof HTMLElement || u instanceof SVGElement) && (u.dataset.liveAnnouncer === "true" || u.dataset.reactAriaTopLayer === "true") ? n.add(u) : u instanceof Element && r(u);
    }
  });
  s.observe(t, { childList: true, subtree: true });
  const l = { observe() {
    s.observe(t, { childList: true, subtree: true });
  }, disconnect() {
    s.disconnect();
  } };
  return re.push(l), () => {
    s.disconnect();
    for (const c of o) {
      const a = je.get(c);
      if (a == null) return;
      a === 1 ? (c.removeAttribute("aria-hidden"), je.delete(c)) : je.set(c, a - 1);
    }
    l === re[re.length - 1] ? (re.pop(), re.length && re[re.length - 1].observe()) : re.splice(re.indexOf(l), 1);
  };
}
var Mn = "interactOutside.pointerDownOutside", Rn = "interactOutside.focusOutside";
function Fi(e, t) {
  let n, o = pi;
  const r = () => se(t()), i = (d) => {
    var _a;
    return (_a = e.onPointerDownOutside) == null ? void 0 : _a.call(e, d);
  }, s = (d) => {
    var _a;
    return (_a = e.onFocusOutside) == null ? void 0 : _a.call(e, d);
  }, l = (d) => {
    var _a;
    return (_a = e.onInteractOutside) == null ? void 0 : _a.call(e, d);
  }, c = (d) => {
    var _a;
    const f = d.target;
    return !(f instanceof Element) || f.closest(`[${pt}]`) || !de(r(), f) || de(t(), f) ? false : !((_a = e.shouldExcludeElement) == null ? void 0 : _a.call(e, f));
  }, a = (d) => {
    function f() {
      const g = t(), h = d.target;
      if (!g || !h || !c(d)) return;
      const m = ie([i, l]);
      h.addEventListener(Mn, m, { once: true });
      const y = new CustomEvent(Mn, { bubbles: false, cancelable: true, detail: { originalEvent: d, isContextMenu: d.button === 2 || ii(d) && d.button === 0 } });
      h.dispatchEvent(y);
    }
    d.pointerType === "touch" ? (r().removeEventListener("click", f), o = f, r().addEventListener("click", f, { once: true })) : f();
  }, u = (d) => {
    const f = t(), g = d.target;
    if (!f || !g || !c(d)) return;
    const h = ie([s, l]);
    g.addEventListener(Rn, h, { once: true });
    const m = new CustomEvent(Rn, { bubbles: false, cancelable: true, detail: { originalEvent: d, isContextMenu: false } });
    g.dispatchEvent(m);
  };
  createEffect(() => {
    isServer || b(e.isDisabled) || (n = window.setTimeout(() => {
      r().addEventListener("pointerdown", a, true);
    }, 0), r().addEventListener("focusin", u, true), onCleanup(() => {
      window.clearTimeout(n), r().removeEventListener("click", o), r().removeEventListener("pointerdown", a, true), r().removeEventListener("focusin", u, true);
    }));
  });
}
function Mi(e) {
  const t = (n) => {
    n.key, ao.Escape;
  };
  createEffect(() => {
    var _a, _b;
    if (isServer || b(e.isDisabled)) return;
    const n = (_b = (_a = e.ownerDocument) == null ? void 0 : _a.call(e)) != null ? _b : se();
    n.addEventListener("keydown", t), onCleanup(() => {
      n.removeEventListener("keydown", t);
    });
  });
}
var xo = createContext();
function Ri() {
  return useContext(xo);
}
function on(e) {
  let t;
  const n = Ri(), [o, r] = splitProps(e, ["ref", "disableOutsidePointerEvents", "excludedElements", "onEscapeKeyDown", "onPointerDownOutside", "onFocusOutside", "onInteractOutside", "onDismiss", "bypassTopMostLayerCheck"]), i = /* @__PURE__ */ new Set([]), s = (d) => {
    i.add(d);
    const f = n == null ? void 0 : n.registerNestedLayer(d);
    return () => {
      i.delete(d), f == null ? void 0 : f();
    };
  };
  Fi({ shouldExcludeElement: (d) => false, onPointerDownOutside: (d) => {
  }, onFocusOutside: (d) => {
    var _a, _b, _c;
    (_a = o.onFocusOutside) == null ? void 0 : _a.call(o, d), (_b = o.onInteractOutside) == null ? void 0 : _b.call(o, d), d.defaultPrevented || ((_c = o.onDismiss) == null ? void 0 : _c.call(o));
  } }, () => t), Mi({ ownerDocument: () => se(t), onEscapeKeyDown: (d) => {
  } }), onMount(() => {
  }), createEffect(on$1([() => t, () => o.disableOutsidePointerEvents], ([d, f]) => {
    if (!d) return;
    const g = ut.find(d);
    g && g.isPointerBlocking !== f && (g.isPointerBlocking = f, ut.assignPointerEventToLayers()), f && ut.disableBodyPointerEvents(d), onCleanup(() => {
      ut.restoreBodyPointerEvents(d);
    });
  }, { defer: true }));
  const u = { registerNestedLayer: s };
  return createComponent(xo.Provider, { value: u, get children() {
    return createComponent(j, mergeProps({ as: "div" }, r));
  } });
}
function Eo(e) {
  var _a;
  const [t, n] = createSignal((_a = e.defaultValue) == null ? void 0 : _a.call(e)), o = createMemo(() => {
    var _a2;
    return ((_a2 = e.value) == null ? void 0 : _a2.call(e)) !== void 0;
  }), r = createMemo(() => {
    var _a2;
    return o() ? (_a2 = e.value) == null ? void 0 : _a2.call(e) : t();
  });
  return [r, (s) => {
    untrack(() => {
      var _a2;
      const l = Hr(s, r());
      return Object.is(l, r()) || (o() || n(l), (_a2 = e.onChange) == null ? void 0 : _a2.call(e, l)), l;
    });
  }];
}
function ki(e) {
  const [t, n] = Eo(e);
  return [() => {
    var _a;
    return (_a = t()) != null ? _a : false;
  }, n];
}
function rn(e = {}) {
  const [t, n] = ki({ value: () => b(e.open), defaultValue: () => !!b(e.defaultOpen), onChange: (s) => {
    var _a;
    return (_a = e.onOpenChange) == null ? void 0 : _a.call(e, s);
  } }), o = () => {
    n(true);
  }, r = () => {
    n(false);
  };
  return { isOpen: t, setIsOpen: n, open: o, close: r, toggle: () => {
    t() ? r() : o();
  } };
}
function Q(e) {
  return (t) => (e(t), () => e(void 0));
}
var Y = (e) => typeof e == "function" ? e() : e, Ut = (e, t) => {
  var _a;
  if (e.contains(t)) return true;
  let n = t;
  for (; n; ) {
    if (n === e) return true;
    n = (_a = n._$host) != null ? _a : n.parentElement;
  }
  return false;
}, dt = /* @__PURE__ */ new Map(), Bi = (e) => {
  createEffect(() => {
    var _a, _b;
    const t = (_a = Y(e.style)) != null ? _a : {}, n = (_b = Y(e.properties)) != null ? _b : [], o = {};
    for (const i in t) o[i] = e.element.style[i];
    const r = dt.get(e.key);
    r ? r.activeCount++ : dt.set(e.key, { activeCount: 1, originalStyles: o, properties: n.map((i) => i.key) }), Object.assign(e.element.style, e.style);
    for (const i of n) e.element.style.setProperty(i.key, i.value);
    onCleanup(() => {
      var _a2;
      const i = dt.get(e.key);
      if (i) {
        if (i.activeCount !== 1) {
          i.activeCount--;
          return;
        }
        dt.delete(e.key);
        for (const [s, l] of Object.entries(i.originalStyles)) e.element.style[s] = l;
        for (const s of i.properties) e.element.style.removeProperty(s);
        e.element.style.length === 0 && e.element.removeAttribute("style"), (_a2 = e.cleanup) == null ? void 0 : _a2.call(e);
      }
    });
  });
}, kn = Bi, Vi = (e, t) => {
  switch (t) {
    case "x":
      return [e.clientWidth, e.scrollLeft, e.scrollWidth];
    case "y":
      return [e.clientHeight, e.scrollTop, e.scrollHeight];
  }
}, Ni = (e, t) => {
  const n = getComputedStyle(e), o = t === "x" ? n.overflowX : n.overflowY;
  return o === "auto" || o === "scroll" || e.tagName === "HTML" && o === "visible";
}, _i = (e, t, n) => {
  var _a;
  const o = t === "x" && window.getComputedStyle(e).direction === "rtl" ? -1 : 1;
  let r = e, i = 0, s = 0, l = false;
  do {
    const [c, a, u] = Vi(r, t), d = u - c - o * a;
    (a !== 0 || d !== 0) && Ni(r, t) && (i += d, s += a), r === (n != null ? n : document.documentElement) ? l = true : r = (_a = r._$host) != null ? _a : r.parentElement;
  } while (r && !l);
  return [i, s];
}, [Bn, Vn] = createSignal([]), $i = (e) => Bn().indexOf(e) === Bn().length - 1, Wi = (e) => {
  const t = mergeProps$1({ element: null, enabled: true, hideScrollbar: true, preventScrollbarShift: true, preventScrollbarShiftMode: "padding", restoreScrollPosition: true, allowPinchZoom: false }, e), n = createUniqueId();
  let o = [0, 0], r = null, i = null;
  createEffect(() => {
    Y(t.enabled) && (Vn((a) => [...a, n]), onCleanup(() => {
      Vn((a) => a.filter((u) => u !== n));
    }));
  }), createEffect(() => {
    if (!Y(t.enabled) || !Y(t.hideScrollbar)) return;
    const { body: a } = document, u = window.innerWidth - a.offsetWidth;
    if (Y(t.preventScrollbarShift)) {
      const d = { overflow: "hidden" }, f = [];
      u > 0 && (Y(t.preventScrollbarShiftMode) === "padding" ? d.paddingRight = `calc(${window.getComputedStyle(a).paddingRight} + ${u}px)` : d.marginRight = `calc(${window.getComputedStyle(a).marginRight} + ${u}px)`, f.push({ key: "--scrollbar-width", value: `${u}px` }));
      const g = window.scrollY, h = window.scrollX;
      kn({ key: "prevent-scroll", element: a, style: d, properties: f, cleanup: () => {
        Y(t.restoreScrollPosition) && u > 0 && window.scrollTo(h, g);
      } });
    } else kn({ key: "prevent-scroll", element: a, style: { overflow: "hidden" } });
  }), createEffect(() => {
    !$i(n) || !Y(t.enabled) || (document.addEventListener("wheel", l, { passive: false }), document.addEventListener("touchstart", s, { passive: false }), document.addEventListener("touchmove", c, { passive: false }), onCleanup(() => {
      document.removeEventListener("wheel", l), document.removeEventListener("touchstart", s), document.removeEventListener("touchmove", c);
    }));
  });
  const s = (a) => {
    o = Nn(a), r = null, i = null;
  }, l = (a) => {
    const u = a.target, d = Y(t.element), f = Ui(a), g = Math.abs(f[0]) > Math.abs(f[1]) ? "x" : "y", h = g === "x" ? f[0] : f[1], m = _n(u, g, h, d);
    let y;
    d && Ut(d, u) ? y = !m : y = true, y && a.cancelable && a.preventDefault();
  }, c = (a) => {
    const u = Y(t.element), d = a.target;
    let f;
    if (a.touches.length === 2) f = !Y(t.allowPinchZoom);
    else {
      if (r == null || i === null) {
        const g = Nn(a).map((m, y) => o[y] - m), h = Math.abs(g[0]) > Math.abs(g[1]) ? "x" : "y";
        r = h, i = h === "x" ? g[0] : g[1];
      }
      if (d.type === "range") f = false;
      else {
        const g = _n(d, r, i, u);
        u && Ut(u, d) ? f = !g : f = true;
      }
    }
    f && a.cancelable && a.preventDefault();
  };
}, Ui = (e) => [e.deltaX, e.deltaY], Nn = (e) => e.changedTouches[0] ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0], _n = (e, t, n, o) => {
  const r = o !== null && Ut(o, e), [i, s] = _i(e, t, r ? o : void 0);
  return !(n > 0 && Math.abs(i) <= 1 || n < 0 && Math.abs(s) < 1);
}, zi = Wi, Do = zi, Hi = (e) => {
  const t = createMemo(() => {
    const s = Y(e.element);
    if (s) return getComputedStyle(s);
  }), n = () => {
    var _a, _b;
    return (_b = (_a = t()) == null ? void 0 : _a.animationName) != null ? _b : "none";
  }, [o, r] = createSignal(Y(e.show) ? "present" : "hidden");
  let i = "none";
  return createEffect((s) => {
    const l = Y(e.show);
    return untrack(() => {
      var _a;
      if (s === l) return l;
      const c = i, a = n();
      l ? r("present") : a === "none" || ((_a = t()) == null ? void 0 : _a.display) === "none" ? r("hidden") : r(s === true && c !== a ? "hiding" : "hidden");
    }), l;
  }), createEffect(() => {
    const s = Y(e.element);
    if (!s) return;
    const l = (a) => {
      a.target === s && (i = n());
    }, c = (a) => {
      const d = n().includes(a.animationName);
      a.target === s && d && o() === "hiding" && r("hidden");
    };
    s.addEventListener("animationstart", l), s.addEventListener("animationcancel", c), s.addEventListener("animationend", c), onCleanup(() => {
      s.removeEventListener("animationstart", l), s.removeEventListener("animationcancel", c), s.removeEventListener("animationend", c);
    });
  }), { present: () => o() === "present" || o() === "hiding", state: o, setState: r };
}, ji = Hi, mt = ji, qi = {};
ot(qi, { CloseButton: () => Oo, Content: () => Po, Description: () => Co, Dialog: () => St, Overlay: () => Lo, Portal: () => Ao, Root: () => Io, Title: () => Ko, Trigger: () => Fo, useDialogContext: () => Pe });
var To = createContext();
function Pe() {
  const e = useContext(To);
  if (e === void 0) throw new Error("[kobalte]: `useDialogContext` must be used within a `Dialog` component");
  return e;
}
function Oo(e) {
  const t = Pe(), [n, o] = splitProps(e, ["aria-label", "onClick"]);
  return createComponent(rt, mergeProps({ get "aria-label"() {
    return n["aria-label"] || t.translations().dismiss;
  }, onClick: (i) => {
    H(i, n.onClick), t.close();
  } }, o));
}
function Po(e) {
  let t;
  const n = Pe(), o = _({ id: n.generateId("content") }, e), [r, i] = splitProps(o, ["ref", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside"]);
  let s = false, l = false;
  const c = (f) => {
    var _a;
    (_a = r.onPointerDownOutside) == null ? void 0 : _a.call(r, f), n.modal() && f.detail.isContextMenu && f.preventDefault();
  }, a = (f) => {
    var _a;
    (_a = r.onFocusOutside) == null ? void 0 : _a.call(r, f), n.modal() && f.preventDefault();
  }, u = (f) => {
    var _a;
    (_a = r.onInteractOutside) == null ? void 0 : _a.call(r, f), !n.modal() && (f.defaultPrevented || (s = true, f.detail.originalEvent.type === "pointerdown" && (l = true)), de(n.triggerRef(), f.target) && f.preventDefault(), f.detail.originalEvent.type === "focusin" && l && f.preventDefault());
  }, d = (f) => {
    var _a;
    (_a = r.onCloseAutoFocus) == null ? void 0 : _a.call(r, f), n.modal() ? (f.preventDefault(), X(n.triggerRef())) : (f.defaultPrevented || (s || X(n.triggerRef()), f.preventDefault()), s = false, l = false);
  };
  return So({ isDisabled: () => !(n.isOpen() && n.modal()), targets: () => [] }), Do({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), wo({ trapFocus: () => n.isOpen() && n.modal(), onMountAutoFocus: r.onOpenAutoFocus, onUnmountAutoFocus: d }, () => t), createEffect(() => onCleanup(n.registerContentId(i.id))), createComponent(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent(on, mergeProps({ role: "dialog", tabIndex: -1, get disableOutsidePointerEvents() {
      return n.modal() && n.isOpen();
    }, get excludedElements() {
      return [n.triggerRef];
    }, get "aria-labelledby"() {
      return n.titleId();
    }, get "aria-describedby"() {
      return n.descriptionId();
    }, get "data-expanded"() {
      return n.isOpen() ? "" : void 0;
    }, get "data-closed"() {
      return n.isOpen() ? void 0 : "";
    }, onPointerDownOutside: c, onFocusOutside: a, onInteractOutside: u, get onDismiss() {
      return n.close;
    } }, i));
  } });
}
function Co(e) {
  const t = Pe(), n = _({ id: t.generateId("description") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerDescriptionId(o.id))), createComponent(j, mergeProps({ as: "p", get id() {
    return o.id;
  } }, r));
}
function Lo(e) {
  const t = Pe(), [n, o] = splitProps(e, ["ref", "style", "onPointerDown"]), r = (i) => {
    H(i, n.onPointerDown), i.target === i.currentTarget && i.preventDefault();
  };
  return createComponent(Show, { get when() {
    return t.overlayPresent();
  }, get children() {
    return createComponent(j, mergeProps({ as: "div", get style() {
      return tt({ "pointer-events": "auto" }, n.style);
    }, get "data-expanded"() {
      return t.isOpen() ? "" : void 0;
    }, get "data-closed"() {
      return t.isOpen() ? void 0 : "";
    }, onPointerDown: r }, o));
  } });
}
function Ao(e) {
  const t = Pe();
  return createComponent(Show, { get when() {
    return t.contentPresent() || t.overlayPresent();
  }, get children() {
    return createComponent(Portal, e);
  } });
}
var $n = { dismiss: "Dismiss" };
function Io(e) {
  const t = `dialog-${createUniqueId()}`, n = _({ id: t, modal: true, translations: $n }, e), [o, r] = createSignal(), [i, s] = createSignal(), [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(), m = rn({ open: () => n.open, defaultOpen: () => n.defaultOpen, onOpenChange: (x) => {
    var _a;
    return (_a = n.onOpenChange) == null ? void 0 : _a.call(n, x);
  } }), y = () => n.forceMount || m.isOpen(), { present: v } = mt({ show: y, element: () => {
    var _a;
    return (_a = a()) != null ? _a : null;
  } }), { present: p } = mt({ show: y, element: () => {
    var _a;
    return (_a = d()) != null ? _a : null;
  } }), w = { translations: () => {
    var _a;
    return (_a = n.translations) != null ? _a : $n;
  }, isOpen: m.isOpen, modal: () => {
    var _a;
    return (_a = n.modal) != null ? _a : true;
  }, preventScroll: () => {
    var _a;
    return (_a = n.preventScroll) != null ? _a : w.modal();
  }, contentId: o, titleId: i, descriptionId: l, triggerRef: g, overlayRef: a, setOverlayRef: u, contentRef: d, setContentRef: f, overlayPresent: v, contentPresent: p, close: m.close, toggle: m.toggle, setTriggerRef: h, generateId: $e(() => n.id), registerContentId: Q(r), registerTitleId: Q(s), registerDescriptionId: Q(c) };
  return createComponent(To.Provider, { value: w, get children() {
    return n.children;
  } });
}
function Ko(e) {
  const t = Pe(), n = _({ id: t.generateId("title") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerTitleId(o.id))), createComponent(j, mergeProps({ as: "h2", get id() {
    return o.id;
  } }, r));
}
function Fo(e) {
  const t = Pe(), [n, o] = splitProps(e, ["ref", "onClick"]);
  return createComponent(rt, mergeProps({ "aria-haspopup": "dialog", get "aria-expanded"() {
    return t.isOpen();
  }, get "aria-controls"() {
    return t.isOpen() ? t.contentId() : void 0;
  }, get "data-expanded"() {
    return t.isOpen() ? "" : void 0;
  }, get "data-closed"() {
    return t.isOpen() ? void 0 : "";
  }, onClick: (i) => {
    H(i, n.onClick), t.toggle();
  } }, o));
}
var St = Object.assign(Io, { CloseButton: Oo, Content: Po, Description: Co, Overlay: Lo, Portal: Ao, Title: Ko, Trigger: Fo });
St.Trigger;
St.Portal;
St.CloseButton;
function Mo(e) {
  var _a, _b, _c;
  let t = (_a = e.startIndex) != null ? _a : 0;
  const n = (_b = e.startLevel) != null ? _b : 0, o = [], r = (c) => {
    var _a2;
    if (c == null) return "";
    const a = (_a2 = e.getKey) != null ? _a2 : "key", u = Be(a) ? c[a] : a(c);
    return u != null ? String(u) : "";
  }, i = (c) => {
    var _a2;
    if (c == null) return "";
    const a = (_a2 = e.getTextValue) != null ? _a2 : "textValue", u = Be(a) ? c[a] : a(c);
    return u != null ? String(u) : "";
  }, s = (c) => {
    var _a2, _b2;
    if (c == null) return false;
    const a = (_a2 = e.getDisabled) != null ? _a2 : "disabled";
    return (_b2 = Be(a) ? c[a] : a(c)) != null ? _b2 : false;
  }, l = (c) => {
    var _a2;
    if (c != null) return Be(e.getSectionChildren) ? c[e.getSectionChildren] : (_a2 = e.getSectionChildren) == null ? void 0 : _a2.call(e, c);
  };
  for (const c of e.dataSource) {
    if (Be(c) || Jr(c)) {
      o.push({ type: "item", rawValue: c, key: String(c), textValue: String(c), disabled: s(c), level: n, index: t }), t++;
      continue;
    }
    if (l(c) != null) {
      o.push({ type: "section", rawValue: c, key: "", textValue: "", disabled: false, level: n, index: t }), t++;
      const a = (_c = l(c)) != null ? _c : [];
      if (a.length > 0) {
        const u = Mo({ dataSource: a, getKey: e.getKey, getTextValue: e.getTextValue, getDisabled: e.getDisabled, getSectionChildren: e.getSectionChildren, startIndex: t, startLevel: n + 1 });
        o.push(...u), t += u.length;
      }
    } else o.push({ type: "item", rawValue: c, key: r(c), textValue: i(c), disabled: s(c), level: n, index: t }), t++;
  }
  return o;
}
function Yi(e, t = []) {
  return createMemo(() => {
    const n = Mo({ dataSource: b(e.dataSource), getKey: b(e.getKey), getTextValue: b(e.getTextValue), getDisabled: b(e.getDisabled), getSectionChildren: b(e.getSectionChildren) });
    for (let o = 0; o < t.length; o++) t[o]();
    return e.factory(n);
  });
}
var Xi = /* @__PURE__ */ new Set(["Avst", "Arab", "Armi", "Syrc", "Samr", "Mand", "Thaa", "Mend", "Nkoo", "Adlm", "Rohg", "Hebr"]), Gi = /* @__PURE__ */ new Set(["ae", "ar", "arc", "bcc", "bqi", "ckb", "dv", "fa", "glk", "he", "ku", "mzn", "nqo", "pnb", "ps", "sd", "ug", "ur", "yi"]);
function Zi(e) {
  var _a;
  if (Intl.Locale) {
    const n = (_a = new Intl.Locale(e).maximize().script) != null ? _a : "";
    return Xi.has(n);
  }
  const t = e.split("-")[0];
  return Gi.has(t);
}
function Ji(e) {
  return Zi(e) ? "rtl" : "ltr";
}
function Ro() {
  let e = typeof navigator < "u" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([e]);
  } catch {
    e = "en-US";
  }
  return { locale: e, direction: Ji(e) };
}
var zt = Ro(), Xe = /* @__PURE__ */ new Set();
function Wn() {
  zt = Ro();
  for (const e of Xe) e(zt);
}
function Qi() {
  const e = { locale: "en-US", direction: "ltr" }, [t, n] = createSignal(zt), o = createMemo(() => isServer ? e : t());
  return onMount(() => {
    Xe.size === 0 && window.addEventListener("languagechange", Wn), Xe.add(n), onCleanup(() => {
      Xe.delete(n), Xe.size === 0 && window.removeEventListener("languagechange", Wn);
    });
  }), { locale: () => o().locale, direction: () => o().direction };
}
var es = createContext();
function sn() {
  const e = Qi();
  return useContext(es) || e;
}
var Bt = /* @__PURE__ */ new Map();
function ko(e) {
  const { locale: t } = sn(), n = createMemo(() => t() + (e ? Object.entries(e).sort((o, r) => o[0] < r[0] ? -1 : 1).join() : ""));
  return createMemo(() => {
    const o = n();
    let r;
    return Bt.has(o) && (r = Bt.get(o)), r || (r = new Intl.Collator(t(), e), Bt.set(o, r)), r;
  });
}
var ue = class Bo extends Set {
  constructor(t, n, o) {
    super(t);
    __publicField(this, "anchorKey");
    __publicField(this, "currentKey");
    t instanceof Bo ? (this.anchorKey = n || t.anchorKey, this.currentKey = o || t.currentKey) : (this.anchorKey = n, this.currentKey = o);
  }
};
function ts(e) {
  const [t, n] = Eo(e);
  return [() => {
    var _a;
    return (_a = t()) != null ? _a : new ue();
  }, n];
}
function Vo(e) {
  return e.ctrlKey;
}
function Ve(e) {
  return e.ctrlKey;
}
function Un(e) {
  return new ue(e);
}
function No(e, t) {
  if (e.size !== t.size) return false;
  for (const n of e) if (!t.has(n)) return false;
  return true;
}
function ns(e) {
  const t = _({ selectionMode: "none", selectionBehavior: "toggle" }, e), [n, o] = createSignal(false), [r, i] = createSignal(), s = createMemo(() => {
    const m = b(t.selectedKeys);
    return m != null ? Un(m) : m;
  }), l = createMemo(() => {
    const m = b(t.defaultSelectedKeys);
    return m != null ? Un(m) : new ue();
  }), [c, a] = ts({ value: s, defaultValue: l, onChange: (m) => {
    var _a;
    return (_a = t.onSelectionChange) == null ? void 0 : _a.call(t, m);
  } }), [u, d] = createSignal(b(t.selectionBehavior)), f = () => b(t.selectionMode), g = () => {
    var _a;
    return (_a = b(t.disallowEmptySelection)) != null ? _a : false;
  }, h = (m) => {
    (b(t.allowDuplicateSelectionEvents) || !No(m, c())) && a(m);
  };
  return createEffect(() => {
    const m = c();
    b(t.selectionBehavior) === "replace" && u() === "toggle" && typeof m == "object" && m.size === 0 && d("replace");
  }), createEffect(() => {
    var _a;
    d((_a = b(t.selectionBehavior)) != null ? _a : "toggle");
  }), { selectionMode: f, disallowEmptySelection: g, selectionBehavior: u, setSelectionBehavior: d, isFocused: n, setFocused: o, focusedKey: r, setFocusedKey: i, selectedKeys: c, setSelectedKeys: h };
}
function _o(e) {
  const [t, n] = createSignal(""), [o, r] = createSignal(-1);
  return { typeSelectHandlers: { onKeyDown: (s) => {
    var _a, _b, _c;
    if (b(e.isDisabled)) return;
    const l = b(e.keyboardDelegate), c = b(e.selectionManager);
    if (!l.getKeyForSearch) return;
    const a = os(s.key);
    if (!a || s.ctrlKey || s.metaKey) return;
    a === " " && t().trim().length > 0 && (s.preventDefault(), s.stopPropagation());
    let u = n((f) => f + a), d = (_a = l.getKeyForSearch(u, c.focusedKey())) != null ? _a : l.getKeyForSearch(u);
    d == null && rs(u) && (u = u[0], d = (_b = l.getKeyForSearch(u, c.focusedKey())) != null ? _b : l.getKeyForSearch(u)), d != null && (c.setFocusedKey(d), (_c = e.onTypeSelect) == null ? void 0 : _c.call(e, d)), clearTimeout(o()), r(window.setTimeout(() => n(""), 500));
  } } };
}
function os(e) {
  return e.length === 1 || !/^[A-Z]/i.test(e) ? e : "";
}
function rs(e) {
  return e.split("").every((t) => t === e[0]);
}
function is(e, t, n) {
  const r = mergeProps$1({ selectOnFocus: () => b(e.selectionManager).selectionBehavior() === "replace" }, e), i = () => {
    var _a;
    return (_a = n == null ? void 0 : n()) != null ? _a : t();
  }, { direction: s } = sn();
  let l = { top: 0, left: 0 };
  Yr(() => b(r.isVirtualized) ? void 0 : i(), "scroll", () => {
    const y = i();
    y && (l = { top: y.scrollTop, left: y.scrollLeft });
  });
  const { typeSelectHandlers: c } = _o({ isDisabled: () => b(r.disallowTypeAhead), keyboardDelegate: () => b(r.keyboardDelegate), selectionManager: () => b(r.selectionManager) }), a = () => {
    var _a;
    return (_a = b(r.orientation)) != null ? _a : "vertical";
  }, u = (y) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    H(y, c.onKeyDown), y.altKey && y.key === "Tab" && y.preventDefault();
    const v = t();
    if (!(v == null ? void 0 : v.contains(y.target))) return;
    const p = b(r.selectionManager), w = b(r.selectOnFocus), x = (D) => {
      D != null && (p.setFocusedKey(D), y.shiftKey && p.selectionMode() === "multiple" ? p.extendSelection(D) : w && !Vo(y) && p.replaceSelection(D));
    }, S = b(r.keyboardDelegate), L = b(r.shouldFocusWrap), T = p.focusedKey();
    switch (y.key) {
      case (a() === "vertical" ? "ArrowDown" : "ArrowRight"): {
        if (S.getKeyBelow) {
          y.preventDefault();
          let D;
          T != null ? D = S.getKeyBelow(T) : D = (_a = S.getFirstKey) == null ? void 0 : _a.call(S), D == null && L && (D = (_b = S.getFirstKey) == null ? void 0 : _b.call(S, T)), x(D);
        }
        break;
      }
      case (a() === "vertical" ? "ArrowUp" : "ArrowLeft"): {
        if (S.getKeyAbove) {
          y.preventDefault();
          let D;
          T != null ? D = S.getKeyAbove(T) : D = (_c = S.getLastKey) == null ? void 0 : _c.call(S), D == null && L && (D = (_d = S.getLastKey) == null ? void 0 : _d.call(S, T)), x(D);
        }
        break;
      }
      case (a() === "vertical" ? "ArrowLeft" : "ArrowUp"): {
        if (S.getKeyLeftOf) {
          y.preventDefault();
          const D = s() === "rtl";
          let M;
          T != null ? M = S.getKeyLeftOf(T) : M = D ? (_e2 = S.getFirstKey) == null ? void 0 : _e2.call(S) : (_f = S.getLastKey) == null ? void 0 : _f.call(S), x(M);
        }
        break;
      }
      case (a() === "vertical" ? "ArrowRight" : "ArrowDown"): {
        if (S.getKeyRightOf) {
          y.preventDefault();
          const D = s() === "rtl";
          let M;
          T != null ? M = S.getKeyRightOf(T) : M = D ? (_g = S.getLastKey) == null ? void 0 : _g.call(S) : (_h = S.getFirstKey) == null ? void 0 : _h.call(S), x(M);
        }
        break;
      }
      case "Home":
        if (S.getFirstKey) {
          y.preventDefault();
          const D = S.getFirstKey(T, Ve(y));
          D != null && (p.setFocusedKey(D), Ve(y) && y.shiftKey && p.selectionMode() === "multiple" ? p.extendSelection(D) : w && p.replaceSelection(D));
        }
        break;
      case "End":
        if (S.getLastKey) {
          y.preventDefault();
          const D = S.getLastKey(T, Ve(y));
          D != null && (p.setFocusedKey(D), Ve(y) && y.shiftKey && p.selectionMode() === "multiple" ? p.extendSelection(D) : w && p.replaceSelection(D));
        }
        break;
      case "PageDown":
        if (S.getKeyPageBelow && T != null) {
          y.preventDefault();
          const D = S.getKeyPageBelow(T);
          x(D);
        }
        break;
      case "PageUp":
        if (S.getKeyPageAbove && T != null) {
          y.preventDefault();
          const D = S.getKeyPageAbove(T);
          x(D);
        }
        break;
      case "a":
        Ve(y) && p.selectionMode() === "multiple" && b(r.disallowSelectAll) !== true && (y.preventDefault(), p.selectAll());
        break;
      case "Escape":
        y.defaultPrevented || (y.preventDefault(), b(r.disallowEmptySelection) || p.clearSelection());
        break;
      case "Tab":
        if (!b(r.allowsTabNavigation)) {
          if (y.shiftKey) v.focus();
          else {
            const D = hi(v, { tabbable: true });
            let M, $;
            do
              $ = D.lastChild(), $ && (M = $);
            while ($);
            M && !M.contains(document.activeElement) && X(M);
          }
          break;
        }
    }
  }, d = (y) => {
    var _a, _b, _c, _d;
    const v = b(r.selectionManager), p = b(r.keyboardDelegate), w = b(r.selectOnFocus);
    if (v.isFocused()) {
      y.currentTarget.contains(y.target) || v.setFocused(false);
      return;
    }
    if (y.currentTarget.contains(y.target)) {
      if (v.setFocused(true), v.focusedKey() == null) {
        const x = (L) => {
          L != null && (v.setFocusedKey(L), w && v.replaceSelection(L));
        }, S = y.relatedTarget;
        S && y.currentTarget.compareDocumentPosition(S) & Node.DOCUMENT_POSITION_FOLLOWING ? x((_b = v.lastSelectedKey()) != null ? _b : (_a = p.getLastKey) == null ? void 0 : _a.call(p)) : x((_d = v.firstSelectedKey()) != null ? _d : (_c = p.getFirstKey) == null ? void 0 : _c.call(p));
      } else if (!b(r.isVirtualized)) {
        const x = i();
        if (x) {
          x.scrollTop = l.top, x.scrollLeft = l.left;
          const S = x.querySelector(`[data-key="${v.focusedKey()}"]`);
          S && (X(S), Ln(x, S));
        }
      }
    }
  }, f = (y) => {
    const v = b(r.selectionManager);
    y.currentTarget.contains(y.relatedTarget) || v.setFocused(false);
  }, g = (y) => {
    i() === y.target && y.preventDefault();
  }, h = () => {
    var _a, _b;
    const y = b(r.autoFocus);
    if (!y) return;
    const v = b(r.selectionManager), p = b(r.keyboardDelegate);
    let w;
    y === "first" && (w = (_a = p.getFirstKey) == null ? void 0 : _a.call(p)), y === "last" && (w = (_b = p.getLastKey) == null ? void 0 : _b.call(p));
    const x = v.selectedKeys();
    x.size && (w = x.values().next().value), v.setFocused(true), v.setFocusedKey(w);
    const S = t();
    S && w == null && !b(r.shouldUseVirtualFocus) && X(S);
  };
  return onMount(() => {
    r.deferAutoFocus ? setTimeout(h, 0) : h();
  }), createEffect(on$1([i, () => b(r.isVirtualized), () => b(r.selectionManager).focusedKey()], (y) => {
    var _a;
    const [v, p, w] = y;
    if (p) w && ((_a = r.scrollToKey) == null ? void 0 : _a.call(r, w));
    else if (w && v) {
      const x = v.querySelector(`[data-key="${w}"]`);
      x && Ln(v, x);
    }
  })), { tabIndex: createMemo(() => {
    if (!b(r.shouldUseVirtualFocus)) return b(r.selectionManager).focusedKey() == null ? 0 : -1;
  }), onKeyDown: u, onMouseDown: g, onFocusIn: d, onFocusOut: f };
}
function ss(e, t) {
  const n = () => b(e.selectionManager), o = () => b(e.key), r = () => b(e.shouldUseVirtualFocus), i = (p) => {
    n().selectionMode() !== "none" && (n().selectionMode() === "single" ? n().isSelected(o()) && !n().disallowEmptySelection() ? n().toggleSelection(o()) : n().replaceSelection(o()) : (p == null ? void 0 : p.shiftKey) ? n().extendSelection(o()) : n().selectionBehavior() === "toggle" || Ve(p) || "pointerType" in p && p.pointerType === "touch" ? n().toggleSelection(o()) : n().replaceSelection(o()));
  }, s = () => n().isSelected(o()), l = () => b(e.disabled) || n().isDisabled(o()), c = () => !l() && n().canSelectItem(o());
  let a = null;
  const u = (p) => {
    c() && (a = p.pointerType, p.pointerType === "mouse" && p.button === 0 && !b(e.shouldSelectOnPressUp) && i(p));
  }, d = (p) => {
    c() && p.pointerType === "mouse" && p.button === 0 && b(e.shouldSelectOnPressUp) && b(e.allowsDifferentPressOrigin) && i(p);
  }, f = (p) => {
    c() && (b(e.shouldSelectOnPressUp) && !b(e.allowsDifferentPressOrigin) || a !== "mouse") && i(p);
  }, g = (p) => {
    !c() || !["Enter", " "].includes(p.key) || (Vo(p) ? n().toggleSelection(o()) : i(p));
  }, h = (p) => {
    l() && p.preventDefault();
  }, m = (p) => {
    const w = t();
    r() || l() || !w || p.target === w && n().setFocusedKey(o());
  }, y = createMemo(() => {
    if (!(r() || l())) return o() === n().focusedKey() ? 0 : -1;
  }), v = createMemo(() => b(e.virtualized) ? void 0 : o());
  return createEffect(on$1([t, o, r, () => n().focusedKey(), () => n().isFocused()], ([p, w, x, S, L]) => {
    p && w === S && L && !x && document.activeElement !== p && (e.focus ? e.focus() : X(p));
  })), { isSelected: s, isDisabled: l, allowsSelection: c, tabIndex: y, dataKey: v, onPointerDown: u, onPointerUp: d, onClick: f, onKeyDown: g, onMouseDown: h, onFocus: m };
}
var ls = class {
  constructor(e, t) {
    __publicField(this, "collection");
    __publicField(this, "state");
    this.collection = e, this.state = t;
  }
  selectionMode() {
    return this.state.selectionMode();
  }
  disallowEmptySelection() {
    return this.state.disallowEmptySelection();
  }
  selectionBehavior() {
    return this.state.selectionBehavior();
  }
  setSelectionBehavior(e) {
    this.state.setSelectionBehavior(e);
  }
  isFocused() {
    return this.state.isFocused();
  }
  setFocused(e) {
    this.state.setFocused(e);
  }
  focusedKey() {
    return this.state.focusedKey();
  }
  setFocusedKey(e) {
    (e == null || this.collection().getItem(e)) && this.state.setFocusedKey(e);
  }
  selectedKeys() {
    return this.state.selectedKeys();
  }
  isSelected(e) {
    if (this.state.selectionMode() === "none") return false;
    const t = this.getKey(e);
    return t == null ? false : this.state.selectedKeys().has(t);
  }
  isEmpty() {
    return this.state.selectedKeys().size === 0;
  }
  isSelectAll() {
    if (this.isEmpty()) return false;
    const e = this.state.selectedKeys();
    return this.getAllSelectableKeys().every((t) => e.has(t));
  }
  firstSelectedKey() {
    let e;
    for (const t of this.state.selectedKeys()) {
      const n = this.collection().getItem(t), o = (n == null ? void 0 : n.index) != null && (e == null ? void 0 : e.index) != null && n.index < e.index;
      (!e || o) && (e = n);
    }
    return e == null ? void 0 : e.key;
  }
  lastSelectedKey() {
    let e;
    for (const t of this.state.selectedKeys()) {
      const n = this.collection().getItem(t), o = (n == null ? void 0 : n.index) != null && (e == null ? void 0 : e.index) != null && n.index > e.index;
      (!e || o) && (e = n);
    }
    return e == null ? void 0 : e.key;
  }
  extendSelection(e) {
    if (this.selectionMode() === "none") return;
    if (this.selectionMode() === "single") {
      this.replaceSelection(e);
      return;
    }
    const t = this.getKey(e);
    if (t == null) return;
    const n = this.state.selectedKeys(), o = n.anchorKey || t, r = new ue(n, o, t);
    for (const i of this.getKeyRange(o, n.currentKey || t)) r.delete(i);
    for (const i of this.getKeyRange(t, o)) this.canSelectItem(i) && r.add(i);
    this.state.setSelectedKeys(r);
  }
  getKeyRange(e, t) {
    const n = this.collection().getItem(e), o = this.collection().getItem(t);
    return n && o ? n.index != null && o.index != null && n.index <= o.index ? this.getKeyRangeInternal(e, t) : this.getKeyRangeInternal(t, e) : [];
  }
  getKeyRangeInternal(e, t) {
    const n = [];
    let o = e;
    for (; o != null; ) {
      const r = this.collection().getItem(o);
      if (r && r.type === "item" && n.push(o), o === t) return n;
      o = this.collection().getKeyAfter(o);
    }
    return [];
  }
  getKey(e) {
    const t = this.collection().getItem(e);
    return t ? !t || t.type !== "item" ? null : t.key : e;
  }
  toggleSelection(e) {
    if (this.selectionMode() === "none") return;
    if (this.selectionMode() === "single" && !this.isSelected(e)) {
      this.replaceSelection(e);
      return;
    }
    const t = this.getKey(e);
    if (t == null) return;
    const n = new ue(this.state.selectedKeys());
    n.has(t) ? n.delete(t) : this.canSelectItem(t) && (n.add(t), n.anchorKey = t, n.currentKey = t), !(this.disallowEmptySelection() && n.size === 0) && this.state.setSelectedKeys(n);
  }
  replaceSelection(e) {
    if (this.selectionMode() === "none") return;
    const t = this.getKey(e);
    if (t == null) return;
    const n = this.canSelectItem(t) ? new ue([t], t, t) : new ue();
    this.state.setSelectedKeys(n);
  }
  setSelectedKeys(e) {
    if (this.selectionMode() === "none") return;
    const t = new ue();
    for (const n of e) {
      const o = this.getKey(n);
      if (o != null && (t.add(o), this.selectionMode() === "single")) break;
    }
    this.state.setSelectedKeys(t);
  }
  selectAll() {
    this.selectionMode() === "multiple" && this.state.setSelectedKeys(new Set(this.getAllSelectableKeys()));
  }
  clearSelection() {
    const e = this.state.selectedKeys();
    !this.disallowEmptySelection() && e.size > 0 && this.state.setSelectedKeys(new ue());
  }
  toggleSelectAll() {
    this.isSelectAll() ? this.clearSelection() : this.selectAll();
  }
  select(e, t) {
    this.selectionMode() !== "none" && (this.selectionMode() === "single" ? this.isSelected(e) && !this.disallowEmptySelection() ? this.toggleSelection(e) : this.replaceSelection(e) : this.selectionBehavior() === "toggle" || t && t.pointerType === "touch" ? this.toggleSelection(e) : this.replaceSelection(e));
  }
  isSelectionEqual(e) {
    if (e === this.state.selectedKeys()) return true;
    const t = this.selectedKeys();
    if (e.size !== t.size) return false;
    for (const n of e) if (!t.has(n)) return false;
    for (const n of t) if (!e.has(n)) return false;
    return true;
  }
  canSelectItem(e) {
    if (this.state.selectionMode() === "none") return false;
    const t = this.collection().getItem(e);
    return t != null && !t.disabled;
  }
  isDisabled(e) {
    const t = this.collection().getItem(e);
    return !t || t.disabled;
  }
  getAllSelectableKeys() {
    const e = [];
    return ((n) => {
      for (; n != null; ) {
        if (this.canSelectItem(n)) {
          const o = this.collection().getItem(n);
          if (!o) continue;
          o.type === "item" && e.push(n);
        }
        n = this.collection().getKeyAfter(n);
      }
    })(this.collection().getFirstKey()), e;
  }
}, zn = class {
  constructor(e) {
    __publicField(this, "keyMap", /* @__PURE__ */ new Map());
    __publicField(this, "iterable");
    __publicField(this, "firstKey");
    __publicField(this, "lastKey");
    this.iterable = e;
    for (const o of e) this.keyMap.set(o.key, o);
    if (this.keyMap.size === 0) return;
    let t, n = 0;
    for (const [o, r] of this.keyMap) t ? (t.nextKey = o, r.prevKey = t.key) : (this.firstKey = o, r.prevKey = void 0), r.type === "item" && (r.index = n++), t = r, t.nextKey = void 0;
    this.lastKey = t.key;
  }
  *[Symbol.iterator]() {
    yield* this.iterable;
  }
  getSize() {
    return this.keyMap.size;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  getKeyBefore(e) {
    var _a;
    return (_a = this.keyMap.get(e)) == null ? void 0 : _a.prevKey;
  }
  getKeyAfter(e) {
    var _a;
    return (_a = this.keyMap.get(e)) == null ? void 0 : _a.nextKey;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    return this.lastKey;
  }
  getItem(e) {
    return this.keyMap.get(e);
  }
  at(e) {
    const t = [...this.getKeys()];
    return this.getItem(t[e]);
  }
};
function $o(e) {
  const t = ns(e), o = Yi({ dataSource: () => b(e.dataSource), getKey: () => b(e.getKey), getTextValue: () => b(e.getTextValue), getDisabled: () => b(e.getDisabled), getSectionChildren: () => b(e.getSectionChildren), factory: (i) => e.filter ? new zn(e.filter(i)) : new zn(i) }, [() => e.filter]), r = new ls(o, t);
  return createComputed(() => {
    const i = t.focusedKey();
    i != null && !o().getItem(i) && t.setFocusedKey(void 0);
  }), { collection: o, selectionManager: () => r };
}
const cs = ["top", "right", "bottom", "left"], Ee = Math.min, J = Math.max, yt = Math.round, ft = Math.floor, fe = (e) => ({ x: e, y: e }), as = { left: "right", right: "left", bottom: "top", top: "bottom" }, us = { start: "end", end: "start" };
function Ht(e, t, n) {
  return J(e, Ee(t, n));
}
function Ke(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function De(e) {
  return e.split("-")[0];
}
function We(e) {
  return e.split("-")[1];
}
function Wo(e) {
  return e === "x" ? "y" : "x";
}
function ln(e) {
  return e === "y" ? "height" : "width";
}
const ds = /* @__PURE__ */ new Set(["top", "bottom"]);
function ve(e) {
  return ds.has(De(e)) ? "y" : "x";
}
function cn(e) {
  return Wo(ve(e));
}
function fs(e, t, n) {
  n === void 0 && (n = false);
  const o = We(e), r = cn(e), i = ln(r);
  let s = r === "x" ? o === (n ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return t.reference[i] > t.floating[i] && (s = vt(s)), [s, vt(s)];
}
function gs(e) {
  const t = vt(e);
  return [jt(e), t, jt(t)];
}
function jt(e) {
  return e.replace(/start|end/g, (t) => us[t]);
}
const Hn = ["left", "right"], jn = ["right", "left"], hs = ["top", "bottom"], ps = ["bottom", "top"];
function ms(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? jn : Hn : t ? Hn : jn;
    case "left":
    case "right":
      return t ? hs : ps;
    default:
      return [];
  }
}
function ys(e, t, n, o) {
  const r = We(e);
  let i = ms(De(e), n === "start", o);
  return r && (i = i.map((s) => s + "-" + r), t && (i = i.concat(i.map(jt)))), i;
}
function vt(e) {
  return e.replace(/left|right|bottom|top/g, (t) => as[t]);
}
function vs(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function Uo(e) {
  return typeof e != "number" ? vs(e) : { top: e, right: e, bottom: e, left: e };
}
function bt(e) {
  const { x: t, y: n, width: o, height: r } = e;
  return { width: o, height: r, top: n, left: t, right: t + o, bottom: n + r, x: t, y: n };
}
function qn(e, t, n) {
  let { reference: o, floating: r } = e;
  const i = ve(t), s = cn(t), l = ln(s), c = De(t), a = i === "y", u = o.x + o.width / 2 - r.width / 2, d = o.y + o.height / 2 - r.height / 2, f = o[l] / 2 - r[l] / 2;
  let g;
  switch (c) {
    case "top":
      g = { x: u, y: o.y - r.height };
      break;
    case "bottom":
      g = { x: u, y: o.y + o.height };
      break;
    case "right":
      g = { x: o.x + o.width, y: d };
      break;
    case "left":
      g = { x: o.x - r.width, y: d };
      break;
    default:
      g = { x: o.x, y: o.y };
  }
  switch (We(t)) {
    case "start":
      g[s] -= f * (n && a ? -1 : 1);
      break;
    case "end":
      g[s] += f * (n && a ? -1 : 1);
      break;
  }
  return g;
}
const bs = async (e, t, n) => {
  const { placement: o = "bottom", strategy: r = "absolute", middleware: i = [], platform: s } = n, l = i.filter(Boolean), c = await (s.isRTL == null ? void 0 : s.isRTL(t));
  let a = await s.getElementRects({ reference: e, floating: t, strategy: r }), { x: u, y: d } = qn(a, o, c), f = o, g = {}, h = 0;
  for (let m = 0; m < l.length; m++) {
    const { name: y, fn: v } = l[m], { x: p, y: w, data: x, reset: S } = await v({ x: u, y: d, initialPlacement: o, placement: f, strategy: r, middlewareData: g, rects: a, platform: s, elements: { reference: e, floating: t } });
    u = p != null ? p : u, d = w != null ? w : d, g = { ...g, [y]: { ...g[y], ...x } }, S && h <= 50 && (h++, typeof S == "object" && (S.placement && (f = S.placement), S.rects && (a = S.rects === true ? await s.getElementRects({ reference: e, floating: t, strategy: r }) : S.rects), { x: u, y: d } = qn(a, f, c)), m = -1);
  }
  return { x: u, y: d, placement: f, strategy: r, middlewareData: g };
};
async function Qe(e, t) {
  var n;
  t === void 0 && (t = {});
  const { x: o, y: r, platform: i, rects: s, elements: l, strategy: c } = e, { boundary: a = "clippingAncestors", rootBoundary: u = "viewport", elementContext: d = "floating", altBoundary: f = false, padding: g = 0 } = Ke(t, e), h = Uo(g), y = l[f ? d === "floating" ? "reference" : "floating" : d], v = bt(await i.getClippingRect({ element: (n = await (i.isElement == null ? void 0 : i.isElement(y))) == null || n ? y : y.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(l.floating)), boundary: a, rootBoundary: u, strategy: c })), p = d === "floating" ? { x: o, y: r, width: s.floating.width, height: s.floating.height } : s.reference, w = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(l.floating)), x = await (i.isElement == null ? void 0 : i.isElement(w)) ? await (i.getScale == null ? void 0 : i.getScale(w)) || { x: 1, y: 1 } : { x: 1, y: 1 }, S = bt(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({ elements: l, rect: p, offsetParent: w, strategy: c }) : p);
  return { top: (v.top - S.top + h.top) / x.y, bottom: (S.bottom - v.bottom + h.bottom) / x.y, left: (v.left - S.left + h.left) / x.x, right: (S.right - v.right + h.right) / x.x };
}
const ws = (e) => ({ name: "arrow", options: e, async fn(t) {
  const { x: n, y: o, placement: r, rects: i, platform: s, elements: l, middlewareData: c } = t, { element: a, padding: u = 0 } = Ke(e, t) || {};
  if (a == null) return {};
  const d = Uo(u), f = { x: n, y: o }, g = cn(r), h = ln(g), m = await s.getDimensions(a), y = g === "y", v = y ? "top" : "left", p = y ? "bottom" : "right", w = y ? "clientHeight" : "clientWidth", x = i.reference[h] + i.reference[g] - f[g] - i.floating[h], S = f[g] - i.reference[g], L = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(a));
  let T = L ? L[w] : 0;
  (!T || !await (s.isElement == null ? void 0 : s.isElement(L))) && (T = l.floating[w] || i.floating[h]);
  const D = x / 2 - S / 2, M = T / 2 - m[h] / 2 - 1, $ = Ee(d[v], M), U = Ee(d[p], M), V = $, Z = T - m[h] - U, A = T / 2 - m[h] / 2 + D, O = Ht(V, A, Z), C = !c.arrow && We(r) != null && A !== O && i.reference[h] / 2 - (A < V ? $ : U) - m[h] / 2 < 0, B = C ? A < V ? A - V : A - Z : 0;
  return { [g]: f[g] + B, data: { [g]: O, centerOffset: A - O - B, ...C && { alignmentOffset: B } }, reset: C };
} }), Ss = function(e) {
  return e === void 0 && (e = {}), { name: "flip", options: e, async fn(t) {
    var n, o;
    const { placement: r, middlewareData: i, rects: s, initialPlacement: l, platform: c, elements: a } = t, { mainAxis: u = true, crossAxis: d = true, fallbackPlacements: f, fallbackStrategy: g = "bestFit", fallbackAxisSideDirection: h = "none", flipAlignment: m = true, ...y } = Ke(e, t);
    if ((n = i.arrow) != null && n.alignmentOffset) return {};
    const v = De(r), p = ve(l), w = De(l) === l, x = await (c.isRTL == null ? void 0 : c.isRTL(a.floating)), S = f || (w || !m ? [vt(l)] : gs(l)), L = h !== "none";
    !f && L && S.push(...ys(l, m, h, x));
    const T = [l, ...S], D = await Qe(t, y), M = [];
    let $ = ((o = i.flip) == null ? void 0 : o.overflows) || [];
    if (u && M.push(D[v]), d) {
      const A = fs(r, s, x);
      M.push(D[A[0]], D[A[1]]);
    }
    if ($ = [...$, { placement: r, overflows: M }], !M.every((A) => A <= 0)) {
      var U, V;
      const A = (((U = i.flip) == null ? void 0 : U.index) || 0) + 1, O = T[A];
      if (O && (!(d === "alignment" ? p !== ve(O) : false) || $.every((W) => ve(W.placement) === p ? W.overflows[0] > 0 : true))) return { data: { index: A, overflows: $ }, reset: { placement: O } };
      let C = (V = $.filter((B) => B.overflows[0] <= 0).sort((B, W) => B.overflows[1] - W.overflows[1])[0]) == null ? void 0 : V.placement;
      if (!C) switch (g) {
        case "bestFit": {
          var Z;
          const B = (Z = $.filter((W) => {
            if (L) {
              const G = ve(W.placement);
              return G === p || G === "y";
            }
            return true;
          }).map((W) => [W.placement, W.overflows.filter((G) => G > 0).reduce((G, oe) => G + oe, 0)]).sort((W, G) => W[1] - G[1])[0]) == null ? void 0 : Z[0];
          B && (C = B);
          break;
        }
        case "initialPlacement":
          C = l;
          break;
      }
      if (r !== C) return { reset: { placement: C } };
    }
    return {};
  } };
};
function Yn(e, t) {
  return { top: e.top - t.height, right: e.right - t.width, bottom: e.bottom - t.height, left: e.left - t.width };
}
function Xn(e) {
  return cs.some((t) => e[t] >= 0);
}
const xs = function(e) {
  return e === void 0 && (e = {}), { name: "hide", options: e, async fn(t) {
    const { rects: n } = t, { strategy: o = "referenceHidden", ...r } = Ke(e, t);
    switch (o) {
      case "referenceHidden": {
        const i = await Qe(t, { ...r, elementContext: "reference" }), s = Yn(i, n.reference);
        return { data: { referenceHiddenOffsets: s, referenceHidden: Xn(s) } };
      }
      case "escaped": {
        const i = await Qe(t, { ...r, altBoundary: true }), s = Yn(i, n.floating);
        return { data: { escapedOffsets: s, escaped: Xn(s) } };
      }
      default:
        return {};
    }
  } };
}, Es = /* @__PURE__ */ new Set(["left", "top"]);
async function Ds(e, t) {
  const { placement: n, platform: o, elements: r } = e, i = await (o.isRTL == null ? void 0 : o.isRTL(r.floating)), s = De(n), l = We(n), c = ve(n) === "y", a = Es.has(s) ? -1 : 1, u = i && c ? -1 : 1, d = Ke(t, e);
  let { mainAxis: f, crossAxis: g, alignmentAxis: h } = typeof d == "number" ? { mainAxis: d, crossAxis: 0, alignmentAxis: null } : { mainAxis: d.mainAxis || 0, crossAxis: d.crossAxis || 0, alignmentAxis: d.alignmentAxis };
  return l && typeof h == "number" && (g = l === "end" ? h * -1 : h), c ? { x: g * u, y: f * a } : { x: f * a, y: g * u };
}
const Ts = function(e) {
  return e === void 0 && (e = 0), { name: "offset", options: e, async fn(t) {
    var n, o;
    const { x: r, y: i, placement: s, middlewareData: l } = t, c = await Ds(t, e);
    return s === ((n = l.offset) == null ? void 0 : n.placement) && (o = l.arrow) != null && o.alignmentOffset ? {} : { x: r + c.x, y: i + c.y, data: { ...c, placement: s } };
  } };
}, Os = function(e) {
  return e === void 0 && (e = {}), { name: "shift", options: e, async fn(t) {
    const { x: n, y: o, placement: r } = t, { mainAxis: i = true, crossAxis: s = false, limiter: l = { fn: (y) => {
      let { x: v, y: p } = y;
      return { x: v, y: p };
    } }, ...c } = Ke(e, t), a = { x: n, y: o }, u = await Qe(t, c), d = ve(De(r)), f = Wo(d);
    let g = a[f], h = a[d];
    if (i) {
      const y = f === "y" ? "top" : "left", v = f === "y" ? "bottom" : "right", p = g + u[y], w = g - u[v];
      g = Ht(p, g, w);
    }
    if (s) {
      const y = d === "y" ? "top" : "left", v = d === "y" ? "bottom" : "right", p = h + u[y], w = h - u[v];
      h = Ht(p, h, w);
    }
    const m = l.fn({ ...t, [f]: g, [d]: h });
    return { ...m, data: { x: m.x - n, y: m.y - o, enabled: { [f]: i, [d]: s } } };
  } };
}, Ps = function(e) {
  return e === void 0 && (e = {}), { name: "size", options: e, async fn(t) {
    var n, o;
    const { placement: r, rects: i, platform: s, elements: l } = t, { apply: c = () => {
    }, ...a } = Ke(e, t), u = await Qe(t, a), d = De(r), f = We(r), g = ve(r) === "y", { width: h, height: m } = i.floating;
    let y, v;
    d === "top" || d === "bottom" ? (y = d, v = f === (await (s.isRTL == null ? void 0 : s.isRTL(l.floating)) ? "start" : "end") ? "left" : "right") : (v = d, y = f === "end" ? "top" : "bottom");
    const p = m - u.top - u.bottom, w = h - u.left - u.right, x = Ee(m - u[y], p), S = Ee(h - u[v], w), L = !t.middlewareData.shift;
    let T = x, D = S;
    if ((n = t.middlewareData.shift) != null && n.enabled.x && (D = w), (o = t.middlewareData.shift) != null && o.enabled.y && (T = p), L && !f) {
      const $ = J(u.left, 0), U = J(u.right, 0), V = J(u.top, 0), Z = J(u.bottom, 0);
      g ? D = h - 2 * ($ !== 0 || U !== 0 ? $ + U : J(u.left, u.right)) : T = m - 2 * (V !== 0 || Z !== 0 ? V + Z : J(u.top, u.bottom));
    }
    await c({ ...t, availableWidth: D, availableHeight: T });
    const M = await s.getDimensions(l.floating);
    return h !== M.width || m !== M.height ? { reset: { rects: true } } : {};
  } };
};
function Ue(e) {
  return "#document";
}
function ee(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function he(e) {
  var t;
  return (t = (e.document) || window.document) == null ? void 0 : t.documentElement;
}
function ce(e) {
  return false;
}
function ge(e) {
  return false;
}
function Gn(e) {
  return false ;
}
const Cs = /* @__PURE__ */ new Set(["inline", "contents"]);
function it(e) {
  const { overflow: t, overflowX: n, overflowY: o, display: r } = ae(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + o + n) && !Cs.has(r);
}
const Is = [":popover-open", ":modal"];
function Et(e) {
  return Is.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return false;
    }
  });
}
const Ks = ["transform", "translate", "scale", "rotate", "perspective"], Fs = ["transform", "translate", "scale", "rotate", "perspective", "filter"], Ms = ["paint", "layout", "strict", "content"];
function an(e) {
  const t = un(), n = e;
  return Ks.some((o) => n[o] ? n[o] !== "none" : false) || (n.containerType ? n.containerType !== "normal" : false) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : false) || !t && (n.filter ? n.filter !== "none" : false) || Fs.some((o) => (n.willChange || "").includes(o)) || Ms.some((o) => (n.contain || "").includes(o));
}
function un() {
  return typeof CSS > "u" || !CSS.supports ? false : CSS.supports("-webkit-backdrop-filter", "none");
}
const ks = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function _e(e) {
  return ks.has(Ue());
}
function ae(e) {
  return ee(e).getComputedStyle(e);
}
function Dt(e) {
  return { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function Te(e) {
  const t = e.assignedSlot || e.parentNode || Gn() || he(e);
  return t;
}
function Ho(e) {
  const t = Te(e);
  return _e() ? e.ownerDocument ? e.ownerDocument.body : e.body : Ho(t);
}
function et(e, t, n) {
  var o;
  t === void 0 && (t = []), n === void 0 && (n = true);
  const r = Ho(e), i = r === ((o = e.ownerDocument) == null ? void 0 : o.body), s = ee(r);
  if (i) {
    const l = qt(s);
    return t.concat(s, s.visualViewport || [], it(r) ? r : [], l && n ? et(l) : []);
  }
  return t.concat(r, et(r, [], n));
}
function qt(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function jo(e) {
  const t = ae(e);
  let n = parseFloat(t.width) || 0, o = parseFloat(t.height) || 0;
  const i = n, s = o, l = yt(n) !== i || yt(o) !== s;
  return l && (n = i, o = s), { width: n, height: o, $: l };
}
function dn(e) {
  return e.contextElement;
}
function Ne(e) {
  dn(e);
  return fe(1);
}
const Bs = fe(0);
function qo(e) {
  const t = ee(e);
  return !un() || !t.visualViewport ? Bs : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function Vs(e, t, n) {
  return t === void 0 && (t = false), !n || t && n !== ee(e) ? false : t;
}
function Ae(e, t, n, o) {
  t === void 0 && (t = false), n === void 0 && (n = false);
  const r = e.getBoundingClientRect(), i = dn(e);
  let s = fe(1);
  t && (o ? ce() : s = Ne(e));
  const l = Vs(i, n, o) ? qo(i) : fe(0);
  let c = (r.left + l.x) / s.x, a = (r.top + l.y) / s.y, u = r.width / s.x, d = r.height / s.y;
  if (i) {
    const f = ee(i), g = o && ce() ? ee(o) : o;
    let h = f, m = qt(h);
    for (; m && o && g !== h; ) {
      const y = Ne(m), v = m.getBoundingClientRect(), p = ae(m), w = v.left + (m.clientLeft + parseFloat(p.paddingLeft)) * y.x, x = v.top + (m.clientTop + parseFloat(p.paddingTop)) * y.y;
      c *= y.x, a *= y.y, u *= y.x, d *= y.y, c += w, a += x, h = ee(m), m = qt(h);
    }
  }
  return bt({ width: u, height: d, x: c, y: a });
}
function Tt(e, t) {
  const n = Dt(e).scrollLeft;
  return t ? t.left + n : Ae(he(e)).left + n;
}
function Yo(e, t) {
  const n = e.getBoundingClientRect(), o = n.left + t.scrollLeft - Tt(e, n), r = n.top + t.scrollTop;
  return { x: o, y: r };
}
function Ns(e) {
  let { elements: t, rect: n, offsetParent: o, strategy: r } = e;
  const i = r === "fixed", s = he(o), l = t ? Et(t.floating) : false;
  if (o === s || l && i) return n;
  let c = { scrollLeft: 0, scrollTop: 0 }, a = fe(1);
  const u = fe(0);
  if ((!i) && ((c = Dt(o)), ge())) ;
  const f = s && true && !i ? Yo(s, c) : fe(0);
  return { width: n.width * a.x, height: n.height * a.y, x: n.x * a.x - c.scrollLeft * a.x + u.x + f.x, y: n.y * a.y - c.scrollTop * a.y + u.y + f.y };
}
function _s(e) {
  return Array.from(e.getClientRects());
}
function $s(e) {
  const t = he(e), n = Dt(e), o = e.ownerDocument.body, r = J(t.scrollWidth, t.clientWidth, o.scrollWidth, o.clientWidth), i = J(t.scrollHeight, t.clientHeight, o.scrollHeight, o.clientHeight);
  let s = -n.scrollLeft + Tt(e);
  const l = -n.scrollTop;
  return ae(o).direction === "rtl" && (s += J(t.clientWidth, o.clientWidth) - r), { width: r, height: i, x: s, y: l };
}
const Zn = 25;
function Ws(e, t) {
  const n = ee(e), o = he(e), r = n.visualViewport;
  let i = o.clientWidth, s = o.clientHeight, l = 0, c = 0;
  if (r) {
    i = r.width, s = r.height;
    const u = un();
    (!u || u && t === "fixed") && (l = r.offsetLeft, c = r.offsetTop);
  }
  const a = Tt(o);
  if (a <= 0) {
    const u = o.ownerDocument, d = u.body, f = getComputedStyle(d), g = u.compatMode === "CSS1Compat" && parseFloat(f.marginLeft) + parseFloat(f.marginRight) || 0, h = Math.abs(o.clientWidth - d.clientWidth - g);
    h <= Zn && (i -= h);
  } else a <= Zn && (i += a);
  return { width: i, height: s, x: l, y: c };
}
const Us = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function Jn(e, t, n) {
  let o;
  if (t === "viewport") o = Ws(e, n);
  else if (t === "document") o = $s(he(e));
  else {
    const r = qo(e);
    o = { x: t.x - r.x, y: t.y - r.y, width: t.width, height: t.height };
  }
  return bt(o);
}
function Xo(e, t) {
  Te(e);
  return false ;
}
function Hs(e, t) {
  const n = t.get(e);
  if (n) return n;
  let o = et(e, [], false).filter((l) => ce()), r = null;
  const i = ae(e).position === "fixed";
  let s = i ? Te(e) : e;
  for (; ce(); ) {
    const l = ae(s), c = an(s);
    !c && l.position === "fixed" && (r = null), (i ? !c && !r : !c && l.position === "static" && !!r && Us.has(r.position) || it(s) && !c && Xo(e)) ? o = o.filter((u) => u !== s) : r = l, s = Te(s);
  }
  return t.set(e, o), o;
}
function js(e) {
  let { element: t, boundary: n, rootBoundary: o, strategy: r } = e;
  const s = [...n === "clippingAncestors" ? Et(t) ? [] : Hs(t, this._c) : [].concat(n), o], l = s[0], c = s.reduce((a, u) => {
    const d = Jn(t, u, r);
    return a.top = J(d.top, a.top), a.right = Ee(d.right, a.right), a.bottom = Ee(d.bottom, a.bottom), a.left = J(d.left, a.left), a;
  }, Jn(t, l, r));
  return { width: c.right - c.left, height: c.bottom - c.top, x: c.left, y: c.top };
}
function qs(e) {
  const { width: t, height: n } = jo(e);
  return { width: t, height: n };
}
function Ys(e, t, n) {
  const o = ge(), r = he(t), i = n === "fixed", s = Ae(e, true, i, t);
  let l = { scrollLeft: 0, scrollTop: 0 };
  const c = fe(0);
  function a() {
    c.x = Tt(r);
  }
  if (!i) if ((l = Dt(t)), o) ; else r && a();
  i && !o && r && a();
  const u = r && !o && !i ? Yo(r, l) : fe(0), d = s.left + l.scrollLeft - c.x - u.x, f = s.top + l.scrollTop - c.y - u.y;
  return { x: d, y: f, width: s.width, height: s.height };
}
function Go(e, t) {
  const n = ee(e);
  if (Et(e)) return n;
  {
    let r = Te(e);
    for (; r && !_e(); ) {
      r = Te(r);
    }
    return n;
  }
}
const Xs = async function(e) {
  const t = this.getOffsetParent || Go, n = this.getDimensions, o = await n(e.floating);
  return { reference: Ys(e.reference, await t(e.floating), e.strategy), floating: { x: 0, y: 0, width: o.width, height: o.height } };
};
function Gs(e) {
  return ae(e).direction === "rtl";
}
const Zo = { convertOffsetParentRelativeRectToViewportRelativeRect: Ns, getDocumentElement: he, getClippingRect: js, getOffsetParent: Go, getElementRects: Xs, getClientRects: _s, getDimensions: qs, getScale: Ne, isElement: ce, isRTL: Gs };
function Jo(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Zs(e, t) {
  let n = null, o;
  const r = he(e);
  function i() {
    var l;
    clearTimeout(o), (l = n) == null || l.disconnect(), n = null;
  }
  function s(l, c) {
    l === void 0 && (l = false), c === void 0 && (c = 1), i();
    const a = e.getBoundingClientRect(), { left: u, top: d, width: f, height: g } = a;
    if (l || t(), !f || !g) return;
    const h = ft(d), m = ft(r.clientWidth - (u + f)), y = ft(r.clientHeight - (d + g)), v = ft(u), w = { rootMargin: -h + "px " + -m + "px " + -y + "px " + -v + "px", threshold: J(0, Ee(1, c)) || 1 };
    let x = true;
    function S(L) {
      const T = L[0].intersectionRatio;
      if (T !== c) {
        if (!x) return s();
        T ? s(false, T) : o = setTimeout(() => {
          s(false, 1e-7);
        }, 1e3);
      }
      T === 1 && !Jo(a, e.getBoundingClientRect()) && s(), x = false;
    }
    try {
      n = new IntersectionObserver(S, { ...w, root: r.ownerDocument });
    } catch {
      n = new IntersectionObserver(S, w);
    }
    n.observe(e);
  }
  return s(true), i;
}
function Js(e, t, n, o) {
  o === void 0 && (o = {});
  const { ancestorScroll: r = true, ancestorResize: i = true, elementResize: s = typeof ResizeObserver == "function", layoutShift: l = typeof IntersectionObserver == "function", animationFrame: c = false } = o, a = dn(e), u = r || i ? [...a ? et(a) : [], ...et(t)] : [];
  u.forEach((v) => {
    r && v.addEventListener("scroll", n, { passive: true }), i && v.addEventListener("resize", n);
  });
  const d = a && l ? Zs(a, n) : null;
  let f = -1, g = null;
  s && (g = new ResizeObserver((v) => {
    let [p] = v;
    p && p.target === a && g && (g.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
      var w;
      (w = g) == null || w.observe(t);
    })), n();
  }), a && !c && g.observe(a), g.observe(t));
  let h, m = c ? Ae(e) : null;
  c && y();
  function y() {
    const v = Ae(e);
    m && !Jo(m, v) && n(), m = v, h = requestAnimationFrame(y);
  }
  return n(), () => {
    var v;
    u.forEach((p) => {
      r && p.removeEventListener("scroll", n), i && p.removeEventListener("resize", n);
    }), d == null ? void 0 : d(), (v = g) == null || v.disconnect(), g = null, c && cancelAnimationFrame(h);
  };
}
const Qs = Ts, el = Os, tl = Ss, nl = Ps, ol = xs, rl = ws, il = (e, t, n) => {
  const o = /* @__PURE__ */ new Map(), r = { platform: Zo, ...n }, i = { ...r.platform, _c: o };
  return bs(e, t, { ...r, platform: i });
};
var sl = ["<svg", ' display="block" viewBox="', '" style="transform:scale(1.02)"><g', '><path fill="none"', '></path><path stroke="none"', "></path></g></svg>"], fn = createContext();
function gn() {
  const e = useContext(fn);
  if (e === void 0) throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");
  return e;
}
var Ge = 30, eo = Ge / 2, ll = { top: 180, right: -90, bottom: 0, left: 90 }, to = "M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z";
function st(e) {
  const t = gn(), n = _({ size: Ge }, e), [o, r] = splitProps(n, ["ref", "style", "size"]), i = () => t.currentPlacement().split("-")[0], s = cl(t.contentRef), l = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue("background-color")) || "none";
  }, c = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue(`border-${i()}-color`)) || "none";
  }, a = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue(`border-${i()}-width`)) || "0px";
  }, u = () => Number.parseInt(a()) * 2 * (Ge / o.size), d = () => `rotate(${ll[i()]} ${eo} ${eo}) translate(0 2)`;
  return createComponent(j, mergeProps({ as: "div", "aria-hidden": "true", get style() {
    return tt({ position: "absolute", "font-size": `${o.size}px`, width: "1em", height: "1em", "pointer-events": "none", fill: l(), stroke: c(), "stroke-width": u() }, o.style);
  } }, r, { get children() {
    return ssr(sl, ssrHydrationKey(), `0 0 ${escape(Ge, true)} ${escape(Ge, true)}`, ssrAttribute("transform", escape(d(), true), false), ssrAttribute("d", escape(to, true), false), ssrAttribute("d", escape(to, true), false));
  } }));
}
function cl(e) {
  const [t, n] = createSignal();
  return createEffect(() => {
    const o = e();
    o && n(lo(o).getComputedStyle(o));
  }), t;
}
function al(e) {
  gn();
  const [t, n] = splitProps(e, ["ref", "style"]);
  return createComponent(j, mergeProps({ as: "div", "data-popper-positioner": "", get style() {
    return tt({ position: "absolute", top: 0, left: 0, "min-width": "max-content" }, t.style);
  } }, n));
}
function no(e) {
  const { x: t = 0, y: n = 0, width: o = 0, height: r = 0 } = e != null ? e : {};
  if (typeof DOMRect == "function") return new DOMRect(t, n, o, r);
  const i = { x: t, y: n, width: o, height: r, top: n, right: t + o, bottom: n + r, left: t };
  return { ...i, toJSON: () => i };
}
function ul(e, t) {
  return { contextElement: e, getBoundingClientRect: () => {
    const o = t(e);
    return o ? no(o) : e ? e.getBoundingClientRect() : no();
  } };
}
function dl(e) {
  return /^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e);
}
var fl = { top: "bottom", right: "left", bottom: "top", left: "right" };
function gl(e, t) {
  const [n, o] = e.split("-"), r = fl[n];
  return o ? n === "left" || n === "right" ? `${r} ${o === "start" ? "top" : "bottom"}` : o === "start" ? `${r} ${t === "rtl" ? "right" : "left"}` : `${r} ${t === "rtl" ? "left" : "right"}` : `${r} center`;
}
function hl(e) {
  const t = _({ getAnchorRect: (f) => f == null ? void 0 : f.getBoundingClientRect(), placement: "bottom", gutter: 0, shift: 0, flip: true, slide: true, overlap: false, sameWidth: false, fitViewport: false, hideWhenDetached: false, detachedPadding: 0, arrowPadding: 4, overflowPadding: 8 }, e), [n, o] = createSignal(), [r, i] = createSignal(), [s, l] = createSignal(t.placement), c = () => {
    var _a;
    return ul((_a = t.anchorRef) == null ? void 0 : _a.call(t), t.getAnchorRect);
  }, { direction: a } = sn();
  async function u() {
    var _a, _b, _c;
    const f = c(), g = n(), h = r();
    if (!f || !g) return;
    const m = ((h == null ? void 0 : h.clientHeight) || 0) / 2, y = typeof t.gutter == "number" ? t.gutter + m : (_a = t.gutter) != null ? _a : m;
    g.style.setProperty("--kb-popper-content-overflow-padding", `${t.overflowPadding}px`), f.getBoundingClientRect();
    const v = [Qs(({ placement: L }) => {
      const T = !!L.split("-")[1];
      return { mainAxis: y, crossAxis: T ? void 0 : t.shift, alignmentAxis: t.shift };
    })];
    if (t.flip !== false) {
      const L = typeof t.flip == "string" ? t.flip.split(" ") : void 0;
      if (L !== void 0 && !L.every(dl)) throw new Error("`flip` expects a spaced-delimited list of placements");
      v.push(tl({ padding: t.overflowPadding, fallbackPlacements: L }));
    }
    (t.slide || t.overlap) && v.push(el({ mainAxis: t.slide, crossAxis: t.overlap, padding: t.overflowPadding })), v.push(nl({ padding: t.overflowPadding, apply({ availableWidth: L, availableHeight: T, rects: D }) {
      const M = Math.round(D.reference.width);
      L = Math.floor(L), T = Math.floor(T), g.style.setProperty("--kb-popper-anchor-width", `${M}px`), g.style.setProperty("--kb-popper-content-available-width", `${L}px`), g.style.setProperty("--kb-popper-content-available-height", `${T}px`), t.sameWidth && (g.style.width = `${M}px`), t.fitViewport && (g.style.maxWidth = `${L}px`, g.style.maxHeight = `${T}px`);
    } })), t.hideWhenDetached && v.push(ol({ padding: t.detachedPadding })), h && v.push(rl({ element: h, padding: t.arrowPadding }));
    const p = await il(f, g, { placement: t.placement, strategy: "absolute", middleware: v, platform: { ...Zo, isRTL: () => a() === "rtl" } });
    if (l(p.placement), (_b = t.onCurrentPlacementChange) == null ? void 0 : _b.call(t, p.placement), !g) return;
    g.style.setProperty("--kb-popper-content-transform-origin", gl(p.placement, a()));
    const w = Math.round(p.x), x = Math.round(p.y);
    let S;
    if (t.hideWhenDetached && (S = ((_c = p.middlewareData.hide) == null ? void 0 : _c.referenceHidden) ? "hidden" : "visible"), Object.assign(g.style, { top: "0", left: "0", transform: `translate3d(${w}px, ${x}px, 0)`, visibility: S }), h && p.middlewareData.arrow) {
      const { x: L, y: T } = p.middlewareData.arrow, D = p.placement.split("-")[0];
      Object.assign(h.style, { left: L != null ? `${L}px` : "", top: T != null ? `${T}px` : "", [D]: "100%" });
    }
  }
  createEffect(() => {
    const f = c(), g = n();
    if (!f || !g) return;
    const h = Js(f, g, u, { elementResize: typeof ResizeObserver == "function" });
    onCleanup(h);
  }), createEffect(() => {
    var _a;
    const f = n(), g = (_a = t.contentRef) == null ? void 0 : _a.call(t);
    !f || !g || queueMicrotask(() => {
      f.style.zIndex = getComputedStyle(g).zIndex;
    });
  });
  const d = { currentPlacement: s, contentRef: () => {
    var _a;
    return (_a = t.contentRef) == null ? void 0 : _a.call(t);
  }, setPositionerRef: o, setArrowRef: i };
  return createComponent(fn.Provider, { value: d, get children() {
    return t.children;
  } });
}
var Ot = Object.assign(hl, { Arrow: st, Context: fn, usePopperContext: gn, Positioner: al }), pl = {};
ot(pl, { Arrow: () => st, Content: () => er, Portal: () => tr, Root: () => nr, Tooltip: () => rr, Trigger: () => or, useTooltipContext: () => Pt });
var Qo = createContext();
function Pt() {
  const e = useContext(Qo);
  if (e === void 0) throw new Error("[kobalte]: `useTooltipContext` must be used within a `Tooltip` component");
  return e;
}
function er(e) {
  const t = Pt(), n = _({ id: t.generateId("content") }, e), [o, r] = splitProps(n, ["ref", "style"]);
  return createEffect(() => onCleanup(t.registerContentId(r.id))), createComponent(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent(Ot.Positioner, { get children() {
      return createComponent(on, mergeProps({ role: "tooltip", disableOutsidePointerEvents: false, get style() {
        return tt({ "--kb-tooltip-content-transform-origin": "var(--kb-popper-content-transform-origin)", position: "relative" }, o.style);
      }, onFocusOutside: (i) => i.preventDefault(), onDismiss: () => t.hideTooltip(true) }, () => t.dataset(), r));
    } });
  } });
}
function tr(e) {
  const t = Pt();
  return createComponent(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent(Portal, e);
  } });
}
function ml(e, t, n) {
  const o = e.split("-")[0], r = t.getBoundingClientRect(), i = n.getBoundingClientRect(), s = [], l = r.left + r.width / 2, c = r.top + r.height / 2;
  switch (o) {
    case "top":
      s.push([r.left, c]), s.push([i.left, i.bottom]), s.push([i.left, i.top]), s.push([i.right, i.top]), s.push([i.right, i.bottom]), s.push([r.right, c]);
      break;
    case "right":
      s.push([l, r.top]), s.push([i.left, i.top]), s.push([i.right, i.top]), s.push([i.right, i.bottom]), s.push([i.left, i.bottom]), s.push([l, r.bottom]);
      break;
    case "bottom":
      s.push([r.left, c]), s.push([i.left, i.top]), s.push([i.left, i.bottom]), s.push([i.right, i.bottom]), s.push([i.right, i.top]), s.push([r.right, c]);
      break;
    case "left":
      s.push([l, r.top]), s.push([i.right, i.top]), s.push([i.left, i.top]), s.push([i.left, i.bottom]), s.push([i.right, i.bottom]), s.push([l, r.bottom]);
      break;
  }
  return s;
}
var Ce = {}, yl = 0, Re = false, pe, qe, ke;
function nr(e) {
  const t = `tooltip-${createUniqueId()}`, n = `${++yl}`, o = _({ id: t, openDelay: 700, closeDelay: 300, skipDelayDuration: 300 }, e), [r, i] = splitProps(o, ["id", "open", "defaultOpen", "onOpenChange", "disabled", "triggerOnFocusOnly", "openDelay", "closeDelay", "skipDelayDuration", "ignoreSafeArea", "forceMount"]);
  let s;
  const [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(i.placement), m = rn({ open: () => r.open, defaultOpen: () => r.defaultOpen, onOpenChange: (A) => {
    var _a;
    return (_a = r.onOpenChange) == null ? void 0 : _a.call(r, A);
  } }), { present: y } = mt({ show: () => r.forceMount || m.isOpen(), element: () => {
    var _a;
    return (_a = d()) != null ? _a : null;
  } }), v = () => {
    Ce[n] = w;
  }, p = () => {
    for (const A in Ce) A !== n && (Ce[A](true), delete Ce[A]);
  }, w = (A = false) => {
    isServer || (A || r.closeDelay && r.closeDelay <= 0 ? (window.clearTimeout(s), s = void 0, m.close()) : s || (s = window.setTimeout(() => {
      s = void 0, m.close();
    }, r.closeDelay)), window.clearTimeout(pe), pe = void 0, r.skipDelayDuration && r.skipDelayDuration >= 0 && (ke = window.setTimeout(() => {
      window.clearTimeout(ke), ke = void 0;
    }, r.skipDelayDuration)), Re && (window.clearTimeout(qe), qe = window.setTimeout(() => {
      delete Ce[n], qe = void 0, Re = false;
    }, r.closeDelay)));
  }, x = () => {
    isServer || (clearTimeout(s), s = void 0, p(), v(), Re = true, m.open(), window.clearTimeout(pe), pe = void 0, window.clearTimeout(qe), qe = void 0, window.clearTimeout(ke), ke = void 0);
  }, S = () => {
    isServer || (p(), v(), !m.isOpen() && !pe && !Re ? pe = window.setTimeout(() => {
      pe = void 0, Re = true, x();
    }, r.openDelay) : m.isOpen() || x());
  }, L = (A = false) => {
    isServer || (!A && r.openDelay && r.openDelay > 0 && !s && !ke ? S() : x());
  }, T = () => {
    isServer || (window.clearTimeout(pe), pe = void 0, Re = false);
  }, D = () => {
    isServer || (window.clearTimeout(s), s = void 0);
  }, M = (A) => de(a(), A) || de(d(), A), $ = (A) => {
    const O = a(), C = d();
    if (!(!O || !C)) return ml(A, O, C);
  }, U = (A) => {
    const O = A.target;
    if (M(O)) {
      D();
      return;
    }
    if (!r.ignoreSafeArea) {
      const C = $(g());
      if (C && yi(mi(A), C)) {
        D();
        return;
      }
    }
    s || w();
  };
  createEffect(() => {
    if (isServer || !m.isOpen()) return;
    const A = se();
    A.addEventListener("pointermove", U, true), onCleanup(() => {
      A.removeEventListener("pointermove", U, true);
    });
  }), createEffect(() => {
    const A = a();
    if (!A || !m.isOpen()) return;
    const O = (B) => {
      const W = B.target;
      de(W, A) && w(true);
    }, C = lo();
    C.addEventListener("scroll", O, { capture: true }), onCleanup(() => {
      C.removeEventListener("scroll", O, { capture: true });
    });
  }), onCleanup(() => {
    clearTimeout(s), Ce[n] && delete Ce[n];
  });
  const Z = { dataset: createMemo(() => ({ "data-expanded": m.isOpen() ? "" : void 0, "data-closed": m.isOpen() ? void 0 : "" })), isOpen: m.isOpen, isDisabled: () => {
    var _a;
    return (_a = r.disabled) != null ? _a : false;
  }, triggerOnFocusOnly: () => {
    var _a;
    return (_a = r.triggerOnFocusOnly) != null ? _a : false;
  }, contentId: l, contentPresent: y, openTooltip: L, hideTooltip: w, cancelOpening: T, generateId: $e(() => o.id), registerContentId: Q(c), isTargetOnTooltip: M, setTriggerRef: u, setContentRef: f };
  return createComponent(Qo.Provider, { value: Z, get children() {
    return createComponent(Ot, mergeProps({ anchorRef: a, contentRef: d, onCurrentPlacementChange: h }, i));
  } });
}
function or(e) {
  let t;
  const n = Pt(), [o, r] = splitProps(e, ["ref", "onPointerEnter", "onPointerLeave", "onPointerDown", "onClick", "onFocus", "onBlur"]);
  let i = false, s = false, l = false;
  const c = () => {
    i = false;
  }, a = () => {
    !n.isOpen() && (s || l) && n.openTooltip(l);
  }, u = (v) => {
    n.isOpen() && !s && !l && n.hideTooltip(v);
  }, d = (v) => {
    H(v, o.onPointerEnter), !(v.pointerType === "touch" || n.triggerOnFocusOnly() || n.isDisabled() || v.defaultPrevented) && (s = true, a());
  }, f = (v) => {
    H(v, o.onPointerLeave), v.pointerType !== "touch" && (s = false, l = false, n.isOpen() ? u() : n.cancelOpening());
  }, g = (v) => {
    H(v, o.onPointerDown), i = true, se(t).addEventListener("pointerup", c, { once: true });
  }, h = (v) => {
    H(v, o.onClick), s = false, l = false, u(true);
  }, m = (v) => {
    H(v, o.onFocus), !(n.isDisabled() || v.defaultPrevented || i) && (l = true, a());
  }, y = (v) => {
    H(v, o.onBlur);
    const p = v.relatedTarget;
    n.isTargetOnTooltip(p) || (s = false, l = false, u(true));
  };
  return onCleanup(() => {
    isServer || se(t).removeEventListener("pointerup", c);
  }), createComponent(j, mergeProps({ as: "button", get "aria-describedby"() {
    return n.isOpen() ? n.contentId() : void 0;
  }, onPointerEnter: d, onPointerLeave: f, onPointerDown: g, onClick: h, onFocus: m, onBlur: y }, () => n.dataset(), r));
}
var rr = Object.assign(nr, { Arrow: st, Content: er, Portal: tr, Trigger: or });
rr.Trigger;
var vl = ["id", "name", "validationState", "required", "disabled", "readOnly"];
function bl(e) {
  const t = `form-control-${createUniqueId()}`, n = _({ id: t }, e), [o, r] = createSignal(), [i, s] = createSignal(), [l, c] = createSignal(), [a, u] = createSignal(), d = (m, y, v) => {
    const p = v != null || o() != null;
    return [v, o(), p && y != null ? m : void 0].filter(Boolean).join(" ") || void 0;
  }, f = (m) => [l(), a(), m].filter(Boolean).join(" ") || void 0, g = createMemo(() => ({ "data-valid": b(n.validationState) === "valid" ? "" : void 0, "data-invalid": b(n.validationState) === "invalid" ? "" : void 0, "data-required": b(n.required) ? "" : void 0, "data-disabled": b(n.disabled) ? "" : void 0, "data-readonly": b(n.readOnly) ? "" : void 0 }));
  return { formControlContext: { name: () => {
    var _a;
    return (_a = b(n.name)) != null ? _a : b(n.id);
  }, dataset: g, validationState: () => b(n.validationState), isRequired: () => b(n.required), isDisabled: () => b(n.disabled), isReadOnly: () => b(n.readOnly), labelId: o, fieldId: i, descriptionId: l, errorMessageId: a, getAriaLabelledBy: d, getAriaDescribedBy: f, generateId: $e(() => b(n.id)), registerLabel: Q(r), registerField: Q(s), registerDescription: Q(c), registerErrorMessage: Q(u) } };
}
var ir = createContext();
function Fe() {
  const e = useContext(ir);
  if (e === void 0) throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");
  return e;
}
function sr(e) {
  const t = Fe(), n = _({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescription(n.id))), createComponent(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
var wl = ["<option", "", ">", "</option>"], Sl = "<option></option>", xl = ["<div", ' style="', '" aria-hidden="true"><input type="text"', ' style="', '"', "", ">", "</div>"];
function El(e) {
  const [t, n] = splitProps(e, ["ref", "onChange", "collection", "selectionManager", "isOpen", "isMultiple", "isVirtualized", "focusTrigger"]), o = Fe(), [r, i] = createSignal(false), s = (l) => {
    const c = t.collection.getItem(l);
    return createComponent(Show, { get when() {
      return (c == null ? void 0 : c.type) === "item";
    }, get children() {
      return ssr(wl, ssrHydrationKey() + ssrAttribute("value", escape(l, true), false), ssrAttribute("selected", t.selectionManager.isSelected(l), true), escape(c == null ? void 0 : c.textValue));
    } });
  };
  return createEffect(on$1(() => t.selectionManager.selectedKeys(), (l, c) => {
    c && No(l, c) || i(true);
  }, { defer: true })), ssr(xl, ssrHydrationKey(), ssrStyle(po), ssrAttribute("tabindex", t.selectionManager.isFocused() || t.isOpen ? -1 : 0, false), ssrStyleProperty("font-size:", "16px"), ssrAttribute("required", o.isRequired(), true), ssrAttribute("disabled", o.isDisabled(), true) + ssrAttribute("readonly", escape(o.isReadOnly(), true), false), ssrElement("select", mergeProps({ tabIndex: -1, get multiple() {
    return t.isMultiple;
  }, get name() {
    return o.name();
  }, get required() {
    return o.isRequired();
  }, get disabled() {
    return o.isDisabled();
  }, get size() {
    return t.collection.getSize();
  }, get value() {
    var _a;
    return (_a = t.selectionManager.firstSelectedKey()) != null ? _a : "";
  } }, n), () => [ssr(Sl), "<!--$-->", escape(createComponent(Show, { get when() {
    return t.isVirtualized;
  }, get fallback() {
    return createComponent(For, { get each() {
      return [...t.collection.getKeys()];
    }, children: s });
  }, get children() {
    return createComponent(For, { get each() {
      return [...t.selectionManager.selectedKeys()];
    }, children: s });
  } })), "<!--/-->"], false));
}
var oo = /* @__PURE__ */ new WeakMap();
function Dl(e) {
  let t = oo.get(e);
  if (t != null) return t;
  t = 0;
  for (const n of e) n.type === "item" && t++;
  return oo.set(e, t), t;
}
var lr = class {
  constructor(e, t, n) {
    __publicField(this, "collection");
    __publicField(this, "ref");
    __publicField(this, "collator");
    this.collection = e, this.ref = t, this.collator = n;
  }
  getKeyBelow(e) {
    let t = this.collection().getKeyAfter(e);
    for (; t != null; ) {
      const n = this.collection().getItem(t);
      if (n && n.type === "item" && !n.disabled) return t;
      t = this.collection().getKeyAfter(t);
    }
  }
  getKeyAbove(e) {
    let t = this.collection().getKeyBefore(e);
    for (; t != null; ) {
      const n = this.collection().getItem(t);
      if (n && n.type === "item" && !n.disabled) return t;
      t = this.collection().getKeyBefore(t);
    }
  }
  getFirstKey() {
    let e = this.collection().getFirstKey();
    for (; e != null; ) {
      const t = this.collection().getItem(e);
      if (t && t.type === "item" && !t.disabled) return e;
      e = this.collection().getKeyAfter(e);
    }
  }
  getLastKey() {
    let e = this.collection().getLastKey();
    for (; e != null; ) {
      const t = this.collection().getItem(e);
      if (t && t.type === "item" && !t.disabled) return e;
      e = this.collection().getKeyBefore(e);
    }
  }
  getItem(e) {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.ref) == null ? void 0 : _a.call(this)) == null ? void 0 : _b.querySelector(`[data-key="${e}"]`)) != null ? _c : null;
  }
  getKeyPageAbove(e) {
    var _a;
    const t = (_a = this.ref) == null ? void 0 : _a.call(this);
    let n = this.getItem(e);
    if (!t || !n) return;
    const o = Math.max(0, n.offsetTop + n.offsetHeight - t.offsetHeight);
    let r = e;
    for (; r && n && n.offsetTop > o; ) r = this.getKeyAbove(r), n = r != null ? this.getItem(r) : null;
    return r;
  }
  getKeyPageBelow(e) {
    var _a;
    const t = (_a = this.ref) == null ? void 0 : _a.call(this);
    let n = this.getItem(e);
    if (!t || !n) return;
    const o = Math.min(t.scrollHeight, n.offsetTop - n.offsetHeight + t.offsetHeight);
    let r = e;
    for (; r && n && n.offsetTop < o; ) r = this.getKeyBelow(r), n = r != null ? this.getItem(r) : null;
    return r;
  }
  getKeyForSearch(e, t) {
    var _a;
    const n = (_a = this.collator) == null ? void 0 : _a.call(this);
    if (!n) return;
    let o = t != null ? this.getKeyBelow(t) : this.getFirstKey();
    for (; o != null; ) {
      const r = this.collection().getItem(o);
      if (r) {
        const i = r.textValue.slice(0, e.length);
        if (r.textValue && n.compare(i, e) === 0) return o;
      }
      o = this.getKeyBelow(o);
    }
  }
};
function Tl(e, t, n) {
  const o = ko({ usage: "search", sensitivity: "base" }), r = createMemo(() => {
    const i = b(e.keyboardDelegate);
    return i || new lr(e.collection, t, o);
  });
  return is({ selectionManager: () => b(e.selectionManager), keyboardDelegate: r, autoFocus: () => b(e.autoFocus), deferAutoFocus: () => b(e.deferAutoFocus), shouldFocusWrap: () => b(e.shouldFocusWrap), disallowEmptySelection: () => b(e.disallowEmptySelection), selectOnFocus: () => b(e.selectOnFocus), disallowTypeAhead: () => b(e.disallowTypeAhead), shouldUseVirtualFocus: () => b(e.shouldUseVirtualFocus), allowsTabNavigation: () => b(e.allowsTabNavigation), isVirtualized: () => b(e.isVirtualized), scrollToKey: (i) => {
    var _a;
    return (_a = b(e.scrollToKey)) == null ? void 0 : _a(i);
  }, orientation: () => b(e.orientation) }, t, n);
}
var Ol = {};
ot(Ol, { Item: () => Ct, ItemDescription: () => Lt, ItemIndicator: () => At, ItemLabel: () => It, Listbox: () => Pl, Root: () => pn, Section: () => Kt, useListboxContext: () => ar });
var cr = createContext();
function ar() {
  const e = useContext(cr);
  if (e === void 0) throw new Error("[kobalte]: `useListboxContext` must be used within a `Listbox` component");
  return e;
}
var ur = createContext();
function hn() {
  const e = useContext(ur);
  if (e === void 0) throw new Error("[kobalte]: `useListboxItemContext` must be used within a `Listbox.Item` component");
  return e;
}
function Ct(e) {
  let t;
  const n = ar(), o = `${n.generateId("item")}-${createUniqueId()}`, r = _({ id: o }, e), [i, s] = splitProps(r, ["ref", "item", "aria-label", "aria-labelledby", "aria-describedby", "onPointerMove", "onPointerDown", "onPointerUp", "onClick", "onKeyDown", "onMouseDown", "onFocus"]), [l, c] = createSignal(), [a, u] = createSignal(), d = () => n.listState().selectionManager(), f = () => d().focusedKey() === i.item.key, g = ss({ key: () => i.item.key, selectionManager: d, shouldSelectOnPressUp: n.shouldSelectOnPressUp, allowsDifferentPressOrigin: () => n.shouldSelectOnPressUp() && n.shouldFocusOnHover(), shouldUseVirtualFocus: n.shouldUseVirtualFocus, disabled: () => i.item.disabled }, () => t), h = () => {
    if (d().selectionMode() !== "none") return g.isSelected();
  }, m = createMemo(() => true), y = () => m() ? i["aria-label"] : void 0, v = () => m() ? l() : void 0, p = () => m() ? a() : void 0, w = () => {
    var _a;
    if (!n.isVirtualized()) return;
    const D = (_a = n.listState().collection().getItem(i.item.key)) == null ? void 0 : _a.index;
    return D != null ? D + 1 : void 0;
  }, x = () => {
    if (n.isVirtualized()) return Dl(n.listState().collection());
  }, S = (D) => {
    H(D, i.onPointerMove), D.pointerType === "mouse" && !g.isDisabled() && n.shouldFocusOnHover() && (X(D.currentTarget), d().setFocused(true), d().setFocusedKey(i.item.key));
  }, L = createMemo(() => ({ "data-disabled": g.isDisabled() ? "" : void 0, "data-selected": g.isSelected() ? "" : void 0, "data-highlighted": f() ? "" : void 0 })), T = { isSelected: g.isSelected, dataset: L, generateId: $e(() => s.id), registerLabelId: Q(c), registerDescriptionId: Q(u) };
  return createComponent(ur.Provider, { value: T, get children() {
    return createComponent(j, mergeProps({ as: "li", role: "option", get tabIndex() {
      return g.tabIndex();
    }, get "aria-disabled"() {
      return g.isDisabled();
    }, get "aria-selected"() {
      return h();
    }, get "aria-label"() {
      return y();
    }, get "aria-labelledby"() {
      return v();
    }, get "aria-describedby"() {
      return p();
    }, get "aria-posinset"() {
      return w();
    }, get "aria-setsize"() {
      return x();
    }, get "data-key"() {
      return g.dataKey();
    }, get onPointerDown() {
      return ie([i.onPointerDown, g.onPointerDown]);
    }, get onPointerUp() {
      return ie([i.onPointerUp, g.onPointerUp]);
    }, get onClick() {
      return ie([i.onClick, g.onClick]);
    }, get onKeyDown() {
      return ie([i.onKeyDown, g.onKeyDown]);
    }, get onMouseDown() {
      return ie([i.onMouseDown, g.onMouseDown]);
    }, get onFocus() {
      return ie([i.onFocus, g.onFocus]);
    }, onPointerMove: S }, L, s));
  } });
}
function Lt(e) {
  const t = hn(), n = _({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescriptionId(n.id))), createComponent(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function At(e) {
  const t = hn(), n = _({ id: t.generateId("indicator") }, e), [o, r] = splitProps(n, ["forceMount"]);
  return createComponent(Show, { get when() {
    return o.forceMount || t.isSelected();
  }, get children() {
    return createComponent(j, mergeProps({ as: "div", "aria-hidden": "true" }, () => t.dataset(), r));
  } });
}
function It(e) {
  const t = hn(), n = _({ id: t.generateId("label") }, e);
  return createEffect(() => onCleanup(t.registerLabelId(n.id))), createComponent(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function pn(e) {
  let t;
  const n = `listbox-${createUniqueId()}`, o = _({ id: n, selectionMode: "single", virtualized: false }, e), [r, i] = splitProps(o, ["ref", "children", "renderItem", "renderSection", "value", "defaultValue", "onChange", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "state", "keyboardDelegate", "autoFocus", "selectionMode", "shouldFocusWrap", "shouldUseVirtualFocus", "shouldSelectOnPressUp", "shouldFocusOnHover", "allowDuplicateSelectionEvents", "disallowEmptySelection", "selectionBehavior", "selectOnFocus", "disallowTypeAhead", "allowsTabNavigation", "virtualized", "scrollToItem", "scrollRef", "onKeyDown", "onMouseDown", "onFocusIn", "onFocusOut"]), s = createMemo(() => r.state ? r.state : $o({ selectedKeys: () => r.value, defaultSelectedKeys: () => r.defaultValue, onSelectionChange: r.onChange, allowDuplicateSelectionEvents: () => b(r.allowDuplicateSelectionEvents), disallowEmptySelection: () => b(r.disallowEmptySelection), selectionBehavior: () => b(r.selectionBehavior), selectionMode: () => b(r.selectionMode), dataSource: () => {
    var _a;
    return (_a = r.options) != null ? _a : [];
  }, getKey: () => r.optionValue, getTextValue: () => r.optionTextValue, getDisabled: () => r.optionDisabled, getSectionChildren: () => r.optionGroupChildren })), l = Tl({ selectionManager: () => s().selectionManager(), collection: () => s().collection(), autoFocus: () => b(r.autoFocus), shouldFocusWrap: () => b(r.shouldFocusWrap), keyboardDelegate: () => r.keyboardDelegate, disallowEmptySelection: () => b(r.disallowEmptySelection), selectOnFocus: () => b(r.selectOnFocus), disallowTypeAhead: () => b(r.disallowTypeAhead), shouldUseVirtualFocus: () => b(r.shouldUseVirtualFocus), allowsTabNavigation: () => b(r.allowsTabNavigation), isVirtualized: () => r.virtualized, scrollToKey: () => r.scrollToItem }, () => t, () => {
    var _a;
    return (_a = r.scrollRef) == null ? void 0 : _a.call(r);
  }), c = { listState: s, generateId: $e(() => i.id), shouldUseVirtualFocus: () => o.shouldUseVirtualFocus, shouldSelectOnPressUp: () => o.shouldSelectOnPressUp, shouldFocusOnHover: () => o.shouldFocusOnHover, isVirtualized: () => r.virtualized };
  return createComponent(cr.Provider, { value: c, get children() {
    return createComponent(j, mergeProps({ as: "ul", role: "listbox", get tabIndex() {
      return l.tabIndex();
    }, get "aria-multiselectable"() {
      return s().selectionManager().selectionMode() === "multiple" ? true : void 0;
    }, get onKeyDown() {
      return ie([r.onKeyDown, l.onKeyDown]);
    }, get onMouseDown() {
      return ie([r.onMouseDown, l.onMouseDown]);
    }, get onFocusIn() {
      return ie([r.onFocusIn, l.onFocusIn]);
    }, get onFocusOut() {
      return ie([r.onFocusOut, l.onFocusOut]);
    } }, i, { get children() {
      return createComponent(Show, { get when() {
        return !r.virtualized;
      }, get fallback() {
        var _a;
        return (_a = r.children) == null ? void 0 : _a.call(r, s().collection);
      }, get children() {
        return createComponent(Gr, { get each() {
          return [...s().collection()];
        }, by: "key", children: (a) => createComponent(Switch, { get children() {
          return [createComponent(Match, { get when() {
            return a().type === "section";
          }, get children() {
            var _a;
            return (_a = r.renderSection) == null ? void 0 : _a.call(r, a());
          } }), createComponent(Match, { get when() {
            return a().type === "item";
          }, get children() {
            var _a;
            return (_a = r.renderItem) == null ? void 0 : _a.call(r, a());
          } })];
        } }) });
      } });
    } }));
  } });
}
function Kt(e) {
  return createComponent(j, mergeProps({ as: "li", role: "presentation" }, e));
}
var Pl = Object.assign(pn, { Item: Ct, ItemDescription: Lt, ItemIndicator: At, ItemLabel: It, Section: Kt }), Cl = ["id", "aria-label", "aria-labelledby", "aria-describedby"];
function Ll(e) {
  const t = Fe(), n = _({ id: t.generateId("field") }, e);
  return createEffect(() => onCleanup(t.registerField(b(n.id)))), { fieldProps: { id: () => b(n.id), ariaLabel: () => b(n["aria-label"]), ariaLabelledBy: () => t.getAriaLabelledBy(b(n.id), b(n["aria-label"]), b(n["aria-labelledby"])), ariaDescribedBy: () => t.getAriaDescribedBy(b(n["aria-describedby"])) } };
}
function Al(e) {
  let t;
  const n = Fe(), o = _({ id: n.generateId("label") }, e), [r, i] = splitProps(o, ["ref"]), s = mo(() => t, () => "label");
  return createEffect(() => onCleanup(n.registerLabel(i.id))), createComponent(j, mergeProps({ as: "label", get for() {
    return s() === "label" ? n.fieldId() : void 0;
  } }, () => n.dataset(), i));
}
function Il(e, t) {
  createEffect(on$1(e, (n) => {
    if (n == null) return;
    const o = Kl(n);
    o != null && (o.addEventListener("reset", t, { passive: true }), onCleanup(() => {
      o.removeEventListener("reset", t);
    }));
  }));
}
function Kl(e) {
  return Fl(e) ? e.form : e.closest("form");
}
function Fl(e) {
  return e.matches("textarea, input, select, button");
}
function dr(e) {
  const t = Fe(), n = _({ id: t.generateId("error-message") }, e), [o, r] = splitProps(n, ["forceMount"]), i = () => t.validationState() === "invalid";
  return createEffect(() => {
    i() && onCleanup(t.registerErrorMessage(r.id));
  }), createComponent(Show, { get when() {
    return o.forceMount || i();
  }, get children() {
    return createComponent(j, mergeProps({ as: "div" }, () => t.dataset(), r));
  } });
}
var Ml = {};
ot(Ml, { Arrow: () => st, Content: () => gr, Description: () => sr, ErrorMessage: () => dr, HiddenSelect: () => hr, Icon: () => pr, Item: () => Ct, ItemDescription: () => Lt, ItemIndicator: () => At, ItemLabel: () => It, Label: () => mr, Listbox: () => yr, Portal: () => vr, Root: () => br, Section: () => Kt, Select: () => lt, Trigger: () => wr, Value: () => Sr, useSelectContext: () => we });
var fr = createContext();
function we() {
  const e = useContext(fr);
  if (e === void 0) throw new Error("[kobalte]: `useSelectContext` must be used within a `Select` component");
  return e;
}
function gr(e) {
  let t;
  const n = we(), [o, r] = splitProps(e, ["ref", "style", "onCloseAutoFocus", "onFocusOutside"]), i = (l) => {
    n.close();
  }, s = (l) => {
    var _a;
    (_a = o.onFocusOutside) == null ? void 0 : _a.call(o, l), n.isOpen() && n.isModal() && l.preventDefault();
  };
  return So({ isDisabled: () => !(n.isOpen() && n.isModal()), targets: () => [] }), Do({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), wo({ trapFocus: () => n.isOpen() && n.isModal(), onMountAutoFocus: (l) => {
    l.preventDefault();
  }, onUnmountAutoFocus: (l) => {
    var _a;
    (_a = o.onCloseAutoFocus) == null ? void 0 : _a.call(o, l), l.defaultPrevented || (X(n.triggerRef()), l.preventDefault());
  } }, () => t), createComponent(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent(Ot.Positioner, { get children() {
      return createComponent(on, mergeProps({ get disableOutsidePointerEvents() {
        return n.isModal() && n.isOpen();
      }, get excludedElements() {
        return [n.triggerRef];
      }, get style() {
        return tt({ "--kb-select-content-transform-origin": "var(--kb-popper-content-transform-origin)", position: "relative" }, o.style);
      }, onEscapeKeyDown: i, onFocusOutside: s, get onDismiss() {
        return n.close;
      } }, () => n.dataset(), r));
    } });
  } });
}
function hr(e) {
  const t = we();
  return createComponent(El, mergeProps({ get collection() {
    return t.listState().collection();
  }, get selectionManager() {
    return t.listState().selectionManager();
  }, get isOpen() {
    return t.isOpen();
  }, get isMultiple() {
    return t.isMultiple();
  }, get isVirtualized() {
    return t.isVirtualized();
  }, focusTrigger: () => {
    var _a;
    return (_a = t.triggerRef()) == null ? void 0 : _a.focus();
  } }, e));
}
function pr(e) {
  const t = we(), n = _({ children: "\u25BC" }, e);
  return createComponent(j, mergeProps({ as: "span", "aria-hidden": "true" }, () => t.dataset(), n));
}
function mr(e) {
  const t = we(), [n, o] = splitProps(e, ["onClick"]);
  return createComponent(Al, mergeProps({ as: "span", onClick: (i) => {
    var _a;
    H(i, n.onClick), t.isDisabled() || ((_a = t.triggerRef()) == null ? void 0 : _a.focus());
  } }, o));
}
function yr(e) {
  const t = we(), n = _({ id: t.generateId("listbox") }, e), [o, r] = splitProps(n, ["ref", "id", "onKeyDown"]);
  return createEffect(() => onCleanup(t.registerListboxId(o.id))), createComponent(pn, mergeProps({ get id() {
    return o.id;
  }, get state() {
    return t.listState();
  }, get virtualized() {
    return t.isVirtualized();
  }, get autoFocus() {
    return t.autoFocus();
  }, shouldSelectOnPressUp: true, shouldFocusOnHover: true, get shouldFocusWrap() {
    return t.shouldFocusWrap();
  }, get disallowTypeAhead() {
    return t.disallowTypeAhead();
  }, get "aria-labelledby"() {
    return t.listboxAriaLabelledBy();
  }, get renderItem() {
    return t.renderItem;
  }, get renderSection() {
    return t.renderSection;
  }, onKeyDown: (s) => {
    H(s, o.onKeyDown), s.key === "Escape" && s.preventDefault();
  } }, r));
}
function vr(e) {
  const t = we();
  return createComponent(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent(Portal, e);
  } });
}
function Rl(e) {
  const t = `select-${createUniqueId()}`, n = _({ id: t, selectionMode: "single", disallowEmptySelection: false, closeOnSelection: e.selectionMode === "single", allowDuplicateSelectionEvents: true, gutter: 8, sameWidth: true, modal: false }, e), [o, r, i, s] = splitProps(n, ["itemComponent", "sectionComponent", "open", "defaultOpen", "onOpenChange", "value", "defaultValue", "onChange", "placeholder", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "keyboardDelegate", "allowDuplicateSelectionEvents", "disallowEmptySelection", "closeOnSelection", "disallowTypeAhead", "shouldFocusWrap", "selectionBehavior", "selectionMode", "virtualized", "modal", "preventScroll", "forceMount"], ["getAnchorRect", "placement", "gutter", "shift", "flip", "slide", "overlap", "sameWidth", "fitViewport", "hideWhenDetached", "detachedPadding", "arrowPadding", "overflowPadding"], vl), [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(), [m, y] = createSignal(), [v, p] = createSignal(), [w, x] = createSignal(), [S, L] = createSignal(true), T = (F) => {
    const q = o.optionValue;
    return q == null ? String(F) : String(Jt(q) ? q(F) : F[q]);
  }, D = createMemo(() => {
    const F = o.optionGroupChildren;
    return F == null ? o.options : o.options.flatMap((q) => {
      var _a;
      return (_a = q[F]) != null ? _a : q;
    });
  }), M = createMemo(() => D().map((F) => T(F))), $ = (F) => [...F].map((q) => D().find((Ft) => T(Ft) === q)).filter((q) => q != null), U = rn({ open: () => o.open, defaultOpen: () => o.defaultOpen, onOpenChange: (F) => {
    var _a;
    return (_a = o.onOpenChange) == null ? void 0 : _a.call(o, F);
  } }), V = $o({ selectedKeys: () => o.value != null ? o.value.map(T) : o.value, defaultSelectedKeys: () => o.defaultValue != null ? o.defaultValue.map(T) : o.defaultValue, onSelectionChange: (F) => {
    var _a;
    (_a = o.onChange) == null ? void 0 : _a.call(o, $(F)), o.closeOnSelection && W();
  }, allowDuplicateSelectionEvents: () => b(o.allowDuplicateSelectionEvents), disallowEmptySelection: () => b(o.disallowEmptySelection), selectionBehavior: () => b(o.selectionBehavior), selectionMode: () => o.selectionMode, dataSource: () => {
    var _a;
    return (_a = o.options) != null ? _a : [];
  }, getKey: () => o.optionValue, getTextValue: () => o.optionTextValue, getDisabled: () => o.optionDisabled, getSectionChildren: () => o.optionGroupChildren }), Z = createMemo(() => $(V.selectionManager().selectedKeys())), A = (F) => {
    V.selectionManager().toggleSelection(T(F));
  }, { present: O } = mt({ show: () => o.forceMount || U.isOpen(), element: () => {
    var _a;
    return (_a = m()) != null ? _a : null;
  } }), C = () => {
    const F = v();
    F && X(F);
  }, B = (F) => {
    if (o.options.length <= 0) return;
    L(F), U.open();
    let q = V.selectionManager().firstSelectedKey();
    q == null && (F === "first" ? q = V.collection().getFirstKey() : F === "last" && (q = V.collection().getLastKey())), C(), V.selectionManager().setFocused(true), V.selectionManager().setFocusedKey(q);
  }, W = () => {
    U.close(), V.selectionManager().setFocused(false), V.selectionManager().setFocusedKey(void 0);
  }, G = (F) => {
    U.isOpen() ? W() : B(F);
  }, { formControlContext: oe } = bl(i);
  Il(g, () => {
    const F = o.defaultValue ? [...o.defaultValue].map(T) : new ue();
    V.selectionManager().setSelectedKeys(F);
  });
  const Me = ko({ usage: "search", sensitivity: "base" }), Se = createMemo(() => {
    const F = b(o.keyboardDelegate);
    return F || new lr(V.collection, void 0, Me);
  }), xe = (F) => {
    var _a;
    return (_a = o.itemComponent) == null ? void 0 : _a.call(o, { item: F });
  }, ct = (F) => {
    var _a;
    return (_a = o.sectionComponent) == null ? void 0 : _a.call(o, { section: F });
  };
  createEffect(on$1([M], ([F]) => {
    const Ft = [...V.selectionManager().selectedKeys()].filter((Lr) => F.includes(Lr));
    V.selectionManager().setSelectedKeys(Ft);
  }, { defer: true }));
  const ze = createMemo(() => ({ "data-expanded": U.isOpen() ? "" : void 0, "data-closed": U.isOpen() ? void 0 : "" })), yn = { dataset: ze, isOpen: U.isOpen, isDisabled: () => {
    var _a;
    return (_a = oe.isDisabled()) != null ? _a : false;
  }, isMultiple: () => b(o.selectionMode) === "multiple", isVirtualized: () => {
    var _a;
    return (_a = o.virtualized) != null ? _a : false;
  }, isModal: () => {
    var _a;
    return (_a = o.modal) != null ? _a : false;
  }, preventScroll: () => {
    var _a;
    return (_a = o.preventScroll) != null ? _a : yn.isModal();
  }, disallowTypeAhead: () => {
    var _a;
    return (_a = o.disallowTypeAhead) != null ? _a : false;
  }, shouldFocusWrap: () => {
    var _a;
    return (_a = o.shouldFocusWrap) != null ? _a : false;
  }, selectedOptions: Z, contentPresent: O, autoFocus: S, triggerRef: g, listState: () => V, keyboardDelegate: Se, triggerId: l, valueId: a, listboxId: d, listboxAriaLabelledBy: w, setListboxAriaLabelledBy: x, setTriggerRef: h, setContentRef: y, setListboxRef: p, open: B, close: W, toggle: G, placeholder: () => o.placeholder, renderItem: xe, renderSection: ct, removeOptionFromSelection: A, generateId: $e(() => b(i.id)), registerTriggerId: Q(c), registerValueId: Q(u), registerListboxId: Q(f) };
  return createComponent(ir.Provider, { value: oe, get children() {
    return createComponent(fr.Provider, { value: yn, get children() {
      return createComponent(Ot, mergeProps({ anchorRef: g, contentRef: m }, r, { get children() {
        return createComponent(j, mergeProps({ as: "div", role: "group", get id() {
          return b(i.id);
        } }, () => oe.dataset(), ze, s));
      } }));
    } });
  } });
}
function br(e) {
  const [t, n] = splitProps(e, ["value", "defaultValue", "onChange", "multiple"]), o = createMemo(() => t.value != null ? t.multiple ? t.value : [t.value] : t.value), r = createMemo(() => t.defaultValue != null ? t.multiple ? t.defaultValue : [t.defaultValue] : t.defaultValue);
  return createComponent(Rl, mergeProps({ get value() {
    return o();
  }, get defaultValue() {
    return r();
  }, onChange: (s) => {
    var _a, _b, _c;
    t.multiple ? (_a = t.onChange) == null ? void 0 : _a.call(t, s != null ? s : []) : (_c = t.onChange) == null ? void 0 : _c.call(t, (_b = s[0]) != null ? _b : null);
  }, get selectionMode() {
    return t.multiple ? "multiple" : "single";
  } }, n));
}
function wr(e) {
  const t = Fe(), n = we(), o = _({ id: n.generateId("trigger") }, e), [r, i, s] = splitProps(o, ["ref", "disabled", "onPointerDown", "onClick", "onKeyDown", "onFocus", "onBlur"], Cl), l = () => n.listState().selectionManager(), c = () => n.keyboardDelegate(), a = () => r.disabled || n.isDisabled(), { fieldProps: u } = Ll(i), { typeSelectHandlers: d } = _o({ keyboardDelegate: c, selectionManager: l, onTypeSelect: (p) => l().select(p) }), f = () => [n.listboxAriaLabelledBy(), n.valueId()].filter(Boolean).join(" ") || void 0, g = (p) => {
    H(p, r.onPointerDown), p.currentTarget.dataset.pointerType = p.pointerType, !a() && p.pointerType !== "touch" && p.button === 0 && (p.preventDefault(), n.toggle(true));
  }, h = (p) => {
    H(p, r.onClick), !a() && p.currentTarget.dataset.pointerType === "touch" && n.toggle(true);
  }, m = (p) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    if (H(p, r.onKeyDown), !a()) switch (H(p, d.onKeyDown), p.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        p.stopPropagation(), p.preventDefault(), n.toggle("first");
        break;
      case "ArrowUp":
        p.stopPropagation(), p.preventDefault(), n.toggle("last");
        break;
      case "ArrowLeft": {
        if (p.preventDefault(), n.isMultiple()) return;
        const w = l().firstSelectedKey(), x = w != null ? (_b = (_a = c()).getKeyAbove) == null ? void 0 : _b.call(_a, w) : (_d = (_c = c()).getFirstKey) == null ? void 0 : _d.call(_c);
        x != null && l().select(x);
        break;
      }
      case "ArrowRight": {
        if (p.preventDefault(), n.isMultiple()) return;
        const w = l().firstSelectedKey(), x = w != null ? (_f = (_e2 = c()).getKeyBelow) == null ? void 0 : _f.call(_e2, w) : (_h = (_g = c()).getFirstKey) == null ? void 0 : _h.call(_g);
        x != null && l().select(x);
        break;
      }
    }
  }, y = (p) => {
    H(p, r.onFocus), !l().isFocused() && l().setFocused(true);
  }, v = (p) => {
    H(p, r.onBlur), !n.isOpen() && l().setFocused(false);
  };
  return createEffect(() => onCleanup(n.registerTriggerId(u.id()))), createEffect(() => {
    n.setListboxAriaLabelledBy([u.ariaLabelledBy(), u.ariaLabel() && !u.ariaLabelledBy() ? u.id() : null].filter(Boolean).join(" ") || void 0);
  }), createComponent(rt, mergeProps({ get id() {
    return u.id();
  }, get disabled() {
    return a();
  }, "aria-haspopup": "listbox", get "aria-expanded"() {
    return n.isOpen();
  }, get "aria-controls"() {
    return n.isOpen() ? n.listboxId() : void 0;
  }, get "aria-label"() {
    return u.ariaLabel();
  }, get "aria-labelledby"() {
    return f();
  }, get "aria-describedby"() {
    return u.ariaDescribedBy();
  }, onPointerDown: g, onClick: h, onKeyDown: m, onFocus: y, onBlur: v }, () => n.dataset(), () => t.dataset(), s));
}
function Sr(e) {
  const t = Fe(), n = we(), o = _({ id: n.generateId("value") }, e), [r, i] = splitProps(o, ["id", "children"]), s = () => n.listState().selectionManager(), l = () => {
    const c = s().selectedKeys();
    return c.size === 1 && c.has("") ? true : s().isEmpty();
  };
  return createEffect(() => onCleanup(n.registerValueId(r.id))), createComponent(j, mergeProps({ as: "span", get id() {
    return r.id;
  }, get "data-placeholder-shown"() {
    return l() ? "" : void 0;
  } }, () => t.dataset(), i, { get children() {
    return createComponent(Show, { get when() {
      return !l();
    }, get fallback() {
      return n.placeholder();
    }, get children() {
      return createComponent(kl, { state: { selectedOption: () => n.selectedOptions()[0], selectedOptions: () => n.selectedOptions(), remove: (c) => n.removeOptionFromSelection(c), clear: () => s().clearSelection() }, get children() {
        return r.children;
      } });
    } });
  } }));
}
function kl(e) {
  return children(() => {
    const n = e.children;
    return Jt(n) ? n(e.state) : n;
  })();
}
var lt = Object.assign(br, { Arrow: st, Content: gr, Description: sr, ErrorMessage: dr, HiddenSelect: hr, Icon: pr, Item: Ct, ItemDescription: Lt, ItemIndicator: At, ItemLabel: It, Label: mr, Listbox: yr, Portal: vr, Section: Kt, Trigger: wr, Value: Sr });
lt.Value;
lt.Item;
lt.ItemLabel;
lt.ItemIndicator;
const xr = createContext(), ec = (e) => {
  var _a;
  const [t, n] = createSignal((_a = e.defaultTheme) != null ? _a : "system"), o = () => {
    const r = t();
    return r === "system" ? "dark" : r;
  };
  return createEffect(() => {
    if (typeof document < "u") {
      const r = o();
      document.documentElement.classList.remove("light", "dark"), document.documentElement.classList.add(r);
    }
  }), createComponent(xr.Provider, { value: { theme: t, setTheme: n, resolvedTheme: o }, get children() {
    return e.children;
  } });
};
function tc() {
  const e = useContext(xr);
  if (!e) throw new Error("useTheme must be used within ThemeProvider");
  return e;
}
function Bl() {
  let e = /* @__PURE__ */ new Set();
  function t(r) {
    return e.add(r), () => e.delete(r);
  }
  let n = false;
  function o(r, i) {
    if (n) return !(n = false);
    const s = { to: r, options: i, defaultPrevented: false, preventDefault: () => s.defaultPrevented = true };
    for (const l of e) l.listener({ ...s, from: l.location, retry: (c) => {
      c && (n = true), l.navigate(r, { ...i, resolve: false });
    } });
    return !s.defaultPrevented;
  }
  return { subscribe: t, confirm: o };
}
let Yt;
function Er() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), Yt = window.history.state._depth;
}
isServer || Er();
function nc(e) {
  return { ...e, _depth: window.history.state && window.history.state._depth };
}
function oc(e, t) {
  let n = false;
  return () => {
    const o = Yt;
    Er();
    const r = o == null ? null : Yt - o;
    if (n) {
      n = false;
      return;
    }
    r && t(r) ? (n = true, window.history.go(-r)) : e();
  };
}
const Vl = /^(?:[a-z0-9]+:)?\/\//i, Nl = /^\/+|(\/)\/+$/g, _l = "http://sr";
function Ze(e, t = false) {
  const n = e.replace(Nl, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function ht(e, t, n) {
  if (Vl.test(t)) return;
  const o = Ze(e), r = n && Ze(n);
  let i = "";
  return !r || t.startsWith("/") ? i = o : r.toLowerCase().indexOf(o.toLowerCase()) !== 0 ? i = o + r : i = r, (i || "/") + Ze(t, !i);
}
function $l(e, t) {
  if (e == null) throw new Error(t);
  return e;
}
function Wl(e, t) {
  return Ze(e).replace(/\/*(\*.*)?$/g, "") + Ze(t);
}
function Dr(e) {
  const t = {};
  return e.searchParams.forEach((n, o) => {
    o in t ? Array.isArray(t[o]) ? t[o].push(n) : t[o] = [t[o], n] : t[o] = n;
  }), t;
}
function Ul(e, t, n) {
  const [o, r] = e.split("/*", 2), i = o.split("/").filter(Boolean), s = i.length;
  return (l) => {
    const c = l.split("/").filter(Boolean), a = c.length - s;
    if (a < 0 || a > 0 && r === void 0 && !t) return null;
    const u = { path: s ? "" : "/", params: {} }, d = (f) => n === void 0 ? void 0 : n[f];
    for (let f = 0; f < s; f++) {
      const g = i[f], h = g[0] === ":", m = h ? c[f] : c[f].toLowerCase(), y = h ? g.slice(1) : g.toLowerCase();
      if (h && Nt(m, d(y))) u.params[y] = m;
      else if (h || !Nt(m, y)) return null;
      u.path += `/${m}`;
    }
    if (r) {
      const f = a ? c.slice(-a).join("/") : "";
      if (Nt(f, d(r))) u.params[r] = f;
      else return null;
    }
    return u;
  };
}
function Nt(e, t) {
  const n = (o) => o === e;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function zl(e) {
  const [t, n] = e.pattern.split("/*", 2), o = t.split("/").filter(Boolean);
  return o.reduce((r, i) => r + (i.startsWith(":") ? 2 : 3), o.length - (n === void 0 ? 0 : 1));
}
function Tr(e) {
  const t = /* @__PURE__ */ new Map(), n = getOwner();
  return new Proxy({}, { get(o, r) {
    return t.has(r) || runWithOwner(n, () => t.set(r, createMemo(() => e()[r]))), t.get(r)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(e());
  }, has(o, r) {
    return r in e();
  } });
}
function Or(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let n = e.slice(0, t.index), o = e.slice(t.index + t[0].length);
  const r = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(o); ) r.push(n += t[1]), o = o.slice(t[0].length);
  return Or(o).reduce((i, s) => [...i, ...r.map((l) => l + s)], []);
}
const Hl = 100, jl = createContext(), Pr = createContext(), mn = () => $l(useContext(jl), "<A> and 'use' router primitives can be only used inside a Route."), ql = () => useContext(Pr) || mn().base, rc = (e) => {
  const t = ql();
  return createMemo(() => t.resolvePath(e()));
}, ic = (e) => {
  const t = mn();
  return createMemo(() => {
    const n = e();
    return n !== void 0 ? t.renderPath(n) : n;
  });
}, sc = () => mn().location;
function Yl(e, t = "") {
  const { component: n, preload: o, load: r, children: i, info: s } = e, l = !i || Array.isArray(i) && !i.length, c = { key: e, component: n, preload: o || r, info: s };
  return Cr(e.path).reduce((a, u) => {
    for (const d of Or(u)) {
      const f = Wl(t, d);
      let g = l ? f : f.split("/*", 1)[0];
      g = g.split("/").map((h) => h.startsWith(":") || h.startsWith("*") ? h : encodeURIComponent(h)).join("/"), a.push({ ...c, originalPath: u, pattern: g, matcher: Ul(g, !l, e.matchFilters) });
    }
    return a;
  }, []);
}
function Xl(e, t = 0) {
  return { routes: e, score: zl(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const o = [];
    for (let r = e.length - 1; r >= 0; r--) {
      const i = e[r], s = i.matcher(n);
      if (!s) return null;
      o.unshift({ ...s, route: i });
    }
    return o;
  } };
}
function Cr(e) {
  return Array.isArray(e) ? e : [e];
}
function Gl(e, t = "", n = [], o = []) {
  const r = Cr(e);
  for (let i = 0, s = r.length; i < s; i++) {
    const l = r[i];
    if (l && typeof l == "object") {
      l.hasOwnProperty("path") || (l.path = "");
      const c = Yl(l, t);
      for (const a of c) {
        n.push(a);
        const u = Array.isArray(l.children) && l.children.length === 0;
        if (l.children && !u) Gl(l.children, a.pattern, n, o);
        else {
          const d = Xl([...n], o.length);
          o.push(d);
        }
        n.pop();
      }
    }
  }
  return n.length ? o : o.sort((i, s) => s.score - i.score);
}
function _t(e, t) {
  for (let n = 0, o = e.length; n < o; n++) {
    const r = e[n].matcher(t);
    if (r) return r;
  }
  return [];
}
function Zl(e, t, n) {
  const o = new URL(_l), r = createMemo((u) => {
    const d = e();
    try {
      return new URL(d, o);
    } catch {
      return console.error(`Invalid path ${d}`), u;
    }
  }, o, { equals: (u, d) => u.href === d.href }), i = createMemo(() => r().pathname), s = createMemo(() => r().search, true), l = createMemo(() => r().hash), c = () => "", a = on$1(s, () => Dr(r()));
  return { get pathname() {
    return i();
  }, get search() {
    return s();
  }, get hash() {
    return l();
  }, get state() {
    return t();
  }, get key() {
    return c();
  }, query: n ? n(a) : Tr(a) };
}
let Le;
function lc() {
  return Le;
}
function cc(e, t, n, o = {}) {
  const { signal: [r, i], utils: s = {} } = e, l = s.parsePath || ((O) => O), c = s.renderPath || ((O) => O), a = s.beforeLeave || Bl(), u = ht("", o.base || "");
  if (u === void 0) throw new Error(`${u} is not a valid base path`);
  u && !r().value && i({ value: u, replace: true, scroll: false });
  const [d, f] = createSignal(false);
  let g;
  const h = (O, C) => {
    C.value === m() && C.state === v() || (g === void 0 && f(true), Le = O, g = C, startTransition(() => {
      g === C && (y(g.value), p(g.state), resetErrorBoundaries(), isServer || S[1]((B) => B.filter((W) => W.pending)));
    }).finally(() => {
      g === C && batch(() => {
        Le = void 0, O === "navigate" && V(g), f(false), g = void 0;
      });
    }));
  }, [m, y] = createSignal(r().value), [v, p] = createSignal(r().state), w = Zl(m, v, s.queryWrapper), x = [], S = createSignal(isServer ? A() : []), L = createMemo(() => typeof o.transformUrl == "function" ? _t(t(), o.transformUrl(w.pathname)) : _t(t(), w.pathname)), T = () => {
    const O = L(), C = {};
    for (let B = 0; B < O.length; B++) Object.assign(C, O[B].params);
    return C;
  }, D = s.paramsWrapper ? s.paramsWrapper(T, t) : Tr(T), M = { pattern: u, path: () => u, outlet: () => null, resolvePath(O) {
    return ht(u, O);
  } };
  return createRenderEffect(on$1(r, (O) => h("native", O), { defer: true })), { base: M, location: w, params: D, isRouting: d, renderPath: c, parsePath: l, navigatorFactory: U, matches: L, beforeLeave: a, preloadRoute: Z, singleFlight: o.singleFlight === void 0 ? true : o.singleFlight, submissions: S };
  function $(O, C, B) {
    untrack(() => {
      if (typeof C == "number") {
        C && (s.go ? s.go(C) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const W = !C || C[0] === "?", { replace: G, resolve: oe, scroll: Me, state: Se } = { replace: false, resolve: !W, scroll: true, ...B }, xe = oe ? O.resolvePath(C) : ht(W && w.pathname || "", C);
      if (xe === void 0) throw new Error(`Path '${C}' is not a routable path`);
      if (x.length >= Hl) throw new Error("Too many redirects");
      const ct = m();
      if (xe !== ct || Se !== v()) if (isServer) {
        const ze = getRequestEvent();
        ze && (ze.response = { status: 302, headers: new Headers({ Location: xe }) }), i({ value: xe, replace: G, scroll: Me, state: Se });
      } else a.confirm(xe, B) && (x.push({ value: ct, replace: G, scroll: Me, state: v() }), h("navigate", { value: xe, state: Se }));
    });
  }
  function U(O) {
    return O = O || useContext(Pr) || M, (C, B) => $(O, C, B);
  }
  function V(O) {
    const C = x[0];
    C && (i({ ...O, replace: C.replace, scroll: C.scroll }), x.length = 0);
  }
  function Z(O, C) {
    const B = _t(t(), O.pathname), W = Le;
    Le = "preload";
    for (let G in B) {
      const { route: oe, params: Me } = B[G];
      oe.component && oe.component.preload && oe.component.preload();
      const { preload: Se } = oe;
      C && Se && runWithOwner(n(), () => Se({ params: Me, location: { pathname: O.pathname, search: O.search, hash: O.hash, query: Dr(O), state: null, key: "" }, intent: "preload" }));
    }
    Le = W;
  }
  function A() {
    const O = getRequestEvent();
    return O && O.router && O.router.submission ? [O.router.submission] : [];
  }
}
function ac(e, t, n, o) {
  const { base: r, location: i, params: s } = e, { pattern: l, component: c, preload: a } = o().route, u = createMemo(() => o().path);
  c && c.preload && c.preload();
  const d = a ? a({ params: s, location: i, intent: Le || "initial" }) : void 0;
  return { parent: t, pattern: l, path: u, outlet: () => c ? createComponent$1(c, { params: s, location: i, data: d, get children() {
    return n();
  } }) : n(), resolvePath(g) {
    return ht(r.path(), g, u());
  } };
}

export { Bl as B, Er as E, Gl as G, Pr as P, Ze as Z, _l as _, ac as a, _t as b, cc as c, ec as e, ic as i, jl as j, lc as l, nc as n, oc as o, rc as r, sc as s, tc as t, xi as x };
//# sourceMappingURL=routing-CyxMTkit.mjs.map

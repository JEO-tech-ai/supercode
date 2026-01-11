import { ssr, ssrHydrationKey, escape, createComponent, mergeProps, ssrElement } from 'solid-js/web';
import { For, splitProps, mergeProps as mergeProps$1, createMemo } from 'solid-js';
import { a as ac, r as rc, B as Bi, n as nc, o as oc, Z as Ze$1 } from '../nitro/nitro.mjs';

function T(e) {
  e = mergeProps$1({ inactiveClass: "inactive", activeClass: "active" }, e);
  const [, r] = splitProps(e, ["href", "state", "class", "activeClass", "inactiveClass", "end"]), t = nc(() => e.href), o = oc(t), a = rc(), n = createMemo(() => {
    const i = t();
    if (i === void 0) return [false, false];
    const s = Ze$1(i.split(/[?#]/, 1)[0]).toLowerCase(), c = decodeURI(Ze$1(a.pathname).toLowerCase());
    return [e.end ? s === c : c.startsWith(s + "/") || c === s, s === c];
  });
  return ssrElement("a", mergeProps(r, { get href() {
    return o() || e.href;
  }, get state() {
    return JSON.stringify(e.state);
  }, get classList() {
    return { ...e.class && { [e.class]: true }, [e.inactiveClass]: !n()[0], [e.activeClass]: n()[0], ...r.classList };
  }, link: true, get "aria-current"() {
    return n()[1] ? "page" : void 0;
  } }), void 0, true);
}
function ue(e) {
  var r, t, o = "";
  if (typeof e == "string" || typeof e == "number") o += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var a = e.length;
    for (r = 0; r < a; r++) e[r] && (t = ue(e[r])) && (o && (o += " "), o += t);
  } else for (t in e) e[t] && (o && (o += " "), o += t);
  return o;
}
function pe() {
  for (var e, r, t = 0, o = "", a = arguments.length; t < a; t++) (e = arguments[t]) && (r = ue(e)) && (o && (o += " "), o += r);
  return o;
}
const se = (e) => typeof e == "boolean" ? `${e}` : e === 0 ? "0" : e, ae = pe, Se = (e, r) => (t) => {
  var o;
  if ((r == null ? void 0 : r.variants) == null) return ae(e, t == null ? void 0 : t.class, t == null ? void 0 : t.className);
  const { variants: a, defaultVariants: n } = r, i = Object.keys(a).map((d) => {
    const g = t == null ? void 0 : t[d], h = n == null ? void 0 : n[d];
    if (g === null) return null;
    const m = se(g) || se(h);
    return a[d][m];
  }), s = t && Object.entries(t).reduce((d, g) => {
    let [h, m] = g;
    return m === void 0 || (d[h] = m), d;
  }, {}), c = r == null || (o = r.compoundVariants) === null || o === void 0 ? void 0 : o.reduce((d, g) => {
    let { class: h, className: m, ...w } = g;
    return Object.entries(w).every((y) => {
      let [f, u] = y;
      return Array.isArray(u) ? u.includes({ ...n, ...s }[f]) : { ...n, ...s }[f] === u;
    }) ? [...d, h, m] : d;
  }, []);
  return ae(e, i, c, t == null ? void 0 : t.class, t == null ? void 0 : t.className);
}, X = "-", Ae = (e) => {
  const r = Pe(e), { conflictingClassGroups: t, conflictingClassGroupModifiers: o } = e;
  return { getClassGroupId: (i) => {
    const s = i.split(X);
    return s[0] === "" && s.length !== 1 && s.shift(), be(s, r) || Me(i);
  }, getConflictingClassGroupIds: (i, s) => {
    const c = t[i] || [];
    return s && o[i] ? [...c, ...o[i]] : c;
  } };
}, be = (e, r) => {
  var _a;
  if (e.length === 0) return r.classGroupId;
  const t = e[0], o = r.nextPart.get(t), a = o ? be(e.slice(1), o) : void 0;
  if (a) return a;
  if (r.validators.length === 0) return;
  const n = e.join(X);
  return (_a = r.validators.find(({ validator: i }) => i(n))) == null ? void 0 : _a.classGroupId;
}, ie = /^\[(.+)\]$/, Me = (e) => {
  if (ie.test(e)) {
    const r = ie.exec(e)[1], t = r == null ? void 0 : r.substring(0, r.indexOf(":"));
    if (t) return "arbitrary.." + t;
  }
}, Pe = (e) => {
  const { theme: r, prefix: t } = e, o = { nextPart: /* @__PURE__ */ new Map(), validators: [] };
  return Ne(Object.entries(e.classGroups), t).forEach(([n, i]) => {
    q(i, o, n, r);
  }), o;
}, q = (e, r, t, o) => {
  e.forEach((a) => {
    if (typeof a == "string") {
      const n = a === "" ? r : le(r, a);
      n.classGroupId = t;
      return;
    }
    if (typeof a == "function") {
      if (Ge(a)) {
        q(a(o), r, t, o);
        return;
      }
      r.validators.push({ validator: a, classGroupId: t });
      return;
    }
    Object.entries(a).forEach(([n, i]) => {
      q(i, le(r, n), t, o);
    });
  });
}, le = (e, r) => {
  let t = e;
  return r.split(X).forEach((o) => {
    t.nextPart.has(o) || t.nextPart.set(o, { nextPart: /* @__PURE__ */ new Map(), validators: [] }), t = t.nextPart.get(o);
  }), t;
}, Ge = (e) => e.isThemeGetter, Ne = (e, r) => r ? e.map(([t, o]) => {
  const a = o.map((n) => typeof n == "string" ? r + n : typeof n == "object" ? Object.fromEntries(Object.entries(n).map(([i, s]) => [r + i, s])) : n);
  return [t, a];
}) : e, Re = (e) => {
  if (e < 1) return { get: () => {
  }, set: () => {
  } };
  let r = 0, t = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  const a = (n, i) => {
    t.set(n, i), r++, r > e && (r = 0, o = t, t = /* @__PURE__ */ new Map());
  };
  return { get(n) {
    let i = t.get(n);
    if (i !== void 0) return i;
    if ((i = o.get(n)) !== void 0) return a(n, i), i;
  }, set(n, i) {
    t.has(n) ? t.set(n, i) : a(n, i);
  } };
}, ge = "!", je = (e) => {
  const { separator: r, experimentalParseClassName: t } = e, o = r.length === 1, a = r[0], n = r.length, i = (s) => {
    const c = [];
    let d = 0, g = 0, h;
    for (let u = 0; u < s.length; u++) {
      let v = s[u];
      if (d === 0) {
        if (v === a && (o || s.slice(u, u + n) === r)) {
          c.push(s.slice(g, u)), g = u + n;
          continue;
        }
        if (v === "/") {
          h = u;
          continue;
        }
      }
      v === "[" ? d++ : v === "]" && d--;
    }
    const m = c.length === 0 ? s : s.substring(g), w = m.startsWith(ge), y = w ? m.substring(1) : m, f = h && h > g ? h - g : void 0;
    return { modifiers: c, hasImportantModifier: w, baseClassName: y, maybePostfixModifierPosition: f };
  };
  return t ? (s) => t({ className: s, parseClassName: i }) : i;
}, Ie = (e) => {
  if (e.length <= 1) return e;
  const r = [];
  let t = [];
  return e.forEach((o) => {
    o[0] === "[" ? (r.push(...t.sort(), o), t = []) : t.push(o);
  }), r.push(...t.sort()), r;
}, $e = (e) => ({ cache: Re(e.cacheSize), parseClassName: je(e), ...Ae(e) }), Te = /\s+/, Le = (e, r) => {
  const { parseClassName: t, getClassGroupId: o, getConflictingClassGroupIds: a } = r, n = [], i = e.trim().split(Te);
  let s = "";
  for (let c = i.length - 1; c >= 0; c -= 1) {
    const d = i[c], { modifiers: g, hasImportantModifier: h, baseClassName: m, maybePostfixModifierPosition: w } = t(d);
    let y = !!w, f = o(y ? m.substring(0, w) : m);
    if (!f) {
      if (!y) {
        s = d + (s.length > 0 ? " " + s : s);
        continue;
      }
      if (f = o(m), !f) {
        s = d + (s.length > 0 ? " " + s : s);
        continue;
      }
      y = false;
    }
    const u = Ie(g).join(":"), v = h ? u + ge : u, x = v + f;
    if (n.includes(x)) continue;
    n.push(x);
    const R = a(f, y);
    for (let P = 0; P < R.length; ++P) {
      const L = R[P];
      n.push(v + L);
    }
    s = d + (s.length > 0 ? " " + s : s);
  }
  return s;
};
function Ee() {
  let e = 0, r, t, o = "";
  for (; e < arguments.length; ) (r = arguments[e++]) && (t = fe(r)) && (o && (o += " "), o += t);
  return o;
}
const fe = (e) => {
  if (typeof e == "string") return e;
  let r, t = "";
  for (let o = 0; o < e.length; o++) e[o] && (r = fe(e[o])) && (t && (t += " "), t += r);
  return t;
};
function Ve(e, ...r) {
  let t, o, a, n = i;
  function i(c) {
    const d = r.reduce((g, h) => h(g), e());
    return t = $e(d), o = t.cache.get, a = t.cache.set, n = s, s(c);
  }
  function s(c) {
    const d = o(c);
    if (d) return d;
    const g = Le(c, t);
    return a(c, g), g;
  }
  return function() {
    return n(Ee.apply(null, arguments));
  };
}
const p = (e) => {
  const r = (t) => t[e] || [];
  return r.isThemeGetter = true, r;
}, me = /^\[(?:([a-z-]+):)?(.+)\]$/i, _e = /^\d+\/\d+$/, Oe = /* @__PURE__ */ new Set(["px", "full", "screen"]), We = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, Be = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, Ue = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, Fe = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, He = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, C = (e) => G(e) || Oe.has(e) || _e.test(e), z = (e) => N(e, "length", De), G = (e) => !!e && !Number.isNaN(Number(e)), H = (e) => N(e, "number", G), I = (e) => !!e && Number.isInteger(Number(e)), qe = (e) => e.endsWith("%") && G(e.slice(0, -1)), l = (e) => me.test(e), S = (e) => We.test(e), Je = /* @__PURE__ */ new Set(["length", "size", "percentage"]), Ke = (e) => N(e, Je, he), Xe = (e) => N(e, "position", he), Ze = /* @__PURE__ */ new Set(["image", "url"]), Qe = (e) => N(e, Ze, rr), Ye = (e) => N(e, "", er), $ = () => true, N = (e, r, t) => {
  const o = me.exec(e);
  return o ? o[1] ? typeof r == "string" ? o[1] === r : r.has(o[1]) : t(o[2]) : false;
}, De = (e) => Be.test(e) && !Ue.test(e), he = () => false, er = (e) => Fe.test(e), rr = (e) => He.test(e), tr = () => {
  const e = p("colors"), r = p("spacing"), t = p("blur"), o = p("brightness"), a = p("borderColor"), n = p("borderRadius"), i = p("borderSpacing"), s = p("borderWidth"), c = p("contrast"), d = p("grayscale"), g = p("hueRotate"), h = p("invert"), m = p("gap"), w = p("gradientColorStops"), y = p("gradientColorStopPositions"), f = p("inset"), u = p("margin"), v = p("opacity"), x = p("padding"), R = p("saturate"), P = p("scale"), L = p("sepia"), Q = p("skew"), Y = p("space"), D = p("translate"), W = () => ["auto", "contain", "none"], B = () => ["auto", "hidden", "clip", "visible", "scroll"], U = () => ["auto", l, r], b = () => [l, r], ee = () => ["", C, z], E = () => ["auto", G, l], re = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], V = () => ["solid", "dashed", "dotted", "double", "none"], te = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], F = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], j = () => ["", "0", l], oe = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], k = () => [G, l];
  return { cacheSize: 500, separator: ":", theme: { colors: [$], spacing: [C, z], blur: ["none", "", S, l], brightness: k(), borderColor: [e], borderRadius: ["none", "", "full", S, l], borderSpacing: b(), borderWidth: ee(), contrast: k(), grayscale: j(), hueRotate: k(), invert: j(), gap: b(), gradientColorStops: [e], gradientColorStopPositions: [qe, z], inset: U(), margin: U(), opacity: k(), padding: b(), saturate: k(), scale: k(), sepia: j(), skew: k(), space: b(), translate: b() }, classGroups: { aspect: [{ aspect: ["auto", "square", "video", l] }], container: ["container"], columns: [{ columns: [S] }], "break-after": [{ "break-after": oe() }], "break-before": [{ "break-before": oe() }], "break-inside": [{ "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] }], "box-decoration": [{ "box-decoration": ["slice", "clone"] }], box: [{ box: ["border", "content"] }], display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"], float: [{ float: ["right", "left", "none", "start", "end"] }], clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }], isolation: ["isolate", "isolation-auto"], "object-fit": [{ object: ["contain", "cover", "fill", "none", "scale-down"] }], "object-position": [{ object: [...re(), l] }], overflow: [{ overflow: B() }], "overflow-x": [{ "overflow-x": B() }], "overflow-y": [{ "overflow-y": B() }], overscroll: [{ overscroll: W() }], "overscroll-x": [{ "overscroll-x": W() }], "overscroll-y": [{ "overscroll-y": W() }], position: ["static", "fixed", "absolute", "relative", "sticky"], inset: [{ inset: [f] }], "inset-x": [{ "inset-x": [f] }], "inset-y": [{ "inset-y": [f] }], start: [{ start: [f] }], end: [{ end: [f] }], top: [{ top: [f] }], right: [{ right: [f] }], bottom: [{ bottom: [f] }], left: [{ left: [f] }], visibility: ["visible", "invisible", "collapse"], z: [{ z: ["auto", I, l] }], basis: [{ basis: U() }], "flex-direction": [{ flex: ["row", "row-reverse", "col", "col-reverse"] }], "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }], flex: [{ flex: ["1", "auto", "initial", "none", l] }], grow: [{ grow: j() }], shrink: [{ shrink: j() }], order: [{ order: ["first", "last", "none", I, l] }], "grid-cols": [{ "grid-cols": [$] }], "col-start-end": [{ col: ["auto", { span: ["full", I, l] }, l] }], "col-start": [{ "col-start": E() }], "col-end": [{ "col-end": E() }], "grid-rows": [{ "grid-rows": [$] }], "row-start-end": [{ row: ["auto", { span: [I, l] }, l] }], "row-start": [{ "row-start": E() }], "row-end": [{ "row-end": E() }], "grid-flow": [{ "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] }], "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", l] }], "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", l] }], gap: [{ gap: [m] }], "gap-x": [{ "gap-x": [m] }], "gap-y": [{ "gap-y": [m] }], "justify-content": [{ justify: ["normal", ...F()] }], "justify-items": [{ "justify-items": ["start", "end", "center", "stretch"] }], "justify-self": [{ "justify-self": ["auto", "start", "end", "center", "stretch"] }], "align-content": [{ content: ["normal", ...F(), "baseline"] }], "align-items": [{ items: ["start", "end", "center", "baseline", "stretch"] }], "align-self": [{ self: ["auto", "start", "end", "center", "stretch", "baseline"] }], "place-content": [{ "place-content": [...F(), "baseline"] }], "place-items": [{ "place-items": ["start", "end", "center", "baseline", "stretch"] }], "place-self": [{ "place-self": ["auto", "start", "end", "center", "stretch"] }], p: [{ p: [x] }], px: [{ px: [x] }], py: [{ py: [x] }], ps: [{ ps: [x] }], pe: [{ pe: [x] }], pt: [{ pt: [x] }], pr: [{ pr: [x] }], pb: [{ pb: [x] }], pl: [{ pl: [x] }], m: [{ m: [u] }], mx: [{ mx: [u] }], my: [{ my: [u] }], ms: [{ ms: [u] }], me: [{ me: [u] }], mt: [{ mt: [u] }], mr: [{ mr: [u] }], mb: [{ mb: [u] }], ml: [{ ml: [u] }], "space-x": [{ "space-x": [Y] }], "space-x-reverse": ["space-x-reverse"], "space-y": [{ "space-y": [Y] }], "space-y-reverse": ["space-y-reverse"], w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", l, r] }], "min-w": [{ "min-w": [l, r, "min", "max", "fit"] }], "max-w": [{ "max-w": [l, r, "none", "full", "min", "max", "fit", "prose", { screen: [S] }, S] }], h: [{ h: [l, r, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }], "min-h": [{ "min-h": [l, r, "min", "max", "fit", "svh", "lvh", "dvh"] }], "max-h": [{ "max-h": [l, r, "min", "max", "fit", "svh", "lvh", "dvh"] }], size: [{ size: [l, r, "auto", "min", "max", "fit"] }], "font-size": [{ text: ["base", S, z] }], "font-smoothing": ["antialiased", "subpixel-antialiased"], "font-style": ["italic", "not-italic"], "font-weight": [{ font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", H] }], "font-family": [{ font: [$] }], "fvn-normal": ["normal-nums"], "fvn-ordinal": ["ordinal"], "fvn-slashed-zero": ["slashed-zero"], "fvn-figure": ["lining-nums", "oldstyle-nums"], "fvn-spacing": ["proportional-nums", "tabular-nums"], "fvn-fraction": ["diagonal-fractions", "stacked-fractions"], tracking: [{ tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", l] }], "line-clamp": [{ "line-clamp": ["none", G, H] }], leading: [{ leading: ["none", "tight", "snug", "normal", "relaxed", "loose", C, l] }], "list-image": [{ "list-image": ["none", l] }], "list-style-type": [{ list: ["none", "disc", "decimal", l] }], "list-style-position": [{ list: ["inside", "outside"] }], "placeholder-color": [{ placeholder: [e] }], "placeholder-opacity": [{ "placeholder-opacity": [v] }], "text-alignment": [{ text: ["left", "center", "right", "justify", "start", "end"] }], "text-color": [{ text: [e] }], "text-opacity": [{ "text-opacity": [v] }], "text-decoration": ["underline", "overline", "line-through", "no-underline"], "text-decoration-style": [{ decoration: [...V(), "wavy"] }], "text-decoration-thickness": [{ decoration: ["auto", "from-font", C, z] }], "underline-offset": [{ "underline-offset": ["auto", C, l] }], "text-decoration-color": [{ decoration: [e] }], "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"], "text-overflow": ["truncate", "text-ellipsis", "text-clip"], "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }], indent: [{ indent: b() }], "vertical-align": [{ align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", l] }], whitespace: [{ whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"] }], break: [{ break: ["normal", "words", "all", "keep"] }], hyphens: [{ hyphens: ["none", "manual", "auto"] }], content: [{ content: ["none", l] }], "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }], "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }], "bg-opacity": [{ "bg-opacity": [v] }], "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }], "bg-position": [{ bg: [...re(), Xe] }], "bg-repeat": [{ bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] }], "bg-size": [{ bg: ["auto", "cover", "contain", Ke] }], "bg-image": [{ bg: ["none", { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] }, Qe] }], "bg-color": [{ bg: [e] }], "gradient-from-pos": [{ from: [y] }], "gradient-via-pos": [{ via: [y] }], "gradient-to-pos": [{ to: [y] }], "gradient-from": [{ from: [w] }], "gradient-via": [{ via: [w] }], "gradient-to": [{ to: [w] }], rounded: [{ rounded: [n] }], "rounded-s": [{ "rounded-s": [n] }], "rounded-e": [{ "rounded-e": [n] }], "rounded-t": [{ "rounded-t": [n] }], "rounded-r": [{ "rounded-r": [n] }], "rounded-b": [{ "rounded-b": [n] }], "rounded-l": [{ "rounded-l": [n] }], "rounded-ss": [{ "rounded-ss": [n] }], "rounded-se": [{ "rounded-se": [n] }], "rounded-ee": [{ "rounded-ee": [n] }], "rounded-es": [{ "rounded-es": [n] }], "rounded-tl": [{ "rounded-tl": [n] }], "rounded-tr": [{ "rounded-tr": [n] }], "rounded-br": [{ "rounded-br": [n] }], "rounded-bl": [{ "rounded-bl": [n] }], "border-w": [{ border: [s] }], "border-w-x": [{ "border-x": [s] }], "border-w-y": [{ "border-y": [s] }], "border-w-s": [{ "border-s": [s] }], "border-w-e": [{ "border-e": [s] }], "border-w-t": [{ "border-t": [s] }], "border-w-r": [{ "border-r": [s] }], "border-w-b": [{ "border-b": [s] }], "border-w-l": [{ "border-l": [s] }], "border-opacity": [{ "border-opacity": [v] }], "border-style": [{ border: [...V(), "hidden"] }], "divide-x": [{ "divide-x": [s] }], "divide-x-reverse": ["divide-x-reverse"], "divide-y": [{ "divide-y": [s] }], "divide-y-reverse": ["divide-y-reverse"], "divide-opacity": [{ "divide-opacity": [v] }], "divide-style": [{ divide: V() }], "border-color": [{ border: [a] }], "border-color-x": [{ "border-x": [a] }], "border-color-y": [{ "border-y": [a] }], "border-color-s": [{ "border-s": [a] }], "border-color-e": [{ "border-e": [a] }], "border-color-t": [{ "border-t": [a] }], "border-color-r": [{ "border-r": [a] }], "border-color-b": [{ "border-b": [a] }], "border-color-l": [{ "border-l": [a] }], "divide-color": [{ divide: [a] }], "outline-style": [{ outline: ["", ...V()] }], "outline-offset": [{ "outline-offset": [C, l] }], "outline-w": [{ outline: [C, z] }], "outline-color": [{ outline: [e] }], "ring-w": [{ ring: ee() }], "ring-w-inset": ["ring-inset"], "ring-color": [{ ring: [e] }], "ring-opacity": [{ "ring-opacity": [v] }], "ring-offset-w": [{ "ring-offset": [C, z] }], "ring-offset-color": [{ "ring-offset": [e] }], shadow: [{ shadow: ["", "inner", "none", S, Ye] }], "shadow-color": [{ shadow: [$] }], opacity: [{ opacity: [v] }], "mix-blend": [{ "mix-blend": [...te(), "plus-lighter", "plus-darker"] }], "bg-blend": [{ "bg-blend": te() }], filter: [{ filter: ["", "none"] }], blur: [{ blur: [t] }], brightness: [{ brightness: [o] }], contrast: [{ contrast: [c] }], "drop-shadow": [{ "drop-shadow": ["", "none", S, l] }], grayscale: [{ grayscale: [d] }], "hue-rotate": [{ "hue-rotate": [g] }], invert: [{ invert: [h] }], saturate: [{ saturate: [R] }], sepia: [{ sepia: [L] }], "backdrop-filter": [{ "backdrop-filter": ["", "none"] }], "backdrop-blur": [{ "backdrop-blur": [t] }], "backdrop-brightness": [{ "backdrop-brightness": [o] }], "backdrop-contrast": [{ "backdrop-contrast": [c] }], "backdrop-grayscale": [{ "backdrop-grayscale": [d] }], "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [g] }], "backdrop-invert": [{ "backdrop-invert": [h] }], "backdrop-opacity": [{ "backdrop-opacity": [v] }], "backdrop-saturate": [{ "backdrop-saturate": [R] }], "backdrop-sepia": [{ "backdrop-sepia": [L] }], "border-collapse": [{ border: ["collapse", "separate"] }], "border-spacing": [{ "border-spacing": [i] }], "border-spacing-x": [{ "border-spacing-x": [i] }], "border-spacing-y": [{ "border-spacing-y": [i] }], "table-layout": [{ table: ["auto", "fixed"] }], caption: [{ caption: ["top", "bottom"] }], transition: [{ transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", l] }], duration: [{ duration: k() }], ease: [{ ease: ["linear", "in", "out", "in-out", l] }], delay: [{ delay: k() }], animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", l] }], transform: [{ transform: ["", "gpu", "none"] }], scale: [{ scale: [P] }], "scale-x": [{ "scale-x": [P] }], "scale-y": [{ "scale-y": [P] }], rotate: [{ rotate: [I, l] }], "translate-x": [{ "translate-x": [D] }], "translate-y": [{ "translate-y": [D] }], "skew-x": [{ "skew-x": [Q] }], "skew-y": [{ "skew-y": [Q] }], "transform-origin": [{ origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", l] }], accent: [{ accent: ["auto", e] }], appearance: [{ appearance: ["none", "auto"] }], cursor: [{ cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", l] }], "caret-color": [{ caret: [e] }], "pointer-events": [{ "pointer-events": ["none", "auto"] }], resize: [{ resize: ["none", "y", "x", ""] }], "scroll-behavior": [{ scroll: ["auto", "smooth"] }], "scroll-m": [{ "scroll-m": b() }], "scroll-mx": [{ "scroll-mx": b() }], "scroll-my": [{ "scroll-my": b() }], "scroll-ms": [{ "scroll-ms": b() }], "scroll-me": [{ "scroll-me": b() }], "scroll-mt": [{ "scroll-mt": b() }], "scroll-mr": [{ "scroll-mr": b() }], "scroll-mb": [{ "scroll-mb": b() }], "scroll-ml": [{ "scroll-ml": b() }], "scroll-p": [{ "scroll-p": b() }], "scroll-px": [{ "scroll-px": b() }], "scroll-py": [{ "scroll-py": b() }], "scroll-ps": [{ "scroll-ps": b() }], "scroll-pe": [{ "scroll-pe": b() }], "scroll-pt": [{ "scroll-pt": b() }], "scroll-pr": [{ "scroll-pr": b() }], "scroll-pb": [{ "scroll-pb": b() }], "scroll-pl": [{ "scroll-pl": b() }], "snap-align": [{ snap: ["start", "end", "center", "align-none"] }], "snap-stop": [{ snap: ["normal", "always"] }], "snap-type": [{ snap: ["none", "x", "y", "both"] }], "snap-strictness": [{ snap: ["mandatory", "proximity"] }], touch: [{ touch: ["auto", "none", "manipulation"] }], "touch-x": [{ "touch-pan": ["x", "left", "right"] }], "touch-y": [{ "touch-pan": ["y", "up", "down"] }], "touch-pz": ["touch-pinch-zoom"], select: [{ select: ["none", "text", "all", "auto"] }], "will-change": [{ "will-change": ["auto", "scroll", "contents", "transform", l] }], fill: [{ fill: [e, "none"] }], "stroke-w": [{ stroke: [C, z, H] }], stroke: [{ stroke: [e, "none"] }], sr: ["sr-only", "not-sr-only"], "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }] }, conflictingClassGroups: { overflow: ["overflow-x", "overflow-y"], overscroll: ["overscroll-x", "overscroll-y"], inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"], "inset-x": ["right", "left"], "inset-y": ["top", "bottom"], flex: ["basis", "grow", "shrink"], gap: ["gap-x", "gap-y"], p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"], px: ["pr", "pl"], py: ["pt", "pb"], m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"], mx: ["mr", "ml"], my: ["mt", "mb"], size: ["w", "h"], "font-size": ["leading"], "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"], "fvn-ordinal": ["fvn-normal"], "fvn-slashed-zero": ["fvn-normal"], "fvn-figure": ["fvn-normal"], "fvn-spacing": ["fvn-normal"], "fvn-fraction": ["fvn-normal"], "line-clamp": ["display", "overflow"], rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"], "rounded-s": ["rounded-ss", "rounded-es"], "rounded-e": ["rounded-se", "rounded-ee"], "rounded-t": ["rounded-tl", "rounded-tr"], "rounded-r": ["rounded-tr", "rounded-br"], "rounded-b": ["rounded-br", "rounded-bl"], "rounded-l": ["rounded-tl", "rounded-bl"], "border-spacing": ["border-spacing-x", "border-spacing-y"], "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"], "border-w-x": ["border-w-r", "border-w-l"], "border-w-y": ["border-w-t", "border-w-b"], "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"], "border-color-x": ["border-color-r", "border-color-l"], "border-color-y": ["border-color-t", "border-color-b"], "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"], "scroll-mx": ["scroll-mr", "scroll-ml"], "scroll-my": ["scroll-mt", "scroll-mb"], "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"], "scroll-px": ["scroll-pr", "scroll-pl"], "scroll-py": ["scroll-pt", "scroll-pb"], touch: ["touch-x", "touch-y", "touch-pz"], "touch-x": ["touch"], "touch-y": ["touch"], "touch-pz": ["touch"] }, conflictingClassGroupModifiers: { "font-size": ["leading"] } };
}, or = Ve(tr);
function Z(...e) {
  return or(pe(e));
}
const nr = Se("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/90", destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90", outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost: "hover:bg-accent hover:text-accent-foreground", link: "text-primary underline-offset-4 hover:underline" }, size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10" } }, defaultVariants: { variant: "default", size: "default" } }), sr = (e) => {
  const [r, t] = splitProps(e, ["variant", "size", "class"]);
  return createComponent(Bi, mergeProps({ get class() {
    return Z(nr({ variant: r.variant, size: r.size }), r.class);
  } }, t));
}, gr = (e) => {
  const [r, t] = splitProps(e, ["class", "children"]);
  return ssrElement("div", mergeProps({ get class() {
    return Z("rounded-lg border bg-background text-foreground shadow-sm", r.class);
  } }, t), () => escape(r.children), true);
};
var ar = ["<span", ' class="text-xl font-bold">SuperCoin</span>'], ir = ["<header", ' class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"><div class="container flex h-14 items-center"><div class="mr-4 flex"><!--$-->', '<!--/--><nav class="flex items-center space-x-6 text-sm font-medium"><!--$-->', "<!--/--><!--$-->", "<!--/--><!--$-->", '<!--/--></nav></div><div class="flex flex-1 items-center justify-end space-x-2">', "</div></div></header>"];
const fr = () => {
  const { resolvedTheme: e, setTheme: r } = ac();
  return ssr(ir, ssrHydrationKey(), escape(createComponent(T, { href: "/", class: "mr-6 flex items-center space-x-2", get children() {
    return ssr(ar, ssrHydrationKey());
  } })), escape(createComponent(T, { href: "/models", class: "text-muted-foreground transition-colors hover:text-foreground", children: "Models" })), escape(createComponent(T, { href: "/agents", class: "text-muted-foreground transition-colors hover:text-foreground", children: "Agents" })), escape(createComponent(T, { href: "/settings", class: "text-muted-foreground transition-colors hover:text-foreground", children: "Settings" })), escape(createComponent(sr, { variant: "ghost", size: "sm", onClick: () => r(e() === "dark" ? "light" : "dark"), get children() {
    return e() === "dark" ? "Light" : "Dark";
  } })));
};
var lr = ["<aside", ' class="hidden w-64 shrink-0 border-r border-border md:block"><div class="flex h-full flex-col gap-2 p-4">', "</div></aside>"], cr = ["<span", ' class="w-5">', "</span>"];
const dr = [{ href: "/", label: "Dashboard", icon: "Home" }, { href: "/models", label: "Models", icon: "Cpu" }, { href: "/agents", label: "Agents", icon: "Bot" }, { href: "/settings", label: "Settings", icon: "Settings" }], mr = () => {
  const e = rc();
  return ssr(lr, ssrHydrationKey(), escape(createComponent(For, { each: dr, children: (r) => createComponent(T, { get href() {
    return r.href;
  }, get class() {
    return Z("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", e.pathname === r.href ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground");
  }, get children() {
    return [ssr(cr, ssrHydrationKey(), escape(r.icon)), r.label];
  } }) })));
};

export { Z, fr as f, gr as g, mr as m, sr as s };
//# sourceMappingURL=sidebar-CESMpzIE.mjs.map

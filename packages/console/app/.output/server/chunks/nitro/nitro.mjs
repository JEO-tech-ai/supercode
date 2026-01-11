import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import invariant from 'vinxi/lib/invariant';
import { virtualId, handlerModule, join as join$1 } from 'vinxi/lib/path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { sharedConfig, lazy, createComponent, useContext, createContext as createContext$1, splitProps, createMemo, mergeProps as mergeProps$1, createSignal, createEffect, createUniqueId, onCleanup, Show, Switch, Match, untrack, onMount, on as on$3, createComputed, children, For, $TRACK, createRoot, createRenderEffect, getOwner, DEV, runWithOwner, startTransition, resetErrorBoundaries, batch, catchError, ErrorBoundary, Suspense } from 'solid-js';
import { renderToString, getRequestEvent, isServer, ssrElement, escape, mergeProps, ssr, createComponent as createComponent$1, Dynamic, Portal, ssrHydrationKey, ssrAttribute, ssrStyle, ssrStyleProperty, renderToStream, NoHydration, useAssets, Hydration, HydrationScript, delegateEvents } from 'solid-js/web';
import { provideRequestEvent } from 'solid-js/web/storage';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = {};
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$1(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m$1(e._destroy,t._destroy);}};function _$3(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$1.prototype),c}function m$1(...n){return function(...e){for(const t of n)t(...e);}}const g$1=_$3();let A$2 = class A extends g$1{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}};let y$2 = class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A$2;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}};function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}let w$1 = class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}};const E$1=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E$1,t=Array.isArray(n)||H$3(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H$3(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S$1=new Set([101,204,205,304]);async function b$2(n,e){const t=new y$2,r=new w$1(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S$1.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C$1(n,e,t={}){try{const r=await b$2(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}
function getRequestIP(event, opts = {}) {
  if (event.context.clientAddress) {
    return event.context.clientAddress;
  }
  if (opts.xForwardedFor) {
    const xForwardedFor = getRequestHeader(event, "x-forwarded-for")?.split(",").shift()?.trim();
    if (xForwardedFor) {
      return xForwardedFor;
    }
  }
  if (event.node.req.socket.remoteAddress) {
    return event.node.req.socket.remoteAddress;
  }
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !String(event.node.req.headers["transfer-encoding"] ?? "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked")) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$1(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeaders(event) {
  return event.node.res.getHeaders();
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  if (!isEventHandler(input)) {
    console.warn(
      "[h3] Implicit event handler conversion is deprecated. Use `eventHandler()` or `fromNodeMiddleware()` to define event handlers.",
      _route && _route !== "/" ? `
     Route: ${_route}` : "",
      `
     Handler: ${input}`
    );
  }
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _reqPath = event._path || event.node.req.url || "/";
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler, void 0, path);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$2=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$2;
const AbortController = globalThis.AbortController || i;
createFetch({ fetch, Headers: Headers$1, AbortController });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s$1="base64url";function digest(t){if(e)return e(r,t,s$1);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s$1):o.digest(s$1)}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {};



const appConfig$1 = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {
      "/_build/assets/**": {
        "headers": {
          "cache-control": "public, immutable, max-age=31536000"
        }
      }
    }
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  {
    return _sharedRuntimeConfig;
  }
}
_deepFreeze(klona(appConfig$1));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

const nitroAsyncContext = getContext("nitro-app", {
  asyncContext: true,
  AsyncLocalStorage: AsyncLocalStorage 
});

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const appConfig = {"name":"vinxi","routers":[{"name":"public","type":"static","base":"/","dir":"./public","root":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app","order":0,"outDir":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app/.vinxi/build/public"},{"name":"ssr","type":"http","link":{"client":"client"},"handler":"src/entry-server.tsx","extensions":["js","jsx","ts","tsx"],"target":"server","root":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app","base":"/","outDir":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app/.vinxi/build/ssr","order":1},{"name":"client","type":"client","base":"/_build","handler":"src/entry-client.tsx","extensions":["js","jsx","ts","tsx"],"target":"browser","root":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app","outDir":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app/.vinxi/build/client","order":2},{"name":"server-fns","type":"http","base":"/_server","handler":"../../../node_modules/.bun/@solidjs+start@1.2.1+ceee086dfca541e6/node_modules/@solidjs/start/dist/runtime/server-handler.js","target":"server","root":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app","outDir":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app/.vinxi/build/server-fns","order":3}],"server":{"compressPublicAssets":{"brotli":true},"routeRules":{"/_build/assets/**":{"headers":{"cache-control":"public, immutable, max-age=31536000"}}},"experimental":{"asyncContext":true}},"root":"/Users/jangyoung/Documents/Github/supercoin/packages/console/app"};
					const buildManifest = {"ssr":{"_sidebar-CESMpzIE.js":{"file":"assets/sidebar-CESMpzIE.js","name":"sidebar","imports":["_theme-DxICwFO7.js"]},"_theme-DxICwFO7.js":{"file":"assets/theme-DxICwFO7.js","name":"theme"},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"index.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-CESMpzIE.js","_theme-DxICwFO7.js"]},"src/routes/api/[...path].ts?pick=GET":{"file":"_...path_.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/api/[...path].ts?pick=POST":{"file":"_...path_2.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/api/health.ts?pick=GET":{"file":"health.js","name":"health","src":"src/routes/api/health.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/index.tsx?pick=default&pick=$css":{"file":"index2.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-CESMpzIE.js","_theme-DxICwFO7.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"index3.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-CESMpzIE.js","_theme-DxICwFO7.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"index4.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-CESMpzIE.js","_theme-DxICwFO7.js"]},"virtual:$vinxi/handler/ssr":{"file":"ssr.js","name":"ssr","src":"virtual:$vinxi/handler/ssr","isEntry":true,"imports":["_theme-DxICwFO7.js"],"dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=POST","src/routes/api/[...path].ts?pick=POST","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css"],"css":["assets/ssr-eAiMNyRJ.css"]}},"client":{"_sidebar-einHe0E2.js":{"file":"assets/sidebar-einHe0E2.js","name":"sidebar","imports":["_theme-CVLqWykU.js"]},"_theme-CVLqWykU.js":{"file":"assets/theme-CVLqWykU.js","name":"theme"},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"assets/index-B9LD-gYd.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_theme-CVLqWykU.js","_sidebar-einHe0E2.js"]},"src/routes/index.tsx?pick=default&pick=$css":{"file":"assets/index-CxCvUa7W.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_theme-CVLqWykU.js","_sidebar-einHe0E2.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"assets/index-CnsptRuy.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_theme-CVLqWykU.js","_sidebar-einHe0E2.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"assets/index-ClPRpPTX.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_theme-CVLqWykU.js","_sidebar-einHe0E2.js"]},"virtual:$vinxi/handler/client":{"file":"assets/client-SrRtGryf.js","name":"client","src":"virtual:$vinxi/handler/client","isEntry":true,"imports":["_theme-CVLqWykU.js"],"dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css"],"css":["assets/client-eAiMNyRJ.css"]}},"server-fns":{"_routing-CyxMTkit.js":{"file":"assets/routing-CyxMTkit.js","name":"routing"},"_server-fns-Dk_jt6UL.js":{"file":"assets/server-fns-Dk_jt6UL.js","name":"server-fns","dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=POST","src/routes/api/[...path].ts?pick=POST","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/app.tsx"]},"_sidebar-DLFaXUjq.js":{"file":"assets/sidebar-DLFaXUjq.js","name":"sidebar","imports":["_routing-CyxMTkit.js"]},"src/app.tsx":{"file":"assets/app-pNGYNBBG.js","name":"app","src":"src/app.tsx","isDynamicEntry":true,"imports":["_server-fns-Dk_jt6UL.js","_routing-CyxMTkit.js"],"css":["assets/app-eAiMNyRJ.css"]},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"index.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-DLFaXUjq.js","_routing-CyxMTkit.js"]},"src/routes/api/[...path].ts?pick=GET":{"file":"_...path_.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/api/[...path].ts?pick=POST":{"file":"_...path_2.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/api/health.ts?pick=GET":{"file":"health.js","name":"health","src":"src/routes/api/health.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/index.tsx?pick=default&pick=$css":{"file":"index2.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-DLFaXUjq.js","_routing-CyxMTkit.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"index3.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-DLFaXUjq.js","_routing-CyxMTkit.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"index4.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-DLFaXUjq.js","_routing-CyxMTkit.js"]},"virtual:$vinxi/handler/server-fns":{"file":"server-fns.js","name":"server-fns","src":"virtual:$vinxi/handler/server-fns","isEntry":true,"imports":["_server-fns-Dk_jt6UL.js"]}}};

					const routeManifest = {"ssr":{},"client":{},"server-fns":{}};

        function createProdApp(appConfig) {
          return {
            config: { ...appConfig, buildManifest, routeManifest },
            getRouter(name) {
              return appConfig.routers.find(router => router.name === name)
            }
          }
        }

        function plugin$2(app) {
          const prodApp = createProdApp(appConfig);
          globalThis.app = prodApp;
        }

function plugin$1(app) {
	globalThis.$handle = (event) => app.h3App.handler(event);
}

/**
 * Traverses the module graph and collects assets for a given chunk
 *
 * @param {any} manifest Client manifest
 * @param {string} id Chunk id
 * @param {Map<string, string[]>} assetMap Cache of assets
 * @param {string[]} stack Stack of chunk ids to prevent circular dependencies
 * @returns Array of asset URLs
 */
function findAssetsInViteManifest(manifest, id, assetMap = new Map(), stack = []) {
	if (stack.includes(id)) {
		return [];
	}

	const cached = assetMap.get(id);
	if (cached) {
		return cached;
	}
	const chunk = manifest[id];
	if (!chunk) {
		return [];
	}

	const assets = [
		...(chunk.assets?.filter(Boolean) || []),
		...(chunk.css?.filter(Boolean) || [])
	];
	if (chunk.imports) {
		stack.push(id);
		for (let i = 0, l = chunk.imports.length; i < l; i++) {
			assets.push(...findAssetsInViteManifest(manifest, chunk.imports[i], assetMap, stack));
		}
		stack.pop();
	}
	assets.push(chunk.file);
	const all = Array.from(new Set(assets));
	assetMap.set(id, all);

	return all;
}

/** @typedef {import("../app.js").App & { config: { buildManifest: { [key:string]: any } }}} ProdApp */

function createHtmlTagsForAssets(router, app, assets) {
	return assets
		.filter(
			(asset) =>
				asset.endsWith(".css") ||
				asset.endsWith(".js") ||
				asset.endsWith(".mjs"),
		)
		.map((asset) => ({
			tag: "link",
			attrs: {
				href: joinURL(app.config.server.baseURL ?? "/", router.base, asset),
				key: join$1(app.config.server.baseURL ?? "", router.base, asset),
				...(asset.endsWith(".css")
					? { rel: "stylesheet", fetchPriority: "high" }
					: { rel: "modulepreload" }),
			},
		}));
}

/**
 *
 * @param {ProdApp} app
 * @returns
 */
function createProdManifest(app) {
	const manifest = new Proxy(
		{},
		{
			get(target, routerName) {
				invariant(typeof routerName === "string", "Bundler name expected");
				const router = app.getRouter(routerName);
				const bundlerManifest = app.config.buildManifest[routerName];

				invariant(
					router.type !== "static",
					"manifest not available for static router",
				);
				return {
					handler: router.handler,
					async assets() {
						/** @type {{ [key: string]: string[] }} */
						let assets = {};
						assets[router.handler] = await this.inputs[router.handler].assets();
						for (const route of (await router.internals.routes?.getRoutes()) ??
							[]) {
							assets[route.filePath] = await this.inputs[
								route.filePath
							].assets();
						}
						return assets;
					},
					async routes() {
						return (await router.internals.routes?.getRoutes()) ?? [];
					},
					async json() {
						/** @type {{ [key: string]: { output: string; assets: string[]} }} */
						let json = {};
						for (const input of Object.keys(this.inputs)) {
							json[input] = {
								output: this.inputs[input].output.path,
								assets: await this.inputs[input].assets(),
							};
						}
						return json;
					},
					chunks: new Proxy(
						{},
						{
							get(target, chunk) {
								invariant(typeof chunk === "string", "Chunk expected");
								const chunkPath = join$1(
									router.outDir,
									router.base,
									chunk + ".mjs",
								);
								return {
									import() {
										if (globalThis.$$chunks[chunk + ".mjs"]) {
											return globalThis.$$chunks[chunk + ".mjs"];
										}
										return import(
											/* @vite-ignore */ pathToFileURL(chunkPath).href
										);
									},
									output: {
										path: chunkPath,
									},
								};
							},
						},
					),
					inputs: new Proxy(
						{},
						{
							ownKeys(target) {
								const keys = Object.keys(bundlerManifest)
									.filter((id) => bundlerManifest[id].isEntry)
									.map((id) => id);
								return keys;
							},
							getOwnPropertyDescriptor(k) {
								return {
									enumerable: true,
									configurable: true,
								};
							},
							get(target, input) {
								invariant(typeof input === "string", "Input expected");
								if (router.target === "server") {
									const id =
										input === router.handler
											? virtualId(handlerModule(router))
											: input;
									return {
										assets() {
											return createHtmlTagsForAssets(
												router,
												app,
												findAssetsInViteManifest(bundlerManifest, id),
											);
										},
										output: {
											path: join$1(
												router.outDir,
												router.base,
												bundlerManifest[id].file,
											),
										},
									};
								} else if (router.target === "browser") {
									const id =
										input === router.handler && !input.endsWith(".html")
											? virtualId(handlerModule(router))
											: input;
									return {
										import() {
											return import(
												/* @vite-ignore */ joinURL(
													app.config.server.baseURL ?? "",
													router.base,
													bundlerManifest[id].file,
												)
											);
										},
										assets() {
											return createHtmlTagsForAssets(
												router,
												app,
												findAssetsInViteManifest(bundlerManifest, id),
											);
										},
										output: {
											path: joinURL(
												app.config.server.baseURL ?? "",
												router.base,
												bundlerManifest[id].file,
											),
										},
									};
								}
							},
						},
					),
				};
			},
		},
	);

	return manifest;
}

function plugin() {
	globalThis.MANIFEST =
		createProdManifest(globalThis.app)
			;
}

const chunks = {};
			 



			 function app() {
				 globalThis.$$chunks = chunks;
			 }

const plugins = [
  plugin$2,
plugin$1,
plugin,
app
];

const assets = {
  "/assets/ssr-eAiMNyRJ.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"7b4b-8zdYyYD66n6WGPBskRhI1cj0A6E\"",
    "mtime": "2026-01-11T15:08:40.351Z",
    "size": 31563,
    "path": "../public/assets/ssr-eAiMNyRJ.css"
  },
  "/assets/ssr-eAiMNyRJ.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"1403-bx+YmwWd3jd3pvddUEebD+/VVaA\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 5123,
    "path": "../public/assets/ssr-eAiMNyRJ.css.br"
  },
  "/assets/ssr-eAiMNyRJ.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"16de-wUZ9RmbdQPswvduCYLWqP6qXd04\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 5854,
    "path": "../public/assets/ssr-eAiMNyRJ.css.gz"
  },
  "/_build/.vite/manifest.json": {
    "type": "application/json",
    "encoding": null,
    "etag": "\"7fb-jePs+QyyfrvIHy+9JQpcRD6yzrQ\"",
    "mtime": "2026-01-11T15:08:40.354Z",
    "size": 2043,
    "path": "../public/_build/.vite/manifest.json"
  },
  "/_build/.vite/manifest.json.br": {
    "type": "application/json",
    "encoding": "br",
    "etag": "\"14b-XLWY6b7xFyU1kQb6O+7cMlnj+xU\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 331,
    "path": "../public/_build/.vite/manifest.json.br"
  },
  "/_build/.vite/manifest.json.gz": {
    "type": "application/json",
    "encoding": "gzip",
    "etag": "\"189-FIT+tc9PaPXXFNUEXiCzM3s8O7w\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 393,
    "path": "../public/_build/.vite/manifest.json.gz"
  },
  "/_build/assets/client-SrRtGryf.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"3d73-P2q8IK/FC2RAxYQoa0vYaSZaZlY\"",
    "mtime": "2026-01-11T15:08:40.353Z",
    "size": 15731,
    "path": "../public/_build/assets/client-SrRtGryf.js"
  },
  "/_build/assets/client-SrRtGryf.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"15cc-4aMR4lI26F+rS+0QunPPyU5kdfk\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 5580,
    "path": "../public/_build/assets/client-SrRtGryf.js.br"
  },
  "/_build/assets/client-SrRtGryf.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"185f-T8xwVv1YWVFx671gsc1Qo91RFhY\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 6239,
    "path": "../public/_build/assets/client-SrRtGryf.js.gz"
  },
  "/_build/assets/client-eAiMNyRJ.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"7b4b-8zdYyYD66n6WGPBskRhI1cj0A6E\"",
    "mtime": "2026-01-11T15:08:40.354Z",
    "size": 31563,
    "path": "../public/_build/assets/client-eAiMNyRJ.css"
  },
  "/_build/assets/client-eAiMNyRJ.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"1403-bx+YmwWd3jd3pvddUEebD+/VVaA\"",
    "mtime": "2026-01-11T15:08:40.473Z",
    "size": 5123,
    "path": "../public/_build/assets/client-eAiMNyRJ.css.br"
  },
  "/_build/assets/client-eAiMNyRJ.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"16de-wUZ9RmbdQPswvduCYLWqP6qXd04\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 5854,
    "path": "../public/_build/assets/client-eAiMNyRJ.css.gz"
  },
  "/_build/assets/index-B9LD-gYd.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"b1a-CU91fCk8jSyMhRxNeH2Hx07uX9I\"",
    "mtime": "2026-01-11T15:08:40.353Z",
    "size": 2842,
    "path": "../public/_build/assets/index-B9LD-gYd.js"
  },
  "/_build/assets/index-B9LD-gYd.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"401-7d414zzMpomqGmKIFh8QFwnc3xs\"",
    "mtime": "2026-01-11T15:08:40.392Z",
    "size": 1025,
    "path": "../public/_build/assets/index-B9LD-gYd.js.br"
  },
  "/_build/assets/index-B9LD-gYd.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"4b3-hxODrGTQETyybIxWqSi870ERS4g\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 1203,
    "path": "../public/_build/assets/index-B9LD-gYd.js.gz"
  },
  "/_build/assets/index-ClPRpPTX.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"d6f-irqcMkg+K4BQkOjUv1yCrYpOjGY\"",
    "mtime": "2026-01-11T15:08:40.353Z",
    "size": 3439,
    "path": "../public/_build/assets/index-ClPRpPTX.js"
  },
  "/_build/assets/index-ClPRpPTX.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"4b2-FeImAvnhdZeaSEkaW2XGjehN3/0\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 1202,
    "path": "../public/_build/assets/index-ClPRpPTX.js.br"
  },
  "/_build/assets/index-ClPRpPTX.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"59f-8bj6aBx7MMhMxffP/DENN71aqdc\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 1439,
    "path": "../public/_build/assets/index-ClPRpPTX.js.gz"
  },
  "/_build/assets/index-CnsptRuy.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"b5a-FUZyTDydkPLmVn0F611gceXUSG4\"",
    "mtime": "2026-01-11T15:08:40.354Z",
    "size": 2906,
    "path": "../public/_build/assets/index-CnsptRuy.js"
  },
  "/_build/assets/index-CnsptRuy.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"435-yAvzbprMjzdsDfmkZVMFBxtf6lI\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 1077,
    "path": "../public/_build/assets/index-CnsptRuy.js.br"
  },
  "/_build/assets/index-CnsptRuy.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"4dc-8rAArMIEl3ePHp6TY4u2QiGyLjQ\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 1244,
    "path": "../public/_build/assets/index-CnsptRuy.js.gz"
  },
  "/_build/assets/index-CxCvUa7W.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"575-IKlzEQRt1K3vCH5bgHYUuRDEBsc\"",
    "mtime": "2026-01-11T15:08:40.353Z",
    "size": 1397,
    "path": "../public/_build/assets/index-CxCvUa7W.js"
  },
  "/_build/assets/index-CxCvUa7W.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"26c-bntY7+gJa6x+e0vXbtns5j0dGjU\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 620,
    "path": "../public/_build/assets/index-CxCvUa7W.js.br"
  },
  "/_build/assets/index-CxCvUa7W.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"2cc-sLx0P9WqExf+Q0Yathl0sXJ9kuk\"",
    "mtime": "2026-01-11T15:08:40.393Z",
    "size": 716,
    "path": "../public/_build/assets/index-CxCvUa7W.js.gz"
  },
  "/_build/assets/sidebar-einHe0E2.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"629f-LWUUJGumxHfoia9rkY0iEHmcqGk\"",
    "mtime": "2026-01-11T15:08:40.354Z",
    "size": 25247,
    "path": "../public/_build/assets/sidebar-einHe0E2.js"
  },
  "/_build/assets/sidebar-einHe0E2.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1e50-uITkQUgwhf7PL8QhdOYR6NhwRPo\"",
    "mtime": "2026-01-11T15:08:40.473Z",
    "size": 7760,
    "path": "../public/_build/assets/sidebar-einHe0E2.js.br"
  },
  "/_build/assets/sidebar-einHe0E2.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"222d-Ks5Bcrw5PeFwtu5p2GD+yFTc3sM\"",
    "mtime": "2026-01-11T15:08:40.472Z",
    "size": 8749,
    "path": "../public/_build/assets/sidebar-einHe0E2.js.gz"
  },
  "/_build/assets/theme-CVLqWykU.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"9a52-i4oksgTJYR7s1YehgMa3ykxD8K4\"",
    "mtime": "2026-01-11T15:08:40.549Z",
    "size": 39506,
    "path": "../public/_build/assets/theme-CVLqWykU.js.br"
  },
  "/_build/assets/theme-CVLqWykU.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"203a8-VGuFeW0S7lPp6AJK9EycSZMEDXE\"",
    "mtime": "2026-01-11T15:08:40.354Z",
    "size": 132008,
    "path": "../public/_build/assets/theme-CVLqWykU.js"
  },
  "/_build/assets/theme-CVLqWykU.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"aea6-/hmKsrKD7wIBKn/oWRW7YK2S5JU\"",
    "mtime": "2026-01-11T15:08:40.473Z",
    "size": 44710,
    "path": "../public/_build/assets/theme-CVLqWykU.js.gz"
  },
  "/_server/assets/app-eAiMNyRJ.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"7b4b-8zdYyYD66n6WGPBskRhI1cj0A6E\"",
    "mtime": "2026-01-11T15:08:40.356Z",
    "size": 31563,
    "path": "../public/_server/assets/app-eAiMNyRJ.css"
  },
  "/_server/assets/app-eAiMNyRJ.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"1403-bx+YmwWd3jd3pvddUEebD+/VVaA\"",
    "mtime": "2026-01-11T15:08:40.473Z",
    "size": 5123,
    "path": "../public/_server/assets/app-eAiMNyRJ.css.br"
  },
  "/_server/assets/app-eAiMNyRJ.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"16de-wUZ9RmbdQPswvduCYLWqP6qXd04\"",
    "mtime": "2026-01-11T15:08:40.473Z",
    "size": 5854,
    "path": "../public/_server/assets/app-eAiMNyRJ.css.gz"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _63yo9f = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
function qr$1(e, t) {
  const r = (e || "").split(";").filter((c) => typeof c == "string" && !!c.trim()), n = r.shift() || "", a = Mr(n), i = a.name;
  let o = a.value;
  try {
    o = (t == null ? void 0 : t.decode) === false ? o : ((t == null ? void 0 : t.decode) || decodeURIComponent)(o);
  } catch {
  }
  const u = { name: i, value: o };
  for (const c of r) {
    const l = c.split("="), p = (l.shift() || "").trimStart().toLowerCase(), d = l.join("=");
    switch (p) {
      case "expires": {
        u.expires = new Date(d);
        break;
      }
      case "max-age": {
        u.maxAge = Number.parseInt(d, 10);
        break;
      }
      case "secure": {
        u.secure = true;
        break;
      }
      case "httponly": {
        u.httpOnly = true;
        break;
      }
      case "samesite": {
        u.sameSite = d;
        break;
      }
      default:
        u[p] = d;
    }
  }
  return u;
}
function Mr(e) {
  let t = "", r = "";
  const n = e.split("=");
  return n.length > 1 ? (t = n.shift(), r = n.join("=")) : r = e, { name: t, value: r };
}
var Br = ((e) => (e[e.AggregateError = 1] = "AggregateError", e[e.ArrowFunction = 2] = "ArrowFunction", e[e.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", e[e.ObjectAssign = 8] = "ObjectAssign", e[e.BigIntTypedArray = 16] = "BigIntTypedArray", e[e.RegExp = 32] = "RegExp", e))(Br || {}), x = Symbol.asyncIterator, yt$2 = Symbol.hasInstance, F = Symbol.isConcatSpreadable, A$1 = Symbol.iterator, bt$2 = Symbol.match, wt$1 = Symbol.matchAll, vt$2 = Symbol.replace, St$2 = Symbol.search, Rt$2 = Symbol.species, Et$2 = Symbol.split, kt$2 = Symbol.toPrimitive, H$2 = Symbol.toStringTag, xt$1 = Symbol.unscopables, Wr = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, At$2 = { [x]: 0, [yt$2]: 1, [F]: 2, [A$1]: 3, [bt$2]: 4, [wt$1]: 5, [vt$2]: 6, [St$2]: 7, [Rt$2]: 8, [Et$2]: 9, [kt$2]: 10, [H$2]: 11, [xt$1]: 12 }, Gr$1 = { 0: x, 1: yt$2, 2: F, 3: A$1, 4: bt$2, 5: wt$1, 6: vt$2, 7: St$2, 8: Rt$2, 9: Et$2, 10: kt$2, 11: H$2, 12: xt$1 }, Vr = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, s = void 0, Xr$1 = { 2: true, 3: false, 1: s, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN }, $t$1 = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, Yr$1 = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function g(e, t, r, n, a, i, o, u, c, l, p, d) {
  return { t: e, i: t, s: r, c: n, m: a, p: i, e: o, a: u, f: c, b: l, o: p, l: d };
}
function z$1(e) {
  return g(2, s, e, s, s, s, s, s, s, s, s, s);
}
var _t$1 = z$1(2), zt$2 = z$1(3), Jr$1 = z$1(1), Kr = z$1(0), Zr$1 = z$1(4), Qr$1 = z$1(5), en$1 = z$1(6), tn$2 = z$1(7);
function rn$2(e) {
  switch (e) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return s;
  }
}
function k(e) {
  let t = "", r = 0, n;
  for (let a = 0, i = e.length; a < i; a++) n = rn$2(e[a]), n && (t += e.slice(r, a) + n, r = a + 1);
  return r === 0 ? t = e : t += e.slice(r), t;
}
function nn$2(e) {
  switch (e) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return e;
  }
}
function O(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, nn$2);
}
var W = "__SEROVAL_REFS__", ie$2 = "$R", ne = `self.${ie$2}`;
function sn$2(e) {
  return e == null ? `${ne}=${ne}||[]` : `(${ne}=${ne}||{})["${k(e)}"]=[]`;
}
var Ct$2 = /* @__PURE__ */ new Map(), U = /* @__PURE__ */ new Map();
function Tt$2(e) {
  return Ct$2.has(e);
}
function an$2(e) {
  return U.has(e);
}
function on$2(e) {
  if (Tt$2(e)) return Ct$2.get(e);
  throw new Nn$1(e);
}
function un$2(e) {
  if (an$2(e)) return U.get(e);
  throw new Ln$1(e);
}
typeof globalThis < "u" ? Object.defineProperty(globalThis, W, { value: U, configurable: true, writable: false, enumerable: false }) : typeof self < "u" ? Object.defineProperty(self, W, { value: U, configurable: true, writable: false, enumerable: false }) : typeof global < "u" && Object.defineProperty(global, W, { value: U, configurable: true, writable: false, enumerable: false });
function Ie(e) {
  return e instanceof EvalError ? 1 : e instanceof RangeError ? 2 : e instanceof ReferenceError ? 3 : e instanceof SyntaxError ? 4 : e instanceof TypeError ? 5 : e instanceof URIError ? 6 : 0;
}
function cn$2(e) {
  let t = $t$1[Ie(e)];
  return e.name !== t ? { name: e.name } : e.constructor.name !== t ? { name: e.constructor.name } : {};
}
function Pt$2(e, t) {
  let r = cn$2(e), n = Object.getOwnPropertyNames(e);
  for (let a = 0, i = n.length, o; a < i; a++) o = n[a], o !== "name" && o !== "message" && (o === "stack" ? t & 4 && (r = r || {}, r[o] = e[o]) : (r = r || {}, r[o] = e[o]));
  return r;
}
function It$2(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : Object.isExtensible(e) ? 0 : 1;
}
function ln$2(e) {
  switch (e) {
    case Number.POSITIVE_INFINITY:
      return Qr$1;
    case Number.NEGATIVE_INFINITY:
      return en$1;
  }
  return e !== e ? tn$2 : Object.is(e, -0) ? Zr$1 : g(0, s, e, s, s, s, s, s, s, s, s, s);
}
function Ot$2(e) {
  return g(1, s, k(e), s, s, s, s, s, s, s, s, s);
}
function fn$2(e) {
  return g(3, s, "" + e, s, s, s, s, s, s, s, s, s);
}
function pn$2(e) {
  return g(4, e, s, s, s, s, s, s, s, s, s, s);
}
function dn$2(e, t) {
  let r = t.valueOf();
  return g(5, e, r !== r ? "" : t.toISOString(), s, s, s, s, s, s, s, s, s);
}
function hn$2(e, t) {
  return g(6, e, s, k(t.source), t.flags, s, s, s, s, s, s, s);
}
function gn$2(e, t) {
  return g(17, e, At$2[t], s, s, s, s, s, s, s, s, s);
}
function mn$2(e, t) {
  return g(18, e, k(on$2(t)), s, s, s, s, s, s, s, s, s);
}
function Nt$2(e, t, r) {
  return g(25, e, r, k(t), s, s, s, s, s, s, s, s);
}
function yn$1(e, t, r) {
  return g(9, e, s, s, s, s, s, r, s, s, It$2(t), s);
}
function bn$1(e, t) {
  return g(21, e, s, s, s, s, s, s, t, s, s, s);
}
function wn$1(e, t, r) {
  return g(15, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.length);
}
function vn(e, t, r) {
  return g(16, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function Sn(e, t, r) {
  return g(20, e, s, s, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function Rn$1(e, t, r) {
  return g(13, e, Ie(t), s, k(t.message), r, s, s, s, s, s, s);
}
function En$1(e, t, r) {
  return g(14, e, Ie(t), s, k(t.message), r, s, s, s, s, s, s);
}
function kn$1(e, t) {
  return g(7, e, s, s, s, s, s, t, s, s, s, s);
}
function xn$1(e, t) {
  return g(28, s, s, s, s, s, s, [e, t], s, s, s, s);
}
function An$1(e, t) {
  return g(30, s, s, s, s, s, s, [e, t], s, s, s, s);
}
function $n$1(e, t, r) {
  return g(31, e, s, s, s, s, s, r, t, s, s, s);
}
function _n$1(e, t) {
  return g(32, e, s, s, s, s, s, s, t, s, s, s);
}
function zn$1(e, t) {
  return g(33, e, s, s, s, s, s, s, t, s, s, s);
}
function Cn$2(e, t) {
  return g(34, e, s, s, s, s, s, s, t, s, s, s);
}
var Tn$1 = { parsing: 1, serialization: 2, deserialization: 3 };
function Pn(e) {
  return `Seroval Error (step: ${Tn$1[e]})`;
}
var In$1 = (e, t) => Pn(e), Lt$2 = class Lt extends Error {
  constructor(e, t) {
    super(In$1(e)), this.cause = t;
  }
}, Be$1 = class Be extends Lt$2 {
  constructor(e) {
    super("parsing", e);
  }
}, On$1 = class On extends Lt$2 {
  constructor(e) {
    super("deserialization", e);
  }
};
function $(e) {
  return `Seroval Error (specific: ${e})`;
}
var ce$2 = class ce extends Error {
  constructor(e) {
    super($(1)), this.value = e;
  }
}, N$1 = class N extends Error {
  constructor(e) {
    super($(2));
  }
}, jt$2 = class jt extends Error {
  constructor(e) {
    super($(3));
  }
}, Q$2 = class Q extends Error {
  constructor(e) {
    super($(4));
  }
}, Nn$1 = class Nn extends Error {
  constructor(e) {
    super($(5)), this.value = e;
  }
}, Ln$1 = class Ln extends Error {
  constructor(e) {
    super($(6));
  }
}, jn$1 = class jn extends Error {
  constructor(e) {
    super($(7));
  }
}, C = class extends Error {
  constructor(t) {
    super($(8));
  }
}, Ut$1 = class Ut extends Error {
  constructor(t) {
    super($(9));
  }
}, Un$1 = class Un {
  constructor(t, r) {
    this.value = t, this.replacement = r;
  }
}, le$1 = () => {
  let e = { p: 0, s: 0, f: 0 };
  return e.p = new Promise((t, r) => {
    e.s = t, e.f = r;
  }), e;
}, Fn$1 = (e, t) => {
  e.s(t), e.p.s = 1, e.p.v = t;
}, Hn$1 = (e, t) => {
  e.f(t), e.p.s = 2, e.p.v = t;
}, Dn$1 = le$1.toString(), qn$1 = Fn$1.toString(), Mn$1 = Hn$1.toString(), Ft$1 = () => {
  let e = [], t = [], r = true, n = false, a = 0, i = (c, l, p) => {
    for (p = 0; p < a; p++) t[p] && t[p][l](c);
  }, o = (c, l, p, d) => {
    for (l = 0, p = e.length; l < p; l++) d = e[l], !r && l === p - 1 ? c[n ? "return" : "throw"](d) : c.next(d);
  }, u = (c, l) => (r && (l = a++, t[l] = c), o(c), () => {
    r && (t[l] = t[a], t[a--] = void 0);
  });
  return { __SEROVAL_STREAM__: true, on: (c) => u(c), next: (c) => {
    r && (e.push(c), i(c, "next"));
  }, throw: (c) => {
    r && (e.push(c), i(c, "throw"), r = false, n = false, t.length = 0);
  }, return: (c) => {
    r && (e.push(c), i(c, "return"), r = false, n = true, t.length = 0);
  } };
}, Bn$1 = Ft$1.toString(), Ht$2 = (e) => (t) => () => {
  let r = 0, n = { [e]: () => n, next: () => {
    if (r > t.d) return { done: true, value: void 0 };
    let a = r++, i = t.v[a];
    if (a === t.t) throw i;
    return { done: a === t.d, value: i };
  } };
  return n;
}, Wn$1 = Ht$2.toString(), Dt$2 = (e, t) => (r) => () => {
  let n = 0, a = -1, i = false, o = [], u = [], c = (p = 0, d = u.length) => {
    for (; p < d; p++) u[p].s({ done: true, value: void 0 });
  };
  r.on({ next: (p) => {
    let d = u.shift();
    d && d.s({ done: false, value: p }), o.push(p);
  }, throw: (p) => {
    let d = u.shift();
    d && d.f(p), c(), a = o.length, i = true, o.push(p);
  }, return: (p) => {
    let d = u.shift();
    d && d.s({ done: true, value: p }), c(), a = o.length, o.push(p);
  } });
  let l = { [e]: () => l, next: () => {
    if (a === -1) {
      let v = n++;
      if (v >= o.length) {
        let f = t();
        return u.push(f), f.p;
      }
      return { done: false, value: o[v] };
    }
    if (n > a) return { done: true, value: void 0 };
    let p = n++, d = o[p];
    if (p !== a) return { done: false, value: d };
    if (i) throw d;
    return { done: true, value: d };
  } };
  return l;
}, Gn$1 = Dt$2.toString(), qt$2 = (e) => {
  let t = atob(e), r = t.length, n = new Uint8Array(r);
  for (let a = 0; a < r; a++) n[a] = t.charCodeAt(a);
  return n.buffer;
}, Vn$1 = qt$2.toString(), Xn$1 = {}, Yn$1 = {}, Jn$1 = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, Kn$1 = { 0: "[]", 1: Dn$1, 2: qn$1, 3: Mn$1, 4: Bn$1, 5: Vn$1 };
function fe$1(e) {
  return "__SEROVAL_STREAM__" in e;
}
function ee$2() {
  return Ft$1();
}
function Zn$1(e) {
  let t = ee$2(), r = e[x]();
  async function n() {
    try {
      let a = await r.next();
      a.done ? t.return(a.value) : (t.next(a.value), await n());
    } catch (a) {
      t.throw(a);
    }
  }
  return n().catch(() => {
  }), t;
}
var Qn = Dt$2(x, le$1);
function es$1(e) {
  return Qn(e);
}
function ts$1(e) {
  let t = [], r = -1, n = -1, a = e[A$1]();
  for (; ; ) try {
    let i = a.next();
    if (t.push(i.value), i.done) {
      n = t.length - 1;
      break;
    }
  } catch (i) {
    r = t.length, t.push(i);
  }
  return { v: t, t: r, d: n };
}
var rs$1 = Ht$2(A$1);
function ns$1(e) {
  return rs$1(e);
}
function ss$1(e, t) {
  return { plugins: t.plugins, mode: e, marked: /* @__PURE__ */ new Set(), features: 63 ^ (t.disabledFeatures || 0), refs: t.refs || /* @__PURE__ */ new Map(), depthLimit: t.depthLimit || 1e3 };
}
function as$1(e, t) {
  e.marked.add(t);
}
function Mt$2(e, t) {
  let r = e.refs.size;
  return e.refs.set(t, r), r;
}
function pe$1(e, t) {
  let r = e.refs.get(t);
  return r != null ? (as$1(e, r), { type: 1, value: pn$2(r) }) : { type: 0, value: Mt$2(e, t) };
}
function Oe(e, t) {
  let r = pe$1(e, t);
  return r.type === 1 ? r : Tt$2(t) ? { type: 2, value: mn$2(r.value, t) } : r;
}
function P(e, t) {
  let r = Oe(e, t);
  if (r.type !== 0) return r.value;
  if (t in At$2) return gn$2(r.value, t);
  throw new ce$2(t);
}
function L(e, t) {
  let r = pe$1(e, Jn$1[t]);
  return r.type === 1 ? r.value : g(26, r.value, t, s, s, s, s, s, s, s, s, s);
}
function is$1(e) {
  let t = pe$1(e, Xn$1);
  return t.type === 1 ? t.value : g(27, t.value, s, s, s, s, s, s, P(e, A$1), s, s, s);
}
function os$1(e) {
  let t = pe$1(e, Yn$1);
  return t.type === 1 ? t.value : g(29, t.value, s, s, s, s, s, [L(e, 1), P(e, x)], s, s, s, s);
}
function us$1(e, t, r, n) {
  return g(r ? 11 : 10, e, s, s, s, n, s, s, s, s, It$2(t), s);
}
function cs$1(e, t, r, n) {
  return g(8, t, s, s, s, s, { k: r, v: n }, s, L(e, 0), s, s, s);
}
function ls$1(e, t, r) {
  return g(22, t, r, s, s, s, s, s, L(e, 1), s, s, s);
}
function fs$1(e, t, r) {
  let n = new Uint8Array(r), a = "";
  for (let i = 0, o = n.length; i < o; i++) a += String.fromCharCode(n[i]);
  return g(19, t, k(btoa(a)), s, s, s, s, s, L(e, 5), s, s, s);
}
var ps$1 = ((e) => (e[e.Vanilla = 1] = "Vanilla", e[e.Cross = 2] = "Cross", e))(ps$1 || {});
function Bt$2(e, t) {
  for (let r = 0, n = t.length; r < n; r++) {
    let a = t[r];
    e.has(a) || (e.add(a), a.extends && Bt$2(e, a.extends));
  }
}
function Wt$2(e) {
  if (e) {
    let t = /* @__PURE__ */ new Set();
    return Bt$2(t, e), [...t];
  }
}
function ds$1(e) {
  switch (e) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new jn$1(e);
  }
}
var hs$1 = 1e6, gs$1 = 1e4, ms$1 = 2e4;
function Gt$1(e, t) {
  switch (t) {
    case 3:
      return Object.freeze(e);
    case 1:
      return Object.preventExtensions(e);
    case 2:
      return Object.seal(e);
    default:
      return e;
  }
}
var ys$1 = 1e3;
function bs$1(e, t) {
  var r;
  return { mode: e, plugins: t.plugins, refs: t.refs || /* @__PURE__ */ new Map(), features: (r = t.features) != null ? r : 63 ^ (t.disabledFeatures || 0), depthLimit: t.depthLimit || ys$1 };
}
function ws$1(e) {
  return { mode: 1, base: bs$1(1, e), child: s, state: { marked: new Set(e.markedRefs) } };
}
var vs$1 = class vs {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  deserialize(e) {
    return y$1(this._p, this.depth, e);
  }
};
function Vt$2(e, t) {
  if (t < 0 || !Number.isFinite(t) || !Number.isInteger(t)) throw new C({ t: 4, i: t });
  if (e.refs.has(t)) throw new Error("Conflicted ref id: " + t);
}
function Ss$1(e, t, r) {
  return Vt$2(e.base, t), e.state.marked.has(t) && e.base.refs.set(t, r), r;
}
function Rs$1(e, t, r) {
  return Vt$2(e.base, t), e.base.refs.set(t, r), r;
}
function b$1(e, t, r) {
  return e.mode === 1 ? Ss$1(e, t, r) : Rs$1(e, t, r);
}
function Re$1(e, t, r) {
  if (Object.hasOwn(t, r)) return t[r];
  throw new C(e);
}
function Es$1(e, t) {
  return b$1(e, t.i, un$2(O(t.s)));
}
function ks$1(e, t, r) {
  let n = r.a, a = n.length, i = b$1(e, r.i, new Array(a));
  for (let o = 0, u; o < a; o++) u = n[o], u && (i[o] = y$1(e, t, u));
  return Gt$1(i, r.o), i;
}
function xs$1(e) {
  switch (e) {
    case "constructor":
    case "__proto__":
    case "prototype":
    case "__defineGetter__":
    case "__defineSetter__":
    case "__lookupGetter__":
    case "__lookupSetter__":
      return false;
    default:
      return true;
  }
}
function As$1(e) {
  switch (e) {
    case x:
    case F:
    case H$2:
    case A$1:
      return true;
    default:
      return false;
  }
}
function We$1(e, t, r) {
  xs$1(t) ? e[t] = r : Object.defineProperty(e, t, { value: r, configurable: true, enumerable: true, writable: true });
}
function $s$1(e, t, r, n, a) {
  if (typeof n == "string") We$1(r, n, y$1(e, t, a));
  else {
    let i = y$1(e, t, n);
    switch (typeof i) {
      case "string":
        We$1(r, i, y$1(e, t, a));
        break;
      case "symbol":
        As$1(i) && (r[i] = y$1(e, t, a));
        break;
      default:
        throw new C(n);
    }
  }
}
function Xt$1(e, t, r, n) {
  let a = r.k;
  if (a.length > 0) for (let i = 0, o = r.v, u = a.length; i < u; i++) $s$1(e, t, n, a[i], o[i]);
  return n;
}
function _s$1(e, t, r) {
  let n = b$1(e, r.i, r.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  return Xt$1(e, t, r.p, n), Gt$1(n, r.o), n;
}
function zs(e, t) {
  return b$1(e, t.i, new Date(t.s));
}
function Cs$1(e, t) {
  if (e.base.features & 32) {
    let r = O(t.c);
    if (r.length > ms$1) throw new C(t);
    return b$1(e, t.i, new RegExp(r, t.m));
  }
  throw new N$1(t);
}
function Ts$1(e, t, r) {
  let n = b$1(e, r.i, /* @__PURE__ */ new Set());
  for (let a = 0, i = r.a, o = i.length; a < o; a++) n.add(y$1(e, t, i[a]));
  return n;
}
function Ps$1(e, t, r) {
  let n = b$1(e, r.i, /* @__PURE__ */ new Map());
  for (let a = 0, i = r.e.k, o = r.e.v, u = i.length; a < u; a++) n.set(y$1(e, t, i[a]), y$1(e, t, o[a]));
  return n;
}
function Is$1(e, t) {
  if (t.s.length > hs$1) throw new C(t);
  return b$1(e, t.i, qt$2(O(t.s)));
}
function Os$1(e, t, r) {
  var n;
  let a = ds$1(r.c), i = y$1(e, t, r.f), o = (n = r.b) != null ? n : 0;
  if (o < 0 || o > i.byteLength) throw new C(r);
  return b$1(e, r.i, new a(i, o, r.l));
}
function Ns$1(e, t, r) {
  var n;
  let a = y$1(e, t, r.f), i = (n = r.b) != null ? n : 0;
  if (i < 0 || i > a.byteLength) throw new C(r);
  return b$1(e, r.i, new DataView(a, i, r.l));
}
function Yt$2(e, t, r, n) {
  if (r.p) {
    let a = Xt$1(e, t, r.p, {});
    Object.defineProperties(n, Object.getOwnPropertyDescriptors(a));
  }
  return n;
}
function Ls$1(e, t, r) {
  let n = b$1(e, r.i, new AggregateError([], O(r.m)));
  return Yt$2(e, t, r, n);
}
function js$1(e, t, r) {
  let n = Re$1(r, Yr$1, r.s), a = b$1(e, r.i, new n(O(r.m)));
  return Yt$2(e, t, r, a);
}
function Us$1(e, t, r) {
  let n = le$1(), a = b$1(e, r.i, n.p), i = y$1(e, t, r.f);
  return r.s ? n.s(i) : n.f(i), a;
}
function Fs$1(e, t, r) {
  return b$1(e, r.i, Object(y$1(e, t, r.f)));
}
function Hs(e, t, r) {
  let n = e.base.plugins;
  if (n) {
    let a = O(r.c);
    for (let i = 0, o = n.length; i < o; i++) {
      let u = n[i];
      if (u.tag === a) return b$1(e, r.i, u.deserialize(r.s, new vs$1(e, t), { id: r.i }));
    }
  }
  throw new jt$2(r.c);
}
function Ds$1(e, t) {
  return b$1(e, t.i, b$1(e, t.s, le$1()).p);
}
function qs$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return n.s(y$1(e, t, r.a[1])), s;
  throw new Q$2("Promise");
}
function Ms$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return n.f(y$1(e, t, r.a[1])), s;
  throw new Q$2("Promise");
}
function Bs$1(e, t, r) {
  y$1(e, t, r.a[0]);
  let n = y$1(e, t, r.a[1]);
  return ns$1(n);
}
function Ws$1(e, t, r) {
  y$1(e, t, r.a[0]);
  let n = y$1(e, t, r.a[1]);
  return es$1(n);
}
function Gs(e, t, r) {
  let n = b$1(e, r.i, ee$2()), a = r.a, i = a.length;
  if (i) for (let o = 0; o < i; o++) y$1(e, t, a[o]);
  return n;
}
function Vs$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.next(y$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Xs$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.throw(y$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Ys$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.return(y$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Js$1(e, t, r) {
  return y$1(e, t, r.f), s;
}
function Ks$1(e, t, r) {
  return y$1(e, t, r.a[1]), s;
}
function y$1(e, t, r) {
  if (t > e.base.depthLimit) throw new Ut$1(e.base.depthLimit);
  switch (t += 1, r.t) {
    case 2:
      return Re$1(r, Xr$1, r.s);
    case 0:
      return Number(r.s);
    case 1:
      return O(String(r.s));
    case 3:
      if (String(r.s).length > gs$1) throw new C(r);
      return BigInt(r.s);
    case 4:
      return e.base.refs.get(r.i);
    case 18:
      return Es$1(e, r);
    case 9:
      return ks$1(e, t, r);
    case 10:
    case 11:
      return _s$1(e, t, r);
    case 5:
      return zs(e, r);
    case 6:
      return Cs$1(e, r);
    case 7:
      return Ts$1(e, t, r);
    case 8:
      return Ps$1(e, t, r);
    case 19:
      return Is$1(e, r);
    case 16:
    case 15:
      return Os$1(e, t, r);
    case 20:
      return Ns$1(e, t, r);
    case 14:
      return Ls$1(e, t, r);
    case 13:
      return js$1(e, t, r);
    case 12:
      return Us$1(e, t, r);
    case 17:
      return Re$1(r, Gr$1, r.s);
    case 21:
      return Fs$1(e, t, r);
    case 25:
      return Hs(e, t, r);
    case 22:
      return Ds$1(e, r);
    case 23:
      return qs$1(e, t, r);
    case 24:
      return Ms$1(e, t, r);
    case 28:
      return Bs$1(e, t, r);
    case 30:
      return Ws$1(e, t, r);
    case 31:
      return Gs(e, t, r);
    case 32:
      return Vs$1(e, t, r);
    case 33:
      return Xs$1(e, t, r);
    case 34:
      return Ys$1(e, t, r);
    case 27:
      return Js$1(e, t, r);
    case 29:
      return Ks$1(e, t, r);
    default:
      throw new N$1(r);
  }
}
function Zs$1(e, t) {
  try {
    return y$1(e, 0, t);
  } catch (r) {
    throw new On$1(r);
  }
}
var Qs$1 = () => T, ea = Qs$1.toString(), Jt$2 = /=>/.test(ea);
function Kt$2(e, t) {
  return Jt$2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (t.startsWith("{") ? "(" + t + ")" : t) : "function(" + e.join(",") + "){return " + t + "}";
}
function ta(e, t) {
  return Jt$2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + t + "}" : "function(" + e.join(",") + "){" + t + "}";
}
var Zt$1 = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", Ge$1 = Zt$1.length, Qt$2 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", Ve$1 = Qt$2.length;
function ra(e) {
  let t = e % Ge$1, r = Zt$1[t];
  for (e = (e - t) / Ge$1; e > 0; ) t = e % Ve$1, r += Qt$2[t], e = (e - t) / Ve$1;
  return r;
}
var na = /^[$A-Z_][0-9A-Z_$]*$/i;
function er$1(e) {
  let t = e[0];
  return (t === "$" || t === "_" || t >= "A" && t <= "Z" || t >= "a" && t <= "z") && na.test(e);
}
function G$1(e) {
  switch (e.t) {
    case 0:
      return e.s + "=" + e.v;
    case 2:
      return e.s + ".set(" + e.k + "," + e.v + ")";
    case 1:
      return e.s + ".add(" + e.v + ")";
    case 3:
      return e.s + ".delete(" + e.k + ")";
  }
}
function sa(e) {
  let t = [], r = e[0];
  for (let n = 1, a = e.length, i, o = r; n < a; n++) i = e[n], i.t === 0 && i.v === o.v ? r = { t: 0, s: i.s, k: s, v: G$1(r) } : i.t === 2 && i.s === o.s ? r = { t: 2, s: G$1(r), k: i.k, v: i.v } : i.t === 1 && i.s === o.s ? r = { t: 1, s: G$1(r), k: s, v: i.v } : i.t === 3 && i.s === o.s ? r = { t: 3, s: G$1(r), k: i.k, v: s } : (t.push(r), r = i), o = i;
  return t.push(r), t;
}
function tr$1(e) {
  if (e.length) {
    let t = "", r = sa(e);
    for (let n = 0, a = r.length; n < a; n++) t += G$1(r[n]) + ",";
    return t;
  }
  return s;
}
var aa = "Object.create(null)", ia = "new Set", oa = "new Map", ua = "Promise.resolve", ca = "Promise.reject", la = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: s };
function fa(e, t) {
  return { mode: e, plugins: t.plugins, features: t.features, marked: new Set(t.markedRefs), stack: [], flags: [], assignments: [] };
}
function pa(e) {
  return { mode: 2, base: fa(2, e), state: e, child: s };
}
var da = class {
  constructor(e) {
    this._p = e;
  }
  serialize(e) {
    return h(this._p, e);
  }
};
function ha(e, t) {
  let r = e.valid.get(t);
  r == null && (r = e.valid.size, e.valid.set(t, r));
  let n = e.vars[r];
  return n == null && (n = ra(r), e.vars[r] = n), n;
}
function ga(e) {
  return ie$2 + "[" + e + "]";
}
function m(e, t) {
  return e.mode === 1 ? ha(e.state, t) : ga(t);
}
function E(e, t) {
  e.marked.add(t);
}
function Ee$1(e, t) {
  return e.marked.has(t);
}
function Ne$1(e, t, r) {
  t !== 0 && (E(e.base, r), e.base.flags.push({ type: t, value: m(e, r) }));
}
function ma(e) {
  let t = "";
  for (let r = 0, n = e.flags, a = n.length; r < a; r++) {
    let i = n[r];
    t += la[i.type] + "(" + i.value + "),";
  }
  return t;
}
function ya(e) {
  let t = tr$1(e.assignments), r = ma(e);
  return t ? r ? t + r : t : r;
}
function rr$1(e, t, r) {
  e.assignments.push({ t: 0, s: t, k: s, v: r });
}
function ba(e, t, r) {
  e.base.assignments.push({ t: 1, s: m(e, t), k: s, v: r });
}
function B$1(e, t, r, n) {
  e.base.assignments.push({ t: 2, s: m(e, t), k: r, v: n });
}
function Xe$1(e, t, r) {
  e.base.assignments.push({ t: 3, s: m(e, t), k: r, v: s });
}
function Y$2(e, t, r, n) {
  rr$1(e.base, m(e, t) + "[" + r + "]", n);
}
function ke$1(e, t, r, n) {
  rr$1(e.base, m(e, t) + "." + r, n);
}
function _$2(e, t) {
  return t.t === 4 && e.stack.includes(t.i);
}
function M(e, t, r) {
  return e.mode === 1 && !Ee$1(e.base, t) ? r : m(e, t) + "=" + r;
}
function wa(e) {
  return W + '.get("' + e.s + '")';
}
function Ye$1(e, t, r, n) {
  return r ? _$2(e.base, r) ? (E(e.base, t), Y$2(e, t, n, m(e, r.i)), "") : h(e, r) : "";
}
function va(e, t) {
  let r = t.i, n = t.a, a = n.length;
  if (a > 0) {
    e.base.stack.push(r);
    let i = Ye$1(e, r, n[0], 0), o = i === "";
    for (let u = 1, c; u < a; u++) c = Ye$1(e, r, n[u], u), i += "," + c, o = c === "";
    return e.base.stack.pop(), Ne$1(e, t.o, t.i), "[" + i + (o ? ",]" : "]");
  }
  return "[]";
}
function Je$1(e, t, r, n) {
  if (typeof r == "string") {
    let a = Number(r), i = a >= 0 && a.toString() === r || er$1(r);
    if (_$2(e.base, n)) {
      let o = m(e, n.i);
      return E(e.base, t.i), i && a !== a ? ke$1(e, t.i, r, o) : Y$2(e, t.i, i ? r : '"' + r + '"', o), "";
    }
    return (i ? r : '"' + r + '"') + ":" + h(e, n);
  }
  return "[" + h(e, r) + "]:" + h(e, n);
}
function nr$1(e, t, r) {
  let n = r.k, a = n.length;
  if (a > 0) {
    let i = r.v;
    e.base.stack.push(t.i);
    let o = Je$1(e, t, n[0], i[0]);
    for (let u = 1, c = o; u < a; u++) c = Je$1(e, t, n[u], i[u]), o += (c && o && ",") + c;
    return e.base.stack.pop(), "{" + o + "}";
  }
  return "{}";
}
function Sa(e, t) {
  return Ne$1(e, t.o, t.i), nr$1(e, t, t.p);
}
function Ra(e, t, r, n) {
  let a = nr$1(e, t, r);
  return a !== "{}" ? "Object.assign(" + n + "," + a + ")" : n;
}
function Ea(e, t, r, n, a) {
  let i = e.base, o = h(e, a), u = Number(n), c = u >= 0 && u.toString() === n || er$1(n);
  if (_$2(i, a)) c && u !== u ? ke$1(e, t.i, n, o) : Y$2(e, t.i, c ? n : '"' + n + '"', o);
  else {
    let l = i.assignments;
    i.assignments = r, c && u !== u ? ke$1(e, t.i, n, o) : Y$2(e, t.i, c ? n : '"' + n + '"', o), i.assignments = l;
  }
}
function ka(e, t, r, n, a) {
  if (typeof n == "string") Ea(e, t, r, n, a);
  else {
    let i = e.base, o = i.stack;
    i.stack = [];
    let u = h(e, a);
    i.stack = o;
    let c = i.assignments;
    i.assignments = r, Y$2(e, t.i, h(e, n), u), i.assignments = c;
  }
}
function xa(e, t, r) {
  let n = r.k, a = n.length;
  if (a > 0) {
    let i = [], o = r.v;
    e.base.stack.push(t.i);
    for (let u = 0; u < a; u++) ka(e, t, i, n[u], o[u]);
    return e.base.stack.pop(), tr$1(i);
  }
  return s;
}
function Le$1(e, t, r) {
  if (t.p) {
    let n = e.base;
    if (n.features & 8) r = Ra(e, t, t.p, r);
    else {
      E(n, t.i);
      let a = xa(e, t, t.p);
      if (a) return "(" + M(e, t.i, r) + "," + a + m(e, t.i) + ")";
    }
  }
  return r;
}
function Aa(e, t) {
  return Ne$1(e, t.o, t.i), Le$1(e, t, aa);
}
function $a(e) {
  return 'new Date("' + e.s + '")';
}
function _a(e, t) {
  if (e.base.features & 32) return "/" + t.c + "/" + t.m;
  throw new N$1(t);
}
function Ke$1(e, t, r) {
  let n = e.base;
  return _$2(n, r) ? (E(n, t), ba(e, t, m(e, r.i)), "") : h(e, r);
}
function za(e, t) {
  let r = ia, n = t.a, a = n.length, i = t.i;
  if (a > 0) {
    e.base.stack.push(i);
    let o = Ke$1(e, i, n[0]);
    for (let u = 1, c = o; u < a; u++) c = Ke$1(e, i, n[u]), o += (c && o && ",") + c;
    e.base.stack.pop(), o && (r += "([" + o + "])");
  }
  return r;
}
function Ze$1(e, t, r, n, a) {
  let i = e.base;
  if (_$2(i, r)) {
    let o = m(e, r.i);
    if (E(i, t), _$2(i, n)) {
      let c = m(e, n.i);
      return B$1(e, t, o, c), "";
    }
    if (n.t !== 4 && n.i != null && Ee$1(i, n.i)) {
      let c = "(" + h(e, n) + ",[" + a + "," + a + "])";
      return B$1(e, t, o, m(e, n.i)), Xe$1(e, t, a), c;
    }
    let u = i.stack;
    return i.stack = [], B$1(e, t, o, h(e, n)), i.stack = u, "";
  }
  if (_$2(i, n)) {
    let o = m(e, n.i);
    if (E(i, t), r.t !== 4 && r.i != null && Ee$1(i, r.i)) {
      let c = "(" + h(e, r) + ",[" + a + "," + a + "])";
      return B$1(e, t, m(e, r.i), o), Xe$1(e, t, a), c;
    }
    let u = i.stack;
    return i.stack = [], B$1(e, t, h(e, r), o), i.stack = u, "";
  }
  return "[" + h(e, r) + "," + h(e, n) + "]";
}
function Ca(e, t) {
  let r = oa, n = t.e.k, a = n.length, i = t.i, o = t.f, u = m(e, o.i), c = e.base;
  if (a > 0) {
    let l = t.e.v;
    c.stack.push(i);
    let p = Ze$1(e, i, n[0], l[0], u);
    for (let d = 1, v = p; d < a; d++) v = Ze$1(e, i, n[d], l[d], u), p += (v && p && ",") + v;
    c.stack.pop(), p && (r += "([" + p + "])");
  }
  return o.t === 26 && (E(c, o.i), r = "(" + h(e, o) + "," + r + ")"), r;
}
function Ta(e, t) {
  return j$1(e, t.f) + '("' + t.s + '")';
}
function Pa(e, t) {
  return "new " + t.c + "(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function Ia(e, t) {
  return "new DataView(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function Oa(e, t) {
  let r = t.i;
  e.base.stack.push(r);
  let n = Le$1(e, t, 'new AggregateError([],"' + t.m + '")');
  return e.base.stack.pop(), n;
}
function Na(e, t) {
  return Le$1(e, t, "new " + $t$1[t.s] + '("' + t.m + '")');
}
function La(e, t) {
  let r, n = t.f, a = t.i, i = t.s ? ua : ca, o = e.base;
  if (_$2(o, n)) {
    let u = m(e, n.i);
    r = i + (t.s ? "().then(" + Kt$2([], u) + ")" : "().catch(" + ta([], "throw " + u) + ")");
  } else {
    o.stack.push(a);
    let u = h(e, n);
    o.stack.pop(), r = i + "(" + u + ")";
  }
  return r;
}
function ja(e, t) {
  return "Object(" + h(e, t.f) + ")";
}
function j$1(e, t) {
  let r = h(e, t);
  return t.t === 4 ? r : "(" + r + ")";
}
function Ua(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return "(" + M(e, t.s, j$1(e, t.f) + "()") + ").p";
}
function Fa(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return j$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function Ha(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return j$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function Da(e, t) {
  let r = e.base.plugins;
  if (r) for (let n = 0, a = r.length; n < a; n++) {
    let i = r[n];
    if (i.tag === t.c) return e.child == null && (e.child = new da(e)), i.serialize(t.s, e.child, { id: t.i });
  }
  throw new jt$2(t.c);
}
function qa(e, t) {
  let r = "", n = false;
  return t.f.t !== 4 && (E(e.base, t.f.i), r = "(" + h(e, t.f) + ",", n = true), r += M(e, t.i, "(" + Wn$1 + ")(" + m(e, t.f.i) + ")"), n && (r += ")"), r;
}
function Ma(e, t) {
  return j$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Ba(e, t) {
  let r = t.a[0], n = t.a[1], a = e.base, i = "";
  r.t !== 4 && (E(a, r.i), i += "(" + h(e, r)), n.t !== 4 && (E(a, n.i), i += (i ? "," : "(") + h(e, n)), i && (i += ",");
  let o = M(e, t.i, "(" + Gn$1 + ")(" + m(e, n.i) + "," + m(e, r.i) + ")");
  return i ? i + o + ")" : o;
}
function Wa(e, t) {
  return j$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Ga(e, t) {
  let r = M(e, t.i, j$1(e, t.f) + "()"), n = t.a.length;
  if (n) {
    let a = h(e, t.a[0]);
    for (let i = 1; i < n; i++) a += "," + h(e, t.a[i]);
    return "(" + r + "," + a + "," + m(e, t.i) + ")";
  }
  return r;
}
function Va(e, t) {
  return m(e, t.i) + ".next(" + h(e, t.f) + ")";
}
function Xa(e, t) {
  return m(e, t.i) + ".throw(" + h(e, t.f) + ")";
}
function Ya(e, t) {
  return m(e, t.i) + ".return(" + h(e, t.f) + ")";
}
function Ja(e, t) {
  switch (t.t) {
    case 17:
      return Wr[t.s];
    case 18:
      return wa(t);
    case 9:
      return va(e, t);
    case 10:
      return Sa(e, t);
    case 11:
      return Aa(e, t);
    case 5:
      return $a(t);
    case 6:
      return _a(e, t);
    case 7:
      return za(e, t);
    case 8:
      return Ca(e, t);
    case 19:
      return Ta(e, t);
    case 16:
    case 15:
      return Pa(e, t);
    case 20:
      return Ia(e, t);
    case 14:
      return Oa(e, t);
    case 13:
      return Na(e, t);
    case 12:
      return La(e, t);
    case 21:
      return ja(e, t);
    case 22:
      return Ua(e, t);
    case 25:
      return Da(e, t);
    case 26:
      return Kn$1[t.s];
    default:
      throw new N$1(t);
  }
}
function h(e, t) {
  switch (t.t) {
    case 2:
      return Vr[t.s];
    case 0:
      return "" + t.s;
    case 1:
      return '"' + t.s + '"';
    case 3:
      return t.s + "n";
    case 4:
      return m(e, t.i);
    case 23:
      return Fa(e, t);
    case 24:
      return Ha(e, t);
    case 27:
      return qa(e, t);
    case 28:
      return Ma(e, t);
    case 29:
      return Ba(e, t);
    case 30:
      return Wa(e, t);
    case 31:
      return Ga(e, t);
    case 32:
      return Va(e, t);
    case 33:
      return Xa(e, t);
    case 34:
      return Ya(e, t);
    default:
      return M(e, t.i, Ja(e, t));
  }
}
function Ka(e, t) {
  let r = h(e, t), n = t.i;
  if (n == null) return r;
  let a = ya(e.base), i = m(e, n), o = e.state.scopeId, u = o == null ? "" : ie$2, c = a ? "(" + r + "," + a + i + ")" : r;
  if (u === "") return t.t === 10 && !a ? "(" + c + ")" : c;
  let l = o == null ? "()" : "(" + ie$2 + '["' + k(o) + '"])';
  return "(" + Kt$2([u], c) + ")" + l;
}
var Za = class {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return S(this._p, this.depth, e);
  }
}, Qa = class {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return S(this._p, this.depth, e);
  }
  parseWithError(e) {
    return I$1(this._p, this.depth, e);
  }
  isAlive() {
    return this._p.state.alive;
  }
  pushPendingState() {
    He(this._p);
  }
  popPendingState() {
    J$2(this._p);
  }
  onParse(e) {
    D$1(this._p, e);
  }
  onError(e) {
    Ue$1(this._p, e);
  }
};
function ei$1(e) {
  return { alive: true, pending: 0, initial: true, buffer: [], onParse: e.onParse, onError: e.onError, onDone: e.onDone };
}
function ti$1(e) {
  return { type: 2, base: ss$1(2, e), state: ei$1(e) };
}
function ri$1(e, t, r) {
  let n = [];
  for (let a = 0, i = r.length; a < i; a++) a in r ? n[a] = S(e, t, r[a]) : n[a] = 0;
  return n;
}
function ni$1(e, t, r, n) {
  return yn$1(r, n, ri$1(e, t, n));
}
function je$1(e, t, r) {
  let n = Object.entries(r), a = [], i = [];
  for (let o = 0, u = n.length; o < u; o++) a.push(k(n[o][0])), i.push(S(e, t, n[o][1]));
  return A$1 in r && (a.push(P(e.base, A$1)), i.push(xn$1(is$1(e.base), S(e, t, ts$1(r))))), x in r && (a.push(P(e.base, x)), i.push(An$1(os$1(e.base), S(e, t, e.type === 1 ? ee$2() : Zn$1(r))))), H$2 in r && (a.push(P(e.base, H$2)), i.push(Ot$2(r[H$2]))), F in r && (a.push(P(e.base, F)), i.push(r[F] ? _t$1 : zt$2)), { k: a, v: i };
}
function de$2(e, t, r, n, a) {
  return us$1(r, n, a, je$1(e, t, n));
}
function si$1(e, t, r, n) {
  return bn$1(r, S(e, t, n.valueOf()));
}
function ai$1(e, t, r, n) {
  return wn$1(r, n, S(e, t, n.buffer));
}
function ii$1(e, t, r, n) {
  return vn(r, n, S(e, t, n.buffer));
}
function oi$1(e, t, r, n) {
  return Sn(r, n, S(e, t, n.buffer));
}
function Qe$1(e, t, r, n) {
  let a = Pt$2(n, e.base.features);
  return Rn$1(r, n, a ? je$1(e, t, a) : s);
}
function ui$1(e, t, r, n) {
  let a = Pt$2(n, e.base.features);
  return En$1(r, n, a ? je$1(e, t, a) : s);
}
function ci$1(e, t, r, n) {
  let a = [], i = [];
  for (let [o, u] of n.entries()) a.push(S(e, t, o)), i.push(S(e, t, u));
  return cs$1(e.base, r, a, i);
}
function li$1(e, t, r, n) {
  let a = [];
  for (let i of n.keys()) a.push(S(e, t, i));
  return kn$1(r, a);
}
function fi$1(e, t, r, n) {
  let a = $n$1(r, L(e.base, 4), []);
  return e.type === 1 || (He(e), n.on({ next: (i) => {
    if (e.state.alive) {
      let o = I$1(e, t, i);
      o && D$1(e, _n$1(r, o));
    }
  }, throw: (i) => {
    if (e.state.alive) {
      let o = I$1(e, t, i);
      o && D$1(e, zn$1(r, o));
    }
    J$2(e);
  }, return: (i) => {
    if (e.state.alive) {
      let o = I$1(e, t, i);
      o && D$1(e, Cn$2(r, o));
    }
    J$2(e);
  } })), a;
}
function pi(e, t, r) {
  if (this.state.alive) {
    let n = I$1(this, t, r);
    n && D$1(this, g(23, e, s, s, s, s, s, [L(this.base, 2), n], s, s, s, s)), J$2(this);
  }
}
function di$1(e, t, r) {
  if (this.state.alive) {
    let n = I$1(this, t, r);
    n && D$1(this, g(24, e, s, s, s, s, s, [L(this.base, 3), n], s, s, s, s));
  }
  J$2(this);
}
function hi(e, t, r, n) {
  let a = Mt$2(e.base, {});
  return e.type === 2 && (He(e), n.then(pi.bind(e, a, t), di$1.bind(e, a, t))), ls$1(e.base, r, a);
}
function gi$1(e, t, r, n, a) {
  for (let i = 0, o = a.length; i < o; i++) {
    let u = a[i];
    if (u.parse.sync && u.test(n)) return Nt$2(r, u.tag, u.parse.sync(n, new Za(e, t), { id: r }));
  }
  return s;
}
function mi(e, t, r, n, a) {
  for (let i = 0, o = a.length; i < o; i++) {
    let u = a[i];
    if (u.parse.stream && u.test(n)) return Nt$2(r, u.tag, u.parse.stream(n, new Qa(e, t), { id: r }));
  }
  return s;
}
function sr$1(e, t, r, n) {
  let a = e.base.plugins;
  return a ? e.type === 1 ? gi$1(e, t, r, n, a) : mi(e, t, r, n, a) : s;
}
function yi(e, t, r, n, a) {
  switch (a) {
    case Object:
      return de$2(e, t, r, n, false);
    case s:
      return de$2(e, t, r, n, true);
    case Date:
      return dn$2(r, n);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return Qe$1(e, t, r, n);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return si$1(e, t, r, n);
    case ArrayBuffer:
      return fs$1(e.base, r, n);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return ai$1(e, t, r, n);
    case DataView:
      return oi$1(e, t, r, n);
    case Map:
      return ci$1(e, t, r, n);
    case Set:
      return li$1(e, t, r, n);
  }
  if (a === Promise || n instanceof Promise) return hi(e, t, r, n);
  let i = e.base.features;
  if (i & 32 && a === RegExp) return hn$2(r, n);
  if (i & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return ii$1(e, t, r, n);
  }
  if (i & 1 && typeof AggregateError < "u" && (a === AggregateError || n instanceof AggregateError)) return ui$1(e, t, r, n);
  if (n instanceof Error) return Qe$1(e, t, r, n);
  if (A$1 in n || x in n) return de$2(e, t, r, n, !!a);
  throw new ce$2(n);
}
function bi(e, t, r, n) {
  if (Array.isArray(n)) return ni$1(e, t, r, n);
  if (fe$1(n)) return fi$1(e, t, r, n);
  let a = n.constructor;
  return a === Un$1 ? S(e, t, n.replacement) : sr$1(e, t, r, n) || yi(e, t, r, n, a);
}
function wi$1(e, t, r) {
  let n = Oe(e.base, r);
  if (n.type !== 0) return n.value;
  let a = sr$1(e, t, n.value, r);
  if (a) return a;
  throw new ce$2(r);
}
function S(e, t, r) {
  if (t >= e.base.depthLimit) throw new Ut$1(e.base.depthLimit);
  switch (typeof r) {
    case "boolean":
      return r ? _t$1 : zt$2;
    case "undefined":
      return Jr$1;
    case "string":
      return Ot$2(r);
    case "number":
      return ln$2(r);
    case "bigint":
      return fn$2(r);
    case "object": {
      if (r) {
        let n = Oe(e.base, r);
        return n.type === 0 ? bi(e, t + 1, n.value, r) : n.value;
      }
      return Kr;
    }
    case "symbol":
      return P(e.base, r);
    case "function":
      return wi$1(e, t, r);
    default:
      throw new ce$2(r);
  }
}
function D$1(e, t) {
  e.state.initial ? e.state.buffer.push(t) : Fe$1(e, t, false);
}
function Ue$1(e, t) {
  if (e.state.onError) e.state.onError(t);
  else throw t instanceof Be$1 ? t : new Be$1(t);
}
function ar$1(e) {
  e.state.onDone && e.state.onDone();
}
function Fe$1(e, t, r) {
  try {
    e.state.onParse(t, r);
  } catch (n) {
    Ue$1(e, n);
  }
}
function He(e) {
  e.state.pending++;
}
function J$2(e) {
  --e.state.pending <= 0 && ar$1(e);
}
function I$1(e, t, r) {
  try {
    return S(e, t, r);
  } catch (n) {
    return Ue$1(e, n), s;
  }
}
function vi(e, t) {
  let r = I$1(e, 0, t);
  r && (Fe$1(e, r, true), e.state.initial = false, Si$1(e, e.state), e.state.pending <= 0 && ir$1(e));
}
function Si$1(e, t) {
  for (let r = 0, n = t.buffer.length; r < n; r++) Fe$1(e, t.buffer[r], false);
}
function ir$1(e) {
  e.state.alive && (ar$1(e), e.state.alive = false);
}
function Ri$1(e, t) {
  let r = Wt$2(t.plugins), n = ti$1({ plugins: r, refs: t.refs, disabledFeatures: t.disabledFeatures, onParse(a, i) {
    let o = pa({ plugins: r, features: n.base.features, scopeId: t.scopeId, markedRefs: n.base.marked }), u;
    try {
      u = Ka(o, a);
    } catch (c) {
      t.onError && t.onError(c);
      return;
    }
    t.onSerialize(u, i);
  }, onError: t.onError, onDone: t.onDone });
  return vi(n, e), ir$1.bind(null, n);
}
function et$1(e, t = {}) {
  var r;
  let n = Wt$2(t.plugins), a = t.disabledFeatures || 0, i = (r = e.f) != null ? r : 63, o = ws$1({ plugins: n, markedRefs: e.m, features: i & ~a, disabledFeatures: a });
  return Zs$1(o, e.t);
}
function he$1(e) {
  return { detail: e.detail, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var Ei$1 = { tag: "seroval-plugins/web/CustomEvent", test(e) {
  return typeof CustomEvent > "u" ? false : e instanceof CustomEvent;
}, parse: { sync(e, t) {
  return { type: t.parse(e.type), options: t.parse(he$1(e)) };
}, async async(e, t) {
  return { type: await t.parse(e.type), options: await t.parse(he$1(e)) };
}, stream(e, t) {
  return { type: t.parse(e.type), options: t.parse(he$1(e)) };
} }, serialize(e, t) {
  return "new CustomEvent(" + t.serialize(e.type) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new CustomEvent(t.deserialize(e.type), t.deserialize(e.options));
} }, xe = Ei$1, ki$1 = { tag: "seroval-plugins/web/DOMException", test(e) {
  return typeof DOMException > "u" ? false : e instanceof DOMException;
}, parse: { sync(e, t) {
  return { name: t.parse(e.name), message: t.parse(e.message) };
}, async async(e, t) {
  return { name: await t.parse(e.name), message: await t.parse(e.message) };
}, stream(e, t) {
  return { name: t.parse(e.name), message: t.parse(e.message) };
} }, serialize(e, t) {
  return "new DOMException(" + t.serialize(e.message) + "," + t.serialize(e.name) + ")";
}, deserialize(e, t) {
  return new DOMException(t.deserialize(e.message), t.deserialize(e.name));
} }, Ae$1 = ki$1;
function ge$1(e) {
  return { bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var xi$1 = { tag: "seroval-plugins/web/Event", test(e) {
  return typeof Event > "u" ? false : e instanceof Event;
}, parse: { sync(e, t) {
  return { type: t.parse(e.type), options: t.parse(ge$1(e)) };
}, async async(e, t) {
  return { type: await t.parse(e.type), options: await t.parse(ge$1(e)) };
}, stream(e, t) {
  return { type: t.parse(e.type), options: t.parse(ge$1(e)) };
} }, serialize(e, t) {
  return "new Event(" + t.serialize(e.type) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Event(t.deserialize(e.type), t.deserialize(e.options));
} }, $e$1 = xi$1, Ai$1 = { tag: "seroval-plugins/web/File", test(e) {
  return typeof File > "u" ? false : e instanceof File;
}, parse: { async async(e, t) {
  return { name: await t.parse(e.name), options: await t.parse({ type: e.type, lastModified: e.lastModified }), buffer: await t.parse(await e.arrayBuffer()) };
} }, serialize(e, t) {
  return "new File([" + t.serialize(e.buffer) + "]," + t.serialize(e.name) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new File([t.deserialize(e.buffer)], t.deserialize(e.name), t.deserialize(e.options));
} }, $i$1 = Ai$1;
function me(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var V$1 = {}, or$1 = (e, t = new FormData(), r = 0, n = e.length, a) => {
  for (; r < n; r++) a = e[r], t.append(a[0], a[1]);
  return t;
}, _i$1 = { tag: "seroval-plugins/web/FormDataFactory", test(e) {
  return e === V$1;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize() {
  return or$1.toString();
}, deserialize() {
  return V$1;
} }, zi$1 = { tag: "seroval-plugins/web/FormData", extends: [$i$1, _i$1], test(e) {
  return typeof FormData > "u" ? false : e instanceof FormData;
}, parse: { sync(e, t) {
  return { factory: t.parse(V$1), entries: t.parse(me(e)) };
}, async async(e, t) {
  return { factory: await t.parse(V$1), entries: await t.parse(me(e)) };
}, stream(e, t) {
  return { factory: t.parse(V$1), entries: t.parse(me(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.entries) + ")";
}, deserialize(e, t) {
  return or$1(t.deserialize(e.entries));
} }, _e$1 = zi$1;
function ye(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var Ci$1 = { tag: "seroval-plugins/web/Headers", test(e) {
  return typeof Headers > "u" ? false : e instanceof Headers;
}, parse: { sync(e, t) {
  return t.parse(ye(e));
}, async async(e, t) {
  return await t.parse(ye(e));
}, stream(e, t) {
  return t.parse(ye(e));
} }, serialize(e, t) {
  return "new Headers(" + t.serialize(e) + ")";
}, deserialize(e, t) {
  return new Headers(t.deserialize(e));
} }, K$1 = Ci$1, X$2 = {}, ur$1 = (e) => new ReadableStream({ start: (t) => {
  e.on({ next: (r) => {
    try {
      t.enqueue(r);
    } catch {
    }
  }, throw: (r) => {
    t.error(r);
  }, return: () => {
    try {
      t.close();
    } catch {
    }
  } });
} }), Ti$1 = { tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === X$2;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize() {
  return ur$1.toString();
}, deserialize() {
  return X$2;
} };
function tt$1(e) {
  let t = ee$2(), r = e.getReader();
  async function n() {
    try {
      let a = await r.read();
      a.done ? t.return(a.value) : (t.next(a.value), await n());
    } catch (a) {
      t.throw(a);
    }
  }
  return n().catch(() => {
  }), t;
}
var Pi$1 = { tag: "seroval/plugins/web/ReadableStream", extends: [Ti$1], test(e) {
  return typeof ReadableStream > "u" ? false : e instanceof ReadableStream;
}, parse: { sync(e, t) {
  return { factory: t.parse(X$2), stream: t.parse(ee$2()) };
}, async async(e, t) {
  return { factory: await t.parse(X$2), stream: await t.parse(tt$1(e)) };
}, stream(e, t) {
  return { factory: t.parse(X$2), stream: t.parse(tt$1(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.stream) + ")";
}, deserialize(e, t) {
  let r = t.deserialize(e.stream);
  return ur$1(r);
} }, Z$1 = Pi$1;
function rt$1(e, t) {
  return { body: t, cache: e.cache, credentials: e.credentials, headers: e.headers, integrity: e.integrity, keepalive: e.keepalive, method: e.method, mode: e.mode, redirect: e.redirect, referrer: e.referrer, referrerPolicy: e.referrerPolicy };
}
var Ii$1 = { tag: "seroval-plugins/web/Request", extends: [Z$1, K$1], test(e) {
  return typeof Request > "u" ? false : e instanceof Request;
}, parse: { async async(e, t) {
  return { url: await t.parse(e.url), options: await t.parse(rt$1(e, e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null)) };
}, stream(e, t) {
  return { url: t.parse(e.url), options: t.parse(rt$1(e, e.body && !e.bodyUsed ? e.clone().body : null)) };
} }, serialize(e, t) {
  return "new Request(" + t.serialize(e.url) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Request(t.deserialize(e.url), t.deserialize(e.options));
} }, ze = Ii$1;
function nt(e) {
  return { headers: e.headers, status: e.status, statusText: e.statusText };
}
var Oi$1 = { tag: "seroval-plugins/web/Response", extends: [Z$1, K$1], test(e) {
  return typeof Response > "u" ? false : e instanceof Response;
}, parse: { async async(e, t) {
  return { body: await t.parse(e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null), options: await t.parse(nt(e)) };
}, stream(e, t) {
  return { body: t.parse(e.body && !e.bodyUsed ? e.clone().body : null), options: t.parse(nt(e)) };
} }, serialize(e, t) {
  return "new Response(" + t.serialize(e.body) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Response(t.deserialize(e.body), t.deserialize(e.options));
} }, Ce$1 = Oi$1, Ni$1 = { tag: "seroval-plugins/web/URL", test(e) {
  return typeof URL > "u" ? false : e instanceof URL;
}, parse: { sync(e, t) {
  return t.parse(e.href);
}, async async(e, t) {
  return await t.parse(e.href);
}, stream(e, t) {
  return t.parse(e.href);
} }, serialize(e, t) {
  return "new URL(" + t.serialize(e) + ")";
}, deserialize(e, t) {
  return new URL(t.deserialize(e));
} }, Te$1 = Ni$1, Li$1 = { tag: "seroval-plugins/web/URLSearchParams", test(e) {
  return typeof URLSearchParams > "u" ? false : e instanceof URLSearchParams;
}, parse: { sync(e, t) {
  return t.parse(e.toString());
}, async async(e, t) {
  return await t.parse(e.toString());
}, stream(e, t) {
  return t.parse(e.toString());
} }, serialize(e, t) {
  return "new URLSearchParams(" + t.serialize(e) + ")";
}, deserialize(e, t) {
  return new URLSearchParams(t.deserialize(e));
} }, Pe$1 = Li$1;
function ji$1(e = {}) {
  let t, r = false;
  const n = (o) => {
    if (t && t !== o) throw new Error("Context conflict");
  };
  let a;
  if (e.asyncContext) {
    const o = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    o ? a = new o() : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const i = () => {
    if (a) {
      const o = a.getStore();
      if (o !== void 0) return o;
    }
    return t;
  };
  return { use: () => {
    const o = i();
    if (o === void 0) throw new Error("Context is not available");
    return o;
  }, tryUse: () => i(), set: (o, u) => {
    u || n(o), t = o, r = true;
  }, unset: () => {
    t = void 0, r = false;
  }, call: (o, u) => {
    n(o), t = o;
    try {
      return a ? a.run(o, u) : u();
    } finally {
      r || (t = void 0);
    }
  }, async callAsync(o, u) {
    t = o;
    const c = () => {
      t = o;
    }, l = () => t === o ? c : void 0;
    it$2.add(l);
    try {
      const p = a ? a.run(o, u) : u();
      return r || (t = void 0), await p;
    } finally {
      it$2.delete(l);
    }
  } };
}
function Ui$1(e = {}) {
  const t = {};
  return { get(r, n = {}) {
    return t[r] || (t[r] = ji$1({ ...e, ...n })), t[r];
  } };
}
const oe$1 = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, st$1 = "__unctx__", Fi$1 = oe$1[st$1] || (oe$1[st$1] = Ui$1()), Hi$1 = (e, t = {}) => Fi$1.get(e, t), at$2 = "__unctx_async_handlers__", it$2 = oe$1[at$2] || (oe$1[at$2] = /* @__PURE__ */ new Set());
function Di$1(e) {
  let t;
  const r = lr$1(e), n = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(r, { ...n, body: e.node.req.body }) : new Request(r, { ...n, get body() {
    return t || (t = Ki$1(e), t);
  } });
}
function qi$1(e) {
  var _a2;
  return (_a2 = e.web) != null ? _a2 : e.web = { request: Di$1(e), url: lr$1(e) }, e.web.request;
}
function Mi$1() {
  return to$1();
}
const cr$1 = /* @__PURE__ */ Symbol("$HTTPEvent");
function Bi$1(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[cr$1]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function w(e) {
  return function(...t) {
    var _a2;
    let r = t[0];
    if (Bi$1(r)) t[0] = r instanceof H3Event || r.__is_event__ ? r : r[cr$1];
    else {
      if (!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (r = Mi$1(), !r) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(r);
    }
    return e(...t);
  };
}
const lr$1 = w(getRequestURL), Wi$1 = w(getRequestIP), ue$2 = w(setResponseStatus), ot$1 = w(getResponseStatus), Gi$1 = w(getResponseStatusText), se$2 = w(getResponseHeaders), ut$2 = w(getResponseHeader), Vi$1 = w(setResponseHeader), fr$1 = w(appendResponseHeader), Xi$1 = w(parseCookies), Yi$1 = w(getCookie), Ji$1 = w(setCookie), ae$2 = w(setHeader), Ki$1 = w(getRequestWebStream), Zi$1 = w(removeResponseHeader), Qi$1 = w(qi$1);
function eo$1() {
  var _a2;
  return Hi$1("nitro-app", { asyncContext: !!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function to$1() {
  return eo$1().use().event;
}
const be$1 = "Invariant Violation", { setPrototypeOf: ro = function(e, t) {
  return e.__proto__ = t, e;
} } = Object;
let De$1 = class De extends Error {
  constructor(t = be$1) {
    super(typeof t == "number" ? `${be$1}: ${t} (see https://github.com/apollographql/invariant-packages)` : t);
    __publicField$2(this, "framesToPop", 1);
    __publicField$2(this, "name", be$1);
    ro(this, De.prototype);
  }
};
function no$1(e, t) {
  if (!e) throw new De$1(t);
}
const we$1 = "solidFetchEvent";
function so(e) {
  return { request: Qi$1(e), response: uo$1(e), clientAddress: Wi$1(e), locals: {}, nativeEvent: e };
}
function ao$1(e) {
  return { ...e };
}
function io(e) {
  if (!e.context[we$1]) {
    const t = so(e);
    e.context[we$1] = t;
  }
  return e.context[we$1];
}
function ct$1(e, t) {
  for (const [r, n] of t.entries()) fr$1(e, r, n);
}
let oo$1 = class oo {
  constructor(t) {
    __publicField$2(this, "event");
    this.event = t;
  }
  get(t) {
    const r = ut$2(this.event, t);
    return Array.isArray(r) ? r.join(", ") : r || null;
  }
  has(t) {
    return this.get(t) !== null;
  }
  set(t, r) {
    return Vi$1(this.event, t, r);
  }
  delete(t) {
    return Zi$1(this.event, t);
  }
  append(t, r) {
    fr$1(this.event, t, r);
  }
  getSetCookie() {
    const t = ut$2(this.event, "Set-Cookie");
    return Array.isArray(t) ? t : [t];
  }
  forEach(t) {
    return Object.entries(se$2(this.event)).forEach(([r, n]) => t(Array.isArray(n) ? n.join(", ") : n, r, this));
  }
  entries() {
    return Object.entries(se$2(this.event)).map(([t, r]) => [t, Array.isArray(r) ? r.join(", ") : r])[Symbol.iterator]();
  }
  keys() {
    return Object.keys(se$2(this.event))[Symbol.iterator]();
  }
  values() {
    return Object.values(se$2(this.event)).map((t) => Array.isArray(t) ? t.join(", ") : t)[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
};
function uo$1(e) {
  return { get status() {
    return ot$1(e);
  }, set status(t) {
    ue$2(e, t);
  }, get statusText() {
    return Gi$1(e);
  }, set statusText(t) {
    ue$2(e, ot$1(e), t);
  }, headers: new oo$1(e) };
}
const q$1 = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function co$1(e = {}) {
  const t = { options: e, rootNode: pr$1(), staticRoutesMap: {} }, r = (n) => e.strictTrailingSlash ? n : n.replace(/\/$/, "") || "/";
  if (e.routes) for (const n in e.routes) lt$2(t, r(n), e.routes[n]);
  return { ctx: t, lookup: (n) => lo$1(t, r(n)), insert: (n, a) => lt$2(t, r(n), a), remove: (n) => fo$1(t, r(n)) };
}
function lo$1(e, t) {
  const r = e.staticRoutesMap[t];
  if (r) return r.data;
  const n = t.split("/"), a = {};
  let i = false, o = null, u = e.rootNode, c = null;
  for (let l = 0; l < n.length; l++) {
    const p = n[l];
    u.wildcardChildNode !== null && (o = u.wildcardChildNode, c = n.slice(l).join("/"));
    const d = u.children.get(p);
    if (d === void 0) {
      if (u && u.placeholderChildren.length > 1) {
        const v = n.length - l;
        u = u.placeholderChildren.find((f) => f.maxDepth === v) || null;
      } else u = u.placeholderChildren[0] || null;
      if (!u) break;
      u.paramName && (a[u.paramName] = p), i = true;
    } else u = d;
  }
  return (u === null || u.data === null) && o !== null && (u = o, a[u.paramName || "_"] = c, i = true), u ? i ? { ...u.data, params: i ? a : void 0 } : u.data : null;
}
function lt$2(e, t, r) {
  let n = true;
  const a = t.split("/");
  let i = e.rootNode, o = 0;
  const u = [i];
  for (const c of a) {
    let l;
    if (l = i.children.get(c)) i = l;
    else {
      const p = po$1(c);
      l = pr$1({ type: p, parent: i }), i.children.set(c, l), p === q$1.PLACEHOLDER ? (l.paramName = c === "*" ? `_${o++}` : c.slice(1), i.placeholderChildren.push(l), n = false) : p === q$1.WILDCARD && (i.wildcardChildNode = l, l.paramName = c.slice(3) || "_", n = false), u.push(l), i = l;
    }
  }
  for (const [c, l] of u.entries()) l.maxDepth = Math.max(u.length - c, l.maxDepth || 0);
  return i.data = r, n === true && (e.staticRoutesMap[t] = i), i;
}
function fo$1(e, t) {
  let r = false;
  const n = t.split("/");
  let a = e.rootNode;
  for (const i of n) if (a = a.children.get(i), !a) return r;
  if (a.data) {
    const i = n.at(-1) || "";
    a.data = null, Object.keys(a.children).length === 0 && a.parent && (a.parent.children.delete(i), a.parent.wildcardChildNode = null, a.parent.placeholderChildren = []), r = true;
  }
  return r;
}
function pr$1(e = {}) {
  return { type: e.type || q$1.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function po$1(e) {
  return e.startsWith("**") ? q$1.WILDCARD : e[0] === ":" || e === "*" ? q$1.PLACEHOLDER : q$1.NORMAL;
}
const dr$1 = [{ page: true, $component: { src: "src/routes/agents/index.tsx?pick=default&pick=$css", build: () => import('../build/index.mjs'), import: () => import('../build/index.mjs') }, path: "/agents/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/agents/index.tsx" }, { page: false, $GET: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_.mjs'), import: () => import('../build/_...path_.mjs') }, $HEAD: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_.mjs'), import: () => import('../build/_...path_.mjs') }, $POST: { src: "src/routes/api/[...path].ts?pick=POST", build: () => import('../build/_...path_2.mjs'), import: () => import('../build/_...path_2.mjs') }, path: "/api/*path", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/api/[...path].ts" }, { page: false, $GET: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health.mjs'), import: () => import('../build/health.mjs') }, $HEAD: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health.mjs'), import: () => import('../build/health.mjs') }, path: "/api/health", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/api/health.ts" }, { page: true, $component: { src: "src/routes/index.tsx?pick=default&pick=$css", build: () => import('../build/index2.mjs'), import: () => import('../build/index2.mjs') }, path: "/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/index.tsx" }, { page: true, $component: { src: "src/routes/models/index.tsx?pick=default&pick=$css", build: () => import('../build/index3.mjs'), import: () => import('../build/index3.mjs') }, path: "/models/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/models/index.tsx" }, { page: true, $component: { src: "src/routes/settings/index.tsx?pick=default&pick=$css", build: () => import('../build/index4.mjs'), import: () => import('../build/index4.mjs') }, path: "/settings/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/settings/index.tsx" }], ho$1 = go$1(dr$1.filter((e) => e.page));
function go$1(e) {
  function t(r, n, a, i) {
    const o = Object.values(r).find((u) => a.startsWith(u.id + "/"));
    return o ? (t(o.children || (o.children = []), n, a.slice(o.id.length)), r) : (r.push({ ...n, id: a, path: a.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), r);
  }
  return e.sort((r, n) => r.path.length - n.path.length).reduce((r, n) => t(r, n, n.path, n.path), []);
}
function mo$1(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
co$1({ routes: dr$1.reduce((e, t) => {
  if (!mo$1(t)) return e;
  let r = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (n, a) => `**:${a}`).split("/").map((n) => n.startsWith(":") || n.startsWith("*") ? n : encodeURIComponent(n)).join("/");
  if (/:[^/]*\?/g.test(r)) throw new Error(`Optional parameters are not supported in API routes: ${r}`);
  if (e[r]) throw new Error(`Duplicate API routes for "${r}" found at "${e[r].route.path}" and "${t.path}"`);
  return e[r] = { route: t }, e;
}, {}) });
var bo$1 = " ";
const wo$1 = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(bo$1), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function vo$1(e, t) {
  let { tag: r, attrs: { key: n, ...a } = { key: void 0 }, children: i } = e;
  return wo$1[r]({ attrs: { ...a, nonce: t }, key: n, children: i });
}
function So$1(e, t, r, n = "default") {
  return lazy(async () => {
    var _a2;
    {
      const i = (await e.import())[n], u = (await ((_a2 = t.inputs) == null ? void 0 : _a2[e.src].assets())).filter((l) => l.tag === "style" || l.attrs.rel === "stylesheet");
      return { default: (l) => [...u.map((p) => vo$1(p)), createComponent(i, l)] };
    }
  });
}
function hr$1() {
  function e(r) {
    return { ...r, ...r.$$route ? r.$$route.require().route : void 0, info: { ...r.$$route ? r.$$route.require().route.info : {}, filesystem: true }, component: r.$component && So$1(r.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: r.children ? r.children.map(e) : void 0 };
  }
  return ho$1.map(e);
}
let ft$2;
const Uo = isServer ? () => getRequestEvent().routes : () => ft$2 || (ft$2 = hr$1());
function Ro$1(e) {
  const t = Yi$1(e.nativeEvent, "flash");
  if (t) try {
    let r = JSON.parse(t);
    if (!r || !r.result) return;
    const n = [...r.input.slice(0, -1), new Map(r.input[r.input.length - 1])], a = r.error ? new Error(r.result) : r.result;
    return { input: n, url: r.url, pending: false, result: r.thrown ? void 0 : a, error: r.thrown ? a : void 0 };
  } catch (r) {
    console.error(r);
  } finally {
    Ji$1(e.nativeEvent, "flash", "", { maxAge: 0 });
  }
}
async function Eo$1(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, e.response.headers.set("Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], router: { submission: Ro$1(e) }, routes: hr$1(), complete: false, $islands: /* @__PURE__ */ new Set() });
}
const ko$1 = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function xo$1(e) {
  return e.status && ko$1.has(e.status) ? e.status : 302;
}
const Ao$1 = {};
function $o$1(e) {
  const t = new TextEncoder().encode(e), r = t.length, n = r.toString(16), a = "00000000".substring(0, 8 - n.length) + n, i = new TextEncoder().encode(`;0x${a};`), o = new Uint8Array(12 + r);
  return o.set(i), o.set(t, 12), o;
}
function pt$2(e, t) {
  return new ReadableStream({ start(r) {
    Ri$1(t, { scopeId: e, plugins: [xe, Ae$1, $e$1, _e$1, K$1, Z$1, ze, Ce$1, Pe$1, Te$1], onSerialize(n, a) {
      r.enqueue($o$1(a ? `(${sn$2(e)},${n})` : n));
    }, onDone() {
      r.close();
    }, onError(n) {
      r.error(n);
    } });
  } });
}
async function _o$1(e) {
  const t = io(e), r = t.request, n = r.headers.get("X-Server-Id"), a = r.headers.get("X-Server-Instance"), i = r.headers.has("X-Single-Flight"), o = new URL(r.url);
  let u, c;
  if (n) no$1(typeof n == "string", "Invalid server function"), [u, c] = n.split("#");
  else if (u = o.searchParams.get("id"), c = o.searchParams.get("name"), !u || !c) return new Response(null, { status: 404 });
  const l = Ao$1[u];
  let p;
  if (!l) return new Response(null, { status: 404 });
  p = await l.importer();
  const d = p[l.functionName];
  let v = [];
  if (!a || e.method === "GET") {
    const f = o.searchParams.get("args");
    if (f) {
      const R = JSON.parse(f);
      (R.t ? et$1(R, { plugins: [xe, Ae$1, $e$1, _e$1, K$1, Z$1, ze, Ce$1, Pe$1, Te$1] }) : R).forEach((te) => v.push(te));
    }
  }
  if (e.method === "POST") {
    const f = r.headers.get("content-type"), R = e.node.req, te = R instanceof ReadableStream, gr = R.body instanceof ReadableStream, qe = te && R.locked || gr && R.body.locked, Me = te ? R : R.body;
    if ((f == null ? void 0 : f.startsWith("multipart/form-data")) || (f == null ? void 0 : f.startsWith("application/x-www-form-urlencoded"))) v.push(await (qe ? r : new Request(r, { ...r, body: Me })).formData());
    else if (f == null ? void 0 : f.startsWith("application/json")) {
      const mr = qe ? r : new Request(r, { ...r, body: Me });
      v = et$1(await mr.json(), { plugins: [xe, Ae$1, $e$1, _e$1, K$1, Z$1, ze, Ce$1, Pe$1, Te$1] });
    }
  }
  try {
    let f = await provideRequestEvent(t, async () => (sharedConfig.context = { event: t }, t.locals.serverFunctionMeta = { id: u + "#" + c }, d(...v)));
    if (i && a && (f = await ht$2(t, f)), f instanceof Response) {
      if (f.headers && f.headers.has("X-Content-Raw")) return f;
      a && (f.headers && ct$1(e, f.headers), f.status && (f.status < 300 || f.status >= 400) && ue$2(e, f.status), f.customBody ? f = await f.customBody() : f.body == null && (f = null));
    }
    return a ? (ae$2(e, "content-type", "text/javascript"), pt$2(a, f)) : dt$2(f, r, v);
  } catch (f) {
    if (f instanceof Response) i && a && (f = await ht$2(t, f)), f.headers && ct$1(e, f.headers), f.status && (!a || f.status < 300 || f.status >= 400) && ue$2(e, f.status), f.customBody ? f = f.customBody() : f.body == null && (f = null), ae$2(e, "X-Error", "true");
    else if (a) {
      const R = f instanceof Error ? f.message : typeof f == "string" ? f : "true";
      ae$2(e, "X-Error", R.replace(/[\r\n]+/g, ""));
    } else f = dt$2(f, r, v, true);
    return a ? (ae$2(e, "content-type", "text/javascript"), pt$2(a, f)) : f;
  }
}
function dt$2(e, t, r, n) {
  const a = new URL(t.url), i = e instanceof Error;
  let o = 302, u;
  return e instanceof Response ? (u = new Headers(e.headers), e.headers.has("Location") && (u.set("Location", new URL(e.headers.get("Location"), a.origin + "").toString()), o = xo$1(e))) : u = new Headers({ Location: new URL(t.headers.get("referer")).toString() }), e && u.append("Set-Cookie", `flash=${encodeURIComponent(JSON.stringify({ url: a.pathname + a.search, result: i ? e.message : e, thrown: n, error: i, input: [...r.slice(0, -1), [...r[r.length - 1].entries()]] }))}; Secure; HttpOnly;`), new Response(null, { status: o, headers: u });
}
let ve$1;
function zo$1(e) {
  var _a2;
  const t = new Headers(e.request.headers), r = Xi$1(e.nativeEvent), n = e.response.headers.getSetCookie();
  t.delete("cookie");
  let a = false;
  return ((_a2 = e.nativeEvent.node) == null ? void 0 : _a2.req) && (a = true, e.nativeEvent.node.req.headers.cookie = ""), n.forEach((i) => {
    if (!i) return;
    const { maxAge: o, expires: u, name: c, value: l } = qr$1(i);
    if (o != null && o <= 0) {
      delete r[c];
      return;
    }
    if (u != null && u.getTime() <= Date.now()) {
      delete r[c];
      return;
    }
    r[c] = l;
  }), Object.entries(r).forEach(([i, o]) => {
    t.append("cookie", `${i}=${o}`), a && (e.nativeEvent.node.req.headers.cookie += `${i}=${o};`);
  }), t;
}
async function ht$2(e, t) {
  let r, n = new URL(e.request.headers.get("referer")).toString();
  t instanceof Response && (t.headers.has("X-Revalidate") && (r = t.headers.get("X-Revalidate").split(",")), t.headers.has("Location") && (n = new URL(t.headers.get("Location"), new URL(e.request.url).origin + "").toString()));
  const a = ao$1(e);
  return a.request = new Request(n, { headers: zo$1(e) }), await provideRequestEvent(a, async () => {
    await Eo$1(a), ve$1 || (ve$1 = (await import('../build/app-pNGYNBBG.mjs')).default), a.router.dataOnly = r || true, a.router.previousUrl = e.request.headers.get("referer");
    try {
      renderToString(() => {
        sharedConfig.context.event = a, ve$1();
      });
    } catch (u) {
      console.log(u);
    }
    const i = a.router.data;
    if (!i) return t;
    let o = false;
    for (const u in i) i[u] === void 0 ? delete i[u] : o = true;
    return o && (t instanceof Response ? t.customBody && (i._$value = t.customBody()) : (i._$value = t, t = new Response(null, { status: 200 })), t.customBody = () => i, t.headers.set("X-Single-Flight", "true")), t;
  });
}
const Fo$1 = eventHandler(_o$1);

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
function Ur() {
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
let Wt$1;
function lo() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), Wt$1 = window.history.state._depth;
}
isServer || lo();
function ec(e) {
  return { ...e, _depth: window.history.state && window.history.state._depth };
}
function tc(e, t) {
  let n = false;
  return () => {
    const o = Wt$1;
    lo();
    const r = o == null ? null : Wt$1 - o;
    if (n) {
      n = false;
      return;
    }
    r && t(r) ? (n = true, window.history.go(-r)) : e();
  };
}
const zr = /^(?:[a-z0-9]+:)?\/\//i, Hr = /^\/+|(\/)\/+$/g, jr = "http://sr";
function Ze(e, t = false) {
  const n = e.replace(Hr, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function ht$1(e, t, n) {
  if (zr.test(t)) return;
  const o = Ze(e), r = n && Ze(n);
  let i = "";
  return !r || t.startsWith("/") ? i = o : r.toLowerCase().indexOf(o.toLowerCase()) !== 0 ? i = o + r : i = r, (i || "/") + Ze(t, !i);
}
function qr(e, t) {
  if (e == null) throw new Error(t);
  return e;
}
function Yr(e, t) {
  return Ze(e).replace(/\/*(\*.*)?$/g, "") + Ze(t);
}
function co(e) {
  const t = {};
  return e.searchParams.forEach((n, o) => {
    o in t ? Array.isArray(t[o]) ? t[o].push(n) : t[o] = [t[o], n] : t[o] = n;
  }), t;
}
function Xr(e, t, n) {
  const [o, r] = e.split("/*", 2), i = o.split("/").filter(Boolean), s = i.length;
  return (l) => {
    const c = l.split("/").filter(Boolean), a = c.length - s;
    if (a < 0 || a > 0 && r === void 0 && !t) return null;
    const u = { path: s ? "" : "/", params: {} }, d = (f) => n === void 0 ? void 0 : n[f];
    for (let f = 0; f < s; f++) {
      const g = i[f], h = g[0] === ":", m = h ? c[f] : c[f].toLowerCase(), y = h ? g.slice(1) : g.toLowerCase();
      if (h && Mt$1(m, d(y))) u.params[y] = m;
      else if (h || !Mt$1(m, y)) return null;
      u.path += `/${m}`;
    }
    if (r) {
      const f = a ? c.slice(-a).join("/") : "";
      if (Mt$1(f, d(r))) u.params[r] = f;
      else return null;
    }
    return u;
  };
}
function Mt$1(e, t) {
  const n = (o) => o === e;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function Gr(e) {
  const [t, n] = e.pattern.split("/*", 2), o = t.split("/").filter(Boolean);
  return o.reduce((r, i) => r + (i.startsWith(":") ? 2 : 3), o.length - (n === void 0 ? 0 : 1));
}
function ao(e) {
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
function uo(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let n = e.slice(0, t.index), o = e.slice(t.index + t[0].length);
  const r = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(o); ) r.push(n += t[1]), o = o.slice(t[0].length);
  return uo(o).reduce((i, s) => [...i, ...r.map((l) => l + s)], []);
}
const Zr = 100, Jr = createContext$1(), fo = createContext$1(), Jt$1 = () => qr(useContext(Jr), "<A> and 'use' router primitives can be only used inside a Route."), Qr = () => useContext(fo) || Jt$1().base, nc = (e) => {
  const t = Qr();
  return createMemo(() => t.resolvePath(e()));
}, oc = (e) => {
  const t = Jt$1();
  return createMemo(() => {
    const n = e();
    return n !== void 0 ? t.renderPath(n) : n;
  });
}, rc = () => Jt$1().location;
function ei(e, t = "") {
  const { component: n, preload: o, load: r, children: i, info: s } = e, l = !i || Array.isArray(i) && !i.length, c = { key: e, component: n, preload: o || r, info: s };
  return go(e.path).reduce((a, u) => {
    for (const d of uo(u)) {
      const f = Yr(t, d);
      let g = l ? f : f.split("/*", 1)[0];
      g = g.split("/").map((h) => h.startsWith(":") || h.startsWith("*") ? h : encodeURIComponent(h)).join("/"), a.push({ ...c, originalPath: u, pattern: g, matcher: Xr(g, !l, e.matchFilters) });
    }
    return a;
  }, []);
}
function ti(e, t = 0) {
  return { routes: e, score: Gr(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const o = [];
    for (let r = e.length - 1; r >= 0; r--) {
      const i = e[r], s = i.matcher(n);
      if (!s) return null;
      o.unshift({ ...s, route: i });
    }
    return o;
  } };
}
function go(e) {
  return Array.isArray(e) ? e : [e];
}
function ni(e, t = "", n = [], o = []) {
  const r = go(e);
  for (let i = 0, s = r.length; i < s; i++) {
    const l = r[i];
    if (l && typeof l == "object") {
      l.hasOwnProperty("path") || (l.path = "");
      const c = ei(l, t);
      for (const a of c) {
        n.push(a);
        const u = Array.isArray(l.children) && l.children.length === 0;
        if (l.children && !u) ni(l.children, a.pattern, n, o);
        else {
          const d = ti([...n], o.length);
          o.push(d);
        }
        n.pop();
      }
    }
  }
  return n.length ? o : o.sort((i, s) => s.score - i.score);
}
function Rt$1(e, t) {
  for (let n = 0, o = e.length; n < o; n++) {
    const r = e[n].matcher(t);
    if (r) return r;
  }
  return [];
}
function oi(e, t, n) {
  const o = new URL(jr), r = createMemo((u) => {
    const d = e();
    try {
      return new URL(d, o);
    } catch {
      return console.error(`Invalid path ${d}`), u;
    }
  }, o, { equals: (u, d) => u.href === d.href }), i = createMemo(() => r().pathname), s = createMemo(() => r().search, true), l = createMemo(() => r().hash), c = () => "", a = on$3(s, () => co(r()));
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
  }, query: n ? n(a) : ao(a) };
}
let Le;
function ic() {
  return Le;
}
function sc(e, t, n, o = {}) {
  const { signal: [r, i], utils: s = {} } = e, l = s.parsePath || ((O) => O), c = s.renderPath || ((O) => O), a = s.beforeLeave || Ur(), u = ht$1("", o.base || "");
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
  }, [m, y] = createSignal(r().value), [v, p] = createSignal(r().state), w = oi(m, v, s.queryWrapper), x = [], S = createSignal(isServer ? A() : []), L = createMemo(() => typeof o.transformUrl == "function" ? Rt$1(t(), o.transformUrl(w.pathname)) : Rt$1(t(), w.pathname)), T = () => {
    const O = L(), C = {};
    for (let B = 0; B < O.length; B++) Object.assign(C, O[B].params);
    return C;
  }, D = s.paramsWrapper ? s.paramsWrapper(T, t) : ao(T), M = { pattern: u, path: () => u, outlet: () => null, resolvePath(O) {
    return ht$1(u, O);
  } };
  return createRenderEffect(on$3(r, (O) => h("native", O), { defer: true })), { base: M, location: w, params: D, isRouting: d, renderPath: c, parsePath: l, navigatorFactory: U, matches: L, beforeLeave: a, preloadRoute: Z, singleFlight: o.singleFlight === void 0 ? true : o.singleFlight, submissions: S };
  function $(O, C, B) {
    untrack(() => {
      if (typeof C == "number") {
        C && (s.go ? s.go(C) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const W = !C || C[0] === "?", { replace: G, resolve: oe, scroll: Me, state: Se } = { replace: false, resolve: !W, scroll: true, ...B }, xe = oe ? O.resolvePath(C) : ht$1(W && w.pathname || "", C);
      if (xe === void 0) throw new Error(`Path '${C}' is not a routable path`);
      if (x.length >= Zr) throw new Error("Too many redirects");
      const ct = m();
      if (xe !== ct || Se !== v()) if (isServer) {
        const ze = getRequestEvent();
        ze && (ze.response = { status: 302, headers: new Headers({ Location: xe }) }), i({ value: xe, replace: G, scroll: Me, state: Se });
      } else a.confirm(xe, B) && (x.push({ value: ct, replace: G, scroll: Me, state: v() }), h("navigate", { value: xe, state: Se }));
    });
  }
  function U(O) {
    return O = O || useContext(fo) || M, (C, B) => $(O, C, B);
  }
  function V(O) {
    const C = x[0];
    C && (i({ ...O, replace: C.replace, scroll: C.scroll }), x.length = 0);
  }
  function Z(O, C) {
    const B = Rt$1(t(), O.pathname), W = Le;
    Le = "preload";
    for (let G in B) {
      const { route: oe, params: Me } = B[G];
      oe.component && oe.component.preload && oe.component.preload();
      const { preload: Se } = oe;
      C && Se && runWithOwner(n(), () => Se({ params: Me, location: { pathname: O.pathname, search: O.search, hash: O.hash, query: co(O), state: null, key: "" }, intent: "preload" }));
    }
    Le = W;
  }
  function A() {
    const O = getRequestEvent();
    return O && O.router && O.router.submission ? [O.router.submission] : [];
  }
}
function lc(e, t, n, o) {
  const { base: r, location: i, params: s } = e, { pattern: l, component: c, preload: a } = o().route, u = createMemo(() => o().path);
  c && c.preload && c.preload();
  const d = a ? a({ params: s, location: i, intent: Le || "initial" }) : void 0;
  return { parent: t, pattern: l, path: u, outlet: () => c ? createComponent(c, { params: s, location: i, data: d, get children() {
    return n();
  } }) : n(), resolvePath(g) {
    return ht$1(r.path(), g, u());
  } };
}
const ri = !isServer, ii = ri && !!DEV;
const b = (e) => typeof e == "function" && !e.length ? e() : e, xn = (e) => Array.isArray(e) ? e : e ? [e] : [];
function si(e, ...t) {
  return typeof e == "function" ? e(...t) : e;
}
const li = ii ? (e) => getOwner() ? onCleanup(e) : e : onCleanup;
function ci(e, t, n, o) {
  return e.addEventListener(t, n, o), li(e.removeEventListener.bind(e, t, n, o));
}
function ai(e, t, n, o) {
  if (isServer) return;
  const r = () => {
    xn(b(e)).forEach((i) => {
      i && xn(b(t)).forEach((s) => ci(i, s, n, o));
    });
  };
  typeof e == "function" ? createEffect(r) : createRenderEffect(r);
}
const kt$1 = /* @__PURE__ */ Symbol("fallback");
function En(e) {
  for (const t of e) t.dispose();
}
function ui(e, t, n, o = {}) {
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
      if (!s.length) return En(r.values()), r.clear(), o.fallback ? [createRoot((d) => (r.set(kt$1, { dispose: d }), o.fallback()))] : [];
      const l = new Array(s.length), c = r.get(kt$1);
      if (!r.size || c) {
        c == null ? void 0 : c.dispose(), r.delete(kt$1);
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
function di(e) {
  const { by: t } = e;
  return createMemo(ui(() => e.each, typeof t == "function" ? t : (n) => n[t], e.children, "fallback" in e ? { fallback: () => e.fallback } : void 0));
}
const fi = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
function Dn(e) {
  const t = {};
  let n;
  for (; n = fi.exec(e); ) t[n[1]] = n[2];
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
function gi(e) {
  return typeof e == "number";
}
function Be(e) {
  return Object.prototype.toString.call(e) === "[object String]";
}
function Qt$1(e) {
  return typeof e == "function";
}
function $e(e) {
  return (t) => `${e()}-${t}`;
}
function de$1(e, t) {
  return e ? e === t || e.contains(t) : false;
}
function Ye(e, t = false) {
  const { activeElement: n } = se$1(e);
  if (!(n == null ? void 0 : n.nodeName)) return null;
  if (po(n) && n.contentDocument) return Ye(n.contentDocument.body, t);
  if (t) {
    const o = n.getAttribute("aria-activedescendant");
    if (o) {
      const r = se$1(n).getElementById(o);
      if (r) return r;
    }
  }
  return n;
}
function ho(e) {
  return se$1(e).defaultView || window;
}
function se$1(e) {
  return e ? e.ownerDocument || e : document;
}
function po(e) {
  return e.tagName === "IFRAME";
}
var mo = ((e) => (e.Escape = "Escape", e.Enter = "Enter", e.Tab = "Tab", e.Space = " ", e.ArrowDown = "ArrowDown", e.ArrowLeft = "ArrowLeft", e.ArrowRight = "ArrowRight", e.ArrowUp = "ArrowUp", e.End = "End", e.Home = "Home", e.PageDown = "PageDown", e.PageUp = "PageUp", e))(mo || {});
function H$1(e, t) {
  return t && (Qt$1(t) ? t(e) : t[0](t[1], e)), e == null ? void 0 : e.defaultPrevented;
}
function ie$1(e) {
  return (t) => {
    for (const n of e) H$1(t, n);
  };
}
function wi(e) {
  return e.ctrlKey && !e.metaKey;
}
function X$1(e) {
  if (e) if (Si()) e.focus({ preventScroll: true });
  else {
    const t = xi(e);
    e.focus(), Ei(t);
  }
}
var at$1 = null;
function Si() {
  if (at$1 == null) {
    at$1 = false;
    try {
      document.createElement("div").focus({ get preventScroll() {
        return at$1 = true, true;
      } });
    } catch {
    }
  }
  return at$1;
}
function xi(e) {
  let t = e.parentNode;
  const n = [], o = document.scrollingElement || document.documentElement;
  for (; t instanceof HTMLElement && t !== o; ) (t.offsetHeight < t.scrollHeight || t.offsetWidth < t.scrollWidth) && n.push({ element: t, scrollTop: t.scrollTop, scrollLeft: t.scrollLeft }), t = t.parentNode;
  return o instanceof HTMLElement && n.push({ element: o, scrollTop: o.scrollTop, scrollLeft: o.scrollLeft }), n;
}
function Ei(e) {
  for (const { element: t, scrollTop: n, scrollLeft: o } of e) t.scrollTop = n, t.scrollLeft = o;
}
var vo = ["input:not([type='hidden']):not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "button:not([disabled])", "a[href]", "area[href]", "[tabindex]", "iframe", "object", "embed", "audio[controls]", "video[controls]", "[contenteditable]:not([contenteditable='false'])"], Di = [...vo, '[tabindex]:not([tabindex="-1"]):not([disabled])'], tn$1 = `${vo.join(":not([hidden]),")},[tabindex]:not([disabled]):not([hidden])`, Ti = Di.join(':not([hidden]):not([tabindex="-1"]),');
function bo(e, t) {
  const o = Array.from(e.querySelectorAll(tn$1)).filter(On);
  return t && On(e) && o.unshift(e), o.forEach((r, i) => {
    if (po(r) && r.contentDocument) {
      const s = r.contentDocument.body, l = bo(s, false);
      o.splice(i, 1, ...l);
    }
  }), o;
}
function On(e) {
  return wo(e) && !Oi(e);
}
function wo(e) {
  return e.matches(tn$1) && nn$1(e);
}
function Oi(e) {
  return Number.parseInt(e.getAttribute("tabindex") || "0", 10) < 0;
}
function nn$1(e, t) {
  return e.nodeName !== "#comment" && Pi(e) && Ci(e, t) && (!e.parentElement || nn$1(e.parentElement, e));
}
function Pi(e) {
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
function Ci(e, t) {
  return !e.hasAttribute("hidden") && (e.nodeName === "DETAILS" && t && t.nodeName !== "SUMMARY" ? e.hasAttribute("open") : true);
}
function Li(e, t, n) {
  const o = (t == null ? void 0 : t.tabbable) ? Ti : tn$1, r = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, { acceptNode(i) {
    var _a;
    return ((_a = t == null ? void 0 : t.from) == null ? void 0 : _a.contains(i)) ? NodeFilter.FILTER_REJECT : i.matches(o) && nn$1(i) && (!(t == null ? void 0 : t.accept) || t.accept(i)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } });
  return (t == null ? void 0 : t.from) && (r.currentNode = t.from), r;
}
function Ai() {
}
function Ii(e) {
  return [e.clientX, e.clientY];
}
function Ki(e, t) {
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
function _$1(e, t) {
  return mergeProps$1(e, t);
}
function Cn$1() {
  return;
}
typeof document < "u" && (document.readyState !== "loading" ? Cn$1() : document.addEventListener("DOMContentLoaded", Cn$1));
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
var So = { border: "0", clip: "rect(0 0 0 0)", "clip-path": "inset(50%)", height: "1px", margin: "0 -1px -1px 0", overflow: "hidden", padding: "0", position: "absolute", width: "1px", "white-space": "nowrap" };
function xo(e, t) {
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
  return createComponent$1(Dynamic, mergeProps(n, { get component() {
    return t.as;
  } }));
}
var Fi = Object.defineProperty, ot = (e, t) => {
  for (var n in t) Fi(e, n, { get: t[n], enumerable: true });
}, Mi = {};
ot(Mi, { Button: () => Bi, Root: () => rt });
var Ri = ["button", "color", "file", "image", "reset", "submit"];
function ki(e) {
  const t = e.tagName.toLowerCase();
  return t === "button" ? true : t === "input" && e.type ? Ri.indexOf(e.type) !== -1 : false;
}
function rt(e) {
  let t;
  const n = _$1({ type: "button" }, e), [o, r] = splitProps(n, ["ref", "type", "disabled"]), i = xo(() => t, () => "button"), s = createMemo(() => {
    const a = i();
    return a == null ? false : ki({ tagName: a, type: o.type });
  }), l = createMemo(() => i() === "input"), c = createMemo(() => i() === "a" && (void 0 ) != null);
  return createComponent$1(j, mergeProps({ as: "button", get type() {
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
var Bi = rt, pt$1 = "data-kb-top-layer", Eo, Ut = false, be = [];
function Je(e) {
  return be.findIndex((t) => t.node === e);
}
function Vi(e) {
  return be[Je(e)];
}
function Ni(e) {
  return be[be.length - 1].node === e;
}
function Do() {
  return be.filter((e) => e.isPointerBlocking);
}
function _i() {
  return [...Do()].slice(-1)[0];
}
function on$1() {
  return Do().length > 0;
}
function To(e) {
  var _a;
  const t = Je((_a = _i()) == null ? void 0 : _a.node);
  return Je(e) < t;
}
function $i(e) {
  be.push(e);
}
function Wi(e) {
  const t = Je(e);
  t < 0 || be.splice(t, 1);
}
function Ui() {
  for (const { node: e } of be) e.style.pointerEvents = To(e) ? "none" : "auto";
}
function zi(e) {
  if (on$1() && !Ut) {
    const t = se$1(e);
    Eo = document.body.style.pointerEvents, t.body.style.pointerEvents = "none", Ut = true;
  }
}
function Hi(e) {
  if (on$1()) return;
  const t = se$1(e);
  t.body.style.pointerEvents = Eo, t.body.style.length === 0 && t.body.removeAttribute("style"), Ut = false;
}
var ut$1 = { layers: be, isTopMostLayer: Ni, hasPointerBlockingLayer: on$1, isBelowPointerBlockingLayer: To, addLayer: $i, removeLayer: Wi, indexOf: Je, find: Vi, assignPointerEventToLayers: Ui, disableBodyPointerEvents: zi, restoreBodyPointerEvents: Hi }, Bt$1 = "focusScope.autoFocusOnMount", Vt$1 = "focusScope.autoFocusOnUnmount", Kn = { bubbles: false, cancelable: true }, Fn = { stack: [], active() {
  return this.stack[0];
}, add(e) {
  var _a;
  e !== this.active() && ((_a = this.active()) == null ? void 0 : _a.pause()), this.stack = Tn(this.stack, e), this.stack.unshift(e);
}, remove(e) {
  var _a;
  this.stack = Tn(this.stack, e), (_a = this.active()) == null ? void 0 : _a.resume();
} };
function Oo(e, t) {
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
  }, c = () => se$1(t()), a = () => {
    const h = c().createElement("span");
    return h.setAttribute("data-focus-trap", ""), h.tabIndex = 0, Object.assign(h.style, So), h;
  }, u = () => {
    const h = t();
    return h ? bo(h, true).filter((m) => !m.hasAttribute("data-focus-trap")) : [];
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
    return !m || de$1(h, m) ? false : wo(m);
  };
  createEffect(() => {
    if (isServer) return;
    const h = t();
    if (!h) return;
    Fn.add(r);
    const m = Ye(h);
    if (!de$1(h, m)) {
      const v = new CustomEvent(Bt$1, Kn);
      h.addEventListener(Bt$1, s), h.dispatchEvent(v), v.defaultPrevented || setTimeout(() => {
        X$1(d()), Ye(h) === m && X$1(h);
      }, 0);
    }
    onCleanup(() => {
      h.removeEventListener(Bt$1, s), setTimeout(() => {
        const v = new CustomEvent(Vt$1, Kn);
        g() && v.preventDefault(), h.addEventListener(Vt$1, l), h.dispatchEvent(v), v.defaultPrevented || X$1(m != null ? m : c().body), h.removeEventListener(Vt$1, l), Fn.remove(r);
      }, 0);
    });
  }), createEffect(() => {
    if (isServer) return;
    const h = t();
    if (!h || !b(e.trapFocus) || n()) return;
    const m = (v) => {
      const p = v.target;
      (p == null ? void 0 : p.closest(`[${pt$1}]`)) || (de$1(h, p) ? i = p : X$1(i));
    }, y = (v) => {
      var _a;
      const w = (_a = v.relatedTarget) != null ? _a : Ye(h);
      (w == null ? void 0 : w.closest(`[${pt$1}]`)) || de$1(h, w) || X$1(i);
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
      w.relatedTarget === x ? X$1(S) : X$1(x);
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
var ji = "data-live-announcer";
function Po(e) {
  createEffect(() => {
    b(e.isDisabled) || onCleanup(qi(b(e.targets), b(e.root)));
  });
}
var je = /* @__PURE__ */ new WeakMap(), re = [];
function qi(e, t = document.body) {
  const n = new Set(e), o = /* @__PURE__ */ new Set(), r = (c) => {
    for (const f of c.querySelectorAll(`[${ji}], [${pt$1}]`)) n.add(f);
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
function Yi(e, t) {
  let n, o = Ai;
  const r = () => se$1(t()), i = (d) => {
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
    return !(f instanceof Element) || f.closest(`[${pt$1}]`) || !de$1(r(), f) || de$1(t(), f) ? false : !((_a = e.shouldExcludeElement) == null ? void 0 : _a.call(e, f));
  }, a = (d) => {
    function f() {
      const g = t(), h = d.target;
      if (!g || !h || !c(d)) return;
      const m = ie$1([i, l]);
      h.addEventListener(Mn, m, { once: true });
      const y = new CustomEvent(Mn, { bubbles: false, cancelable: true, detail: { originalEvent: d, isContextMenu: d.button === 2 || wi(d) && d.button === 0 } });
      h.dispatchEvent(y);
    }
    d.pointerType === "touch" ? (r().removeEventListener("click", f), o = f, r().addEventListener("click", f, { once: true })) : f();
  }, u = (d) => {
    const f = t(), g = d.target;
    if (!f || !g || !c(d)) return;
    const h = ie$1([s, l]);
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
function Xi(e) {
  const t = (n) => {
    n.key, mo.Escape;
  };
  createEffect(() => {
    var _a, _b;
    if (isServer || b(e.isDisabled)) return;
    const n = (_b = (_a = e.ownerDocument) == null ? void 0 : _a.call(e)) != null ? _b : se$1();
    n.addEventListener("keydown", t), onCleanup(() => {
      n.removeEventListener("keydown", t);
    });
  });
}
var Co = createContext$1();
function Gi() {
  return useContext(Co);
}
function rn$1(e) {
  let t;
  const n = Gi(), [o, r] = splitProps(e, ["ref", "disableOutsidePointerEvents", "excludedElements", "onEscapeKeyDown", "onPointerDownOutside", "onFocusOutside", "onInteractOutside", "onDismiss", "bypassTopMostLayerCheck"]), i = /* @__PURE__ */ new Set([]), s = (d) => {
    i.add(d);
    const f = n == null ? void 0 : n.registerNestedLayer(d);
    return () => {
      i.delete(d), f == null ? void 0 : f();
    };
  };
  Yi({ shouldExcludeElement: (d) => false, onPointerDownOutside: (d) => {
  }, onFocusOutside: (d) => {
    var _a, _b, _c;
    (_a = o.onFocusOutside) == null ? void 0 : _a.call(o, d), (_b = o.onInteractOutside) == null ? void 0 : _b.call(o, d), d.defaultPrevented || ((_c = o.onDismiss) == null ? void 0 : _c.call(o));
  } }, () => t), Xi({ ownerDocument: () => se$1(t), onEscapeKeyDown: (d) => {
  } }), onMount(() => {
  }), createEffect(on$3([() => t, () => o.disableOutsidePointerEvents], ([d, f]) => {
    if (!d) return;
    const g = ut$1.find(d);
    g && g.isPointerBlocking !== f && (g.isPointerBlocking = f, ut$1.assignPointerEventToLayers()), f && ut$1.disableBodyPointerEvents(d), onCleanup(() => {
      ut$1.restoreBodyPointerEvents(d);
    });
  }, { defer: true }));
  const u = { registerNestedLayer: s };
  return createComponent$1(Co.Provider, { value: u, get children() {
    return createComponent$1(j, mergeProps({ as: "div" }, r));
  } });
}
function Lo(e) {
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
      const l = si(s, r());
      return Object.is(l, r()) || (o() || n(l), (_a2 = e.onChange) == null ? void 0 : _a2.call(e, l)), l;
    });
  }];
}
function Zi(e) {
  const [t, n] = Lo(e);
  return [() => {
    var _a;
    return (_a = t()) != null ? _a : false;
  }, n];
}
function sn$1(e = {}) {
  const [t, n] = Zi({ value: () => b(e.open), defaultValue: () => !!b(e.defaultOpen), onChange: (s) => {
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
function Q$1(e) {
  return (t) => (e(t), () => e(void 0));
}
var Y$1 = (e) => typeof e == "function" ? e() : e, zt$1 = (e, t) => {
  var _a;
  if (e.contains(t)) return true;
  let n = t;
  for (; n; ) {
    if (n === e) return true;
    n = (_a = n._$host) != null ? _a : n.parentElement;
  }
  return false;
}, dt$1 = /* @__PURE__ */ new Map(), Ji = (e) => {
  createEffect(() => {
    var _a, _b;
    const t = (_a = Y$1(e.style)) != null ? _a : {}, n = (_b = Y$1(e.properties)) != null ? _b : [], o = {};
    for (const i in t) o[i] = e.element.style[i];
    const r = dt$1.get(e.key);
    r ? r.activeCount++ : dt$1.set(e.key, { activeCount: 1, originalStyles: o, properties: n.map((i) => i.key) }), Object.assign(e.element.style, e.style);
    for (const i of n) e.element.style.setProperty(i.key, i.value);
    onCleanup(() => {
      var _a2;
      const i = dt$1.get(e.key);
      if (i) {
        if (i.activeCount !== 1) {
          i.activeCount--;
          return;
        }
        dt$1.delete(e.key);
        for (const [s, l] of Object.entries(i.originalStyles)) e.element.style[s] = l;
        for (const s of i.properties) e.element.style.removeProperty(s);
        e.element.style.length === 0 && e.element.removeAttribute("style"), (_a2 = e.cleanup) == null ? void 0 : _a2.call(e);
      }
    });
  });
}, kn = Ji, Qi = (e, t) => {
  switch (t) {
    case "x":
      return [e.clientWidth, e.scrollLeft, e.scrollWidth];
    case "y":
      return [e.clientHeight, e.scrollTop, e.scrollHeight];
  }
}, es = (e, t) => {
  const n = getComputedStyle(e), o = t === "x" ? n.overflowX : n.overflowY;
  return o === "auto" || o === "scroll" || e.tagName === "HTML" && o === "visible";
}, ts = (e, t, n) => {
  var _a;
  const o = t === "x" && window.getComputedStyle(e).direction === "rtl" ? -1 : 1;
  let r = e, i = 0, s = 0, l = false;
  do {
    const [c, a, u] = Qi(r, t), d = u - c - o * a;
    (a !== 0 || d !== 0) && es(r, t) && (i += d, s += a), r === (n != null ? n : document.documentElement) ? l = true : r = (_a = r._$host) != null ? _a : r.parentElement;
  } while (r && !l);
  return [i, s];
}, [Bn, Vn] = createSignal([]), ns = (e) => Bn().indexOf(e) === Bn().length - 1, os = (e) => {
  const t = mergeProps$1({ element: null, enabled: true, hideScrollbar: true, preventScrollbarShift: true, preventScrollbarShiftMode: "padding", restoreScrollPosition: true, allowPinchZoom: false }, e), n = createUniqueId();
  let o = [0, 0], r = null, i = null;
  createEffect(() => {
    Y$1(t.enabled) && (Vn((a) => [...a, n]), onCleanup(() => {
      Vn((a) => a.filter((u) => u !== n));
    }));
  }), createEffect(() => {
    if (!Y$1(t.enabled) || !Y$1(t.hideScrollbar)) return;
    const { body: a } = document, u = window.innerWidth - a.offsetWidth;
    if (Y$1(t.preventScrollbarShift)) {
      const d = { overflow: "hidden" }, f = [];
      u > 0 && (Y$1(t.preventScrollbarShiftMode) === "padding" ? d.paddingRight = `calc(${window.getComputedStyle(a).paddingRight} + ${u}px)` : d.marginRight = `calc(${window.getComputedStyle(a).marginRight} + ${u}px)`, f.push({ key: "--scrollbar-width", value: `${u}px` }));
      const g = window.scrollY, h = window.scrollX;
      kn({ key: "prevent-scroll", element: a, style: d, properties: f, cleanup: () => {
        Y$1(t.restoreScrollPosition) && u > 0 && window.scrollTo(h, g);
      } });
    } else kn({ key: "prevent-scroll", element: a, style: { overflow: "hidden" } });
  }), createEffect(() => {
    !ns(n) || !Y$1(t.enabled) || (document.addEventListener("wheel", l, { passive: false }), document.addEventListener("touchstart", s, { passive: false }), document.addEventListener("touchmove", c, { passive: false }), onCleanup(() => {
      document.removeEventListener("wheel", l), document.removeEventListener("touchstart", s), document.removeEventListener("touchmove", c);
    }));
  });
  const s = (a) => {
    o = Nn(a), r = null, i = null;
  }, l = (a) => {
    const u = a.target, d = Y$1(t.element), f = rs(a), g = Math.abs(f[0]) > Math.abs(f[1]) ? "x" : "y", h = g === "x" ? f[0] : f[1], m = _n(u, g, h, d);
    let y;
    d && zt$1(d, u) ? y = !m : y = true, y && a.cancelable && a.preventDefault();
  }, c = (a) => {
    const u = Y$1(t.element), d = a.target;
    let f;
    if (a.touches.length === 2) f = !Y$1(t.allowPinchZoom);
    else {
      if (r == null || i === null) {
        const g = Nn(a).map((m, y) => o[y] - m), h = Math.abs(g[0]) > Math.abs(g[1]) ? "x" : "y";
        r = h, i = h === "x" ? g[0] : g[1];
      }
      if (d.type === "range") f = false;
      else {
        const g = _n(d, r, i, u);
        u && zt$1(u, d) ? f = !g : f = true;
      }
    }
    f && a.cancelable && a.preventDefault();
  };
}, rs = (e) => [e.deltaX, e.deltaY], Nn = (e) => e.changedTouches[0] ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0], _n = (e, t, n, o) => {
  const r = o !== null && zt$1(o, e), [i, s] = ts(e, t, r ? o : void 0);
  return !(n > 0 && Math.abs(i) <= 1 || n < 0 && Math.abs(s) < 1);
}, is = os, Ao = is, ss = (e) => {
  const t = createMemo(() => {
    const s = Y$1(e.element);
    if (s) return getComputedStyle(s);
  }), n = () => {
    var _a, _b;
    return (_b = (_a = t()) == null ? void 0 : _a.animationName) != null ? _b : "none";
  }, [o, r] = createSignal(Y$1(e.show) ? "present" : "hidden");
  let i = "none";
  return createEffect((s) => {
    const l = Y$1(e.show);
    return untrack(() => {
      var _a;
      if (s === l) return l;
      const c = i, a = n();
      l ? r("present") : a === "none" || ((_a = t()) == null ? void 0 : _a.display) === "none" ? r("hidden") : r(s === true && c !== a ? "hiding" : "hidden");
    }), l;
  }), createEffect(() => {
    const s = Y$1(e.element);
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
}, ls = ss, mt$1 = ls, cs = {};
ot(cs, { CloseButton: () => Ko, Content: () => Fo, Description: () => Mo, Dialog: () => St$1, Overlay: () => Ro, Portal: () => ko, Root: () => Bo, Title: () => Vo, Trigger: () => No, useDialogContext: () => Pe });
var Io = createContext$1();
function Pe() {
  const e = useContext(Io);
  if (e === void 0) throw new Error("[kobalte]: `useDialogContext` must be used within a `Dialog` component");
  return e;
}
function Ko(e) {
  const t = Pe(), [n, o] = splitProps(e, ["aria-label", "onClick"]);
  return createComponent$1(rt, mergeProps({ get "aria-label"() {
    return n["aria-label"] || t.translations().dismiss;
  }, onClick: (i) => {
    H$1(i, n.onClick), t.close();
  } }, o));
}
function Fo(e) {
  let t;
  const n = Pe(), o = _$1({ id: n.generateId("content") }, e), [r, i] = splitProps(o, ["ref", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside"]);
  let s = false, l = false;
  const c = (f) => {
    var _a;
    (_a = r.onPointerDownOutside) == null ? void 0 : _a.call(r, f), n.modal() && f.detail.isContextMenu && f.preventDefault();
  }, a = (f) => {
    var _a;
    (_a = r.onFocusOutside) == null ? void 0 : _a.call(r, f), n.modal() && f.preventDefault();
  }, u = (f) => {
    var _a;
    (_a = r.onInteractOutside) == null ? void 0 : _a.call(r, f), !n.modal() && (f.defaultPrevented || (s = true, f.detail.originalEvent.type === "pointerdown" && (l = true)), de$1(n.triggerRef(), f.target) && f.preventDefault(), f.detail.originalEvent.type === "focusin" && l && f.preventDefault());
  }, d = (f) => {
    var _a;
    (_a = r.onCloseAutoFocus) == null ? void 0 : _a.call(r, f), n.modal() ? (f.preventDefault(), X$1(n.triggerRef())) : (f.defaultPrevented || (s || X$1(n.triggerRef()), f.preventDefault()), s = false, l = false);
  };
  return Po({ isDisabled: () => !(n.isOpen() && n.modal()), targets: () => [] }), Ao({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), Oo({ trapFocus: () => n.isOpen() && n.modal(), onMountAutoFocus: r.onOpenAutoFocus, onUnmountAutoFocus: d }, () => t), createEffect(() => onCleanup(n.registerContentId(i.id))), createComponent$1(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent$1(rn$1, mergeProps({ role: "dialog", tabIndex: -1, get disableOutsidePointerEvents() {
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
function Mo(e) {
  const t = Pe(), n = _$1({ id: t.generateId("description") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerDescriptionId(o.id))), createComponent$1(j, mergeProps({ as: "p", get id() {
    return o.id;
  } }, r));
}
function Ro(e) {
  const t = Pe(), [n, o] = splitProps(e, ["ref", "style", "onPointerDown"]), r = (i) => {
    H$1(i, n.onPointerDown), i.target === i.currentTarget && i.preventDefault();
  };
  return createComponent$1(Show, { get when() {
    return t.overlayPresent();
  }, get children() {
    return createComponent$1(j, mergeProps({ as: "div", get style() {
      return tt({ "pointer-events": "auto" }, n.style);
    }, get "data-expanded"() {
      return t.isOpen() ? "" : void 0;
    }, get "data-closed"() {
      return t.isOpen() ? void 0 : "";
    }, onPointerDown: r }, o));
  } });
}
function ko(e) {
  const t = Pe();
  return createComponent$1(Show, { get when() {
    return t.contentPresent() || t.overlayPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
var $n = { dismiss: "Dismiss" };
function Bo(e) {
  const t = `dialog-${createUniqueId()}`, n = _$1({ id: t, modal: true, translations: $n }, e), [o, r] = createSignal(), [i, s] = createSignal(), [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(), m = sn$1({ open: () => n.open, defaultOpen: () => n.defaultOpen, onOpenChange: (x) => {
    var _a;
    return (_a = n.onOpenChange) == null ? void 0 : _a.call(n, x);
  } }), y = () => n.forceMount || m.isOpen(), { present: v } = mt$1({ show: y, element: () => {
    var _a;
    return (_a = a()) != null ? _a : null;
  } }), { present: p } = mt$1({ show: y, element: () => {
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
  }, contentId: o, titleId: i, descriptionId: l, triggerRef: g, overlayRef: a, setOverlayRef: u, contentRef: d, setContentRef: f, overlayPresent: v, contentPresent: p, close: m.close, toggle: m.toggle, setTriggerRef: h, generateId: $e(() => n.id), registerContentId: Q$1(r), registerTitleId: Q$1(s), registerDescriptionId: Q$1(c) };
  return createComponent$1(Io.Provider, { value: w, get children() {
    return n.children;
  } });
}
function Vo(e) {
  const t = Pe(), n = _$1({ id: t.generateId("title") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerTitleId(o.id))), createComponent$1(j, mergeProps({ as: "h2", get id() {
    return o.id;
  } }, r));
}
function No(e) {
  const t = Pe(), [n, o] = splitProps(e, ["ref", "onClick"]);
  return createComponent$1(rt, mergeProps({ "aria-haspopup": "dialog", get "aria-expanded"() {
    return t.isOpen();
  }, get "aria-controls"() {
    return t.isOpen() ? t.contentId() : void 0;
  }, get "data-expanded"() {
    return t.isOpen() ? "" : void 0;
  }, get "data-closed"() {
    return t.isOpen() ? void 0 : "";
  }, onClick: (i) => {
    H$1(i, n.onClick), t.toggle();
  } }, o));
}
var St$1 = Object.assign(Bo, { CloseButton: Ko, Content: Fo, Description: Mo, Overlay: Ro, Portal: ko, Title: Vo, Trigger: No });
St$1.Trigger;
St$1.Portal;
St$1.CloseButton;
function _o(e) {
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
    if (Be(c) || gi(c)) {
      o.push({ type: "item", rawValue: c, key: String(c), textValue: String(c), disabled: s(c), level: n, index: t }), t++;
      continue;
    }
    if (l(c) != null) {
      o.push({ type: "section", rawValue: c, key: "", textValue: "", disabled: false, level: n, index: t }), t++;
      const a = (_c = l(c)) != null ? _c : [];
      if (a.length > 0) {
        const u = _o({ dataSource: a, getKey: e.getKey, getTextValue: e.getTextValue, getDisabled: e.getDisabled, getSectionChildren: e.getSectionChildren, startIndex: t, startLevel: n + 1 });
        o.push(...u), t += u.length;
      }
    } else o.push({ type: "item", rawValue: c, key: r(c), textValue: i(c), disabled: s(c), level: n, index: t }), t++;
  }
  return o;
}
function as(e, t = []) {
  return createMemo(() => {
    const n = _o({ dataSource: b(e.dataSource), getKey: b(e.getKey), getTextValue: b(e.getTextValue), getDisabled: b(e.getDisabled), getSectionChildren: b(e.getSectionChildren) });
    for (let o = 0; o < t.length; o++) t[o]();
    return e.factory(n);
  });
}
var us = /* @__PURE__ */ new Set(["Avst", "Arab", "Armi", "Syrc", "Samr", "Mand", "Thaa", "Mend", "Nkoo", "Adlm", "Rohg", "Hebr"]), ds = /* @__PURE__ */ new Set(["ae", "ar", "arc", "bcc", "bqi", "ckb", "dv", "fa", "glk", "he", "ku", "mzn", "nqo", "pnb", "ps", "sd", "ug", "ur", "yi"]);
function fs(e) {
  var _a;
  if (Intl.Locale) {
    const n = (_a = new Intl.Locale(e).maximize().script) != null ? _a : "";
    return us.has(n);
  }
  const t = e.split("-")[0];
  return ds.has(t);
}
function gs(e) {
  return fs(e) ? "rtl" : "ltr";
}
function $o() {
  let e = typeof navigator < "u" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([e]);
  } catch {
    e = "en-US";
  }
  return { locale: e, direction: gs(e) };
}
var Ht$1 = $o(), Xe = /* @__PURE__ */ new Set();
function Wn() {
  Ht$1 = $o();
  for (const e of Xe) e(Ht$1);
}
function hs() {
  const e = { locale: "en-US", direction: "ltr" }, [t, n] = createSignal(Ht$1), o = createMemo(() => isServer ? e : t());
  return onMount(() => {
    Xe.size === 0 && window.addEventListener("languagechange", Wn), Xe.add(n), onCleanup(() => {
      Xe.delete(n), Xe.size === 0 && window.removeEventListener("languagechange", Wn);
    });
  }), { locale: () => o().locale, direction: () => o().direction };
}
var ps = createContext$1();
function ln$1() {
  const e = hs();
  return useContext(ps) || e;
}
var Nt$1 = /* @__PURE__ */ new Map();
function Wo(e) {
  const { locale: t } = ln$1(), n = createMemo(() => t() + (e ? Object.entries(e).sort((o, r) => o[0] < r[0] ? -1 : 1).join() : ""));
  return createMemo(() => {
    const o = n();
    let r;
    return Nt$1.has(o) && (r = Nt$1.get(o)), r || (r = new Intl.Collator(t(), e), Nt$1.set(o, r)), r;
  });
}
var ue$1 = class Uo extends Set {
  constructor(t, n, o) {
    super(t);
    __publicField$1(this, "anchorKey");
    __publicField$1(this, "currentKey");
    t instanceof Uo ? (this.anchorKey = n || t.anchorKey, this.currentKey = o || t.currentKey) : (this.anchorKey = n, this.currentKey = o);
  }
};
function ms(e) {
  const [t, n] = Lo(e);
  return [() => {
    var _a;
    return (_a = t()) != null ? _a : new ue$1();
  }, n];
}
function zo(e) {
  return e.ctrlKey;
}
function Ve(e) {
  return e.ctrlKey;
}
function Un(e) {
  return new ue$1(e);
}
function Ho(e, t) {
  if (e.size !== t.size) return false;
  for (const n of e) if (!t.has(n)) return false;
  return true;
}
function ys(e) {
  const t = _$1({ selectionMode: "none", selectionBehavior: "toggle" }, e), [n, o] = createSignal(false), [r, i] = createSignal(), s = createMemo(() => {
    const m = b(t.selectedKeys);
    return m != null ? Un(m) : m;
  }), l = createMemo(() => {
    const m = b(t.defaultSelectedKeys);
    return m != null ? Un(m) : new ue$1();
  }), [c, a] = ms({ value: s, defaultValue: l, onChange: (m) => {
    var _a;
    return (_a = t.onSelectionChange) == null ? void 0 : _a.call(t, m);
  } }), [u, d] = createSignal(b(t.selectionBehavior)), f = () => b(t.selectionMode), g = () => {
    var _a;
    return (_a = b(t.disallowEmptySelection)) != null ? _a : false;
  }, h = (m) => {
    (b(t.allowDuplicateSelectionEvents) || !Ho(m, c())) && a(m);
  };
  return createEffect(() => {
    const m = c();
    b(t.selectionBehavior) === "replace" && u() === "toggle" && typeof m == "object" && m.size === 0 && d("replace");
  }), createEffect(() => {
    var _a;
    d((_a = b(t.selectionBehavior)) != null ? _a : "toggle");
  }), { selectionMode: f, disallowEmptySelection: g, selectionBehavior: u, setSelectionBehavior: d, isFocused: n, setFocused: o, focusedKey: r, setFocusedKey: i, selectedKeys: c, setSelectedKeys: h };
}
function jo(e) {
  const [t, n] = createSignal(""), [o, r] = createSignal(-1);
  return { typeSelectHandlers: { onKeyDown: (s) => {
    var _a, _b, _c;
    if (b(e.isDisabled)) return;
    const l = b(e.keyboardDelegate), c = b(e.selectionManager);
    if (!l.getKeyForSearch) return;
    const a = vs(s.key);
    if (!a || s.ctrlKey || s.metaKey) return;
    a === " " && t().trim().length > 0 && (s.preventDefault(), s.stopPropagation());
    let u = n((f) => f + a), d = (_a = l.getKeyForSearch(u, c.focusedKey())) != null ? _a : l.getKeyForSearch(u);
    d == null && bs(u) && (u = u[0], d = (_b = l.getKeyForSearch(u, c.focusedKey())) != null ? _b : l.getKeyForSearch(u)), d != null && (c.setFocusedKey(d), (_c = e.onTypeSelect) == null ? void 0 : _c.call(e, d)), clearTimeout(o()), r(window.setTimeout(() => n(""), 500));
  } } };
}
function vs(e) {
  return e.length === 1 || !/^[A-Z]/i.test(e) ? e : "";
}
function bs(e) {
  return e.split("").every((t) => t === e[0]);
}
function ws(e, t, n) {
  const r = mergeProps$1({ selectOnFocus: () => b(e.selectionManager).selectionBehavior() === "replace" }, e), i = () => {
    var _a;
    return (_a = n == null ? void 0 : n()) != null ? _a : t();
  }, { direction: s } = ln$1();
  let l = { top: 0, left: 0 };
  ai(() => b(r.isVirtualized) ? void 0 : i(), "scroll", () => {
    const y = i();
    y && (l = { top: y.scrollTop, left: y.scrollLeft });
  });
  const { typeSelectHandlers: c } = jo({ isDisabled: () => b(r.disallowTypeAhead), keyboardDelegate: () => b(r.keyboardDelegate), selectionManager: () => b(r.selectionManager) }), a = () => {
    var _a;
    return (_a = b(r.orientation)) != null ? _a : "vertical";
  }, u = (y) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    H$1(y, c.onKeyDown), y.altKey && y.key === "Tab" && y.preventDefault();
    const v = t();
    if (!(v == null ? void 0 : v.contains(y.target))) return;
    const p = b(r.selectionManager), w = b(r.selectOnFocus), x = (D) => {
      D != null && (p.setFocusedKey(D), y.shiftKey && p.selectionMode() === "multiple" ? p.extendSelection(D) : w && !zo(y) && p.replaceSelection(D));
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
            const D = Li(v, { tabbable: true });
            let M, $;
            do
              $ = D.lastChild(), $ && (M = $);
            while ($);
            M && !M.contains(document.activeElement) && X$1(M);
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
          S && (X$1(S), Ln(x, S));
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
    S && w == null && !b(r.shouldUseVirtualFocus) && X$1(S);
  };
  return onMount(() => {
    r.deferAutoFocus ? setTimeout(h, 0) : h();
  }), createEffect(on$3([i, () => b(r.isVirtualized), () => b(r.selectionManager).focusedKey()], (y) => {
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
function Ss(e, t) {
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
    !c() || !["Enter", " "].includes(p.key) || (zo(p) ? n().toggleSelection(o()) : i(p));
  }, h = (p) => {
    l() && p.preventDefault();
  }, m = (p) => {
    const w = t();
    r() || l() || !w || p.target === w && n().setFocusedKey(o());
  }, y = createMemo(() => {
    if (!(r() || l())) return o() === n().focusedKey() ? 0 : -1;
  }), v = createMemo(() => b(e.virtualized) ? void 0 : o());
  return createEffect(on$3([t, o, r, () => n().focusedKey(), () => n().isFocused()], ([p, w, x, S, L]) => {
    p && w === S && L && !x && document.activeElement !== p && (e.focus ? e.focus() : X$1(p));
  })), { isSelected: s, isDisabled: l, allowsSelection: c, tabIndex: y, dataKey: v, onPointerDown: u, onPointerUp: d, onClick: f, onKeyDown: g, onMouseDown: h, onFocus: m };
}
var xs = class {
  constructor(e, t) {
    __publicField$1(this, "collection");
    __publicField$1(this, "state");
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
    const n = this.state.selectedKeys(), o = n.anchorKey || t, r = new ue$1(n, o, t);
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
    const n = new ue$1(this.state.selectedKeys());
    n.has(t) ? n.delete(t) : this.canSelectItem(t) && (n.add(t), n.anchorKey = t, n.currentKey = t), !(this.disallowEmptySelection() && n.size === 0) && this.state.setSelectedKeys(n);
  }
  replaceSelection(e) {
    if (this.selectionMode() === "none") return;
    const t = this.getKey(e);
    if (t == null) return;
    const n = this.canSelectItem(t) ? new ue$1([t], t, t) : new ue$1();
    this.state.setSelectedKeys(n);
  }
  setSelectedKeys(e) {
    if (this.selectionMode() === "none") return;
    const t = new ue$1();
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
    !this.disallowEmptySelection() && e.size > 0 && this.state.setSelectedKeys(new ue$1());
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
    __publicField$1(this, "keyMap", /* @__PURE__ */ new Map());
    __publicField$1(this, "iterable");
    __publicField$1(this, "firstKey");
    __publicField$1(this, "lastKey");
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
function qo(e) {
  const t = ys(e), o = as({ dataSource: () => b(e.dataSource), getKey: () => b(e.getKey), getTextValue: () => b(e.getTextValue), getDisabled: () => b(e.getDisabled), getSectionChildren: () => b(e.getSectionChildren), factory: (i) => e.filter ? new zn(e.filter(i)) : new zn(i) }, [() => e.filter]), r = new xs(o, t);
  return createComputed(() => {
    const i = t.focusedKey();
    i != null && !o().getItem(i) && t.setFocusedKey(void 0);
  }), { collection: o, selectionManager: () => r };
}
const Es = ["top", "right", "bottom", "left"], Ee = Math.min, J$1 = Math.max, yt$1 = Math.round, ft$1 = Math.floor, fe = (e) => ({ x: e, y: e }), Ds = { left: "right", right: "left", bottom: "top", top: "bottom" }, Ts = { start: "end", end: "start" };
function jt$1(e, t, n) {
  return J$1(e, Ee(t, n));
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
function Yo(e) {
  return e === "x" ? "y" : "x";
}
function cn$1(e) {
  return e === "y" ? "height" : "width";
}
const Os = /* @__PURE__ */ new Set(["top", "bottom"]);
function ve(e) {
  return Os.has(De(e)) ? "y" : "x";
}
function an$1(e) {
  return Yo(ve(e));
}
function Ps(e, t, n) {
  n === void 0 && (n = false);
  const o = We(e), r = an$1(e), i = cn$1(r);
  let s = r === "x" ? o === (n ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return t.reference[i] > t.floating[i] && (s = vt$1(s)), [s, vt$1(s)];
}
function Cs(e) {
  const t = vt$1(e);
  return [qt$1(e), t, qt$1(t)];
}
function qt$1(e) {
  return e.replace(/start|end/g, (t) => Ts[t]);
}
const Hn = ["left", "right"], jn = ["right", "left"], Ls = ["top", "bottom"], As = ["bottom", "top"];
function Is(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? jn : Hn : t ? Hn : jn;
    case "left":
    case "right":
      return t ? Ls : As;
    default:
      return [];
  }
}
function Ks(e, t, n, o) {
  const r = We(e);
  let i = Is(De(e), n === "start", o);
  return r && (i = i.map((s) => s + "-" + r), t && (i = i.concat(i.map(qt$1)))), i;
}
function vt$1(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Ds[t]);
}
function Fs(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function Xo(e) {
  return typeof e != "number" ? Fs(e) : { top: e, right: e, bottom: e, left: e };
}
function bt$1(e) {
  const { x: t, y: n, width: o, height: r } = e;
  return { width: o, height: r, top: n, left: t, right: t + o, bottom: n + r, x: t, y: n };
}
function qn(e, t, n) {
  let { reference: o, floating: r } = e;
  const i = ve(t), s = an$1(t), l = cn$1(s), c = De(t), a = i === "y", u = o.x + o.width / 2 - r.width / 2, d = o.y + o.height / 2 - r.height / 2, f = o[l] / 2 - r[l] / 2;
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
const Ms = async (e, t, n) => {
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
  const { x: o, y: r, platform: i, rects: s, elements: l, strategy: c } = e, { boundary: a = "clippingAncestors", rootBoundary: u = "viewport", elementContext: d = "floating", altBoundary: f = false, padding: g = 0 } = Ke(t, e), h = Xo(g), y = l[f ? d === "floating" ? "reference" : "floating" : d], v = bt$1(await i.getClippingRect({ element: (n = await (i.isElement == null ? void 0 : i.isElement(y))) == null || n ? y : y.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(l.floating)), boundary: a, rootBoundary: u, strategy: c })), p = d === "floating" ? { x: o, y: r, width: s.floating.width, height: s.floating.height } : s.reference, w = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(l.floating)), x = await (i.isElement == null ? void 0 : i.isElement(w)) ? await (i.getScale == null ? void 0 : i.getScale(w)) || { x: 1, y: 1 } : { x: 1, y: 1 }, S = bt$1(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({ elements: l, rect: p, offsetParent: w, strategy: c }) : p);
  return { top: (v.top - S.top + h.top) / x.y, bottom: (S.bottom - v.bottom + h.bottom) / x.y, left: (v.left - S.left + h.left) / x.x, right: (S.right - v.right + h.right) / x.x };
}
const Rs = (e) => ({ name: "arrow", options: e, async fn(t) {
  const { x: n, y: o, placement: r, rects: i, platform: s, elements: l, middlewareData: c } = t, { element: a, padding: u = 0 } = Ke(e, t) || {};
  if (a == null) return {};
  const d = Xo(u), f = { x: n, y: o }, g = an$1(r), h = cn$1(g), m = await s.getDimensions(a), y = g === "y", v = y ? "top" : "left", p = y ? "bottom" : "right", w = y ? "clientHeight" : "clientWidth", x = i.reference[h] + i.reference[g] - f[g] - i.floating[h], S = f[g] - i.reference[g], L = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(a));
  let T = L ? L[w] : 0;
  (!T || !await (s.isElement == null ? void 0 : s.isElement(L))) && (T = l.floating[w] || i.floating[h]);
  const D = x / 2 - S / 2, M = T / 2 - m[h] / 2 - 1, $ = Ee(d[v], M), U = Ee(d[p], M), V = $, Z = T - m[h] - U, A = T / 2 - m[h] / 2 + D, O = jt$1(V, A, Z), C = !c.arrow && We(r) != null && A !== O && i.reference[h] / 2 - (A < V ? $ : U) - m[h] / 2 < 0, B = C ? A < V ? A - V : A - Z : 0;
  return { [g]: f[g] + B, data: { [g]: O, centerOffset: A - O - B, ...C && { alignmentOffset: B } }, reset: C };
} }), ks = function(e) {
  return e === void 0 && (e = {}), { name: "flip", options: e, async fn(t) {
    var n, o;
    const { placement: r, middlewareData: i, rects: s, initialPlacement: l, platform: c, elements: a } = t, { mainAxis: u = true, crossAxis: d = true, fallbackPlacements: f, fallbackStrategy: g = "bestFit", fallbackAxisSideDirection: h = "none", flipAlignment: m = true, ...y } = Ke(e, t);
    if ((n = i.arrow) != null && n.alignmentOffset) return {};
    const v = De(r), p = ve(l), w = De(l) === l, x = await (c.isRTL == null ? void 0 : c.isRTL(a.floating)), S = f || (w || !m ? [vt$1(l)] : Cs(l)), L = h !== "none";
    !f && L && S.push(...Ks(l, m, h, x));
    const T = [l, ...S], D = await Qe(t, y), M = [];
    let $ = ((o = i.flip) == null ? void 0 : o.overflows) || [];
    if (u && M.push(D[v]), d) {
      const A = Ps(r, s, x);
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
  return Es.some((t) => e[t] >= 0);
}
const Bs = function(e) {
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
}, Vs = /* @__PURE__ */ new Set(["left", "top"]);
async function Ns(e, t) {
  const { placement: n, platform: o, elements: r } = e, i = await (o.isRTL == null ? void 0 : o.isRTL(r.floating)), s = De(n), l = We(n), c = ve(n) === "y", a = Vs.has(s) ? -1 : 1, u = i && c ? -1 : 1, d = Ke(t, e);
  let { mainAxis: f, crossAxis: g, alignmentAxis: h } = typeof d == "number" ? { mainAxis: d, crossAxis: 0, alignmentAxis: null } : { mainAxis: d.mainAxis || 0, crossAxis: d.crossAxis || 0, alignmentAxis: d.alignmentAxis };
  return l && typeof h == "number" && (g = l === "end" ? h * -1 : h), c ? { x: g * u, y: f * a } : { x: f * a, y: g * u };
}
const _s = function(e) {
  return e === void 0 && (e = 0), { name: "offset", options: e, async fn(t) {
    var n, o;
    const { x: r, y: i, placement: s, middlewareData: l } = t, c = await Ns(t, e);
    return s === ((n = l.offset) == null ? void 0 : n.placement) && (o = l.arrow) != null && o.alignmentOffset ? {} : { x: r + c.x, y: i + c.y, data: { ...c, placement: s } };
  } };
}, $s = function(e) {
  return e === void 0 && (e = {}), { name: "shift", options: e, async fn(t) {
    const { x: n, y: o, placement: r } = t, { mainAxis: i = true, crossAxis: s = false, limiter: l = { fn: (y) => {
      let { x: v, y: p } = y;
      return { x: v, y: p };
    } }, ...c } = Ke(e, t), a = { x: n, y: o }, u = await Qe(t, c), d = ve(De(r)), f = Yo(d);
    let g = a[f], h = a[d];
    if (i) {
      const y = f === "y" ? "top" : "left", v = f === "y" ? "bottom" : "right", p = g + u[y], w = g - u[v];
      g = jt$1(p, g, w);
    }
    if (s) {
      const y = d === "y" ? "top" : "left", v = d === "y" ? "bottom" : "right", p = h + u[y], w = h - u[v];
      h = jt$1(p, h, w);
    }
    const m = l.fn({ ...t, [f]: g, [d]: h });
    return { ...m, data: { x: m.x - n, y: m.y - o, enabled: { [f]: i, [d]: s } } };
  } };
}, Ws = function(e) {
  return e === void 0 && (e = {}), { name: "size", options: e, async fn(t) {
    var n, o;
    const { placement: r, rects: i, platform: s, elements: l } = t, { apply: c = () => {
    }, ...a } = Ke(e, t), u = await Qe(t, a), d = De(r), f = We(r), g = ve(r) === "y", { width: h, height: m } = i.floating;
    let y, v;
    d === "top" || d === "bottom" ? (y = d, v = f === (await (s.isRTL == null ? void 0 : s.isRTL(l.floating)) ? "start" : "end") ? "left" : "right") : (v = d, y = f === "end" ? "top" : "bottom");
    const p = m - u.top - u.bottom, w = h - u.left - u.right, x = Ee(m - u[y], p), S = Ee(h - u[v], w), L = !t.middlewareData.shift;
    let T = x, D = S;
    if ((n = t.middlewareData.shift) != null && n.enabled.x && (D = w), (o = t.middlewareData.shift) != null && o.enabled.y && (T = p), L && !f) {
      const $ = J$1(u.left, 0), U = J$1(u.right, 0), V = J$1(u.top, 0), Z = J$1(u.bottom, 0);
      g ? D = h - 2 * ($ !== 0 || U !== 0 ? $ + U : J$1(u.left, u.right)) : T = m - 2 * (V !== 0 || Z !== 0 ? V + Z : J$1(u.top, u.bottom));
    }
    await c({ ...t, availableWidth: D, availableHeight: T });
    const M = await s.getDimensions(l.floating);
    return h !== M.width || m !== M.height ? { reset: { rects: true } } : {};
  } };
};
function Ue(e) {
  return "#document";
}
function ee$1(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function he(e) {
  var t;
  return (t = (e.document) || window.document) == null ? void 0 : t.documentElement;
}
function ce$1(e) {
  return false;
}
function ge(e) {
  return false;
}
function Gn(e) {
  return false ;
}
const Us = /* @__PURE__ */ new Set(["inline", "contents"]);
function it$1(e) {
  const { overflow: t, overflowX: n, overflowY: o, display: r } = ae$1(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + o + n) && !Us.has(r);
}
const js = [":popover-open", ":modal"];
function Et$1(e) {
  return js.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return false;
    }
  });
}
const qs = ["transform", "translate", "scale", "rotate", "perspective"], Ys = ["transform", "translate", "scale", "rotate", "perspective", "filter"], Xs = ["paint", "layout", "strict", "content"];
function un$1(e) {
  const t = dn$1(), n = e;
  return qs.some((o) => n[o] ? n[o] !== "none" : false) || (n.containerType ? n.containerType !== "normal" : false) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : false) || !t && (n.filter ? n.filter !== "none" : false) || Ys.some((o) => (n.willChange || "").includes(o)) || Xs.some((o) => (n.contain || "").includes(o));
}
function dn$1() {
  return typeof CSS > "u" || !CSS.supports ? false : CSS.supports("-webkit-backdrop-filter", "none");
}
const Zs = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function _e(e) {
  return Zs.has(Ue());
}
function ae$1(e) {
  return ee$1(e).getComputedStyle(e);
}
function Dt$1(e) {
  return { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function Te(e) {
  const t = e.assignedSlot || e.parentNode || Gn() || he(e);
  return t;
}
function Zo(e) {
  const t = Te(e);
  return _e() ? e.ownerDocument ? e.ownerDocument.body : e.body : Zo(t);
}
function et(e, t, n) {
  var o;
  t === void 0 && (t = []), n === void 0 && (n = true);
  const r = Zo(e), i = r === ((o = e.ownerDocument) == null ? void 0 : o.body), s = ee$1(r);
  if (i) {
    const l = Yt$1(s);
    return t.concat(s, s.visualViewport || [], it$1(r) ? r : [], l && n ? et(l) : []);
  }
  return t.concat(r, et(r, [], n));
}
function Yt$1(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function Jo(e) {
  const t = ae$1(e);
  let n = parseFloat(t.width) || 0, o = parseFloat(t.height) || 0;
  const i = n, s = o, l = yt$1(n) !== i || yt$1(o) !== s;
  return l && (n = i, o = s), { width: n, height: o, $: l };
}
function fn$1(e) {
  return e.contextElement;
}
function Ne(e) {
  fn$1(e);
  return fe(1);
}
const Js = fe(0);
function Qo(e) {
  const t = ee$1(e);
  return !dn$1() || !t.visualViewport ? Js : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function Qs(e, t, n) {
  return t === void 0 && (t = false), !n || t && n !== ee$1(e) ? false : t;
}
function Ae(e, t, n, o) {
  t === void 0 && (t = false), n === void 0 && (n = false);
  const r = e.getBoundingClientRect(), i = fn$1(e);
  let s = fe(1);
  t && (o ? ce$1() : s = Ne(e));
  const l = Qs(i, n, o) ? Qo(i) : fe(0);
  let c = (r.left + l.x) / s.x, a = (r.top + l.y) / s.y, u = r.width / s.x, d = r.height / s.y;
  if (i) {
    const f = ee$1(i), g = o && ce$1() ? ee$1(o) : o;
    let h = f, m = Yt$1(h);
    for (; m && o && g !== h; ) {
      const y = Ne(m), v = m.getBoundingClientRect(), p = ae$1(m), w = v.left + (m.clientLeft + parseFloat(p.paddingLeft)) * y.x, x = v.top + (m.clientTop + parseFloat(p.paddingTop)) * y.y;
      c *= y.x, a *= y.y, u *= y.x, d *= y.y, c += w, a += x, h = ee$1(m), m = Yt$1(h);
    }
  }
  return bt$1({ width: u, height: d, x: c, y: a });
}
function Tt$1(e, t) {
  const n = Dt$1(e).scrollLeft;
  return t ? t.left + n : Ae(he(e)).left + n;
}
function er(e, t) {
  const n = e.getBoundingClientRect(), o = n.left + t.scrollLeft - Tt$1(e, n), r = n.top + t.scrollTop;
  return { x: o, y: r };
}
function el(e) {
  let { elements: t, rect: n, offsetParent: o, strategy: r } = e;
  const i = r === "fixed", s = he(o), l = t ? Et$1(t.floating) : false;
  if (o === s || l && i) return n;
  let c = { scrollLeft: 0, scrollTop: 0 }, a = fe(1);
  const u = fe(0);
  if ((!i) && ((c = Dt$1(o)), ge())) ;
  const f = s && true && !i ? er(s, c) : fe(0);
  return { width: n.width * a.x, height: n.height * a.y, x: n.x * a.x - c.scrollLeft * a.x + u.x + f.x, y: n.y * a.y - c.scrollTop * a.y + u.y + f.y };
}
function tl(e) {
  return Array.from(e.getClientRects());
}
function nl(e) {
  const t = he(e), n = Dt$1(e), o = e.ownerDocument.body, r = J$1(t.scrollWidth, t.clientWidth, o.scrollWidth, o.clientWidth), i = J$1(t.scrollHeight, t.clientHeight, o.scrollHeight, o.clientHeight);
  let s = -n.scrollLeft + Tt$1(e);
  const l = -n.scrollTop;
  return ae$1(o).direction === "rtl" && (s += J$1(t.clientWidth, o.clientWidth) - r), { width: r, height: i, x: s, y: l };
}
const Zn = 25;
function ol(e, t) {
  const n = ee$1(e), o = he(e), r = n.visualViewport;
  let i = o.clientWidth, s = o.clientHeight, l = 0, c = 0;
  if (r) {
    i = r.width, s = r.height;
    const u = dn$1();
    (!u || u && t === "fixed") && (l = r.offsetLeft, c = r.offsetTop);
  }
  const a = Tt$1(o);
  if (a <= 0) {
    const u = o.ownerDocument, d = u.body, f = getComputedStyle(d), g = u.compatMode === "CSS1Compat" && parseFloat(f.marginLeft) + parseFloat(f.marginRight) || 0, h = Math.abs(o.clientWidth - d.clientWidth - g);
    h <= Zn && (i -= h);
  } else a <= Zn && (i += a);
  return { width: i, height: s, x: l, y: c };
}
const rl = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function Jn(e, t, n) {
  let o;
  if (t === "viewport") o = ol(e, n);
  else if (t === "document") o = nl(he(e));
  else {
    const r = Qo(e);
    o = { x: t.x - r.x, y: t.y - r.y, width: t.width, height: t.height };
  }
  return bt$1(o);
}
function tr(e, t) {
  Te(e);
  return false ;
}
function sl(e, t) {
  const n = t.get(e);
  if (n) return n;
  let o = et(e, [], false).filter((l) => ce$1()), r = null;
  const i = ae$1(e).position === "fixed";
  let s = i ? Te(e) : e;
  for (; ce$1(); ) {
    const l = ae$1(s), c = un$1(s);
    !c && l.position === "fixed" && (r = null), (i ? !c && !r : !c && l.position === "static" && !!r && rl.has(r.position) || it$1(s) && !c && tr(e)) ? o = o.filter((u) => u !== s) : r = l, s = Te(s);
  }
  return t.set(e, o), o;
}
function ll(e) {
  let { element: t, boundary: n, rootBoundary: o, strategy: r } = e;
  const s = [...n === "clippingAncestors" ? Et$1(t) ? [] : sl(t, this._c) : [].concat(n), o], l = s[0], c = s.reduce((a, u) => {
    const d = Jn(t, u, r);
    return a.top = J$1(d.top, a.top), a.right = Ee(d.right, a.right), a.bottom = Ee(d.bottom, a.bottom), a.left = J$1(d.left, a.left), a;
  }, Jn(t, l, r));
  return { width: c.right - c.left, height: c.bottom - c.top, x: c.left, y: c.top };
}
function cl(e) {
  const { width: t, height: n } = Jo(e);
  return { width: t, height: n };
}
function al(e, t, n) {
  const o = ge(), r = he(t), i = n === "fixed", s = Ae(e, true, i, t);
  let l = { scrollLeft: 0, scrollTop: 0 };
  const c = fe(0);
  function a() {
    c.x = Tt$1(r);
  }
  if (!i) if ((l = Dt$1(t)), o) ; else r && a();
  i && !o && r && a();
  const u = r && !o && !i ? er(r, l) : fe(0), d = s.left + l.scrollLeft - c.x - u.x, f = s.top + l.scrollTop - c.y - u.y;
  return { x: d, y: f, width: s.width, height: s.height };
}
function nr(e, t) {
  const n = ee$1(e);
  if (Et$1(e)) return n;
  {
    let r = Te(e);
    for (; r && !_e(); ) {
      r = Te(r);
    }
    return n;
  }
}
const ul = async function(e) {
  const t = this.getOffsetParent || nr, n = this.getDimensions, o = await n(e.floating);
  return { reference: al(e.reference, await t(e.floating), e.strategy), floating: { x: 0, y: 0, width: o.width, height: o.height } };
};
function dl(e) {
  return ae$1(e).direction === "rtl";
}
const or = { convertOffsetParentRelativeRectToViewportRelativeRect: el, getDocumentElement: he, getClippingRect: ll, getOffsetParent: nr, getElementRects: ul, getClientRects: tl, getDimensions: cl, getScale: Ne, isElement: ce$1, isRTL: dl };
function rr(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function fl(e, t) {
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
    const h = ft$1(d), m = ft$1(r.clientWidth - (u + f)), y = ft$1(r.clientHeight - (d + g)), v = ft$1(u), w = { rootMargin: -h + "px " + -m + "px " + -y + "px " + -v + "px", threshold: J$1(0, Ee(1, c)) || 1 };
    let x = true;
    function S(L) {
      const T = L[0].intersectionRatio;
      if (T !== c) {
        if (!x) return s();
        T ? s(false, T) : o = setTimeout(() => {
          s(false, 1e-7);
        }, 1e3);
      }
      T === 1 && !rr(a, e.getBoundingClientRect()) && s(), x = false;
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
function gl(e, t, n, o) {
  o === void 0 && (o = {});
  const { ancestorScroll: r = true, ancestorResize: i = true, elementResize: s = typeof ResizeObserver == "function", layoutShift: l = typeof IntersectionObserver == "function", animationFrame: c = false } = o, a = fn$1(e), u = r || i ? [...a ? et(a) : [], ...et(t)] : [];
  u.forEach((v) => {
    r && v.addEventListener("scroll", n, { passive: true }), i && v.addEventListener("resize", n);
  });
  const d = a && l ? fl(a, n) : null;
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
    m && !rr(m, v) && n(), m = v, h = requestAnimationFrame(y);
  }
  return n(), () => {
    var v;
    u.forEach((p) => {
      r && p.removeEventListener("scroll", n), i && p.removeEventListener("resize", n);
    }), d == null ? void 0 : d(), (v = g) == null || v.disconnect(), g = null, c && cancelAnimationFrame(h);
  };
}
const hl = _s, pl = $s, ml = ks, yl = Ws, vl = Bs, bl = Rs, wl = (e, t, n) => {
  const o = /* @__PURE__ */ new Map(), r = { platform: or, ...n }, i = { ...r.platform, _c: o };
  return Ms(e, t, { ...r, platform: i });
};
var Sl = ["<svg", ' display="block" viewBox="', '" style="transform:scale(1.02)"><g', '><path fill="none"', '></path><path stroke="none"', "></path></g></svg>"], gn$1 = createContext$1();
function hn$1() {
  const e = useContext(gn$1);
  if (e === void 0) throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");
  return e;
}
var Ge = 30, eo = Ge / 2, xl = { top: 180, right: -90, bottom: 0, left: 90 }, to = "M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z";
function st(e) {
  const t = hn$1(), n = _$1({ size: Ge }, e), [o, r] = splitProps(n, ["ref", "style", "size"]), i = () => t.currentPlacement().split("-")[0], s = El(t.contentRef), l = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue("background-color")) || "none";
  }, c = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue(`border-${i()}-color`)) || "none";
  }, a = () => {
    var _a;
    return ((_a = s()) == null ? void 0 : _a.getPropertyValue(`border-${i()}-width`)) || "0px";
  }, u = () => Number.parseInt(a()) * 2 * (Ge / o.size), d = () => `rotate(${xl[i()]} ${eo} ${eo}) translate(0 2)`;
  return createComponent$1(j, mergeProps({ as: "div", "aria-hidden": "true", get style() {
    return tt({ position: "absolute", "font-size": `${o.size}px`, width: "1em", height: "1em", "pointer-events": "none", fill: l(), stroke: c(), "stroke-width": u() }, o.style);
  } }, r, { get children() {
    return ssr(Sl, ssrHydrationKey(), `0 0 ${escape(Ge, true)} ${escape(Ge, true)}`, ssrAttribute("transform", escape(d(), true), false), ssrAttribute("d", escape(to, true), false), ssrAttribute("d", escape(to, true), false));
  } }));
}
function El(e) {
  const [t, n] = createSignal();
  return createEffect(() => {
    const o = e();
    o && n(ho(o).getComputedStyle(o));
  }), t;
}
function Dl(e) {
  hn$1();
  const [t, n] = splitProps(e, ["ref", "style"]);
  return createComponent$1(j, mergeProps({ as: "div", "data-popper-positioner": "", get style() {
    return tt({ position: "absolute", top: 0, left: 0, "min-width": "max-content" }, t.style);
  } }, n));
}
function no(e) {
  const { x: t = 0, y: n = 0, width: o = 0, height: r = 0 } = e != null ? e : {};
  if (typeof DOMRect == "function") return new DOMRect(t, n, o, r);
  const i = { x: t, y: n, width: o, height: r, top: n, right: t + o, bottom: n + r, left: t };
  return { ...i, toJSON: () => i };
}
function Tl(e, t) {
  return { contextElement: e, getBoundingClientRect: () => {
    const o = t(e);
    return o ? no(o) : e ? e.getBoundingClientRect() : no();
  } };
}
function Ol(e) {
  return /^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e);
}
var Pl = { top: "bottom", right: "left", bottom: "top", left: "right" };
function Cl(e, t) {
  const [n, o] = e.split("-"), r = Pl[n];
  return o ? n === "left" || n === "right" ? `${r} ${o === "start" ? "top" : "bottom"}` : o === "start" ? `${r} ${t === "rtl" ? "right" : "left"}` : `${r} ${t === "rtl" ? "left" : "right"}` : `${r} center`;
}
function Ll(e) {
  const t = _$1({ getAnchorRect: (f) => f == null ? void 0 : f.getBoundingClientRect(), placement: "bottom", gutter: 0, shift: 0, flip: true, slide: true, overlap: false, sameWidth: false, fitViewport: false, hideWhenDetached: false, detachedPadding: 0, arrowPadding: 4, overflowPadding: 8 }, e), [n, o] = createSignal(), [r, i] = createSignal(), [s, l] = createSignal(t.placement), c = () => {
    var _a;
    return Tl((_a = t.anchorRef) == null ? void 0 : _a.call(t), t.getAnchorRect);
  }, { direction: a } = ln$1();
  async function u() {
    var _a, _b, _c;
    const f = c(), g = n(), h = r();
    if (!f || !g) return;
    const m = ((h == null ? void 0 : h.clientHeight) || 0) / 2, y = typeof t.gutter == "number" ? t.gutter + m : (_a = t.gutter) != null ? _a : m;
    g.style.setProperty("--kb-popper-content-overflow-padding", `${t.overflowPadding}px`), f.getBoundingClientRect();
    const v = [hl(({ placement: L }) => {
      const T = !!L.split("-")[1];
      return { mainAxis: y, crossAxis: T ? void 0 : t.shift, alignmentAxis: t.shift };
    })];
    if (t.flip !== false) {
      const L = typeof t.flip == "string" ? t.flip.split(" ") : void 0;
      if (L !== void 0 && !L.every(Ol)) throw new Error("`flip` expects a spaced-delimited list of placements");
      v.push(ml({ padding: t.overflowPadding, fallbackPlacements: L }));
    }
    (t.slide || t.overlap) && v.push(pl({ mainAxis: t.slide, crossAxis: t.overlap, padding: t.overflowPadding })), v.push(yl({ padding: t.overflowPadding, apply({ availableWidth: L, availableHeight: T, rects: D }) {
      const M = Math.round(D.reference.width);
      L = Math.floor(L), T = Math.floor(T), g.style.setProperty("--kb-popper-anchor-width", `${M}px`), g.style.setProperty("--kb-popper-content-available-width", `${L}px`), g.style.setProperty("--kb-popper-content-available-height", `${T}px`), t.sameWidth && (g.style.width = `${M}px`), t.fitViewport && (g.style.maxWidth = `${L}px`, g.style.maxHeight = `${T}px`);
    } })), t.hideWhenDetached && v.push(vl({ padding: t.detachedPadding })), h && v.push(bl({ element: h, padding: t.arrowPadding }));
    const p = await wl(f, g, { placement: t.placement, strategy: "absolute", middleware: v, platform: { ...or, isRTL: () => a() === "rtl" } });
    if (l(p.placement), (_b = t.onCurrentPlacementChange) == null ? void 0 : _b.call(t, p.placement), !g) return;
    g.style.setProperty("--kb-popper-content-transform-origin", Cl(p.placement, a()));
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
    const h = gl(f, g, u, { elementResize: typeof ResizeObserver == "function" });
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
  return createComponent$1(gn$1.Provider, { value: d, get children() {
    return t.children;
  } });
}
var Ot$1 = Object.assign(Ll, { Arrow: st, Context: gn$1, usePopperContext: hn$1, Positioner: Dl }), Al = {};
ot(Al, { Arrow: () => st, Content: () => sr, Portal: () => lr, Root: () => cr, Tooltip: () => ur, Trigger: () => ar, useTooltipContext: () => Pt$1 });
var ir = createContext$1();
function Pt$1() {
  const e = useContext(ir);
  if (e === void 0) throw new Error("[kobalte]: `useTooltipContext` must be used within a `Tooltip` component");
  return e;
}
function sr(e) {
  const t = Pt$1(), n = _$1({ id: t.generateId("content") }, e), [o, r] = splitProps(n, ["ref", "style"]);
  return createEffect(() => onCleanup(t.registerContentId(r.id))), createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Ot$1.Positioner, { get children() {
      return createComponent$1(rn$1, mergeProps({ role: "tooltip", disableOutsidePointerEvents: false, get style() {
        return tt({ "--kb-tooltip-content-transform-origin": "var(--kb-popper-content-transform-origin)", position: "relative" }, o.style);
      }, onFocusOutside: (i) => i.preventDefault(), onDismiss: () => t.hideTooltip(true) }, () => t.dataset(), r));
    } });
  } });
}
function lr(e) {
  const t = Pt$1();
  return createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
function Il(e, t, n) {
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
var Ce = {}, Kl = 0, Re = false, pe, qe, ke;
function cr(e) {
  const t = `tooltip-${createUniqueId()}`, n = `${++Kl}`, o = _$1({ id: t, openDelay: 700, closeDelay: 300, skipDelayDuration: 300 }, e), [r, i] = splitProps(o, ["id", "open", "defaultOpen", "onOpenChange", "disabled", "triggerOnFocusOnly", "openDelay", "closeDelay", "skipDelayDuration", "ignoreSafeArea", "forceMount"]);
  let s;
  const [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(i.placement), m = sn$1({ open: () => r.open, defaultOpen: () => r.defaultOpen, onOpenChange: (A) => {
    var _a;
    return (_a = r.onOpenChange) == null ? void 0 : _a.call(r, A);
  } }), { present: y } = mt$1({ show: () => r.forceMount || m.isOpen(), element: () => {
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
  }, M = (A) => de$1(a(), A) || de$1(d(), A), $ = (A) => {
    const O = a(), C = d();
    if (!(!O || !C)) return Il(A, O, C);
  }, U = (A) => {
    const O = A.target;
    if (M(O)) {
      D();
      return;
    }
    if (!r.ignoreSafeArea) {
      const C = $(g());
      if (C && Ki(Ii(A), C)) {
        D();
        return;
      }
    }
    s || w();
  };
  createEffect(() => {
    if (isServer || !m.isOpen()) return;
    const A = se$1();
    A.addEventListener("pointermove", U, true), onCleanup(() => {
      A.removeEventListener("pointermove", U, true);
    });
  }), createEffect(() => {
    const A = a();
    if (!A || !m.isOpen()) return;
    const O = (B) => {
      const W = B.target;
      de$1(W, A) && w(true);
    }, C = ho();
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
  }, contentId: l, contentPresent: y, openTooltip: L, hideTooltip: w, cancelOpening: T, generateId: $e(() => o.id), registerContentId: Q$1(c), isTargetOnTooltip: M, setTriggerRef: u, setContentRef: f };
  return createComponent$1(ir.Provider, { value: Z, get children() {
    return createComponent$1(Ot$1, mergeProps({ anchorRef: a, contentRef: d, onCurrentPlacementChange: h }, i));
  } });
}
function ar(e) {
  let t;
  const n = Pt$1(), [o, r] = splitProps(e, ["ref", "onPointerEnter", "onPointerLeave", "onPointerDown", "onClick", "onFocus", "onBlur"]);
  let i = false, s = false, l = false;
  const c = () => {
    i = false;
  }, a = () => {
    !n.isOpen() && (s || l) && n.openTooltip(l);
  }, u = (v) => {
    n.isOpen() && !s && !l && n.hideTooltip(v);
  }, d = (v) => {
    H$1(v, o.onPointerEnter), !(v.pointerType === "touch" || n.triggerOnFocusOnly() || n.isDisabled() || v.defaultPrevented) && (s = true, a());
  }, f = (v) => {
    H$1(v, o.onPointerLeave), v.pointerType !== "touch" && (s = false, l = false, n.isOpen() ? u() : n.cancelOpening());
  }, g = (v) => {
    H$1(v, o.onPointerDown), i = true, se$1(t).addEventListener("pointerup", c, { once: true });
  }, h = (v) => {
    H$1(v, o.onClick), s = false, l = false, u(true);
  }, m = (v) => {
    H$1(v, o.onFocus), !(n.isDisabled() || v.defaultPrevented || i) && (l = true, a());
  }, y = (v) => {
    H$1(v, o.onBlur);
    const p = v.relatedTarget;
    n.isTargetOnTooltip(p) || (s = false, l = false, u(true));
  };
  return onCleanup(() => {
    isServer || se$1(t).removeEventListener("pointerup", c);
  }), createComponent$1(j, mergeProps({ as: "button", get "aria-describedby"() {
    return n.isOpen() ? n.contentId() : void 0;
  }, onPointerEnter: d, onPointerLeave: f, onPointerDown: g, onClick: h, onFocus: m, onBlur: y }, () => n.dataset(), r));
}
var ur = Object.assign(cr, { Arrow: st, Content: sr, Portal: lr, Trigger: ar });
ur.Trigger;
var Fl = ["id", "name", "validationState", "required", "disabled", "readOnly"];
function Ml(e) {
  const t = `form-control-${createUniqueId()}`, n = _$1({ id: t }, e), [o, r] = createSignal(), [i, s] = createSignal(), [l, c] = createSignal(), [a, u] = createSignal(), d = (m, y, v) => {
    const p = v != null || o() != null;
    return [v, o(), p && y != null ? m : void 0].filter(Boolean).join(" ") || void 0;
  }, f = (m) => [l(), a(), m].filter(Boolean).join(" ") || void 0, g = createMemo(() => ({ "data-valid": b(n.validationState) === "valid" ? "" : void 0, "data-invalid": b(n.validationState) === "invalid" ? "" : void 0, "data-required": b(n.required) ? "" : void 0, "data-disabled": b(n.disabled) ? "" : void 0, "data-readonly": b(n.readOnly) ? "" : void 0 }));
  return { formControlContext: { name: () => {
    var _a;
    return (_a = b(n.name)) != null ? _a : b(n.id);
  }, dataset: g, validationState: () => b(n.validationState), isRequired: () => b(n.required), isDisabled: () => b(n.disabled), isReadOnly: () => b(n.readOnly), labelId: o, fieldId: i, descriptionId: l, errorMessageId: a, getAriaLabelledBy: d, getAriaDescribedBy: f, generateId: $e(() => b(n.id)), registerLabel: Q$1(r), registerField: Q$1(s), registerDescription: Q$1(c), registerErrorMessage: Q$1(u) } };
}
var dr = createContext$1();
function Fe() {
  const e = useContext(dr);
  if (e === void 0) throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");
  return e;
}
function fr(e) {
  const t = Fe(), n = _$1({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescription(n.id))), createComponent$1(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
var Rl = ["<option", "", ">", "</option>"], kl = "<option></option>", Bl = ["<div", ' style="', '" aria-hidden="true"><input type="text"', ' style="', '"', "", ">", "</div>"];
function Vl(e) {
  const [t, n] = splitProps(e, ["ref", "onChange", "collection", "selectionManager", "isOpen", "isMultiple", "isVirtualized", "focusTrigger"]), o = Fe(), [r, i] = createSignal(false), s = (l) => {
    const c = t.collection.getItem(l);
    return createComponent$1(Show, { get when() {
      return (c == null ? void 0 : c.type) === "item";
    }, get children() {
      return ssr(Rl, ssrHydrationKey() + ssrAttribute("value", escape(l, true), false), ssrAttribute("selected", t.selectionManager.isSelected(l), true), escape(c == null ? void 0 : c.textValue));
    } });
  };
  return createEffect(on$3(() => t.selectionManager.selectedKeys(), (l, c) => {
    c && Ho(l, c) || i(true);
  }, { defer: true })), ssr(Bl, ssrHydrationKey(), ssrStyle(So), ssrAttribute("tabindex", t.selectionManager.isFocused() || t.isOpen ? -1 : 0, false), ssrStyleProperty("font-size:", "16px"), ssrAttribute("required", o.isRequired(), true), ssrAttribute("disabled", o.isDisabled(), true) + ssrAttribute("readonly", escape(o.isReadOnly(), true), false), ssrElement("select", mergeProps({ tabIndex: -1, get multiple() {
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
  } }, n), () => [ssr(kl), "<!--$-->", escape(createComponent$1(Show, { get when() {
    return t.isVirtualized;
  }, get fallback() {
    return createComponent$1(For, { get each() {
      return [...t.collection.getKeys()];
    }, children: s });
  }, get children() {
    return createComponent$1(For, { get each() {
      return [...t.selectionManager.selectedKeys()];
    }, children: s });
  } })), "<!--/-->"], false));
}
var oo = /* @__PURE__ */ new WeakMap();
function Nl(e) {
  let t = oo.get(e);
  if (t != null) return t;
  t = 0;
  for (const n of e) n.type === "item" && t++;
  return oo.set(e, t), t;
}
var gr = class {
  constructor(e, t, n) {
    __publicField$1(this, "collection");
    __publicField$1(this, "ref");
    __publicField$1(this, "collator");
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
function _l(e, t, n) {
  const o = Wo({ usage: "search", sensitivity: "base" }), r = createMemo(() => {
    const i = b(e.keyboardDelegate);
    return i || new gr(e.collection, t, o);
  });
  return ws({ selectionManager: () => b(e.selectionManager), keyboardDelegate: r, autoFocus: () => b(e.autoFocus), deferAutoFocus: () => b(e.deferAutoFocus), shouldFocusWrap: () => b(e.shouldFocusWrap), disallowEmptySelection: () => b(e.disallowEmptySelection), selectOnFocus: () => b(e.selectOnFocus), disallowTypeAhead: () => b(e.disallowTypeAhead), shouldUseVirtualFocus: () => b(e.shouldUseVirtualFocus), allowsTabNavigation: () => b(e.allowsTabNavigation), isVirtualized: () => b(e.isVirtualized), scrollToKey: (i) => {
    var _a;
    return (_a = b(e.scrollToKey)) == null ? void 0 : _a(i);
  }, orientation: () => b(e.orientation) }, t, n);
}
var $l = {};
ot($l, { Item: () => Ct$1, ItemDescription: () => Lt$1, ItemIndicator: () => At$1, ItemLabel: () => It$1, Listbox: () => Wl, Root: () => mn$1, Section: () => Kt$1, useListboxContext: () => pr });
var hr = createContext$1();
function pr() {
  const e = useContext(hr);
  if (e === void 0) throw new Error("[kobalte]: `useListboxContext` must be used within a `Listbox` component");
  return e;
}
var mr = createContext$1();
function pn$1() {
  const e = useContext(mr);
  if (e === void 0) throw new Error("[kobalte]: `useListboxItemContext` must be used within a `Listbox.Item` component");
  return e;
}
function Ct$1(e) {
  let t;
  const n = pr(), o = `${n.generateId("item")}-${createUniqueId()}`, r = _$1({ id: o }, e), [i, s] = splitProps(r, ["ref", "item", "aria-label", "aria-labelledby", "aria-describedby", "onPointerMove", "onPointerDown", "onPointerUp", "onClick", "onKeyDown", "onMouseDown", "onFocus"]), [l, c] = createSignal(), [a, u] = createSignal(), d = () => n.listState().selectionManager(), f = () => d().focusedKey() === i.item.key, g = Ss({ key: () => i.item.key, selectionManager: d, shouldSelectOnPressUp: n.shouldSelectOnPressUp, allowsDifferentPressOrigin: () => n.shouldSelectOnPressUp() && n.shouldFocusOnHover(), shouldUseVirtualFocus: n.shouldUseVirtualFocus, disabled: () => i.item.disabled }, () => t), h = () => {
    if (d().selectionMode() !== "none") return g.isSelected();
  }, m = createMemo(() => true), y = () => m() ? i["aria-label"] : void 0, v = () => m() ? l() : void 0, p = () => m() ? a() : void 0, w = () => {
    var _a;
    if (!n.isVirtualized()) return;
    const D = (_a = n.listState().collection().getItem(i.item.key)) == null ? void 0 : _a.index;
    return D != null ? D + 1 : void 0;
  }, x = () => {
    if (n.isVirtualized()) return Nl(n.listState().collection());
  }, S = (D) => {
    H$1(D, i.onPointerMove), D.pointerType === "mouse" && !g.isDisabled() && n.shouldFocusOnHover() && (X$1(D.currentTarget), d().setFocused(true), d().setFocusedKey(i.item.key));
  }, L = createMemo(() => ({ "data-disabled": g.isDisabled() ? "" : void 0, "data-selected": g.isSelected() ? "" : void 0, "data-highlighted": f() ? "" : void 0 })), T = { isSelected: g.isSelected, dataset: L, generateId: $e(() => s.id), registerLabelId: Q$1(c), registerDescriptionId: Q$1(u) };
  return createComponent$1(mr.Provider, { value: T, get children() {
    return createComponent$1(j, mergeProps({ as: "li", role: "option", get tabIndex() {
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
      return ie$1([i.onPointerDown, g.onPointerDown]);
    }, get onPointerUp() {
      return ie$1([i.onPointerUp, g.onPointerUp]);
    }, get onClick() {
      return ie$1([i.onClick, g.onClick]);
    }, get onKeyDown() {
      return ie$1([i.onKeyDown, g.onKeyDown]);
    }, get onMouseDown() {
      return ie$1([i.onMouseDown, g.onMouseDown]);
    }, get onFocus() {
      return ie$1([i.onFocus, g.onFocus]);
    }, onPointerMove: S }, L, s));
  } });
}
function Lt$1(e) {
  const t = pn$1(), n = _$1({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescriptionId(n.id))), createComponent$1(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function At$1(e) {
  const t = pn$1(), n = _$1({ id: t.generateId("indicator") }, e), [o, r] = splitProps(n, ["forceMount"]);
  return createComponent$1(Show, { get when() {
    return o.forceMount || t.isSelected();
  }, get children() {
    return createComponent$1(j, mergeProps({ as: "div", "aria-hidden": "true" }, () => t.dataset(), r));
  } });
}
function It$1(e) {
  const t = pn$1(), n = _$1({ id: t.generateId("label") }, e);
  return createEffect(() => onCleanup(t.registerLabelId(n.id))), createComponent$1(j, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function mn$1(e) {
  let t;
  const n = `listbox-${createUniqueId()}`, o = _$1({ id: n, selectionMode: "single", virtualized: false }, e), [r, i] = splitProps(o, ["ref", "children", "renderItem", "renderSection", "value", "defaultValue", "onChange", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "state", "keyboardDelegate", "autoFocus", "selectionMode", "shouldFocusWrap", "shouldUseVirtualFocus", "shouldSelectOnPressUp", "shouldFocusOnHover", "allowDuplicateSelectionEvents", "disallowEmptySelection", "selectionBehavior", "selectOnFocus", "disallowTypeAhead", "allowsTabNavigation", "virtualized", "scrollToItem", "scrollRef", "onKeyDown", "onMouseDown", "onFocusIn", "onFocusOut"]), s = createMemo(() => r.state ? r.state : qo({ selectedKeys: () => r.value, defaultSelectedKeys: () => r.defaultValue, onSelectionChange: r.onChange, allowDuplicateSelectionEvents: () => b(r.allowDuplicateSelectionEvents), disallowEmptySelection: () => b(r.disallowEmptySelection), selectionBehavior: () => b(r.selectionBehavior), selectionMode: () => b(r.selectionMode), dataSource: () => {
    var _a;
    return (_a = r.options) != null ? _a : [];
  }, getKey: () => r.optionValue, getTextValue: () => r.optionTextValue, getDisabled: () => r.optionDisabled, getSectionChildren: () => r.optionGroupChildren })), l = _l({ selectionManager: () => s().selectionManager(), collection: () => s().collection(), autoFocus: () => b(r.autoFocus), shouldFocusWrap: () => b(r.shouldFocusWrap), keyboardDelegate: () => r.keyboardDelegate, disallowEmptySelection: () => b(r.disallowEmptySelection), selectOnFocus: () => b(r.selectOnFocus), disallowTypeAhead: () => b(r.disallowTypeAhead), shouldUseVirtualFocus: () => b(r.shouldUseVirtualFocus), allowsTabNavigation: () => b(r.allowsTabNavigation), isVirtualized: () => r.virtualized, scrollToKey: () => r.scrollToItem }, () => t, () => {
    var _a;
    return (_a = r.scrollRef) == null ? void 0 : _a.call(r);
  }), c = { listState: s, generateId: $e(() => i.id), shouldUseVirtualFocus: () => o.shouldUseVirtualFocus, shouldSelectOnPressUp: () => o.shouldSelectOnPressUp, shouldFocusOnHover: () => o.shouldFocusOnHover, isVirtualized: () => r.virtualized };
  return createComponent$1(hr.Provider, { value: c, get children() {
    return createComponent$1(j, mergeProps({ as: "ul", role: "listbox", get tabIndex() {
      return l.tabIndex();
    }, get "aria-multiselectable"() {
      return s().selectionManager().selectionMode() === "multiple" ? true : void 0;
    }, get onKeyDown() {
      return ie$1([r.onKeyDown, l.onKeyDown]);
    }, get onMouseDown() {
      return ie$1([r.onMouseDown, l.onMouseDown]);
    }, get onFocusIn() {
      return ie$1([r.onFocusIn, l.onFocusIn]);
    }, get onFocusOut() {
      return ie$1([r.onFocusOut, l.onFocusOut]);
    } }, i, { get children() {
      return createComponent$1(Show, { get when() {
        return !r.virtualized;
      }, get fallback() {
        var _a;
        return (_a = r.children) == null ? void 0 : _a.call(r, s().collection);
      }, get children() {
        return createComponent$1(di, { get each() {
          return [...s().collection()];
        }, by: "key", children: (a) => createComponent$1(Switch, { get children() {
          return [createComponent$1(Match, { get when() {
            return a().type === "section";
          }, get children() {
            var _a;
            return (_a = r.renderSection) == null ? void 0 : _a.call(r, a());
          } }), createComponent$1(Match, { get when() {
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
function Kt$1(e) {
  return createComponent$1(j, mergeProps({ as: "li", role: "presentation" }, e));
}
var Wl = Object.assign(mn$1, { Item: Ct$1, ItemDescription: Lt$1, ItemIndicator: At$1, ItemLabel: It$1, Section: Kt$1 }), Ul = ["id", "aria-label", "aria-labelledby", "aria-describedby"];
function zl(e) {
  const t = Fe(), n = _$1({ id: t.generateId("field") }, e);
  return createEffect(() => onCleanup(t.registerField(b(n.id)))), { fieldProps: { id: () => b(n.id), ariaLabel: () => b(n["aria-label"]), ariaLabelledBy: () => t.getAriaLabelledBy(b(n.id), b(n["aria-label"]), b(n["aria-labelledby"])), ariaDescribedBy: () => t.getAriaDescribedBy(b(n["aria-describedby"])) } };
}
function Hl(e) {
  let t;
  const n = Fe(), o = _$1({ id: n.generateId("label") }, e), [r, i] = splitProps(o, ["ref"]), s = xo(() => t, () => "label");
  return createEffect(() => onCleanup(n.registerLabel(i.id))), createComponent$1(j, mergeProps({ as: "label", get for() {
    return s() === "label" ? n.fieldId() : void 0;
  } }, () => n.dataset(), i));
}
function jl(e, t) {
  createEffect(on$3(e, (n) => {
    if (n == null) return;
    const o = ql(n);
    o != null && (o.addEventListener("reset", t, { passive: true }), onCleanup(() => {
      o.removeEventListener("reset", t);
    }));
  }));
}
function ql(e) {
  return Yl(e) ? e.form : e.closest("form");
}
function Yl(e) {
  return e.matches("textarea, input, select, button");
}
function yr(e) {
  const t = Fe(), n = _$1({ id: t.generateId("error-message") }, e), [o, r] = splitProps(n, ["forceMount"]), i = () => t.validationState() === "invalid";
  return createEffect(() => {
    i() && onCleanup(t.registerErrorMessage(r.id));
  }), createComponent$1(Show, { get when() {
    return o.forceMount || i();
  }, get children() {
    return createComponent$1(j, mergeProps({ as: "div" }, () => t.dataset(), r));
  } });
}
var Xl = {};
ot(Xl, { Arrow: () => st, Content: () => br, Description: () => fr, ErrorMessage: () => yr, HiddenSelect: () => wr, Icon: () => Sr, Item: () => Ct$1, ItemDescription: () => Lt$1, ItemIndicator: () => At$1, ItemLabel: () => It$1, Label: () => xr, Listbox: () => Er, Portal: () => Dr, Root: () => Tr, Section: () => Kt$1, Select: () => lt$1, Trigger: () => Or, Value: () => Pr, useSelectContext: () => we });
var vr = createContext$1();
function we() {
  const e = useContext(vr);
  if (e === void 0) throw new Error("[kobalte]: `useSelectContext` must be used within a `Select` component");
  return e;
}
function br(e) {
  let t;
  const n = we(), [o, r] = splitProps(e, ["ref", "style", "onCloseAutoFocus", "onFocusOutside"]), i = (l) => {
    n.close();
  }, s = (l) => {
    var _a;
    (_a = o.onFocusOutside) == null ? void 0 : _a.call(o, l), n.isOpen() && n.isModal() && l.preventDefault();
  };
  return Po({ isDisabled: () => !(n.isOpen() && n.isModal()), targets: () => [] }), Ao({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), Oo({ trapFocus: () => n.isOpen() && n.isModal(), onMountAutoFocus: (l) => {
    l.preventDefault();
  }, onUnmountAutoFocus: (l) => {
    var _a;
    (_a = o.onCloseAutoFocus) == null ? void 0 : _a.call(o, l), l.defaultPrevented || (X$1(n.triggerRef()), l.preventDefault());
  } }, () => t), createComponent$1(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent$1(Ot$1.Positioner, { get children() {
      return createComponent$1(rn$1, mergeProps({ get disableOutsidePointerEvents() {
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
function wr(e) {
  const t = we();
  return createComponent$1(Vl, mergeProps({ get collection() {
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
function Sr(e) {
  const t = we(), n = _$1({ children: "\u25BC" }, e);
  return createComponent$1(j, mergeProps({ as: "span", "aria-hidden": "true" }, () => t.dataset(), n));
}
function xr(e) {
  const t = we(), [n, o] = splitProps(e, ["onClick"]);
  return createComponent$1(Hl, mergeProps({ as: "span", onClick: (i) => {
    var _a;
    H$1(i, n.onClick), t.isDisabled() || ((_a = t.triggerRef()) == null ? void 0 : _a.focus());
  } }, o));
}
function Er(e) {
  const t = we(), n = _$1({ id: t.generateId("listbox") }, e), [o, r] = splitProps(n, ["ref", "id", "onKeyDown"]);
  return createEffect(() => onCleanup(t.registerListboxId(o.id))), createComponent$1(mn$1, mergeProps({ get id() {
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
    H$1(s, o.onKeyDown), s.key === "Escape" && s.preventDefault();
  } }, r));
}
function Dr(e) {
  const t = we();
  return createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
function Gl(e) {
  const t = `select-${createUniqueId()}`, n = _$1({ id: t, selectionMode: "single", disallowEmptySelection: false, closeOnSelection: e.selectionMode === "single", allowDuplicateSelectionEvents: true, gutter: 8, sameWidth: true, modal: false }, e), [o, r, i, s] = splitProps(n, ["itemComponent", "sectionComponent", "open", "defaultOpen", "onOpenChange", "value", "defaultValue", "onChange", "placeholder", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "keyboardDelegate", "allowDuplicateSelectionEvents", "disallowEmptySelection", "closeOnSelection", "disallowTypeAhead", "shouldFocusWrap", "selectionBehavior", "selectionMode", "virtualized", "modal", "preventScroll", "forceMount"], ["getAnchorRect", "placement", "gutter", "shift", "flip", "slide", "overlap", "sameWidth", "fitViewport", "hideWhenDetached", "detachedPadding", "arrowPadding", "overflowPadding"], Fl), [l, c] = createSignal(), [a, u] = createSignal(), [d, f] = createSignal(), [g, h] = createSignal(), [m, y] = createSignal(), [v, p] = createSignal(), [w, x] = createSignal(), [S, L] = createSignal(true), T = (F) => {
    const q = o.optionValue;
    return q == null ? String(F) : String(Qt$1(q) ? q(F) : F[q]);
  }, D = createMemo(() => {
    const F = o.optionGroupChildren;
    return F == null ? o.options : o.options.flatMap((q) => {
      var _a;
      return (_a = q[F]) != null ? _a : q;
    });
  }), M = createMemo(() => D().map((F) => T(F))), $ = (F) => [...F].map((q) => D().find((Ft) => T(Ft) === q)).filter((q) => q != null), U = sn$1({ open: () => o.open, defaultOpen: () => o.defaultOpen, onOpenChange: (F) => {
    var _a;
    return (_a = o.onOpenChange) == null ? void 0 : _a.call(o, F);
  } }), V = qo({ selectedKeys: () => o.value != null ? o.value.map(T) : o.value, defaultSelectedKeys: () => o.defaultValue != null ? o.defaultValue.map(T) : o.defaultValue, onSelectionChange: (F) => {
    var _a;
    (_a = o.onChange) == null ? void 0 : _a.call(o, $(F)), o.closeOnSelection && W();
  }, allowDuplicateSelectionEvents: () => b(o.allowDuplicateSelectionEvents), disallowEmptySelection: () => b(o.disallowEmptySelection), selectionBehavior: () => b(o.selectionBehavior), selectionMode: () => o.selectionMode, dataSource: () => {
    var _a;
    return (_a = o.options) != null ? _a : [];
  }, getKey: () => o.optionValue, getTextValue: () => o.optionTextValue, getDisabled: () => o.optionDisabled, getSectionChildren: () => o.optionGroupChildren }), Z = createMemo(() => $(V.selectionManager().selectedKeys())), A = (F) => {
    V.selectionManager().toggleSelection(T(F));
  }, { present: O } = mt$1({ show: () => o.forceMount || U.isOpen(), element: () => {
    var _a;
    return (_a = m()) != null ? _a : null;
  } }), C = () => {
    const F = v();
    F && X$1(F);
  }, B = (F) => {
    if (o.options.length <= 0) return;
    L(F), U.open();
    let q = V.selectionManager().firstSelectedKey();
    q == null && (F === "first" ? q = V.collection().getFirstKey() : F === "last" && (q = V.collection().getLastKey())), C(), V.selectionManager().setFocused(true), V.selectionManager().setFocusedKey(q);
  }, W = () => {
    U.close(), V.selectionManager().setFocused(false), V.selectionManager().setFocusedKey(void 0);
  }, G = (F) => {
    U.isOpen() ? W() : B(F);
  }, { formControlContext: oe } = Ml(i);
  jl(g, () => {
    const F = o.defaultValue ? [...o.defaultValue].map(T) : new ue$1();
    V.selectionManager().setSelectedKeys(F);
  });
  const Me = Wo({ usage: "search", sensitivity: "base" }), Se = createMemo(() => {
    const F = b(o.keyboardDelegate);
    return F || new gr(V.collection, void 0, Me);
  }), xe = (F) => {
    var _a;
    return (_a = o.itemComponent) == null ? void 0 : _a.call(o, { item: F });
  }, ct = (F) => {
    var _a;
    return (_a = o.sectionComponent) == null ? void 0 : _a.call(o, { section: F });
  };
  createEffect(on$3([M], ([F]) => {
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
  }, selectedOptions: Z, contentPresent: O, autoFocus: S, triggerRef: g, listState: () => V, keyboardDelegate: Se, triggerId: l, valueId: a, listboxId: d, listboxAriaLabelledBy: w, setListboxAriaLabelledBy: x, setTriggerRef: h, setContentRef: y, setListboxRef: p, open: B, close: W, toggle: G, placeholder: () => o.placeholder, renderItem: xe, renderSection: ct, removeOptionFromSelection: A, generateId: $e(() => b(i.id)), registerTriggerId: Q$1(c), registerValueId: Q$1(u), registerListboxId: Q$1(f) };
  return createComponent$1(dr.Provider, { value: oe, get children() {
    return createComponent$1(vr.Provider, { value: yn, get children() {
      return createComponent$1(Ot$1, mergeProps({ anchorRef: g, contentRef: m }, r, { get children() {
        return createComponent$1(j, mergeProps({ as: "div", role: "group", get id() {
          return b(i.id);
        } }, () => oe.dataset(), ze, s));
      } }));
    } });
  } });
}
function Tr(e) {
  const [t, n] = splitProps(e, ["value", "defaultValue", "onChange", "multiple"]), o = createMemo(() => t.value != null ? t.multiple ? t.value : [t.value] : t.value), r = createMemo(() => t.defaultValue != null ? t.multiple ? t.defaultValue : [t.defaultValue] : t.defaultValue);
  return createComponent$1(Gl, mergeProps({ get value() {
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
function Or(e) {
  const t = Fe(), n = we(), o = _$1({ id: n.generateId("trigger") }, e), [r, i, s] = splitProps(o, ["ref", "disabled", "onPointerDown", "onClick", "onKeyDown", "onFocus", "onBlur"], Ul), l = () => n.listState().selectionManager(), c = () => n.keyboardDelegate(), a = () => r.disabled || n.isDisabled(), { fieldProps: u } = zl(i), { typeSelectHandlers: d } = jo({ keyboardDelegate: c, selectionManager: l, onTypeSelect: (p) => l().select(p) }), f = () => [n.listboxAriaLabelledBy(), n.valueId()].filter(Boolean).join(" ") || void 0, g = (p) => {
    H$1(p, r.onPointerDown), p.currentTarget.dataset.pointerType = p.pointerType, !a() && p.pointerType !== "touch" && p.button === 0 && (p.preventDefault(), n.toggle(true));
  }, h = (p) => {
    H$1(p, r.onClick), !a() && p.currentTarget.dataset.pointerType === "touch" && n.toggle(true);
  }, m = (p) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h;
    if (H$1(p, r.onKeyDown), !a()) switch (H$1(p, d.onKeyDown), p.key) {
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
    H$1(p, r.onFocus), !l().isFocused() && l().setFocused(true);
  }, v = (p) => {
    H$1(p, r.onBlur), !n.isOpen() && l().setFocused(false);
  };
  return createEffect(() => onCleanup(n.registerTriggerId(u.id()))), createEffect(() => {
    n.setListboxAriaLabelledBy([u.ariaLabelledBy(), u.ariaLabel() && !u.ariaLabelledBy() ? u.id() : null].filter(Boolean).join(" ") || void 0);
  }), createComponent$1(rt, mergeProps({ get id() {
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
function Pr(e) {
  const t = Fe(), n = we(), o = _$1({ id: n.generateId("value") }, e), [r, i] = splitProps(o, ["id", "children"]), s = () => n.listState().selectionManager(), l = () => {
    const c = s().selectedKeys();
    return c.size === 1 && c.has("") ? true : s().isEmpty();
  };
  return createEffect(() => onCleanup(n.registerValueId(r.id))), createComponent$1(j, mergeProps({ as: "span", get id() {
    return r.id;
  }, get "data-placeholder-shown"() {
    return l() ? "" : void 0;
  } }, () => t.dataset(), i, { get children() {
    return createComponent$1(Show, { get when() {
      return !l();
    }, get fallback() {
      return n.placeholder();
    }, get children() {
      return createComponent$1(Zl, { state: { selectedOption: () => n.selectedOptions()[0], selectedOptions: () => n.selectedOptions(), remove: (c) => n.removeOptionFromSelection(c), clear: () => s().clearSelection() }, get children() {
        return r.children;
      } });
    } });
  } }));
}
function Zl(e) {
  return children(() => {
    const n = e.children;
    return Qt$1(n) ? n(e.state) : n;
  })();
}
var lt$1 = Object.assign(Tr, { Arrow: st, Content: br, Description: fr, ErrorMessage: yr, HiddenSelect: wr, Icon: Sr, Item: Ct$1, ItemDescription: Lt$1, ItemIndicator: At$1, ItemLabel: It$1, Label: xr, Listbox: Er, Portal: Dr, Section: Kt$1, Trigger: Or, Value: Pr });
lt$1.Value;
lt$1.Item;
lt$1.ItemLabel;
lt$1.ItemIndicator;
const Cr = createContext$1(), cc = (e) => {
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
  }), createComponent$1(Cr.Provider, { value: { theme: t, setTheme: n, resolvedTheme: o }, get children() {
    return e.children;
  } });
};
function ac() {
  const e = useContext(Cr);
  if (!e) throw new Error("useTheme must be used within ThemeProvider");
  return e;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
function at(e = {}) {
  let t, n = false;
  const s = (a) => {
    if (t && t !== a) throw new Error("Context conflict");
  };
  let r;
  if (e.asyncContext) {
    const a = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    a ? r = new a() : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const o = () => {
    if (r) {
      const a = r.getStore();
      if (a !== void 0) return a;
    }
    return t;
  };
  return { use: () => {
    const a = o();
    if (a === void 0) throw new Error("Context is not available");
    return a;
  }, tryUse: () => o(), set: (a, i) => {
    i || s(a), t = a, n = true;
  }, unset: () => {
    t = void 0, n = false;
  }, call: (a, i) => {
    s(a), t = a;
    try {
      return r ? r.run(a, i) : i();
    } finally {
      n || (t = void 0);
    }
  }, async callAsync(a, i) {
    t = a;
    const l = () => {
      t = a;
    }, c = () => t === a ? l : void 0;
    K.add(c);
    try {
      const h = r ? r.run(a, i) : i();
      return n || (t = void 0), await h;
    } finally {
      K.delete(c);
    }
  } };
}
function it(e = {}) {
  const t = {};
  return { get(n, s = {}) {
    return t[n] || (t[n] = at({ ...e, ...s })), t[n];
  } };
}
const N = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, G = "__unctx__", ct = N[G] || (N[G] = it()), lt = (e, t = {}) => ct.get(e, t), B = "__unctx_async_handlers__", K = N[B] || (N[B] = /* @__PURE__ */ new Set());
function ut(e) {
  let t;
  const n = oe(e), s = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(n, { ...s, body: e.node.req.body }) : new Request(n, { ...s, get body() {
    return t || (t = vt(e), t);
  } });
}
function dt(e) {
  var _a;
  return (_a = e.web) != null ? _a : e.web = { request: ut(e), url: oe(e) }, e.web.request;
}
function pt() {
  return At();
}
const se = /* @__PURE__ */ Symbol("$HTTPEvent");
function ht(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[se]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function y(e) {
  return function(...t) {
    var _a;
    let n = t[0];
    if (ht(n)) t[0] = n instanceof H3Event || n.__is_event__ ? n : n[se];
    else {
      if (!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (n = pt(), !n) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(n);
    }
    return e(...t);
  };
}
const oe = y(getRequestURL), ft = y(getRequestIP), q = y(setResponseStatus), z = y(getResponseStatus), mt = y(getResponseStatusText), H = y(getResponseHeaders), J = y(getResponseHeader), gt = y(setResponseHeader), yt = y(appendResponseHeader), V = y(sendRedirect), wt = y(getCookie), bt = y(setCookie), Rt = y(setHeader), vt = y(getRequestWebStream), Et = y(removeResponseHeader), St = y(dt);
function $t() {
  var _a;
  return lt("nitro-app", { asyncContext: !!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function At() {
  return $t().use().event;
}
const A = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function Ct(e = {}) {
  const t = { options: e, rootNode: ae(), staticRoutesMap: {} }, n = (s) => e.strictTrailingSlash ? s : s.replace(/\/$/, "") || "/";
  if (e.routes) for (const s in e.routes) Y(t, n(s), e.routes[s]);
  return { ctx: t, lookup: (s) => Tt(t, n(s)), insert: (s, r) => Y(t, n(s), r), remove: (s) => xt(t, n(s)) };
}
function Tt(e, t) {
  const n = e.staticRoutesMap[t];
  if (n) return n.data;
  const s = t.split("/"), r = {};
  let o = false, a = null, i = e.rootNode, l = null;
  for (let c = 0; c < s.length; c++) {
    const h = s[c];
    i.wildcardChildNode !== null && (a = i.wildcardChildNode, l = s.slice(c).join("/"));
    const R = i.children.get(h);
    if (R === void 0) {
      if (i && i.placeholderChildren.length > 1) {
        const v = s.length - c;
        i = i.placeholderChildren.find((m) => m.maxDepth === v) || null;
      } else i = i.placeholderChildren[0] || null;
      if (!i) break;
      i.paramName && (r[i.paramName] = h), o = true;
    } else i = R;
  }
  return (i === null || i.data === null) && a !== null && (i = a, r[i.paramName || "_"] = l, o = true), i ? o ? { ...i.data, params: o ? r : void 0 } : i.data : null;
}
function Y(e, t, n) {
  let s = true;
  const r = t.split("/");
  let o = e.rootNode, a = 0;
  const i = [o];
  for (const l of r) {
    let c;
    if (c = o.children.get(l)) o = c;
    else {
      const h = kt(l);
      c = ae({ type: h, parent: o }), o.children.set(l, c), h === A.PLACEHOLDER ? (c.paramName = l === "*" ? `_${a++}` : l.slice(1), o.placeholderChildren.push(c), s = false) : h === A.WILDCARD && (o.wildcardChildNode = c, c.paramName = l.slice(3) || "_", s = false), i.push(c), o = c;
    }
  }
  for (const [l, c] of i.entries()) c.maxDepth = Math.max(i.length - l, c.maxDepth || 0);
  return o.data = n, s === true && (e.staticRoutesMap[t] = o), o;
}
function xt(e, t) {
  let n = false;
  const s = t.split("/");
  let r = e.rootNode;
  for (const o of s) if (r = r.children.get(o), !r) return n;
  if (r.data) {
    const o = s.at(-1) || "";
    r.data = null, Object.keys(r.children).length === 0 && r.parent && (r.parent.children.delete(o), r.parent.wildcardChildNode = null, r.parent.placeholderChildren = []), n = true;
  }
  return n;
}
function ae(e = {}) {
  return { type: e.type || A.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function kt(e) {
  return e.startsWith("**") ? A.WILDCARD : e[0] === ":" || e === "*" ? A.PLACEHOLDER : A.NORMAL;
}
const ie = [{ page: true, $component: { src: "src/routes/agents/index.tsx?pick=default&pick=$css", build: () => import('../build/index5.mjs'), import: () => import('../build/index5.mjs') }, path: "/agents/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/agents/index.tsx" }, { page: false, $GET: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_3.mjs'), import: () => import('../build/_...path_3.mjs') }, $HEAD: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_3.mjs'), import: () => import('../build/_...path_3.mjs') }, $POST: { src: "src/routes/api/[...path].ts?pick=POST", build: () => import('../build/_...path_22.mjs'), import: () => import('../build/_...path_22.mjs') }, path: "/api/*path", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/api/[...path].ts" }, { page: false, $GET: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health2.mjs'), import: () => import('../build/health2.mjs') }, $HEAD: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health2.mjs'), import: () => import('../build/health2.mjs') }, path: "/api/health", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/api/health.ts" }, { page: true, $component: { src: "src/routes/index.tsx?pick=default&pick=$css", build: () => import('../build/index22.mjs'), import: () => import('../build/index22.mjs') }, path: "/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/index.tsx" }, { page: true, $component: { src: "src/routes/models/index.tsx?pick=default&pick=$css", build: () => import('../build/index32.mjs'), import: () => import('../build/index32.mjs') }, path: "/models/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/models/index.tsx" }, { page: true, $component: { src: "src/routes/settings/index.tsx?pick=default&pick=$css", build: () => import('../build/index42.mjs'), import: () => import('../build/index42.mjs') }, path: "/settings/", filePath: "/Users/jangyoung/Documents/Github/supercoin/packages/console/app/src/routes/settings/index.tsx" }], Lt = Pt(ie.filter((e) => e.page));
function Pt(e) {
  function t(n, s, r, o) {
    const a = Object.values(n).find((i) => r.startsWith(i.id + "/"));
    return a ? (t(a.children || (a.children = []), s, r.slice(a.id.length)), n) : (n.push({ ...s, id: r, path: r.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), n);
  }
  return e.sort((n, s) => n.path.length - s.path.length).reduce((n, s) => t(n, s, s.path, s.path), []);
}
function Ht(e, t) {
  const n = _t.lookup(e);
  if (n && n.route) {
    const s = n.route, r = t === "HEAD" ? s.$HEAD || s.$GET : s[`$${t}`];
    if (r === void 0) return;
    const o = s.page === true && s.$component !== void 0;
    return { handler: r, params: n.params, isPage: o };
  }
}
function Nt(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
const _t = Ct({ routes: ie.reduce((e, t) => {
  if (!Nt(t)) return e;
  let n = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (s, r) => `**:${r}`).split("/").map((s) => s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s)).join("/");
  if (/:[^/]*\?/g.test(n)) throw new Error(`Optional parameters are not supported in API routes: ${n}`);
  if (e[n]) throw new Error(`Duplicate API routes for "${n}" found at "${e[n].route.path}" and "${t.path}"`);
  return e[n] = { route: t }, e;
}, {}) }), _ = "solidFetchEvent";
function Ot(e) {
  return { request: St(e), response: It(e), clientAddress: ft(e), locals: {}, nativeEvent: e };
}
function qt(e) {
  if (!e.context[_]) {
    const t = Ot(e);
    e.context[_] = t;
  }
  return e.context[_];
}
class Dt {
  constructor(t) {
    __publicField(this, "event");
    this.event = t;
  }
  get(t) {
    const n = J(this.event, t);
    return Array.isArray(n) ? n.join(", ") : n || null;
  }
  has(t) {
    return this.get(t) !== null;
  }
  set(t, n) {
    return gt(this.event, t, n);
  }
  delete(t) {
    return Et(this.event, t);
  }
  append(t, n) {
    yt(this.event, t, n);
  }
  getSetCookie() {
    const t = J(this.event, "Set-Cookie");
    return Array.isArray(t) ? t : [t];
  }
  forEach(t) {
    return Object.entries(H(this.event)).forEach(([n, s]) => t(Array.isArray(s) ? s.join(", ") : s, n, this));
  }
  entries() {
    return Object.entries(H(this.event)).map(([t, n]) => [t, Array.isArray(n) ? n.join(", ") : n])[Symbol.iterator]();
  }
  keys() {
    return Object.keys(H(this.event))[Symbol.iterator]();
  }
  values() {
    return Object.values(H(this.event)).map((t) => Array.isArray(t) ? t.join(", ") : t)[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
}
function It(e) {
  return { get status() {
    return z(e);
  }, set status(t) {
    q(e, t);
  }, get statusText() {
    return mt(e);
  }, set statusText(t) {
    q(e, z(e), t);
  }, headers: new Dt(e) };
}
var Mt = " ";
const jt = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(Mt), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function D(e, t) {
  let { tag: n, attrs: { key: s, ...r } = { key: void 0 }, children: o } = e;
  return jt[n]({ attrs: { ...r, nonce: t }, key: s, children: o });
}
function Ft(e, t, n, s = "default") {
  return lazy(async () => {
    var _a;
    {
      const o = (await e.import())[s], i = (await ((_a = t.inputs) == null ? void 0 : _a[e.src].assets())).filter((c) => c.tag === "style" || c.attrs.rel === "stylesheet");
      return { default: (c) => [...i.map((h) => D(h)), createComponent(o, c)] };
    }
  });
}
function ce() {
  function e(n) {
    return { ...n, ...n.$$route ? n.$$route.require().route : void 0, info: { ...n.$$route ? n.$$route.require().route.info : {}, filesystem: true }, component: n.$component && Ft(n.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: n.children ? n.children.map(e) : void 0 };
  }
  return Lt.map(e);
}
let Q;
const Wt = isServer ? () => getRequestEvent().routes : () => Q || (Q = ce());
function Gt(e) {
  const t = wt(e.nativeEvent, "flash");
  if (t) try {
    let n = JSON.parse(t);
    if (!n || !n.result) return;
    const s = [...n.input.slice(0, -1), new Map(n.input[n.input.length - 1])], r = n.error ? new Error(n.result) : n.result;
    return { input: s, url: n.url, pending: false, result: n.thrown ? void 0 : r, error: n.thrown ? r : void 0 };
  } catch (n) {
    console.error(n);
  } finally {
    bt(e.nativeEvent, "flash", "", { maxAge: 0 });
  }
}
async function Bt(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, e.response.headers.set("Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], router: { submission: Gt(e) }, routes: ce(), complete: false, $islands: /* @__PURE__ */ new Set() });
}
const Kt = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function I(e) {
  return e.status && Kt.has(e.status) ? e.status : 302;
}
function zt(e, t, n = {}, s) {
  return eventHandler({ handler: (r) => {
    const o = qt(r);
    return provideRequestEvent(o, async () => {
      const a = Ht(new URL(o.request.url).pathname, o.request.method);
      if (a) {
        const m = await a.handler.import(), w = o.request.method === "HEAD" ? m.HEAD || m.GET : m[o.request.method];
        o.params = a.params || {}, sharedConfig.context = { event: o };
        const u = await w(o);
        if (u !== void 0) return u;
        if (o.request.method !== "GET") throw new Error(`API handler for ${o.request.method} "${o.request.url}" did not return a response.`);
        if (!a.isPage) return;
      }
      const i = await t(o), l = typeof n == "function" ? await n(i) : { ...n }, c = l.mode || "stream";
      if (l.nonce && (i.nonce = l.nonce), c === "sync") {
        const m = renderToString(() => (sharedConfig.context.event = i, e(i)), l);
        if (i.complete = true, i.response && i.response.headers.get("Location")) {
          const w = I(i.response);
          return V(r, i.response.headers.get("Location"), w);
        }
        return m;
      }
      if (l.onCompleteAll) {
        const m = l.onCompleteAll;
        l.onCompleteAll = (w) => {
          Z(i)(w), m(w);
        };
      } else l.onCompleteAll = Z(i);
      if (l.onCompleteShell) {
        const m = l.onCompleteShell;
        l.onCompleteShell = (w) => {
          X(i, r)(), m(w);
        };
      } else l.onCompleteShell = X(i, r);
      const h = renderToStream(() => (sharedConfig.context.event = i, e(i)), l);
      if (i.response && i.response.headers.get("Location")) {
        const m = I(i.response);
        return V(r, i.response.headers.get("Location"), m);
      }
      if (c === "async") return h;
      const { writable: R, readable: v } = new TransformStream();
      return h.pipeTo(R), v;
    });
  } });
}
function X(e, t) {
  return () => {
    if (e.response && e.response.headers.get("Location")) {
      const n = I(e.response);
      q(t, n), Rt(t, "Location", e.response.headers.get("Location"));
    }
  };
}
function Z(e) {
  return ({ write: t }) => {
    e.complete = true;
    const n = e.response && e.response.headers.get("Location");
    n && t(`<script>window.location="${n}"<\/script>`);
  };
}
function Jt(e, t, n) {
  return zt(e, Bt, t);
}
const le = (e) => (t) => {
  const { base: n } = t, s = children(() => t.children), r = createMemo(() => ni(s(), t.base || ""));
  let o;
  const a = sc(e, r, () => o, { base: n, singleFlight: t.singleFlight, transformUrl: t.transformUrl });
  return e.create && e.create(a), createComponent$1(Jr.Provider, { value: a, get children() {
    return createComponent$1(Vt, { routerState: a, get root() {
      return t.root;
    }, get preload() {
      return t.rootPreload || t.rootLoad;
    }, get children() {
      return [(o = getOwner()) && null, createComponent$1(Yt, { routerState: a, get branches() {
        return r();
      } })];
    } });
  } });
};
function Vt(e) {
  const t = e.routerState.location, n = e.routerState.params, s = createMemo(() => e.preload && untrack(() => {
    e.preload({ params: n, location: t, intent: ic() || "initial" });
  }));
  return createComponent$1(Show, { get when() {
    return e.root;
  }, keyed: true, get fallback() {
    return e.children;
  }, children: (r) => createComponent$1(r, { params: n, location: t, get data() {
    return s();
  }, get children() {
    return e.children;
  } }) });
}
function Yt(e) {
  if (isServer) {
    const r = getRequestEvent();
    if (r && r.router && r.router.dataOnly) {
      Qt(r, e.routerState, e.branches);
      return;
    }
    r && ((r.router || (r.router = {})).matches || (r.router.matches = e.routerState.matches().map(({ route: o, path: a, params: i }) => ({ path: o.originalPath, pattern: o.pattern, match: a, params: i, info: o.info }))));
  }
  const t = [];
  let n;
  const s = createMemo(on$3(e.routerState.matches, (r, o, a) => {
    let i = o && r.length === o.length;
    const l = [];
    for (let c = 0, h = r.length; c < h; c++) {
      const R = o && o[c], v = r[c];
      a && R && v.route.key === R.route.key ? l[c] = a[c] : (i = false, t[c] && t[c](), createRoot((m) => {
        t[c] = m, l[c] = lc(e.routerState, l[c - 1] || e.routerState.base, ee(() => s()[c + 1]), () => {
          var _a;
          const w = e.routerState.matches();
          return (_a = w[c]) != null ? _a : w[0];
        });
      }));
    }
    return t.splice(r.length).forEach((c) => c()), a && i ? a : (n = l[0], l);
  }));
  return ee(() => s() && n)();
}
const ee = (e) => () => createComponent$1(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent$1(fo.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function Qt(e, t, n) {
  const s = new URL(e.request.url), r = Rt$1(n, new URL(e.router.previousUrl || e.request.url).pathname), o = Rt$1(n, s.pathname);
  for (let a = 0; a < o.length; a++) {
    (!r[a] || o[a].route !== r[a].route) && (e.router.dataOnly = true);
    const { route: i, params: l } = o[a];
    i.preload && i.preload({ params: l, location: t.location, intent: "preload" });
  }
}
function Xt([e, t], n, s) {
  return [e, s ? (r) => t(s(r)) : t];
}
function Zt(e) {
  let t = false;
  const n = (r) => typeof r == "string" ? { value: r } : r, s = Xt(createSignal(n(e.get()), { equals: (r, o) => r.value === o.value && r.state === o.state }), void 0, (r) => (!t && e.set(r), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), r));
  return e.init && onCleanup(e.init((r = e.get()) => {
    t = true, s[1](n(r)), t = false;
  })), le({ signal: s, create: e.create, utils: e.utils });
}
function en(e, t, n) {
  return e.addEventListener(t, n), () => e.removeEventListener(t, n);
}
function tn(e, t) {
  const n = e && document.getElementById(e);
  n ? n.scrollIntoView() : t && window.scrollTo(0, 0);
}
function nn(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function rn(e) {
  let t;
  const n = { value: e.url || (t = getRequestEvent()) && nn(t.request.url) || "" };
  return le({ signal: [() => n, (s) => Object.assign(n, s)] })(e);
}
const sn = /* @__PURE__ */ new Map();
function on(e = true, t = false, n = "/_server", s) {
  return (r) => {
    const o = r.base.path(), a = r.navigatorFactory(r.base);
    let i, l;
    function c(u) {
      return u.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function h(u) {
      if (u.defaultPrevented || u.button !== 0 || u.metaKey || u.altKey || u.ctrlKey || u.shiftKey) return;
      const d = u.composedPath().find((F) => F instanceof Node && F.nodeName.toUpperCase() === "A");
      if (!d || t && !d.hasAttribute("link")) return;
      const g = c(d), f = g ? d.href.baseVal : d.href;
      if ((g ? d.target.baseVal : d.target) || !f && !d.hasAttribute("state")) return;
      const C = (d.getAttribute("rel") || "").split(/\s+/);
      if (d.hasAttribute("download") || C && C.includes("external")) return;
      const k = g ? new URL(f, document.baseURI) : new URL(f);
      if (!(k.origin !== window.location.origin || o && k.pathname && !k.pathname.toLowerCase().startsWith(o.toLowerCase()))) return [d, k];
    }
    function R(u) {
      const d = h(u);
      if (!d) return;
      const [g, f] = d, j = r.parsePath(f.pathname + f.search + f.hash), C = g.getAttribute("state");
      u.preventDefault(), a(j, { resolve: false, replace: g.hasAttribute("replace"), scroll: !g.hasAttribute("noscroll"), state: C ? JSON.parse(C) : void 0 });
    }
    function v(u) {
      const d = h(u);
      if (!d) return;
      const [g, f] = d;
      s && (f.pathname = s(f.pathname)), r.preloadRoute(f, g.getAttribute("preload") !== "false");
    }
    function m(u) {
      clearTimeout(i);
      const d = h(u);
      if (!d) return l = null;
      const [g, f] = d;
      l !== g && (s && (f.pathname = s(f.pathname)), i = setTimeout(() => {
        r.preloadRoute(f, g.getAttribute("preload") !== "false"), l = g;
      }, 20));
    }
    function w(u) {
      if (u.defaultPrevented) return;
      let d = u.submitter && u.submitter.hasAttribute("formaction") ? u.submitter.getAttribute("formaction") : u.target.getAttribute("action");
      if (!d) return;
      if (!d.startsWith("https://action/")) {
        const f = new URL(d, jr);
        if (d = r.parsePath(f.pathname + f.search), !d.startsWith(n)) return;
      }
      if (u.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const g = sn.get(d);
      if (g) {
        u.preventDefault();
        const f = new FormData(u.target, u.submitter);
        g.call({ r, f: u.target }, u.target.enctype === "multipart/form-data" ? f : new URLSearchParams(f));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", R), e && (document.addEventListener("mousemove", m, { passive: true }), document.addEventListener("focusin", v, { passive: true }), document.addEventListener("touchstart", v, { passive: true })), document.addEventListener("submit", w), onCleanup(() => {
      document.removeEventListener("click", R), e && (document.removeEventListener("mousemove", m), document.removeEventListener("focusin", v), document.removeEventListener("touchstart", v)), document.removeEventListener("submit", w);
    });
  };
}
function an(e) {
  if (isServer) return rn(e);
  const t = () => {
    const s = window.location.pathname.replace(/^\/+/, "/") + window.location.search, r = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: s + window.location.hash, state: r };
  }, n = Ur();
  return Zt({ get: t, set({ value: s, replace: r, scroll: o, state: a }) {
    r ? window.history.replaceState(ec(a), "", s) : window.history.pushState(a, "", s), tn(decodeURIComponent(window.location.hash.slice(1)), o), lo();
  }, init: (s) => en(window, "popstate", tc(s, (r) => {
    if (r) return !n.confirm(r);
    {
      const o = t();
      return !n.confirm(o.value, { state: o.state });
    }
  })), create: on(e.preload, e.explicitLinks, e.actionBase, e.transformUrl), utils: { go: (s) => window.history.go(s), beforeLeave: n } })(e);
}
var cn = ["<div", ' class="flex items-center justify-center h-screen">Loading...</div>'];
function ln() {
  return createComponent$1(cc, { defaultTheme: "system", get children() {
    return createComponent$1(an, { root: (e) => createComponent$1(Suspense, { get fallback() {
      return ssr(cn, ssrHydrationKey());
    }, get children() {
      return e.children;
    } }), get children() {
      return createComponent$1(Wt, {});
    } });
  } });
}
const ue = isServer ? (e) => {
  const t = getRequestEvent();
  return t.response.status = e.code, t.response.statusText = e.text, onCleanup(() => !t.nativeEvent.handled && !t.complete && (t.response.status = 200)), null;
} : (e) => null;
var un = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">', "</span>"], dn = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">500 | Internal Server Error</span>'];
const pn = (e) => {
  const t = isServer ? "500 | Internal Server Error" : "Error | Uncaught Client Exception";
  return createComponent$1(ErrorBoundary, { fallback: (n) => (console.error(n), [ssr(un, ssrHydrationKey(), escape(t)), createComponent$1(ue, { code: 500 })]), get children() {
    return e.children;
  } });
}, hn = (e) => {
  let t = false;
  const n = catchError(() => e.children, (s) => {
    console.error(s), t = !!s;
  });
  return t ? [ssr(dn, ssrHydrationKey()), createComponent$1(ue, { code: 500 })] : n;
};
var te = ["<script", ">", "<\/script>"], fn = ["<script", ' type="module"', " async", "><\/script>"], mn = ["<script", ' type="module" async', "><\/script>"];
const gn = ssr("<!DOCTYPE html>");
function de(e, t, n = []) {
  for (let s = 0; s < t.length; s++) {
    const r = t[s];
    if (r.path !== e[0].path) continue;
    let o = [...n, r];
    if (r.children) {
      const a = e.slice(1);
      if (a.length === 0 || (o = de(a, r.children, o), !o)) continue;
    }
    return o;
  }
}
function yn(e) {
  const t = getRequestEvent(), n = t.nonce;
  let s = [];
  return Promise.resolve().then(async () => {
    let r = [];
    if (t.router && t.router.matches) {
      const o = [...t.router.matches];
      for (; o.length && (!o[0].info || !o[0].info.filesystem); ) o.shift();
      const a = o.length && de(o, t.routes);
      if (a) {
        const i = globalThis.MANIFEST.client.inputs;
        for (let l = 0; l < a.length; l++) {
          const c = a[l], h = i[c.$component.src];
          r.push(h.assets());
        }
      }
    }
    s = await Promise.all(r).then((o) => [...new Map(o.flat().map((a) => [a.attrs.key, a])).values()].filter((a) => a.attrs.rel === "modulepreload" && !t.assets.find((i) => i.attrs.key === a.attrs.key)));
  }), useAssets(() => s.length ? s.map((r) => D(r)) : void 0), createComponent$1(NoHydration, { get children() {
    return [gn, createComponent$1(hn, { get children() {
      return createComponent$1(e.document, { get assets() {
        return [createComponent$1(HydrationScript, {}), t.assets.map((r) => D(r, n))];
      }, get scripts() {
        return n ? [ssr(te, ssrHydrationKey() + ssrAttribute("nonce", escape(n, true), false), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(fn, ssrHydrationKey(), ssrAttribute("nonce", escape(n, true), false), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))] : [ssr(te, ssrHydrationKey(), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(mn, ssrHydrationKey(), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))];
      }, get children() {
        return createComponent$1(Hydration, { get children() {
          return createComponent$1(pn, { get children() {
            return createComponent$1(ln, {});
          } });
        } });
      } });
    } })];
  } });
}
var wn = ['<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.ico"><title>SuperCoin Console</title>', "</head>"], bn = ["<html", ' lang="en">', '<body><div id="app">', "</div><!--$-->", "<!--/--></body></html>"];
const Cn = Jt(() => createComponent$1(yn, { document: ({ assets: e, children: t, scripts: n }) => ssr(bn, ssrHydrationKey(), createComponent$1(NoHydration, { get children() {
  return ssr(wn, escape(e));
} }), escape(t), escape(n)) }));

const handlers = [
  { route: '', handler: _63yo9f, lazy: false, middleware: true, method: undefined },
  { route: '/_server', handler: Fo$1, lazy: false, middleware: true, method: undefined },
  { route: '/', handler: Cn, lazy: false, middleware: true, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b$2(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C$1(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  {
    const _handler = h3App.handler;
    h3App.handler = (event) => {
      const ctx = { event };
      return nitroAsyncContext.callAsync(ctx, () => _handler(event));
    };
  }
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { Bi as B, Uo as U, Ze as Z, ac as a, nodeServer as b, nc as n, oc as o, rc as r };
//# sourceMappingURL=nitro.mjs.map

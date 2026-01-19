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
import { sharedConfig, lazy, createComponent, useContext, createContext as createContext$1, splitProps, createMemo, createUniqueId, createSignal, createEffect, onCleanup, Show, mergeProps as mergeProps$1, untrack, onMount, on as on$2, children, Switch, Match, For, createComputed, $TRACK, createRoot, createRenderEffect, getOwner, DEV, runWithOwner, startTransition, resetErrorBoundaries, batch, catchError, ErrorBoundary, Suspense } from 'solid-js';
import { renderToString, getRequestEvent, isServer, ssrElement, escape, mergeProps, ssr, createComponent as createComponent$1, ssrHydrationKey, Portal, ssrAttribute, Dynamic, ssrStyle, ssrStyleProperty, renderToStream, NoHydration, useAssets, Hydration, HydrationScript, delegateEvents } from 'solid-js/web';
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

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m$1(e._destroy,t._destroy);}};function _$1(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$1.prototype),c}function m$1(...n){return function(...e){for(const t of n)t(...e);}}const g$1=_$1();let A$1 = class A extends g$1{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}};let y$1 = class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A$1;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}};function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}let w$1 = class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}};const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R$1(n={}){const e=new E,t=Array.isArray(n)||H$3(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H$3(n){return typeof n?.entries=="function"}function v$1(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S$1=new Set([101,204,205,304]);async function b$2(n,e){const t=new y$1,r=new w$1(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R$1(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S$1.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C$1(n,e,t={}){try{const r=await b$2(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v$1(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

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
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$2;
const AbortController = globalThis.AbortController || i;
createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController });

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

const appConfig = {"name":"vinxi","routers":[{"name":"public","type":"static","base":"/","dir":"./public","root":"/Users/supercent/Documents/Github/supercode/packages/console/app","order":0,"outDir":"/Users/supercent/Documents/Github/supercode/packages/console/app/.vinxi/build/public"},{"name":"ssr","type":"http","link":{"client":"client"},"handler":"src/entry-server.tsx","extensions":["js","jsx","ts","tsx"],"target":"server","root":"/Users/supercent/Documents/Github/supercode/packages/console/app","base":"/","outDir":"/Users/supercent/Documents/Github/supercode/packages/console/app/.vinxi/build/ssr","order":1},{"name":"client","type":"client","base":"/_build","handler":"src/entry-client.tsx","extensions":["js","jsx","ts","tsx"],"target":"browser","root":"/Users/supercent/Documents/Github/supercode/packages/console/app","outDir":"/Users/supercent/Documents/Github/supercode/packages/console/app/.vinxi/build/client","order":2},{"name":"server-fns","type":"http","base":"/_server","handler":"../../../node_modules/.bun/@solidjs+start@1.2.1+7986c96d248b56c6/node_modules/@solidjs/start/dist/runtime/server-handler.js","target":"server","root":"/Users/supercent/Documents/Github/supercode/packages/console/app","outDir":"/Users/supercent/Documents/Github/supercode/packages/console/app/.vinxi/build/server-fns","order":3}],"server":{"compressPublicAssets":{"brotli":true},"routeRules":{"/_build/assets/**":{"headers":{"cache-control":"public, immutable, max-age=31536000"}}},"experimental":{"asyncContext":true}},"root":"/Users/supercent/Documents/Github/supercode/packages/console/app"};
					const buildManifest = {"ssr":{"_auth-BE69DjQS.js":{"file":"assets/auth-BE69DjQS.js","name":"auth"},"_button-BLdmMly2.js":{"file":"assets/button-BLdmMly2.js","name":"button","imports":["_auth-BE69DjQS.js"]},"_card-DLX-hcJH.js":{"file":"assets/card-DLX-hcJH.js","name":"card","imports":["_auth-BE69DjQS.js"]},"_index-lOdYvL_-.js":{"file":"assets/index-lOdYvL_-.js","name":"index"},"_protected-route-XSdRWtP8.js":{"file":"assets/protected-route-XSdRWtP8.js","name":"protected-route","imports":["_auth-BE69DjQS.js"]},"_sidebar-BRvunEeq.js":{"file":"assets/sidebar-BRvunEeq.js","name":"sidebar","imports":["_button-BLdmMly2.js","_auth-BE69DjQS.js"]},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"index.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BLdmMly2.js","_card-DLX-hcJH.js","_auth-BE69DjQS.js","_sidebar-BRvunEeq.js"]},"src/routes/api/[...path].ts?pick=GET":{"file":"_...path_.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/api/[...path].ts?pick=POST":{"file":"_...path_2.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/api/health.ts?pick=GET":{"file":"health.js","name":"health","src":"src/routes/api/health.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/auth/authorize.ts?pick=GET":{"file":"authorize.js","name":"authorize","src":"src/routes/auth/authorize.ts?pick=GET","isEntry":true,"isDynamicEntry":true,"imports":["_index-lOdYvL_-.js"]},"src/routes/auth/callback.ts?pick=GET":{"file":"callback.js","name":"callback","src":"src/routes/auth/callback.ts?pick=GET","isEntry":true,"isDynamicEntry":true,"imports":["_index-lOdYvL_-.js"]},"src/routes/auth/login.tsx?pick=default&pick=$css":{"file":"login.js","name":"login","src":"src/routes/auth/login.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BLdmMly2.js","_card-DLX-hcJH.js","_auth-BE69DjQS.js"]},"src/routes/auth/logout.ts?pick=POST":{"file":"logout.js","name":"logout","src":"src/routes/auth/logout.ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/auth/refresh.ts?pick=POST":{"file":"refresh.js","name":"refresh","src":"src/routes/auth/refresh.ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/auth/status.ts?pick=GET":{"file":"status.js","name":"status","src":"src/routes/auth/status.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/index.tsx?pick=default&pick=$css":{"file":"index2.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_card-DLX-hcJH.js","_auth-BE69DjQS.js","_sidebar-BRvunEeq.js","_protected-route-XSdRWtP8.js","_button-BLdmMly2.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"index3.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BLdmMly2.js","_card-DLX-hcJH.js","_auth-BE69DjQS.js","_sidebar-BRvunEeq.js"]},"src/routes/session/[id].tsx?pick=default&pick=$css":{"file":"_id_.js","name":"_id_","src":"src/routes/session/[id].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-BRvunEeq.js","_protected-route-XSdRWtP8.js","_auth-BE69DjQS.js","_button-BLdmMly2.js"]},"src/routes/settings/api-keys.tsx?pick=default&pick=$css":{"file":"api-keys.js","name":"api-keys","src":"src/routes/settings/api-keys.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BLdmMly2.js","_card-DLX-hcJH.js","_auth-BE69DjQS.js","_sidebar-BRvunEeq.js","_protected-route-XSdRWtP8.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"index4.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BLdmMly2.js","_card-DLX-hcJH.js","_auth-BE69DjQS.js","_sidebar-BRvunEeq.js","_protected-route-XSdRWtP8.js"]},"virtual:$vinxi/handler/ssr":{"file":"ssr.js","name":"ssr","src":"virtual:$vinxi/handler/ssr","isEntry":true,"imports":["_auth-BE69DjQS.js"],"dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=POST","src/routes/api/[...path].ts?pick=POST","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/login.tsx?pick=default&pick=$css","src/routes/auth/login.tsx?pick=default&pick=$css","src/routes/auth/logout.ts?pick=POST","src/routes/auth/logout.ts?pick=POST","src/routes/auth/refresh.ts?pick=POST","src/routes/auth/refresh.ts?pick=POST","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/session/[id].tsx?pick=default&pick=$css","src/routes/session/[id].tsx?pick=default&pick=$css","src/routes/settings/api-keys.tsx?pick=default&pick=$css","src/routes/settings/api-keys.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css"],"css":["assets/ssr-D7ASRKPU.css"]}},"client":{"_auth-zU87a3Vs.js":{"file":"assets/auth-zU87a3Vs.js","name":"auth"},"_button-SgHIeQ9K.js":{"file":"assets/button-SgHIeQ9K.js","name":"button","imports":["_auth-zU87a3Vs.js"]},"_card-B4eGZ63D.js":{"file":"assets/card-B4eGZ63D.js","name":"card","imports":["_auth-zU87a3Vs.js"]},"_protected-route-C_ork0Su.js":{"file":"assets/protected-route-C_ork0Su.js","name":"protected-route","imports":["_auth-zU87a3Vs.js"]},"_sidebar-mZhYzTEx.js":{"file":"assets/sidebar-mZhYzTEx.js","name":"sidebar","imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_theme-DiLkS4Xi.js"]},"_theme-DiLkS4Xi.js":{"file":"assets/theme-DiLkS4Xi.js","name":"theme","imports":["_auth-zU87a3Vs.js"]},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"assets/index-v8AGK6zm.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_card-B4eGZ63D.js","_sidebar-mZhYzTEx.js","_theme-DiLkS4Xi.js"]},"src/routes/auth/login.tsx?pick=default&pick=$css":{"file":"assets/login-C882vZoV.js","name":"login","src":"src/routes/auth/login.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_card-B4eGZ63D.js"]},"src/routes/index.tsx?pick=default&pick=$css":{"file":"assets/index-Bww_pepA.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_card-B4eGZ63D.js","_sidebar-mZhYzTEx.js","_protected-route-C_ork0Su.js","_button-SgHIeQ9K.js","_theme-DiLkS4Xi.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"assets/index-9wENpnoU.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_card-B4eGZ63D.js","_sidebar-mZhYzTEx.js","_theme-DiLkS4Xi.js"]},"src/routes/session/[id].tsx?pick=default&pick=$css":{"file":"assets/_id_-CB2lWv6Y.js","name":"_id_","src":"src/routes/session/[id].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_sidebar-mZhYzTEx.js","_protected-route-C_ork0Su.js","_button-SgHIeQ9K.js","_theme-DiLkS4Xi.js"]},"src/routes/settings/api-keys.tsx?pick=default&pick=$css":{"file":"assets/api-keys-CB-8ANDD.js","name":"api-keys","src":"src/routes/settings/api-keys.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_card-B4eGZ63D.js","_sidebar-mZhYzTEx.js","_protected-route-C_ork0Su.js","_theme-DiLkS4Xi.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"assets/index-VqV4f9IW.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_auth-zU87a3Vs.js","_button-SgHIeQ9K.js","_card-B4eGZ63D.js","_sidebar-mZhYzTEx.js","_protected-route-C_ork0Su.js","_theme-DiLkS4Xi.js"]},"virtual:$vinxi/handler/client":{"file":"assets/client-DadC_rxc.js","name":"client","src":"virtual:$vinxi/handler/client","isEntry":true,"imports":["_auth-zU87a3Vs.js","_theme-DiLkS4Xi.js"],"dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/auth/login.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/session/[id].tsx?pick=default&pick=$css","src/routes/settings/api-keys.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css"],"css":["assets/client-D7ASRKPU.css"]}},"server-fns":{"_auth-BSPamyz9.js":{"file":"assets/auth-BSPamyz9.js","name":"auth"},"_button-BUb5ee2-.js":{"file":"assets/button-BUb5ee2-.js","name":"button","imports":["_auth-BSPamyz9.js"]},"_card-xYJnUqvS.js":{"file":"assets/card-xYJnUqvS.js","name":"card","imports":["_auth-BSPamyz9.js"]},"_index-lOdYvL_-.js":{"file":"assets/index-lOdYvL_-.js","name":"index"},"_protected-route-M6OqgFP0.js":{"file":"assets/protected-route-M6OqgFP0.js","name":"protected-route","imports":["_auth-BSPamyz9.js"]},"_server-fns-D0dHBLCm.js":{"file":"assets/server-fns-D0dHBLCm.js","name":"server-fns","dynamicImports":["src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/agents/index.tsx?pick=default&pick=$css","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=GET","src/routes/api/[...path].ts?pick=POST","src/routes/api/[...path].ts?pick=POST","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/api/health.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/authorize.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/callback.ts?pick=GET","src/routes/auth/login.tsx?pick=default&pick=$css","src/routes/auth/login.tsx?pick=default&pick=$css","src/routes/auth/logout.ts?pick=POST","src/routes/auth/logout.ts?pick=POST","src/routes/auth/refresh.ts?pick=POST","src/routes/auth/refresh.ts?pick=POST","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/auth/status.ts?pick=GET","src/routes/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/models/index.tsx?pick=default&pick=$css","src/routes/session/[id].tsx?pick=default&pick=$css","src/routes/session/[id].tsx?pick=default&pick=$css","src/routes/settings/api-keys.tsx?pick=default&pick=$css","src/routes/settings/api-keys.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/routes/settings/index.tsx?pick=default&pick=$css","src/app.tsx"]},"_sidebar-lSzgpHq7.js":{"file":"assets/sidebar-lSzgpHq7.js","name":"sidebar","imports":["_button-BUb5ee2-.js","_auth-BSPamyz9.js"]},"src/app.tsx":{"file":"assets/app-DO67LHOs.js","name":"app","src":"src/app.tsx","isDynamicEntry":true,"imports":["_server-fns-D0dHBLCm.js","_auth-BSPamyz9.js"],"css":["assets/app-D7ASRKPU.css"]},"src/routes/agents/index.tsx?pick=default&pick=$css":{"file":"index.js","name":"index","src":"src/routes/agents/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BUb5ee2-.js","_card-xYJnUqvS.js","_auth-BSPamyz9.js","_sidebar-lSzgpHq7.js"]},"src/routes/api/[...path].ts?pick=GET":{"file":"_...path_.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/api/[...path].ts?pick=POST":{"file":"_...path_2.js","name":"_...path_","src":"src/routes/api/[...path].ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/api/health.ts?pick=GET":{"file":"health.js","name":"health","src":"src/routes/api/health.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/auth/authorize.ts?pick=GET":{"file":"authorize.js","name":"authorize","src":"src/routes/auth/authorize.ts?pick=GET","isEntry":true,"isDynamicEntry":true,"imports":["_index-lOdYvL_-.js"]},"src/routes/auth/callback.ts?pick=GET":{"file":"callback.js","name":"callback","src":"src/routes/auth/callback.ts?pick=GET","isEntry":true,"isDynamicEntry":true,"imports":["_index-lOdYvL_-.js"]},"src/routes/auth/login.tsx?pick=default&pick=$css":{"file":"login.js","name":"login","src":"src/routes/auth/login.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BUb5ee2-.js","_card-xYJnUqvS.js","_auth-BSPamyz9.js"]},"src/routes/auth/logout.ts?pick=POST":{"file":"logout.js","name":"logout","src":"src/routes/auth/logout.ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/auth/refresh.ts?pick=POST":{"file":"refresh.js","name":"refresh","src":"src/routes/auth/refresh.ts?pick=POST","isEntry":true,"isDynamicEntry":true},"src/routes/auth/status.ts?pick=GET":{"file":"status.js","name":"status","src":"src/routes/auth/status.ts?pick=GET","isEntry":true,"isDynamicEntry":true},"src/routes/index.tsx?pick=default&pick=$css":{"file":"index2.js","name":"index","src":"src/routes/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_card-xYJnUqvS.js","_auth-BSPamyz9.js","_sidebar-lSzgpHq7.js","_protected-route-M6OqgFP0.js","_button-BUb5ee2-.js"]},"src/routes/models/index.tsx?pick=default&pick=$css":{"file":"index3.js","name":"index","src":"src/routes/models/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BUb5ee2-.js","_card-xYJnUqvS.js","_auth-BSPamyz9.js","_sidebar-lSzgpHq7.js"]},"src/routes/session/[id].tsx?pick=default&pick=$css":{"file":"_id_.js","name":"_id_","src":"src/routes/session/[id].tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_sidebar-lSzgpHq7.js","_protected-route-M6OqgFP0.js","_auth-BSPamyz9.js","_button-BUb5ee2-.js"]},"src/routes/settings/api-keys.tsx?pick=default&pick=$css":{"file":"api-keys.js","name":"api-keys","src":"src/routes/settings/api-keys.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BUb5ee2-.js","_card-xYJnUqvS.js","_auth-BSPamyz9.js","_sidebar-lSzgpHq7.js","_protected-route-M6OqgFP0.js"]},"src/routes/settings/index.tsx?pick=default&pick=$css":{"file":"index4.js","name":"index","src":"src/routes/settings/index.tsx?pick=default&pick=$css","isEntry":true,"isDynamicEntry":true,"imports":["_button-BUb5ee2-.js","_card-xYJnUqvS.js","_auth-BSPamyz9.js","_sidebar-lSzgpHq7.js","_protected-route-M6OqgFP0.js"]},"virtual:$vinxi/handler/server-fns":{"file":"server-fns.js","name":"server-fns","src":"virtual:$vinxi/handler/server-fns","isEntry":true,"imports":["_server-fns-D0dHBLCm.js"]}}};

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
  "/assets/ssr-D7ASRKPU.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"6b44-aRu2zMpOoqV1Sx8TadOWJeDrzgA\"",
    "mtime": "2026-01-15T06:25:16.605Z",
    "size": 27460,
    "path": "../public/assets/ssr-D7ASRKPU.css"
  },
  "/assets/ssr-D7ASRKPU.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"132f-R0LTeZQTc1NCgydC1wGBNCcEcq4\"",
    "mtime": "2026-01-15T06:25:16.651Z",
    "size": 4911,
    "path": "../public/assets/ssr-D7ASRKPU.css.br"
  },
  "/assets/ssr-D7ASRKPU.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"163c-dwA9e7AOuvpkwVvrJwALrKd0GLs\"",
    "mtime": "2026-01-15T06:25:16.651Z",
    "size": 5692,
    "path": "../public/assets/ssr-D7ASRKPU.css.gz"
  },
  "/_server/assets/app-D7ASRKPU.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"6b44-aRu2zMpOoqV1Sx8TadOWJeDrzgA\"",
    "mtime": "2026-01-15T06:25:16.609Z",
    "size": 27460,
    "path": "../public/_server/assets/app-D7ASRKPU.css"
  },
  "/_server/assets/app-D7ASRKPU.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"132f-R0LTeZQTc1NCgydC1wGBNCcEcq4\"",
    "mtime": "2026-01-15T06:25:16.750Z",
    "size": 4911,
    "path": "../public/_server/assets/app-D7ASRKPU.css.br"
  },
  "/_server/assets/app-D7ASRKPU.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"163c-dwA9e7AOuvpkwVvrJwALrKd0GLs\"",
    "mtime": "2026-01-15T06:25:16.703Z",
    "size": 5692,
    "path": "../public/_server/assets/app-D7ASRKPU.css.gz"
  },
  "/_build/.vite/manifest.json": {
    "type": "application/json",
    "encoding": null,
    "etag": "\"11a0-nH4gX9hWLACx4aXyW7SNdb1PKew\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 4512,
    "path": "../public/_build/.vite/manifest.json"
  },
  "/_build/.vite/manifest.json.br": {
    "type": "application/json",
    "encoding": "br",
    "etag": "\"234-qeFfVoAKEPcOWXvF/4JLxRcT8jE\"",
    "mtime": "2026-01-15T06:25:16.651Z",
    "size": 564,
    "path": "../public/_build/.vite/manifest.json.br"
  },
  "/_build/.vite/manifest.json.gz": {
    "type": "application/json",
    "encoding": "gzip",
    "etag": "\"27e-sermbz3t2IioDEXM3kov97KS4mE\"",
    "mtime": "2026-01-15T06:25:16.651Z",
    "size": 638,
    "path": "../public/_build/.vite/manifest.json.gz"
  },
  "/_build/assets/_id_-CB2lWv6Y.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"5e29-tXCGh8mFvPqfvG/moWQjwmshdr4\"",
    "mtime": "2026-01-15T06:25:16.607Z",
    "size": 24105,
    "path": "../public/_build/assets/_id_-CB2lWv6Y.js"
  },
  "/_build/assets/_id_-CB2lWv6Y.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"1c80-XB9Pgojhu92efESgkfFY57HYweU\"",
    "mtime": "2026-01-15T06:25:16.654Z",
    "size": 7296,
    "path": "../public/_build/assets/_id_-CB2lWv6Y.js.br"
  },
  "/_build/assets/_id_-CB2lWv6Y.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1ff3-44r/7rgccQ8J9oFAsDaQoUQuiTY\"",
    "mtime": "2026-01-15T06:25:16.651Z",
    "size": 8179,
    "path": "../public/_build/assets/_id_-CB2lWv6Y.js.gz"
  },
  "/_build/assets/api-keys-CB-8ANDD.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"1b2a-iU+hxboM+GqP0nquep4B98kwAbA\"",
    "mtime": "2026-01-15T06:25:16.607Z",
    "size": 6954,
    "path": "../public/_build/assets/api-keys-CB-8ANDD.js"
  },
  "/_build/assets/api-keys-CB-8ANDD.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"961-Dk7a6d/WDrsV6x20g/F/wdNsGXs\"",
    "mtime": "2026-01-15T06:25:16.657Z",
    "size": 2401,
    "path": "../public/_build/assets/api-keys-CB-8ANDD.js.br"
  },
  "/_build/assets/api-keys-CB-8ANDD.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"aa3-mN30odGflNk/yH9ZwvdMiGec4sI\"",
    "mtime": "2026-01-15T06:25:16.653Z",
    "size": 2723,
    "path": "../public/_build/assets/api-keys-CB-8ANDD.js.gz"
  },
  "/_build/assets/auth-zU87a3Vs.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"b4df-XYR0QXMijRw9gLGNYzFctRZzMKQ\"",
    "mtime": "2026-01-15T06:25:16.817Z",
    "size": 46303,
    "path": "../public/_build/assets/auth-zU87a3Vs.js.br"
  },
  "/_build/assets/auth-zU87a3Vs.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"261b6-uQ2EhZVR6h/gW8a2wYvBp1Pa2FM\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 156086,
    "path": "../public/_build/assets/auth-zU87a3Vs.js"
  },
  "/_build/assets/button-SgHIeQ9K.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"6d4-J0ITNV4DOVWjfeVTGDIBWw0ZEEs\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 1748,
    "path": "../public/_build/assets/button-SgHIeQ9K.js"
  },
  "/_build/assets/auth-zU87a3Vs.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"cea9-q9K3HIp0RmZQ9jK4L6eaupbtaX0\"",
    "mtime": "2026-01-15T06:25:16.690Z",
    "size": 52905,
    "path": "../public/_build/assets/auth-zU87a3Vs.js.gz"
  },
  "/_build/assets/button-SgHIeQ9K.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"307-apAXEkjKF/Kvx0OUwv/dQZwZdGM\"",
    "mtime": "2026-01-15T06:25:16.665Z",
    "size": 775,
    "path": "../public/_build/assets/button-SgHIeQ9K.js.br"
  },
  "/_build/assets/button-SgHIeQ9K.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"365-BDkinIAyDBIhSQ4/hd6FYlGP86Q\"",
    "mtime": "2026-01-15T06:25:16.665Z",
    "size": 869,
    "path": "../public/_build/assets/button-SgHIeQ9K.js.gz"
  },
  "/_build/assets/card-B4eGZ63D.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"46d-KsSRwjsnxnwV618iaeOiyufEyGQ\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 1133,
    "path": "../public/_build/assets/card-B4eGZ63D.js"
  },
  "/_build/assets/card-B4eGZ63D.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"158-g4HJqiraSRSrJAafypjV8/UzV5g\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 344,
    "path": "../public/_build/assets/card-B4eGZ63D.js.br"
  },
  "/_build/assets/card-B4eGZ63D.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"18a-d9KtYn0YczuV++yY9pN0nPHIeOc\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 394,
    "path": "../public/_build/assets/card-B4eGZ63D.js.gz"
  },
  "/_build/assets/client-D7ASRKPU.css": {
    "type": "text/css; charset=utf-8",
    "encoding": null,
    "etag": "\"6b44-aRu2zMpOoqV1Sx8TadOWJeDrzgA\"",
    "mtime": "2026-01-15T06:25:16.607Z",
    "size": 27460,
    "path": "../public/_build/assets/client-D7ASRKPU.css"
  },
  "/_build/assets/client-D7ASRKPU.css.br": {
    "type": "text/css; charset=utf-8",
    "encoding": "br",
    "etag": "\"132f-R0LTeZQTc1NCgydC1wGBNCcEcq4\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 4911,
    "path": "../public/_build/assets/client-D7ASRKPU.css.br"
  },
  "/_build/assets/client-DadC_rxc.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"48d5-hfemEBhEXO+bSE+bX6JKroeACGE\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 18645,
    "path": "../public/_build/assets/client-DadC_rxc.js"
  },
  "/_build/assets/client-D7ASRKPU.css.gz": {
    "type": "text/css; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"163c-dwA9e7AOuvpkwVvrJwALrKd0GLs\"",
    "mtime": "2026-01-15T06:25:16.690Z",
    "size": 5692,
    "path": "../public/_build/assets/client-D7ASRKPU.css.gz"
  },
  "/_build/assets/client-DadC_rxc.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"18f8-JLS3rqq/oTTLlyEXFgE8ZPYy/Go\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 6392,
    "path": "../public/_build/assets/client-DadC_rxc.js.br"
  },
  "/_build/assets/client-DadC_rxc.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"1c02-YGzQmB4vIIHJmFNEiR8DauIHR4k\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 7170,
    "path": "../public/_build/assets/client-DadC_rxc.js.gz"
  },
  "/_build/assets/index-9wENpnoU.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"bb7-+roeFkXsSrL3/XqvxpPhUD9Ch1s\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 2999,
    "path": "../public/_build/assets/index-9wENpnoU.js"
  },
  "/_build/assets/index-9wENpnoU.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"50c-43i9RnUqyfGSmdvS/mA7ZrIPAUM\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 1292,
    "path": "../public/_build/assets/index-9wENpnoU.js.gz"
  },
  "/_build/assets/index-9wENpnoU.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"45e-x/4T6wsbYoTLQXHOaRLS0mm/fcA\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 1118,
    "path": "../public/_build/assets/index-9wENpnoU.js.br"
  },
  "/_build/assets/index-Bww_pepA.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"2ac-+1LtyzgO3leD2tOcCB8eh5bGuP4\"",
    "mtime": "2026-01-15T06:25:16.690Z",
    "size": 684,
    "path": "../public/_build/assets/index-Bww_pepA.js.br"
  },
  "/_build/assets/index-Bww_pepA.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"60d-wfBdoHt1fuD2bs4UMy3C8eFm9dY\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 1549,
    "path": "../public/_build/assets/index-Bww_pepA.js"
  },
  "/_build/assets/index-Bww_pepA.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"31c-NGa2F6RRiS0N/GHTZ5Ga3mP6Gz0\"",
    "mtime": "2026-01-15T06:25:16.689Z",
    "size": 796,
    "path": "../public/_build/assets/index-Bww_pepA.js.gz"
  },
  "/_build/assets/index-VqV4f9IW.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"b46-f+VFD9DWdJPIt7HBu8RsLYWRyks\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 2886,
    "path": "../public/_build/assets/index-VqV4f9IW.js"
  },
  "/_build/assets/index-VqV4f9IW.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"4ce-NSwWJY6zM0jcQEPLeNaRj2m7KGw\"",
    "mtime": "2026-01-15T06:25:16.690Z",
    "size": 1230,
    "path": "../public/_build/assets/index-VqV4f9IW.js.gz"
  },
  "/_build/assets/index-v8AGK6zm.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"b77-CWbDQlx8Un1Orfx88V8vKAHhCfE\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 2935,
    "path": "../public/_build/assets/index-v8AGK6zm.js"
  },
  "/_build/assets/index-v8AGK6zm.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"42b-tDfwgMSOLsjO5S/NVQqGS9ScgbE\"",
    "mtime": "2026-01-15T06:25:16.693Z",
    "size": 1067,
    "path": "../public/_build/assets/index-v8AGK6zm.js.br"
  },
  "/_build/assets/index-v8AGK6zm.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"4e1-w1rYAiZ+bzKVo/RGMSv3cJCwsg0\"",
    "mtime": "2026-01-15T06:25:16.692Z",
    "size": 1249,
    "path": "../public/_build/assets/index-v8AGK6zm.js.gz"
  },
  "/_build/assets/login-C882vZoV.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"81d-vsFMXe7o7XZ8jw3yWM3IE/XaOO4\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 2077,
    "path": "../public/_build/assets/login-C882vZoV.js"
  },
  "/_build/assets/index-VqV4f9IW.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"3ff-qcpu/sav8HwnD9nuL6zjud+U7aA\"",
    "mtime": "2026-01-15T06:25:16.692Z",
    "size": 1023,
    "path": "../public/_build/assets/index-VqV4f9IW.js.br"
  },
  "/_build/assets/login-C882vZoV.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"3d6-2GAqF8yG4FK1lj2wVb+ElFidf34\"",
    "mtime": "2026-01-15T06:25:16.702Z",
    "size": 982,
    "path": "../public/_build/assets/login-C882vZoV.js.br"
  },
  "/_build/assets/login-C882vZoV.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"493-+WPC3fTGdW9dEK9eGTAAgv9M1Mo\"",
    "mtime": "2026-01-15T06:25:16.693Z",
    "size": 1171,
    "path": "../public/_build/assets/login-C882vZoV.js.gz"
  },
  "/_build/assets/sidebar-mZhYzTEx.js": {
    "type": "text/javascript; charset=utf-8",
    "encoding": null,
    "etag": "\"f13-F5y85E2HpUWJLcPYFZVsuTFjtOQ\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 3859,
    "path": "../public/_build/assets/sidebar-mZhYzTEx.js"
  },
  "/_build/assets/sidebar-mZhYzTEx.js.br": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "br",
    "etag": "\"5a5-se+kE/afH8FVU4puEHA2CEzAFy4\"",
    "mtime": "2026-01-15T06:25:16.704Z",
    "size": 1445,
    "path": "../public/_build/assets/sidebar-mZhYzTEx.js.br"
  },
  "/_build/assets/theme-DiLkS4Xi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27d-Q2f9Hei6sGdXsqyhTvXjtc5daJ4\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 637,
    "path": "../public/_build/assets/theme-DiLkS4Xi.js"
  },
  "/_build/assets/sidebar-mZhYzTEx.js.gz": {
    "type": "text/javascript; charset=utf-8",
    "encoding": "gzip",
    "etag": "\"677-LBvBNgdfO5zXGBN/nNUIQe8mgCU\"",
    "mtime": "2026-01-15T06:25:16.702Z",
    "size": 1655,
    "path": "../public/_build/assets/sidebar-mZhYzTEx.js.gz"
  },
  "/_build/assets/protected-route-C_ork0Su.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"222-mtN+AvKq9vmart8L/I1iHDAcT5w\"",
    "mtime": "2026-01-15T06:25:16.608Z",
    "size": 546,
    "path": "../public/_build/assets/protected-route-C_ork0Su.js"
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
const _CdXS_Z = eventHandler((event) => {
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
  const r = (e || "").split(";").filter((c) => typeof c == "string" && !!c.trim()), n = r.shift() || "", a = Mr$1(n), i = a.name;
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
function Mr$1(e) {
  let t = "", r = "";
  const n = e.split("=");
  return n.length > 1 ? (t = n.shift(), r = n.join("=")) : r = e, { name: t, value: r };
}
var Gr$1 = ((e) => (e[e.AggregateError = 1] = "AggregateError", e[e.ArrowFunction = 2] = "ArrowFunction", e[e.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", e[e.ObjectAssign = 8] = "ObjectAssign", e[e.BigIntTypedArray = 16] = "BigIntTypedArray", e[e.RegExp = 32] = "RegExp", e))(Gr$1 || {}), x = Symbol.asyncIterator, bt$2 = Symbol.hasInstance, H$2 = Symbol.isConcatSpreadable, A = Symbol.iterator, yt$2 = Symbol.match, wt$2 = Symbol.matchAll, vt$2 = Symbol.replace, St$2 = Symbol.search, Et$2 = Symbol.species, Rt$2 = Symbol.split, kt$2 = Symbol.toPrimitive, F = Symbol.toStringTag, xt$1 = Symbol.unscopables, Br$1 = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, At$2 = { [x]: 0, [bt$2]: 1, [H$2]: 2, [A]: 3, [yt$2]: 4, [wt$2]: 5, [vt$2]: 6, [St$2]: 7, [Et$2]: 8, [Rt$2]: 9, [kt$2]: 10, [F]: 11, [xt$1]: 12 }, Wr$1 = { 0: x, 1: bt$2, 2: H$2, 3: A, 4: yt$2, 5: wt$2, 6: vt$2, 7: St$2, 8: Et$2, 9: Rt$2, 10: kt$2, 11: F, 12: xt$1 }, Vr$1 = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, s = void 0, Xr$1 = { 2: true, 3: false, 1: s, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN }, $t$2 = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, Yr$1 = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function g(e, t, r, n, a, i, o, u, c, l, p, d) {
  return { t: e, i: t, s: r, c: n, m: a, p: i, e: o, a: u, f: c, b: l, o: p, l: d };
}
function P(e) {
  return g(2, s, e, s, s, s, s, s, s, s, s, s);
}
var Tt$2 = P(2), _t$2 = P(3), Jr = P(1), Kr$1 = P(0), Zr$1 = P(4), Qr = P(5), en = P(6), tn$1 = P(7);
function rn$1(e) {
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
  for (let a = 0, i = e.length; a < i; a++) n = rn$1(e[a]), n && (t += e.slice(r, a) + n, r = a + 1);
  return r === 0 ? t = e : t += e.slice(r), t;
}
function nn$1(e) {
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
function I(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, nn$1);
}
var B$1 = "__SEROVAL_REFS__", ie$1 = "$R", ne = `self.${ie$1}`;
function sn$1(e) {
  return e == null ? `${ne}=${ne}||[]` : `(${ne}=${ne}||{})["${k(e)}"]=[]`;
}
var Pt$2 = /* @__PURE__ */ new Map(), L = /* @__PURE__ */ new Map();
function zt$2(e) {
  return Pt$2.has(e);
}
function an$1(e) {
  return L.has(e);
}
function on$1(e) {
  if (zt$2(e)) return Pt$2.get(e);
  throw new Nn$1(e);
}
function un(e) {
  if (an$1(e)) return L.get(e);
  throw new Un$1(e);
}
typeof globalThis < "u" ? Object.defineProperty(globalThis, B$1, { value: L, configurable: true, writable: false, enumerable: false }) : typeof self < "u" ? Object.defineProperty(self, B$1, { value: L, configurable: true, writable: false, enumerable: false }) : typeof global < "u" && Object.defineProperty(global, B$1, { value: L, configurable: true, writable: false, enumerable: false });
function Oe(e) {
  return e instanceof EvalError ? 1 : e instanceof RangeError ? 2 : e instanceof ReferenceError ? 3 : e instanceof SyntaxError ? 4 : e instanceof TypeError ? 5 : e instanceof URIError ? 6 : 0;
}
function cn$1(e) {
  let t = $t$2[Oe(e)];
  return e.name !== t ? { name: e.name } : e.constructor.name !== t ? { name: e.constructor.name } : {};
}
function Ct$2(e, t) {
  let r = cn$1(e), n = Object.getOwnPropertyNames(e);
  for (let a = 0, i = n.length, o; a < i; a++) o = n[a], o !== "name" && o !== "message" && (o === "stack" ? t & 4 && (r = r || {}, r[o] = e[o]) : (r = r || {}, r[o] = e[o]));
  return r;
}
function Ot$1(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : Object.isExtensible(e) ? 0 : 1;
}
function ln$1(e) {
  switch (e) {
    case Number.POSITIVE_INFINITY:
      return Qr;
    case Number.NEGATIVE_INFINITY:
      return en;
  }
  return e !== e ? tn$1 : Object.is(e, -0) ? Zr$1 : g(0, s, e, s, s, s, s, s, s, s, s, s);
}
function It$2(e) {
  return g(1, s, k(e), s, s, s, s, s, s, s, s, s);
}
function fn(e) {
  return g(3, s, "" + e, s, s, s, s, s, s, s, s, s);
}
function pn(e) {
  return g(4, e, s, s, s, s, s, s, s, s, s, s);
}
function dn(e, t) {
  let r = t.valueOf();
  return g(5, e, r !== r ? "" : t.toISOString(), s, s, s, s, s, s, s, s, s);
}
function hn$1(e, t) {
  return g(6, e, s, k(t.source), t.flags, s, s, s, s, s, s, s);
}
function gn$1(e, t) {
  return g(17, e, At$2[t], s, s, s, s, s, s, s, s, s);
}
function mn$1(e, t) {
  return g(18, e, k(on$1(t)), s, s, s, s, s, s, s, s, s);
}
function Nt$2(e, t, r) {
  return g(25, e, r, k(t), s, s, s, s, s, s, s, s);
}
function bn$1(e, t, r) {
  return g(9, e, s, s, s, s, s, r, s, s, Ot$1(t), s);
}
function yn$1(e, t) {
  return g(21, e, s, s, s, s, s, s, t, s, s, s);
}
function wn$1(e, t, r) {
  return g(15, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.length);
}
function vn$1(e, t, r) {
  return g(16, e, s, t.constructor.name, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function Sn$1(e, t, r) {
  return g(20, e, s, s, s, s, s, s, r, t.byteOffset, s, t.byteLength);
}
function En$1(e, t, r) {
  return g(13, e, Oe(t), s, k(t.message), r, s, s, s, s, s, s);
}
function Rn$1(e, t, r) {
  return g(14, e, Oe(t), s, k(t.message), r, s, s, s, s, s, s);
}
function kn(e, t) {
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
function Tn$1(e, t) {
  return g(32, e, s, s, s, s, s, s, t, s, s, s);
}
function _n(e, t) {
  return g(33, e, s, s, s, s, s, s, t, s, s, s);
}
function Pn$1(e, t) {
  return g(34, e, s, s, s, s, s, s, t, s, s, s);
}
var zn$1 = { parsing: 1, serialization: 2, deserialization: 3 };
function Cn$1(e) {
  return `Seroval Error (step: ${zn$1[e]})`;
}
var On$1 = (e, t) => Cn$1(e), Ut$2 = class Ut extends Error {
  constructor(e, t) {
    super(On$1(e)), this.cause = t;
  }
}, Ge$1 = class Ge extends Ut$2 {
  constructor(e) {
    super("parsing", e);
  }
}, In = class extends Ut$2 {
  constructor(e) {
    super("deserialization", e);
  }
};
function $$1(e) {
  return `Seroval Error (specific: ${e})`;
}
var ce$2 = class ce extends Error {
  constructor(e) {
    super($$1(1)), this.value = e;
  }
}, N$1 = class N extends Error {
  constructor(e) {
    super($$1(2));
  }
}, Dt$2 = class Dt extends Error {
  constructor(e) {
    super($$1(3));
  }
}, Q$2 = class Q extends Error {
  constructor(e) {
    super($$1(4));
  }
}, Nn$1 = class Nn extends Error {
  constructor(e) {
    super($$1(5)), this.value = e;
  }
}, Un$1 = class Un extends Error {
  constructor(e) {
    super($$1(6));
  }
}, Dn$1 = class Dn extends Error {
  constructor(e) {
    super($$1(7));
  }
}, z$1 = class z extends Error {
  constructor(t) {
    super($$1(8));
  }
}, Lt$2 = class Lt extends Error {
  constructor(t) {
    super($$1(9));
  }
}, Ln$1 = class Ln {
  constructor(t, r) {
    this.value = t, this.replacement = r;
  }
}, le$1 = () => {
  let e = { p: 0, s: 0, f: 0 };
  return e.p = new Promise((t, r) => {
    e.s = t, e.f = r;
  }), e;
}, Hn$1 = (e, t) => {
  e.s(t), e.p.s = 1, e.p.v = t;
}, Fn = (e, t) => {
  e.f(t), e.p.s = 2, e.p.v = t;
}, jn$1 = le$1.toString(), qn$1 = Hn$1.toString(), Mn = Fn.toString(), Ht$2 = () => {
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
}, Gn$1 = Ht$2.toString(), Ft$1 = (e) => (t) => () => {
  let r = 0, n = { [e]: () => n, next: () => {
    if (r > t.d) return { done: true, value: void 0 };
    let a = r++, i = t.v[a];
    if (a === t.t) throw i;
    return { done: a === t.d, value: i };
  } };
  return n;
}, Bn$1 = Ft$1.toString(), jt$1 = (e, t) => (r) => () => {
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
}, Wn$1 = jt$1.toString(), qt$2 = (e) => {
  let t = atob(e), r = t.length, n = new Uint8Array(r);
  for (let a = 0; a < r; a++) n[a] = t.charCodeAt(a);
  return n.buffer;
}, Vn$1 = qt$2.toString(), Xn$1 = {}, Yn$1 = {}, Jn$1 = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, Kn = { 0: "[]", 1: jn$1, 2: qn$1, 3: Mn, 4: Gn$1, 5: Vn$1 };
function fe$1(e) {
  return "__SEROVAL_STREAM__" in e;
}
function ee$2() {
  return Ht$2();
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
var Qn$1 = jt$1(x, le$1);
function es(e) {
  return Qn$1(e);
}
function ts(e) {
  let t = [], r = -1, n = -1, a = e[A]();
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
var rs = Ft$1(A);
function ns(e) {
  return rs(e);
}
function ss(e, t) {
  return { plugins: t.plugins, mode: e, marked: /* @__PURE__ */ new Set(), features: 63 ^ (t.disabledFeatures || 0), refs: t.refs || /* @__PURE__ */ new Map(), depthLimit: t.depthLimit || 1e3 };
}
function as(e, t) {
  e.marked.add(t);
}
function Mt(e, t) {
  let r = e.refs.size;
  return e.refs.set(t, r), r;
}
function pe$1(e, t) {
  let r = e.refs.get(t);
  return r != null ? (as(e, r), { type: 1, value: pn(r) }) : { type: 0, value: Mt(e, t) };
}
function Ie$1(e, t) {
  let r = pe$1(e, t);
  return r.type === 1 ? r : zt$2(t) ? { type: 2, value: mn$1(r.value, t) } : r;
}
function C(e, t) {
  let r = Ie$1(e, t);
  if (r.type !== 0) return r.value;
  if (t in At$2) return gn$1(r.value, t);
  throw new ce$2(t);
}
function U$1(e, t) {
  let r = pe$1(e, Jn$1[t]);
  return r.type === 1 ? r.value : g(26, r.value, t, s, s, s, s, s, s, s, s, s);
}
function is(e) {
  let t = pe$1(e, Xn$1);
  return t.type === 1 ? t.value : g(27, t.value, s, s, s, s, s, s, C(e, A), s, s, s);
}
function os(e) {
  let t = pe$1(e, Yn$1);
  return t.type === 1 ? t.value : g(29, t.value, s, s, s, s, s, [U$1(e, 1), C(e, x)], s, s, s, s);
}
function us(e, t, r, n) {
  return g(r ? 11 : 10, e, s, s, s, n, s, s, s, s, Ot$1(t), s);
}
function cs(e, t, r, n) {
  return g(8, t, s, s, s, s, { k: r, v: n }, s, U$1(e, 0), s, s, s);
}
function ls(e, t, r) {
  return g(22, t, r, s, s, s, s, s, U$1(e, 1), s, s, s);
}
function fs$1(e, t, r) {
  let n = new Uint8Array(r), a = "";
  for (let i = 0, o = n.length; i < o; i++) a += String.fromCharCode(n[i]);
  return g(19, t, k(btoa(a)), s, s, s, s, s, U$1(e, 5), s, s, s);
}
var ps$1 = ((e) => (e[e.Vanilla = 1] = "Vanilla", e[e.Cross = 2] = "Cross", e))(ps$1 || {});
function Gt$2(e, t) {
  for (let r = 0, n = t.length; r < n; r++) {
    let a = t[r];
    e.has(a) || (e.add(a), a.extends && Gt$2(e, a.extends));
  }
}
function Bt$2(e) {
  if (e) {
    let t = /* @__PURE__ */ new Set();
    return Gt$2(t, e), [...t];
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
      throw new Dn$1(e);
  }
}
var hs$1 = 1e6, gs$1 = 1e4, ms$1 = 2e4;
function Wt$2(e, t) {
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
var bs$1 = 1e3;
function ys$1(e, t) {
  var r;
  return { mode: e, plugins: t.plugins, refs: t.refs || /* @__PURE__ */ new Map(), features: (r = t.features) != null ? r : 63 ^ (t.disabledFeatures || 0), depthLimit: t.depthLimit || bs$1 };
}
function ws$1(e) {
  return { mode: 1, base: ys$1(1, e), child: s, state: { marked: new Set(e.markedRefs) } };
}
var vs$1 = class vs {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  deserialize(e) {
    return b$1(this._p, this.depth, e);
  }
};
function Vt$2(e, t) {
  if (t < 0 || !Number.isFinite(t) || !Number.isInteger(t)) throw new z$1({ t: 4, i: t });
  if (e.refs.has(t)) throw new Error("Conflicted ref id: " + t);
}
function Ss$1(e, t, r) {
  return Vt$2(e.base, t), e.state.marked.has(t) && e.base.refs.set(t, r), r;
}
function Es$1(e, t, r) {
  return Vt$2(e.base, t), e.base.refs.set(t, r), r;
}
function y(e, t, r) {
  return e.mode === 1 ? Ss$1(e, t, r) : Es$1(e, t, r);
}
function Ee$1(e, t, r) {
  if (Object.hasOwn(t, r)) return t[r];
  throw new z$1(e);
}
function Rs(e, t) {
  return y(e, t.i, un(I(t.s)));
}
function ks$1(e, t, r) {
  let n = r.a, a = n.length, i = y(e, r.i, new Array(a));
  for (let o = 0, u; o < a; o++) u = n[o], u && (i[o] = b$1(e, t, u));
  return Wt$2(i, r.o), i;
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
    case H$2:
    case F:
    case A:
      return true;
    default:
      return false;
  }
}
function Be$1(e, t, r) {
  xs$1(t) ? e[t] = r : Object.defineProperty(e, t, { value: r, configurable: true, enumerable: true, writable: true });
}
function $s$1(e, t, r, n, a) {
  if (typeof n == "string") Be$1(r, n, b$1(e, t, a));
  else {
    let i = b$1(e, t, n);
    switch (typeof i) {
      case "string":
        Be$1(r, i, b$1(e, t, a));
        break;
      case "symbol":
        As$1(i) && (r[i] = b$1(e, t, a));
        break;
      default:
        throw new z$1(n);
    }
  }
}
function Xt$2(e, t, r, n) {
  let a = r.k;
  if (a.length > 0) for (let i = 0, o = r.v, u = a.length; i < u; i++) $s$1(e, t, n, a[i], o[i]);
  return n;
}
function Ts$1(e, t, r) {
  let n = y(e, r.i, r.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  return Xt$2(e, t, r.p, n), Wt$2(n, r.o), n;
}
function _s(e, t) {
  return y(e, t.i, new Date(t.s));
}
function Ps$1(e, t) {
  if (e.base.features & 32) {
    let r = I(t.c);
    if (r.length > ms$1) throw new z$1(t);
    return y(e, t.i, new RegExp(r, t.m));
  }
  throw new N$1(t);
}
function zs(e, t, r) {
  let n = y(e, r.i, /* @__PURE__ */ new Set());
  for (let a = 0, i = r.a, o = i.length; a < o; a++) n.add(b$1(e, t, i[a]));
  return n;
}
function Cs$1(e, t, r) {
  let n = y(e, r.i, /* @__PURE__ */ new Map());
  for (let a = 0, i = r.e.k, o = r.e.v, u = i.length; a < u; a++) n.set(b$1(e, t, i[a]), b$1(e, t, o[a]));
  return n;
}
function Os$1(e, t) {
  if (t.s.length > hs$1) throw new z$1(t);
  return y(e, t.i, qt$2(I(t.s)));
}
function Is$1(e, t, r) {
  var n;
  let a = ds$1(r.c), i = b$1(e, t, r.f), o = (n = r.b) != null ? n : 0;
  if (o < 0 || o > i.byteLength) throw new z$1(r);
  return y(e, r.i, new a(i, o, r.l));
}
function Ns(e, t, r) {
  var n;
  let a = b$1(e, t, r.f), i = (n = r.b) != null ? n : 0;
  if (i < 0 || i > a.byteLength) throw new z$1(r);
  return y(e, r.i, new DataView(a, i, r.l));
}
function Yt$2(e, t, r, n) {
  if (r.p) {
    let a = Xt$2(e, t, r.p, {});
    Object.defineProperties(n, Object.getOwnPropertyDescriptors(a));
  }
  return n;
}
function Us$1(e, t, r) {
  let n = y(e, r.i, new AggregateError([], I(r.m)));
  return Yt$2(e, t, r, n);
}
function Ds$1(e, t, r) {
  let n = Ee$1(r, Yr$1, r.s), a = y(e, r.i, new n(I(r.m)));
  return Yt$2(e, t, r, a);
}
function Ls$1(e, t, r) {
  let n = le$1(), a = y(e, r.i, n.p), i = b$1(e, t, r.f);
  return r.s ? n.s(i) : n.f(i), a;
}
function Hs$1(e, t, r) {
  return y(e, r.i, Object(b$1(e, t, r.f)));
}
function Fs$1(e, t, r) {
  let n = e.base.plugins;
  if (n) {
    let a = I(r.c);
    for (let i = 0, o = n.length; i < o; i++) {
      let u = n[i];
      if (u.tag === a) return y(e, r.i, u.deserialize(r.s, new vs$1(e, t), { id: r.i }));
    }
  }
  throw new Dt$2(r.c);
}
function js$1(e, t) {
  return y(e, t.i, y(e, t.s, le$1()).p);
}
function qs$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return n.s(b$1(e, t, r.a[1])), s;
  throw new Q$2("Promise");
}
function Ms$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n) return n.f(b$1(e, t, r.a[1])), s;
  throw new Q$2("Promise");
}
function Gs$1(e, t, r) {
  b$1(e, t, r.a[0]);
  let n = b$1(e, t, r.a[1]);
  return ns(n);
}
function Bs(e, t, r) {
  b$1(e, t, r.a[0]);
  let n = b$1(e, t, r.a[1]);
  return es(n);
}
function Ws$1(e, t, r) {
  let n = y(e, r.i, ee$2()), a = r.a, i = a.length;
  if (i) for (let o = 0; o < i; o++) b$1(e, t, a[o]);
  return n;
}
function Vs(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.next(b$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Xs$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.throw(b$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Ys$1(e, t, r) {
  let n = e.base.refs.get(r.i);
  if (n && fe$1(n)) return n.return(b$1(e, t, r.f)), s;
  throw new Q$2("Stream");
}
function Js$1(e, t, r) {
  return b$1(e, t, r.f), s;
}
function Ks$1(e, t, r) {
  return b$1(e, t, r.a[1]), s;
}
function b$1(e, t, r) {
  if (t > e.base.depthLimit) throw new Lt$2(e.base.depthLimit);
  switch (t += 1, r.t) {
    case 2:
      return Ee$1(r, Xr$1, r.s);
    case 0:
      return Number(r.s);
    case 1:
      return I(String(r.s));
    case 3:
      if (String(r.s).length > gs$1) throw new z$1(r);
      return BigInt(r.s);
    case 4:
      return e.base.refs.get(r.i);
    case 18:
      return Rs(e, r);
    case 9:
      return ks$1(e, t, r);
    case 10:
    case 11:
      return Ts$1(e, t, r);
    case 5:
      return _s(e, r);
    case 6:
      return Ps$1(e, r);
    case 7:
      return zs(e, t, r);
    case 8:
      return Cs$1(e, t, r);
    case 19:
      return Os$1(e, r);
    case 16:
    case 15:
      return Is$1(e, t, r);
    case 20:
      return Ns(e, t, r);
    case 14:
      return Us$1(e, t, r);
    case 13:
      return Ds$1(e, t, r);
    case 12:
      return Ls$1(e, t, r);
    case 17:
      return Ee$1(r, Wr$1, r.s);
    case 21:
      return Hs$1(e, t, r);
    case 25:
      return Fs$1(e, t, r);
    case 22:
      return js$1(e, r);
    case 23:
      return qs$1(e, t, r);
    case 24:
      return Ms$1(e, t, r);
    case 28:
      return Gs$1(e, t, r);
    case 30:
      return Bs(e, t, r);
    case 31:
      return Ws$1(e, t, r);
    case 32:
      return Vs(e, t, r);
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
    return b$1(e, 0, t);
  } catch (r) {
    throw new In(r);
  }
}
var Qs$1 = () => T, ea$1 = Qs$1.toString(), Jt$2 = /=>/.test(ea$1);
function Kt$1(e, t) {
  return Jt$2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (t.startsWith("{") ? "(" + t + ")" : t) : "function(" + e.join(",") + "){return " + t + "}";
}
function ta$1(e, t) {
  return Jt$2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + t + "}" : "function(" + e.join(",") + "){" + t + "}";
}
var Zt$2 = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", We$1 = Zt$2.length, Qt$2 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", Ve$1 = Qt$2.length;
function ra$1(e) {
  let t = e % We$1, r = Zt$2[t];
  for (e = (e - t) / We$1; e > 0; ) t = e % Ve$1, r += Qt$2[t], e = (e - t) / Ve$1;
  return r;
}
var na$1 = /^[$A-Z_][0-9A-Z_$]*$/i;
function er$2(e) {
  let t = e[0];
  return (t === "$" || t === "_" || t >= "A" && t <= "Z" || t >= "a" && t <= "z") && na$1.test(e);
}
function W(e) {
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
function sa$1(e) {
  let t = [], r = e[0];
  for (let n = 1, a = e.length, i, o = r; n < a; n++) i = e[n], i.t === 0 && i.v === o.v ? r = { t: 0, s: i.s, k: s, v: W(r) } : i.t === 2 && i.s === o.s ? r = { t: 2, s: W(r), k: i.k, v: i.v } : i.t === 1 && i.s === o.s ? r = { t: 1, s: W(r), k: s, v: i.v } : i.t === 3 && i.s === o.s ? r = { t: 3, s: W(r), k: i.k, v: s } : (t.push(r), r = i), o = i;
  return t.push(r), t;
}
function tr$2(e) {
  if (e.length) {
    let t = "", r = sa$1(e);
    for (let n = 0, a = r.length; n < a; n++) t += W(r[n]) + ",";
    return t;
  }
  return s;
}
var aa = "Object.create(null)", ia$1 = "new Set", oa$1 = "new Map", ua$1 = "Promise.resolve", ca$1 = "Promise.reject", la$1 = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: s };
function fa$1(e, t) {
  return { mode: e, plugins: t.plugins, features: t.features, marked: new Set(t.markedRefs), stack: [], flags: [], assignments: [] };
}
function pa$1(e) {
  return { mode: 2, base: fa$1(2, e), state: e, child: s };
}
var da$1 = class da {
  constructor(e) {
    this._p = e;
  }
  serialize(e) {
    return h(this._p, e);
  }
};
function ha$1(e, t) {
  let r = e.valid.get(t);
  r == null && (r = e.valid.size, e.valid.set(t, r));
  let n = e.vars[r];
  return n == null && (n = ra$1(r), e.vars[r] = n), n;
}
function ga$1(e) {
  return ie$1 + "[" + e + "]";
}
function m(e, t) {
  return e.mode === 1 ? ha$1(e.state, t) : ga$1(t);
}
function R(e, t) {
  e.marked.add(t);
}
function Re$1(e, t) {
  return e.marked.has(t);
}
function Ne$1(e, t, r) {
  t !== 0 && (R(e.base, r), e.base.flags.push({ type: t, value: m(e, r) }));
}
function ma$1(e) {
  let t = "";
  for (let r = 0, n = e.flags, a = n.length; r < a; r++) {
    let i = n[r];
    t += la$1[i.type] + "(" + i.value + "),";
  }
  return t;
}
function ba$1(e) {
  let t = tr$2(e.assignments), r = ma$1(e);
  return t ? r ? t + r : t : r;
}
function rr$2(e, t, r) {
  e.assignments.push({ t: 0, s: t, k: s, v: r });
}
function ya$1(e, t, r) {
  e.base.assignments.push({ t: 1, s: m(e, t), k: s, v: r });
}
function G(e, t, r, n) {
  e.base.assignments.push({ t: 2, s: m(e, t), k: r, v: n });
}
function Xe$1(e, t, r) {
  e.base.assignments.push({ t: 3, s: m(e, t), k: r, v: s });
}
function Y$2(e, t, r, n) {
  rr$2(e.base, m(e, t) + "[" + r + "]", n);
}
function ke$1(e, t, r, n) {
  rr$2(e.base, m(e, t) + "." + r, n);
}
function _(e, t) {
  return t.t === 4 && e.stack.includes(t.i);
}
function M(e, t, r) {
  return e.mode === 1 && !Re$1(e.base, t) ? r : m(e, t) + "=" + r;
}
function wa$1(e) {
  return B$1 + '.get("' + e.s + '")';
}
function Ye$1(e, t, r, n) {
  return r ? _(e.base, r) ? (R(e.base, t), Y$2(e, t, n, m(e, r.i)), "") : h(e, r) : "";
}
function va$1(e, t) {
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
    let a = Number(r), i = a >= 0 && a.toString() === r || er$2(r);
    if (_(e.base, n)) {
      let o = m(e, n.i);
      return R(e.base, t.i), i && a !== a ? ke$1(e, t.i, r, o) : Y$2(e, t.i, i ? r : '"' + r + '"', o), "";
    }
    return (i ? r : '"' + r + '"') + ":" + h(e, n);
  }
  return "[" + h(e, r) + "]:" + h(e, n);
}
function nr$2(e, t, r) {
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
function Sa$1(e, t) {
  return Ne$1(e, t.o, t.i), nr$2(e, t, t.p);
}
function Ea$1(e, t, r, n) {
  let a = nr$2(e, t, r);
  return a !== "{}" ? "Object.assign(" + n + "," + a + ")" : n;
}
function Ra$1(e, t, r, n, a) {
  let i = e.base, o = h(e, a), u = Number(n), c = u >= 0 && u.toString() === n || er$2(n);
  if (_(i, a)) c && u !== u ? ke$1(e, t.i, n, o) : Y$2(e, t.i, c ? n : '"' + n + '"', o);
  else {
    let l = i.assignments;
    i.assignments = r, c && u !== u ? ke$1(e, t.i, n, o) : Y$2(e, t.i, c ? n : '"' + n + '"', o), i.assignments = l;
  }
}
function ka$1(e, t, r, n, a) {
  if (typeof n == "string") Ra$1(e, t, r, n, a);
  else {
    let i = e.base, o = i.stack;
    i.stack = [];
    let u = h(e, a);
    i.stack = o;
    let c = i.assignments;
    i.assignments = r, Y$2(e, t.i, h(e, n), u), i.assignments = c;
  }
}
function xa$1(e, t, r) {
  let n = r.k, a = n.length;
  if (a > 0) {
    let i = [], o = r.v;
    e.base.stack.push(t.i);
    for (let u = 0; u < a; u++) ka$1(e, t, i, n[u], o[u]);
    return e.base.stack.pop(), tr$2(i);
  }
  return s;
}
function Ue$1(e, t, r) {
  if (t.p) {
    let n = e.base;
    if (n.features & 8) r = Ea$1(e, t, t.p, r);
    else {
      R(n, t.i);
      let a = xa$1(e, t, t.p);
      if (a) return "(" + M(e, t.i, r) + "," + a + m(e, t.i) + ")";
    }
  }
  return r;
}
function Aa$1(e, t) {
  return Ne$1(e, t.o, t.i), Ue$1(e, t, aa);
}
function $a$1(e) {
  return 'new Date("' + e.s + '")';
}
function Ta$1(e, t) {
  if (e.base.features & 32) return "/" + t.c + "/" + t.m;
  throw new N$1(t);
}
function Ke(e, t, r) {
  let n = e.base;
  return _(n, r) ? (R(n, t), ya$1(e, t, m(e, r.i)), "") : h(e, r);
}
function _a$1(e, t) {
  let r = ia$1, n = t.a, a = n.length, i = t.i;
  if (a > 0) {
    e.base.stack.push(i);
    let o = Ke(e, i, n[0]);
    for (let u = 1, c = o; u < a; u++) c = Ke(e, i, n[u]), o += (c && o && ",") + c;
    e.base.stack.pop(), o && (r += "([" + o + "])");
  }
  return r;
}
function Ze$1(e, t, r, n, a) {
  let i = e.base;
  if (_(i, r)) {
    let o = m(e, r.i);
    if (R(i, t), _(i, n)) {
      let c = m(e, n.i);
      return G(e, t, o, c), "";
    }
    if (n.t !== 4 && n.i != null && Re$1(i, n.i)) {
      let c = "(" + h(e, n) + ",[" + a + "," + a + "])";
      return G(e, t, o, m(e, n.i)), Xe$1(e, t, a), c;
    }
    let u = i.stack;
    return i.stack = [], G(e, t, o, h(e, n)), i.stack = u, "";
  }
  if (_(i, n)) {
    let o = m(e, n.i);
    if (R(i, t), r.t !== 4 && r.i != null && Re$1(i, r.i)) {
      let c = "(" + h(e, r) + ",[" + a + "," + a + "])";
      return G(e, t, m(e, r.i), o), Xe$1(e, t, a), c;
    }
    let u = i.stack;
    return i.stack = [], G(e, t, h(e, r), o), i.stack = u, "";
  }
  return "[" + h(e, r) + "," + h(e, n) + "]";
}
function Pa$1(e, t) {
  let r = oa$1, n = t.e.k, a = n.length, i = t.i, o = t.f, u = m(e, o.i), c = e.base;
  if (a > 0) {
    let l = t.e.v;
    c.stack.push(i);
    let p = Ze$1(e, i, n[0], l[0], u);
    for (let d = 1, v = p; d < a; d++) v = Ze$1(e, i, n[d], l[d], u), p += (v && p && ",") + v;
    c.stack.pop(), p && (r += "([" + p + "])");
  }
  return o.t === 26 && (R(c, o.i), r = "(" + h(e, o) + "," + r + ")"), r;
}
function za$1(e, t) {
  return D$1(e, t.f) + '("' + t.s + '")';
}
function Ca$1(e, t) {
  return "new " + t.c + "(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function Oa$1(e, t) {
  return "new DataView(" + h(e, t.f) + "," + t.b + "," + t.l + ")";
}
function Ia$1(e, t) {
  let r = t.i;
  e.base.stack.push(r);
  let n = Ue$1(e, t, 'new AggregateError([],"' + t.m + '")');
  return e.base.stack.pop(), n;
}
function Na$1(e, t) {
  return Ue$1(e, t, "new " + $t$2[t.s] + '("' + t.m + '")');
}
function Ua$1(e, t) {
  let r, n = t.f, a = t.i, i = t.s ? ua$1 : ca$1, o = e.base;
  if (_(o, n)) {
    let u = m(e, n.i);
    r = i + (t.s ? "().then(" + Kt$1([], u) + ")" : "().catch(" + ta$1([], "throw " + u) + ")");
  } else {
    o.stack.push(a);
    let u = h(e, n);
    o.stack.pop(), r = i + "(" + u + ")";
  }
  return r;
}
function Da$1(e, t) {
  return "Object(" + h(e, t.f) + ")";
}
function D$1(e, t) {
  let r = h(e, t);
  return t.t === 4 ? r : "(" + r + ")";
}
function La$1(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return "(" + M(e, t.s, D$1(e, t.f) + "()") + ").p";
}
function Ha$1(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return D$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function Fa$1(e, t) {
  if (e.mode === 1) throw new N$1(t);
  return D$1(e, t.a[0]) + "(" + m(e, t.i) + "," + h(e, t.a[1]) + ")";
}
function ja$1(e, t) {
  let r = e.base.plugins;
  if (r) for (let n = 0, a = r.length; n < a; n++) {
    let i = r[n];
    if (i.tag === t.c) return e.child == null && (e.child = new da$1(e)), i.serialize(t.s, e.child, { id: t.i });
  }
  throw new Dt$2(t.c);
}
function qa$1(e, t) {
  let r = "", n = false;
  return t.f.t !== 4 && (R(e.base, t.f.i), r = "(" + h(e, t.f) + ",", n = true), r += M(e, t.i, "(" + Bn$1 + ")(" + m(e, t.f.i) + ")"), n && (r += ")"), r;
}
function Ma$1(e, t) {
  return D$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Ga$1(e, t) {
  let r = t.a[0], n = t.a[1], a = e.base, i = "";
  r.t !== 4 && (R(a, r.i), i += "(" + h(e, r)), n.t !== 4 && (R(a, n.i), i += (i ? "," : "(") + h(e, n)), i && (i += ",");
  let o = M(e, t.i, "(" + Wn$1 + ")(" + m(e, n.i) + "," + m(e, r.i) + ")");
  return i ? i + o + ")" : o;
}
function Ba$1(e, t) {
  return D$1(e, t.a[0]) + "(" + h(e, t.a[1]) + ")";
}
function Wa$1(e, t) {
  let r = M(e, t.i, D$1(e, t.f) + "()"), n = t.a.length;
  if (n) {
    let a = h(e, t.a[0]);
    for (let i = 1; i < n; i++) a += "," + h(e, t.a[i]);
    return "(" + r + "," + a + "," + m(e, t.i) + ")";
  }
  return r;
}
function Va$1(e, t) {
  return m(e, t.i) + ".next(" + h(e, t.f) + ")";
}
function Xa$1(e, t) {
  return m(e, t.i) + ".throw(" + h(e, t.f) + ")";
}
function Ya$1(e, t) {
  return m(e, t.i) + ".return(" + h(e, t.f) + ")";
}
function Ja$1(e, t) {
  switch (t.t) {
    case 17:
      return Br$1[t.s];
    case 18:
      return wa$1(t);
    case 9:
      return va$1(e, t);
    case 10:
      return Sa$1(e, t);
    case 11:
      return Aa$1(e, t);
    case 5:
      return $a$1(t);
    case 6:
      return Ta$1(e, t);
    case 7:
      return _a$1(e, t);
    case 8:
      return Pa$1(e, t);
    case 19:
      return za$1(e, t);
    case 16:
    case 15:
      return Ca$1(e, t);
    case 20:
      return Oa$1(e, t);
    case 14:
      return Ia$1(e, t);
    case 13:
      return Na$1(e, t);
    case 12:
      return Ua$1(e, t);
    case 21:
      return Da$1(e, t);
    case 22:
      return La$1(e, t);
    case 25:
      return ja$1(e, t);
    case 26:
      return Kn[t.s];
    default:
      throw new N$1(t);
  }
}
function h(e, t) {
  switch (t.t) {
    case 2:
      return Vr$1[t.s];
    case 0:
      return "" + t.s;
    case 1:
      return '"' + t.s + '"';
    case 3:
      return t.s + "n";
    case 4:
      return m(e, t.i);
    case 23:
      return Ha$1(e, t);
    case 24:
      return Fa$1(e, t);
    case 27:
      return qa$1(e, t);
    case 28:
      return Ma$1(e, t);
    case 29:
      return Ga$1(e, t);
    case 30:
      return Ba$1(e, t);
    case 31:
      return Wa$1(e, t);
    case 32:
      return Va$1(e, t);
    case 33:
      return Xa$1(e, t);
    case 34:
      return Ya$1(e, t);
    default:
      return M(e, t.i, Ja$1(e, t));
  }
}
function Ka$1(e, t) {
  let r = h(e, t), n = t.i;
  if (n == null) return r;
  let a = ba$1(e.base), i = m(e, n), o = e.state.scopeId, u = o == null ? "" : ie$1, c = a ? "(" + r + "," + a + i + ")" : r;
  if (u === "") return t.t === 10 && !a ? "(" + c + ")" : c;
  let l = o == null ? "()" : "(" + ie$1 + '["' + k(o) + '"])';
  return "(" + Kt$1([u], c) + ")" + l;
}
var Za$1 = class Za {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return S(this._p, this.depth, e);
  }
}, Qa$1 = class Qa {
  constructor(e, t) {
    this._p = e, this.depth = t;
  }
  parse(e) {
    return S(this._p, this.depth, e);
  }
  parseWithError(e) {
    return O$1(this._p, this.depth, e);
  }
  isAlive() {
    return this._p.state.alive;
  }
  pushPendingState() {
    Fe$1(this._p);
  }
  popPendingState() {
    J$1(this._p);
  }
  onParse(e) {
    j$1(this._p, e);
  }
  onError(e) {
    Le$1(this._p, e);
  }
};
function ei$1(e) {
  return { alive: true, pending: 0, initial: true, buffer: [], onParse: e.onParse, onError: e.onError, onDone: e.onDone };
}
function ti$1(e) {
  return { type: 2, base: ss(2, e), state: ei$1(e) };
}
function ri$1(e, t, r) {
  let n = [];
  for (let a = 0, i = r.length; a < i; a++) a in r ? n[a] = S(e, t, r[a]) : n[a] = 0;
  return n;
}
function ni$1(e, t, r, n) {
  return bn$1(r, n, ri$1(e, t, n));
}
function De(e, t, r) {
  let n = Object.entries(r), a = [], i = [];
  for (let o = 0, u = n.length; o < u; o++) a.push(k(n[o][0])), i.push(S(e, t, n[o][1]));
  return A in r && (a.push(C(e.base, A)), i.push(xn$1(is(e.base), S(e, t, ts(r))))), x in r && (a.push(C(e.base, x)), i.push(An$1(os(e.base), S(e, t, e.type === 1 ? ee$2() : Zn$1(r))))), F in r && (a.push(C(e.base, F)), i.push(It$2(r[F]))), H$2 in r && (a.push(C(e.base, H$2)), i.push(r[H$2] ? Tt$2 : _t$2)), { k: a, v: i };
}
function de$1(e, t, r, n, a) {
  return us(r, n, a, De(e, t, n));
}
function si$1(e, t, r, n) {
  return yn$1(r, S(e, t, n.valueOf()));
}
function ai$1(e, t, r, n) {
  return wn$1(r, n, S(e, t, n.buffer));
}
function ii$1(e, t, r, n) {
  return vn$1(r, n, S(e, t, n.buffer));
}
function oi$1(e, t, r, n) {
  return Sn$1(r, n, S(e, t, n.buffer));
}
function Qe$1(e, t, r, n) {
  let a = Ct$2(n, e.base.features);
  return En$1(r, n, a ? De(e, t, a) : s);
}
function ui$1(e, t, r, n) {
  let a = Ct$2(n, e.base.features);
  return Rn$1(r, n, a ? De(e, t, a) : s);
}
function ci$1(e, t, r, n) {
  let a = [], i = [];
  for (let [o, u] of n.entries()) a.push(S(e, t, o)), i.push(S(e, t, u));
  return cs(e.base, r, a, i);
}
function li$1(e, t, r, n) {
  let a = [];
  for (let i of n.keys()) a.push(S(e, t, i));
  return kn(r, a);
}
function fi$1(e, t, r, n) {
  let a = $n$1(r, U$1(e.base, 4), []);
  return e.type === 1 || (Fe$1(e), n.on({ next: (i) => {
    if (e.state.alive) {
      let o = O$1(e, t, i);
      o && j$1(e, Tn$1(r, o));
    }
  }, throw: (i) => {
    if (e.state.alive) {
      let o = O$1(e, t, i);
      o && j$1(e, _n(r, o));
    }
    J$1(e);
  }, return: (i) => {
    if (e.state.alive) {
      let o = O$1(e, t, i);
      o && j$1(e, Pn$1(r, o));
    }
    J$1(e);
  } })), a;
}
function pi$1(e, t, r) {
  if (this.state.alive) {
    let n = O$1(this, t, r);
    n && j$1(this, g(23, e, s, s, s, s, s, [U$1(this.base, 2), n], s, s, s, s)), J$1(this);
  }
}
function di$1(e, t, r) {
  if (this.state.alive) {
    let n = O$1(this, t, r);
    n && j$1(this, g(24, e, s, s, s, s, s, [U$1(this.base, 3), n], s, s, s, s));
  }
  J$1(this);
}
function hi$1(e, t, r, n) {
  let a = Mt(e.base, {});
  return e.type === 2 && (Fe$1(e), n.then(pi$1.bind(e, a, t), di$1.bind(e, a, t))), ls(e.base, r, a);
}
function gi$1(e, t, r, n, a) {
  for (let i = 0, o = a.length; i < o; i++) {
    let u = a[i];
    if (u.parse.sync && u.test(n)) return Nt$2(r, u.tag, u.parse.sync(n, new Za$1(e, t), { id: r }));
  }
  return s;
}
function mi$1(e, t, r, n, a) {
  for (let i = 0, o = a.length; i < o; i++) {
    let u = a[i];
    if (u.parse.stream && u.test(n)) return Nt$2(r, u.tag, u.parse.stream(n, new Qa$1(e, t), { id: r }));
  }
  return s;
}
function sr$2(e, t, r, n) {
  let a = e.base.plugins;
  return a ? e.type === 1 ? gi$1(e, t, r, n, a) : mi$1(e, t, r, n, a) : s;
}
function bi$1(e, t, r, n, a) {
  switch (a) {
    case Object:
      return de$1(e, t, r, n, false);
    case s:
      return de$1(e, t, r, n, true);
    case Date:
      return dn(r, n);
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
  if (a === Promise || n instanceof Promise) return hi$1(e, t, r, n);
  let i = e.base.features;
  if (i & 32 && a === RegExp) return hn$1(r, n);
  if (i & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return ii$1(e, t, r, n);
  }
  if (i & 1 && typeof AggregateError < "u" && (a === AggregateError || n instanceof AggregateError)) return ui$1(e, t, r, n);
  if (n instanceof Error) return Qe$1(e, t, r, n);
  if (A in n || x in n) return de$1(e, t, r, n, !!a);
  throw new ce$2(n);
}
function yi$1(e, t, r, n) {
  if (Array.isArray(n)) return ni$1(e, t, r, n);
  if (fe$1(n)) return fi$1(e, t, r, n);
  let a = n.constructor;
  return a === Ln$1 ? S(e, t, n.replacement) : sr$2(e, t, r, n) || bi$1(e, t, r, n, a);
}
function wi$1(e, t, r) {
  let n = Ie$1(e.base, r);
  if (n.type !== 0) return n.value;
  let a = sr$2(e, t, n.value, r);
  if (a) return a;
  throw new ce$2(r);
}
function S(e, t, r) {
  if (t >= e.base.depthLimit) throw new Lt$2(e.base.depthLimit);
  switch (typeof r) {
    case "boolean":
      return r ? Tt$2 : _t$2;
    case "undefined":
      return Jr;
    case "string":
      return It$2(r);
    case "number":
      return ln$1(r);
    case "bigint":
      return fn(r);
    case "object": {
      if (r) {
        let n = Ie$1(e.base, r);
        return n.type === 0 ? yi$1(e, t + 1, n.value, r) : n.value;
      }
      return Kr$1;
    }
    case "symbol":
      return C(e.base, r);
    case "function":
      return wi$1(e, t, r);
    default:
      throw new ce$2(r);
  }
}
function j$1(e, t) {
  e.state.initial ? e.state.buffer.push(t) : He$1(e, t, false);
}
function Le$1(e, t) {
  if (e.state.onError) e.state.onError(t);
  else throw t instanceof Ge$1 ? t : new Ge$1(t);
}
function ar$2(e) {
  e.state.onDone && e.state.onDone();
}
function He$1(e, t, r) {
  try {
    e.state.onParse(t, r);
  } catch (n) {
    Le$1(e, n);
  }
}
function Fe$1(e) {
  e.state.pending++;
}
function J$1(e) {
  --e.state.pending <= 0 && ar$2(e);
}
function O$1(e, t, r) {
  try {
    return S(e, t, r);
  } catch (n) {
    return Le$1(e, n), s;
  }
}
function vi$1(e, t) {
  let r = O$1(e, 0, t);
  r && (He$1(e, r, true), e.state.initial = false, Si$1(e, e.state), e.state.pending <= 0 && ir$2(e));
}
function Si$1(e, t) {
  for (let r = 0, n = t.buffer.length; r < n; r++) He$1(e, t.buffer[r], false);
}
function ir$2(e) {
  e.state.alive && (ar$2(e), e.state.alive = false);
}
function Ei$1(e, t) {
  let r = Bt$2(t.plugins), n = ti$1({ plugins: r, refs: t.refs, disabledFeatures: t.disabledFeatures, onParse(a, i) {
    let o = pa$1({ plugins: r, features: n.base.features, scopeId: t.scopeId, markedRefs: n.base.marked }), u;
    try {
      u = Ka$1(o, a);
    } catch (c) {
      t.onError && t.onError(c);
      return;
    }
    t.onSerialize(u, i);
  }, onError: t.onError, onDone: t.onDone });
  return vi$1(n, e), ir$2.bind(null, n);
}
function et(e, t = {}) {
  var r;
  let n = Bt$2(t.plugins), a = t.disabledFeatures || 0, i = (r = e.f) != null ? r : 63, o = ws$1({ plugins: n, markedRefs: e.m, features: i & ~a, disabledFeatures: a });
  return Zs$1(o, e.t);
}
function he$1(e) {
  return { detail: e.detail, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var Ri$1 = { tag: "seroval-plugins/web/CustomEvent", test(e) {
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
} }, xe$1 = Ri$1, ki$1 = { tag: "seroval-plugins/web/DOMException", test(e) {
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
function me$1(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var V$1 = {}, or$2 = (e, t = new FormData(), r = 0, n = e.length, a) => {
  for (; r < n; r++) a = e[r], t.append(a[0], a[1]);
  return t;
}, Ti$1 = { tag: "seroval-plugins/web/FormDataFactory", test(e) {
  return e === V$1;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize() {
  return or$2.toString();
}, deserialize() {
  return V$1;
} }, _i$1 = { tag: "seroval-plugins/web/FormData", extends: [$i$1, Ti$1], test(e) {
  return typeof FormData > "u" ? false : e instanceof FormData;
}, parse: { sync(e, t) {
  return { factory: t.parse(V$1), entries: t.parse(me$1(e)) };
}, async async(e, t) {
  return { factory: await t.parse(V$1), entries: await t.parse(me$1(e)) };
}, stream(e, t) {
  return { factory: t.parse(V$1), entries: t.parse(me$1(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.entries) + ")";
}, deserialize(e, t) {
  return or$2(t.deserialize(e.entries));
} }, Te$1 = _i$1;
function be$1(e) {
  let t = [];
  return e.forEach((r, n) => {
    t.push([n, r]);
  }), t;
}
var Pi$1 = { tag: "seroval-plugins/web/Headers", test(e) {
  return typeof Headers > "u" ? false : e instanceof Headers;
}, parse: { sync(e, t) {
  return t.parse(be$1(e));
}, async async(e, t) {
  return await t.parse(be$1(e));
}, stream(e, t) {
  return t.parse(be$1(e));
} }, serialize(e, t) {
  return "new Headers(" + t.serialize(e) + ")";
}, deserialize(e, t) {
  return new Headers(t.deserialize(e));
} }, K$2 = Pi$1, X$1 = {}, ur$2 = (e) => new ReadableStream({ start: (t) => {
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
} }), zi$1 = { tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === X$1;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize() {
  return ur$2.toString();
}, deserialize() {
  return X$1;
} };
function tt(e) {
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
var Ci$1 = { tag: "seroval/plugins/web/ReadableStream", extends: [zi$1], test(e) {
  return typeof ReadableStream > "u" ? false : e instanceof ReadableStream;
}, parse: { sync(e, t) {
  return { factory: t.parse(X$1), stream: t.parse(ee$2()) };
}, async async(e, t) {
  return { factory: await t.parse(X$1), stream: await t.parse(tt(e)) };
}, stream(e, t) {
  return { factory: t.parse(X$1), stream: t.parse(tt(e)) };
} }, serialize(e, t) {
  return "(" + t.serialize(e.factory) + ")(" + t.serialize(e.stream) + ")";
}, deserialize(e, t) {
  let r = t.deserialize(e.stream);
  return ur$2(r);
} }, Z$1 = Ci$1;
function rt$1(e, t) {
  return { body: t, cache: e.cache, credentials: e.credentials, headers: e.headers, integrity: e.integrity, keepalive: e.keepalive, method: e.method, mode: e.mode, redirect: e.redirect, referrer: e.referrer, referrerPolicy: e.referrerPolicy };
}
var Oi$1 = { tag: "seroval-plugins/web/Request", extends: [Z$1, K$2], test(e) {
  return typeof Request > "u" ? false : e instanceof Request;
}, parse: { async async(e, t) {
  return { url: await t.parse(e.url), options: await t.parse(rt$1(e, e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null)) };
}, stream(e, t) {
  return { url: t.parse(e.url), options: t.parse(rt$1(e, e.body && !e.bodyUsed ? e.clone().body : null)) };
} }, serialize(e, t) {
  return "new Request(" + t.serialize(e.url) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Request(t.deserialize(e.url), t.deserialize(e.options));
} }, _e$1 = Oi$1;
function nt$1(e) {
  return { headers: e.headers, status: e.status, statusText: e.statusText };
}
var Ii$1 = { tag: "seroval-plugins/web/Response", extends: [Z$1, K$2], test(e) {
  return typeof Response > "u" ? false : e instanceof Response;
}, parse: { async async(e, t) {
  return { body: await t.parse(e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null), options: await t.parse(nt$1(e)) };
}, stream(e, t) {
  return { body: t.parse(e.body && !e.bodyUsed ? e.clone().body : null), options: t.parse(nt$1(e)) };
} }, serialize(e, t) {
  return "new Response(" + t.serialize(e.body) + "," + t.serialize(e.options) + ")";
}, deserialize(e, t) {
  return new Response(t.deserialize(e.body), t.deserialize(e.options));
} }, Pe$1 = Ii$1, Ni$1 = { tag: "seroval-plugins/web/URL", test(e) {
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
} }, ze = Ni$1, Ui$1 = { tag: "seroval-plugins/web/URLSearchParams", test(e) {
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
} }, Ce$1 = Ui$1;
function Di$1(e = {}) {
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
    it$1.add(l);
    try {
      const p = a ? a.run(o, u) : u();
      return r || (t = void 0), await p;
    } finally {
      it$1.delete(l);
    }
  } };
}
function Li$1(e = {}) {
  const t = {};
  return { get(r, n = {}) {
    return t[r] || (t[r] = Di$1({ ...e, ...n })), t[r];
  } };
}
const oe$2 = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, st$1 = "__unctx__", Hi$1 = oe$2[st$1] || (oe$2[st$1] = Li$1()), Fi$1 = (e, t = {}) => Hi$1.get(e, t), at$1 = "__unctx_async_handlers__", it$1 = oe$2[at$1] || (oe$2[at$1] = /* @__PURE__ */ new Set());
function ji$1(e) {
  let t;
  const r = lr$2(e), n = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(r, { ...n, body: e.node.req.body }) : new Request(r, { ...n, get body() {
    return t || (t = Ki$1(e), t);
  } });
}
function qi$1(e) {
  var _a2;
  return (_a2 = e.web) != null ? _a2 : e.web = { request: ji$1(e), url: lr$2(e) }, e.web.request;
}
function Mi$1() {
  return to$1();
}
const cr$2 = /* @__PURE__ */ Symbol("$HTTPEvent");
function Gi$1(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[cr$2]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function w(e) {
  return function(...t) {
    var _a2;
    let r = t[0];
    if (Gi$1(r)) t[0] = r instanceof H3Event || r.__is_event__ ? r : r[cr$2];
    else {
      if (!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (r = Mi$1(), !r) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(r);
    }
    return e(...t);
  };
}
const lr$2 = w(getRequestURL), Bi$1 = w(getRequestIP), ue$2 = w(setResponseStatus), ot$1 = w(getResponseStatus), Wi$1 = w(getResponseStatusText), se$2 = w(getResponseHeaders), ut$2 = w(getResponseHeader), Vi$1 = w(setResponseHeader), fr$2 = w(appendResponseHeader), Xi$1 = w(parseCookies), Yi$1 = w(getCookie), Ji$1 = w(setCookie), ae$2 = w(setHeader), Ki$1 = w(getRequestWebStream), Zi$1 = w(removeResponseHeader), Qi$1 = w(qi$1);
function eo$1() {
  var _a2;
  return Fi$1("nitro-app", { asyncContext: !!((_a2 = globalThis.app.config.server.experimental) == null ? void 0 : _a2.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function to$1() {
  return eo$1().use().event;
}
const ye$1 = "Invariant Violation", { setPrototypeOf: ro$1 = function(e, t) {
  return e.__proto__ = t, e;
} } = Object;
let je$1 = class je extends Error {
  constructor(t = ye$1) {
    super(typeof t == "number" ? `${ye$1}: ${t} (see https://github.com/apollographql/invariant-packages)` : t);
    __publicField$2(this, "framesToPop", 1);
    __publicField$2(this, "name", ye$1);
    ro$1(this, je.prototype);
  }
};
function no$1(e, t) {
  if (!e) throw new je$1(t);
}
const we$1 = "solidFetchEvent";
function so$1(e) {
  return { request: Qi$1(e), response: uo$1(e), clientAddress: Bi$1(e), locals: {}, nativeEvent: e };
}
function ao$1(e) {
  return { ...e };
}
function io$1(e) {
  if (!e.context[we$1]) {
    const t = so$1(e);
    e.context[we$1] = t;
  }
  return e.context[we$1];
}
function ct$1(e, t) {
  for (const [r, n] of t.entries()) fr$2(e, r, n);
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
    fr$2(this.event, t, r);
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
    return Wi$1(e);
  }, set statusText(t) {
    ue$2(e, ot$1(e), t);
  }, headers: new oo$1(e) };
}
const q$2 = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function co$1(e = {}) {
  const t = { options: e, rootNode: pr$2(), staticRoutesMap: {} }, r = (n) => e.strictTrailingSlash ? n : n.replace(/\/$/, "") || "/";
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
      l = pr$2({ type: p, parent: i }), i.children.set(c, l), p === q$2.PLACEHOLDER ? (l.paramName = c === "*" ? `_${o++}` : c.slice(1), i.placeholderChildren.push(l), n = false) : p === q$2.WILDCARD && (i.wildcardChildNode = l, l.paramName = c.slice(3) || "_", n = false), u.push(l), i = l;
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
function pr$2(e = {}) {
  return { type: e.type || q$2.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function po$1(e) {
  return e.startsWith("**") ? q$2.WILDCARD : e[0] === ":" || e === "*" ? q$2.PLACEHOLDER : q$2.NORMAL;
}
const dr$1 = [{ page: true, $component: { src: "src/routes/agents/index.tsx?pick=default&pick=$css", build: () => import('../build/index.mjs'), import: () => import('../build/index.mjs') }, path: "/agents/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/agents/index.tsx" }, { page: false, $GET: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_.mjs'), import: () => import('../build/_...path_.mjs') }, $HEAD: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_.mjs'), import: () => import('../build/_...path_.mjs') }, $POST: { src: "src/routes/api/[...path].ts?pick=POST", build: () => import('../build/_...path_2.mjs'), import: () => import('../build/_...path_2.mjs') }, path: "/api/*path", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/api/[...path].ts" }, { page: false, $GET: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health.mjs'), import: () => import('../build/health.mjs') }, $HEAD: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health.mjs'), import: () => import('../build/health.mjs') }, path: "/api/health", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/api/health.ts" }, { page: false, $GET: { src: "src/routes/auth/authorize.ts?pick=GET", build: () => import('../build/authorize.mjs'), import: () => import('../build/authorize.mjs') }, $HEAD: { src: "src/routes/auth/authorize.ts?pick=GET", build: () => import('../build/authorize.mjs'), import: () => import('../build/authorize.mjs') }, path: "/auth/authorize", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/authorize.ts" }, { page: false, $GET: { src: "src/routes/auth/callback.ts?pick=GET", build: () => import('../build/callback.mjs'), import: () => import('../build/callback.mjs') }, $HEAD: { src: "src/routes/auth/callback.ts?pick=GET", build: () => import('../build/callback.mjs'), import: () => import('../build/callback.mjs') }, path: "/auth/callback", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/callback.ts" }, { page: true, $component: { src: "src/routes/auth/login.tsx?pick=default&pick=$css", build: () => import('../build/login.mjs'), import: () => import('../build/login.mjs') }, path: "/auth/login", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/login.tsx" }, { page: false, $POST: { src: "src/routes/auth/logout.ts?pick=POST", build: () => import('../build/logout.mjs'), import: () => import('../build/logout.mjs') }, path: "/auth/logout", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/logout.ts" }, { page: false, $POST: { src: "src/routes/auth/refresh.ts?pick=POST", build: () => import('../build/refresh.mjs'), import: () => import('../build/refresh.mjs') }, path: "/auth/refresh", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/refresh.ts" }, { page: false, $GET: { src: "src/routes/auth/status.ts?pick=GET", build: () => import('../build/status.mjs'), import: () => import('../build/status.mjs') }, $HEAD: { src: "src/routes/auth/status.ts?pick=GET", build: () => import('../build/status.mjs'), import: () => import('../build/status.mjs') }, path: "/auth/status", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/status.ts" }, { page: true, $component: { src: "src/routes/index.tsx?pick=default&pick=$css", build: () => import('../build/index2.mjs'), import: () => import('../build/index2.mjs') }, path: "/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/index.tsx" }, { page: true, $component: { src: "src/routes/models/index.tsx?pick=default&pick=$css", build: () => import('../build/index3.mjs'), import: () => import('../build/index3.mjs') }, path: "/models/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/models/index.tsx" }, { page: true, $component: { src: "src/routes/session/[id].tsx?pick=default&pick=$css", build: () => import('../build/_id_.mjs'), import: () => import('../build/_id_.mjs') }, path: "/session/:id", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/session/[id].tsx" }, { page: true, $component: { src: "src/routes/settings/api-keys.tsx?pick=default&pick=$css", build: () => import('../build/api-keys.mjs'), import: () => import('../build/api-keys.mjs') }, path: "/settings/api-keys", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/settings/api-keys.tsx" }, { page: true, $component: { src: "src/routes/settings/index.tsx?pick=default&pick=$css", build: () => import('../build/index4.mjs'), import: () => import('../build/index4.mjs') }, path: "/settings/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/settings/index.tsx" }], ho$1 = go$1(dr$1.filter((e) => e.page));
function go$1(e) {
  function t(r, n, a, i) {
    const o = Object.values(r).find((u) => a.startsWith(u.id + "/"));
    return o ? (t(o.children || (o.children = []), n, a.slice(o.id.length)), r) : (r.push({ ...n, id: a, path: a.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), r);
  }
  return e.sort((r, n) => r.path.length - n.path.length).reduce((r, n) => t(r, n, n.path, n.path), []);
}
function mo(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
co$1({ routes: dr$1.reduce((e, t) => {
  if (!mo(t)) return e;
  let r = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (n, a) => `**:${a}`).split("/").map((n) => n.startsWith(":") || n.startsWith("*") ? n : encodeURIComponent(n)).join("/");
  if (/:[^/]*\?/g.test(r)) throw new Error(`Optional parameters are not supported in API routes: ${r}`);
  if (e[r]) throw new Error(`Duplicate API routes for "${r}" found at "${e[r].route.path}" and "${t.path}"`);
  return e[r] = { route: t }, e;
}, {}) });
var yo$1 = " ";
const wo$1 = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(yo$1), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function vo$1(e, t) {
  let { tag: r, attrs: { key: n, ...a } = { key: void 0 }, children: i } = e;
  return wo$1[r]({ attrs: { ...a, nonce: t }, key: n, children: i });
}
function So(e, t, r, n = "default") {
  return lazy(async () => {
    var _a2;
    {
      const i = (await e.import())[n], u = (await ((_a2 = t.inputs) == null ? void 0 : _a2[e.src].assets())).filter((l) => l.tag === "style" || l.attrs.rel === "stylesheet");
      return { default: (l) => [...u.map((p) => vo$1(p)), createComponent(i, l)] };
    }
  });
}
function hr$2() {
  function e(r) {
    return { ...r, ...r.$$route ? r.$$route.require().route : void 0, info: { ...r.$$route ? r.$$route.require().route.info : {}, filesystem: true }, component: r.$component && So(r.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: r.children ? r.children.map(e) : void 0 };
  }
  return ho$1.map(e);
}
let ft$2;
const Lo$1 = isServer ? () => getRequestEvent().routes : () => ft$2 || (ft$2 = hr$2());
function Eo$1(e) {
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
async function Ro$1(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, e.response.headers.set("Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], router: { submission: Eo$1(e) }, routes: hr$2(), complete: false, $islands: /* @__PURE__ */ new Set() });
}
const ko$1 = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function xo(e) {
  return e.status && ko$1.has(e.status) ? e.status : 302;
}
const Ao$1 = {};
function $o$1(e) {
  const t = new TextEncoder().encode(e), r = t.length, n = r.toString(16), a = "00000000".substring(0, 8 - n.length) + n, i = new TextEncoder().encode(`;0x${a};`), o = new Uint8Array(12 + r);
  return o.set(i), o.set(t, 12), o;
}
function pt$2(e, t) {
  return new ReadableStream({ start(r) {
    Ei$1(t, { scopeId: e, plugins: [xe$1, Ae$1, $e$1, Te$1, K$2, Z$1, _e$1, Pe$1, Ce$1, ze], onSerialize(n, a) {
      r.enqueue($o$1(a ? `(${sn$1(e)},${n})` : n));
    }, onDone() {
      r.close();
    }, onError(n) {
      r.error(n);
    } });
  } });
}
async function To$1(e) {
  const t = io$1(e), r = t.request, n = r.headers.get("X-Server-Id"), a = r.headers.get("X-Server-Instance"), i = r.headers.has("X-Single-Flight"), o = new URL(r.url);
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
      const E = JSON.parse(f);
      (E.t ? et(E, { plugins: [xe$1, Ae$1, $e$1, Te$1, K$2, Z$1, _e$1, Pe$1, Ce$1, ze] }) : E).forEach((te) => v.push(te));
    }
  }
  if (e.method === "POST") {
    const f = r.headers.get("content-type"), E = e.node.req, te = E instanceof ReadableStream, gr = E.body instanceof ReadableStream, qe = te && E.locked || gr && E.body.locked, Me = te ? E : E.body;
    if ((f == null ? void 0 : f.startsWith("multipart/form-data")) || (f == null ? void 0 : f.startsWith("application/x-www-form-urlencoded"))) v.push(await (qe ? r : new Request(r, { ...r, body: Me })).formData());
    else if (f == null ? void 0 : f.startsWith("application/json")) {
      const mr = qe ? r : new Request(r, { ...r, body: Me });
      v = et(await mr.json(), { plugins: [xe$1, Ae$1, $e$1, Te$1, K$2, Z$1, _e$1, Pe$1, Ce$1, ze] });
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
      const E = f instanceof Error ? f.message : typeof f == "string" ? f : "true";
      ae$2(e, "X-Error", E.replace(/[\r\n]+/g, ""));
    } else f = dt$2(f, r, v, true);
    return a ? (ae$2(e, "content-type", "text/javascript"), pt$2(a, f)) : f;
  }
}
function dt$2(e, t, r, n) {
  const a = new URL(t.url), i = e instanceof Error;
  let o = 302, u;
  return e instanceof Response ? (u = new Headers(e.headers), e.headers.has("Location") && (u.set("Location", new URL(e.headers.get("Location"), a.origin + "").toString()), o = xo(e))) : u = new Headers({ Location: new URL(t.headers.get("referer")).toString() }), e && u.append("Set-Cookie", `flash=${encodeURIComponent(JSON.stringify({ url: a.pathname + a.search, result: i ? e.message : e, thrown: n, error: i, input: [...r.slice(0, -1), [...r[r.length - 1].entries()]] }))}; Secure; HttpOnly;`), new Response(null, { status: o, headers: u });
}
let ve$1;
function _o$1(e) {
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
  return a.request = new Request(n, { headers: _o$1(e) }), await provideRequestEvent(a, async () => {
    await Ro$1(a), ve$1 || (ve$1 = (await import('../build/app-DO67LHOs.mjs')).default), a.router.dataOnly = r || true, a.router.previousUrl = e.request.headers.get("referer");
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
const Ho$1 = eventHandler(To$1);

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
function ds() {
  let e = /* @__PURE__ */ new Set();
  function t(r) {
    return e.add(r), () => e.delete(r);
  }
  let n = false;
  function o(r, s) {
    if (n) return !(n = false);
    const i = { to: r, options: s, defaultPrevented: false, preventDefault: () => i.defaultPrevented = true };
    for (const l of e) l.listener({ ...i, from: l.location, retry: (a) => {
      a && (n = true), l.navigate(r, { ...s, resolve: false });
    } });
    return !i.defaultPrevented;
  }
  return { subscribe: t, confirm: o };
}
let tn;
function Eo() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), tn = window.history.state._depth;
}
isServer || Eo();
function sc(e) {
  return { ...e, _depth: window.history.state && window.history.state._depth };
}
function ic(e, t) {
  let n = false;
  return () => {
    const o = tn;
    Eo();
    const r = o == null ? null : tn - o;
    if (n) {
      n = false;
      return;
    }
    r && t(r) ? (n = true, window.history.go(-r)) : e();
  };
}
const fs = /^(?:[a-z0-9]+:)?\/\//i, gs = /^\/+|(\/)\/+$/g, ps = "http://sr";
function ut$1(e, t = false) {
  const n = e.replace(gs, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function Tt$1(e, t, n) {
  if (fs.test(t)) return;
  const o = ut$1(e), r = n && ut$1(n);
  let s = "";
  return !r || t.startsWith("/") ? s = o : r.toLowerCase().indexOf(o.toLowerCase()) !== 0 ? s = o + r : s = r, (s || "/") + ut$1(t, !s);
}
function hs(e, t) {
  if (e == null) throw new Error(t);
  return e;
}
function ms(e, t) {
  return ut$1(e).replace(/\/*(\*.*)?$/g, "") + ut$1(t);
}
function Po(e) {
  const t = {};
  return e.searchParams.forEach((n, o) => {
    o in t ? Array.isArray(t[o]) ? t[o].push(n) : t[o] = [t[o], n] : t[o] = n;
  }), t;
}
function ys(e, t, n) {
  const [o, r] = e.split("/*", 2), s = o.split("/").filter(Boolean), i = s.length;
  return (l) => {
    const a = l.split("/").filter(Boolean), c = a.length - i;
    if (c < 0 || c > 0 && r === void 0 && !t) return null;
    const u = { path: i ? "" : "/", params: {} }, d = (f) => n === void 0 ? void 0 : n[f];
    for (let f = 0; f < i; f++) {
      const g = s[f], p = g[0] === ":", y = p ? a[f] : a[f].toLowerCase(), h = p ? g.slice(1) : g.toLowerCase();
      if (p && Gt$1(y, d(h))) u.params[h] = y;
      else if (p || !Gt$1(y, h)) return null;
      u.path += `/${y}`;
    }
    if (r) {
      const f = c ? a.slice(-c).join("/") : "";
      if (Gt$1(f, d(r))) u.params[r] = f;
      else return null;
    }
    return u;
  };
}
function Gt$1(e, t) {
  const n = (o) => o === e;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function bs(e) {
  const [t, n] = e.pattern.split("/*", 2), o = t.split("/").filter(Boolean);
  return o.reduce((r, s) => r + (s.startsWith(":") ? 2 : 3), o.length - (n === void 0 ? 0 : 1));
}
function To(e) {
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
function Oo(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let n = e.slice(0, t.index), o = e.slice(t.index + t[0].length);
  const r = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(o); ) r.push(n += t[1]), o = o.slice(t[0].length);
  return Oo(o).reduce((s, i) => [...s, ...r.map((l) => l + i)], []);
}
const vs = 100, ws = createContext$1(), Do = createContext$1(), pt$1 = () => hs(useContext(ws), "<A> and 'use' router primitives can be only used inside a Route."), xs = () => useContext(Do) || pt$1().base, lc = (e) => {
  const t = xs();
  return createMemo(() => t.resolvePath(e()));
}, ac = (e) => {
  const t = pt$1();
  return createMemo(() => {
    const n = e();
    return n !== void 0 ? t.renderPath(n) : n;
  });
}, cc = () => pt$1().navigatorFactory(), uc = () => pt$1().location, dc = () => pt$1().params;
function Ss(e, t = "") {
  const { component: n, preload: o, load: r, children: s, info: i } = e, l = !s || Array.isArray(s) && !s.length, a = { key: e, component: n, preload: o || r, info: i };
  return Ao(e.path).reduce((c, u) => {
    for (const d of Oo(u)) {
      const f = ms(t, d);
      let g = l ? f : f.split("/*", 1)[0];
      g = g.split("/").map((p) => p.startsWith(":") || p.startsWith("*") ? p : encodeURIComponent(p)).join("/"), c.push({ ...a, originalPath: u, pattern: g, matcher: ys(g, !l, e.matchFilters) });
    }
    return c;
  }, []);
}
function Cs(e, t = 0) {
  return { routes: e, score: bs(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const o = [];
    for (let r = e.length - 1; r >= 0; r--) {
      const s = e[r], i = s.matcher(n);
      if (!i) return null;
      o.unshift({ ...i, route: s });
    }
    return o;
  } };
}
function Ao(e) {
  return Array.isArray(e) ? e : [e];
}
function Es(e, t = "", n = [], o = []) {
  const r = Ao(e);
  for (let s = 0, i = r.length; s < i; s++) {
    const l = r[s];
    if (l && typeof l == "object") {
      l.hasOwnProperty("path") || (l.path = "");
      const a = Ss(l, t);
      for (const c of a) {
        n.push(c);
        const u = Array.isArray(l.children) && l.children.length === 0;
        if (l.children && !u) Es(l.children, c.pattern, n, o);
        else {
          const d = Cs([...n], o.length);
          o.push(d);
        }
        n.pop();
      }
    }
  }
  return n.length ? o : o.sort((s, i) => i.score - s.score);
}
function qt$1(e, t) {
  for (let n = 0, o = e.length; n < o; n++) {
    const r = e[n].matcher(t);
    if (r) return r;
  }
  return [];
}
function Ps(e, t, n) {
  const o = new URL(ps), r = createMemo((u) => {
    const d = e();
    try {
      return new URL(d, o);
    } catch {
      return console.error(`Invalid path ${d}`), u;
    }
  }, o, { equals: (u, d) => u.href === d.href }), s = createMemo(() => r().pathname), i = createMemo(() => r().search, true), l = createMemo(() => r().hash), a = () => "", c = on$2(i, () => Po(r()));
  return { get pathname() {
    return s();
  }, get search() {
    return i();
  }, get hash() {
    return l();
  }, get state() {
    return t();
  }, get key() {
    return a();
  }, query: n ? n(c) : To(c) };
}
let Ve;
function fc() {
  return Ve;
}
function gc(e, t, n, o = {}) {
  const { signal: [r, s], utils: i = {} } = e, l = i.parsePath || ((O) => O), a = i.renderPath || ((O) => O), c = i.beforeLeave || ds(), u = Tt$1("", o.base || "");
  if (u === void 0) throw new Error(`${u} is not a valid base path`);
  u && !r().value && s({ value: u, replace: true, scroll: false });
  const [d, f] = createSignal(false);
  let g;
  const p = (O, D) => {
    D.value === y() && D.state === b() || (g === void 0 && f(true), Ve = O, g = D, startTransition(() => {
      g === D && (h(g.value), m(g.state), resetErrorBoundaries(), isServer || C[1]((z) => z.filter(($) => $.pending)));
    }).finally(() => {
      g === D && batch(() => {
        Ve = void 0, O === "navigate" && T(g), f(false), g = void 0;
      });
    }));
  }, [y, h] = createSignal(r().value), [b, m] = createSignal(r().state), w = Ps(y, b, i.queryWrapper), x = [], C = createSignal(isServer ? L() : []), I = createMemo(() => typeof o.transformUrl == "function" ? qt$1(t(), o.transformUrl(w.pathname)) : qt$1(t(), w.pathname)), P = () => {
    const O = I(), D = {};
    for (let z = 0; z < O.length; z++) Object.assign(D, O[z].params);
    return D;
  }, E = i.paramsWrapper ? i.paramsWrapper(P, t) : To(P), M = { pattern: u, path: () => u, outlet: () => null, resolvePath(O) {
    return Tt$1(u, O);
  } };
  return createRenderEffect(on$2(r, (O) => p("native", O), { defer: true })), { base: M, location: w, params: E, isRouting: d, renderPath: a, parsePath: l, navigatorFactory: U, matches: I, beforeLeave: c, preloadRoute: X, singleFlight: o.singleFlight === void 0 ? true : o.singleFlight, submissions: C };
  function _(O, D, z) {
    untrack(() => {
      if (typeof D == "number") {
        D && (i.go ? i.go(D) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const $ = !D || D[0] === "?", { replace: G, resolve: te, scroll: J, state: Oe } = { replace: false, resolve: !$, scroll: true, ...z }, De = te ? O.resolvePath(D) : Tt$1($ && w.pathname || "", D);
      if (De === void 0) throw new Error(`Path '${D}' is not a routable path`);
      if (x.length >= vs) throw new Error("Too many redirects");
      const xt = y();
      if (De !== xt || Oe !== b()) if (isServer) {
        const et = getRequestEvent();
        et && (et.response = { status: 302, headers: new Headers({ Location: De }) }), s({ value: De, replace: G, scroll: J, state: Oe });
      } else c.confirm(De, z) && (x.push({ value: xt, replace: G, scroll: J, state: b() }), p("navigate", { value: De, state: Oe }));
    });
  }
  function U(O) {
    return O = O || useContext(Do) || M, (D, z) => _(O, D, z);
  }
  function T(O) {
    const D = x[0];
    D && (s({ ...O, replace: D.replace, scroll: D.scroll }), x.length = 0);
  }
  function X(O, D) {
    const z = qt$1(t(), O.pathname), $ = Ve;
    Ve = "preload";
    for (let G in z) {
      const { route: te, params: J } = z[G];
      te.component && te.component.preload && te.component.preload();
      const { preload: Oe } = te;
      D && Oe && runWithOwner(n(), () => Oe({ params: J, location: { pathname: O.pathname, search: O.search, hash: O.hash, query: Po(O), state: null, key: "" }, intent: "preload" }));
    }
    Ve = $;
  }
  function L() {
    const O = getRequestEvent();
    return O && O.router && O.router.submission ? [O.router.submission] : [];
  }
}
function pc(e, t, n, o) {
  const { base: r, location: s, params: i } = e, { pattern: l, component: a, preload: c } = o().route, u = createMemo(() => o().path);
  a && a.preload && a.preload();
  const d = c ? c({ params: i, location: s, intent: Ve || "initial" }) : void 0;
  return { parent: t, pattern: l, path: u, outlet: () => a ? createComponent(a, { params: i, location: s, data: d, get children() {
    return n();
  } }) : n(), resolvePath(g) {
    return Tt$1(r.path(), g, u());
  } };
}
const Ts = !isServer, Os = Ts && !!DEV;
const v = (e) => typeof e == "function" && !e.length ? e() : e, Rn = (e) => Array.isArray(e) ? e : e ? [e] : [];
function Ds(e, ...t) {
  return typeof e == "function" ? e(...t) : e;
}
const As = Os ? (e) => getOwner() ? onCleanup(e) : e : onCleanup;
function Ls(e, t, n, o) {
  return e.addEventListener(t, n, o), As(e.removeEventListener.bind(e, t, n, o));
}
function Is(e, t, n, o) {
  if (isServer) return;
  const r = () => {
    Rn(v(e)).forEach((s) => {
      s && Rn(v(t)).forEach((i) => Ls(s, i, n, o));
    });
  };
  typeof e == "function" ? createEffect(r) : createRenderEffect(r);
}
const Yt$1 = /* @__PURE__ */ Symbol("fallback");
function Nn(e) {
  for (const t of e) t.dispose();
}
function ks(e, t, n, o = {}) {
  if (isServer) {
    const i = e();
    let l = [];
    if (i && i.length) for (let a = 0, c = i.length; a < c; a++) l.push(n(() => i[a], () => a));
    else o.fallback && (l = [o.fallback()]);
    return () => l;
  }
  const r = /* @__PURE__ */ new Map();
  return onCleanup(() => Nn(r.values())), () => {
    const i = e() || [];
    return i[$TRACK], untrack(() => {
      var _a2, _b;
      if (!i.length) return Nn(r.values()), r.clear(), o.fallback ? [createRoot((d) => (r.set(Yt$1, { dispose: d }), o.fallback()))] : [];
      const l = new Array(i.length), a = r.get(Yt$1);
      if (!r.size || a) {
        a == null ? void 0 : a.dispose(), r.delete(Yt$1);
        for (let u = 0; u < i.length; u++) {
          const d = i[u], f = t(d, u);
          s(l, d, u, f);
        }
        return l;
      }
      const c = new Set(r.keys());
      for (let u = 0; u < i.length; u++) {
        const d = i[u], f = t(d, u);
        c.delete(f);
        const g = r.get(f);
        g ? (l[u] = g.mapped, (_a2 = g.setIndex) == null ? void 0 : _a2.call(g, u), g.setItem(() => d)) : s(l, d, u, f);
      }
      for (const u of c) (_b = r.get(u)) == null ? void 0 : _b.dispose(), r.delete(u);
      return l;
    });
  };
  function s(i, l, a, c) {
    createRoot((u) => {
      const [d, f] = createSignal(l), g = { setItem: f, dispose: u };
      if (n.length > 1) {
        const [p, y] = createSignal(a);
        g.setIndex = y, g.mapped = n(d, p);
      } else g.mapped = n(d);
      r.set(c, g), i[a] = g.mapped;
    });
  }
}
function Fs(e) {
  const { by: t } = e;
  return createMemo(ks(() => e.each, typeof t == "function" ? t : (n) => n[t], e.children, "fallback" in e ? { fallback: () => e.fallback } : void 0));
}
const Ks = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
function Vn(e) {
  const t = {};
  let n;
  for (; n = Ks.exec(e); ) t[n[1]] = n[2];
  return t;
}
function ht$1(e, t) {
  if (typeof e == "string") {
    if (typeof t == "string") return `${e};${t}`;
    e = Vn(e);
  } else typeof t == "string" && (t = Vn(t));
  return { ...e, ...t };
}
function Bn(e, t) {
  const n = [...e], o = n.indexOf(t);
  return o !== -1 && n.splice(o, 1), n;
}
function Ms(e) {
  return typeof e == "number";
}
function He(e) {
  return Object.prototype.toString.call(e) === "[object String]";
}
function gn(e) {
  return typeof e == "function";
}
function Xe(e) {
  return (t) => `${e()}-${t}`;
}
function me(e, t) {
  return e ? e === t || e.contains(t) : false;
}
function it(e, t = false) {
  const { activeElement: n } = ue$1(e);
  if (!(n == null ? void 0 : n.nodeName)) return null;
  if (Io(n) && n.contentDocument) return it(n.contentDocument.body, t);
  if (t) {
    const o = n.getAttribute("aria-activedescendant");
    if (o) {
      const r = ue$1(n).getElementById(o);
      if (r) return r;
    }
  }
  return n;
}
function Lo(e) {
  return ue$1(e).defaultView || window;
}
function ue$1(e) {
  return e ? e.ownerDocument || e : document;
}
function Io(e) {
  return e.tagName === "IFRAME";
}
var ko = ((e) => (e.Escape = "Escape", e.Enter = "Enter", e.Tab = "Tab", e.Space = " ", e.ArrowDown = "ArrowDown", e.ArrowLeft = "ArrowLeft", e.ArrowRight = "ArrowRight", e.ArrowUp = "ArrowUp", e.End = "End", e.Home = "Home", e.PageDown = "PageDown", e.PageUp = "PageUp", e))(ko || {});
function q$1(e, t) {
  return t && (gn(t) ? t(e) : t[0](t[1], e)), e == null ? void 0 : e.defaultPrevented;
}
function ce$1(e) {
  return (t) => {
    for (const n of e) q$1(t, n);
  };
}
function $s(e) {
  return e.ctrlKey && !e.metaKey;
}
function ee$1(e) {
  if (e) if (Ws()) e.focus({ preventScroll: true });
  else {
    const t = Us(e);
    e.focus(), Hs(t);
  }
}
var St$1 = null;
function Ws() {
  if (St$1 == null) {
    St$1 = false;
    try {
      document.createElement("div").focus({ get preventScroll() {
        return St$1 = true, true;
      } });
    } catch {
    }
  }
  return St$1;
}
function Us(e) {
  let t = e.parentNode;
  const n = [], o = document.scrollingElement || document.documentElement;
  for (; t instanceof HTMLElement && t !== o; ) (t.offsetHeight < t.scrollHeight || t.offsetWidth < t.scrollWidth) && n.push({ element: t, scrollTop: t.scrollTop, scrollLeft: t.scrollLeft }), t = t.parentNode;
  return o instanceof HTMLElement && n.push({ element: o, scrollTop: o.scrollTop, scrollLeft: o.scrollLeft }), n;
}
function Hs(e) {
  for (const { element: t, scrollTop: n, scrollLeft: o } of e) t.scrollTop = n, t.scrollLeft = o;
}
var Ko = ["input:not([type='hidden']):not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "button:not([disabled])", "a[href]", "area[href]", "[tabindex]", "iframe", "object", "embed", "audio[controls]", "video[controls]", "[contenteditable]:not([contenteditable='false'])"], js = [...Ko, '[tabindex]:not([tabindex="-1"]):not([disabled])'], hn = `${Ko.join(":not([hidden]),")},[tabindex]:not([disabled]):not([hidden])`, Gs = js.join(':not([hidden]):not([tabindex="-1"]),');
function Mo(e, t) {
  const o = Array.from(e.querySelectorAll(hn)).filter(zn);
  return t && zn(e) && o.unshift(e), o.forEach((r, s) => {
    if (Io(r) && r.contentDocument) {
      const i = r.contentDocument.body, l = Mo(i, false);
      o.splice(s, 1, ...l);
    }
  }), o;
}
function zn(e) {
  return Ro(e) && !qs(e);
}
function Ro(e) {
  return e.matches(hn) && mn(e);
}
function qs(e) {
  return Number.parseInt(e.getAttribute("tabindex") || "0", 10) < 0;
}
function mn(e, t) {
  return e.nodeName !== "#comment" && Ys(e) && Xs(e, t) && (!e.parentElement || mn(e.parentElement, e));
}
function Ys(e) {
  if (!(e instanceof HTMLElement) && !(e instanceof SVGElement)) return false;
  const { display: t, visibility: n } = e.style;
  let o = t !== "none" && n !== "hidden" && n !== "collapse";
  if (o) {
    if (!e.ownerDocument.defaultView) return o;
    const { getComputedStyle: r } = e.ownerDocument.defaultView, { display: s, visibility: i } = r(e);
    o = s !== "none" && i !== "hidden" && i !== "collapse";
  }
  return o;
}
function Xs(e, t) {
  return !e.hasAttribute("hidden") && (e.nodeName === "DETAILS" && t && t.nodeName !== "SUMMARY" ? e.hasAttribute("open") : true);
}
function Zs(e, t, n) {
  const o = (t == null ? void 0 : t.tabbable) ? Gs : hn, r = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, { acceptNode(s) {
    var _a2;
    return ((_a2 = t == null ? void 0 : t.from) == null ? void 0 : _a2.contains(s)) ? NodeFilter.FILTER_REJECT : s.matches(o) && mn(s) && (!(t == null ? void 0 : t.accept) || t.accept(s)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } });
  return (t == null ? void 0 : t.from) && (r.currentNode = t.from), r;
}
function Js() {
}
function Qs(e) {
  return [e.clientX, e.clientY];
}
function ei(e, t) {
  const [n, o] = e;
  let r = false;
  const s = t.length;
  for (let i = s, l = 0, a = i - 1; l < i; a = l++) {
    const [c, u] = t[l], [d, f] = t[a], [, g] = t[a === 0 ? i - 1 : a - 1] || [0, 0], p = (u - f) * (n - c) - (c - d) * (o - u);
    if (f < u) {
      if (o >= f && o < u) {
        if (p === 0) return true;
        p > 0 && (o === f ? o > g && (r = !r) : r = !r);
      }
    } else if (u < f) {
      if (o > u && o <= f) {
        if (p === 0) return true;
        p < 0 && (o === f ? o < g && (r = !r) : r = !r);
      }
    } else if (o === u && (n >= d && n <= c || n >= c && n <= d)) return true;
  }
  return r;
}
function j(e, t) {
  return mergeProps$1(e, t);
}
function $n() {
  return;
}
typeof document < "u" && (document.readyState !== "loading" ? $n() : document.addEventListener("DOMContentLoaded", $n));
function Wn(e, t) {
  const n = Un(e, t, "left"), o = Un(e, t, "top"), r = t.offsetWidth, s = t.offsetHeight;
  let i = e.scrollLeft, l = e.scrollTop;
  const a = i + e.offsetWidth, c = l + e.offsetHeight;
  n <= i ? i = n : n + r > a && (i += n + r - a), o <= l ? l = o : o + s > c && (l += o + s - c), e.scrollLeft = i, e.scrollTop = l;
}
function Un(e, t, n) {
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
var No = { border: "0", clip: "rect(0 0 0 0)", "clip-path": "inset(50%)", height: "1px", margin: "0 -1px -1px 0", overflow: "hidden", padding: "0", position: "absolute", width: "1px", "white-space": "nowrap" };
function Vo(e, t) {
  const [n, o] = createSignal(Hn(t == null ? void 0 : t()));
  return createEffect(() => {
    var _a2;
    o(((_a2 = e()) == null ? void 0 : _a2.tagName.toLowerCase()) || Hn(t == null ? void 0 : t()));
  }), n;
}
function Hn(e) {
  return He(e) ? e : void 0;
}
function Y$1(e) {
  const [t, n] = splitProps(e, ["as"]);
  if (!t.as) throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");
  return createComponent$1(Dynamic, mergeProps(n, { get component() {
    return t.as;
  } }));
}
var ti = Object.defineProperty, yt$1 = (e, t) => {
  for (var n in t) ti(e, n, { get: t[n], enumerable: true });
}, ni = {};
yt$1(ni, { Button: () => si, Root: () => bt$1 });
var oi = ["button", "color", "file", "image", "reset", "submit"];
function ri(e) {
  const t = e.tagName.toLowerCase();
  return t === "button" ? true : t === "input" && e.type ? oi.indexOf(e.type) !== -1 : false;
}
function bt$1(e) {
  let t;
  const n = j({ type: "button" }, e), [o, r] = splitProps(n, ["ref", "type", "disabled"]), s = Vo(() => t, () => "button"), i = createMemo(() => {
    const c = s();
    return c == null ? false : ri({ tagName: c, type: o.type });
  }), l = createMemo(() => s() === "input"), a = createMemo(() => s() === "a" && (void 0 ) != null);
  return createComponent$1(Y$1, mergeProps({ as: "button", get type() {
    return i() || l() ? o.type : void 0;
  }, get role() {
    return !i() && !a() ? "button" : void 0;
  }, get tabIndex() {
    return !i() && !a() && !o.disabled ? 0 : void 0;
  }, get disabled() {
    return i() || l() ? o.disabled : void 0;
  }, get "aria-disabled"() {
    return !i() && !l() && o.disabled ? true : void 0;
  }, get "data-disabled"() {
    return o.disabled ? "" : void 0;
  } }, r));
}
var si = bt$1;
function Bo(e) {
  var t, n, o = "";
  if (typeof e == "string" || typeof e == "number") o += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var r = e.length;
    for (t = 0; t < r; t++) e[t] && (n = Bo(e[t])) && (o && (o += " "), o += n);
  } else for (n in e) e[n] && (o && (o += " "), o += n);
  return o;
}
function ii() {
  for (var e, t, n = 0, o = "", r = arguments.length; n < r; n++) (e = arguments[n]) && (t = Bo(e)) && (o && (o += " "), o += t);
  return o;
}
const yn = "-", li = (e) => {
  const t = ci(e), { conflictingClassGroups: n, conflictingClassGroupModifiers: o } = e;
  return { getClassGroupId: (i) => {
    const l = i.split(yn);
    return l[0] === "" && l.length !== 1 && l.shift(), zo(l, t) || ai(i);
  }, getConflictingClassGroupIds: (i, l) => {
    const a = n[i] || [];
    return l && o[i] ? [...a, ...o[i]] : a;
  } };
}, zo = (e, t) => {
  var _a2;
  if (e.length === 0) return t.classGroupId;
  const n = e[0], o = t.nextPart.get(n), r = o ? zo(e.slice(1), o) : void 0;
  if (r) return r;
  if (t.validators.length === 0) return;
  const s = e.join(yn);
  return (_a2 = t.validators.find(({ validator: i }) => i(s))) == null ? void 0 : _a2.classGroupId;
}, jn = /^\[(.+)\]$/, ai = (e) => {
  if (jn.test(e)) {
    const t = jn.exec(e)[1], n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
    if (n) return "arbitrary.." + n;
  }
}, ci = (e) => {
  const { theme: t, prefix: n } = e, o = { nextPart: /* @__PURE__ */ new Map(), validators: [] };
  return di(Object.entries(e.classGroups), n).forEach(([s, i]) => {
    nn(i, o, s, t);
  }), o;
}, nn = (e, t, n, o) => {
  e.forEach((r) => {
    if (typeof r == "string") {
      const s = r === "" ? t : Gn(t, r);
      s.classGroupId = n;
      return;
    }
    if (typeof r == "function") {
      if (ui(r)) {
        nn(r(o), t, n, o);
        return;
      }
      t.validators.push({ validator: r, classGroupId: n });
      return;
    }
    Object.entries(r).forEach(([s, i]) => {
      nn(i, Gn(t, s), n, o);
    });
  });
}, Gn = (e, t) => {
  let n = e;
  return t.split(yn).forEach((o) => {
    n.nextPart.has(o) || n.nextPart.set(o, { nextPart: /* @__PURE__ */ new Map(), validators: [] }), n = n.nextPart.get(o);
  }), n;
}, ui = (e) => e.isThemeGetter, di = (e, t) => t ? e.map(([n, o]) => {
  const r = o.map((s) => typeof s == "string" ? t + s : typeof s == "object" ? Object.fromEntries(Object.entries(s).map(([i, l]) => [t + i, l])) : s);
  return [n, r];
}) : e, fi = (e) => {
  if (e < 1) return { get: () => {
  }, set: () => {
  } };
  let t = 0, n = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  const r = (s, i) => {
    n.set(s, i), t++, t > e && (t = 0, o = n, n = /* @__PURE__ */ new Map());
  };
  return { get(s) {
    let i = n.get(s);
    if (i !== void 0) return i;
    if ((i = o.get(s)) !== void 0) return r(s, i), i;
  }, set(s, i) {
    n.has(s) ? n.set(s, i) : r(s, i);
  } };
}, _o = "!", gi = (e) => {
  const { separator: t, experimentalParseClassName: n } = e, o = t.length === 1, r = t[0], s = t.length, i = (l) => {
    const a = [];
    let c = 0, u = 0, d;
    for (let h = 0; h < l.length; h++) {
      let b = l[h];
      if (c === 0) {
        if (b === r && (o || l.slice(h, h + s) === t)) {
          a.push(l.slice(u, h)), u = h + s;
          continue;
        }
        if (b === "/") {
          d = h;
          continue;
        }
      }
      b === "[" ? c++ : b === "]" && c--;
    }
    const f = a.length === 0 ? l : l.substring(u), g = f.startsWith(_o), p = g ? f.substring(1) : f, y = d && d > u ? d - u : void 0;
    return { modifiers: a, hasImportantModifier: g, baseClassName: p, maybePostfixModifierPosition: y };
  };
  return n ? (l) => n({ className: l, parseClassName: i }) : i;
}, pi = (e) => {
  if (e.length <= 1) return e;
  const t = [];
  let n = [];
  return e.forEach((o) => {
    o[0] === "[" ? (t.push(...n.sort(), o), n = []) : n.push(o);
  }), t.push(...n.sort()), t;
}, hi = (e) => ({ cache: fi(e.cacheSize), parseClassName: gi(e), ...li(e) }), mi = /\s+/, yi = (e, t) => {
  const { parseClassName: n, getClassGroupId: o, getConflictingClassGroupIds: r } = t, s = [], i = e.trim().split(mi);
  let l = "";
  for (let a = i.length - 1; a >= 0; a -= 1) {
    const c = i[a], { modifiers: u, hasImportantModifier: d, baseClassName: f, maybePostfixModifierPosition: g } = n(c);
    let p = !!g, y = o(p ? f.substring(0, g) : f);
    if (!y) {
      if (!p) {
        l = c + (l.length > 0 ? " " + l : l);
        continue;
      }
      if (y = o(f), !y) {
        l = c + (l.length > 0 ? " " + l : l);
        continue;
      }
      p = false;
    }
    const h = pi(u).join(":"), b = d ? h + _o : h, m = b + y;
    if (s.includes(m)) continue;
    s.push(m);
    const w = r(y, p);
    for (let x = 0; x < w.length; ++x) {
      const C = w[x];
      s.push(b + C);
    }
    l = c + (l.length > 0 ? " " + l : l);
  }
  return l;
};
function bi() {
  let e = 0, t, n, o = "";
  for (; e < arguments.length; ) (t = arguments[e++]) && (n = $o(t)) && (o && (o += " "), o += n);
  return o;
}
const $o = (e) => {
  if (typeof e == "string") return e;
  let t, n = "";
  for (let o = 0; o < e.length; o++) e[o] && (t = $o(e[o])) && (n && (n += " "), n += t);
  return n;
};
function vi(e, ...t) {
  let n, o, r, s = i;
  function i(a) {
    const c = t.reduce((u, d) => d(u), e());
    return n = hi(c), o = n.cache.get, r = n.cache.set, s = l, l(a);
  }
  function l(a) {
    const c = o(a);
    if (c) return c;
    const u = yi(a, n);
    return r(a, u), u;
  }
  return function() {
    return s(bi.apply(null, arguments));
  };
}
const H$1 = (e) => {
  const t = (n) => n[e] || [];
  return t.isThemeGetter = true, t;
}, Wo = /^\[(?:([a-z-]+):)?(.+)\]$/i, wi = /^\d+\/\d+$/, xi = /* @__PURE__ */ new Set(["px", "full", "screen"]), Si = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, Ci = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, Ei = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, Pi = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, Ti = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, we = (e) => Ge(e) || xi.has(e) || wi.test(e), Ae = (e) => Ze(e, "length", Ki), Ge = (e) => !!e && !Number.isNaN(Number(e)), Xt$1 = (e) => Ze(e, "number", Ge), nt = (e) => !!e && Number.isInteger(Number(e)), Oi = (e) => e.endsWith("%") && Ge(e.slice(0, -1)), K$1 = (e) => Wo.test(e), Le = (e) => Si.test(e), Di = /* @__PURE__ */ new Set(["length", "size", "percentage"]), Ai = (e) => Ze(e, Di, Uo), Li = (e) => Ze(e, "position", Uo), Ii = /* @__PURE__ */ new Set(["image", "url"]), ki = (e) => Ze(e, Ii, Ri), Fi = (e) => Ze(e, "", Mi), ot = () => true, Ze = (e, t, n) => {
  const o = Wo.exec(e);
  return o ? o[1] ? typeof t == "string" ? o[1] === t : t.has(o[1]) : n(o[2]) : false;
}, Ki = (e) => Ci.test(e) && !Ei.test(e), Uo = () => false, Mi = (e) => Pi.test(e), Ri = (e) => Ti.test(e), Ni = () => {
  const e = H$1("colors"), t = H$1("spacing"), n = H$1("blur"), o = H$1("brightness"), r = H$1("borderColor"), s = H$1("borderRadius"), i = H$1("borderSpacing"), l = H$1("borderWidth"), a = H$1("contrast"), c = H$1("grayscale"), u = H$1("hueRotate"), d = H$1("invert"), f = H$1("gap"), g = H$1("gradientColorStops"), p = H$1("gradientColorStopPositions"), y = H$1("inset"), h = H$1("margin"), b = H$1("opacity"), m = H$1("padding"), w = H$1("saturate"), x = H$1("scale"), C = H$1("sepia"), I = H$1("skew"), P = H$1("space"), E = H$1("translate"), M = () => ["auto", "contain", "none"], _ = () => ["auto", "hidden", "clip", "visible", "scroll"], U = () => ["auto", K$1, t], T = () => [K$1, t], X = () => ["", we, Ae], L = () => ["auto", Ge, K$1], O = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], D = () => ["solid", "dashed", "dotted", "double", "none"], z = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], $ = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], G = () => ["", "0", K$1], te = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], J = () => [Ge, K$1];
  return { cacheSize: 500, separator: ":", theme: { colors: [ot], spacing: [we, Ae], blur: ["none", "", Le, K$1], brightness: J(), borderColor: [e], borderRadius: ["none", "", "full", Le, K$1], borderSpacing: T(), borderWidth: X(), contrast: J(), grayscale: G(), hueRotate: J(), invert: G(), gap: T(), gradientColorStops: [e], gradientColorStopPositions: [Oi, Ae], inset: U(), margin: U(), opacity: J(), padding: T(), saturate: J(), scale: J(), sepia: G(), skew: J(), space: T(), translate: T() }, classGroups: { aspect: [{ aspect: ["auto", "square", "video", K$1] }], container: ["container"], columns: [{ columns: [Le] }], "break-after": [{ "break-after": te() }], "break-before": [{ "break-before": te() }], "break-inside": [{ "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] }], "box-decoration": [{ "box-decoration": ["slice", "clone"] }], box: [{ box: ["border", "content"] }], display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"], float: [{ float: ["right", "left", "none", "start", "end"] }], clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }], isolation: ["isolate", "isolation-auto"], "object-fit": [{ object: ["contain", "cover", "fill", "none", "scale-down"] }], "object-position": [{ object: [...O(), K$1] }], overflow: [{ overflow: _() }], "overflow-x": [{ "overflow-x": _() }], "overflow-y": [{ "overflow-y": _() }], overscroll: [{ overscroll: M() }], "overscroll-x": [{ "overscroll-x": M() }], "overscroll-y": [{ "overscroll-y": M() }], position: ["static", "fixed", "absolute", "relative", "sticky"], inset: [{ inset: [y] }], "inset-x": [{ "inset-x": [y] }], "inset-y": [{ "inset-y": [y] }], start: [{ start: [y] }], end: [{ end: [y] }], top: [{ top: [y] }], right: [{ right: [y] }], bottom: [{ bottom: [y] }], left: [{ left: [y] }], visibility: ["visible", "invisible", "collapse"], z: [{ z: ["auto", nt, K$1] }], basis: [{ basis: U() }], "flex-direction": [{ flex: ["row", "row-reverse", "col", "col-reverse"] }], "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }], flex: [{ flex: ["1", "auto", "initial", "none", K$1] }], grow: [{ grow: G() }], shrink: [{ shrink: G() }], order: [{ order: ["first", "last", "none", nt, K$1] }], "grid-cols": [{ "grid-cols": [ot] }], "col-start-end": [{ col: ["auto", { span: ["full", nt, K$1] }, K$1] }], "col-start": [{ "col-start": L() }], "col-end": [{ "col-end": L() }], "grid-rows": [{ "grid-rows": [ot] }], "row-start-end": [{ row: ["auto", { span: [nt, K$1] }, K$1] }], "row-start": [{ "row-start": L() }], "row-end": [{ "row-end": L() }], "grid-flow": [{ "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] }], "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", K$1] }], "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", K$1] }], gap: [{ gap: [f] }], "gap-x": [{ "gap-x": [f] }], "gap-y": [{ "gap-y": [f] }], "justify-content": [{ justify: ["normal", ...$()] }], "justify-items": [{ "justify-items": ["start", "end", "center", "stretch"] }], "justify-self": [{ "justify-self": ["auto", "start", "end", "center", "stretch"] }], "align-content": [{ content: ["normal", ...$(), "baseline"] }], "align-items": [{ items: ["start", "end", "center", "baseline", "stretch"] }], "align-self": [{ self: ["auto", "start", "end", "center", "stretch", "baseline"] }], "place-content": [{ "place-content": [...$(), "baseline"] }], "place-items": [{ "place-items": ["start", "end", "center", "baseline", "stretch"] }], "place-self": [{ "place-self": ["auto", "start", "end", "center", "stretch"] }], p: [{ p: [m] }], px: [{ px: [m] }], py: [{ py: [m] }], ps: [{ ps: [m] }], pe: [{ pe: [m] }], pt: [{ pt: [m] }], pr: [{ pr: [m] }], pb: [{ pb: [m] }], pl: [{ pl: [m] }], m: [{ m: [h] }], mx: [{ mx: [h] }], my: [{ my: [h] }], ms: [{ ms: [h] }], me: [{ me: [h] }], mt: [{ mt: [h] }], mr: [{ mr: [h] }], mb: [{ mb: [h] }], ml: [{ ml: [h] }], "space-x": [{ "space-x": [P] }], "space-x-reverse": ["space-x-reverse"], "space-y": [{ "space-y": [P] }], "space-y-reverse": ["space-y-reverse"], w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", K$1, t] }], "min-w": [{ "min-w": [K$1, t, "min", "max", "fit"] }], "max-w": [{ "max-w": [K$1, t, "none", "full", "min", "max", "fit", "prose", { screen: [Le] }, Le] }], h: [{ h: [K$1, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }], "min-h": [{ "min-h": [K$1, t, "min", "max", "fit", "svh", "lvh", "dvh"] }], "max-h": [{ "max-h": [K$1, t, "min", "max", "fit", "svh", "lvh", "dvh"] }], size: [{ size: [K$1, t, "auto", "min", "max", "fit"] }], "font-size": [{ text: ["base", Le, Ae] }], "font-smoothing": ["antialiased", "subpixel-antialiased"], "font-style": ["italic", "not-italic"], "font-weight": [{ font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", Xt$1] }], "font-family": [{ font: [ot] }], "fvn-normal": ["normal-nums"], "fvn-ordinal": ["ordinal"], "fvn-slashed-zero": ["slashed-zero"], "fvn-figure": ["lining-nums", "oldstyle-nums"], "fvn-spacing": ["proportional-nums", "tabular-nums"], "fvn-fraction": ["diagonal-fractions", "stacked-fractions"], tracking: [{ tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", K$1] }], "line-clamp": [{ "line-clamp": ["none", Ge, Xt$1] }], leading: [{ leading: ["none", "tight", "snug", "normal", "relaxed", "loose", we, K$1] }], "list-image": [{ "list-image": ["none", K$1] }], "list-style-type": [{ list: ["none", "disc", "decimal", K$1] }], "list-style-position": [{ list: ["inside", "outside"] }], "placeholder-color": [{ placeholder: [e] }], "placeholder-opacity": [{ "placeholder-opacity": [b] }], "text-alignment": [{ text: ["left", "center", "right", "justify", "start", "end"] }], "text-color": [{ text: [e] }], "text-opacity": [{ "text-opacity": [b] }], "text-decoration": ["underline", "overline", "line-through", "no-underline"], "text-decoration-style": [{ decoration: [...D(), "wavy"] }], "text-decoration-thickness": [{ decoration: ["auto", "from-font", we, Ae] }], "underline-offset": [{ "underline-offset": ["auto", we, K$1] }], "text-decoration-color": [{ decoration: [e] }], "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"], "text-overflow": ["truncate", "text-ellipsis", "text-clip"], "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }], indent: [{ indent: T() }], "vertical-align": [{ align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", K$1] }], whitespace: [{ whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"] }], break: [{ break: ["normal", "words", "all", "keep"] }], hyphens: [{ hyphens: ["none", "manual", "auto"] }], content: [{ content: ["none", K$1] }], "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }], "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }], "bg-opacity": [{ "bg-opacity": [b] }], "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }], "bg-position": [{ bg: [...O(), Li] }], "bg-repeat": [{ bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] }], "bg-size": [{ bg: ["auto", "cover", "contain", Ai] }], "bg-image": [{ bg: ["none", { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] }, ki] }], "bg-color": [{ bg: [e] }], "gradient-from-pos": [{ from: [p] }], "gradient-via-pos": [{ via: [p] }], "gradient-to-pos": [{ to: [p] }], "gradient-from": [{ from: [g] }], "gradient-via": [{ via: [g] }], "gradient-to": [{ to: [g] }], rounded: [{ rounded: [s] }], "rounded-s": [{ "rounded-s": [s] }], "rounded-e": [{ "rounded-e": [s] }], "rounded-t": [{ "rounded-t": [s] }], "rounded-r": [{ "rounded-r": [s] }], "rounded-b": [{ "rounded-b": [s] }], "rounded-l": [{ "rounded-l": [s] }], "rounded-ss": [{ "rounded-ss": [s] }], "rounded-se": [{ "rounded-se": [s] }], "rounded-ee": [{ "rounded-ee": [s] }], "rounded-es": [{ "rounded-es": [s] }], "rounded-tl": [{ "rounded-tl": [s] }], "rounded-tr": [{ "rounded-tr": [s] }], "rounded-br": [{ "rounded-br": [s] }], "rounded-bl": [{ "rounded-bl": [s] }], "border-w": [{ border: [l] }], "border-w-x": [{ "border-x": [l] }], "border-w-y": [{ "border-y": [l] }], "border-w-s": [{ "border-s": [l] }], "border-w-e": [{ "border-e": [l] }], "border-w-t": [{ "border-t": [l] }], "border-w-r": [{ "border-r": [l] }], "border-w-b": [{ "border-b": [l] }], "border-w-l": [{ "border-l": [l] }], "border-opacity": [{ "border-opacity": [b] }], "border-style": [{ border: [...D(), "hidden"] }], "divide-x": [{ "divide-x": [l] }], "divide-x-reverse": ["divide-x-reverse"], "divide-y": [{ "divide-y": [l] }], "divide-y-reverse": ["divide-y-reverse"], "divide-opacity": [{ "divide-opacity": [b] }], "divide-style": [{ divide: D() }], "border-color": [{ border: [r] }], "border-color-x": [{ "border-x": [r] }], "border-color-y": [{ "border-y": [r] }], "border-color-s": [{ "border-s": [r] }], "border-color-e": [{ "border-e": [r] }], "border-color-t": [{ "border-t": [r] }], "border-color-r": [{ "border-r": [r] }], "border-color-b": [{ "border-b": [r] }], "border-color-l": [{ "border-l": [r] }], "divide-color": [{ divide: [r] }], "outline-style": [{ outline: ["", ...D()] }], "outline-offset": [{ "outline-offset": [we, K$1] }], "outline-w": [{ outline: [we, Ae] }], "outline-color": [{ outline: [e] }], "ring-w": [{ ring: X() }], "ring-w-inset": ["ring-inset"], "ring-color": [{ ring: [e] }], "ring-opacity": [{ "ring-opacity": [b] }], "ring-offset-w": [{ "ring-offset": [we, Ae] }], "ring-offset-color": [{ "ring-offset": [e] }], shadow: [{ shadow: ["", "inner", "none", Le, Fi] }], "shadow-color": [{ shadow: [ot] }], opacity: [{ opacity: [b] }], "mix-blend": [{ "mix-blend": [...z(), "plus-lighter", "plus-darker"] }], "bg-blend": [{ "bg-blend": z() }], filter: [{ filter: ["", "none"] }], blur: [{ blur: [n] }], brightness: [{ brightness: [o] }], contrast: [{ contrast: [a] }], "drop-shadow": [{ "drop-shadow": ["", "none", Le, K$1] }], grayscale: [{ grayscale: [c] }], "hue-rotate": [{ "hue-rotate": [u] }], invert: [{ invert: [d] }], saturate: [{ saturate: [w] }], sepia: [{ sepia: [C] }], "backdrop-filter": [{ "backdrop-filter": ["", "none"] }], "backdrop-blur": [{ "backdrop-blur": [n] }], "backdrop-brightness": [{ "backdrop-brightness": [o] }], "backdrop-contrast": [{ "backdrop-contrast": [a] }], "backdrop-grayscale": [{ "backdrop-grayscale": [c] }], "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [u] }], "backdrop-invert": [{ "backdrop-invert": [d] }], "backdrop-opacity": [{ "backdrop-opacity": [b] }], "backdrop-saturate": [{ "backdrop-saturate": [w] }], "backdrop-sepia": [{ "backdrop-sepia": [C] }], "border-collapse": [{ border: ["collapse", "separate"] }], "border-spacing": [{ "border-spacing": [i] }], "border-spacing-x": [{ "border-spacing-x": [i] }], "border-spacing-y": [{ "border-spacing-y": [i] }], "table-layout": [{ table: ["auto", "fixed"] }], caption: [{ caption: ["top", "bottom"] }], transition: [{ transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", K$1] }], duration: [{ duration: J() }], ease: [{ ease: ["linear", "in", "out", "in-out", K$1] }], delay: [{ delay: J() }], animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", K$1] }], transform: [{ transform: ["", "gpu", "none"] }], scale: [{ scale: [x] }], "scale-x": [{ "scale-x": [x] }], "scale-y": [{ "scale-y": [x] }], rotate: [{ rotate: [nt, K$1] }], "translate-x": [{ "translate-x": [E] }], "translate-y": [{ "translate-y": [E] }], "skew-x": [{ "skew-x": [I] }], "skew-y": [{ "skew-y": [I] }], "transform-origin": [{ origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", K$1] }], accent: [{ accent: ["auto", e] }], appearance: [{ appearance: ["none", "auto"] }], cursor: [{ cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", K$1] }], "caret-color": [{ caret: [e] }], "pointer-events": [{ "pointer-events": ["none", "auto"] }], resize: [{ resize: ["none", "y", "x", ""] }], "scroll-behavior": [{ scroll: ["auto", "smooth"] }], "scroll-m": [{ "scroll-m": T() }], "scroll-mx": [{ "scroll-mx": T() }], "scroll-my": [{ "scroll-my": T() }], "scroll-ms": [{ "scroll-ms": T() }], "scroll-me": [{ "scroll-me": T() }], "scroll-mt": [{ "scroll-mt": T() }], "scroll-mr": [{ "scroll-mr": T() }], "scroll-mb": [{ "scroll-mb": T() }], "scroll-ml": [{ "scroll-ml": T() }], "scroll-p": [{ "scroll-p": T() }], "scroll-px": [{ "scroll-px": T() }], "scroll-py": [{ "scroll-py": T() }], "scroll-ps": [{ "scroll-ps": T() }], "scroll-pe": [{ "scroll-pe": T() }], "scroll-pt": [{ "scroll-pt": T() }], "scroll-pr": [{ "scroll-pr": T() }], "scroll-pb": [{ "scroll-pb": T() }], "scroll-pl": [{ "scroll-pl": T() }], "snap-align": [{ snap: ["start", "end", "center", "align-none"] }], "snap-stop": [{ snap: ["normal", "always"] }], "snap-type": [{ snap: ["none", "x", "y", "both"] }], "snap-strictness": [{ snap: ["mandatory", "proximity"] }], touch: [{ touch: ["auto", "none", "manipulation"] }], "touch-x": [{ "touch-pan": ["x", "left", "right"] }], "touch-y": [{ "touch-pan": ["y", "up", "down"] }], "touch-pz": ["touch-pinch-zoom"], select: [{ select: ["none", "text", "all", "auto"] }], "will-change": [{ "will-change": ["auto", "scroll", "contents", "transform", K$1] }], fill: [{ fill: [e, "none"] }], "stroke-w": [{ stroke: [we, Ae, Xt$1] }], stroke: [{ stroke: [e, "none"] }], sr: ["sr-only", "not-sr-only"], "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }] }, conflictingClassGroups: { overflow: ["overflow-x", "overflow-y"], overscroll: ["overscroll-x", "overscroll-y"], inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"], "inset-x": ["right", "left"], "inset-y": ["top", "bottom"], flex: ["basis", "grow", "shrink"], gap: ["gap-x", "gap-y"], p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"], px: ["pr", "pl"], py: ["pt", "pb"], m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"], mx: ["mr", "ml"], my: ["mt", "mb"], size: ["w", "h"], "font-size": ["leading"], "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"], "fvn-ordinal": ["fvn-normal"], "fvn-slashed-zero": ["fvn-normal"], "fvn-figure": ["fvn-normal"], "fvn-spacing": ["fvn-normal"], "fvn-fraction": ["fvn-normal"], "line-clamp": ["display", "overflow"], rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"], "rounded-s": ["rounded-ss", "rounded-es"], "rounded-e": ["rounded-se", "rounded-ee"], "rounded-t": ["rounded-tl", "rounded-tr"], "rounded-r": ["rounded-tr", "rounded-br"], "rounded-b": ["rounded-br", "rounded-bl"], "rounded-l": ["rounded-tl", "rounded-bl"], "border-spacing": ["border-spacing-x", "border-spacing-y"], "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"], "border-w-x": ["border-w-r", "border-w-l"], "border-w-y": ["border-w-t", "border-w-b"], "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"], "border-color-x": ["border-color-r", "border-color-l"], "border-color-y": ["border-color-t", "border-color-b"], "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"], "scroll-mx": ["scroll-mr", "scroll-ml"], "scroll-my": ["scroll-mt", "scroll-mb"], "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"], "scroll-px": ["scroll-pr", "scroll-pl"], "scroll-py": ["scroll-pt", "scroll-pb"], touch: ["touch-x", "touch-y", "touch-pz"], "touch-x": ["touch"], "touch-y": ["touch"], "touch-pz": ["touch"] }, conflictingClassGroupModifiers: { "font-size": ["leading"] } };
}, Vi = vi(Ni);
function Me(...e) {
  return Vi(ii(e));
}
var Dt$1 = "data-kb-top-layer", Ho, on = false, Ee = [];
function dt$1(e) {
  return Ee.findIndex((t) => t.node === e);
}
function Bi(e) {
  return Ee[dt$1(e)];
}
function zi(e) {
  return Ee[Ee.length - 1].node === e;
}
function jo() {
  return Ee.filter((e) => e.isPointerBlocking);
}
function _i() {
  return [...jo()].slice(-1)[0];
}
function bn() {
  return jo().length > 0;
}
function Go(e) {
  var _a2;
  const t = dt$1((_a2 = _i()) == null ? void 0 : _a2.node);
  return dt$1(e) < t;
}
function $i(e) {
  Ee.push(e);
}
function Wi(e) {
  const t = dt$1(e);
  t < 0 || Ee.splice(t, 1);
}
function Ui() {
  for (const { node: e } of Ee) e.style.pointerEvents = Go(e) ? "none" : "auto";
}
function Hi(e) {
  if (bn() && !on) {
    const t = ue$1(e);
    Ho = document.body.style.pointerEvents, t.body.style.pointerEvents = "none", on = true;
  }
}
function ji(e) {
  if (bn()) return;
  const t = ue$1(e);
  t.body.style.pointerEvents = Ho, t.body.style.length === 0 && t.body.removeAttribute("style"), on = false;
}
var Ct$1 = { layers: Ee, isTopMostLayer: zi, hasPointerBlockingLayer: bn, isBelowPointerBlockingLayer: Go, addLayer: $i, removeLayer: Wi, indexOf: dt$1, find: Bi, assignPointerEventToLayers: Ui, disableBodyPointerEvents: Hi, restoreBodyPointerEvents: ji }, Zt$1 = "focusScope.autoFocusOnMount", Jt$1 = "focusScope.autoFocusOnUnmount", qn = { bubbles: false, cancelable: true }, Yn = { stack: [], active() {
  return this.stack[0];
}, add(e) {
  var _a2;
  e !== this.active() && ((_a2 = this.active()) == null ? void 0 : _a2.pause()), this.stack = Bn(this.stack, e), this.stack.unshift(e);
}, remove(e) {
  var _a2;
  this.stack = Bn(this.stack, e), (_a2 = this.active()) == null ? void 0 : _a2.resume();
} };
function qo(e, t) {
  const [n, o] = createSignal(false), r = { pause() {
    o(true);
  }, resume() {
    o(false);
  } };
  let s = null;
  const i = (p) => {
    var _a2;
    return (_a2 = e.onMountAutoFocus) == null ? void 0 : _a2.call(e, p);
  }, l = (p) => {
    var _a2;
    return (_a2 = e.onUnmountAutoFocus) == null ? void 0 : _a2.call(e, p);
  }, a = () => ue$1(t()), c = () => {
    const p = a().createElement("span");
    return p.setAttribute("data-focus-trap", ""), p.tabIndex = 0, Object.assign(p.style, No), p;
  }, u = () => {
    const p = t();
    return p ? Mo(p, true).filter((y) => !y.hasAttribute("data-focus-trap")) : [];
  }, d = () => {
    const p = u();
    return p.length > 0 ? p[0] : null;
  }, f = () => {
    const p = u();
    return p.length > 0 ? p[p.length - 1] : null;
  }, g = () => {
    const p = t();
    if (!p) return false;
    const y = it(p);
    return !y || me(p, y) ? false : Ro(y);
  };
  createEffect(() => {
    if (isServer) return;
    const p = t();
    if (!p) return;
    Yn.add(r);
    const y = it(p);
    if (!me(p, y)) {
      const b = new CustomEvent(Zt$1, qn);
      p.addEventListener(Zt$1, i), p.dispatchEvent(b), b.defaultPrevented || setTimeout(() => {
        ee$1(d()), it(p) === y && ee$1(p);
      }, 0);
    }
    onCleanup(() => {
      p.removeEventListener(Zt$1, i), setTimeout(() => {
        const b = new CustomEvent(Jt$1, qn);
        g() && b.preventDefault(), p.addEventListener(Jt$1, l), p.dispatchEvent(b), b.defaultPrevented || ee$1(y != null ? y : a().body), p.removeEventListener(Jt$1, l), Yn.remove(r);
      }, 0);
    });
  }), createEffect(() => {
    if (isServer) return;
    const p = t();
    if (!p || !v(e.trapFocus) || n()) return;
    const y = (b) => {
      const m = b.target;
      (m == null ? void 0 : m.closest(`[${Dt$1}]`)) || (me(p, m) ? s = m : ee$1(s));
    }, h = (b) => {
      var _a2;
      const w = (_a2 = b.relatedTarget) != null ? _a2 : it(p);
      (w == null ? void 0 : w.closest(`[${Dt$1}]`)) || me(p, w) || ee$1(s);
    };
    a().addEventListener("focusin", y), a().addEventListener("focusout", h), onCleanup(() => {
      a().removeEventListener("focusin", y), a().removeEventListener("focusout", h);
    });
  }), createEffect(() => {
    if (isServer) return;
    const p = t();
    if (!p || !v(e.trapFocus) || n()) return;
    const y = c();
    p.insertAdjacentElement("afterbegin", y);
    const h = c();
    p.insertAdjacentElement("beforeend", h);
    function b(w) {
      const x = d(), C = f();
      w.relatedTarget === x ? ee$1(C) : ee$1(x);
    }
    y.addEventListener("focusin", b), h.addEventListener("focusin", b);
    const m = new MutationObserver((w) => {
      for (const x of w) x.previousSibling === h && (h.remove(), p.insertAdjacentElement("beforeend", h)), x.nextSibling === y && (y.remove(), p.insertAdjacentElement("afterbegin", y));
    });
    m.observe(p, { childList: true, subtree: false }), onCleanup(() => {
      y.removeEventListener("focusin", b), h.removeEventListener("focusin", b), y.remove(), h.remove(), m.disconnect();
    });
  });
}
var Gi = "data-live-announcer";
function Yo(e) {
  createEffect(() => {
    v(e.isDisabled) || onCleanup(qi(v(e.targets), v(e.root)));
  });
}
var rt = /* @__PURE__ */ new WeakMap(), ae$1 = [];
function qi(e, t = document.body) {
  const n = new Set(e), o = /* @__PURE__ */ new Set(), r = (a) => {
    for (const f of a.querySelectorAll(`[${Gi}], [${Dt$1}]`)) n.add(f);
    const c = (f) => {
      if (n.has(f) || f.parentElement && o.has(f.parentElement) && f.parentElement.getAttribute("role") !== "row") return NodeFilter.FILTER_REJECT;
      for (const g of n) if (f.contains(g)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }, u = document.createTreeWalker(a, NodeFilter.SHOW_ELEMENT, { acceptNode: c }), d = c(a);
    if (d === NodeFilter.FILTER_ACCEPT && s(a), d !== NodeFilter.FILTER_REJECT) {
      let f = u.nextNode();
      for (; f != null; ) s(f), f = u.nextNode();
    }
  }, s = (a) => {
    var _a2;
    const c = (_a2 = rt.get(a)) != null ? _a2 : 0;
    a.getAttribute("aria-hidden") === "true" && c === 0 || (c === 0 && a.setAttribute("aria-hidden", "true"), o.add(a), rt.set(a, c + 1));
  };
  ae$1.length && ae$1[ae$1.length - 1].disconnect(), r(t);
  const i = new MutationObserver((a) => {
    for (const c of a) if (!(c.type !== "childList" || c.addedNodes.length === 0) && ![...n, ...o].some((u) => u.contains(c.target))) {
      for (const u of c.removedNodes) u instanceof Element && (n.delete(u), o.delete(u));
      for (const u of c.addedNodes) (u instanceof HTMLElement || u instanceof SVGElement) && (u.dataset.liveAnnouncer === "true" || u.dataset.reactAriaTopLayer === "true") ? n.add(u) : u instanceof Element && r(u);
    }
  });
  i.observe(t, { childList: true, subtree: true });
  const l = { observe() {
    i.observe(t, { childList: true, subtree: true });
  }, disconnect() {
    i.disconnect();
  } };
  return ae$1.push(l), () => {
    i.disconnect();
    for (const a of o) {
      const c = rt.get(a);
      if (c == null) return;
      c === 1 ? (a.removeAttribute("aria-hidden"), rt.delete(a)) : rt.set(a, c - 1);
    }
    l === ae$1[ae$1.length - 1] ? (ae$1.pop(), ae$1.length && ae$1[ae$1.length - 1].observe()) : ae$1.splice(ae$1.indexOf(l), 1);
  };
}
var Xn = "interactOutside.pointerDownOutside", Zn = "interactOutside.focusOutside";
function Yi(e, t) {
  let n, o = Js;
  const r = () => ue$1(t()), s = (d) => {
    var _a2;
    return (_a2 = e.onPointerDownOutside) == null ? void 0 : _a2.call(e, d);
  }, i = (d) => {
    var _a2;
    return (_a2 = e.onFocusOutside) == null ? void 0 : _a2.call(e, d);
  }, l = (d) => {
    var _a2;
    return (_a2 = e.onInteractOutside) == null ? void 0 : _a2.call(e, d);
  }, a = (d) => {
    var _a2;
    const f = d.target;
    return !(f instanceof Element) || f.closest(`[${Dt$1}]`) || !me(r(), f) || me(t(), f) ? false : !((_a2 = e.shouldExcludeElement) == null ? void 0 : _a2.call(e, f));
  }, c = (d) => {
    function f() {
      const g = t(), p = d.target;
      if (!g || !p || !a(d)) return;
      const y = ce$1([s, l]);
      p.addEventListener(Xn, y, { once: true });
      const h = new CustomEvent(Xn, { bubbles: false, cancelable: true, detail: { originalEvent: d, isContextMenu: d.button === 2 || $s(d) && d.button === 0 } });
      p.dispatchEvent(h);
    }
    d.pointerType === "touch" ? (r().removeEventListener("click", f), o = f, r().addEventListener("click", f, { once: true })) : f();
  }, u = (d) => {
    const f = t(), g = d.target;
    if (!f || !g || !a(d)) return;
    const p = ce$1([i, l]);
    g.addEventListener(Zn, p, { once: true });
    const y = new CustomEvent(Zn, { bubbles: false, cancelable: true, detail: { originalEvent: d, isContextMenu: false } });
    g.dispatchEvent(y);
  };
  createEffect(() => {
    isServer || v(e.isDisabled) || (n = window.setTimeout(() => {
      r().addEventListener("pointerdown", c, true);
    }, 0), r().addEventListener("focusin", u, true), onCleanup(() => {
      window.clearTimeout(n), r().removeEventListener("click", o), r().removeEventListener("pointerdown", c, true), r().removeEventListener("focusin", u, true);
    }));
  });
}
function Xi(e) {
  const t = (n) => {
    n.key, ko.Escape;
  };
  createEffect(() => {
    var _a2, _b;
    if (isServer || v(e.isDisabled)) return;
    const n = (_b = (_a2 = e.ownerDocument) == null ? void 0 : _a2.call(e)) != null ? _b : ue$1();
    n.addEventListener("keydown", t), onCleanup(() => {
      n.removeEventListener("keydown", t);
    });
  });
}
var Xo = createContext$1();
function Zi() {
  return useContext(Xo);
}
function vn(e) {
  let t;
  const n = Zi(), [o, r] = splitProps(e, ["ref", "disableOutsidePointerEvents", "excludedElements", "onEscapeKeyDown", "onPointerDownOutside", "onFocusOutside", "onInteractOutside", "onDismiss", "bypassTopMostLayerCheck"]), s = /* @__PURE__ */ new Set([]), i = (d) => {
    s.add(d);
    const f = n == null ? void 0 : n.registerNestedLayer(d);
    return () => {
      s.delete(d), f == null ? void 0 : f();
    };
  };
  Yi({ shouldExcludeElement: (d) => false, onPointerDownOutside: (d) => {
  }, onFocusOutside: (d) => {
    var _a2, _b, _c;
    (_a2 = o.onFocusOutside) == null ? void 0 : _a2.call(o, d), (_b = o.onInteractOutside) == null ? void 0 : _b.call(o, d), d.defaultPrevented || ((_c = o.onDismiss) == null ? void 0 : _c.call(o));
  } }, () => t), Xi({ ownerDocument: () => ue$1(t), onEscapeKeyDown: (d) => {
  } }), onMount(() => {
  }), createEffect(on$2([() => t, () => o.disableOutsidePointerEvents], ([d, f]) => {
    if (!d) return;
    const g = Ct$1.find(d);
    g && g.isPointerBlocking !== f && (g.isPointerBlocking = f, Ct$1.assignPointerEventToLayers()), f && Ct$1.disableBodyPointerEvents(d), onCleanup(() => {
      Ct$1.restoreBodyPointerEvents(d);
    });
  }, { defer: true }));
  const u = { registerNestedLayer: i };
  return createComponent$1(Xo.Provider, { value: u, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "div" }, r));
  } });
}
function Zo(e) {
  var _a2;
  const [t, n] = createSignal((_a2 = e.defaultValue) == null ? void 0 : _a2.call(e)), o = createMemo(() => {
    var _a3;
    return ((_a3 = e.value) == null ? void 0 : _a3.call(e)) !== void 0;
  }), r = createMemo(() => {
    var _a3;
    return o() ? (_a3 = e.value) == null ? void 0 : _a3.call(e) : t();
  });
  return [r, (i) => {
    untrack(() => {
      var _a3;
      const l = Ds(i, r());
      return Object.is(l, r()) || (o() || n(l), (_a3 = e.onChange) == null ? void 0 : _a3.call(e, l)), l;
    });
  }];
}
function Ji(e) {
  const [t, n] = Zo(e);
  return [() => {
    var _a2;
    return (_a2 = t()) != null ? _a2 : false;
  }, n];
}
function wn(e = {}) {
  const [t, n] = Ji({ value: () => v(e.open), defaultValue: () => !!v(e.defaultOpen), onChange: (i) => {
    var _a2;
    return (_a2 = e.onOpenChange) == null ? void 0 : _a2.call(e, i);
  } }), o = () => {
    n(true);
  }, r = () => {
    n(false);
  };
  return { isOpen: t, setIsOpen: n, open: o, close: r, toggle: () => {
    t() ? r() : o();
  } };
}
function re$1(e) {
  return (t) => (e(t), () => e(void 0));
}
var Q$1 = (e) => typeof e == "function" ? e() : e, rn = (e, t) => {
  var _a2;
  if (e.contains(t)) return true;
  let n = t;
  for (; n; ) {
    if (n === e) return true;
    n = (_a2 = n._$host) != null ? _a2 : n.parentElement;
  }
  return false;
}, Et$1 = /* @__PURE__ */ new Map(), Qi = (e) => {
  createEffect(() => {
    var _a2, _b;
    const t = (_a2 = Q$1(e.style)) != null ? _a2 : {}, n = (_b = Q$1(e.properties)) != null ? _b : [], o = {};
    for (const s in t) o[s] = e.element.style[s];
    const r = Et$1.get(e.key);
    r ? r.activeCount++ : Et$1.set(e.key, { activeCount: 1, originalStyles: o, properties: n.map((s) => s.key) }), Object.assign(e.element.style, e.style);
    for (const s of n) e.element.style.setProperty(s.key, s.value);
    onCleanup(() => {
      var _a3;
      const s = Et$1.get(e.key);
      if (s) {
        if (s.activeCount !== 1) {
          s.activeCount--;
          return;
        }
        Et$1.delete(e.key);
        for (const [i, l] of Object.entries(s.originalStyles)) e.element.style[i] = l;
        for (const i of s.properties) e.element.style.removeProperty(i);
        e.element.style.length === 0 && e.element.removeAttribute("style"), (_a3 = e.cleanup) == null ? void 0 : _a3.call(e);
      }
    });
  });
}, Jn = Qi, el = (e, t) => {
  switch (t) {
    case "x":
      return [e.clientWidth, e.scrollLeft, e.scrollWidth];
    case "y":
      return [e.clientHeight, e.scrollTop, e.scrollHeight];
  }
}, tl = (e, t) => {
  const n = getComputedStyle(e), o = t === "x" ? n.overflowX : n.overflowY;
  return o === "auto" || o === "scroll" || e.tagName === "HTML" && o === "visible";
}, nl = (e, t, n) => {
  var _a2;
  const o = t === "x" && window.getComputedStyle(e).direction === "rtl" ? -1 : 1;
  let r = e, s = 0, i = 0, l = false;
  do {
    const [a, c, u] = el(r, t), d = u - a - o * c;
    (c !== 0 || d !== 0) && tl(r, t) && (s += d, i += c), r === (n != null ? n : document.documentElement) ? l = true : r = (_a2 = r._$host) != null ? _a2 : r.parentElement;
  } while (r && !l);
  return [s, i];
}, [Qn, eo] = createSignal([]), ol = (e) => Qn().indexOf(e) === Qn().length - 1, rl = (e) => {
  const t = mergeProps$1({ element: null, enabled: true, hideScrollbar: true, preventScrollbarShift: true, preventScrollbarShiftMode: "padding", restoreScrollPosition: true, allowPinchZoom: false }, e), n = createUniqueId();
  let o = [0, 0], r = null, s = null;
  createEffect(() => {
    Q$1(t.enabled) && (eo((c) => [...c, n]), onCleanup(() => {
      eo((c) => c.filter((u) => u !== n));
    }));
  }), createEffect(() => {
    if (!Q$1(t.enabled) || !Q$1(t.hideScrollbar)) return;
    const { body: c } = document, u = window.innerWidth - c.offsetWidth;
    if (Q$1(t.preventScrollbarShift)) {
      const d = { overflow: "hidden" }, f = [];
      u > 0 && (Q$1(t.preventScrollbarShiftMode) === "padding" ? d.paddingRight = `calc(${window.getComputedStyle(c).paddingRight} + ${u}px)` : d.marginRight = `calc(${window.getComputedStyle(c).marginRight} + ${u}px)`, f.push({ key: "--scrollbar-width", value: `${u}px` }));
      const g = window.scrollY, p = window.scrollX;
      Jn({ key: "prevent-scroll", element: c, style: d, properties: f, cleanup: () => {
        Q$1(t.restoreScrollPosition) && u > 0 && window.scrollTo(p, g);
      } });
    } else Jn({ key: "prevent-scroll", element: c, style: { overflow: "hidden" } });
  }), createEffect(() => {
    !ol(n) || !Q$1(t.enabled) || (document.addEventListener("wheel", l, { passive: false }), document.addEventListener("touchstart", i, { passive: false }), document.addEventListener("touchmove", a, { passive: false }), onCleanup(() => {
      document.removeEventListener("wheel", l), document.removeEventListener("touchstart", i), document.removeEventListener("touchmove", a);
    }));
  });
  const i = (c) => {
    o = to(c), r = null, s = null;
  }, l = (c) => {
    const u = c.target, d = Q$1(t.element), f = sl(c), g = Math.abs(f[0]) > Math.abs(f[1]) ? "x" : "y", p = g === "x" ? f[0] : f[1], y = no(u, g, p, d);
    let h;
    d && rn(d, u) ? h = !y : h = true, h && c.cancelable && c.preventDefault();
  }, a = (c) => {
    const u = Q$1(t.element), d = c.target;
    let f;
    if (c.touches.length === 2) f = !Q$1(t.allowPinchZoom);
    else {
      if (r == null || s === null) {
        const g = to(c).map((y, h) => o[h] - y), p = Math.abs(g[0]) > Math.abs(g[1]) ? "x" : "y";
        r = p, s = p === "x" ? g[0] : g[1];
      }
      if (d.type === "range") f = false;
      else {
        const g = no(d, r, s, u);
        u && rn(u, d) ? f = !g : f = true;
      }
    }
    f && c.cancelable && c.preventDefault();
  };
}, sl = (e) => [e.deltaX, e.deltaY], to = (e) => e.changedTouches[0] ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0], no = (e, t, n, o) => {
  const r = o !== null && rn(o, e), [s, i] = nl(e, t, r ? o : void 0);
  return !(n > 0 && Math.abs(s) <= 1 || n < 0 && Math.abs(i) < 1);
}, il = rl, Jo = il, ll = (e) => {
  const t = createMemo(() => {
    const i = Q$1(e.element);
    if (i) return getComputedStyle(i);
  }), n = () => {
    var _a2, _b;
    return (_b = (_a2 = t()) == null ? void 0 : _a2.animationName) != null ? _b : "none";
  }, [o, r] = createSignal(Q$1(e.show) ? "present" : "hidden");
  let s = "none";
  return createEffect((i) => {
    const l = Q$1(e.show);
    return untrack(() => {
      var _a2;
      if (i === l) return l;
      const a = s, c = n();
      l ? r("present") : c === "none" || ((_a2 = t()) == null ? void 0 : _a2.display) === "none" ? r("hidden") : r(i === true && a !== c ? "hiding" : "hidden");
    }), l;
  }), createEffect(() => {
    const i = Q$1(e.element);
    if (!i) return;
    const l = (c) => {
      c.target === i && (s = n());
    }, a = (c) => {
      const d = n().includes(c.animationName);
      c.target === i && d && o() === "hiding" && r("hidden");
    };
    i.addEventListener("animationstart", l), i.addEventListener("animationcancel", a), i.addEventListener("animationend", a), onCleanup(() => {
      i.removeEventListener("animationstart", l), i.removeEventListener("animationcancel", a), i.removeEventListener("animationend", a);
    });
  }), { present: () => o() === "present" || o() === "hiding", state: o, setState: r };
}, al = ll, At$1 = al, cl = {};
yt$1(cl, { CloseButton: () => er$1, Content: () => tr$1, Description: () => nr$1, Dialog: () => Pe, Overlay: () => or$1, Portal: () => rr$1, Root: () => sr$1, Title: () => ir$1, Trigger: () => lr$1, useDialogContext: () => Re });
var Qo = createContext$1();
function Re() {
  const e = useContext(Qo);
  if (e === void 0) throw new Error("[kobalte]: `useDialogContext` must be used within a `Dialog` component");
  return e;
}
function er$1(e) {
  const t = Re(), [n, o] = splitProps(e, ["aria-label", "onClick"]);
  return createComponent$1(bt$1, mergeProps({ get "aria-label"() {
    return n["aria-label"] || t.translations().dismiss;
  }, onClick: (s) => {
    q$1(s, n.onClick), t.close();
  } }, o));
}
function tr$1(e) {
  let t;
  const n = Re(), o = j({ id: n.generateId("content") }, e), [r, s] = splitProps(o, ["ref", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside"]);
  let i = false, l = false;
  const a = (f) => {
    var _a2;
    (_a2 = r.onPointerDownOutside) == null ? void 0 : _a2.call(r, f), n.modal() && f.detail.isContextMenu && f.preventDefault();
  }, c = (f) => {
    var _a2;
    (_a2 = r.onFocusOutside) == null ? void 0 : _a2.call(r, f), n.modal() && f.preventDefault();
  }, u = (f) => {
    var _a2;
    (_a2 = r.onInteractOutside) == null ? void 0 : _a2.call(r, f), !n.modal() && (f.defaultPrevented || (i = true, f.detail.originalEvent.type === "pointerdown" && (l = true)), me(n.triggerRef(), f.target) && f.preventDefault(), f.detail.originalEvent.type === "focusin" && l && f.preventDefault());
  }, d = (f) => {
    var _a2;
    (_a2 = r.onCloseAutoFocus) == null ? void 0 : _a2.call(r, f), n.modal() ? (f.preventDefault(), ee$1(n.triggerRef())) : (f.defaultPrevented || (i || ee$1(n.triggerRef()), f.preventDefault()), i = false, l = false);
  };
  return Yo({ isDisabled: () => !(n.isOpen() && n.modal()), targets: () => [] }), Jo({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), qo({ trapFocus: () => n.isOpen() && n.modal(), onMountAutoFocus: r.onOpenAutoFocus, onUnmountAutoFocus: d }, () => t), createEffect(() => onCleanup(n.registerContentId(s.id))), createComponent$1(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent$1(vn, mergeProps({ role: "dialog", tabIndex: -1, get disableOutsidePointerEvents() {
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
    }, onPointerDownOutside: a, onFocusOutside: c, onInteractOutside: u, get onDismiss() {
      return n.close;
    } }, s));
  } });
}
function nr$1(e) {
  const t = Re(), n = j({ id: t.generateId("description") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerDescriptionId(o.id))), createComponent$1(Y$1, mergeProps({ as: "p", get id() {
    return o.id;
  } }, r));
}
function or$1(e) {
  const t = Re(), [n, o] = splitProps(e, ["ref", "style", "onPointerDown"]), r = (s) => {
    q$1(s, n.onPointerDown), s.target === s.currentTarget && s.preventDefault();
  };
  return createComponent$1(Show, { get when() {
    return t.overlayPresent();
  }, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "div", get style() {
      return ht$1({ "pointer-events": "auto" }, n.style);
    }, get "data-expanded"() {
      return t.isOpen() ? "" : void 0;
    }, get "data-closed"() {
      return t.isOpen() ? void 0 : "";
    }, onPointerDown: r }, o));
  } });
}
function rr$1(e) {
  const t = Re();
  return createComponent$1(Show, { get when() {
    return t.contentPresent() || t.overlayPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
var oo = { dismiss: "Dismiss" };
function sr$1(e) {
  const t = `dialog-${createUniqueId()}`, n = j({ id: t, modal: true, translations: oo }, e), [o, r] = createSignal(), [s, i] = createSignal(), [l, a] = createSignal(), [c, u] = createSignal(), [d, f] = createSignal(), [g, p] = createSignal(), y = wn({ open: () => n.open, defaultOpen: () => n.defaultOpen, onOpenChange: (x) => {
    var _a2;
    return (_a2 = n.onOpenChange) == null ? void 0 : _a2.call(n, x);
  } }), h = () => n.forceMount || y.isOpen(), { present: b } = At$1({ show: h, element: () => {
    var _a2;
    return (_a2 = c()) != null ? _a2 : null;
  } }), { present: m } = At$1({ show: h, element: () => {
    var _a2;
    return (_a2 = d()) != null ? _a2 : null;
  } }), w = { translations: () => {
    var _a2;
    return (_a2 = n.translations) != null ? _a2 : oo;
  }, isOpen: y.isOpen, modal: () => {
    var _a2;
    return (_a2 = n.modal) != null ? _a2 : true;
  }, preventScroll: () => {
    var _a2;
    return (_a2 = n.preventScroll) != null ? _a2 : w.modal();
  }, contentId: o, titleId: s, descriptionId: l, triggerRef: g, overlayRef: c, setOverlayRef: u, contentRef: d, setContentRef: f, overlayPresent: b, contentPresent: m, close: y.close, toggle: y.toggle, setTriggerRef: p, generateId: Xe(() => n.id), registerContentId: re$1(r), registerTitleId: re$1(i), registerDescriptionId: re$1(a) };
  return createComponent$1(Qo.Provider, { value: w, get children() {
    return n.children;
  } });
}
function ir$1(e) {
  const t = Re(), n = j({ id: t.generateId("title") }, e), [o, r] = splitProps(n, ["id"]);
  return createEffect(() => onCleanup(t.registerTitleId(o.id))), createComponent$1(Y$1, mergeProps({ as: "h2", get id() {
    return o.id;
  } }, r));
}
function lr$1(e) {
  const t = Re(), [n, o] = splitProps(e, ["ref", "onClick"]);
  return createComponent$1(bt$1, mergeProps({ "aria-haspopup": "dialog", get "aria-expanded"() {
    return t.isOpen();
  }, get "aria-controls"() {
    return t.isOpen() ? t.contentId() : void 0;
  }, get "data-expanded"() {
    return t.isOpen() ? "" : void 0;
  }, get "data-closed"() {
    return t.isOpen() ? void 0 : "";
  }, onClick: (s) => {
    q$1(s, n.onClick), t.toggle();
  } }, o));
}
var Pe = Object.assign(sr$1, { CloseButton: er$1, Content: tr$1, Description: nr$1, Overlay: or$1, Portal: rr$1, Title: ir$1, Trigger: lr$1 });
const hc = Pe, mc = Pe.Trigger, ul = Pe.Portal;
Pe.CloseButton;
const dl = (e) => {
  const [t, n] = splitProps(e, ["class"]);
  return createComponent$1(Pe.Overlay, mergeProps({ get class() {
    return Me("fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0", t.class);
  } }, n));
}, yc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return createComponent$1(ul, { get children() {
    return [createComponent$1(dl, {}), createComponent$1(Pe.Content, mergeProps({ get class() {
      return Me("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 sm:rounded-lg", t.class);
    } }, n, { get children() {
      return t.children;
    } }))];
  } });
}, bc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return ssrElement("div", mergeProps({ get class() {
    return Me("flex flex-col space-y-1.5 text-center sm:text-left", t.class);
  } }, n), () => escape(t.children), true);
}, vc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return ssrElement("div", mergeProps({ get class() {
    return Me("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", t.class);
  } }, n), () => escape(t.children), true);
}, wc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return createComponent$1(Pe.Title, mergeProps({ get class() {
    return Me("text-lg font-semibold leading-none tracking-tight", t.class);
  } }, n, { get children() {
    return t.children;
  } }));
}, xc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return createComponent$1(Pe.Description, mergeProps({ get class() {
    return Me("text-sm text-muted-foreground", t.class);
  } }, n, { get children() {
    return t.children;
  } }));
};
function ar$1(e) {
  var _a2, _b, _c;
  let t = (_a2 = e.startIndex) != null ? _a2 : 0;
  const n = (_b = e.startLevel) != null ? _b : 0, o = [], r = (a) => {
    var _a3;
    if (a == null) return "";
    const c = (_a3 = e.getKey) != null ? _a3 : "key", u = He(c) ? a[c] : c(a);
    return u != null ? String(u) : "";
  }, s = (a) => {
    var _a3;
    if (a == null) return "";
    const c = (_a3 = e.getTextValue) != null ? _a3 : "textValue", u = He(c) ? a[c] : c(a);
    return u != null ? String(u) : "";
  }, i = (a) => {
    var _a3, _b2;
    if (a == null) return false;
    const c = (_a3 = e.getDisabled) != null ? _a3 : "disabled";
    return (_b2 = He(c) ? a[c] : c(a)) != null ? _b2 : false;
  }, l = (a) => {
    var _a3;
    if (a != null) return He(e.getSectionChildren) ? a[e.getSectionChildren] : (_a3 = e.getSectionChildren) == null ? void 0 : _a3.call(e, a);
  };
  for (const a of e.dataSource) {
    if (He(a) || Ms(a)) {
      o.push({ type: "item", rawValue: a, key: String(a), textValue: String(a), disabled: i(a), level: n, index: t }), t++;
      continue;
    }
    if (l(a) != null) {
      o.push({ type: "section", rawValue: a, key: "", textValue: "", disabled: false, level: n, index: t }), t++;
      const c = (_c = l(a)) != null ? _c : [];
      if (c.length > 0) {
        const u = ar$1({ dataSource: c, getKey: e.getKey, getTextValue: e.getTextValue, getDisabled: e.getDisabled, getSectionChildren: e.getSectionChildren, startIndex: t, startLevel: n + 1 });
        o.push(...u), t += u.length;
      }
    } else o.push({ type: "item", rawValue: a, key: r(a), textValue: s(a), disabled: i(a), level: n, index: t }), t++;
  }
  return o;
}
function fl(e, t = []) {
  return createMemo(() => {
    const n = ar$1({ dataSource: v(e.dataSource), getKey: v(e.getKey), getTextValue: v(e.getTextValue), getDisabled: v(e.getDisabled), getSectionChildren: v(e.getSectionChildren) });
    for (let o = 0; o < t.length; o++) t[o]();
    return e.factory(n);
  });
}
var gl = /* @__PURE__ */ new Set(["Avst", "Arab", "Armi", "Syrc", "Samr", "Mand", "Thaa", "Mend", "Nkoo", "Adlm", "Rohg", "Hebr"]), pl = /* @__PURE__ */ new Set(["ae", "ar", "arc", "bcc", "bqi", "ckb", "dv", "fa", "glk", "he", "ku", "mzn", "nqo", "pnb", "ps", "sd", "ug", "ur", "yi"]);
function hl(e) {
  var _a2;
  if (Intl.Locale) {
    const n = (_a2 = new Intl.Locale(e).maximize().script) != null ? _a2 : "";
    return gl.has(n);
  }
  const t = e.split("-")[0];
  return pl.has(t);
}
function ml(e) {
  return hl(e) ? "rtl" : "ltr";
}
function cr$1() {
  let e = typeof navigator < "u" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([e]);
  } catch {
    e = "en-US";
  }
  return { locale: e, direction: ml(e) };
}
var sn = cr$1(), lt$1 = /* @__PURE__ */ new Set();
function ro() {
  sn = cr$1();
  for (const e of lt$1) e(sn);
}
function yl() {
  const e = { locale: "en-US", direction: "ltr" }, [t, n] = createSignal(sn), o = createMemo(() => isServer ? e : t());
  return onMount(() => {
    lt$1.size === 0 && window.addEventListener("languagechange", ro), lt$1.add(n), onCleanup(() => {
      lt$1.delete(n), lt$1.size === 0 && window.removeEventListener("languagechange", ro);
    });
  }), { locale: () => o().locale, direction: () => o().direction };
}
var bl = createContext$1();
function xn() {
  const e = yl();
  return useContext(bl) || e;
}
var Qt$1 = /* @__PURE__ */ new Map();
function ur$1(e) {
  const { locale: t } = xn(), n = createMemo(() => t() + (e ? Object.entries(e).sort((o, r) => o[0] < r[0] ? -1 : 1).join() : ""));
  return createMemo(() => {
    const o = n();
    let r;
    return Qt$1.has(o) && (r = Qt$1.get(o)), r || (r = new Intl.Collator(t(), e), Qt$1.set(o, r)), r;
  });
}
var he = class dr extends Set {
  constructor(t, n, o) {
    super(t);
    __publicField$1(this, "anchorKey");
    __publicField$1(this, "currentKey");
    t instanceof dr ? (this.anchorKey = n || t.anchorKey, this.currentKey = o || t.currentKey) : (this.anchorKey = n, this.currentKey = o);
  }
};
function vl(e) {
  const [t, n] = Zo(e);
  return [() => {
    var _a2;
    return (_a2 = t()) != null ? _a2 : new he();
  }, n];
}
function fr$1(e) {
  return e.ctrlKey;
}
function je(e) {
  return e.ctrlKey;
}
function so(e) {
  return new he(e);
}
function gr$1(e, t) {
  if (e.size !== t.size) return false;
  for (const n of e) if (!t.has(n)) return false;
  return true;
}
function wl(e) {
  const t = j({ selectionMode: "none", selectionBehavior: "toggle" }, e), [n, o] = createSignal(false), [r, s] = createSignal(), i = createMemo(() => {
    const y = v(t.selectedKeys);
    return y != null ? so(y) : y;
  }), l = createMemo(() => {
    const y = v(t.defaultSelectedKeys);
    return y != null ? so(y) : new he();
  }), [a, c] = vl({ value: i, defaultValue: l, onChange: (y) => {
    var _a2;
    return (_a2 = t.onSelectionChange) == null ? void 0 : _a2.call(t, y);
  } }), [u, d] = createSignal(v(t.selectionBehavior)), f = () => v(t.selectionMode), g = () => {
    var _a2;
    return (_a2 = v(t.disallowEmptySelection)) != null ? _a2 : false;
  }, p = (y) => {
    (v(t.allowDuplicateSelectionEvents) || !gr$1(y, a())) && c(y);
  };
  return createEffect(() => {
    const y = a();
    v(t.selectionBehavior) === "replace" && u() === "toggle" && typeof y == "object" && y.size === 0 && d("replace");
  }), createEffect(() => {
    var _a2;
    d((_a2 = v(t.selectionBehavior)) != null ? _a2 : "toggle");
  }), { selectionMode: f, disallowEmptySelection: g, selectionBehavior: u, setSelectionBehavior: d, isFocused: n, setFocused: o, focusedKey: r, setFocusedKey: s, selectedKeys: a, setSelectedKeys: p };
}
function pr$1(e) {
  const [t, n] = createSignal(""), [o, r] = createSignal(-1);
  return { typeSelectHandlers: { onKeyDown: (i) => {
    var _a2, _b, _c;
    if (v(e.isDisabled)) return;
    const l = v(e.keyboardDelegate), a = v(e.selectionManager);
    if (!l.getKeyForSearch) return;
    const c = xl(i.key);
    if (!c || i.ctrlKey || i.metaKey) return;
    c === " " && t().trim().length > 0 && (i.preventDefault(), i.stopPropagation());
    let u = n((f) => f + c), d = (_a2 = l.getKeyForSearch(u, a.focusedKey())) != null ? _a2 : l.getKeyForSearch(u);
    d == null && Sl(u) && (u = u[0], d = (_b = l.getKeyForSearch(u, a.focusedKey())) != null ? _b : l.getKeyForSearch(u)), d != null && (a.setFocusedKey(d), (_c = e.onTypeSelect) == null ? void 0 : _c.call(e, d)), clearTimeout(o()), r(window.setTimeout(() => n(""), 500));
  } } };
}
function xl(e) {
  return e.length === 1 || !/^[A-Z]/i.test(e) ? e : "";
}
function Sl(e) {
  return e.split("").every((t) => t === e[0]);
}
function Cl(e, t, n) {
  const r = mergeProps$1({ selectOnFocus: () => v(e.selectionManager).selectionBehavior() === "replace" }, e), s = () => {
    var _a2;
    return (_a2 = n == null ? void 0 : n()) != null ? _a2 : t();
  }, { direction: i } = xn();
  let l = { top: 0, left: 0 };
  Is(() => v(r.isVirtualized) ? void 0 : s(), "scroll", () => {
    const h = s();
    h && (l = { top: h.scrollTop, left: h.scrollLeft });
  });
  const { typeSelectHandlers: a } = pr$1({ isDisabled: () => v(r.disallowTypeAhead), keyboardDelegate: () => v(r.keyboardDelegate), selectionManager: () => v(r.selectionManager) }), c = () => {
    var _a2;
    return (_a2 = v(r.orientation)) != null ? _a2 : "vertical";
  }, u = (h) => {
    var _a2, _b, _c, _d, _e2, _f, _g, _h;
    q$1(h, a.onKeyDown), h.altKey && h.key === "Tab" && h.preventDefault();
    const b = t();
    if (!(b == null ? void 0 : b.contains(h.target))) return;
    const m = v(r.selectionManager), w = v(r.selectOnFocus), x = (E) => {
      E != null && (m.setFocusedKey(E), h.shiftKey && m.selectionMode() === "multiple" ? m.extendSelection(E) : w && !fr$1(h) && m.replaceSelection(E));
    }, C = v(r.keyboardDelegate), I = v(r.shouldFocusWrap), P = m.focusedKey();
    switch (h.key) {
      case (c() === "vertical" ? "ArrowDown" : "ArrowRight"): {
        if (C.getKeyBelow) {
          h.preventDefault();
          let E;
          P != null ? E = C.getKeyBelow(P) : E = (_a2 = C.getFirstKey) == null ? void 0 : _a2.call(C), E == null && I && (E = (_b = C.getFirstKey) == null ? void 0 : _b.call(C, P)), x(E);
        }
        break;
      }
      case (c() === "vertical" ? "ArrowUp" : "ArrowLeft"): {
        if (C.getKeyAbove) {
          h.preventDefault();
          let E;
          P != null ? E = C.getKeyAbove(P) : E = (_c = C.getLastKey) == null ? void 0 : _c.call(C), E == null && I && (E = (_d = C.getLastKey) == null ? void 0 : _d.call(C, P)), x(E);
        }
        break;
      }
      case (c() === "vertical" ? "ArrowLeft" : "ArrowUp"): {
        if (C.getKeyLeftOf) {
          h.preventDefault();
          const E = i() === "rtl";
          let M;
          P != null ? M = C.getKeyLeftOf(P) : M = E ? (_e2 = C.getFirstKey) == null ? void 0 : _e2.call(C) : (_f = C.getLastKey) == null ? void 0 : _f.call(C), x(M);
        }
        break;
      }
      case (c() === "vertical" ? "ArrowRight" : "ArrowDown"): {
        if (C.getKeyRightOf) {
          h.preventDefault();
          const E = i() === "rtl";
          let M;
          P != null ? M = C.getKeyRightOf(P) : M = E ? (_g = C.getLastKey) == null ? void 0 : _g.call(C) : (_h = C.getFirstKey) == null ? void 0 : _h.call(C), x(M);
        }
        break;
      }
      case "Home":
        if (C.getFirstKey) {
          h.preventDefault();
          const E = C.getFirstKey(P, je(h));
          E != null && (m.setFocusedKey(E), je(h) && h.shiftKey && m.selectionMode() === "multiple" ? m.extendSelection(E) : w && m.replaceSelection(E));
        }
        break;
      case "End":
        if (C.getLastKey) {
          h.preventDefault();
          const E = C.getLastKey(P, je(h));
          E != null && (m.setFocusedKey(E), je(h) && h.shiftKey && m.selectionMode() === "multiple" ? m.extendSelection(E) : w && m.replaceSelection(E));
        }
        break;
      case "PageDown":
        if (C.getKeyPageBelow && P != null) {
          h.preventDefault();
          const E = C.getKeyPageBelow(P);
          x(E);
        }
        break;
      case "PageUp":
        if (C.getKeyPageAbove && P != null) {
          h.preventDefault();
          const E = C.getKeyPageAbove(P);
          x(E);
        }
        break;
      case "a":
        je(h) && m.selectionMode() === "multiple" && v(r.disallowSelectAll) !== true && (h.preventDefault(), m.selectAll());
        break;
      case "Escape":
        h.defaultPrevented || (h.preventDefault(), v(r.disallowEmptySelection) || m.clearSelection());
        break;
      case "Tab":
        if (!v(r.allowsTabNavigation)) {
          if (h.shiftKey) b.focus();
          else {
            const E = Zs(b, { tabbable: true });
            let M, _;
            do
              _ = E.lastChild(), _ && (M = _);
            while (_);
            M && !M.contains(document.activeElement) && ee$1(M);
          }
          break;
        }
    }
  }, d = (h) => {
    var _a2, _b, _c, _d;
    const b = v(r.selectionManager), m = v(r.keyboardDelegate), w = v(r.selectOnFocus);
    if (b.isFocused()) {
      h.currentTarget.contains(h.target) || b.setFocused(false);
      return;
    }
    if (h.currentTarget.contains(h.target)) {
      if (b.setFocused(true), b.focusedKey() == null) {
        const x = (I) => {
          I != null && (b.setFocusedKey(I), w && b.replaceSelection(I));
        }, C = h.relatedTarget;
        C && h.currentTarget.compareDocumentPosition(C) & Node.DOCUMENT_POSITION_FOLLOWING ? x((_b = b.lastSelectedKey()) != null ? _b : (_a2 = m.getLastKey) == null ? void 0 : _a2.call(m)) : x((_d = b.firstSelectedKey()) != null ? _d : (_c = m.getFirstKey) == null ? void 0 : _c.call(m));
      } else if (!v(r.isVirtualized)) {
        const x = s();
        if (x) {
          x.scrollTop = l.top, x.scrollLeft = l.left;
          const C = x.querySelector(`[data-key="${b.focusedKey()}"]`);
          C && (ee$1(C), Wn(x, C));
        }
      }
    }
  }, f = (h) => {
    const b = v(r.selectionManager);
    h.currentTarget.contains(h.relatedTarget) || b.setFocused(false);
  }, g = (h) => {
    s() === h.target && h.preventDefault();
  }, p = () => {
    var _a2, _b;
    const h = v(r.autoFocus);
    if (!h) return;
    const b = v(r.selectionManager), m = v(r.keyboardDelegate);
    let w;
    h === "first" && (w = (_a2 = m.getFirstKey) == null ? void 0 : _a2.call(m)), h === "last" && (w = (_b = m.getLastKey) == null ? void 0 : _b.call(m));
    const x = b.selectedKeys();
    x.size && (w = x.values().next().value), b.setFocused(true), b.setFocusedKey(w);
    const C = t();
    C && w == null && !v(r.shouldUseVirtualFocus) && ee$1(C);
  };
  return onMount(() => {
    r.deferAutoFocus ? setTimeout(p, 0) : p();
  }), createEffect(on$2([s, () => v(r.isVirtualized), () => v(r.selectionManager).focusedKey()], (h) => {
    var _a2;
    const [b, m, w] = h;
    if (m) w && ((_a2 = r.scrollToKey) == null ? void 0 : _a2.call(r, w));
    else if (w && b) {
      const x = b.querySelector(`[data-key="${w}"]`);
      x && Wn(b, x);
    }
  })), { tabIndex: createMemo(() => {
    if (!v(r.shouldUseVirtualFocus)) return v(r.selectionManager).focusedKey() == null ? 0 : -1;
  }), onKeyDown: u, onMouseDown: g, onFocusIn: d, onFocusOut: f };
}
function El(e, t) {
  const n = () => v(e.selectionManager), o = () => v(e.key), r = () => v(e.shouldUseVirtualFocus), s = (m) => {
    n().selectionMode() !== "none" && (n().selectionMode() === "single" ? n().isSelected(o()) && !n().disallowEmptySelection() ? n().toggleSelection(o()) : n().replaceSelection(o()) : (m == null ? void 0 : m.shiftKey) ? n().extendSelection(o()) : n().selectionBehavior() === "toggle" || je(m) || "pointerType" in m && m.pointerType === "touch" ? n().toggleSelection(o()) : n().replaceSelection(o()));
  }, i = () => n().isSelected(o()), l = () => v(e.disabled) || n().isDisabled(o()), a = () => !l() && n().canSelectItem(o());
  let c = null;
  const u = (m) => {
    a() && (c = m.pointerType, m.pointerType === "mouse" && m.button === 0 && !v(e.shouldSelectOnPressUp) && s(m));
  }, d = (m) => {
    a() && m.pointerType === "mouse" && m.button === 0 && v(e.shouldSelectOnPressUp) && v(e.allowsDifferentPressOrigin) && s(m);
  }, f = (m) => {
    a() && (v(e.shouldSelectOnPressUp) && !v(e.allowsDifferentPressOrigin) || c !== "mouse") && s(m);
  }, g = (m) => {
    !a() || !["Enter", " "].includes(m.key) || (fr$1(m) ? n().toggleSelection(o()) : s(m));
  }, p = (m) => {
    l() && m.preventDefault();
  }, y = (m) => {
    const w = t();
    r() || l() || !w || m.target === w && n().setFocusedKey(o());
  }, h = createMemo(() => {
    if (!(r() || l())) return o() === n().focusedKey() ? 0 : -1;
  }), b = createMemo(() => v(e.virtualized) ? void 0 : o());
  return createEffect(on$2([t, o, r, () => n().focusedKey(), () => n().isFocused()], ([m, w, x, C, I]) => {
    m && w === C && I && !x && document.activeElement !== m && (e.focus ? e.focus() : ee$1(m));
  })), { isSelected: i, isDisabled: l, allowsSelection: a, tabIndex: h, dataKey: b, onPointerDown: u, onPointerUp: d, onClick: f, onKeyDown: g, onMouseDown: p, onFocus: y };
}
var Pl = class {
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
    const n = this.state.selectedKeys(), o = n.anchorKey || t, r = new he(n, o, t);
    for (const s of this.getKeyRange(o, n.currentKey || t)) r.delete(s);
    for (const s of this.getKeyRange(t, o)) this.canSelectItem(s) && r.add(s);
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
    const n = new he(this.state.selectedKeys());
    n.has(t) ? n.delete(t) : this.canSelectItem(t) && (n.add(t), n.anchorKey = t, n.currentKey = t), !(this.disallowEmptySelection() && n.size === 0) && this.state.setSelectedKeys(n);
  }
  replaceSelection(e) {
    if (this.selectionMode() === "none") return;
    const t = this.getKey(e);
    if (t == null) return;
    const n = this.canSelectItem(t) ? new he([t], t, t) : new he();
    this.state.setSelectedKeys(n);
  }
  setSelectedKeys(e) {
    if (this.selectionMode() === "none") return;
    const t = new he();
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
    !this.disallowEmptySelection() && e.size > 0 && this.state.setSelectedKeys(new he());
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
}, io = class {
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
    var _a2;
    return (_a2 = this.keyMap.get(e)) == null ? void 0 : _a2.prevKey;
  }
  getKeyAfter(e) {
    var _a2;
    return (_a2 = this.keyMap.get(e)) == null ? void 0 : _a2.nextKey;
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
function hr$1(e) {
  const t = wl(e), o = fl({ dataSource: () => v(e.dataSource), getKey: () => v(e.getKey), getTextValue: () => v(e.getTextValue), getDisabled: () => v(e.getDisabled), getSectionChildren: () => v(e.getSectionChildren), factory: (s) => e.filter ? new io(e.filter(s)) : new io(s) }, [() => e.filter]), r = new Pl(o, t);
  return createComputed(() => {
    const s = t.focusedKey();
    s != null && !o().getItem(s) && t.setFocusedKey(void 0);
  }), { collection: o, selectionManager: () => r };
}
const Tl = ["top", "right", "bottom", "left"], Ie = Math.min, oe$1 = Math.max, Lt$1 = Math.round, Pt$1 = Math.floor, ye = (e) => ({ x: e, y: e }), Ol = { left: "right", right: "left", bottom: "top", top: "bottom" }, Dl = { start: "end", end: "start" };
function ln(e, t, n) {
  return oe$1(e, Ie(t, n));
}
function _e(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function ke(e) {
  return e.split("-")[0];
}
function Je(e) {
  return e.split("-")[1];
}
function mr$1(e) {
  return e === "x" ? "y" : "x";
}
function Sn(e) {
  return e === "y" ? "height" : "width";
}
const Al = /* @__PURE__ */ new Set(["top", "bottom"]);
function Ce(e) {
  return Al.has(ke(e)) ? "y" : "x";
}
function Cn(e) {
  return mr$1(Ce(e));
}
function Ll(e, t, n) {
  n === void 0 && (n = false);
  const o = Je(e), r = Cn(e), s = Sn(r);
  let i = r === "x" ? o === (n ? "end" : "start") ? "right" : "left" : o === "start" ? "bottom" : "top";
  return t.reference[s] > t.floating[s] && (i = It$1(i)), [i, It$1(i)];
}
function Il(e) {
  const t = It$1(e);
  return [an(e), t, an(t)];
}
function an(e) {
  return e.replace(/start|end/g, (t) => Dl[t]);
}
const lo = ["left", "right"], ao = ["right", "left"], kl = ["top", "bottom"], Fl = ["bottom", "top"];
function Kl(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? ao : lo : t ? lo : ao;
    case "left":
    case "right":
      return t ? kl : Fl;
    default:
      return [];
  }
}
function Ml(e, t, n, o) {
  const r = Je(e);
  let s = Kl(ke(e), n === "start", o);
  return r && (s = s.map((i) => i + "-" + r), t && (s = s.concat(s.map(an)))), s;
}
function It$1(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Ol[t]);
}
function Rl(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function yr$1(e) {
  return typeof e != "number" ? Rl(e) : { top: e, right: e, bottom: e, left: e };
}
function kt$1(e) {
  const { x: t, y: n, width: o, height: r } = e;
  return { width: o, height: r, top: n, left: t, right: t + o, bottom: n + r, x: t, y: n };
}
function co(e, t, n) {
  let { reference: o, floating: r } = e;
  const s = Ce(t), i = Cn(t), l = Sn(i), a = ke(t), c = s === "y", u = o.x + o.width / 2 - r.width / 2, d = o.y + o.height / 2 - r.height / 2, f = o[l] / 2 - r[l] / 2;
  let g;
  switch (a) {
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
  switch (Je(t)) {
    case "start":
      g[i] -= f * (n && c ? -1 : 1);
      break;
    case "end":
      g[i] += f * (n && c ? -1 : 1);
      break;
  }
  return g;
}
const Nl = async (e, t, n) => {
  const { placement: o = "bottom", strategy: r = "absolute", middleware: s = [], platform: i } = n, l = s.filter(Boolean), a = await (i.isRTL == null ? void 0 : i.isRTL(t));
  let c = await i.getElementRects({ reference: e, floating: t, strategy: r }), { x: u, y: d } = co(c, o, a), f = o, g = {}, p = 0;
  for (let y = 0; y < l.length; y++) {
    const { name: h, fn: b } = l[y], { x: m, y: w, data: x, reset: C } = await b({ x: u, y: d, initialPlacement: o, placement: f, strategy: r, middlewareData: g, rects: c, platform: i, elements: { reference: e, floating: t } });
    u = m != null ? m : u, d = w != null ? w : d, g = { ...g, [h]: { ...g[h], ...x } }, C && p <= 50 && (p++, typeof C == "object" && (C.placement && (f = C.placement), C.rects && (c = C.rects === true ? await i.getElementRects({ reference: e, floating: t, strategy: r }) : C.rects), { x: u, y: d } = co(c, f, a)), y = -1);
  }
  return { x: u, y: d, placement: f, strategy: r, middlewareData: g };
};
async function ft$1(e, t) {
  var n;
  t === void 0 && (t = {});
  const { x: o, y: r, platform: s, rects: i, elements: l, strategy: a } = e, { boundary: c = "clippingAncestors", rootBoundary: u = "viewport", elementContext: d = "floating", altBoundary: f = false, padding: g = 0 } = _e(t, e), p = yr$1(g), h = l[f ? d === "floating" ? "reference" : "floating" : d], b = kt$1(await s.getClippingRect({ element: (n = await (s.isElement == null ? void 0 : s.isElement(h))) == null || n ? h : h.contextElement || await (s.getDocumentElement == null ? void 0 : s.getDocumentElement(l.floating)), boundary: c, rootBoundary: u, strategy: a })), m = d === "floating" ? { x: o, y: r, width: i.floating.width, height: i.floating.height } : i.reference, w = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(l.floating)), x = await (s.isElement == null ? void 0 : s.isElement(w)) ? await (s.getScale == null ? void 0 : s.getScale(w)) || { x: 1, y: 1 } : { x: 1, y: 1 }, C = kt$1(s.convertOffsetParentRelativeRectToViewportRelativeRect ? await s.convertOffsetParentRelativeRectToViewportRelativeRect({ elements: l, rect: m, offsetParent: w, strategy: a }) : m);
  return { top: (b.top - C.top + p.top) / x.y, bottom: (C.bottom - b.bottom + p.bottom) / x.y, left: (b.left - C.left + p.left) / x.x, right: (C.right - b.right + p.right) / x.x };
}
const Vl = (e) => ({ name: "arrow", options: e, async fn(t) {
  const { x: n, y: o, placement: r, rects: s, platform: i, elements: l, middlewareData: a } = t, { element: c, padding: u = 0 } = _e(e, t) || {};
  if (c == null) return {};
  const d = yr$1(u), f = { x: n, y: o }, g = Cn(r), p = Sn(g), y = await i.getDimensions(c), h = g === "y", b = h ? "top" : "left", m = h ? "bottom" : "right", w = h ? "clientHeight" : "clientWidth", x = s.reference[p] + s.reference[g] - f[g] - s.floating[p], C = f[g] - s.reference[g], I = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(c));
  let P = I ? I[w] : 0;
  (!P || !await (i.isElement == null ? void 0 : i.isElement(I))) && (P = l.floating[w] || s.floating[p]);
  const E = x / 2 - C / 2, M = P / 2 - y[p] / 2 - 1, _ = Ie(d[b], M), U = Ie(d[m], M), T = _, X = P - y[p] - U, L = P / 2 - y[p] / 2 + E, O = ln(T, L, X), D = !a.arrow && Je(r) != null && L !== O && s.reference[p] / 2 - (L < T ? _ : U) - y[p] / 2 < 0, z = D ? L < T ? L - T : L - X : 0;
  return { [g]: f[g] + z, data: { [g]: O, centerOffset: L - O - z, ...D && { alignmentOffset: z } }, reset: D };
} }), Bl = function(e) {
  return e === void 0 && (e = {}), { name: "flip", options: e, async fn(t) {
    var n, o;
    const { placement: r, middlewareData: s, rects: i, initialPlacement: l, platform: a, elements: c } = t, { mainAxis: u = true, crossAxis: d = true, fallbackPlacements: f, fallbackStrategy: g = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: y = true, ...h } = _e(e, t);
    if ((n = s.arrow) != null && n.alignmentOffset) return {};
    const b = ke(r), m = Ce(l), w = ke(l) === l, x = await (a.isRTL == null ? void 0 : a.isRTL(c.floating)), C = f || (w || !y ? [It$1(l)] : Il(l)), I = p !== "none";
    !f && I && C.push(...Ml(l, y, p, x));
    const P = [l, ...C], E = await ft$1(t, h), M = [];
    let _ = ((o = s.flip) == null ? void 0 : o.overflows) || [];
    if (u && M.push(E[b]), d) {
      const L = Ll(r, i, x);
      M.push(E[L[0]], E[L[1]]);
    }
    if (_ = [..._, { placement: r, overflows: M }], !M.every((L) => L <= 0)) {
      var U, T;
      const L = (((U = s.flip) == null ? void 0 : U.index) || 0) + 1, O = P[L];
      if (O && (!(d === "alignment" ? m !== Ce(O) : false) || _.every(($) => Ce($.placement) === m ? $.overflows[0] > 0 : true))) return { data: { index: L, overflows: _ }, reset: { placement: O } };
      let D = (T = _.filter((z) => z.overflows[0] <= 0).sort((z, $) => z.overflows[1] - $.overflows[1])[0]) == null ? void 0 : T.placement;
      if (!D) switch (g) {
        case "bestFit": {
          var X;
          const z = (X = _.filter(($) => {
            if (I) {
              const G = Ce($.placement);
              return G === m || G === "y";
            }
            return true;
          }).map(($) => [$.placement, $.overflows.filter((G) => G > 0).reduce((G, te) => G + te, 0)]).sort(($, G) => $[1] - G[1])[0]) == null ? void 0 : X[0];
          z && (D = z);
          break;
        }
        case "initialPlacement":
          D = l;
          break;
      }
      if (r !== D) return { reset: { placement: D } };
    }
    return {};
  } };
};
function uo(e, t) {
  return { top: e.top - t.height, right: e.right - t.width, bottom: e.bottom - t.height, left: e.left - t.width };
}
function fo(e) {
  return Tl.some((t) => e[t] >= 0);
}
const zl = function(e) {
  return e === void 0 && (e = {}), { name: "hide", options: e, async fn(t) {
    const { rects: n } = t, { strategy: o = "referenceHidden", ...r } = _e(e, t);
    switch (o) {
      case "referenceHidden": {
        const s = await ft$1(t, { ...r, elementContext: "reference" }), i = uo(s, n.reference);
        return { data: { referenceHiddenOffsets: i, referenceHidden: fo(i) } };
      }
      case "escaped": {
        const s = await ft$1(t, { ...r, altBoundary: true }), i = uo(s, n.floating);
        return { data: { escapedOffsets: i, escaped: fo(i) } };
      }
      default:
        return {};
    }
  } };
}, _l = /* @__PURE__ */ new Set(["left", "top"]);
async function $l(e, t) {
  const { placement: n, platform: o, elements: r } = e, s = await (o.isRTL == null ? void 0 : o.isRTL(r.floating)), i = ke(n), l = Je(n), a = Ce(n) === "y", c = _l.has(i) ? -1 : 1, u = s && a ? -1 : 1, d = _e(t, e);
  let { mainAxis: f, crossAxis: g, alignmentAxis: p } = typeof d == "number" ? { mainAxis: d, crossAxis: 0, alignmentAxis: null } : { mainAxis: d.mainAxis || 0, crossAxis: d.crossAxis || 0, alignmentAxis: d.alignmentAxis };
  return l && typeof p == "number" && (g = l === "end" ? p * -1 : p), a ? { x: g * u, y: f * c } : { x: f * c, y: g * u };
}
const Wl = function(e) {
  return e === void 0 && (e = 0), { name: "offset", options: e, async fn(t) {
    var n, o;
    const { x: r, y: s, placement: i, middlewareData: l } = t, a = await $l(t, e);
    return i === ((n = l.offset) == null ? void 0 : n.placement) && (o = l.arrow) != null && o.alignmentOffset ? {} : { x: r + a.x, y: s + a.y, data: { ...a, placement: i } };
  } };
}, Ul = function(e) {
  return e === void 0 && (e = {}), { name: "shift", options: e, async fn(t) {
    const { x: n, y: o, placement: r } = t, { mainAxis: s = true, crossAxis: i = false, limiter: l = { fn: (h) => {
      let { x: b, y: m } = h;
      return { x: b, y: m };
    } }, ...a } = _e(e, t), c = { x: n, y: o }, u = await ft$1(t, a), d = Ce(ke(r)), f = mr$1(d);
    let g = c[f], p = c[d];
    if (s) {
      const h = f === "y" ? "top" : "left", b = f === "y" ? "bottom" : "right", m = g + u[h], w = g - u[b];
      g = ln(m, g, w);
    }
    if (i) {
      const h = d === "y" ? "top" : "left", b = d === "y" ? "bottom" : "right", m = p + u[h], w = p - u[b];
      p = ln(m, p, w);
    }
    const y = l.fn({ ...t, [f]: g, [d]: p });
    return { ...y, data: { x: y.x - n, y: y.y - o, enabled: { [f]: s, [d]: i } } };
  } };
}, Hl = function(e) {
  return e === void 0 && (e = {}), { name: "size", options: e, async fn(t) {
    var n, o;
    const { placement: r, rects: s, platform: i, elements: l } = t, { apply: a = () => {
    }, ...c } = _e(e, t), u = await ft$1(t, c), d = ke(r), f = Je(r), g = Ce(r) === "y", { width: p, height: y } = s.floating;
    let h, b;
    d === "top" || d === "bottom" ? (h = d, b = f === (await (i.isRTL == null ? void 0 : i.isRTL(l.floating)) ? "start" : "end") ? "left" : "right") : (b = d, h = f === "end" ? "top" : "bottom");
    const m = y - u.top - u.bottom, w = p - u.left - u.right, x = Ie(y - u[h], m), C = Ie(p - u[b], w), I = !t.middlewareData.shift;
    let P = x, E = C;
    if ((n = t.middlewareData.shift) != null && n.enabled.x && (E = w), (o = t.middlewareData.shift) != null && o.enabled.y && (P = m), I && !f) {
      const _ = oe$1(u.left, 0), U = oe$1(u.right, 0), T = oe$1(u.top, 0), X = oe$1(u.bottom, 0);
      g ? E = p - 2 * (_ !== 0 || U !== 0 ? _ + U : oe$1(u.left, u.right)) : P = y - 2 * (T !== 0 || X !== 0 ? T + X : oe$1(u.top, u.bottom));
    }
    await a({ ...t, availableWidth: E, availableHeight: P });
    const M = await i.getDimensions(l.floating);
    return p !== M.width || y !== M.height ? { reset: { rects: true } } : {};
  } };
};
function Qe(e) {
  return "#document";
}
function se$1(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function ve(e) {
  var t;
  return (t = (e.document) || window.document) == null ? void 0 : t.documentElement;
}
function ge(e) {
  return false;
}
function be(e) {
  return false;
}
function go(e) {
  return false ;
}
const jl = /* @__PURE__ */ new Set(["inline", "contents"]);
function vt$1(e) {
  const { overflow: t, overflowX: n, overflowY: o, display: r } = pe(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + o + n) && !jl.has(r);
}
const Yl = [":popover-open", ":modal"];
function Rt$1(e) {
  return Yl.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return false;
    }
  });
}
const Xl = ["transform", "translate", "scale", "rotate", "perspective"], Zl = ["transform", "translate", "scale", "rotate", "perspective", "filter"], Jl = ["paint", "layout", "strict", "content"];
function En(e) {
  const t = Pn(), n = e;
  return Xl.some((o) => n[o] ? n[o] !== "none" : false) || (n.containerType ? n.containerType !== "normal" : false) || !t && (n.backdropFilter ? n.backdropFilter !== "none" : false) || !t && (n.filter ? n.filter !== "none" : false) || Zl.some((o) => (n.willChange || "").includes(o)) || Jl.some((o) => (n.contain || "").includes(o));
}
function Pn() {
  return typeof CSS > "u" || !CSS.supports ? false : CSS.supports("-webkit-backdrop-filter", "none");
}
const ea = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function Ye(e) {
  return ea.has(Qe());
}
function pe(e) {
  return se$1(e).getComputedStyle(e);
}
function Nt$1(e) {
  return { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function Fe(e) {
  const t = e.assignedSlot || e.parentNode || go() || ve(e);
  return t;
}
function vr$1(e) {
  const t = Fe(e);
  return Ye() ? e.ownerDocument ? e.ownerDocument.body : e.body : vr$1(t);
}
function gt$1(e, t, n) {
  var o;
  t === void 0 && (t = []), n === void 0 && (n = true);
  const r = vr$1(e), s = r === ((o = e.ownerDocument) == null ? void 0 : o.body), i = se$1(r);
  if (s) {
    const l = cn(i);
    return t.concat(i, i.visualViewport || [], vt$1(r) ? r : [], l && n ? gt$1(l) : []);
  }
  return t.concat(r, gt$1(r, [], n));
}
function cn(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function wr$1(e) {
  const t = pe(e);
  let n = parseFloat(t.width) || 0, o = parseFloat(t.height) || 0;
  const s = n, i = o, l = Lt$1(n) !== s || Lt$1(o) !== i;
  return l && (n = s, o = i), { width: n, height: o, $: l };
}
function Tn(e) {
  return e.contextElement;
}
function qe(e) {
  Tn(e);
  return ye(1);
}
const ta = ye(0);
function xr(e) {
  const t = se$1(e);
  return !Pn() || !t.visualViewport ? ta : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function na(e, t, n) {
  return t === void 0 && (t = false), !n || t && n !== se$1(e) ? false : t;
}
function Be(e, t, n, o) {
  t === void 0 && (t = false), n === void 0 && (n = false);
  const r = e.getBoundingClientRect(), s = Tn(e);
  let i = ye(1);
  t && (o ? ge() : i = qe(e));
  const l = na(s, n, o) ? xr(s) : ye(0);
  let a = (r.left + l.x) / i.x, c = (r.top + l.y) / i.y, u = r.width / i.x, d = r.height / i.y;
  if (s) {
    const f = se$1(s), g = o && ge() ? se$1(o) : o;
    let p = f, y = cn(p);
    for (; y && o && g !== p; ) {
      const h = qe(y), b = y.getBoundingClientRect(), m = pe(y), w = b.left + (y.clientLeft + parseFloat(m.paddingLeft)) * h.x, x = b.top + (y.clientTop + parseFloat(m.paddingTop)) * h.y;
      a *= h.x, c *= h.y, u *= h.x, d *= h.y, a += w, c += x, p = se$1(y), y = cn(p);
    }
  }
  return kt$1({ width: u, height: d, x: a, y: c });
}
function Vt$1(e, t) {
  const n = Nt$1(e).scrollLeft;
  return t ? t.left + n : Be(ve(e)).left + n;
}
function Sr(e, t) {
  const n = e.getBoundingClientRect(), o = n.left + t.scrollLeft - Vt$1(e, n), r = n.top + t.scrollTop;
  return { x: o, y: r };
}
function oa(e) {
  let { elements: t, rect: n, offsetParent: o, strategy: r } = e;
  const s = r === "fixed", i = ve(o), l = t ? Rt$1(t.floating) : false;
  if (o === i || l && s) return n;
  let a = { scrollLeft: 0, scrollTop: 0 }, c = ye(1);
  const u = ye(0);
  if ((!s) && ((a = Nt$1(o)), be())) ;
  const f = i && true && !s ? Sr(i, a) : ye(0);
  return { width: n.width * c.x, height: n.height * c.y, x: n.x * c.x - a.scrollLeft * c.x + u.x + f.x, y: n.y * c.y - a.scrollTop * c.y + u.y + f.y };
}
function ra(e) {
  return Array.from(e.getClientRects());
}
function sa(e) {
  const t = ve(e), n = Nt$1(e), o = e.ownerDocument.body, r = oe$1(t.scrollWidth, t.clientWidth, o.scrollWidth, o.clientWidth), s = oe$1(t.scrollHeight, t.clientHeight, o.scrollHeight, o.clientHeight);
  let i = -n.scrollLeft + Vt$1(e);
  const l = -n.scrollTop;
  return pe(o).direction === "rtl" && (i += oe$1(t.clientWidth, o.clientWidth) - r), { width: r, height: s, x: i, y: l };
}
const po = 25;
function ia(e, t) {
  const n = se$1(e), o = ve(e), r = n.visualViewport;
  let s = o.clientWidth, i = o.clientHeight, l = 0, a = 0;
  if (r) {
    s = r.width, i = r.height;
    const u = Pn();
    (!u || u && t === "fixed") && (l = r.offsetLeft, a = r.offsetTop);
  }
  const c = Vt$1(o);
  if (c <= 0) {
    const u = o.ownerDocument, d = u.body, f = getComputedStyle(d), g = u.compatMode === "CSS1Compat" && parseFloat(f.marginLeft) + parseFloat(f.marginRight) || 0, p = Math.abs(o.clientWidth - d.clientWidth - g);
    p <= po && (s -= p);
  } else c <= po && (s += c);
  return { width: s, height: i, x: l, y: a };
}
const la = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function ho(e, t, n) {
  let o;
  if (t === "viewport") o = ia(e, n);
  else if (t === "document") o = sa(ve(e));
  else {
    const r = xr(e);
    o = { x: t.x - r.x, y: t.y - r.y, width: t.width, height: t.height };
  }
  return kt$1(o);
}
function Cr$1(e, t) {
  Fe(e);
  return false ;
}
function ca(e, t) {
  const n = t.get(e);
  if (n) return n;
  let o = gt$1(e, [], false).filter((l) => ge()), r = null;
  const s = pe(e).position === "fixed";
  let i = s ? Fe(e) : e;
  for (; ge(); ) {
    const l = pe(i), a = En(i);
    !a && l.position === "fixed" && (r = null), (s ? !a && !r : !a && l.position === "static" && !!r && la.has(r.position) || vt$1(i) && !a && Cr$1(e)) ? o = o.filter((u) => u !== i) : r = l, i = Fe(i);
  }
  return t.set(e, o), o;
}
function ua(e) {
  let { element: t, boundary: n, rootBoundary: o, strategy: r } = e;
  const i = [...n === "clippingAncestors" ? Rt$1(t) ? [] : ca(t, this._c) : [].concat(n), o], l = i[0], a = i.reduce((c, u) => {
    const d = ho(t, u, r);
    return c.top = oe$1(d.top, c.top), c.right = Ie(d.right, c.right), c.bottom = Ie(d.bottom, c.bottom), c.left = oe$1(d.left, c.left), c;
  }, ho(t, l, r));
  return { width: a.right - a.left, height: a.bottom - a.top, x: a.left, y: a.top };
}
function da(e) {
  const { width: t, height: n } = wr$1(e);
  return { width: t, height: n };
}
function fa(e, t, n) {
  const o = be(), r = ve(t), s = n === "fixed", i = Be(e, true, s, t);
  let l = { scrollLeft: 0, scrollTop: 0 };
  const a = ye(0);
  function c() {
    a.x = Vt$1(r);
  }
  if (!s) if ((l = Nt$1(t)), o) ; else r && c();
  s && !o && r && c();
  const u = r && !o && !s ? Sr(r, l) : ye(0), d = i.left + l.scrollLeft - a.x - u.x, f = i.top + l.scrollTop - a.y - u.y;
  return { x: d, y: f, width: i.width, height: i.height };
}
function Er$1(e, t) {
  const n = se$1(e);
  if (Rt$1(e)) return n;
  {
    let r = Fe(e);
    for (; r && !Ye(); ) {
      r = Fe(r);
    }
    return n;
  }
}
const ga = async function(e) {
  const t = this.getOffsetParent || Er$1, n = this.getDimensions, o = await n(e.floating);
  return { reference: fa(e.reference, await t(e.floating), e.strategy), floating: { x: 0, y: 0, width: o.width, height: o.height } };
};
function pa(e) {
  return pe(e).direction === "rtl";
}
const Pr = { convertOffsetParentRelativeRectToViewportRelativeRect: oa, getDocumentElement: ve, getClippingRect: ua, getOffsetParent: Er$1, getElementRects: ga, getClientRects: ra, getDimensions: da, getScale: qe, isElement: ge, isRTL: pa };
function Tr(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function ha(e, t) {
  let n = null, o;
  const r = ve(e);
  function s() {
    var l;
    clearTimeout(o), (l = n) == null || l.disconnect(), n = null;
  }
  function i(l, a) {
    l === void 0 && (l = false), a === void 0 && (a = 1), s();
    const c = e.getBoundingClientRect(), { left: u, top: d, width: f, height: g } = c;
    if (l || t(), !f || !g) return;
    const p = Pt$1(d), y = Pt$1(r.clientWidth - (u + f)), h = Pt$1(r.clientHeight - (d + g)), b = Pt$1(u), w = { rootMargin: -p + "px " + -y + "px " + -h + "px " + -b + "px", threshold: oe$1(0, Ie(1, a)) || 1 };
    let x = true;
    function C(I) {
      const P = I[0].intersectionRatio;
      if (P !== a) {
        if (!x) return i();
        P ? i(false, P) : o = setTimeout(() => {
          i(false, 1e-7);
        }, 1e3);
      }
      P === 1 && !Tr(c, e.getBoundingClientRect()) && i(), x = false;
    }
    try {
      n = new IntersectionObserver(C, { ...w, root: r.ownerDocument });
    } catch {
      n = new IntersectionObserver(C, w);
    }
    n.observe(e);
  }
  return i(true), s;
}
function ma(e, t, n, o) {
  o === void 0 && (o = {});
  const { ancestorScroll: r = true, ancestorResize: s = true, elementResize: i = typeof ResizeObserver == "function", layoutShift: l = typeof IntersectionObserver == "function", animationFrame: a = false } = o, c = Tn(e), u = r || s ? [...c ? gt$1(c) : [], ...gt$1(t)] : [];
  u.forEach((b) => {
    r && b.addEventListener("scroll", n, { passive: true }), s && b.addEventListener("resize", n);
  });
  const d = c && l ? ha(c, n) : null;
  let f = -1, g = null;
  i && (g = new ResizeObserver((b) => {
    let [m] = b;
    m && m.target === c && g && (g.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
      var w;
      (w = g) == null || w.observe(t);
    })), n();
  }), c && !a && g.observe(c), g.observe(t));
  let p, y = a ? Be(e) : null;
  a && h();
  function h() {
    const b = Be(e);
    y && !Tr(y, b) && n(), y = b, p = requestAnimationFrame(h);
  }
  return n(), () => {
    var b;
    u.forEach((m) => {
      r && m.removeEventListener("scroll", n), s && m.removeEventListener("resize", n);
    }), d == null ? void 0 : d(), (b = g) == null || b.disconnect(), g = null, a && cancelAnimationFrame(p);
  };
}
const ya = Wl, ba = Ul, va = Bl, wa = Hl, xa = zl, Sa = Vl, Ca = (e, t, n) => {
  const o = /* @__PURE__ */ new Map(), r = { platform: Pr, ...n }, s = { ...r.platform, _c: o };
  return Nl(e, t, { ...r, platform: s });
};
var Ea = ["<svg", ' display="block" viewBox="', '" style="transform:scale(1.02)"><g', '><path fill="none"', '></path><path stroke="none"', "></path></g></svg>"], On = createContext$1();
function Dn() {
  const e = useContext(On);
  if (e === void 0) throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");
  return e;
}
var at = 30, yo = at / 2, Pa = { top: 180, right: -90, bottom: 0, left: 90 }, bo = "M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z";
function wt$1(e) {
  const t = Dn(), n = j({ size: at }, e), [o, r] = splitProps(n, ["ref", "style", "size"]), s = () => t.currentPlacement().split("-")[0], i = Ta(t.contentRef), l = () => {
    var _a2;
    return ((_a2 = i()) == null ? void 0 : _a2.getPropertyValue("background-color")) || "none";
  }, a = () => {
    var _a2;
    return ((_a2 = i()) == null ? void 0 : _a2.getPropertyValue(`border-${s()}-color`)) || "none";
  }, c = () => {
    var _a2;
    return ((_a2 = i()) == null ? void 0 : _a2.getPropertyValue(`border-${s()}-width`)) || "0px";
  }, u = () => Number.parseInt(c()) * 2 * (at / o.size), d = () => `rotate(${Pa[s()]} ${yo} ${yo}) translate(0 2)`;
  return createComponent$1(Y$1, mergeProps({ as: "div", "aria-hidden": "true", get style() {
    return ht$1({ position: "absolute", "font-size": `${o.size}px`, width: "1em", height: "1em", "pointer-events": "none", fill: l(), stroke: a(), "stroke-width": u() }, o.style);
  } }, r, { get children() {
    return ssr(Ea, ssrHydrationKey(), `0 0 ${escape(at, true)} ${escape(at, true)}`, ssrAttribute("transform", escape(d(), true), false), ssrAttribute("d", escape(bo, true), false), ssrAttribute("d", escape(bo, true), false));
  } }));
}
function Ta(e) {
  const [t, n] = createSignal();
  return createEffect(() => {
    const o = e();
    o && n(Lo(o).getComputedStyle(o));
  }), t;
}
function Oa(e) {
  Dn();
  const [t, n] = splitProps(e, ["ref", "style"]);
  return createComponent$1(Y$1, mergeProps({ as: "div", "data-popper-positioner": "", get style() {
    return ht$1({ position: "absolute", top: 0, left: 0, "min-width": "max-content" }, t.style);
  } }, n));
}
function vo(e) {
  const { x: t = 0, y: n = 0, width: o = 0, height: r = 0 } = e != null ? e : {};
  if (typeof DOMRect == "function") return new DOMRect(t, n, o, r);
  const s = { x: t, y: n, width: o, height: r, top: n, right: t + o, bottom: n + r, left: t };
  return { ...s, toJSON: () => s };
}
function Da(e, t) {
  return { contextElement: e, getBoundingClientRect: () => {
    const o = t(e);
    return o ? vo(o) : e ? e.getBoundingClientRect() : vo();
  } };
}
function Aa(e) {
  return /^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e);
}
var La = { top: "bottom", right: "left", bottom: "top", left: "right" };
function Ia(e, t) {
  const [n, o] = e.split("-"), r = La[n];
  return o ? n === "left" || n === "right" ? `${r} ${o === "start" ? "top" : "bottom"}` : o === "start" ? `${r} ${t === "rtl" ? "right" : "left"}` : `${r} ${t === "rtl" ? "left" : "right"}` : `${r} center`;
}
function ka(e) {
  const t = j({ getAnchorRect: (f) => f == null ? void 0 : f.getBoundingClientRect(), placement: "bottom", gutter: 0, shift: 0, flip: true, slide: true, overlap: false, sameWidth: false, fitViewport: false, hideWhenDetached: false, detachedPadding: 0, arrowPadding: 4, overflowPadding: 8 }, e), [n, o] = createSignal(), [r, s] = createSignal(), [i, l] = createSignal(t.placement), a = () => {
    var _a2;
    return Da((_a2 = t.anchorRef) == null ? void 0 : _a2.call(t), t.getAnchorRect);
  }, { direction: c } = xn();
  async function u() {
    var _a2, _b, _c;
    const f = a(), g = n(), p = r();
    if (!f || !g) return;
    const y = ((p == null ? void 0 : p.clientHeight) || 0) / 2, h = typeof t.gutter == "number" ? t.gutter + y : (_a2 = t.gutter) != null ? _a2 : y;
    g.style.setProperty("--kb-popper-content-overflow-padding", `${t.overflowPadding}px`), f.getBoundingClientRect();
    const b = [ya(({ placement: I }) => {
      const P = !!I.split("-")[1];
      return { mainAxis: h, crossAxis: P ? void 0 : t.shift, alignmentAxis: t.shift };
    })];
    if (t.flip !== false) {
      const I = typeof t.flip == "string" ? t.flip.split(" ") : void 0;
      if (I !== void 0 && !I.every(Aa)) throw new Error("`flip` expects a spaced-delimited list of placements");
      b.push(va({ padding: t.overflowPadding, fallbackPlacements: I }));
    }
    (t.slide || t.overlap) && b.push(ba({ mainAxis: t.slide, crossAxis: t.overlap, padding: t.overflowPadding })), b.push(wa({ padding: t.overflowPadding, apply({ availableWidth: I, availableHeight: P, rects: E }) {
      const M = Math.round(E.reference.width);
      I = Math.floor(I), P = Math.floor(P), g.style.setProperty("--kb-popper-anchor-width", `${M}px`), g.style.setProperty("--kb-popper-content-available-width", `${I}px`), g.style.setProperty("--kb-popper-content-available-height", `${P}px`), t.sameWidth && (g.style.width = `${M}px`), t.fitViewport && (g.style.maxWidth = `${I}px`, g.style.maxHeight = `${P}px`);
    } })), t.hideWhenDetached && b.push(xa({ padding: t.detachedPadding })), p && b.push(Sa({ element: p, padding: t.arrowPadding }));
    const m = await Ca(f, g, { placement: t.placement, strategy: "absolute", middleware: b, platform: { ...Pr, isRTL: () => c() === "rtl" } });
    if (l(m.placement), (_b = t.onCurrentPlacementChange) == null ? void 0 : _b.call(t, m.placement), !g) return;
    g.style.setProperty("--kb-popper-content-transform-origin", Ia(m.placement, c()));
    const w = Math.round(m.x), x = Math.round(m.y);
    let C;
    if (t.hideWhenDetached && (C = ((_c = m.middlewareData.hide) == null ? void 0 : _c.referenceHidden) ? "hidden" : "visible"), Object.assign(g.style, { top: "0", left: "0", transform: `translate3d(${w}px, ${x}px, 0)`, visibility: C }), p && m.middlewareData.arrow) {
      const { x: I, y: P } = m.middlewareData.arrow, E = m.placement.split("-")[0];
      Object.assign(p.style, { left: I != null ? `${I}px` : "", top: P != null ? `${P}px` : "", [E]: "100%" });
    }
  }
  createEffect(() => {
    const f = a(), g = n();
    if (!f || !g) return;
    const p = ma(f, g, u, { elementResize: typeof ResizeObserver == "function" });
    onCleanup(p);
  }), createEffect(() => {
    var _a2;
    const f = n(), g = (_a2 = t.contentRef) == null ? void 0 : _a2.call(t);
    !f || !g || queueMicrotask(() => {
      f.style.zIndex = getComputedStyle(g).zIndex;
    });
  });
  const d = { currentPlacement: i, contentRef: () => {
    var _a2;
    return (_a2 = t.contentRef) == null ? void 0 : _a2.call(t);
  }, setPositionerRef: o, setArrowRef: s };
  return createComponent$1(On.Provider, { value: d, get children() {
    return t.children;
  } });
}
var Bt$1 = Object.assign(ka, { Arrow: wt$1, Context: On, usePopperContext: Dn, Positioner: Oa }), Fa = {};
yt$1(Fa, { Arrow: () => wt$1, Content: () => Dr, Portal: () => Ar, Root: () => Lr, Tooltip: () => kr, Trigger: () => Ir, useTooltipContext: () => zt$1 });
var Or = createContext$1();
function zt$1() {
  const e = useContext(Or);
  if (e === void 0) throw new Error("[kobalte]: `useTooltipContext` must be used within a `Tooltip` component");
  return e;
}
function Dr(e) {
  const t = zt$1(), n = j({ id: t.generateId("content") }, e), [o, r] = splitProps(n, ["ref", "style"]);
  return createEffect(() => onCleanup(t.registerContentId(r.id))), createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Bt$1.Positioner, { get children() {
      return createComponent$1(vn, mergeProps({ role: "tooltip", disableOutsidePointerEvents: false, get style() {
        return ht$1({ "--kb-tooltip-content-transform-origin": "var(--kb-popper-content-transform-origin)", position: "relative" }, o.style);
      }, onFocusOutside: (s) => s.preventDefault(), onDismiss: () => t.hideTooltip(true) }, () => t.dataset(), r));
    } });
  } });
}
function Ar(e) {
  const t = zt$1();
  return createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
function Ka(e, t, n) {
  const o = e.split("-")[0], r = t.getBoundingClientRect(), s = n.getBoundingClientRect(), i = [], l = r.left + r.width / 2, a = r.top + r.height / 2;
  switch (o) {
    case "top":
      i.push([r.left, a]), i.push([s.left, s.bottom]), i.push([s.left, s.top]), i.push([s.right, s.top]), i.push([s.right, s.bottom]), i.push([r.right, a]);
      break;
    case "right":
      i.push([l, r.top]), i.push([s.left, s.top]), i.push([s.right, s.top]), i.push([s.right, s.bottom]), i.push([s.left, s.bottom]), i.push([l, r.bottom]);
      break;
    case "bottom":
      i.push([r.left, a]), i.push([s.left, s.top]), i.push([s.left, s.bottom]), i.push([s.right, s.bottom]), i.push([s.right, s.top]), i.push([r.right, a]);
      break;
    case "left":
      i.push([l, r.top]), i.push([s.right, s.top]), i.push([s.left, s.top]), i.push([s.left, s.bottom]), i.push([s.right, s.bottom]), i.push([l, r.bottom]);
      break;
  }
  return i;
}
var Ne = {}, Ma = 0, We = false, xe, st, Ue;
function Lr(e) {
  const t = `tooltip-${createUniqueId()}`, n = `${++Ma}`, o = j({ id: t, openDelay: 700, closeDelay: 300, skipDelayDuration: 300 }, e), [r, s] = splitProps(o, ["id", "open", "defaultOpen", "onOpenChange", "disabled", "triggerOnFocusOnly", "openDelay", "closeDelay", "skipDelayDuration", "ignoreSafeArea", "forceMount"]);
  let i;
  const [l, a] = createSignal(), [c, u] = createSignal(), [d, f] = createSignal(), [g, p] = createSignal(s.placement), y = wn({ open: () => r.open, defaultOpen: () => r.defaultOpen, onOpenChange: (L) => {
    var _a2;
    return (_a2 = r.onOpenChange) == null ? void 0 : _a2.call(r, L);
  } }), { present: h } = At$1({ show: () => r.forceMount || y.isOpen(), element: () => {
    var _a2;
    return (_a2 = d()) != null ? _a2 : null;
  } }), b = () => {
    Ne[n] = w;
  }, m = () => {
    for (const L in Ne) L !== n && (Ne[L](true), delete Ne[L]);
  }, w = (L = false) => {
    isServer || (L || r.closeDelay && r.closeDelay <= 0 ? (window.clearTimeout(i), i = void 0, y.close()) : i || (i = window.setTimeout(() => {
      i = void 0, y.close();
    }, r.closeDelay)), window.clearTimeout(xe), xe = void 0, r.skipDelayDuration && r.skipDelayDuration >= 0 && (Ue = window.setTimeout(() => {
      window.clearTimeout(Ue), Ue = void 0;
    }, r.skipDelayDuration)), We && (window.clearTimeout(st), st = window.setTimeout(() => {
      delete Ne[n], st = void 0, We = false;
    }, r.closeDelay)));
  }, x = () => {
    isServer || (clearTimeout(i), i = void 0, m(), b(), We = true, y.open(), window.clearTimeout(xe), xe = void 0, window.clearTimeout(st), st = void 0, window.clearTimeout(Ue), Ue = void 0);
  }, C = () => {
    isServer || (m(), b(), !y.isOpen() && !xe && !We ? xe = window.setTimeout(() => {
      xe = void 0, We = true, x();
    }, r.openDelay) : y.isOpen() || x());
  }, I = (L = false) => {
    isServer || (!L && r.openDelay && r.openDelay > 0 && !i && !Ue ? C() : x());
  }, P = () => {
    isServer || (window.clearTimeout(xe), xe = void 0, We = false);
  }, E = () => {
    isServer || (window.clearTimeout(i), i = void 0);
  }, M = (L) => me(c(), L) || me(d(), L), _ = (L) => {
    const O = c(), D = d();
    if (!(!O || !D)) return Ka(L, O, D);
  }, U = (L) => {
    const O = L.target;
    if (M(O)) {
      E();
      return;
    }
    if (!r.ignoreSafeArea) {
      const D = _(g());
      if (D && ei(Qs(L), D)) {
        E();
        return;
      }
    }
    i || w();
  };
  createEffect(() => {
    if (isServer || !y.isOpen()) return;
    const L = ue$1();
    L.addEventListener("pointermove", U, true), onCleanup(() => {
      L.removeEventListener("pointermove", U, true);
    });
  }), createEffect(() => {
    const L = c();
    if (!L || !y.isOpen()) return;
    const O = (z) => {
      const $ = z.target;
      me($, L) && w(true);
    }, D = Lo();
    D.addEventListener("scroll", O, { capture: true }), onCleanup(() => {
      D.removeEventListener("scroll", O, { capture: true });
    });
  }), onCleanup(() => {
    clearTimeout(i), Ne[n] && delete Ne[n];
  });
  const X = { dataset: createMemo(() => ({ "data-expanded": y.isOpen() ? "" : void 0, "data-closed": y.isOpen() ? void 0 : "" })), isOpen: y.isOpen, isDisabled: () => {
    var _a2;
    return (_a2 = r.disabled) != null ? _a2 : false;
  }, triggerOnFocusOnly: () => {
    var _a2;
    return (_a2 = r.triggerOnFocusOnly) != null ? _a2 : false;
  }, contentId: l, contentPresent: h, openTooltip: I, hideTooltip: w, cancelOpening: P, generateId: Xe(() => o.id), registerContentId: re$1(a), isTargetOnTooltip: M, setTriggerRef: u, setContentRef: f };
  return createComponent$1(Or.Provider, { value: X, get children() {
    return createComponent$1(Bt$1, mergeProps({ anchorRef: c, contentRef: d, onCurrentPlacementChange: p }, s));
  } });
}
function Ir(e) {
  let t;
  const n = zt$1(), [o, r] = splitProps(e, ["ref", "onPointerEnter", "onPointerLeave", "onPointerDown", "onClick", "onFocus", "onBlur"]);
  let s = false, i = false, l = false;
  const a = () => {
    s = false;
  }, c = () => {
    !n.isOpen() && (i || l) && n.openTooltip(l);
  }, u = (b) => {
    n.isOpen() && !i && !l && n.hideTooltip(b);
  }, d = (b) => {
    q$1(b, o.onPointerEnter), !(b.pointerType === "touch" || n.triggerOnFocusOnly() || n.isDisabled() || b.defaultPrevented) && (i = true, c());
  }, f = (b) => {
    q$1(b, o.onPointerLeave), b.pointerType !== "touch" && (i = false, l = false, n.isOpen() ? u() : n.cancelOpening());
  }, g = (b) => {
    q$1(b, o.onPointerDown), s = true, ue$1(t).addEventListener("pointerup", a, { once: true });
  }, p = (b) => {
    q$1(b, o.onClick), i = false, l = false, u(true);
  }, y = (b) => {
    q$1(b, o.onFocus), !(n.isDisabled() || b.defaultPrevented || s) && (l = true, c());
  }, h = (b) => {
    q$1(b, o.onBlur);
    const m = b.relatedTarget;
    n.isTargetOnTooltip(m) || (i = false, l = false, u(true));
  };
  return onCleanup(() => {
    isServer || ue$1(t).removeEventListener("pointerup", a);
  }), createComponent$1(Y$1, mergeProps({ as: "button", get "aria-describedby"() {
    return n.isOpen() ? n.contentId() : void 0;
  }, onPointerEnter: d, onPointerLeave: f, onPointerDown: g, onClick: p, onFocus: y, onBlur: h }, () => n.dataset(), r));
}
var kr = Object.assign(Lr, { Arrow: wt$1, Content: Dr, Portal: Ar, Trigger: Ir });
kr.Trigger;
var Ra = ["id", "name", "validationState", "required", "disabled", "readOnly"];
function Na(e) {
  const t = `form-control-${createUniqueId()}`, n = j({ id: t }, e), [o, r] = createSignal(), [s, i] = createSignal(), [l, a] = createSignal(), [c, u] = createSignal(), d = (y, h, b) => {
    const m = b != null || o() != null;
    return [b, o(), m && h != null ? y : void 0].filter(Boolean).join(" ") || void 0;
  }, f = (y) => [l(), c(), y].filter(Boolean).join(" ") || void 0, g = createMemo(() => ({ "data-valid": v(n.validationState) === "valid" ? "" : void 0, "data-invalid": v(n.validationState) === "invalid" ? "" : void 0, "data-required": v(n.required) ? "" : void 0, "data-disabled": v(n.disabled) ? "" : void 0, "data-readonly": v(n.readOnly) ? "" : void 0 }));
  return { formControlContext: { name: () => {
    var _a2;
    return (_a2 = v(n.name)) != null ? _a2 : v(n.id);
  }, dataset: g, validationState: () => v(n.validationState), isRequired: () => v(n.required), isDisabled: () => v(n.disabled), isReadOnly: () => v(n.readOnly), labelId: o, fieldId: s, descriptionId: l, errorMessageId: c, getAriaLabelledBy: d, getAriaDescribedBy: f, generateId: Xe(() => v(n.id)), registerLabel: re$1(r), registerField: re$1(i), registerDescription: re$1(a), registerErrorMessage: re$1(u) } };
}
var Fr = createContext$1();
function $e() {
  const e = useContext(Fr);
  if (e === void 0) throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");
  return e;
}
function Kr(e) {
  const t = $e(), n = j({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescription(n.id))), createComponent$1(Y$1, mergeProps({ as: "div" }, () => t.dataset(), n));
}
var Va = ["<option", "", ">", "</option>"], Ba = "<option></option>", za = ["<div", ' style="', '" aria-hidden="true"><input type="text"', ' style="', '"', "", ">", "</div>"];
function _a(e) {
  const [t, n] = splitProps(e, ["ref", "onChange", "collection", "selectionManager", "isOpen", "isMultiple", "isVirtualized", "focusTrigger"]), o = $e(), [r, s] = createSignal(false), i = (l) => {
    const a = t.collection.getItem(l);
    return createComponent$1(Show, { get when() {
      return (a == null ? void 0 : a.type) === "item";
    }, get children() {
      return ssr(Va, ssrHydrationKey() + ssrAttribute("value", escape(l, true), false), ssrAttribute("selected", t.selectionManager.isSelected(l), true), escape(a == null ? void 0 : a.textValue));
    } });
  };
  return createEffect(on$2(() => t.selectionManager.selectedKeys(), (l, a) => {
    a && gr$1(l, a) || s(true);
  }, { defer: true })), ssr(za, ssrHydrationKey(), ssrStyle(No), ssrAttribute("tabindex", t.selectionManager.isFocused() || t.isOpen ? -1 : 0, false), ssrStyleProperty("font-size:", "16px"), ssrAttribute("required", o.isRequired(), true), ssrAttribute("disabled", o.isDisabled(), true) + ssrAttribute("readonly", escape(o.isReadOnly(), true), false), ssrElement("select", mergeProps({ tabIndex: -1, get multiple() {
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
    var _a2;
    return (_a2 = t.selectionManager.firstSelectedKey()) != null ? _a2 : "";
  } }, n), () => [ssr(Ba), "<!--$-->", escape(createComponent$1(Show, { get when() {
    return t.isVirtualized;
  }, get fallback() {
    return createComponent$1(For, { get each() {
      return [...t.collection.getKeys()];
    }, children: i });
  }, get children() {
    return createComponent$1(For, { get each() {
      return [...t.selectionManager.selectedKeys()];
    }, children: i });
  } })), "<!--/-->"], false));
}
var wo = /* @__PURE__ */ new WeakMap();
function $a(e) {
  let t = wo.get(e);
  if (t != null) return t;
  t = 0;
  for (const n of e) n.type === "item" && t++;
  return wo.set(e, t), t;
}
var Mr = class {
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
    var _a2, _b, _c;
    return (_c = (_b = (_a2 = this.ref) == null ? void 0 : _a2.call(this)) == null ? void 0 : _b.querySelector(`[data-key="${e}"]`)) != null ? _c : null;
  }
  getKeyPageAbove(e) {
    var _a2;
    const t = (_a2 = this.ref) == null ? void 0 : _a2.call(this);
    let n = this.getItem(e);
    if (!t || !n) return;
    const o = Math.max(0, n.offsetTop + n.offsetHeight - t.offsetHeight);
    let r = e;
    for (; r && n && n.offsetTop > o; ) r = this.getKeyAbove(r), n = r != null ? this.getItem(r) : null;
    return r;
  }
  getKeyPageBelow(e) {
    var _a2;
    const t = (_a2 = this.ref) == null ? void 0 : _a2.call(this);
    let n = this.getItem(e);
    if (!t || !n) return;
    const o = Math.min(t.scrollHeight, n.offsetTop - n.offsetHeight + t.offsetHeight);
    let r = e;
    for (; r && n && n.offsetTop < o; ) r = this.getKeyBelow(r), n = r != null ? this.getItem(r) : null;
    return r;
  }
  getKeyForSearch(e, t) {
    var _a2;
    const n = (_a2 = this.collator) == null ? void 0 : _a2.call(this);
    if (!n) return;
    let o = t != null ? this.getKeyBelow(t) : this.getFirstKey();
    for (; o != null; ) {
      const r = this.collection().getItem(o);
      if (r) {
        const s = r.textValue.slice(0, e.length);
        if (r.textValue && n.compare(s, e) === 0) return o;
      }
      o = this.getKeyBelow(o);
    }
  }
};
function Wa(e, t, n) {
  const o = ur$1({ usage: "search", sensitivity: "base" }), r = createMemo(() => {
    const s = v(e.keyboardDelegate);
    return s || new Mr(e.collection, t, o);
  });
  return Cl({ selectionManager: () => v(e.selectionManager), keyboardDelegate: r, autoFocus: () => v(e.autoFocus), deferAutoFocus: () => v(e.deferAutoFocus), shouldFocusWrap: () => v(e.shouldFocusWrap), disallowEmptySelection: () => v(e.disallowEmptySelection), selectOnFocus: () => v(e.selectOnFocus), disallowTypeAhead: () => v(e.disallowTypeAhead), shouldUseVirtualFocus: () => v(e.shouldUseVirtualFocus), allowsTabNavigation: () => v(e.allowsTabNavigation), isVirtualized: () => v(e.isVirtualized), scrollToKey: (s) => {
    var _a2;
    return (_a2 = v(e.scrollToKey)) == null ? void 0 : _a2(s);
  }, orientation: () => v(e.orientation) }, t, n);
}
var Ua = {};
yt$1(Ua, { Item: () => _t$1, ItemDescription: () => $t$1, ItemIndicator: () => Wt$1, ItemLabel: () => Ut$1, Listbox: () => Ha, Root: () => Ln, Section: () => Ht$1, useListboxContext: () => Nr });
var Rr$1 = createContext$1();
function Nr() {
  const e = useContext(Rr$1);
  if (e === void 0) throw new Error("[kobalte]: `useListboxContext` must be used within a `Listbox` component");
  return e;
}
var Vr = createContext$1();
function An() {
  const e = useContext(Vr);
  if (e === void 0) throw new Error("[kobalte]: `useListboxItemContext` must be used within a `Listbox.Item` component");
  return e;
}
function _t$1(e) {
  let t;
  const n = Nr(), o = `${n.generateId("item")}-${createUniqueId()}`, r = j({ id: o }, e), [s, i] = splitProps(r, ["ref", "item", "aria-label", "aria-labelledby", "aria-describedby", "onPointerMove", "onPointerDown", "onPointerUp", "onClick", "onKeyDown", "onMouseDown", "onFocus"]), [l, a] = createSignal(), [c, u] = createSignal(), d = () => n.listState().selectionManager(), f = () => d().focusedKey() === s.item.key, g = El({ key: () => s.item.key, selectionManager: d, shouldSelectOnPressUp: n.shouldSelectOnPressUp, allowsDifferentPressOrigin: () => n.shouldSelectOnPressUp() && n.shouldFocusOnHover(), shouldUseVirtualFocus: n.shouldUseVirtualFocus, disabled: () => s.item.disabled }, () => t), p = () => {
    if (d().selectionMode() !== "none") return g.isSelected();
  }, y = createMemo(() => true), h = () => y() ? s["aria-label"] : void 0, b = () => y() ? l() : void 0, m = () => y() ? c() : void 0, w = () => {
    var _a2;
    if (!n.isVirtualized()) return;
    const E = (_a2 = n.listState().collection().getItem(s.item.key)) == null ? void 0 : _a2.index;
    return E != null ? E + 1 : void 0;
  }, x = () => {
    if (n.isVirtualized()) return $a(n.listState().collection());
  }, C = (E) => {
    q$1(E, s.onPointerMove), E.pointerType === "mouse" && !g.isDisabled() && n.shouldFocusOnHover() && (ee$1(E.currentTarget), d().setFocused(true), d().setFocusedKey(s.item.key));
  }, I = createMemo(() => ({ "data-disabled": g.isDisabled() ? "" : void 0, "data-selected": g.isSelected() ? "" : void 0, "data-highlighted": f() ? "" : void 0 })), P = { isSelected: g.isSelected, dataset: I, generateId: Xe(() => i.id), registerLabelId: re$1(a), registerDescriptionId: re$1(u) };
  return createComponent$1(Vr.Provider, { value: P, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "li", role: "option", get tabIndex() {
      return g.tabIndex();
    }, get "aria-disabled"() {
      return g.isDisabled();
    }, get "aria-selected"() {
      return p();
    }, get "aria-label"() {
      return h();
    }, get "aria-labelledby"() {
      return b();
    }, get "aria-describedby"() {
      return m();
    }, get "aria-posinset"() {
      return w();
    }, get "aria-setsize"() {
      return x();
    }, get "data-key"() {
      return g.dataKey();
    }, get onPointerDown() {
      return ce$1([s.onPointerDown, g.onPointerDown]);
    }, get onPointerUp() {
      return ce$1([s.onPointerUp, g.onPointerUp]);
    }, get onClick() {
      return ce$1([s.onClick, g.onClick]);
    }, get onKeyDown() {
      return ce$1([s.onKeyDown, g.onKeyDown]);
    }, get onMouseDown() {
      return ce$1([s.onMouseDown, g.onMouseDown]);
    }, get onFocus() {
      return ce$1([s.onFocus, g.onFocus]);
    }, onPointerMove: C }, I, i));
  } });
}
function $t$1(e) {
  const t = An(), n = j({ id: t.generateId("description") }, e);
  return createEffect(() => onCleanup(t.registerDescriptionId(n.id))), createComponent$1(Y$1, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function Wt$1(e) {
  const t = An(), n = j({ id: t.generateId("indicator") }, e), [o, r] = splitProps(n, ["forceMount"]);
  return createComponent$1(Show, { get when() {
    return o.forceMount || t.isSelected();
  }, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "div", "aria-hidden": "true" }, () => t.dataset(), r));
  } });
}
function Ut$1(e) {
  const t = An(), n = j({ id: t.generateId("label") }, e);
  return createEffect(() => onCleanup(t.registerLabelId(n.id))), createComponent$1(Y$1, mergeProps({ as: "div" }, () => t.dataset(), n));
}
function Ln(e) {
  let t;
  const n = `listbox-${createUniqueId()}`, o = j({ id: n, selectionMode: "single", virtualized: false }, e), [r, s] = splitProps(o, ["ref", "children", "renderItem", "renderSection", "value", "defaultValue", "onChange", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "state", "keyboardDelegate", "autoFocus", "selectionMode", "shouldFocusWrap", "shouldUseVirtualFocus", "shouldSelectOnPressUp", "shouldFocusOnHover", "allowDuplicateSelectionEvents", "disallowEmptySelection", "selectionBehavior", "selectOnFocus", "disallowTypeAhead", "allowsTabNavigation", "virtualized", "scrollToItem", "scrollRef", "onKeyDown", "onMouseDown", "onFocusIn", "onFocusOut"]), i = createMemo(() => r.state ? r.state : hr$1({ selectedKeys: () => r.value, defaultSelectedKeys: () => r.defaultValue, onSelectionChange: r.onChange, allowDuplicateSelectionEvents: () => v(r.allowDuplicateSelectionEvents), disallowEmptySelection: () => v(r.disallowEmptySelection), selectionBehavior: () => v(r.selectionBehavior), selectionMode: () => v(r.selectionMode), dataSource: () => {
    var _a2;
    return (_a2 = r.options) != null ? _a2 : [];
  }, getKey: () => r.optionValue, getTextValue: () => r.optionTextValue, getDisabled: () => r.optionDisabled, getSectionChildren: () => r.optionGroupChildren })), l = Wa({ selectionManager: () => i().selectionManager(), collection: () => i().collection(), autoFocus: () => v(r.autoFocus), shouldFocusWrap: () => v(r.shouldFocusWrap), keyboardDelegate: () => r.keyboardDelegate, disallowEmptySelection: () => v(r.disallowEmptySelection), selectOnFocus: () => v(r.selectOnFocus), disallowTypeAhead: () => v(r.disallowTypeAhead), shouldUseVirtualFocus: () => v(r.shouldUseVirtualFocus), allowsTabNavigation: () => v(r.allowsTabNavigation), isVirtualized: () => r.virtualized, scrollToKey: () => r.scrollToItem }, () => t, () => {
    var _a2;
    return (_a2 = r.scrollRef) == null ? void 0 : _a2.call(r);
  }), a = { listState: i, generateId: Xe(() => s.id), shouldUseVirtualFocus: () => o.shouldUseVirtualFocus, shouldSelectOnPressUp: () => o.shouldSelectOnPressUp, shouldFocusOnHover: () => o.shouldFocusOnHover, isVirtualized: () => r.virtualized };
  return createComponent$1(Rr$1.Provider, { value: a, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "ul", role: "listbox", get tabIndex() {
      return l.tabIndex();
    }, get "aria-multiselectable"() {
      return i().selectionManager().selectionMode() === "multiple" ? true : void 0;
    }, get onKeyDown() {
      return ce$1([r.onKeyDown, l.onKeyDown]);
    }, get onMouseDown() {
      return ce$1([r.onMouseDown, l.onMouseDown]);
    }, get onFocusIn() {
      return ce$1([r.onFocusIn, l.onFocusIn]);
    }, get onFocusOut() {
      return ce$1([r.onFocusOut, l.onFocusOut]);
    } }, s, { get children() {
      return createComponent$1(Show, { get when() {
        return !r.virtualized;
      }, get fallback() {
        var _a2;
        return (_a2 = r.children) == null ? void 0 : _a2.call(r, i().collection);
      }, get children() {
        return createComponent$1(Fs, { get each() {
          return [...i().collection()];
        }, by: "key", children: (c) => createComponent$1(Switch, { get children() {
          return [createComponent$1(Match, { get when() {
            return c().type === "section";
          }, get children() {
            var _a2;
            return (_a2 = r.renderSection) == null ? void 0 : _a2.call(r, c());
          } }), createComponent$1(Match, { get when() {
            return c().type === "item";
          }, get children() {
            var _a2;
            return (_a2 = r.renderItem) == null ? void 0 : _a2.call(r, c());
          } })];
        } }) });
      } });
    } }));
  } });
}
function Ht$1(e) {
  return createComponent$1(Y$1, mergeProps({ as: "li", role: "presentation" }, e));
}
var Ha = Object.assign(Ln, { Item: _t$1, ItemDescription: $t$1, ItemIndicator: Wt$1, ItemLabel: Ut$1, Section: Ht$1 }), ja = ["id", "aria-label", "aria-labelledby", "aria-describedby"];
function Ga(e) {
  const t = $e(), n = j({ id: t.generateId("field") }, e);
  return createEffect(() => onCleanup(t.registerField(v(n.id)))), { fieldProps: { id: () => v(n.id), ariaLabel: () => v(n["aria-label"]), ariaLabelledBy: () => t.getAriaLabelledBy(v(n.id), v(n["aria-label"]), v(n["aria-labelledby"])), ariaDescribedBy: () => t.getAriaDescribedBy(v(n["aria-describedby"])) } };
}
function qa(e) {
  let t;
  const n = $e(), o = j({ id: n.generateId("label") }, e), [r, s] = splitProps(o, ["ref"]), i = Vo(() => t, () => "label");
  return createEffect(() => onCleanup(n.registerLabel(s.id))), createComponent$1(Y$1, mergeProps({ as: "label", get for() {
    return i() === "label" ? n.fieldId() : void 0;
  } }, () => n.dataset(), s));
}
function Ya(e, t) {
  createEffect(on$2(e, (n) => {
    if (n == null) return;
    const o = Xa(n);
    o != null && (o.addEventListener("reset", t, { passive: true }), onCleanup(() => {
      o.removeEventListener("reset", t);
    }));
  }));
}
function Xa(e) {
  return Za(e) ? e.form : e.closest("form");
}
function Za(e) {
  return e.matches("textarea, input, select, button");
}
function Br(e) {
  const t = $e(), n = j({ id: t.generateId("error-message") }, e), [o, r] = splitProps(n, ["forceMount"]), s = () => t.validationState() === "invalid";
  return createEffect(() => {
    s() && onCleanup(t.registerErrorMessage(r.id));
  }), createComponent$1(Show, { get when() {
    return o.forceMount || s();
  }, get children() {
    return createComponent$1(Y$1, mergeProps({ as: "div" }, () => t.dataset(), r));
  } });
}
var Ja = {};
yt$1(Ja, { Arrow: () => wt$1, Content: () => _r, Description: () => Kr, ErrorMessage: () => Br, HiddenSelect: () => $r, Icon: () => Wr, Item: () => _t$1, ItemDescription: () => $t$1, ItemIndicator: () => Wt$1, ItemLabel: () => Ut$1, Label: () => Ur, Listbox: () => Hr, Portal: () => jr, Root: () => Gr, Section: () => Ht$1, Select: () => fe, Trigger: () => qr, Value: () => Yr, useSelectContext: () => Te });
var zr = createContext$1();
function Te() {
  const e = useContext(zr);
  if (e === void 0) throw new Error("[kobalte]: `useSelectContext` must be used within a `Select` component");
  return e;
}
function _r(e) {
  let t;
  const n = Te(), [o, r] = splitProps(e, ["ref", "style", "onCloseAutoFocus", "onFocusOutside"]), s = (l) => {
    n.close();
  }, i = (l) => {
    var _a2;
    (_a2 = o.onFocusOutside) == null ? void 0 : _a2.call(o, l), n.isOpen() && n.isModal() && l.preventDefault();
  };
  return Yo({ isDisabled: () => !(n.isOpen() && n.isModal()), targets: () => [] }), Jo({ element: () => null, enabled: () => n.contentPresent() && n.preventScroll() }), qo({ trapFocus: () => n.isOpen() && n.isModal(), onMountAutoFocus: (l) => {
    l.preventDefault();
  }, onUnmountAutoFocus: (l) => {
    var _a2;
    (_a2 = o.onCloseAutoFocus) == null ? void 0 : _a2.call(o, l), l.defaultPrevented || (ee$1(n.triggerRef()), l.preventDefault());
  } }, () => t), createComponent$1(Show, { get when() {
    return n.contentPresent();
  }, get children() {
    return createComponent$1(Bt$1.Positioner, { get children() {
      return createComponent$1(vn, mergeProps({ get disableOutsidePointerEvents() {
        return n.isModal() && n.isOpen();
      }, get excludedElements() {
        return [n.triggerRef];
      }, get style() {
        return ht$1({ "--kb-select-content-transform-origin": "var(--kb-popper-content-transform-origin)", position: "relative" }, o.style);
      }, onEscapeKeyDown: s, onFocusOutside: i, get onDismiss() {
        return n.close;
      } }, () => n.dataset(), r));
    } });
  } });
}
function $r(e) {
  const t = Te();
  return createComponent$1(_a, mergeProps({ get collection() {
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
    var _a2;
    return (_a2 = t.triggerRef()) == null ? void 0 : _a2.focus();
  } }, e));
}
function Wr(e) {
  const t = Te(), n = j({ children: "\u25BC" }, e);
  return createComponent$1(Y$1, mergeProps({ as: "span", "aria-hidden": "true" }, () => t.dataset(), n));
}
function Ur(e) {
  const t = Te(), [n, o] = splitProps(e, ["onClick"]);
  return createComponent$1(qa, mergeProps({ as: "span", onClick: (s) => {
    var _a2;
    q$1(s, n.onClick), t.isDisabled() || ((_a2 = t.triggerRef()) == null ? void 0 : _a2.focus());
  } }, o));
}
function Hr(e) {
  const t = Te(), n = j({ id: t.generateId("listbox") }, e), [o, r] = splitProps(n, ["ref", "id", "onKeyDown"]);
  return createEffect(() => onCleanup(t.registerListboxId(o.id))), createComponent$1(Ln, mergeProps({ get id() {
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
  }, onKeyDown: (i) => {
    q$1(i, o.onKeyDown), i.key === "Escape" && i.preventDefault();
  } }, r));
}
function jr(e) {
  const t = Te();
  return createComponent$1(Show, { get when() {
    return t.contentPresent();
  }, get children() {
    return createComponent$1(Portal, e);
  } });
}
function Qa(e) {
  const t = `select-${createUniqueId()}`, n = j({ id: t, selectionMode: "single", disallowEmptySelection: false, closeOnSelection: e.selectionMode === "single", allowDuplicateSelectionEvents: true, gutter: 8, sameWidth: true, modal: false }, e), [o, r, s, i] = splitProps(n, ["itemComponent", "sectionComponent", "open", "defaultOpen", "onOpenChange", "value", "defaultValue", "onChange", "placeholder", "options", "optionValue", "optionTextValue", "optionDisabled", "optionGroupChildren", "keyboardDelegate", "allowDuplicateSelectionEvents", "disallowEmptySelection", "closeOnSelection", "disallowTypeAhead", "shouldFocusWrap", "selectionBehavior", "selectionMode", "virtualized", "modal", "preventScroll", "forceMount"], ["getAnchorRect", "placement", "gutter", "shift", "flip", "slide", "overlap", "sameWidth", "fitViewport", "hideWhenDetached", "detachedPadding", "arrowPadding", "overflowPadding"], Ra), [l, a] = createSignal(), [c, u] = createSignal(), [d, f] = createSignal(), [g, p] = createSignal(), [y, h] = createSignal(), [b, m] = createSignal(), [w, x] = createSignal(), [C, I] = createSignal(true), P = (N) => {
    const Z = o.optionValue;
    return Z == null ? String(N) : String(gn(Z) ? Z(N) : N[Z]);
  }, E = createMemo(() => {
    const N = o.optionGroupChildren;
    return N == null ? o.options : o.options.flatMap((Z) => {
      var _a2;
      return (_a2 = Z[N]) != null ? _a2 : Z;
    });
  }), M = createMemo(() => E().map((N) => P(N))), _ = (N) => [...N].map((Z) => E().find((jt) => P(jt) === Z)).filter((Z) => Z != null), U = wn({ open: () => o.open, defaultOpen: () => o.defaultOpen, onOpenChange: (N) => {
    var _a2;
    return (_a2 = o.onOpenChange) == null ? void 0 : _a2.call(o, N);
  } }), T = hr$1({ selectedKeys: () => o.value != null ? o.value.map(P) : o.value, defaultSelectedKeys: () => o.defaultValue != null ? o.defaultValue.map(P) : o.defaultValue, onSelectionChange: (N) => {
    var _a2;
    (_a2 = o.onChange) == null ? void 0 : _a2.call(o, _(N)), o.closeOnSelection && $();
  }, allowDuplicateSelectionEvents: () => v(o.allowDuplicateSelectionEvents), disallowEmptySelection: () => v(o.disallowEmptySelection), selectionBehavior: () => v(o.selectionBehavior), selectionMode: () => o.selectionMode, dataSource: () => {
    var _a2;
    return (_a2 = o.options) != null ? _a2 : [];
  }, getKey: () => o.optionValue, getTextValue: () => o.optionTextValue, getDisabled: () => o.optionDisabled, getSectionChildren: () => o.optionGroupChildren }), X = createMemo(() => _(T.selectionManager().selectedKeys())), L = (N) => {
    T.selectionManager().toggleSelection(P(N));
  }, { present: O } = At$1({ show: () => o.forceMount || U.isOpen(), element: () => {
    var _a2;
    return (_a2 = y()) != null ? _a2 : null;
  } }), D = () => {
    const N = b();
    N && ee$1(N);
  }, z = (N) => {
    if (o.options.length <= 0) return;
    I(N), U.open();
    let Z = T.selectionManager().firstSelectedKey();
    Z == null && (N === "first" ? Z = T.collection().getFirstKey() : N === "last" && (Z = T.collection().getLastKey())), D(), T.selectionManager().setFocused(true), T.selectionManager().setFocusedKey(Z);
  }, $ = () => {
    U.close(), T.selectionManager().setFocused(false), T.selectionManager().setFocusedKey(void 0);
  }, G = (N) => {
    U.isOpen() ? $() : z(N);
  }, { formControlContext: te } = Na(s);
  Ya(g, () => {
    const N = o.defaultValue ? [...o.defaultValue].map(P) : new he();
    T.selectionManager().setSelectedKeys(N);
  });
  const J = ur$1({ usage: "search", sensitivity: "base" }), Oe = createMemo(() => {
    const N = v(o.keyboardDelegate);
    return N || new Mr(T.collection, void 0, J);
  }), De = (N) => {
    var _a2;
    return (_a2 = o.itemComponent) == null ? void 0 : _a2.call(o, { item: N });
  }, xt = (N) => {
    var _a2;
    return (_a2 = o.sectionComponent) == null ? void 0 : _a2.call(o, { section: N });
  };
  createEffect(on$2([M], ([N]) => {
    const jt = [...T.selectionManager().selectedKeys()].filter((Jr) => N.includes(Jr));
    T.selectionManager().setSelectedKeys(jt);
  }, { defer: true }));
  const et = createMemo(() => ({ "data-expanded": U.isOpen() ? "" : void 0, "data-closed": U.isOpen() ? void 0 : "" })), In = { dataset: et, isOpen: U.isOpen, isDisabled: () => {
    var _a2;
    return (_a2 = te.isDisabled()) != null ? _a2 : false;
  }, isMultiple: () => v(o.selectionMode) === "multiple", isVirtualized: () => {
    var _a2;
    return (_a2 = o.virtualized) != null ? _a2 : false;
  }, isModal: () => {
    var _a2;
    return (_a2 = o.modal) != null ? _a2 : false;
  }, preventScroll: () => {
    var _a2;
    return (_a2 = o.preventScroll) != null ? _a2 : In.isModal();
  }, disallowTypeAhead: () => {
    var _a2;
    return (_a2 = o.disallowTypeAhead) != null ? _a2 : false;
  }, shouldFocusWrap: () => {
    var _a2;
    return (_a2 = o.shouldFocusWrap) != null ? _a2 : false;
  }, selectedOptions: X, contentPresent: O, autoFocus: C, triggerRef: g, listState: () => T, keyboardDelegate: Oe, triggerId: l, valueId: c, listboxId: d, listboxAriaLabelledBy: w, setListboxAriaLabelledBy: x, setTriggerRef: p, setContentRef: h, setListboxRef: m, open: z, close: $, toggle: G, placeholder: () => o.placeholder, renderItem: De, renderSection: xt, removeOptionFromSelection: L, generateId: Xe(() => v(s.id)), registerTriggerId: re$1(a), registerValueId: re$1(u), registerListboxId: re$1(f) };
  return createComponent$1(Fr.Provider, { value: te, get children() {
    return createComponent$1(zr.Provider, { value: In, get children() {
      return createComponent$1(Bt$1, mergeProps({ anchorRef: g, contentRef: y }, r, { get children() {
        return createComponent$1(Y$1, mergeProps({ as: "div", role: "group", get id() {
          return v(s.id);
        } }, () => te.dataset(), et, i));
      } }));
    } });
  } });
}
function Gr(e) {
  const [t, n] = splitProps(e, ["value", "defaultValue", "onChange", "multiple"]), o = createMemo(() => t.value != null ? t.multiple ? t.value : [t.value] : t.value), r = createMemo(() => t.defaultValue != null ? t.multiple ? t.defaultValue : [t.defaultValue] : t.defaultValue);
  return createComponent$1(Qa, mergeProps({ get value() {
    return o();
  }, get defaultValue() {
    return r();
  }, onChange: (i) => {
    var _a2, _b, _c;
    t.multiple ? (_a2 = t.onChange) == null ? void 0 : _a2.call(t, i != null ? i : []) : (_c = t.onChange) == null ? void 0 : _c.call(t, (_b = i[0]) != null ? _b : null);
  }, get selectionMode() {
    return t.multiple ? "multiple" : "single";
  } }, n));
}
function qr(e) {
  const t = $e(), n = Te(), o = j({ id: n.generateId("trigger") }, e), [r, s, i] = splitProps(o, ["ref", "disabled", "onPointerDown", "onClick", "onKeyDown", "onFocus", "onBlur"], ja), l = () => n.listState().selectionManager(), a = () => n.keyboardDelegate(), c = () => r.disabled || n.isDisabled(), { fieldProps: u } = Ga(s), { typeSelectHandlers: d } = pr$1({ keyboardDelegate: a, selectionManager: l, onTypeSelect: (m) => l().select(m) }), f = () => [n.listboxAriaLabelledBy(), n.valueId()].filter(Boolean).join(" ") || void 0, g = (m) => {
    q$1(m, r.onPointerDown), m.currentTarget.dataset.pointerType = m.pointerType, !c() && m.pointerType !== "touch" && m.button === 0 && (m.preventDefault(), n.toggle(true));
  }, p = (m) => {
    q$1(m, r.onClick), !c() && m.currentTarget.dataset.pointerType === "touch" && n.toggle(true);
  }, y = (m) => {
    var _a2, _b, _c, _d, _e2, _f, _g, _h;
    if (q$1(m, r.onKeyDown), !c()) switch (q$1(m, d.onKeyDown), m.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        m.stopPropagation(), m.preventDefault(), n.toggle("first");
        break;
      case "ArrowUp":
        m.stopPropagation(), m.preventDefault(), n.toggle("last");
        break;
      case "ArrowLeft": {
        if (m.preventDefault(), n.isMultiple()) return;
        const w = l().firstSelectedKey(), x = w != null ? (_b = (_a2 = a()).getKeyAbove) == null ? void 0 : _b.call(_a2, w) : (_d = (_c = a()).getFirstKey) == null ? void 0 : _d.call(_c);
        x != null && l().select(x);
        break;
      }
      case "ArrowRight": {
        if (m.preventDefault(), n.isMultiple()) return;
        const w = l().firstSelectedKey(), x = w != null ? (_f = (_e2 = a()).getKeyBelow) == null ? void 0 : _f.call(_e2, w) : (_h = (_g = a()).getFirstKey) == null ? void 0 : _h.call(_g);
        x != null && l().select(x);
        break;
      }
    }
  }, h = (m) => {
    q$1(m, r.onFocus), !l().isFocused() && l().setFocused(true);
  }, b = (m) => {
    q$1(m, r.onBlur), !n.isOpen() && l().setFocused(false);
  };
  return createEffect(() => onCleanup(n.registerTriggerId(u.id()))), createEffect(() => {
    n.setListboxAriaLabelledBy([u.ariaLabelledBy(), u.ariaLabel() && !u.ariaLabelledBy() ? u.id() : null].filter(Boolean).join(" ") || void 0);
  }), createComponent$1(bt$1, mergeProps({ get id() {
    return u.id();
  }, get disabled() {
    return c();
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
  }, onPointerDown: g, onClick: p, onKeyDown: y, onFocus: h, onBlur: b }, () => n.dataset(), () => t.dataset(), i));
}
function Yr(e) {
  const t = $e(), n = Te(), o = j({ id: n.generateId("value") }, e), [r, s] = splitProps(o, ["id", "children"]), i = () => n.listState().selectionManager(), l = () => {
    const a = i().selectedKeys();
    return a.size === 1 && a.has("") ? true : i().isEmpty();
  };
  return createEffect(() => onCleanup(n.registerValueId(r.id))), createComponent$1(Y$1, mergeProps({ as: "span", get id() {
    return r.id;
  }, get "data-placeholder-shown"() {
    return l() ? "" : void 0;
  } }, () => t.dataset(), s, { get children() {
    return createComponent$1(Show, { get when() {
      return !l();
    }, get fallback() {
      return n.placeholder();
    }, get children() {
      return createComponent$1(ec, { state: { selectedOption: () => n.selectedOptions()[0], selectedOptions: () => n.selectedOptions(), remove: (a) => n.removeOptionFromSelection(a), clear: () => i().clearSelection() }, get children() {
        return r.children;
      } });
    } });
  } }));
}
function ec(e) {
  return children(() => {
    const n = e.children;
    return gn(n) ? n(e.state) : n;
  })();
}
var fe = Object.assign(Gr, { Arrow: wt$1, Content: _r, Description: Kr, ErrorMessage: Br, HiddenSelect: $r, Icon: Wr, Item: _t$1, ItemDescription: $t$1, ItemIndicator: Wt$1, ItemLabel: Ut$1, Label: Ur, Listbox: Hr, Portal: jr, Section: Ht$1, Trigger: qr, Value: Yr }), tc = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>'];
const Sc = fe, Cc = fe.Value, Ec = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return createComponent$1(fe.Trigger, mergeProps({ get class() {
    return Me("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", t.class);
  } }, n, { get children() {
    return [t.children, createComponent$1(fe.Icon, { class: "h-4 w-4 opacity-50", get children() {
      return ssr(tc, ssrHydrationKey());
    } })];
  } }));
}, Pc = (e) => {
  const [t, n] = splitProps(e, ["class", "children"]);
  return createComponent$1(fe.Portal, { get children() {
    return createComponent$1(fe.Content, mergeProps({ get class() {
      return Me("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95", t.class);
    } }, n, { get children() {
      return createComponent$1(fe.Listbox, { class: "p-1" });
    } }));
  } });
}, Tc = fe.Item, Oc = fe.ItemLabel;
fe.ItemIndicator;
const Xr = createContext$1(), Dc = (e) => {
  var _a2;
  const [t, n] = createSignal((_a2 = e.defaultTheme) != null ? _a2 : "system"), o = () => {
    const r = t();
    return r === "system" ? "dark" : r;
  };
  return createEffect(() => {
    if (typeof document < "u") {
      const r = o();
      document.documentElement.classList.remove("light", "dark"), document.documentElement.classList.add(r);
    }
  }), createComponent$1(Xr.Provider, { value: { theme: t, setTheme: n, resolvedTheme: o }, get children() {
    return e.children;
  } });
};
function Ac() {
  const e = useContext(Xr);
  if (!e) throw new Error("useTheme must be used within ThemeProvider");
  return e;
}
const Zr = createContext$1(), nc = 300 * 1e3, Lc = (e) => {
  const [t, n] = createSignal(null), [o, r] = createSignal(true), [s, i] = createSignal(false), [l, a] = createSignal(false);
  let c;
  const u = async () => {
    if (!isServer) try {
      r(true);
      const b = await (await fetch("/auth/status")).json();
      n(b.user), i(b.authenticated), a(false);
    } catch (h) {
      console.error("Failed to fetch auth status:", h), n(null), i(false);
    } finally {
      r(false);
    }
  }, d = async () => {
    if (isServer) return false;
    try {
      const h = await fetch("/auth/refresh", { method: "POST" }), b = await h.json();
      return !h.ok || b.error === "reauthentication_required" ? (a(true), n(null), i(false), false) : true;
    } catch (h) {
      return console.error("Failed to refresh session:", h), false;
    }
  }, f = () => {
    isServer || (c && clearInterval(c), c = setInterval(() => {
      s() && d();
    }, nc));
  };
  onMount(() => {
    u().then(() => {
      s() && f();
    });
  }), onCleanup(() => {
    c && clearInterval(c);
  });
  const y = { user: t, isLoading: o, isAuthenticated: s, requiresReauth: l, login: () => {
    isServer || (a(false), window.location.href = "/auth/authorize");
  }, logout: async () => {
    if (!isServer) try {
      await fetch("/auth/logout", { method: "POST" }), n(null), i(false), a(false), c && (clearInterval(c), c = void 0);
    } catch (h) {
      console.error("Failed to logout:", h);
    }
  }, refetch: u, refreshSession: d };
  return createComponent$1(Zr.Provider, { value: y, get children() {
    return e.children;
  } });
};
function Ic() {
  const e = useContext(Zr);
  if (!e) throw new Error("useAuth must be used within AuthProvider");
  return e;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
function ct(e = {}) {
  let t, r = false;
  const s = (a) => {
    if (t && t !== a) throw new Error("Context conflict");
  };
  let n;
  if (e.asyncContext) {
    const a = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    a ? n = new a() : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const o = () => {
    if (n) {
      const a = n.getStore();
      if (a !== void 0) return a;
    }
    return t;
  };
  return { use: () => {
    const a = o();
    if (a === void 0) throw new Error("Context is not available");
    return a;
  }, tryUse: () => o(), set: (a, i) => {
    i || s(a), t = a, r = true;
  }, unset: () => {
    t = void 0, r = false;
  }, call: (a, i) => {
    s(a), t = a;
    try {
      return n ? n.run(a, i) : i();
    } finally {
      r || (t = void 0);
    }
  }, async callAsync(a, i) {
    t = a;
    const u = () => {
      t = a;
    }, c = () => t === a ? u : void 0;
    K.add(c);
    try {
      const h = n ? n.run(a, i) : i();
      return r || (t = void 0), await h;
    } finally {
      K.delete(c);
    }
  } };
}
function ut(e = {}) {
  const t = {};
  return { get(r, s = {}) {
    return t[r] || (t[r] = ct({ ...e, ...s })), t[r];
  } };
}
const N = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof global < "u" ? global : {}, B = "__unctx__", lt = N[B] || (N[B] = ut()), dt = (e, t = {}) => lt.get(e, t), z = "__unctx_async_handlers__", K = N[z] || (N[z] = /* @__PURE__ */ new Set());
function pt(e) {
  let t;
  const r = oe(e), s = { duplex: "half", method: e.method, headers: e.headers };
  return e.node.req.body instanceof ArrayBuffer ? new Request(r, { ...s, body: e.node.req.body }) : new Request(r, { ...s, get body() {
    return t || (t = kt(e), t);
  } });
}
function ht(e) {
  var _a;
  return (_a = e.web) != null ? _a : e.web = { request: pt(e), url: oe(e) }, e.web.request;
}
function ft() {
  return Tt();
}
const se = /* @__PURE__ */ Symbol("$HTTPEvent");
function mt(e) {
  return typeof e == "object" && (e instanceof H3Event || (e == null ? void 0 : e[se]) instanceof H3Event || (e == null ? void 0 : e.__is_event__) === true);
}
function b(e) {
  return function(...t) {
    var _a;
    let r = t[0];
    if (mt(r)) t[0] = r instanceof H3Event || r.__is_event__ ? r : r[se];
    else {
      if (!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext)) throw new Error("AsyncLocalStorage was not enabled. Use the `server.experimental.asyncContext: true` option in your app configuration to enable it. Or, pass the instance of HTTPEvent that you have as the first argument to the function.");
      if (r = ft(), !r) throw new Error("No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.");
      t.unshift(r);
    }
    return e(...t);
  };
}
const oe = b(getRequestURL), gt = b(getRequestIP), O = b(setResponseStatus), J = b(getResponseStatus), bt = b(getResponseStatusText), H = b(getResponseHeaders), Y = b(getResponseHeader), yt = b(setResponseHeader), wt = b(appendResponseHeader), V = b(sendRedirect), vt = b(getCookie), Et = b(setCookie), Rt = b(setHeader), kt = b(getRequestWebStream), St = b(removeResponseHeader), $t = b(ht);
function xt() {
  var _a;
  return dt("nitro-app", { asyncContext: !!((_a = globalThis.app.config.server.experimental) == null ? void 0 : _a.asyncContext), AsyncLocalStorage: AsyncLocalStorage });
}
function Tt() {
  return xt().use().event;
}
const $ = { NORMAL: 0, WILDCARD: 1, PLACEHOLDER: 2 };
function At(e = {}) {
  const t = { options: e, rootNode: ae(), staticRoutesMap: {} }, r = (s) => e.strictTrailingSlash ? s : s.replace(/\/$/, "") || "/";
  if (e.routes) for (const s in e.routes) Q(t, r(s), e.routes[s]);
  return { ctx: t, lookup: (s) => Ct(t, r(s)), insert: (s, n) => Q(t, r(s), n), remove: (s) => Pt(t, r(s)) };
}
function Ct(e, t) {
  const r = e.staticRoutesMap[t];
  if (r) return r.data;
  const s = t.split("/"), n = {};
  let o = false, a = null, i = e.rootNode, u = null;
  for (let c = 0; c < s.length; c++) {
    const h = s[c];
    i.wildcardChildNode !== null && (a = i.wildcardChildNode, u = s.slice(c).join("/"));
    const v = i.children.get(h);
    if (v === void 0) {
      if (i && i.placeholderChildren.length > 1) {
        const E = s.length - c;
        i = i.placeholderChildren.find((m) => m.maxDepth === E) || null;
      } else i = i.placeholderChildren[0] || null;
      if (!i) break;
      i.paramName && (n[i.paramName] = h), o = true;
    } else i = v;
  }
  return (i === null || i.data === null) && a !== null && (i = a, n[i.paramName || "_"] = u, o = true), i ? o ? { ...i.data, params: o ? n : void 0 } : i.data : null;
}
function Q(e, t, r) {
  let s = true;
  const n = t.split("/");
  let o = e.rootNode, a = 0;
  const i = [o];
  for (const u of n) {
    let c;
    if (c = o.children.get(u)) o = c;
    else {
      const h = Lt(u);
      c = ae({ type: h, parent: o }), o.children.set(u, c), h === $.PLACEHOLDER ? (c.paramName = u === "*" ? `_${a++}` : u.slice(1), o.placeholderChildren.push(c), s = false) : h === $.WILDCARD && (o.wildcardChildNode = c, c.paramName = u.slice(3) || "_", s = false), i.push(c), o = c;
    }
  }
  for (const [u, c] of i.entries()) c.maxDepth = Math.max(i.length - u, c.maxDepth || 0);
  return o.data = r, s === true && (e.staticRoutesMap[t] = o), o;
}
function Pt(e, t) {
  let r = false;
  const s = t.split("/");
  let n = e.rootNode;
  for (const o of s) if (n = n.children.get(o), !n) return r;
  if (n.data) {
    const o = s.at(-1) || "";
    n.data = null, Object.keys(n.children).length === 0 && n.parent && (n.parent.children.delete(o), n.parent.wildcardChildNode = null, n.parent.placeholderChildren = []), r = true;
  }
  return r;
}
function ae(e = {}) {
  return { type: e.type || $.NORMAL, maxDepth: 0, parent: e.parent || null, children: /* @__PURE__ */ new Map(), data: e.data || null, paramName: e.paramName || null, wildcardChildNode: null, placeholderChildren: [] };
}
function Lt(e) {
  return e.startsWith("**") ? $.WILDCARD : e[0] === ":" || e === "*" ? $.PLACEHOLDER : $.NORMAL;
}
const ie = [{ page: true, $component: { src: "src/routes/agents/index.tsx?pick=default&pick=$css", build: () => import('../build/index5.mjs'), import: () => import('../build/index5.mjs') }, path: "/agents/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/agents/index.tsx" }, { page: false, $GET: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_3.mjs'), import: () => import('../build/_...path_3.mjs') }, $HEAD: { src: "src/routes/api/[...path].ts?pick=GET", build: () => import('../build/_...path_3.mjs'), import: () => import('../build/_...path_3.mjs') }, $POST: { src: "src/routes/api/[...path].ts?pick=POST", build: () => import('../build/_...path_22.mjs'), import: () => import('../build/_...path_22.mjs') }, path: "/api/*path", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/api/[...path].ts" }, { page: false, $GET: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health2.mjs'), import: () => import('../build/health2.mjs') }, $HEAD: { src: "src/routes/api/health.ts?pick=GET", build: () => import('../build/health2.mjs'), import: () => import('../build/health2.mjs') }, path: "/api/health", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/api/health.ts" }, { page: false, $GET: { src: "src/routes/auth/authorize.ts?pick=GET", build: () => import('../build/authorize2.mjs'), import: () => import('../build/authorize2.mjs') }, $HEAD: { src: "src/routes/auth/authorize.ts?pick=GET", build: () => import('../build/authorize2.mjs'), import: () => import('../build/authorize2.mjs') }, path: "/auth/authorize", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/authorize.ts" }, { page: false, $GET: { src: "src/routes/auth/callback.ts?pick=GET", build: () => import('../build/callback2.mjs'), import: () => import('../build/callback2.mjs') }, $HEAD: { src: "src/routes/auth/callback.ts?pick=GET", build: () => import('../build/callback2.mjs'), import: () => import('../build/callback2.mjs') }, path: "/auth/callback", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/callback.ts" }, { page: true, $component: { src: "src/routes/auth/login.tsx?pick=default&pick=$css", build: () => import('../build/login2.mjs'), import: () => import('../build/login2.mjs') }, path: "/auth/login", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/login.tsx" }, { page: false, $POST: { src: "src/routes/auth/logout.ts?pick=POST", build: () => import('../build/logout2.mjs'), import: () => import('../build/logout2.mjs') }, path: "/auth/logout", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/logout.ts" }, { page: false, $POST: { src: "src/routes/auth/refresh.ts?pick=POST", build: () => import('../build/refresh2.mjs'), import: () => import('../build/refresh2.mjs') }, path: "/auth/refresh", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/refresh.ts" }, { page: false, $GET: { src: "src/routes/auth/status.ts?pick=GET", build: () => import('../build/status2.mjs'), import: () => import('../build/status2.mjs') }, $HEAD: { src: "src/routes/auth/status.ts?pick=GET", build: () => import('../build/status2.mjs'), import: () => import('../build/status2.mjs') }, path: "/auth/status", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/auth/status.ts" }, { page: true, $component: { src: "src/routes/index.tsx?pick=default&pick=$css", build: () => import('../build/index22.mjs'), import: () => import('../build/index22.mjs') }, path: "/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/index.tsx" }, { page: true, $component: { src: "src/routes/models/index.tsx?pick=default&pick=$css", build: () => import('../build/index32.mjs'), import: () => import('../build/index32.mjs') }, path: "/models/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/models/index.tsx" }, { page: true, $component: { src: "src/routes/session/[id].tsx?pick=default&pick=$css", build: () => import('../build/_id_2.mjs'), import: () => import('../build/_id_2.mjs') }, path: "/session/:id", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/session/[id].tsx" }, { page: true, $component: { src: "src/routes/settings/api-keys.tsx?pick=default&pick=$css", build: () => import('../build/api-keys2.mjs'), import: () => import('../build/api-keys2.mjs') }, path: "/settings/api-keys", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/settings/api-keys.tsx" }, { page: true, $component: { src: "src/routes/settings/index.tsx?pick=default&pick=$css", build: () => import('../build/index42.mjs'), import: () => import('../build/index42.mjs') }, path: "/settings/", filePath: "/Users/supercent/Documents/Github/supercode/packages/console/app/src/routes/settings/index.tsx" }], Ht = Nt(ie.filter((e) => e.page));
function Nt(e) {
  function t(r, s, n, o) {
    const a = Object.values(r).find((i) => n.startsWith(i.id + "/"));
    return a ? (t(a.children || (a.children = []), s, n.slice(a.id.length)), r) : (r.push({ ...s, id: n, path: n.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/") }), r);
  }
  return e.sort((r, s) => r.path.length - s.path.length).reduce((r, s) => t(r, s, s.path, s.path), []);
}
function Dt(e, t) {
  const r = Ot.lookup(e);
  if (r && r.route) {
    const s = r.route, n = t === "HEAD" ? s.$HEAD || s.$GET : s[`$${t}`];
    if (n === void 0) return;
    const o = s.page === true && s.$component !== void 0;
    return { handler: n, params: r.params, isPage: o };
  }
}
function _t(e) {
  return e.$HEAD || e.$GET || e.$POST || e.$PUT || e.$PATCH || e.$DELETE;
}
const Ot = At({ routes: ie.reduce((e, t) => {
  if (!_t(t)) return e;
  let r = t.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (s, n) => `**:${n}`).split("/").map((s) => s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s)).join("/");
  if (/:[^/]*\?/g.test(r)) throw new Error(`Optional parameters are not supported in API routes: ${r}`);
  if (e[r]) throw new Error(`Duplicate API routes for "${r}" found at "${e[r].route.path}" and "${t.path}"`);
  return e[r] = { route: t }, e;
}, {}) }), D = "solidFetchEvent";
function qt(e) {
  return { request: $t(e), response: It(e), clientAddress: gt(e), locals: {}, nativeEvent: e };
}
function Ut(e) {
  if (!e.context[D]) {
    const t = qt(e);
    e.context[D] = t;
  }
  return e.context[D];
}
class Gt {
  constructor(t) {
    __publicField(this, "event");
    this.event = t;
  }
  get(t) {
    const r = Y(this.event, t);
    return Array.isArray(r) ? r.join(", ") : r || null;
  }
  has(t) {
    return this.get(t) !== null;
  }
  set(t, r) {
    return yt(this.event, t, r);
  }
  delete(t) {
    return St(this.event, t);
  }
  append(t, r) {
    wt(this.event, t, r);
  }
  getSetCookie() {
    const t = Y(this.event, "Set-Cookie");
    return Array.isArray(t) ? t : [t];
  }
  forEach(t) {
    return Object.entries(H(this.event)).forEach(([r, s]) => t(Array.isArray(s) ? s.join(", ") : s, r, this));
  }
  entries() {
    return Object.entries(H(this.event)).map(([t, r]) => [t, Array.isArray(r) ? r.join(", ") : r])[Symbol.iterator]();
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
    return J(e);
  }, set status(t) {
    O(e, t);
  }, get statusText() {
    return bt(e);
  }, set statusText(t) {
    O(e, J(e), t);
  }, headers: new Gt(e) };
}
var Ft = " ";
const jt = { style: (e) => ssrElement("style", e.attrs, () => e.children, true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(Ft), true) : null, noscript: (e) => ssrElement("noscript", e.attrs, () => escape(e.children), true) };
function q(e, t) {
  let { tag: r, attrs: { key: s, ...n } = { key: void 0 }, children: o } = e;
  return jt[r]({ attrs: { ...n, nonce: t }, key: s, children: o });
}
function Wt(e, t, r, s = "default") {
  return lazy(async () => {
    var _a;
    {
      const o = (await e.import())[s], i = (await ((_a = t.inputs) == null ? void 0 : _a[e.src].assets())).filter((c) => c.tag === "style" || c.attrs.rel === "stylesheet");
      return { default: (c) => [...i.map((h) => q(h)), createComponent(o, c)] };
    }
  });
}
function ce() {
  function e(r) {
    return { ...r, ...r.$$route ? r.$$route.require().route : void 0, info: { ...r.$$route ? r.$$route.require().route.info : {}, filesystem: true }, component: r.$component && Wt(r.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: r.children ? r.children.map(e) : void 0 };
  }
  return Ht.map(e);
}
let X;
const Bt = isServer ? () => getRequestEvent().routes : () => X || (X = ce());
function zt(e) {
  const t = vt(e.nativeEvent, "flash");
  if (t) try {
    let r = JSON.parse(t);
    if (!r || !r.result) return;
    const s = [...r.input.slice(0, -1), new Map(r.input[r.input.length - 1])], n = r.error ? new Error(r.result) : r.result;
    return { input: s, url: r.url, pending: false, result: r.thrown ? void 0 : n, error: r.thrown ? n : void 0 };
  } catch (r) {
    console.error(r);
  } finally {
    Et(e.nativeEvent, "flash", "", { maxAge: 0 });
  }
}
async function Kt(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, e.response.headers.set("Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], router: { submission: zt(e) }, routes: ce(), complete: false, $islands: /* @__PURE__ */ new Set() });
}
const Jt = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function U(e) {
  return e.status && Jt.has(e.status) ? e.status : 302;
}
function Yt(e, t, r = {}, s) {
  return eventHandler({ handler: (n) => {
    const o = Ut(n);
    return provideRequestEvent(o, async () => {
      const a = Dt(new URL(o.request.url).pathname, o.request.method);
      if (a) {
        const m = await a.handler.import(), y = o.request.method === "HEAD" ? m.HEAD || m.GET : m[o.request.method];
        o.params = a.params || {}, sharedConfig.context = { event: o };
        const l = await y(o);
        if (l !== void 0) return l;
        if (o.request.method !== "GET") throw new Error(`API handler for ${o.request.method} "${o.request.url}" did not return a response.`);
        if (!a.isPage) return;
      }
      const i = await t(o), u = typeof r == "function" ? await r(i) : { ...r }, c = u.mode || "stream";
      if (u.nonce && (i.nonce = u.nonce), c === "sync") {
        const m = renderToString(() => (sharedConfig.context.event = i, e(i)), u);
        if (i.complete = true, i.response && i.response.headers.get("Location")) {
          const y = U(i.response);
          return V(n, i.response.headers.get("Location"), y);
        }
        return m;
      }
      if (u.onCompleteAll) {
        const m = u.onCompleteAll;
        u.onCompleteAll = (y) => {
          ee(i)(y), m(y);
        };
      } else u.onCompleteAll = ee(i);
      if (u.onCompleteShell) {
        const m = u.onCompleteShell;
        u.onCompleteShell = (y) => {
          Z(i, n)(), m(y);
        };
      } else u.onCompleteShell = Z(i, n);
      const h = renderToStream(() => (sharedConfig.context.event = i, e(i)), u);
      if (i.response && i.response.headers.get("Location")) {
        const m = U(i.response);
        return V(n, i.response.headers.get("Location"), m);
      }
      if (c === "async") return h;
      const { writable: v, readable: E } = new TransformStream();
      return h.pipeTo(v), E;
    });
  } });
}
function Z(e, t) {
  return () => {
    if (e.response && e.response.headers.get("Location")) {
      const r = U(e.response);
      O(t, r), Rt(t, "Location", e.response.headers.get("Location"));
    }
  };
}
function ee(e) {
  return ({ write: t }) => {
    e.complete = true;
    const r = e.response && e.response.headers.get("Location");
    r && t(`<script>window.location="${r}"<\/script>`);
  };
}
function Vt(e, t, r) {
  return Yt(e, Kt, t);
}
const ue = (e) => (t) => {
  const { base: r } = t, s = children(() => t.children), n = createMemo(() => Es(s(), t.base || ""));
  let o;
  const a = gc(e, n, () => o, { base: r, singleFlight: t.singleFlight, transformUrl: t.transformUrl });
  return e.create && e.create(a), createComponent$1(ws.Provider, { value: a, get children() {
    return createComponent$1(Qt, { routerState: a, get root() {
      return t.root;
    }, get preload() {
      return t.rootPreload || t.rootLoad;
    }, get children() {
      return [(o = getOwner()) && null, createComponent$1(Xt, { routerState: a, get branches() {
        return n();
      } })];
    } });
  } });
};
function Qt(e) {
  const t = e.routerState.location, r = e.routerState.params, s = createMemo(() => e.preload && untrack(() => {
    e.preload({ params: r, location: t, intent: fc() || "initial" });
  }));
  return createComponent$1(Show, { get when() {
    return e.root;
  }, keyed: true, get fallback() {
    return e.children;
  }, children: (n) => createComponent$1(n, { params: r, location: t, get data() {
    return s();
  }, get children() {
    return e.children;
  } }) });
}
function Xt(e) {
  if (isServer) {
    const n = getRequestEvent();
    if (n && n.router && n.router.dataOnly) {
      Zt(n, e.routerState, e.branches);
      return;
    }
    n && ((n.router || (n.router = {})).matches || (n.router.matches = e.routerState.matches().map(({ route: o, path: a, params: i }) => ({ path: o.originalPath, pattern: o.pattern, match: a, params: i, info: o.info }))));
  }
  const t = [];
  let r;
  const s = createMemo(on$2(e.routerState.matches, (n, o, a) => {
    let i = o && n.length === o.length;
    const u = [];
    for (let c = 0, h = n.length; c < h; c++) {
      const v = o && o[c], E = n[c];
      a && v && E.route.key === v.route.key ? u[c] = a[c] : (i = false, t[c] && t[c](), createRoot((m) => {
        t[c] = m, u[c] = pc(e.routerState, u[c - 1] || e.routerState.base, te(() => s()[c + 1]), () => {
          var _a;
          const y = e.routerState.matches();
          return (_a = y[c]) != null ? _a : y[0];
        });
      }));
    }
    return t.splice(n.length).forEach((c) => c()), a && i ? a : (r = u[0], u);
  }));
  return te(() => s() && r)();
}
const te = (e) => () => createComponent$1(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent$1(Do.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function Zt(e, t, r) {
  const s = new URL(e.request.url), n = qt$1(r, new URL(e.router.previousUrl || e.request.url).pathname), o = qt$1(r, s.pathname);
  for (let a = 0; a < o.length; a++) {
    (!n[a] || o[a].route !== n[a].route) && (e.router.dataOnly = true);
    const { route: i, params: u } = o[a];
    i.preload && i.preload({ params: u, location: t.location, intent: "preload" });
  }
}
function er([e, t], r, s) {
  return [e, s ? (n) => t(s(n)) : t];
}
function tr(e) {
  let t = false;
  const r = (n) => typeof n == "string" ? { value: n } : n, s = er(createSignal(r(e.get()), { equals: (n, o) => n.value === o.value && n.state === o.state }), void 0, (n) => (!t && e.set(n), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), n));
  return e.init && onCleanup(e.init((n = e.get()) => {
    t = true, s[1](r(n)), t = false;
  })), ue({ signal: s, create: e.create, utils: e.utils });
}
function rr(e, t, r) {
  return e.addEventListener(t, r), () => e.removeEventListener(t, r);
}
function nr(e, t) {
  const r = e && document.getElementById(e);
  r ? r.scrollIntoView() : t && window.scrollTo(0, 0);
}
function sr(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function or(e) {
  let t;
  const r = { value: e.url || (t = getRequestEvent()) && sr(t.request.url) || "" };
  return ue({ signal: [() => r, (s) => Object.assign(r, s)] })(e);
}
const ar = /* @__PURE__ */ new Map();
function ir(e = true, t = false, r = "/_server", s) {
  return (n) => {
    const o = n.base.path(), a = n.navigatorFactory(n.base);
    let i, u;
    function c(l) {
      return l.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function h(l) {
      if (l.defaultPrevented || l.button !== 0 || l.metaKey || l.altKey || l.ctrlKey || l.shiftKey) return;
      const d = l.composedPath().find((j) => j instanceof Node && j.nodeName.toUpperCase() === "A");
      if (!d || t && !d.hasAttribute("link")) return;
      const g = c(d), f = g ? d.href.baseVal : d.href;
      if ((g ? d.target.baseVal : d.target) || !f && !d.hasAttribute("state")) return;
      const x = (d.getAttribute("rel") || "").split(/\s+/);
      if (d.hasAttribute("download") || x && x.includes("external")) return;
      const C = g ? new URL(f, document.baseURI) : new URL(f);
      if (!(C.origin !== window.location.origin || o && C.pathname && !C.pathname.toLowerCase().startsWith(o.toLowerCase()))) return [d, C];
    }
    function v(l) {
      const d = h(l);
      if (!d) return;
      const [g, f] = d, F = n.parsePath(f.pathname + f.search + f.hash), x = g.getAttribute("state");
      l.preventDefault(), a(F, { resolve: false, replace: g.hasAttribute("replace"), scroll: !g.hasAttribute("noscroll"), state: x ? JSON.parse(x) : void 0 });
    }
    function E(l) {
      const d = h(l);
      if (!d) return;
      const [g, f] = d;
      s && (f.pathname = s(f.pathname)), n.preloadRoute(f, g.getAttribute("preload") !== "false");
    }
    function m(l) {
      clearTimeout(i);
      const d = h(l);
      if (!d) return u = null;
      const [g, f] = d;
      u !== g && (s && (f.pathname = s(f.pathname)), i = setTimeout(() => {
        n.preloadRoute(f, g.getAttribute("preload") !== "false"), u = g;
      }, 20));
    }
    function y(l) {
      if (l.defaultPrevented) return;
      let d = l.submitter && l.submitter.hasAttribute("formaction") ? l.submitter.getAttribute("formaction") : l.target.getAttribute("action");
      if (!d) return;
      if (!d.startsWith("https://action/")) {
        const f = new URL(d, ps);
        if (d = n.parsePath(f.pathname + f.search), !d.startsWith(r)) return;
      }
      if (l.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const g = ar.get(d);
      if (g) {
        l.preventDefault();
        const f = new FormData(l.target, l.submitter);
        g.call({ r: n, f: l.target }, l.target.enctype === "multipart/form-data" ? f : new URLSearchParams(f));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", v), e && (document.addEventListener("mousemove", m, { passive: true }), document.addEventListener("focusin", E, { passive: true }), document.addEventListener("touchstart", E, { passive: true })), document.addEventListener("submit", y), onCleanup(() => {
      document.removeEventListener("click", v), e && (document.removeEventListener("mousemove", m), document.removeEventListener("focusin", E), document.removeEventListener("touchstart", E)), document.removeEventListener("submit", y);
    });
  };
}
function cr(e) {
  if (isServer) return or(e);
  const t = () => {
    const s = window.location.pathname.replace(/^\/+/, "/") + window.location.search, n = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: s + window.location.hash, state: n };
  }, r = ds();
  return tr({ get: t, set({ value: s, replace: n, scroll: o, state: a }) {
    n ? window.history.replaceState(sc(a), "", s) : window.history.pushState(a, "", s), nr(decodeURIComponent(window.location.hash.slice(1)), o), Eo();
  }, init: (s) => rr(window, "popstate", ic(s, (n) => {
    if (n) return !r.confirm(n);
    {
      const o = t();
      return !r.confirm(o.value, { state: o.state });
    }
  })), create: ir(e.preload, e.explicitLinks, e.actionBase, e.transformUrl), utils: { go: (s) => window.history.go(s), beforeLeave: r } })(e);
}
var ur = ["<div", ' class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"><div class="mb-4 flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30"><svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><h2 class="text-lg font-semibold text-gray-900 dark:text-white">Session Expired</h2></div><p class="mb-6 text-gray-600 dark:text-gray-300">Your session has expired. Please log in again to continue.</p><div class="flex gap-3"><button type="button" class="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">Log In Again</button></div></div></div>'];
function lr() {
  const e = Ic();
  return createComponent$1(Show, { get when() {
    return e.requiresReauth();
  }, get children() {
    return ssr(ur, ssrHydrationKey());
  } });
}
var dr = ["<div", ' class="flex items-center justify-center h-screen">Loading...</div>'];
function pr() {
  return createComponent$1(Dc, { defaultTheme: "system", get children() {
    return createComponent$1(Lc, { get children() {
      return [createComponent$1(cr, { root: (e) => createComponent$1(Suspense, { get fallback() {
        return ssr(dr, ssrHydrationKey());
      }, get children() {
        return e.children;
      } }), get children() {
        return createComponent$1(Bt, {});
      } }), createComponent$1(lr, {})];
    } });
  } });
}
const le = isServer ? (e) => {
  const t = getRequestEvent();
  return t.response.status = e.code, t.response.statusText = e.text, onCleanup(() => !t.nativeEvent.handled && !t.complete && (t.response.status = 200)), null;
} : (e) => null;
var hr = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">', "</span>"], fr = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">500 | Internal Server Error</span>'];
const mr = (e) => {
  const t = isServer ? "500 | Internal Server Error" : "Error | Uncaught Client Exception";
  return createComponent$1(ErrorBoundary, { fallback: (r) => (console.error(r), [ssr(hr, ssrHydrationKey(), escape(t)), createComponent$1(le, { code: 500 })]), get children() {
    return e.children;
  } });
}, gr = (e) => {
  let t = false;
  const r = catchError(() => e.children, (s) => {
    console.error(s), t = !!s;
  });
  return t ? [ssr(fr, ssrHydrationKey()), createComponent$1(le, { code: 500 })] : r;
};
var re = ["<script", ">", "<\/script>"], br = ["<script", ' type="module"', " async", "><\/script>"], yr = ["<script", ' type="module" async', "><\/script>"];
const wr = ssr("<!DOCTYPE html>");
function de(e, t, r = []) {
  for (let s = 0; s < t.length; s++) {
    const n = t[s];
    if (n.path !== e[0].path) continue;
    let o = [...r, n];
    if (n.children) {
      const a = e.slice(1);
      if (a.length === 0 || (o = de(a, n.children, o), !o)) continue;
    }
    return o;
  }
}
function vr(e) {
  const t = getRequestEvent(), r = t.nonce;
  let s = [];
  return Promise.resolve().then(async () => {
    let n = [];
    if (t.router && t.router.matches) {
      const o = [...t.router.matches];
      for (; o.length && (!o[0].info || !o[0].info.filesystem); ) o.shift();
      const a = o.length && de(o, t.routes);
      if (a) {
        const i = globalThis.MANIFEST.client.inputs;
        for (let u = 0; u < a.length; u++) {
          const c = a[u], h = i[c.$component.src];
          n.push(h.assets());
        }
      }
    }
    s = await Promise.all(n).then((o) => [...new Map(o.flat().map((a) => [a.attrs.key, a])).values()].filter((a) => a.attrs.rel === "modulepreload" && !t.assets.find((i) => i.attrs.key === a.attrs.key)));
  }), useAssets(() => s.length ? s.map((n) => q(n)) : void 0), createComponent$1(NoHydration, { get children() {
    return [wr, createComponent$1(gr, { get children() {
      return createComponent$1(e.document, { get assets() {
        return [createComponent$1(HydrationScript, {}), t.assets.map((n) => q(n, r))];
      }, get scripts() {
        return r ? [ssr(re, ssrHydrationKey() + ssrAttribute("nonce", escape(r, true), false), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(br, ssrHydrationKey(), ssrAttribute("nonce", escape(r, true), false), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))] : [ssr(re, ssrHydrationKey(), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(yr, ssrHydrationKey(), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))];
      }, get children() {
        return createComponent$1(Hydration, { get children() {
          return createComponent$1(mr, { get children() {
            return createComponent$1(pr, {});
          } });
        } });
      } });
    } })];
  } });
}
var Er = ['<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.ico"><title>SuperCoin Console</title>', "</head>"], Rr = ["<html", ' lang="en">', '<body><div id="app">', "</div><!--$-->", "<!--/--></body></html>"];
const Cr = Vt(() => createComponent$1(vr, { document: ({ assets: e, children: t, scripts: r }) => ssr(Rr, ssrHydrationKey(), createComponent$1(NoHydration, { get children() {
  return ssr(Er, escape(e));
} }), escape(t), escape(r)) }));

const handlers = [
  { route: '', handler: _CdXS_Z, lazy: false, middleware: true, method: undefined },
  { route: '/_server', handler: Ho$1, lazy: false, middleware: true, method: undefined },
  { route: '/', handler: Cr, lazy: false, middleware: true, method: undefined }
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

export { Ac as A, Cc as C, Ec as E, Ic as I, Lo$1 as L, Me as M, Oc as O, Pc as P, Sc as S, Tc as T, ac as a, bc as b, cc as c, dc as d, ut$1 as e, hc as h, ii as i, lc as l, mc as m, nodeServer as n, si as s, uc as u, vc as v, wc as w, xc as x, yc as y };
//# sourceMappingURL=nitro.mjs.map

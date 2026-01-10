#!/usr/bin/env node

// src/cli/index.ts
import * as clack6 from "@clack/prompts";
import { Command as Command7 } from "commander";

// src/config/loader.ts
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// src/config/schema.ts
import { z } from "zod";
var LocalhostProviderSchema = z.object({
  enabled: z.boolean().default(true),
  baseUrl: z.string().default("http://localhost:11434/v1"),
  defaultModel: z.string().optional()
});
var SuperCoinConfigSchema = z.object({
  default_model: z.string().default("anthropic/claude-sonnet-4-5"),
  fallback_models: z.array(z.string()).default([]),
  providers: z.object({
    anthropic: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.anthropic.com")
    }).optional(),
    openai: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.openai.com")
    }).optional(),
    google: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      baseUrl: z.string().url().default("https://generativelanguage.googleapis.com")
    }).optional(),
    ollama: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:11434/v1"),
      defaultModel: z.string().default("llama3.2")
    }).optional(),
    lmstudio: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:1234/v1"),
      defaultModel: z.string().default("local-model")
    }).optional(),
    llamacpp: LocalhostProviderSchema.extend({
      baseUrl: z.string().default("http://localhost:8080/v1"),
      defaultModel: z.string().default("local-model")
    }).optional()
  }).optional(),
  agents: z.record(z.object({
    model: z.string().optional(),
    disabled: z.boolean().optional()
  })).optional(),
  disabled_hooks: z.array(z.string()).default([]),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3100),
    host: z.string().default("127.0.0.1"),
    autoStart: z.boolean().default(true)
  }).optional()
});

// src/config/loader.ts
var CONFIG_FILENAME = "config.json";
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (sourceValue !== null && typeof sourceValue === "object" && !Array.isArray(sourceValue) && targetValue !== null && typeof targetValue === "object" && !Array.isArray(targetValue)) {
      result[key] = deepMerge(
        targetValue,
        sourceValue
      );
    } else if (sourceValue !== void 0) {
      result[key] = sourceValue;
    }
  }
  return result;
}
async function tryReadConfig(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = await readFile(filePath, "utf-8");
    const cleaned = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(`Error reading config from ${filePath}:`, error);
    return null;
  }
}
function getConfigPaths(directory) {
  const paths = [];
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home) {
    paths.push(path.join(home, ".config", "supercoin", CONFIG_FILENAME));
  }
  const projectDir = directory || process.cwd();
  paths.push(path.join(projectDir, ".supercoin", CONFIG_FILENAME));
  return paths;
}
async function loadConfig(directory) {
  const configPaths = getConfigPaths(directory);
  let mergedConfig = {};
  for (const configPath of configPaths) {
    const config = await tryReadConfig(configPath);
    if (config) {
      mergedConfig = deepMerge(mergedConfig, config);
    }
  }
  const result = SuperCoinConfigSchema.safeParse(mergedConfig);
  if (!result.success) {
    console.error("Configuration validation errors:", result.error.errors);
    return SuperCoinConfigSchema.parse({});
  }
  return result.data;
}

// src/cli/commands/auth.ts
import { Command } from "commander";
import * as clack4 from "@clack/prompts";

// src/services/auth/claude.ts
import * as clack from "@clack/prompts";

// src/server/store/token-store.ts
import { promises as fs } from "fs";
import { existsSync as existsSync2, mkdirSync } from "fs";
import * as crypto2 from "crypto";
import path2 from "path";

// src/shared/logger.ts
var DEBUG = process.env.SUPERCOIN_DEBUG === "1" || process.env.DEBUG === "supercoin";
var logger = {
  debug: (message, data) => {
    if (DEBUG) {
      console.debug(`[supercoin:debug] ${message}`, data ?? "");
    }
  },
  info: (message) => {
    console.log(`[supercoin] ${message}`);
  },
  warn: (message) => {
    console.warn(`[supercoin:warn] ${message}`);
  },
  error: (message, error) => {
    console.error(`[supercoin:error] ${message}`);
    if (error && DEBUG) {
      console.error(error.stack);
    }
  },
  success: (message) => {
    console.log(`[supercoin] ${message}`);
  }
};
var logger_default = logger;

// src/server/store/token-store.ts
var TokenStore = class {
  ALGORITHM = "aes-256-gcm";
  KEY_LENGTH = 32;
  IV_LENGTH = 16;
  encryptionKey = null;
  configDir;
  keyFile;
  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path2.join(home, ".config", "supercoin");
    this.keyFile = path2.join(this.configDir, ".key");
    if (!existsSync2(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 448 });
    }
  }
  /**
   * Get or create encryption key
   */
  async getEncryptionKey() {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }
    if (existsSync2(this.keyFile)) {
      try {
        const keyHex = await fs.readFile(this.keyFile, "utf-8");
        this.encryptionKey = Buffer.from(keyHex.trim(), "hex");
        return this.encryptionKey;
      } catch {
      }
    }
    this.encryptionKey = crypto2.randomBytes(this.KEY_LENGTH);
    await fs.writeFile(this.keyFile, this.encryptionKey.toString("hex"), {
      mode: 384
    });
    return this.encryptionKey;
  }
  /**
   * Encrypt data
   */
  async encrypt(data) {
    const key = await this.getEncryptionKey();
    const iv = crypto2.randomBytes(this.IV_LENGTH);
    const cipher = crypto2.createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();
    return {
      encryptedData: encrypted,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64")
    };
  }
  /**
   * Decrypt data
   */
  async decrypt(encrypted) {
    const key = await this.getEncryptionKey();
    const iv = Buffer.from(encrypted.iv, "base64");
    const authTag = Buffer.from(encrypted.authTag, "base64");
    const decipher = crypto2.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted.encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
  /**
   * Get token file path
   */
  getTokenFilePath(provider, accountId) {
    const fileName = accountId ? `${provider}_${accountId}.token` : `${provider}.token`;
    return path2.join(this.configDir, fileName);
  }
  /**
   * Get all token files for a provider
   */
  async getAllTokenFiles(provider) {
    const files = [];
    const { promises: fsp } = await import("fs");
    try {
      const dirFiles = await fsp.readdir(this.configDir);
      for (const file of dirFiles) {
        if (file.startsWith(`${provider}_`) && file.endsWith(".token")) {
          files.push(path2.join(this.configDir, file));
        } else if (file === `${provider}.token`) {
          files.push(path2.join(this.configDir, file));
        }
      }
    } catch {
    }
    return files;
  }
  /**
   * Store token
   */
  async store(provider, tokens) {
    const filePath = this.getTokenFilePath(provider, tokens.accountId);
    const encrypted = await this.encrypt(JSON.stringify(tokens));
    await fs.writeFile(filePath, JSON.stringify(encrypted), {
      mode: 384
    });
    logger_default.debug(`Token stored for ${provider}${tokens.accountId ? ` (${tokens.accountId})` : ""}`);
  }
  /**
   * Retrieve token
   */
  async retrieve(provider, accountId) {
    const filePath = this.getTokenFilePath(provider, accountId);
    try {
      if (!existsSync2(filePath)) {
        return null;
      }
      const content = await fs.readFile(filePath, "utf-8");
      const encrypted = JSON.parse(content);
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      logger_default.error(`Failed to retrieve token for ${provider}${accountId ? ` (${accountId})` : ""}`, error);
      return null;
    }
  }
  /**
   * Retrieve all tokens for a provider
   */
  async retrieveAll(provider) {
    const files = await this.getAllTokenFiles(provider);
    const tokens = [];
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const encrypted = JSON.parse(content);
        const decrypted = await this.decrypt(encrypted);
        tokens.push(JSON.parse(decrypted));
      } catch (error) {
        logger_default.error(`Failed to retrieve token from ${filePath}`, error);
      }
    }
    return tokens;
  }
  /**
   * Delete token
   */
  async delete(provider, accountId) {
    if (accountId === "*") {
      const files = await this.getAllTokenFiles(provider);
      for (const filePath2 of files) {
        try {
          await fs.unlink(filePath2);
        } catch (error) {
          logger_default.error(`Failed to delete token file ${filePath2}`, error);
        }
      }
      logger_default.debug(`All tokens deleted for ${provider}`);
      return;
    }
    const filePath = this.getTokenFilePath(provider, accountId);
    try {
      if (existsSync2(filePath)) {
        await fs.unlink(filePath);
        logger_default.debug(`Token deleted for ${provider}${accountId ? ` (${accountId})` : ""}`);
      }
    } catch (error) {
      logger_default.error(`Failed to delete token for ${provider}${accountId ? ` (${accountId})` : ""}`, error);
    }
  }
  /**
   * Check if token is valid (not expired)
   */
  async isValid(provider, accountId) {
    const tokens = await this.retrieve(provider, accountId);
    if (!tokens) return false;
    if (tokens.type === "api_key") return true;
    const bufferMs = 5 * 60 * 1e3;
    return tokens.expiresAt > Date.now() + bufferMs;
  }
  /**
   * Check if token needs refresh
   */
  async needsRefresh(provider, accountId) {
    const tokens = await this.retrieve(provider, accountId);
    if (!tokens) return false;
    if (tokens.type === "api_key") return false;
    const refreshWindowMs = 15 * 60 * 1e3;
    return tokens.expiresAt < Date.now() + refreshWindowMs;
  }
};
var tokenStoreInstance = null;
function getTokenStore() {
  if (!tokenStoreInstance) {
    tokenStoreInstance = new TokenStore();
  }
  return tokenStoreInstance;
}

// src/services/auth/claude.ts
var ClaudeAuthProvider = class {
  name = "claude";
  displayName = "Claude (Anthropic)";
  tokenStore = getTokenStore();
  async login(options) {
    try {
      let apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey && options?.interactive !== false) {
        clack.note(
          "Get your API key from:\nhttps://console.anthropic.com/settings/keys"
        );
        const input = await clack.password({
          message: "Enter your Anthropic API key:",
          validate: (value) => {
            if (!value) return "API key is required";
            if (!value.startsWith("sk-ant-")) {
              return "Invalid API key format (should start with sk-ant-)";
            }
          }
        });
        if (clack.isCancel(input)) {
          return { success: false, error: "Login cancelled" };
        }
        apiKey = input;
      }
      if (!apiKey) {
        return { success: false, error: "API key is required" };
      }
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        return { success: false, error: "Invalid API key" };
      }
      const tokenData = {
        accessToken: apiKey,
        provider: this.name,
        type: "api_key",
        expiresAt: Number.MAX_SAFE_INTEGER
        // API keys don't expire
      };
      await this.tokenStore.store(this.name, tokenData);
      return { success: true, provider: this.name };
    } catch (error) {
      logger_default.error("Claude login failed", error);
      return { success: false, error: error.message };
    }
  }
  async logout(accountId) {
    await this.tokenStore.delete(this.name, accountId);
  }
  async getToken(accountId) {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    return tokens?.accessToken ?? null;
  }
  async isAuthenticated(accountId) {
    return this.tokenStore.isValid(this.name, accountId);
  }
  async validateApiKey(apiKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }]
        })
      });
      return response.status !== 401;
    } catch (error) {
      logger_default.error("API key validation failed", error);
      return false;
    }
  }
};

// src/services/auth/codex.ts
import * as clack2 from "@clack/prompts";
var CodexAuthProvider = class {
  name = "codex";
  displayName = "Codex (OpenAI)";
  tokenStore = getTokenStore();
  async login(options) {
    try {
      let apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey && options?.interactive !== false) {
        clack2.note(
          "Get your API key from:\nhttps://platform.openai.com/api-keys"
        );
        const input = await clack2.password({
          message: "Enter your OpenAI API key:",
          validate: (value) => {
            if (!value) return "API key is required";
            if (!value.startsWith("sk-")) {
              return "Invalid API key format (should start with sk-)";
            }
          }
        });
        if (clack2.isCancel(input)) {
          return { success: false, error: "Login cancelled" };
        }
        apiKey = input;
      }
      if (!apiKey) {
        return { success: false, error: "API key is required" };
      }
      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        return { success: false, error: "Invalid API key" };
      }
      const tokenData = {
        accessToken: apiKey,
        provider: this.name,
        type: "api_key",
        expiresAt: Number.MAX_SAFE_INTEGER
      };
      await this.tokenStore.store(this.name, tokenData);
      return { success: true, provider: this.name };
    } catch (error) {
      logger_default.error("Codex login failed", error);
      return { success: false, error: error.message };
    }
  }
  async logout(accountId) {
    await this.tokenStore.delete(this.name, accountId);
  }
  async getToken(accountId) {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    return tokens?.accessToken ?? null;
  }
  async isAuthenticated(accountId) {
    return this.tokenStore.isValid(this.name, accountId);
  }
  async validateApiKey(apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });
      return response.status === 200;
    } catch (error) {
      logger_default.error("API key validation failed", error);
      return false;
    }
  }
};

// src/services/auth/gemini.ts
import * as clack3 from "@clack/prompts";
import { exec } from "child_process";

// src/server/store/oauth-state-store.ts
import { promises as fs2 } from "fs";
import { existsSync as existsSync3 } from "fs";
import * as crypto3 from "crypto";
import path3 from "path";
var STATE_EXPIRY_MS = 10 * 60 * 1e3;
var OAuthStateStore = class {
  states = /* @__PURE__ */ new Map();
  configDir;
  stateFile;
  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path3.join(home, ".config", "supercoin");
    this.stateFile = path3.join(this.configDir, ".oauth-states");
    this.loadStates();
    this.startCleanupTimer();
  }
  async loadStates() {
    try {
      if (existsSync3(this.stateFile)) {
        const content = await fs2.readFile(this.stateFile, "utf-8");
        const data = JSON.parse(content);
        this.states = new Map(Object.entries(data));
        this.cleanupExpired();
      }
    } catch (error) {
      logger_default.error("Failed to load OAuth states", error);
      this.states.clear();
    }
  }
  async saveStates() {
    try {
      const data = Object.fromEntries(this.states);
      await fs2.writeFile(this.stateFile, JSON.stringify(data), { mode: 384 });
    } catch (error) {
      logger_default.error("Failed to save OAuth states", error);
    }
  }
  async store(state) {
    this.states.set(state.state, state);
    await this.saveStates();
  }
  async retrieve(stateValue) {
    const state = this.states.get(stateValue);
    if (!state) return null;
    if (Date.now() - state.createdAt > STATE_EXPIRY_MS) {
      this.states.delete(stateValue);
      await this.saveStates();
      return null;
    }
    return state;
  }
  async delete(stateValue) {
    this.states.delete(stateValue);
    await this.saveStates();
  }
  async deleteByProvider(provider) {
    for (const [key, value] of this.states.entries()) {
      if (value.provider === provider) {
        this.states.delete(key);
      }
    }
    await this.saveStates();
  }
  cleanupExpired() {
    const now = Date.now();
    for (const [key, value] of this.states.entries()) {
      if (now - value.createdAt > STATE_EXPIRY_MS) {
        this.states.delete(key);
      }
    }
  }
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpired();
      this.saveStates();
    }, 6e4);
  }
  generatePKCEPair() {
    const verifier = crypto3.randomBytes(64).toString("base64url");
    const challenge = crypto3.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }
  generateState() {
    return crypto3.randomBytes(32).toString("hex");
  }
};
var oauthStateStoreInstance = null;
function getOAuthStateStore() {
  if (!oauthStateStoreInstance) {
    oauthStateStoreInstance = new OAuthStateStore();
  }
  return oauthStateStoreInstance;
}

// node_modules/@hono/node-server/dist/index.mjs
import { createServer as createServerHTTP } from "http";
import { Http2ServerRequest as Http2ServerRequest2 } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto4 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.setPrototypeOf(requestPrototype, Request.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      headers ||= init?.headers || { "content-type": "text/plain; charset=UTF-8" };
      this[cacheKey] = [init?.status || 200, body, headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(cache[2]);
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel4 = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel4);
  writable.on("error", cancel4);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel4);
    writable.off("error", cancel4);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
var webFetch = global.fetch;
if (typeof global.crypto === "undefined") {
  global.crypto = crypto4;
}
global.fetch = (info, init) => {
  init = {
    // Disable compression handling so people can return the result of a fetch
    // directly in the loader without messing with the Content-Encoding header.
    compress: false,
    ...init
  };
  return webFetch(info, init);
};
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  if (header instanceof Headers) {
    header = buildOutgoingHttpHeaders(header);
  }
  if (typeof body === "string") {
    header["Content-Length"] = Buffer.byteLength(body);
  } else if (body instanceof Uint8Array) {
    header["Content-Length"] = body.byteLength;
  } else if (body instanceof Blob) {
    header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request) {
    Object.defineProperty(global, "Request", {
      value: Request
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    incoming.destroy();
                    outgoing.destroy();
                  });
                }
              });
            }
          };
        }
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                incoming.destroy();
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer2 = options.createServer || createServerHTTP;
  const server = createServer2(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo2 = server.address();
    listeningListener && listeningListener(serverInfo2);
  });
  return server;
};

// src/server/index.ts
import { Hono as Hono4 } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

// src/server/routes/index.ts
import { Hono as Hono3 } from "hono";

// src/server/routes/health.ts
import { Hono } from "hono";
function createHealthRoutes() {
  const app = new Hono();
  app.get("/", (c) => {
    return c.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "0.1.0"
    });
  });
  app.get("/ready", (c) => {
    return c.json({
      status: "ready",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  return app;
}

// src/server/routes/auth-callback.ts
import { Hono as Hono2 } from "hono";
import { html } from "hono/html";
import { EventEmitter } from "events";
var callbackEmitter = new EventEmitter();
function createAuthCallbackRoutes() {
  const app = new Hono2();
  app.get("/:provider", async (c) => {
    const provider = c.req.param("provider");
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");
    if (error) {
      const callbackData2 = {
        code: "",
        state: state || "",
        error,
        errorDescription
      };
      callbackEmitter.emit(`callback:${provider}`, {
        success: false,
        provider,
        ...callbackData2
      });
      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
                backdrop-filter: blur(10px);
              }
              h1 { color: #ff6b6b; margin-bottom: 16px; }
              p { color: #ddd; margin: 8px 0; }
              .error { color: #ff6b6b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authentication Failed</h1>
              <p>Provider: <strong>${provider}</strong></p>
              <p class="error">${errorDescription || error}</p>
              <p>You can close this window.</p>
            </div>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
        </html>
      `);
    }
    if (!code) {
      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
              }
              h1 { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Missing Authorization Code</h1>
              <p>The authorization code was not received.</p>
            </div>
          </body>
        </html>
      `);
    }
    if (!state) {
      return c.html(html`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Security Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
              }
              h1 { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🛡️ Security Error</h1>
              <p>Missing state parameter (CSRF protection).</p>
            </div>
          </body>
        </html>
      `);
    }
    const callbackData = {
      code,
      state
    };
    callbackEmitter.emit(`callback:${provider}`, {
      success: true,
      provider,
      ...callbackData
    });
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255,255,255,0.1);
              border-radius: 12px;
              backdrop-filter: blur(10px);
            }
            h1 { color: #4ade80; margin-bottom: 16px; }
            p { color: #ddd; }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top: 4px solid #4ade80;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>Provider: <strong>${provider}</strong></p>
            <div class="spinner"></div>
            <p>Processing... You can close this window.</p>
          </div>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  });
  return app;
}
function waitForCallback(provider, timeoutMs = 12e4) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      callbackEmitter.removeAllListeners(`callback:${provider}`);
      reject(new Error(`OAuth callback timeout for ${provider}`));
    }, timeoutMs);
    callbackEmitter.once(`callback:${provider}`, (result) => {
      clearTimeout(timer);
      if (result.success) {
        resolve({ code: result.code, state: result.state });
      } else {
        reject(new Error(result.errorDescription || result.error || "OAuth failed"));
      }
    });
  });
}

// src/server/routes/index.ts
function createRoutes() {
  const app = new Hono3();
  app.route("/health", createHealthRoutes());
  app.route("/callback", createAuthCallbackRoutes());
  return app;
}

// src/server/index.ts
var serverInstance = null;
var serverStartTime = null;
var serverInfo = null;
function createServer() {
  const app = new Hono4();
  app.use("*", cors());
  app.use("*", honoLogger());
  app.get("/", (c) => {
    return c.json({
      name: "supercoin",
      version: "0.1.0",
      status: "running"
    });
  });
  app.route("/", createRoutes());
  app.notFound((c) => {
    return c.json({ error: "Not Found" }, 404);
  });
  app.onError((err, c) => {
    console.error(`[supercoin:server] Error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  });
  return app;
}
async function startServer(config) {
  if (serverInstance) {
    return getServerStatus();
  }
  const app = createServer();
  if (typeof Bun !== "undefined") {
    serverInstance = Bun.serve({
      port: config.port,
      hostname: config.host,
      fetch: app.fetch
    });
    serverInfo = { port: serverInstance.port, host: serverInstance.hostname };
  } else {
    serverInstance = serve({
      fetch: app.fetch,
      port: config.port,
      hostname: config.host
    });
    serverInfo = { port: config.port, host: config.host };
  }
  serverStartTime = Date.now();
  return {
    running: true,
    port: serverInfo.port,
    host: serverInfo.host,
    pid: process.pid,
    uptime: 0
  };
}
async function stopServer() {
  if (serverInstance) {
    if (typeof Bun !== "undefined") {
      serverInstance.stop();
    } else {
      serverInstance.close();
    }
    serverInstance = null;
    serverStartTime = null;
    serverInfo = null;
  }
}
function getServerStatus() {
  if (!serverInstance || !serverInfo) {
    return { running: false };
  }
  return {
    running: true,
    port: serverInfo.port,
    host: serverInfo.host,
    pid: process.pid,
    uptime: serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1e3) : 0
  };
}
function isServerRunning() {
  return serverInstance !== null;
}

// src/services/auth/gemini.ts
var ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
var ANTIGRAVITY_CLIENT_SECRET = "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";
var ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
  "https://www.googleapis.com/auth/generative-language.retriever"
];
var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var DEFAULT_SERVER_PORT = 3100;
var GeminiAuthProvider = class {
  name = "gemini";
  displayName = "Gemini (Google)";
  tokenStore = getTokenStore();
  oauthStateStore = getOAuthStateStore();
  async login(options) {
    try {
      let apiKey = options?.apiKey || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        return await this.loginWithApiKey(apiKey, options?.accountId);
      }
      if (options?.interactive !== false) {
        const authMethod = await clack3.select({
          message: "Select Gemini authentication method:",
          options: [
            { value: "oauth", label: "OAuth with Antigravity (Recommended)", hint: "Browser login" },
            { value: "apikey", label: "API Key", hint: "Direct key input" }
          ]
        });
        if (clack3.isCancel(authMethod)) {
          return { success: false, error: "Login cancelled" };
        }
        if (authMethod === "apikey") {
          const input = await clack3.password({
            message: "Enter your Google AI API key:",
            validate: (value) => {
              if (!value) return "API key is required";
            }
          });
          if (clack3.isCancel(input)) {
            return { success: false, error: "Login cancelled" };
          }
          return await this.loginWithApiKey(input, options?.accountId);
        } else {
          return await this.loginWithOAuth(options?.accountId);
        }
      }
      return { success: false, error: "Authentication required" };
    } catch (error) {
      logger_default.error("Gemini login failed", error);
      return { success: false, error: error.message };
    }
  }
  async loginWithApiKey(apiKey, accountId) {
    const isValid = await this.validateApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key" };
    }
    const tokenData = {
      accessToken: apiKey,
      provider: this.name,
      type: "api_key",
      expiresAt: Number.MAX_SAFE_INTEGER,
      accountId: accountId || "default"
    };
    await this.tokenStore.store(this.name, tokenData);
    return { success: true, provider: this.name, accountId: tokenData.accountId };
  }
  async loginWithOAuth(accountId) {
    try {
      if (!isServerRunning()) {
        await startServer({ port: DEFAULT_SERVER_PORT, host: "127.0.0.1" });
      }
      const redirectUri = `http://localhost:${DEFAULT_SERVER_PORT}/callback/${this.name}`;
      const { verifier, challenge } = this.oauthStateStore.generatePKCEPair();
      const state = this.oauthStateStore.generateState();
      const oauthState = {
        provider: this.name,
        state,
        codeVerifier: verifier,
        createdAt: Date.now(),
        accountId: accountId || `account_${Date.now()}`
      };
      await this.oauthStateStore.store(oauthState);
      const params = new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: ANTIGRAVITY_SCOPES.join(" "),
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        access_type: "offline",
        prompt: "consent"
      });
      const authUrl = `${GOOGLE_AUTH_URL}?${params}`;
      clack3.note(`Opening browser for authentication...
If browser doesn't open, visit:
${authUrl}`);
      this.openBrowser(authUrl);
      const { code, state: returnedState } = await waitForCallback(this.name, 12e4);
      const storedState = await this.oauthStateStore.retrieve(returnedState);
      if (!storedState || storedState.state !== returnedState) {
        throw new Error("Invalid state parameter (CSRF protection)");
      }
      await this.exchangeCode(code, storedState.codeVerifier, redirectUri, storedState.accountId);
      await this.oauthStateStore.delete(returnedState);
      return { success: true, provider: this.name, accountId: storedState.accountId };
    } catch (error) {
      logger_default.error("OAuth flow failed", error);
      return { success: false, error: error.message };
    }
  }
  async logout(accountId) {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (tokens?.type === "oauth" && tokens.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: "POST"
        });
      } catch {
      }
    }
    await this.tokenStore.delete(this.name, accountId);
  }
  async refresh(accountId) {
    const currentTokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!currentTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        refresh_token: currentTokens.refreshToken,
        grant_type: "refresh_token"
      })
    });
    if (!response.ok) {
      throw new Error("Token refresh failed");
    }
    const data = await response.json();
    const newTokenData = {
      ...currentTokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || currentTokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1e3
    };
    await this.tokenStore.store(this.name, newTokenData);
    return newTokenData;
  }
  async getToken(accountId) {
    const tokens = await this.tokenStore.retrieve(this.name, accountId);
    if (!tokens) return null;
    if (tokens.type === "oauth") {
      const needsRefresh = await this.tokenStore.needsRefresh(this.name, accountId);
      if (needsRefresh && tokens.refreshToken) {
        try {
          const newTokens = await this.refresh(accountId);
          return newTokens.accessToken;
        } catch {
          return null;
        }
      }
    }
    return tokens.accessToken;
  }
  async isAuthenticated(accountId) {
    return this.tokenStore.isValid(this.name, accountId);
  }
  async validateApiKey(apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  async exchangeCode(code, verifier, redirectUri, accountId) {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${await response.text()}`);
    }
    const data = await response.json();
    const tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      provider: this.name,
      type: "oauth",
      expiresAt: Date.now() + data.expires_in * 1e3,
      scopes: ANTIGRAVITY_SCOPES,
      accountId
    };
    await this.tokenStore.store(this.name, tokenData);
    return tokenData;
  }
  openBrowser(url) {
    const start = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${start} "${url}"`);
  }
};

// src/services/auth/hub.ts
var AuthHub = class {
  providers;
  tokenStore = getTokenStore();
  constructor() {
    this.providers = /* @__PURE__ */ new Map([
      ["claude", new ClaudeAuthProvider()],
      ["codex", new CodexAuthProvider()],
      ["gemini", new GeminiAuthProvider()]
    ]);
  }
  /**
   * Login to specific provider or interactively select
   */
  async login(providerName, options) {
    const results = [];
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return [{ success: false, error: `Unknown provider: ${providerName}` }];
      }
      return [await provider.login(options)];
    }
    for (const [name, provider] of this.providers) {
      const result = await provider.login(options);
      results.push({ ...result, provider: name });
    }
    return results;
  }
  /**
   * Get authentication status for all providers
   */
  async status() {
    const statuses = [];
    for (const [name, provider] of this.providers) {
      const allTokens = await this.tokenStore.retrieveAll(name);
      if (allTokens.length === 0) {
        statuses.push({
          provider: name,
          displayName: provider.displayName,
          authenticated: false,
          accountCount: 0
        });
      } else {
        for (const tokens of allTokens) {
          const isAuthenticated = await provider.isAuthenticated(tokens.accountId);
          statuses.push({
            provider: name,
            displayName: provider.displayName,
            authenticated: isAuthenticated,
            type: tokens.type,
            expiresAt: tokens.expiresAt,
            accountId: tokens.accountId,
            accountCount: allTokens.length,
            needsRefresh: tokens.type === "oauth" ? await this.tokenStore.needsRefresh(name, tokens.accountId) : false
          });
        }
      }
    }
    return statuses;
  }
  /**
   * Refresh tokens for specific provider or all
   */
  async refresh(providerName, accountId) {
    const results = [];
    const providers = providerName ? [[providerName, this.providers.get(providerName)]] : Array.from(this.providers.entries());
    for (const [name, provider] of providers) {
      if (provider?.refresh) {
        try {
          await provider.refresh(accountId);
          results.push({ success: true, provider: name, accountId });
        } catch (error) {
          results.push({
            success: false,
            provider: name,
            accountId,
            error: error.message
          });
        }
      } else {
        results.push({
          success: true,
          provider: name,
          accountId
        });
      }
    }
    return results;
  }
  /**
   * Logout from specific provider or all
   */
  async logout(providerName, accountId) {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        await provider.logout(accountId);
      }
      return;
    }
    for (const provider of this.providers.values()) {
      await provider.logout(accountId);
    }
  }
  /**
   * Get token for specific provider
   */
  async getToken(providerName, accountId) {
    const provider = this.providers.get(providerName);
    if (!provider) return null;
    return provider.getToken(accountId);
  }
  /**
   * Check if specific provider is authenticated
   */
  async isAuthenticated(providerName, accountId) {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.isAuthenticated(accountId);
  }
  /**
   * Get provider instance
   */
  getProvider(providerName) {
    return this.providers.get(providerName);
  }
  /**
   * Map model provider to auth provider name
   */
  mapModelProviderToAuth(modelProvider) {
    const mapping = {
      anthropic: "claude",
      openai: "codex",
      google: "gemini"
    };
    return mapping[modelProvider] || null;
  }
};
var authHubInstance = null;
function getAuthHub() {
  if (!authHubInstance) {
    authHubInstance = new AuthHub();
  }
  return authHubInstance;
}

// src/cli/commands/auth.ts
function createAuthCommand(config) {
  const auth = new Command("auth").description("Manage authentication for AI providers");
  const authHub = getAuthHub();
  auth.command("login").description("Authenticate with AI providers").option("--claude", "Login to Claude (Anthropic)").option("--codex", "Login to Codex (OpenAI)").option("--gemini", "Login to Gemini (Google)").option("--api-key <key>", "Provide API key directly").option("--no-tui", "Disable interactive prompts").action(async (options) => {
    const providers = [];
    if (options.claude) providers.push("claude");
    if (options.codex) providers.push("codex");
    if (options.gemini) providers.push("gemini");
    if (providers.length === 0 && options.tui !== false) {
      clack4.intro("SuperCoin Authentication");
      const selected = await clack4.multiselect({
        message: "Select providers to authenticate:",
        options: [
          { value: "claude", label: "Claude (Anthropic)", hint: "API Key" },
          { value: "codex", label: "Codex (OpenAI)", hint: "API Key" },
          { value: "gemini", label: "Gemini (Google)", hint: "OAuth with Antigravity" }
        ],
        required: true
      });
      if (clack4.isCancel(selected)) {
        clack4.cancel("Authentication cancelled");
        process.exit(0);
      }
      providers.push(...selected);
    }
    for (const provider of providers) {
      const s = clack4.spinner();
      s.start(`Authenticating with ${provider}...`);
      try {
        const results = await authHub.login(provider, {
          apiKey: options.apiKey,
          interactive: options.tui !== false
        });
        const result = results[0];
        if (result.success) {
          s.stop(`Successfully authenticated with ${provider}`);
        } else {
          s.stop(`Failed to authenticate with ${provider}: ${result.error}`);
        }
      } catch (error) {
        s.stop(`Failed to authenticate with ${provider}`);
        logger_default.error(`Auth error for ${provider}`, error);
      }
    }
    console.log("");
    await showAuthStatus(authHub);
    clack4.outro("Authentication complete!");
  });
  auth.command("status").description("Show authentication status").option("--json", "Output as JSON").action(async (options) => {
    const statuses = await authHub.status();
    if (options.json) {
      console.log(JSON.stringify(statuses, null, 2));
      return;
    }
    await showAuthStatus(authHub);
  });
  auth.command("refresh").description("Refresh authentication tokens").option("--claude", "Refresh Claude token").option("--codex", "Refresh Codex token").option("--gemini", "Refresh Gemini token").action(async (options) => {
    const providers = [];
    if (options.claude) providers.push("claude");
    if (options.codex) providers.push("codex");
    if (options.gemini) providers.push("gemini");
    if (providers.length === 0) {
      providers.push("claude", "codex", "gemini");
    }
    for (const provider of providers) {
      const s = clack4.spinner();
      s.start(`Refreshing ${provider} token...`);
      try {
        const results = await authHub.refresh(provider);
        const result = results[0];
        if (result.success) {
          s.stop(`${provider} token refreshed`);
        } else {
          s.stop(`${provider}: ${result.error || "Already up to date"}`);
        }
      } catch (error) {
        s.stop(`${provider}: ${error.message}`);
      }
    }
  });
  auth.command("logout").description("Logout from AI providers").option("--claude", "Logout from Claude").option("--codex", "Logout from Codex").option("--gemini", "Logout from Gemini").option("--all", "Logout from all providers").action(async (options) => {
    if (options.all) {
      await authHub.logout();
      clack4.outro("Logged out from all providers");
      return;
    }
    const providers = [];
    if (options.claude) providers.push("claude");
    if (options.codex) providers.push("codex");
    if (options.gemini) providers.push("gemini");
    for (const provider of providers) {
      await authHub.logout(provider);
      logger_default.info(`Logged out from ${provider}`);
    }
  });
  return auth;
}
async function showAuthStatus(authHub) {
  const statuses = await authHub.status();
  console.log("\nAuthentication Status:\n");
  console.log("+-----------+----------------+-----------+---------------------+");
  console.log("| Provider  | Status         | Type      | Expires             |");
  console.log("+-----------+----------------+-----------+---------------------+");
  for (const status of statuses) {
    const icon = status.authenticated ? "[OK]" : "[--]";
    const statusText = status.authenticated ? "Authenticated" : "Not logged in";
    const typeText = status.type || "-";
    const expiresText = status.expiresAt ? status.expiresAt === Number.MAX_SAFE_INTEGER ? "Never" : new Date(status.expiresAt).toLocaleString() : "-";
    console.log(
      `| ${status.provider.padEnd(9)} | ${icon} ${statusText.padEnd(10)} | ${typeText.padEnd(9)} | ${expiresText.padEnd(19)} |`
    );
  }
  console.log("+-----------+----------------+-----------+---------------------+");
}

// src/cli/commands/models.ts
import { Command as Command2 } from "commander";

// src/shared/errors.ts
var SuperCoinError = class extends Error {
  code;
  details;
  constructor(message, code, details) {
    super(message);
    this.name = "SuperCoinError";
    this.code = code;
    this.details = details;
  }
};
var NetworkError = class extends SuperCoinError {
  constructor(message, url) {
    super(message, "NETWORK_ERROR", { url });
    this.name = "NetworkError";
  }
};

// src/services/models/providers/anthropic.ts
var AnthropicProvider = class {
  name = "anthropic";
  baseUrl = "https://api.anthropic.com/v1";
  models = [
    {
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 15, output: 75 }
    },
    {
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 3, output: 15 }
    },
    {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 0.8, output: 4 }
    },
    {
      id: "claude-sonnet-4",
      name: "Claude Sonnet 4",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 3, output: 15 }
    },
    {
      id: "claude-haiku-3-5",
      name: "Claude Haiku 3.5",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 0.8, output: 4 }
    }
  ];
  isValidModel(model) {
    return this.models.some((m) => m.id === model);
  }
  listModels() {
    return this.models;
  }
  getModelInfo(model) {
    return this.models.find((m) => m.id === model) || null;
  }
  async complete(request, config, token) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": token,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: this.convertMessages(request.messages),
        tools: request.tools ? this.convertTools(request.tools) : void 0
      })
    });
    if (!response.ok) {
      const error = await response.json();
      const message = error.error?.message || response.statusText;
      logger_default.error(`Anthropic API request failed`, new Error(message));
      throw new NetworkError(`Anthropic API error: ${message}`, "https://api.anthropic.com");
    }
    const data = await response.json();
    return this.convertResponse(data, config.model);
  }
  convertMessages(messages) {
    return messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.content
    }));
  }
  convertTools(tools) {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));
  }
  convertResponse(data, model) {
    const textContent = data.content.find((c) => c.type === "text");
    const toolUseContent = data.content.filter((c) => c.type === "tool_use");
    return {
      content: textContent?.text || "",
      toolCalls: toolUseContent.map((t) => ({
        id: t.id || "",
        name: t.name || "",
        arguments: t.input || {}
      })),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model,
      finishReason: data.stop_reason === "end_turn" ? "stop" : "tool_calls"
    };
  }
};

// src/services/models/providers/openai.ts
var OpenAIProvider = class {
  name = "openai";
  baseUrl = "https://api.openai.com/v1";
  models = [
    {
      id: "gpt-5.2",
      name: "GPT-5.2",
      contextWindow: 2e5,
      capabilities: ["chat", "vision", "function_calling", "reasoning"],
      pricing: { input: 5, output: 15 }
    },
    {
      id: "o3",
      name: "o3",
      contextWindow: 2e5,
      capabilities: ["chat", "reasoning"],
      pricing: { input: 15, output: 60 }
    },
    {
      id: "o1",
      name: "o1",
      contextWindow: 128e3,
      capabilities: ["chat", "reasoning"],
      pricing: { input: 15, output: 60 }
    },
    {
      id: "o1-mini",
      name: "o1-mini",
      contextWindow: 128e3,
      capabilities: ["chat", "reasoning", "coding"],
      pricing: { input: 3, output: 12 }
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      contextWindow: 128e3,
      capabilities: ["chat", "vision", "function_calling"],
      pricing: { input: 2.5, output: 10 }
    }
  ];
  isValidModel(model) {
    return this.models.some((m) => m.id === model);
  }
  listModels() {
    return this.models;
  }
  getModelInfo(model) {
    return this.models.find((m) => m.id === model) || null;
  }
  async complete(request, config, token) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: this.convertMessages(request.messages, request.systemPrompt),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        tools: request.tools ? this.convertTools(request.tools) : void 0
      })
    });
    if (!response.ok) {
      const error = await response.json();
      const message = error.error?.message || response.statusText;
      logger_default.error(`OpenAI API request failed`, new Error(message));
      throw new NetworkError(`OpenAI API error: ${message}`, "https://api.openai.com");
    }
    const data = await response.json();
    return this.convertResponse(data, config.model);
  }
  convertMessages(messages, systemPrompt) {
    const converted = [];
    if (systemPrompt) {
      converted.push({ role: "system", content: systemPrompt });
    }
    for (const m of messages) {
      converted.push({ role: m.role, content: m.content });
    }
    return converted;
  }
  convertTools(tools) {
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }
  convertResponse(data, model) {
    const choice = data.choices[0];
    const message = choice.message;
    return {
      content: message.content || "",
      toolCalls: message.tool_calls?.map((t) => ({
        id: t.id,
        name: t.function.name,
        arguments: JSON.parse(t.function.arguments)
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model,
      finishReason: choice.finish_reason === "stop" ? "stop" : "tool_calls"
    };
  }
};

// src/services/models/providers/google.ts
var GoogleProvider = class {
  name = "google";
  baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  models = [
    {
      id: "gemini-3-pro",
      name: "Gemini 3 Pro",
      contextWindow: 2e6,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 1.25, output: 5 }
    },
    {
      id: "gemini-3-flash",
      name: "Gemini 3 Flash",
      contextWindow: 1e6,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 0.075, output: 0.3 }
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      contextWindow: 1e6,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 0.075, output: 0.3 }
    },
    {
      id: "gemini-2.0-pro",
      name: "Gemini 2.0 Pro",
      contextWindow: 1e6,
      capabilities: ["chat", "vision", "function_calling", "long_context"],
      pricing: { input: 1.25, output: 5 }
    }
  ];
  isValidModel(model) {
    return this.models.some((m) => m.id === model);
  }
  listModels() {
    return this.models;
  }
  getModelInfo(model) {
    return this.models.find((m) => m.id === model) || null;
  }
  async complete(request, config, token) {
    const modelPath = `models/${config.model}`;
    const url = `${this.baseUrl}/${modelPath}:generateContent?key=${token}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: this.convertMessages(request.messages),
        systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : void 0,
        generationConfig: {
          maxOutputTokens: config.maxTokens || 8192,
          temperature: config.temperature ?? 0.7
        },
        tools: request.tools ? this.convertTools(request.tools) : void 0
      })
    });
    if (!response.ok) {
      const error = await response.json();
      const message = error.error?.message || response.statusText;
      logger_default.error(`Google AI API request failed`, new Error(message));
      throw new NetworkError(`Google AI API error: ${message}`, "https://generativelanguage.googleapis.com");
    }
    const data = await response.json();
    return this.convertResponse(data, config.model);
  }
  convertMessages(messages) {
    return messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
  }
  convertTools(tools) {
    return [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ];
  }
  convertResponse(data, model) {
    const candidate = data.candidates[0];
    const content = candidate.content;
    const textPart = content.parts.find((p) => p.text);
    const functionCalls = content.parts.filter((p) => p.functionCall);
    return {
      content: textPart?.text || "",
      toolCalls: functionCalls.map((fc) => ({
        id: crypto.randomUUID(),
        name: fc.functionCall.name,
        arguments: fc.functionCall.args
      })),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model,
      finishReason: candidate.finishReason === "STOP" ? "stop" : candidate.finishReason === "FUNCTION_CALL" ? "tool_calls" : "stop"
    };
  }
};

// src/services/models/router.ts
var ModelRouter = class {
  providers;
  currentModel;
  fallbackChain;
  modelAliases;
  constructor(config) {
    this.providers = /* @__PURE__ */ new Map([
      ["anthropic", new AnthropicProvider()],
      ["openai", new OpenAIProvider()],
      ["google", new GoogleProvider()]
    ]);
    this.fallbackChain = config.fallbackModels || [];
    this.currentModel = this.parseModelId(config.defaultModel);
    this.modelAliases = this.buildAliasMap();
  }
  async route(request, options) {
    const authHub = getAuthHub();
    const modelConfig = this.currentModel;
    const provider = this.providers.get(modelConfig.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }
    const authName = this.mapProviderToAuth(modelConfig.provider);
    const isAuthenticated = await authHub.isAuthenticated(authName);
    if (!isAuthenticated) {
      throw new Error(
        `Not authenticated with ${modelConfig.provider}. Run: supercoin auth login --${authName}`
      );
    }
    const token = await authHub.getToken(authName);
    if (!token) {
      throw new Error(`No token available for ${modelConfig.provider}`);
    }
    try {
      return await this.executeWithRetry(
        () => provider.complete(request, modelConfig, token),
        options?.retries || 3,
        options?.timeout || 6e4
      );
    } catch (error) {
      if (options?.fallback !== false && this.shouldFallback(error)) {
        return await this.fallbackRoute(request, options);
      }
      throw error;
    }
  }
  async setModel(modelId) {
    const authHub = getAuthHub();
    const resolvedId = this.resolveAlias(modelId);
    const modelConfig = this.parseModelId(resolvedId);
    const provider = this.providers.get(modelConfig.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }
    const isValidModel = provider.isValidModel(modelConfig.model);
    if (!isValidModel) {
      const models = provider.listModels().map((m) => m.id);
      throw new Error(
        `Unknown model: ${modelConfig.model}. Available models for ${modelConfig.provider}: ${models.join(", ")}`
      );
    }
    const authName = this.mapProviderToAuth(modelConfig.provider);
    const isAuthenticated = await authHub.isAuthenticated(authName);
    if (!isAuthenticated) {
      throw new Error(
        `Not authenticated with ${modelConfig.provider}. Run: supercoin auth login --${authName}`
      );
    }
    this.currentModel = modelConfig;
  }
  getCurrentModel() {
    return { ...this.currentModel };
  }
  listModels() {
    const models = [];
    for (const [providerName, provider] of this.providers) {
      for (const model of provider.listModels()) {
        models.push({
          ...model,
          id: `${providerName}/${model.id}`,
          provider: providerName
        });
      }
    }
    return models;
  }
  getModelInfo(modelId) {
    try {
      const resolvedId = this.resolveAlias(modelId);
      const parsed = this.tryParseModelId(resolvedId);
      if (!parsed) return null;
      const { provider: providerName, model } = parsed;
      const provider = this.providers.get(providerName);
      if (!provider) return null;
      const modelInfo = provider.getModelInfo(model);
      if (!modelInfo) return null;
      return {
        ...modelInfo,
        id: `${providerName}/${model}`,
        provider: providerName
      };
    } catch {
      return null;
    }
  }
  tryParseModelId(modelId) {
    const parts = modelId.split("/");
    if (parts.length !== 2) {
      return null;
    }
    return { provider: parts[0], model: parts[1] };
  }
  async fallbackRoute(request, options) {
    const authHub = getAuthHub();
    for (const modelId of this.fallbackChain) {
      const modelConfig = this.parseModelId(modelId);
      const provider = this.providers.get(modelConfig.provider);
      if (!provider) continue;
      const authName = this.mapProviderToAuth(modelConfig.provider);
      const isAuthenticated = await authHub.isAuthenticated(authName);
      if (!isAuthenticated) continue;
      try {
        const token = await authHub.getToken(authName);
        if (!token) continue;
        logger_default.info(`Falling back to ${modelId}...`);
        return await provider.complete(request, modelConfig, token);
      } catch {
        continue;
      }
    }
    throw new Error("All fallback models failed");
  }
  parseModelId(modelId) {
    const parts = modelId.split("/");
    if (parts.length !== 2) {
      throw new Error(`Invalid model ID format: ${modelId}. Expected: provider/model`);
    }
    return { provider: parts[0], model: parts[1] };
  }
  resolveAlias(modelId) {
    if (this.modelAliases.has(modelId)) {
      return this.modelAliases.get(modelId);
    }
    return modelId;
  }
  buildAliasMap() {
    return /* @__PURE__ */ new Map([
      ["claude-opus", "anthropic/claude-opus-4-5"],
      ["opus", "anthropic/claude-opus-4-5"],
      ["claude-sonnet", "anthropic/claude-sonnet-4-5"],
      ["sonnet", "anthropic/claude-sonnet-4-5"],
      ["claude-haiku", "anthropic/claude-haiku-4-5"],
      ["haiku", "anthropic/claude-haiku-4-5"],
      ["claude", "anthropic/claude-sonnet-4-5"],
      ["gpt-5.2", "openai/gpt-5.2"],
      ["gpt-5", "openai/gpt-5.2"],
      ["gpt-4o", "openai/gpt-4o"],
      ["4o", "openai/gpt-4o"],
      ["gpt", "openai/gpt-5.2"],
      ["o1", "openai/o1"],
      ["o1-mini", "openai/o1-mini"],
      ["o3", "openai/o3"],
      ["gemini-flash", "google/gemini-3-flash"],
      ["flash", "google/gemini-3-flash"],
      ["gemini-pro", "google/gemini-3-pro"],
      ["gemini", "google/gemini-3-flash"]
    ]);
  }
  mapProviderToAuth(provider) {
    const map = {
      anthropic: "claude",
      openai: "codex",
      google: "gemini"
    };
    return map[provider];
  }
  shouldFallback(error) {
    const fallbackErrors = [
      "rate_limit_exceeded",
      "model_overloaded",
      "server_error",
      "timeout"
    ];
    return fallbackErrors.some((e) => error.message?.includes(e));
  }
  async executeWithRetry(fn, retries, timeout) {
    let lastError = new Error("Unknown error");
    for (let i = 0; i < retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)
          )
        ]);
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 1e3);
        }
      }
    }
    throw lastError;
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var routerInstance = null;
function getModelRouter(config) {
  if (!routerInstance || config) {
    const defaultConfig = config || {
      defaultModel: "anthropic/claude-sonnet-4-5",
      fallbackModels: ["openai/gpt-5.2", "google/gemini-3-flash"]
    };
    routerInstance = new ModelRouter(defaultConfig);
  }
  return routerInstance;
}

// src/cli/commands/models.ts
function formatContextWindow(tokens) {
  if (tokens >= 1e6) {
    return `${tokens / 1e6}M`;
  }
  return `${tokens / 1e3}K`;
}
function createModelsCommand(config) {
  const models = new Command2("models").description("Manage AI models");
  models.command("list").description("List all available models").option("--provider <provider>", "Filter by provider").option("--json", "Output as JSON").action(async (options) => {
    const router = getModelRouter({
      defaultModel: config.default_model,
      fallbackModels: config.fallback_models
    });
    let modelList = router.listModels();
    if (options.provider) {
      modelList = modelList.filter((m) => m.provider === options.provider);
    }
    if (options.json) {
      console.log(JSON.stringify(modelList, null, 2));
      return;
    }
    console.log("\nAvailable Models:\n");
    console.log("+----------------------------------+-----------+-------------+--------------+");
    console.log("| Model ID                         | Provider  | Context     | Input Cost   |");
    console.log("+----------------------------------+-----------+-------------+--------------+");
    for (const model of modelList) {
      const id = model.id.padEnd(32);
      const provider = model.provider.padEnd(9);
      const context = formatContextWindow(model.contextWindow).padEnd(11);
      const cost = `$${model.pricing.input.toFixed(2)}/M`.padEnd(12);
      console.log(`| ${id} | ${provider} | ${context} | ${cost} |`);
    }
    console.log("+----------------------------------+-----------+-------------+--------------+");
  });
  models.command("info <modelId>").description("Get detailed information about a model").action(async (modelId) => {
    const router = getModelRouter({
      defaultModel: config.default_model,
      fallbackModels: config.fallback_models
    });
    const model = router.getModelInfo(modelId);
    if (!model) {
      console.error(`Model not found: ${modelId}`);
      console.log("\nAvailable models:");
      router.listModels().forEach((m) => console.log(`  - ${m.id}`));
      process.exit(1);
    }
    console.log(`
Model: ${model.name}`);
    console.log(`ID: ${model.id}`);
    console.log(`Provider: ${model.provider}`);
    console.log(`Context Window: ${formatContextWindow(model.contextWindow)}`);
    console.log(`Capabilities: ${model.capabilities.join(", ")}`);
    console.log(`Pricing:`);
    console.log(`  Input: $${model.pricing.input.toFixed(2)} per 1M tokens`);
    console.log(`  Output: $${model.pricing.output.toFixed(2)} per 1M tokens`);
  });
  models.command("set-default <modelId>").description("Set the default model").action(async (modelId) => {
    const router = getModelRouter({
      defaultModel: config.default_model,
      fallbackModels: config.fallback_models
    });
    try {
      await router.setModel(modelId);
      const current = router.getCurrentModel();
      console.log(`Default model set to: ${current.provider}/${current.model}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });
  models.command("current").description("Show the current default model").action(() => {
    const router = getModelRouter({
      defaultModel: config.default_model,
      fallbackModels: config.fallback_models
    });
    const current = router.getCurrentModel();
    console.log(`Current model: ${current.provider}/${current.model}`);
  });
  return models;
}

// src/cli/commands/server.ts
import { Command as Command3 } from "commander";
function createServerCommand(config) {
  const server = new Command3("server").description("Manage local authentication server");
  server.command("start").description("Start the local server").option("--port <number>", "Port number", parseInt).option("--host <host>", "Host address").option("--foreground", "Run in foreground").action(async (options) => {
    const port = options.port || config.server?.port || 3100;
    const host = options.host || config.server?.host || "127.0.0.1";
    if (isServerRunning()) {
      const status = getServerStatus();
      logger_default.info(`Server already running at http://${status.host}:${status.port}`);
      return;
    }
    try {
      const status = await startServer({ port, host });
      logger_default.success(`Server started at http://${status.host}:${status.port}`);
      if (options.foreground) {
        logger_default.info("Running in foreground mode. Press Ctrl+C to stop.");
        await new Promise(() => {
        });
      } else {
        logger_default.info("Server running in background");
      }
    } catch (error) {
      logger_default.error("Failed to start server", error);
      process.exit(1);
    }
  });
  server.command("stop").description("Stop the local server").action(async () => {
    if (!isServerRunning()) {
      logger_default.info("Server is not running");
      return;
    }
    try {
      await stopServer();
      logger_default.success("Server stopped");
    } catch (error) {
      logger_default.error("Failed to stop server", error);
      process.exit(1);
    }
  });
  server.command("status").description("Show server status").action(async () => {
    const status = getServerStatus();
    console.log("\nServer Status:");
    if (status.running) {
      console.log(`  Status: Running`);
      console.log(`  Address: http://${status.host}:${status.port}`);
      console.log(`  PID: ${status.pid}`);
      console.log(`  Uptime: ${formatUptime(status.uptime || 0)}`);
    } else {
      console.log(`  Status: Not running`);
      const port = config.server?.port || 3100;
      const host = config.server?.host || "127.0.0.1";
      console.log(`  Configured: http://${host}:${port}`);
    }
    console.log();
  });
  server.command("logs").description("Show server logs").option("-f, --follow", "Follow log output").option("-n, --lines <number>", "Number of lines", parseInt).action(async (_options) => {
    logger_default.info("Server logs are printed to stdout when running in foreground mode");
  });
  server.command("config").description("Manage server configuration").argument("<action>", "Action: get, set, list").argument("[key]", "Configuration key").argument("[value]", "Configuration value").action(async (action, key, value) => {
    switch (action) {
      case "list":
        console.log("\nServer Configuration:");
        console.log(`  port: ${config.server?.port || 3100}`);
        console.log(`  host: ${config.server?.host || "127.0.0.1"}`);
        console.log(`  autoStart: ${config.server?.autoStart ?? true}`);
        break;
      case "get":
        if (!key) {
          console.error("Key is required for 'get' action");
          process.exit(1);
        }
        const serverConfig = config.server || {};
        console.log(serverConfig[key] ?? "undefined");
        break;
      case "set":
        if (!key || !value) {
          console.error("Key and value are required for 'set' action");
          process.exit(1);
        }
        logger_default.info(`Would set server.${key} = ${value}`);
        logger_default.warn("Config persistence requires editing ~/.supercoin/config.json");
        break;
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  });
  return server;
}
function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours}h ${minutes}m`;
}

// src/cli/commands/config.ts
import { Command as Command4 } from "commander";
function createConfigCommand(config) {
  const configCmd = new Command4("config").description("Manage configuration");
  configCmd.command("get <key>").description("Get a configuration value").action(async (key) => {
    const value = getNestedValue(config, key);
    if (value === void 0) {
      console.log("undefined");
    } else {
      console.log(typeof value === "object" ? JSON.stringify(value, null, 2) : value);
    }
  });
  configCmd.command("set <key> <value>").description("Set a configuration value").action(async (key, value) => {
    logger_default.info(`Would set ${key} = ${value}`);
    logger_default.warn("Config persistence will be implemented in a future phase.");
  });
  configCmd.command("list").description("List all configuration").option("--json", "Output as JSON").action(async (options) => {
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    console.log("\nConfiguration:\n");
    printConfig(config);
  });
  configCmd.command("reset").description("Reset configuration to defaults").option("--confirm", "Confirm reset").action(async (options) => {
    if (!options.confirm) {
      logger_default.warn("Use --confirm to reset configuration");
      return;
    }
    logger_default.info("Configuration reset to defaults");
    logger_default.warn("Config persistence will be implemented in a future phase.");
  });
  configCmd.command("path").description("Show configuration file paths").action(async () => {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    console.log("\nConfiguration file paths (in priority order):\n");
    console.log(`  1. User:    ${home}/.config/supercoin/config.json`);
    console.log(`  2. Project: .supercoin/config.json`);
  });
  return configCmd;
}
function getNestedValue(obj, path5) {
  const keys = path5.split(".");
  let value = obj;
  for (const key of keys) {
    if (value === null || value === void 0 || typeof value !== "object") {
      return void 0;
    }
    value = value[key];
  }
  return value;
}
function printConfig(obj, indent = 0) {
  const prefix = "  ".repeat(indent);
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === void 0) {
      console.log(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      console.log(`${prefix}${key}:`);
      value.forEach((item) => {
        console.log(`${prefix}  - ${typeof item === "object" ? JSON.stringify(item) : item}`);
      });
    } else if (typeof value === "object") {
      console.log(`${prefix}${key}:`);
      printConfig(value, indent + 1);
    } else {
      console.log(`${prefix}${key}: ${value}`);
    }
  }
}

// src/cli/commands/doctor.ts
import { Command as Command5 } from "commander";
import { existsSync as existsSync4 } from "fs";
import path4 from "path";
function createDoctorCommand(config) {
  const doctor = new Command5("doctor").description("Run system diagnostics").option("--json", "Output as JSON").action(async (options) => {
    const results = [];
    console.log("\nSuperCoin Health Check");
    console.log("======================\n");
    console.log("[Environment]");
    results.push(await checkBunVersion());
    results.push(await checkNodeVersion());
    results.push(await checkOS());
    console.log("\n[Authentication]");
    results.push(await checkAuth("claude", "ANTHROPIC_API_KEY"));
    results.push(await checkAuth("codex", "OPENAI_API_KEY"));
    results.push(await checkAuth("gemini", "GOOGLE_API_KEY"));
    console.log("\n[Server]");
    results.push(await checkServerConfig(config));
    console.log("\n[Ollama]");
    results.push(await checkOllamaStatus());
    console.log("\n[Configuration]");
    results.push(await checkConfigFile());
    console.log("\n---");
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const warned = results.filter((r) => r.status === "warn").length;
    if (failed === 0) {
      console.log(
        `
All checks passed! (${passed} passed, ${warned} warnings)`
      );
    } else {
      console.log(
        `
${failed} checks failed, ${warned} warnings, ${passed} passed`
      );
    }
    if (options.json) {
      console.log("\n" + JSON.stringify(results, null, 2));
    }
  });
  return doctor;
}
async function checkBunVersion() {
  if (typeof Bun !== "undefined") {
    const version = Bun.version;
    console.log(`  Bun version: v${version}`);
    return {
      name: "bun_version",
      status: "pass",
      message: `v${version}`
    };
  }
  console.log("  Bun version: Not active (Node.js runtime)");
  return {
    name: "bun_version",
    status: "warn",
    message: "Not active"
  };
}
async function checkNodeVersion() {
  const version = process.version;
  console.log(`  Node version: ${version}`);
  return {
    name: "node_version",
    status: "pass",
    message: version
  };
}
async function checkOS() {
  const os = process.platform;
  const arch = process.arch;
  console.log(`  OS: ${os} (${arch})`);
  return {
    name: "os",
    status: "pass",
    message: `${os} (${arch})`
  };
}
async function checkAuth(provider, envVar) {
  const hasEnv = !!process.env[envVar];
  if (!hasEnv) {
  }
  const status = hasEnv ? "pass" : "warn";
  const icon = hasEnv ? "[OK]" : "[--]";
  const message = hasEnv ? "Environment variable set" : "Not configured via Env";
  console.log(`  ${provider.padEnd(8)}: ${icon} ${message}`);
  return {
    name: `auth_${provider}`,
    status,
    message
  };
}
async function checkOllamaStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2e3);
    const response = await fetch("http://localhost:11434/api/version", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      console.log(`  Status    : [OK] Running v${data.version}`);
      return {
        name: "ollama_status",
        status: "pass",
        message: `Running v${data.version}`
      };
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    console.log(
      `  Status    : [!!] Not running or unreachable (${error.message})`
    );
    return {
      name: "ollama_status",
      status: "fail",
      // Fail is appropriate here as it's a critical local dependency
      message: "Not running"
    };
  }
}
async function checkServerConfig(config) {
  const port = config.server?.port || 3100;
  const host = config.server?.host || "127.0.0.1";
  const url = `http://${host}:${port}/health`;
  console.log(`  Server config: http://${host}:${port}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e3);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`  Server status: [OK] Running`);
    return {
      name: "server_status",
      status: "pass",
      message: "Running"
    };
  } catch {
    console.log(`  Server status: [--] Not running`);
    return {
      name: "server_status",
      status: "warn",
      // Warn because it's not strictly required for CLI usage
      message: "Not running"
    };
  }
}
async function checkConfigFile() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const userConfig = path4.join(home, ".config", "supercoin", "config.json");
  const projectConfig = path4.join(process.cwd(), ".supercoin", "config.json");
  const hasUserConfig = existsSync4(userConfig);
  const hasProjectConfig = existsSync4(projectConfig);
  if (hasUserConfig) {
    console.log(`  User config: Found at ${userConfig}`);
  } else {
    console.log(`  User config: Not found`);
  }
  if (hasProjectConfig) {
    console.log(`  Project config: Found at ${projectConfig}`);
  } else {
    console.log(`  Project config: Not found`);
  }
  return {
    name: "config_files",
    status: hasUserConfig || hasProjectConfig ? "pass" : "warn",
    message: hasUserConfig || hasProjectConfig ? "Config found" : "Using defaults"
  };
}

// src/cli/commands/dashboard.ts
import { Command as Command6 } from "commander";
import * as clack5 from "@clack/prompts";

// src/services/agents/todo-manager.ts
var TodoManager = class {
  todos = /* @__PURE__ */ new Map();
  async create(input) {
    const todo = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      content: input.content,
      status: "pending",
      priority: input.priority || "medium",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.todos.set(todo.id, todo);
    return todo;
  }
  async updateStatus(id, status) {
    const todo = this.todos.get(id);
    if (todo) {
      todo.status = status;
      todo.updatedAt = /* @__PURE__ */ new Date();
    }
  }
  get(id) {
    return this.todos.get(id);
  }
  list(sessionId) {
    const allTodos = Array.from(this.todos.values());
    if (sessionId) {
      return allTodos.filter((t) => t.sessionId === sessionId);
    }
    return allTodos;
  }
  listPending(sessionId) {
    return this.list(sessionId).filter((t) => t.status === "pending" || t.status === "in_progress");
  }
  hasPending(sessionId) {
    return this.listPending(sessionId).length > 0;
  }
  clear(sessionId) {
    if (sessionId) {
      const toDelete = this.list(sessionId).map((t) => t.id);
      for (const id of toDelete) {
        this.todos.delete(id);
      }
    } else {
      this.todos.clear();
    }
  }
  setTodos(sessionId, todos) {
    this.clear(sessionId);
    for (const todo of todos) {
      this.todos.set(todo.id, { ...todo, sessionId });
    }
  }
};
var todoManagerInstance = null;
function getTodoManager() {
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
  }
  return todoManagerInstance;
}

// src/core/session.ts
var SessionManager = class {
  sessions = /* @__PURE__ */ new Map();
  currentSessionId = null;
  create(workdir, model) {
    const session = {
      id: crypto.randomUUID(),
      startedAt: /* @__PURE__ */ new Date(),
      workdir,
      model,
      messages: []
    };
    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    return session;
  }
  get(id) {
    return this.sessions.get(id);
  }
  getCurrent() {
    if (!this.currentSessionId) return void 0;
    return this.sessions.get(this.currentSessionId);
  }
  setCurrent(id) {
    if (!this.sessions.has(id)) return false;
    this.currentSessionId = id;
    return true;
  }
  addMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({
        ...message,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
  }
  getMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }
  end(id) {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }
    this.sessions.delete(id);
    return true;
  }
  list() {
    return Array.from(this.sessions.values());
  }
  clear() {
    this.sessions.clear();
    this.currentSessionId = null;
  }
};
var sessionManagerInstance = null;
function getSessionManager() {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

// src/cli/commands/dashboard.ts
function createDashboardCommand(config) {
  const dashboard = new Command6("dashboard").description("Show agent status dashboard").option("--json", "Output as JSON").action(async function() {
    const options = this.optsWithGlobals();
    if (options.json) {
      const todoManager = getTodoManager();
      const todos = todoManager.list();
      console.log(JSON.stringify({ todos }, null, 2));
      return;
    }
    await runDashboard();
  });
  return dashboard;
}
async function runDashboard() {
  const currentSession = getSessionManager().getCurrent();
  const todoManager = getTodoManager();
  clack5.intro("\u{1F4CA} SuperCoin Agent Dashboard");
  console.log();
  const todos = todoManager.list();
  const pending = todoManager.listPending();
  clack5.note(`Todo Progress (${pending.length} pending)`, "Summary");
  if (pending.length === 0) {
    console.log("  \u2705 No pending tasks");
  } else {
    pending.forEach((todo) => {
      const statusIcon = todo.status === "in_progress" ? "\u{1F504}" : "\u25CB";
      const priorityBadge = todo.priority === "high" ? "\u{1F534}" : todo.priority === "medium" ? "\u{1F7E1}" : "\u{1F7E2}";
      console.log(`  ${statusIcon} ${priorityBadge} ${todo.content}`);
    });
  }
  console.log();
  const action = await clack5.select({
    message: "What would you like to do?",
    options: [
      { value: "refresh", label: "\u{1F504} Refresh" },
      { value: "exit", label: "\u270B Exit" }
    ]
  });
  if (clack5.isCancel(action)) {
    clack5.cancel("Operation cancelled");
    return;
  }
  if (action === "refresh") {
    await runDashboard();
  }
}

// src/config/opencode.ts
import { z as z2 } from "zod";
import { readFile as readFile2 } from "fs/promises";
import { join } from "path";
var OpenCodeConfigSchema = z2.object({
  provider: z2.enum(["anthropic", "openai", "google", "ollama", "lmstudio", "llamacpp"]).default("ollama"),
  model: z2.string().optional(),
  baseURL: z2.string().optional(),
  temperature: z2.number().min(0).max(2).default(0.7),
  maxTokens: z2.number().default(4096),
  streaming: z2.boolean().default(true)
});
var CONFIG_FILENAMES = ["opencode.json", ".opencode.json", "supercoin.json"];
async function loadOpenCodeConfig(cwd = process.cwd()) {
  for (const filename of CONFIG_FILENAMES) {
    try {
      const configPath = join(cwd, filename);
      const content = await readFile2(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return OpenCodeConfigSchema.parse(parsed);
    } catch {
      continue;
    }
  }
  return OpenCodeConfigSchema.parse({});
}
function getDefaultModel(provider) {
  const defaults = {
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
    ollama: "llama3.2",
    lmstudio: "local-model",
    llamacpp: "local-model"
  };
  return defaults[provider];
}
async function resolveProviderFromConfig(cwd, mode = "normal") {
  const config = await loadOpenCodeConfig(cwd);
  const provider = config.provider;
  let model = config.model || getDefaultModel(provider);
  let temperature = config.temperature;
  let maxTokens = config.maxTokens;
  if (mode === "ultrawork") {
    if (provider === "anthropic") model = "claude-3-5-sonnet-latest";
    if (provider === "openai") model = "gpt-4o";
    if (provider === "google") model = "gemini-2.0-flash-exp";
    temperature = 0.2;
    maxTokens = 8192;
  }
  return {
    provider,
    model,
    baseURL: config.baseURL,
    temperature,
    maxTokens
  };
}

// src/services/models/ai-sdk/registry.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
var PROVIDER_REGISTRY = {
  anthropic: {
    name: "Claude (Anthropic)",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "claude-sonnet-4-5"
  },
  openai: {
    name: "OpenAI",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "gpt-4o"
  },
  google: {
    name: "Gemini (Google)",
    requiresAuth: true,
    supportsStreaming: true,
    defaultModel: "gemini-2.0-flash"
  },
  ollama: {
    name: "Ollama (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:11434/v1",
    defaultModel: "llama3.2"
  },
  lmstudio: {
    name: "LM Studio (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:1234/v1",
    defaultModel: "local-model"
  },
  llamacpp: {
    name: "llama.cpp (Localhost)",
    requiresAuth: false,
    supportsStreaming: true,
    defaultBaseURL: "http://localhost:8080/v1",
    defaultModel: "local-model"
  }
};
function getProviderConfig(provider) {
  const config = PROVIDER_REGISTRY[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return config;
}
function isLocalhostProvider(provider) {
  return provider === "ollama" || provider === "lmstudio" || provider === "llamacpp";
}
function createModel(config) {
  const providerConfig = getProviderConfig(config.provider);
  const model = config.model || providerConfig.defaultModel;
  let languageModel;
  switch (config.provider) {
    case "anthropic": {
      if (!config.apiKey) {
        throw new Error("API key required for Anthropic");
      }
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      languageModel = anthropic(model);
      break;
    }
    case "google": {
      if (!config.apiKey) {
        throw new Error("API key required for Google");
      }
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      languageModel = google(model);
      break;
    }
    case "openai": {
      if (!config.apiKey) {
        throw new Error("API key required for OpenAI");
      }
      const openai = createOpenAI({ apiKey: config.apiKey });
      languageModel = openai(model);
      break;
    }
    case "ollama": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const ollama = createOpenAI({ baseURL, apiKey: "ollama" });
      languageModel = ollama.chat(model);
      break;
    }
    case "lmstudio": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const lmstudio = createOpenAI({ baseURL, apiKey: "lm-studio" });
      languageModel = lmstudio.chat(model);
      break;
    }
    case "llamacpp": {
      const baseURL = config.baseURL || providerConfig.defaultBaseURL;
      const llamacpp = createOpenAI({ baseURL, apiKey: "llamacpp" });
      languageModel = llamacpp.chat(model);
      break;
    }
    default: {
      const _exhaustive = config.provider;
      throw new Error(`Unhandled provider: ${_exhaustive}`);
    }
  }
  return {
    model: languageModel,
    config: providerConfig
  };
}

// src/services/models/ai-sdk/stream.ts
import { streamText } from "ai";
var AUTH_PROVIDER_MAP = {
  anthropic: "claude",
  openai: "codex",
  google: "gemini",
  ollama: null,
  lmstudio: null,
  llamacpp: null
};
function mapToAuthProvider(provider) {
  return AUTH_PROVIDER_MAP[provider];
}
async function getApiKey(provider, accountId) {
  if (isLocalhostProvider(provider)) {
    return void 0;
  }
  const authProvider = mapToAuthProvider(provider);
  if (!authProvider) {
    return void 0;
  }
  const tokenStore = new TokenStore();
  const token = await tokenStore.retrieve(authProvider, accountId);
  if (!token) {
    throw new Error(
      `No authentication found for ${provider}. Run: supercoin auth login ${authProvider}`
    );
  }
  return token.accessToken;
}
function convertMessages(messages, systemPrompt) {
  const result = [];
  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }
  for (const msg of messages) {
    result.push({
      role: msg.role,
      content: msg.content
    });
  }
  return result;
}
function mapFinishReason(reason) {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool-calls":
      return "tool-calls";
    case "error":
      return "error";
    default:
      return "other";
  }
}
async function streamAIResponse(options) {
  const {
    provider,
    model,
    messages,
    systemPrompt,
    accountId,
    baseURL,
    temperature = 0.7,
    maxTokens = 4096,
    onChunk,
    onComplete,
    onError
  } = options;
  try {
    const providerConfig = getProviderConfig(provider);
    const apiKey = await getApiKey(provider, accountId);
    const { model: languageModel } = createModel({
      provider,
      model: model || providerConfig.defaultModel,
      apiKey,
      baseURL
    });
    const convertedMessages = convertMessages(messages, systemPrompt);
    const result = await streamText({
      model: languageModel,
      messages: convertedMessages,
      temperature,
      maxOutputTokens: maxTokens
    });
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
      onChunk?.(chunk);
    }
    onComplete?.(fullText);
    const usage = await result.usage;
    const finishReason = await result.finishReason;
    return {
      text: fullText,
      usage: usage ? {
        promptTokens: usage.promptTokens ?? 0,
        completionTokens: usage.completionTokens ?? 0,
        totalTokens: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0)
      } : void 0,
      finishReason: mapFinishReason(finishReason)
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}
async function checkLocalhostAvailability(provider, baseURL) {
  const config = getProviderConfig(provider);
  const url = baseURL || config.defaultBaseURL;
  if (!url) {
    return false;
  }
  try {
    const response = await fetch(`${url}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(3e3)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// src/cli/index.ts
var VERSION = "0.1.0";
async function runInteractiveMode() {
  clack6.intro("\u{1FA99} SuperCoin - Unified AI CLI Hub");
  const action = await clack6.select({
    message: "What would you like to do?",
    options: [
      { value: "chat", label: "\u{1F4AC} Start Chat", hint: "Chat with AI models" },
      { value: "auth", label: "\u{1F510} Authentication", hint: "Manage provider authentication" },
      { value: "models", label: "\u{1F916} Models", hint: "List and manage AI models" },
      { value: "config", label: "\u2699\uFE0F  Configuration", hint: "View and edit settings" },
      { value: "server", label: "\u{1F310} Server", hint: "Manage local auth server" },
      { value: "doctor", label: "\u{1FA7A} Doctor", hint: "Run system diagnostics" },
      { value: "dashboard", label: "\u{1F4CA} Dashboard", hint: "View agent status and progress" }
    ]
  });
  if (clack6.isCancel(action)) {
    clack6.cancel("Operation cancelled");
    process.exit(0);
  }
  switch (action) {
    case "chat":
      await runChatFlow();
      break;
    case "auth":
      await runAuthFlow();
      break;
    case "models":
      await runModelsFlow();
      break;
    case "config":
      await runConfigFlow();
      break;
    case "server":
      await runServerFlow();
      break;
    case "doctor":
      await runDoctorFlow();
      break;
    case "dashboard":
      await runDashboardFlow();
      break;
  }
  clack6.outro("\u2728 Done!");
}
async function runChatFlow() {
  const projectConfig = await resolveProviderFromConfig();
  const provider = await clack6.select({
    message: "Select AI provider",
    options: [
      { value: "ollama", label: "\u{1F999} Ollama (Local)", hint: "Privacy-first, cost-free" },
      { value: "lmstudio", label: "\u{1F4BB} LM Studio (Local)", hint: "Run models locally" },
      { value: "llamacpp", label: "\u{1F527} llama.cpp (Local)", hint: "Raw performance" },
      { value: "anthropic", label: "\u{1F916} Claude (Anthropic)", hint: "Requires API key" },
      { value: "openai", label: "\u26A1 Codex (OpenAI)", hint: "Requires API key" },
      { value: "google", label: "\u{1F52E} Gemini (Google)", hint: "Requires API key or OAuth" }
    ],
    initialValue: projectConfig.provider
  });
  if (clack6.isCancel(provider)) {
    clack6.cancel("Operation cancelled");
    return;
  }
  const isLocalhost = ["ollama", "lmstudio", "llamacpp"].includes(provider);
  if (isLocalhost) {
    const s2 = clack6.spinner();
    s2.start(`Checking ${provider} availability...`);
    const available = await checkLocalhostAvailability(
      provider,
      projectConfig.baseURL
    );
    if (!available) {
      s2.stop(`${provider} is not available`);
      clack6.log.error(`Please start ${provider} first.`);
      if (provider === "ollama") {
        clack6.log.info("Install: curl -fsSL https://ollama.com/install.sh | sh");
        clack6.log.info("Run: ollama pull llama3");
      }
      return;
    }
    s2.stop(`${provider} is ready`);
  }
  let model = projectConfig.model;
  const customizeModel = await clack6.confirm({
    message: "Customize model?",
    initialValue: false
  });
  if (clack6.isCancel(customizeModel)) {
    clack6.cancel("Operation cancelled");
    return;
  }
  if (customizeModel) {
    const modelInput = await clack6.text({
      message: "Model name",
      placeholder: model,
      defaultValue: model
    });
    if (clack6.isCancel(modelInput)) {
      clack6.cancel("Operation cancelled");
      return;
    }
    model = modelInput;
  }
  const prompt = await clack6.text({
    message: "Your prompt",
    placeholder: "Ask me anything...",
    validate: (value) => {
      if (!value) return "Prompt is required";
    }
  });
  if (clack6.isCancel(prompt)) {
    clack6.cancel("Operation cancelled");
    return;
  }
  const s = clack6.spinner();
  s.start(`${provider} (${model}) is thinking...`);
  console.log();
  try {
    const result = await streamAIResponse({
      provider,
      model,
      baseURL: projectConfig.baseURL,
      temperature: projectConfig.temperature,
      maxTokens: projectConfig.maxTokens,
      messages: [{ role: "user", content: prompt }],
      onChunk: (text2) => process.stdout.write(text2)
    });
    console.log("\n");
    s.stop("Complete");
    if (result.usage) {
      clack6.log.info(
        `Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`
      );
    }
  } catch (error) {
    s.stop("Failed");
    clack6.log.error(error.message);
  }
}
async function runAuthFlow() {
  const authAction = await clack6.select({
    message: "Authentication action",
    options: [
      { value: "status", label: "\u{1F4CA} Status", hint: "Check authentication status" },
      { value: "login", label: "\u{1F511} Login", hint: "Login to a provider" },
      { value: "logout", label: "\u{1F6AA} Logout", hint: "Logout from providers" },
      { value: "refresh", label: "\u{1F504} Refresh", hint: "Refresh OAuth tokens" }
    ]
  });
  if (clack6.isCancel(authAction)) {
    clack6.cancel("Operation cancelled");
    return;
  }
  clack6.log.info(`Run: supercoin auth ${authAction} --help`);
  clack6.note("Use command-line for auth operations", "Authentication");
}
async function runModelsFlow() {
  clack6.log.info("Run: supercoin models list");
  clack6.note("Use command-line for model operations", "Models");
}
async function runConfigFlow() {
  clack6.log.info("Run: supercoin config show");
  clack6.note("Use command-line for config operations", "Configuration");
}
async function runServerFlow() {
  clack6.log.info("Run: supercoin server start");
  clack6.note("Use command-line for server operations", "Server");
}
async function runDoctorFlow() {
  clack6.log.info("Run: supercoin doctor");
  clack6.note("Use command-line for diagnostics", "Doctor");
}
async function runDashboardFlow() {
  clack6.log.info("Run: supercoin dashboard");
  clack6.note("Use command-line for dashboard", "Dashboard");
}
async function main() {
  const program = new Command7();
  const config = await loadConfig();
  program.name("supercoin").description("Unified AI CLI hub for Claude, Codex, Gemini, and localhost models").version(VERSION).option("-p, --provider <name>", "AI provider (anthropic|openai|google|ollama|lmstudio|llamacpp)").option("-m, --model <id>", "AI model to use").option("-t, --temperature <number>", "Temperature setting", parseFloat).option("--max-tokens <number>", "Maximum tokens", parseInt).option("--base-url <url>", "Base URL for localhost providers").option("--no-tui", "Disable interactive UI").option("--json", "Output as JSON").option("-v, --verbose", "Verbose output").option("-q, --quiet", "Minimal output");
  program.addCommand(createAuthCommand(config));
  program.addCommand(createModelsCommand(config));
  program.addCommand(createServerCommand(config));
  program.addCommand(createConfigCommand(config));
  program.addCommand(createDoctorCommand(config));
  program.addCommand(createDashboardCommand(config));
  program.argument("[prompt...]", "Prompt for AI").action(async (promptParts, options) => {
    const prompt = promptParts.join(" ");
    if (!prompt && options.tui !== false) {
      await runInteractiveMode();
      return;
    }
    if (!prompt) {
      program.help();
      return;
    }
    try {
      const projectConfig = await resolveProviderFromConfig();
      const provider = options.provider || projectConfig.provider;
      const model = options.model || projectConfig.model;
      const temperature = options.temperature ?? projectConfig.temperature;
      const maxTokens = options.maxTokens ?? projectConfig.maxTokens;
      const baseURL = options.baseUrl || projectConfig.baseURL;
      const isLocalhost = ["ollama", "lmstudio", "llamacpp"].includes(provider);
      if (isLocalhost) {
        const available = await checkLocalhostAvailability(
          provider,
          baseURL
        );
        if (!available) {
          logger_default.error(`${provider} is not available. Make sure it's running.`);
          process.exit(1);
        }
      }
      if (!options.quiet) {
        logger_default.info(`Provider: ${provider} | Model: ${model}`);
      }
      const result = await streamAIResponse({
        provider,
        model,
        baseURL,
        temperature,
        maxTokens,
        messages: [{ role: "user", content: prompt }],
        onChunk: (text2) => process.stdout.write(text2)
      });
      console.log();
      if (options.verbose && result.usage) {
        logger_default.info(
          `Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`
        );
      }
    } catch (error) {
      logger_default.error("Chat failed", error);
      process.exit(1);
    }
  });
  await program.parseAsync(process.argv);
}
main().catch((error) => {
  logger_default.error("Fatal error", error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map

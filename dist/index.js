var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/shared/logger.ts
var DEBUG, logger, Log, logger_default;
var init_logger = __esm({
  "src/shared/logger.ts"() {
    "use strict";
    DEBUG = process.env.SUPERCOIN_DEBUG === "1" || process.env.DEBUG === "supercoin";
    logger = {
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
    Log = logger;
    logger_default = logger;
  }
});

// src/services/agents/todo-manager.ts
function getTodoManager() {
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
  }
  return todoManagerInstance;
}
var TodoManager, todoManagerInstance;
var init_todo_manager = __esm({
  "src/services/agents/todo-manager.ts"() {
    "use strict";
    TodoManager = class {
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
    todoManagerInstance = null;
  }
});

// src/core/hooks.ts
function getHookRegistry() {
  if (!hookRegistryInstance) {
    hookRegistryInstance = new HookRegistry();
  }
  return hookRegistryInstance;
}
var HookRegistry, hookRegistryInstance;
var init_hooks = __esm({
  "src/core/hooks.ts"() {
    "use strict";
    HookRegistry = class {
      hooks = /* @__PURE__ */ new Map();
      register(hook) {
        this.hooks.set(hook.name, hook);
      }
      unregister(name) {
        return this.hooks.delete(name);
      }
      get(name) {
        return this.hooks.get(name);
      }
      getForEvent(event) {
        return Array.from(this.hooks.values()).filter((hook) => hook.events.includes(event)).sort((a, b) => (b.priority || 0) - (a.priority || 0));
      }
      async trigger(event, context) {
        const hooks = this.getForEvent(event);
        for (const hook of hooks) {
          try {
            const result = await hook.handler(context);
            if (result && result.continue === false) {
              return result;
            }
          } catch (error) {
            console.error(`Hook ${hook.name} failed:`, error);
          }
        }
      }
      list() {
        return Array.from(this.hooks.values());
      }
    };
    hookRegistryInstance = null;
  }
});

// src/core/tools.ts
function getToolRegistry() {
  if (!toolRegistryInstance) {
    toolRegistryInstance = new ToolRegistry();
  }
  return toolRegistryInstance;
}
var ToolRegistry, toolRegistryInstance;
var init_tools = __esm({
  "src/core/tools.ts"() {
    "use strict";
    ToolRegistry = class {
      tools = /* @__PURE__ */ new Map();
      register(tool) {
        this.tools.set(tool.name, tool);
      }
      unregister(name) {
        return this.tools.delete(name);
      }
      get(name) {
        return this.tools.get(name);
      }
      async execute(name, args, context) {
        const tool = this.tools.get(name);
        if (!tool) {
          return { success: false, error: `Tool not found: ${name}` };
        }
        try {
          return await tool.execute(args, context);
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      list() {
        return Array.from(this.tools.values());
      }
      listNames() {
        return Array.from(this.tools.keys());
      }
    };
    toolRegistryInstance = null;
  }
});

// src/core/hooks/todo-continuation.ts
var todoContinuationHook;
var init_todo_continuation = __esm({
  "src/core/hooks/todo-continuation.ts"() {
    "use strict";
    init_todo_manager();
    todoContinuationHook = {
      name: "todo-continuation",
      events: ["session.idle"],
      priority: 10,
      async handler(context) {
        const todoManager = getTodoManager();
        if (todoManager.hasPending()) {
          const pending = todoManager.listPending();
          return {
            continue: true,
            prompt: `There are ${pending.length} pending tasks:
${pending.map((t) => `- ${t.content}`).join("\n")}

Please continue working on the next pending task.`
          };
        }
        return { continue: false };
      }
    };
  }
});

// src/core/hooks/logging.ts
var loggingHook;
var init_logging = __esm({
  "src/core/hooks/logging.ts"() {
    "use strict";
    init_logger();
    loggingHook = {
      name: "logging",
      events: ["request.before", "request.after", "error"],
      priority: 100,
      async handler(context) {
        switch (context.event) {
          case "request.before":
            logger_default.debug(`Request started in session ${context.sessionId}`);
            break;
          case "request.after":
            logger_default.debug(`Request completed in session ${context.sessionId}`);
            break;
          case "error":
            logger_default.error(`Error in session ${context.sessionId}`, context.data);
            break;
        }
      }
    };
  }
});

// src/core/hooks/index.ts
var hooks_exports = {};
__export(hooks_exports, {
  initializeHooks: () => initializeHooks,
  loggingHook: () => loggingHook,
  todoContinuationHook: () => todoContinuationHook
});
function initializeHooks() {
  const registry = getHookRegistry();
  registry.register(todoContinuationHook);
  registry.register(loggingHook);
}
var init_hooks2 = __esm({
  "src/core/hooks/index.ts"() {
    "use strict";
    init_todo_continuation();
    init_logging();
    init_hooks();
    init_todo_continuation();
    init_logging();
  }
});

// node_modules/node-pty/lib/utils.js
var require_utils = __commonJS({
  "node_modules/node-pty/lib/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.loadNativeModule = exports.assign = void 0;
    function assign(target) {
      var sources = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
      }
      sources.forEach(function(source) {
        return Object.keys(source).forEach(function(key) {
          return target[key] = source[key];
        });
      });
      return target;
    }
    exports.assign = assign;
    function loadNativeModule(name) {
      var dirs = ["build/Release", "build/Debug", "prebuilds/" + process.platform + "-" + process.arch];
      var relative2 = ["..", "."];
      var lastError;
      for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
        var d = dirs_1[_i];
        for (var _a = 0, relative_1 = relative2; _a < relative_1.length; _a++) {
          var r = relative_1[_a];
          var dir = r + "/" + d + "/";
          try {
            return { dir, module: __require(dir + "/" + name + ".node") };
          } catch (e) {
            lastError = e;
          }
        }
      }
      throw new Error("Failed to load native module: " + name + ".node, checked: " + dirs.join(", ") + ": " + lastError);
    }
    exports.loadNativeModule = loadNativeModule;
  }
});

// node_modules/node-pty/lib/eventEmitter2.js
var require_eventEmitter2 = __commonJS({
  "node_modules/node-pty/lib/eventEmitter2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EventEmitter2 = void 0;
    var EventEmitter22 = (
      /** @class */
      (function() {
        function EventEmitter23() {
          this._listeners = [];
        }
        Object.defineProperty(EventEmitter23.prototype, "event", {
          get: function() {
            var _this = this;
            if (!this._event) {
              this._event = function(listener) {
                _this._listeners.push(listener);
                var disposable = {
                  dispose: function() {
                    for (var i = 0; i < _this._listeners.length; i++) {
                      if (_this._listeners[i] === listener) {
                        _this._listeners.splice(i, 1);
                        return;
                      }
                    }
                  }
                };
                return disposable;
              };
            }
            return this._event;
          },
          enumerable: false,
          configurable: true
        });
        EventEmitter23.prototype.fire = function(data) {
          var queue = [];
          for (var i = 0; i < this._listeners.length; i++) {
            queue.push(this._listeners[i]);
          }
          for (var i = 0; i < queue.length; i++) {
            queue[i].call(void 0, data);
          }
        };
        return EventEmitter23;
      })()
    );
    exports.EventEmitter2 = EventEmitter22;
  }
});

// node_modules/node-pty/lib/terminal.js
var require_terminal = __commonJS({
  "node_modules/node-pty/lib/terminal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Terminal = exports.DEFAULT_ROWS = exports.DEFAULT_COLS = void 0;
    var events_1 = __require("events");
    var eventEmitter2_1 = require_eventEmitter2();
    exports.DEFAULT_COLS = 80;
    exports.DEFAULT_ROWS = 24;
    var FLOW_CONTROL_PAUSE = "";
    var FLOW_CONTROL_RESUME = "";
    var Terminal = (
      /** @class */
      (function() {
        function Terminal2(opt) {
          this._pid = 0;
          this._fd = 0;
          this._cols = 0;
          this._rows = 0;
          this._readable = false;
          this._writable = false;
          this._onData = new eventEmitter2_1.EventEmitter2();
          this._onExit = new eventEmitter2_1.EventEmitter2();
          this._internalee = new events_1.EventEmitter();
          this.handleFlowControl = !!(opt === null || opt === void 0 ? void 0 : opt.handleFlowControl);
          this._flowControlPause = (opt === null || opt === void 0 ? void 0 : opt.flowControlPause) || FLOW_CONTROL_PAUSE;
          this._flowControlResume = (opt === null || opt === void 0 ? void 0 : opt.flowControlResume) || FLOW_CONTROL_RESUME;
          if (!opt) {
            return;
          }
          this._checkType("name", opt.name ? opt.name : void 0, "string");
          this._checkType("cols", opt.cols ? opt.cols : void 0, "number");
          this._checkType("rows", opt.rows ? opt.rows : void 0, "number");
          this._checkType("cwd", opt.cwd ? opt.cwd : void 0, "string");
          this._checkType("env", opt.env ? opt.env : void 0, "object");
          this._checkType("uid", opt.uid ? opt.uid : void 0, "number");
          this._checkType("gid", opt.gid ? opt.gid : void 0, "number");
          this._checkType("encoding", opt.encoding ? opt.encoding : void 0, "string");
        }
        Object.defineProperty(Terminal2.prototype, "onData", {
          get: function() {
            return this._onData.event;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "onExit", {
          get: function() {
            return this._onExit.event;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "pid", {
          get: function() {
            return this._pid;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "cols", {
          get: function() {
            return this._cols;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "rows", {
          get: function() {
            return this._rows;
          },
          enumerable: false,
          configurable: true
        });
        Terminal2.prototype.write = function(data) {
          if (this.handleFlowControl) {
            if (data === this._flowControlPause) {
              this.pause();
              return;
            }
            if (data === this._flowControlResume) {
              this.resume();
              return;
            }
          }
          this._write(data);
        };
        Terminal2.prototype._forwardEvents = function() {
          var _this = this;
          this.on("data", function(e) {
            return _this._onData.fire(e);
          });
          this.on("exit", function(exitCode, signal) {
            return _this._onExit.fire({ exitCode, signal });
          });
        };
        Terminal2.prototype._checkType = function(name, value, type, allowArray) {
          if (allowArray === void 0) {
            allowArray = false;
          }
          if (value === void 0) {
            return;
          }
          if (allowArray) {
            if (Array.isArray(value)) {
              value.forEach(function(v, i) {
                if (typeof v !== type) {
                  throw new Error(name + "[" + i + "] must be a " + type + " (not a " + typeof v[i] + ")");
                }
              });
              return;
            }
          }
          if (typeof value !== type) {
            throw new Error(name + " must be a " + type + " (not a " + typeof value + ")");
          }
        };
        Terminal2.prototype.end = function(data) {
          this._socket.end(data);
        };
        Terminal2.prototype.pipe = function(dest, options) {
          return this._socket.pipe(dest, options);
        };
        Terminal2.prototype.pause = function() {
          return this._socket.pause();
        };
        Terminal2.prototype.resume = function() {
          return this._socket.resume();
        };
        Terminal2.prototype.setEncoding = function(encoding) {
          if (this._socket._decoder) {
            delete this._socket._decoder;
          }
          if (encoding) {
            this._socket.setEncoding(encoding);
          }
        };
        Terminal2.prototype.addListener = function(eventName, listener) {
          this.on(eventName, listener);
        };
        Terminal2.prototype.on = function(eventName, listener) {
          if (eventName === "close") {
            this._internalee.on("close", listener);
            return;
          }
          this._socket.on(eventName, listener);
        };
        Terminal2.prototype.emit = function(eventName) {
          var args = [];
          for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
          }
          if (eventName === "close") {
            return this._internalee.emit.apply(this._internalee, arguments);
          }
          return this._socket.emit.apply(this._socket, arguments);
        };
        Terminal2.prototype.listeners = function(eventName) {
          return this._socket.listeners(eventName);
        };
        Terminal2.prototype.removeListener = function(eventName, listener) {
          this._socket.removeListener(eventName, listener);
        };
        Terminal2.prototype.removeAllListeners = function(eventName) {
          this._socket.removeAllListeners(eventName);
        };
        Terminal2.prototype.once = function(eventName, listener) {
          this._socket.once(eventName, listener);
        };
        Terminal2.prototype._close = function() {
          this._socket.readable = false;
          this.write = function() {
          };
          this.end = function() {
          };
          this._writable = false;
          this._readable = false;
        };
        Terminal2.prototype._parseEnv = function(env) {
          var keys = Object.keys(env || {});
          var pairs = [];
          for (var i = 0; i < keys.length; i++) {
            if (keys[i] === void 0) {
              continue;
            }
            pairs.push(keys[i] + "=" + env[keys[i]]);
          }
          return pairs;
        };
        return Terminal2;
      })()
    );
    exports.Terminal = Terminal;
  }
});

// node_modules/node-pty/lib/shared/conout.js
var require_conout = __commonJS({
  "node_modules/node-pty/lib/shared/conout.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getWorkerPipeName = void 0;
    function getWorkerPipeName(conoutPipeName) {
      return conoutPipeName + "-worker";
    }
    exports.getWorkerPipeName = getWorkerPipeName;
  }
});

// node_modules/node-pty/lib/windowsConoutConnection.js
var require_windowsConoutConnection = __commonJS({
  "node_modules/node-pty/lib/windowsConoutConnection.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve4) {
          resolve4(value);
        });
      }
      return new (P || (P = Promise))(function(resolve4, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve4(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConoutConnection = void 0;
    var worker_threads_1 = __require("worker_threads");
    var conout_1 = require_conout();
    var path_1 = __require("path");
    var eventEmitter2_1 = require_eventEmitter2();
    var FLUSH_DATA_INTERVAL = 1e3;
    var ConoutConnection = (
      /** @class */
      (function() {
        function ConoutConnection2(_conoutPipeName, _useConptyDll) {
          var _this = this;
          this._conoutPipeName = _conoutPipeName;
          this._useConptyDll = _useConptyDll;
          this._isDisposed = false;
          this._onReady = new eventEmitter2_1.EventEmitter2();
          var workerData = {
            conoutPipeName: _conoutPipeName
          };
          var scriptPath = __dirname.replace("node_modules.asar", "node_modules.asar.unpacked");
          this._worker = new worker_threads_1.Worker(path_1.join(scriptPath, "worker/conoutSocketWorker.js"), { workerData });
          this._worker.on("message", function(message) {
            switch (message) {
              case 1:
                _this._onReady.fire();
                return;
              default:
                console.warn("Unexpected ConoutWorkerMessage", message);
            }
          });
        }
        Object.defineProperty(ConoutConnection2.prototype, "onReady", {
          get: function() {
            return this._onReady.event;
          },
          enumerable: false,
          configurable: true
        });
        ConoutConnection2.prototype.dispose = function() {
          if (!this._useConptyDll && this._isDisposed) {
            return;
          }
          this._isDisposed = true;
          this._drainDataAndClose();
        };
        ConoutConnection2.prototype.connectSocket = function(socket) {
          socket.connect(conout_1.getWorkerPipeName(this._conoutPipeName));
        };
        ConoutConnection2.prototype._drainDataAndClose = function() {
          var _this = this;
          if (this._drainTimeout) {
            clearTimeout(this._drainTimeout);
          }
          this._drainTimeout = setTimeout(function() {
            return _this._destroySocket();
          }, FLUSH_DATA_INTERVAL);
        };
        ConoutConnection2.prototype._destroySocket = function() {
          return __awaiter(this, void 0, void 0, function() {
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  return [4, this._worker.terminate()];
                case 1:
                  _a.sent();
                  return [
                    2
                    /*return*/
                  ];
              }
            });
          });
        };
        return ConoutConnection2;
      })()
    );
    exports.ConoutConnection = ConoutConnection;
  }
});

// node_modules/node-pty/lib/windowsPtyAgent.js
var require_windowsPtyAgent = __commonJS({
  "node_modules/node-pty/lib/windowsPtyAgent.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.argsToCommandLine = exports.WindowsPtyAgent = void 0;
    var fs7 = __require("fs");
    var os = __require("os");
    var path7 = __require("path");
    var child_process_1 = __require("child_process");
    var net_1 = __require("net");
    var windowsConoutConnection_1 = require_windowsConoutConnection();
    var utils_1 = require_utils();
    var conptyNative;
    var winptyNative;
    var FLUSH_DATA_INTERVAL = 1e3;
    var WindowsPtyAgent = (
      /** @class */
      (function() {
        function WindowsPtyAgent2(file, args, env, cwd, cols, rows, debug, _useConpty, _useConptyDll, conptyInheritCursor) {
          var _this = this;
          if (_useConptyDll === void 0) {
            _useConptyDll = false;
          }
          if (conptyInheritCursor === void 0) {
            conptyInheritCursor = false;
          }
          this._useConpty = _useConpty;
          this._useConptyDll = _useConptyDll;
          this._pid = 0;
          this._innerPid = 0;
          if (this._useConpty === void 0 || this._useConpty === true) {
            this._useConpty = this._getWindowsBuildNumber() >= 18309;
          }
          if (this._useConpty) {
            if (!conptyNative) {
              conptyNative = utils_1.loadNativeModule("conpty").module;
            }
          } else {
            if (!winptyNative) {
              winptyNative = utils_1.loadNativeModule("pty").module;
            }
          }
          this._ptyNative = this._useConpty ? conptyNative : winptyNative;
          cwd = path7.resolve(cwd);
          var commandLine = argsToCommandLine(file, args);
          var term;
          if (this._useConpty) {
            term = this._ptyNative.startProcess(file, cols, rows, debug, this._generatePipeName(), conptyInheritCursor, this._useConptyDll);
          } else {
            term = this._ptyNative.startProcess(file, commandLine, env, cwd, cols, rows, debug);
            this._pid = term.pid;
            this._innerPid = term.innerPid;
          }
          this._fd = term.fd;
          this._pty = term.pty;
          this._outSocket = new net_1.Socket();
          this._outSocket.setEncoding("utf8");
          this._conoutSocketWorker = new windowsConoutConnection_1.ConoutConnection(term.conout, this._useConptyDll);
          this._conoutSocketWorker.onReady(function() {
            _this._conoutSocketWorker.connectSocket(_this._outSocket);
          });
          this._outSocket.on("connect", function() {
            _this._outSocket.emit("ready_datapipe");
          });
          var inSocketFD = fs7.openSync(term.conin, "w");
          this._inSocket = new net_1.Socket({
            fd: inSocketFD,
            readable: false,
            writable: true
          });
          this._inSocket.setEncoding("utf8");
          if (this._useConpty) {
            var connect = this._ptyNative.connect(this._pty, commandLine, cwd, env, this._useConptyDll, function(c) {
              return _this._$onProcessExit(c);
            });
            this._innerPid = connect.pid;
          }
        }
        Object.defineProperty(WindowsPtyAgent2.prototype, "inSocket", {
          get: function() {
            return this._inSocket;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "outSocket", {
          get: function() {
            return this._outSocket;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "fd", {
          get: function() {
            return this._fd;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "innerPid", {
          get: function() {
            return this._innerPid;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "pty", {
          get: function() {
            return this._pty;
          },
          enumerable: false,
          configurable: true
        });
        WindowsPtyAgent2.prototype.resize = function(cols, rows) {
          if (this._useConpty) {
            if (this._exitCode !== void 0) {
              throw new Error("Cannot resize a pty that has already exited");
            }
            this._ptyNative.resize(this._pty, cols, rows, this._useConptyDll);
            return;
          }
          this._ptyNative.resize(this._pid, cols, rows);
        };
        WindowsPtyAgent2.prototype.clear = function() {
          if (this._useConpty) {
            this._ptyNative.clear(this._pty, this._useConptyDll);
          }
        };
        WindowsPtyAgent2.prototype.kill = function() {
          var _this = this;
          if (this._useConpty) {
            if (!this._useConptyDll) {
              this._inSocket.readable = false;
              this._outSocket.readable = false;
              this._getConsoleProcessList().then(function(consoleProcessList) {
                consoleProcessList.forEach(function(pid) {
                  try {
                    process.kill(pid);
                  } catch (e) {
                  }
                });
              });
              this._ptyNative.kill(this._pty, this._useConptyDll);
              this._conoutSocketWorker.dispose();
            } else {
              this._inSocket.destroy();
              this._ptyNative.kill(this._pty, this._useConptyDll);
              this._outSocket.on("data", function() {
                _this._conoutSocketWorker.dispose();
              });
            }
          } else {
            var processList = this._ptyNative.getProcessList(this._pid);
            this._ptyNative.kill(this._pid, this._innerPid);
            processList.forEach(function(pid) {
              try {
                process.kill(pid);
              } catch (e) {
              }
            });
          }
        };
        WindowsPtyAgent2.prototype._getConsoleProcessList = function() {
          var _this = this;
          return new Promise(function(resolve4) {
            var agent = child_process_1.fork(path7.join(__dirname, "conpty_console_list_agent"), [_this._innerPid.toString()]);
            agent.on("message", function(message) {
              clearTimeout(timeout);
              resolve4(message.consoleProcessList);
            });
            var timeout = setTimeout(function() {
              agent.kill();
              resolve4([_this._innerPid]);
            }, 5e3);
          });
        };
        Object.defineProperty(WindowsPtyAgent2.prototype, "exitCode", {
          get: function() {
            if (this._useConpty) {
              return this._exitCode;
            }
            var winptyExitCode = this._ptyNative.getExitCode(this._innerPid);
            return winptyExitCode === -1 ? void 0 : winptyExitCode;
          },
          enumerable: false,
          configurable: true
        });
        WindowsPtyAgent2.prototype._getWindowsBuildNumber = function() {
          var osVersion = /(\d+)\.(\d+)\.(\d+)/g.exec(os.release());
          var buildNumber = 0;
          if (osVersion && osVersion.length === 4) {
            buildNumber = parseInt(osVersion[3]);
          }
          return buildNumber;
        };
        WindowsPtyAgent2.prototype._generatePipeName = function() {
          return "conpty-" + Math.random() * 1e7;
        };
        WindowsPtyAgent2.prototype._$onProcessExit = function(exitCode) {
          var _this = this;
          this._exitCode = exitCode;
          if (!this._useConptyDll) {
            this._flushDataAndCleanUp();
            this._outSocket.on("data", function() {
              return _this._flushDataAndCleanUp();
            });
          }
        };
        WindowsPtyAgent2.prototype._flushDataAndCleanUp = function() {
          var _this = this;
          if (this._useConptyDll) {
            return;
          }
          if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
          }
          this._closeTimeout = setTimeout(function() {
            return _this._cleanUpProcess();
          }, FLUSH_DATA_INTERVAL);
        };
        WindowsPtyAgent2.prototype._cleanUpProcess = function() {
          if (this._useConptyDll) {
            return;
          }
          this._inSocket.readable = false;
          this._outSocket.readable = false;
          this._outSocket.destroy();
        };
        return WindowsPtyAgent2;
      })()
    );
    exports.WindowsPtyAgent = WindowsPtyAgent;
    function argsToCommandLine(file, args) {
      if (isCommandLine(args)) {
        if (args.length === 0) {
          return file;
        }
        return argsToCommandLine(file, []) + " " + args;
      }
      var argv = [file];
      Array.prototype.push.apply(argv, args);
      var result = "";
      for (var argIndex = 0; argIndex < argv.length; argIndex++) {
        if (argIndex > 0) {
          result += " ";
        }
        var arg = argv[argIndex];
        var hasLopsidedEnclosingQuote = xOr(arg[0] !== '"', arg[arg.length - 1] !== '"');
        var hasNoEnclosingQuotes = arg[0] !== '"' && arg[arg.length - 1] !== '"';
        var quote = arg === "" || (arg.indexOf(" ") !== -1 || arg.indexOf("	") !== -1) && (arg.length > 1 && (hasLopsidedEnclosingQuote || hasNoEnclosingQuotes));
        if (quote) {
          result += '"';
        }
        var bsCount = 0;
        for (var i = 0; i < arg.length; i++) {
          var p = arg[i];
          if (p === "\\") {
            bsCount++;
          } else if (p === '"') {
            result += repeatText("\\", bsCount * 2 + 1);
            result += '"';
            bsCount = 0;
          } else {
            result += repeatText("\\", bsCount);
            bsCount = 0;
            result += p;
          }
        }
        if (quote) {
          result += repeatText("\\", bsCount * 2);
          result += '"';
        } else {
          result += repeatText("\\", bsCount);
        }
      }
      return result;
    }
    exports.argsToCommandLine = argsToCommandLine;
    function isCommandLine(args) {
      return typeof args === "string";
    }
    function repeatText(text, count) {
      var result = "";
      for (var i = 0; i < count; i++) {
        result += text;
      }
      return result;
    }
    function xOr(arg1, arg2) {
      return arg1 && !arg2 || !arg1 && arg2;
    }
  }
});

// node_modules/node-pty/lib/windowsTerminal.js
var require_windowsTerminal = __commonJS({
  "node_modules/node-pty/lib/windowsTerminal.js"(exports) {
    "use strict";
    var __extends = exports && exports.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WindowsTerminal = void 0;
    var terminal_1 = require_terminal();
    var windowsPtyAgent_1 = require_windowsPtyAgent();
    var utils_1 = require_utils();
    var DEFAULT_FILE = "cmd.exe";
    var DEFAULT_NAME = "Windows Shell";
    var WindowsTerminal = (
      /** @class */
      (function(_super) {
        __extends(WindowsTerminal2, _super);
        function WindowsTerminal2(file, args, opt) {
          var _this = _super.call(this, opt) || this;
          _this._checkType("args", args, "string", true);
          args = args || [];
          file = file || DEFAULT_FILE;
          opt = opt || {};
          opt.env = opt.env || process.env;
          if (opt.encoding) {
            console.warn("Setting encoding on Windows is not supported");
          }
          var env = utils_1.assign({}, opt.env);
          _this._cols = opt.cols || terminal_1.DEFAULT_COLS;
          _this._rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var cwd = opt.cwd || process.cwd();
          var name = opt.name || env.TERM || DEFAULT_NAME;
          var parsedEnv = _this._parseEnv(env);
          _this._isReady = false;
          _this._deferreds = [];
          _this._agent = new windowsPtyAgent_1.WindowsPtyAgent(file, args, parsedEnv, cwd, _this._cols, _this._rows, false, opt.useConpty, opt.useConptyDll, opt.conptyInheritCursor);
          _this._socket = _this._agent.outSocket;
          _this._pid = _this._agent.innerPid;
          _this._fd = _this._agent.fd;
          _this._pty = _this._agent.pty;
          _this._socket.on("ready_datapipe", function() {
            _this._socket.once("data", function() {
              if (!_this._isReady) {
                _this._isReady = true;
                _this._deferreds.forEach(function(fn) {
                  fn.run();
                });
                _this._deferreds = [];
              }
            });
            _this._socket.on("error", function(err) {
              _this._close();
              if (err.code) {
                if (~err.code.indexOf("errno 5") || ~err.code.indexOf("EIO"))
                  return;
              }
              if (_this.listeners("error").length < 2) {
                throw err;
              }
            });
            _this._socket.on("close", function() {
              _this.emit("exit", _this._agent.exitCode);
              _this._close();
            });
          });
          _this._file = file;
          _this._name = name;
          _this._readable = true;
          _this._writable = true;
          _this._forwardEvents();
          return _this;
        }
        WindowsTerminal2.prototype._write = function(data) {
          this._defer(this._doWrite, data);
        };
        WindowsTerminal2.prototype._doWrite = function(data) {
          this._agent.inSocket.write(data);
        };
        WindowsTerminal2.open = function(options) {
          throw new Error("open() not supported on windows, use Fork() instead.");
        };
        WindowsTerminal2.prototype.resize = function(cols, rows) {
          var _this = this;
          if (cols <= 0 || rows <= 0 || isNaN(cols) || isNaN(rows) || cols === Infinity || rows === Infinity) {
            throw new Error("resizing must be done using positive cols and rows");
          }
          this._deferNoArgs(function() {
            _this._agent.resize(cols, rows);
            _this._cols = cols;
            _this._rows = rows;
          });
        };
        WindowsTerminal2.prototype.clear = function() {
          var _this = this;
          this._deferNoArgs(function() {
            _this._agent.clear();
          });
        };
        WindowsTerminal2.prototype.destroy = function() {
          var _this = this;
          this._deferNoArgs(function() {
            _this.kill();
          });
        };
        WindowsTerminal2.prototype.kill = function(signal) {
          var _this = this;
          this._deferNoArgs(function() {
            if (signal) {
              throw new Error("Signals not supported on windows.");
            }
            _this._close();
            _this._agent.kill();
          });
        };
        WindowsTerminal2.prototype._deferNoArgs = function(deferredFn) {
          var _this = this;
          if (this._isReady) {
            deferredFn.call(this);
            return;
          }
          this._deferreds.push({
            run: function() {
              return deferredFn.call(_this);
            }
          });
        };
        WindowsTerminal2.prototype._defer = function(deferredFn, arg) {
          var _this = this;
          if (this._isReady) {
            deferredFn.call(this, arg);
            return;
          }
          this._deferreds.push({
            run: function() {
              return deferredFn.call(_this, arg);
            }
          });
        };
        Object.defineProperty(WindowsTerminal2.prototype, "process", {
          get: function() {
            return this._name;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsTerminal2.prototype, "master", {
          get: function() {
            throw new Error("master is not supported on Windows");
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsTerminal2.prototype, "slave", {
          get: function() {
            throw new Error("slave is not supported on Windows");
          },
          enumerable: false,
          configurable: true
        });
        return WindowsTerminal2;
      })(terminal_1.Terminal)
    );
    exports.WindowsTerminal = WindowsTerminal;
  }
});

// node_modules/node-pty/lib/unixTerminal.js
var require_unixTerminal = __commonJS({
  "node_modules/node-pty/lib/unixTerminal.js"(exports) {
    "use strict";
    var __extends = exports && exports.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UnixTerminal = void 0;
    var fs7 = __require("fs");
    var path7 = __require("path");
    var tty = __require("tty");
    var terminal_1 = require_terminal();
    var utils_1 = require_utils();
    var native = utils_1.loadNativeModule("pty");
    var pty2 = native.module;
    var helperPath = native.dir + "/spawn-helper";
    helperPath = path7.resolve(__dirname, helperPath);
    helperPath = helperPath.replace("app.asar", "app.asar.unpacked");
    helperPath = helperPath.replace("node_modules.asar", "node_modules.asar.unpacked");
    var DEFAULT_FILE = "sh";
    var DEFAULT_NAME = "xterm";
    var DESTROY_SOCKET_TIMEOUT_MS = 200;
    var UnixTerminal = (
      /** @class */
      (function(_super) {
        __extends(UnixTerminal2, _super);
        function UnixTerminal2(file, args, opt) {
          var _a, _b;
          var _this = _super.call(this, opt) || this;
          _this._boundClose = false;
          _this._emittedClose = false;
          if (typeof args === "string") {
            throw new Error("args as a string is not supported on unix.");
          }
          args = args || [];
          file = file || DEFAULT_FILE;
          opt = opt || {};
          opt.env = opt.env || process.env;
          _this._cols = opt.cols || terminal_1.DEFAULT_COLS;
          _this._rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var uid = (_a = opt.uid) !== null && _a !== void 0 ? _a : -1;
          var gid = (_b = opt.gid) !== null && _b !== void 0 ? _b : -1;
          var env = utils_1.assign({}, opt.env);
          if (opt.env === process.env) {
            _this._sanitizeEnv(env);
          }
          var cwd = opt.cwd || process.cwd();
          env.PWD = cwd;
          var name = opt.name || env.TERM || DEFAULT_NAME;
          env.TERM = name;
          var parsedEnv = _this._parseEnv(env);
          var encoding = opt.encoding === void 0 ? "utf8" : opt.encoding;
          var onexit = function(code, signal) {
            if (!_this._emittedClose) {
              if (_this._boundClose) {
                return;
              }
              _this._boundClose = true;
              var timeout_1 = setTimeout(function() {
                timeout_1 = null;
                _this._socket.destroy();
              }, DESTROY_SOCKET_TIMEOUT_MS);
              _this.once("close", function() {
                if (timeout_1 !== null) {
                  clearTimeout(timeout_1);
                }
                _this.emit("exit", code, signal);
              });
              return;
            }
            _this.emit("exit", code, signal);
          };
          var term = pty2.fork(file, args, parsedEnv, cwd, _this._cols, _this._rows, uid, gid, encoding === "utf8", helperPath, onexit);
          _this._socket = new tty.ReadStream(term.fd);
          if (encoding !== null) {
            _this._socket.setEncoding(encoding);
          }
          _this._writeStream = new CustomWriteStream(term.fd, encoding || void 0);
          _this._socket.on("error", function(err) {
            if (err.code) {
              if (~err.code.indexOf("EAGAIN")) {
                return;
              }
            }
            _this._close();
            if (!_this._emittedClose) {
              _this._emittedClose = true;
              _this.emit("close");
            }
            if (err.code) {
              if (~err.code.indexOf("errno 5") || ~err.code.indexOf("EIO")) {
                return;
              }
            }
            if (_this.listeners("error").length < 2) {
              throw err;
            }
          });
          _this._pid = term.pid;
          _this._fd = term.fd;
          _this._pty = term.pty;
          _this._file = file;
          _this._name = name;
          _this._readable = true;
          _this._writable = true;
          _this._socket.on("close", function() {
            if (_this._emittedClose) {
              return;
            }
            _this._emittedClose = true;
            _this._close();
            _this.emit("close");
          });
          _this._forwardEvents();
          return _this;
        }
        Object.defineProperty(UnixTerminal2.prototype, "master", {
          get: function() {
            return this._master;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(UnixTerminal2.prototype, "slave", {
          get: function() {
            return this._slave;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.prototype._write = function(data) {
          this._writeStream.write(data);
        };
        Object.defineProperty(UnixTerminal2.prototype, "fd", {
          /* Accessors */
          get: function() {
            return this._fd;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(UnixTerminal2.prototype, "ptsName", {
          get: function() {
            return this._pty;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.open = function(opt) {
          var self = Object.create(UnixTerminal2.prototype);
          opt = opt || {};
          if (arguments.length > 1) {
            opt = {
              cols: arguments[1],
              rows: arguments[2]
            };
          }
          var cols = opt.cols || terminal_1.DEFAULT_COLS;
          var rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var encoding = opt.encoding === void 0 ? "utf8" : opt.encoding;
          var term = pty2.open(cols, rows);
          self._master = new tty.ReadStream(term.master);
          if (encoding !== null) {
            self._master.setEncoding(encoding);
          }
          self._master.resume();
          self._slave = new tty.ReadStream(term.slave);
          if (encoding !== null) {
            self._slave.setEncoding(encoding);
          }
          self._slave.resume();
          self._socket = self._master;
          self._pid = -1;
          self._fd = term.master;
          self._pty = term.pty;
          self._file = process.argv[0] || "node";
          self._name = process.env.TERM || "";
          self._readable = true;
          self._writable = true;
          self._socket.on("error", function(err) {
            self._close();
            if (self.listeners("error").length < 2) {
              throw err;
            }
          });
          self._socket.on("close", function() {
            self._close();
          });
          return self;
        };
        UnixTerminal2.prototype.destroy = function() {
          var _this = this;
          this._close();
          this._socket.once("close", function() {
            _this.kill("SIGHUP");
          });
          this._socket.destroy();
          this._writeStream.dispose();
        };
        UnixTerminal2.prototype.kill = function(signal) {
          try {
            process.kill(this.pid, signal || "SIGHUP");
          } catch (e) {
          }
        };
        Object.defineProperty(UnixTerminal2.prototype, "process", {
          /**
           * Gets the name of the process.
           */
          get: function() {
            if (process.platform === "darwin") {
              var title = pty2.process(this._fd);
              return title !== "kernel_task" ? title : this._file;
            }
            return pty2.process(this._fd, this._pty) || this._file;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.prototype.resize = function(cols, rows) {
          if (cols <= 0 || rows <= 0 || isNaN(cols) || isNaN(rows) || cols === Infinity || rows === Infinity) {
            throw new Error("resizing must be done using positive cols and rows");
          }
          pty2.resize(this._fd, cols, rows);
          this._cols = cols;
          this._rows = rows;
        };
        UnixTerminal2.prototype.clear = function() {
        };
        UnixTerminal2.prototype._sanitizeEnv = function(env) {
          delete env["TMUX"];
          delete env["TMUX_PANE"];
          delete env["STY"];
          delete env["WINDOW"];
          delete env["WINDOWID"];
          delete env["TERMCAP"];
          delete env["COLUMNS"];
          delete env["LINES"];
        };
        return UnixTerminal2;
      })(terminal_1.Terminal)
    );
    exports.UnixTerminal = UnixTerminal;
    var CustomWriteStream = (
      /** @class */
      (function() {
        function CustomWriteStream2(_fd, _encoding) {
          this._fd = _fd;
          this._encoding = _encoding;
          this._writeQueue = [];
        }
        CustomWriteStream2.prototype.dispose = function() {
          clearImmediate(this._writeImmediate);
          this._writeImmediate = void 0;
        };
        CustomWriteStream2.prototype.write = function(data) {
          var buffer = typeof data === "string" ? Buffer.from(data, this._encoding) : Buffer.from(data);
          if (buffer.byteLength !== 0) {
            this._writeQueue.push({ buffer, offset: 0 });
            if (this._writeQueue.length === 1) {
              this._processWriteQueue();
            }
          }
        };
        CustomWriteStream2.prototype._processWriteQueue = function() {
          var _this = this;
          this._writeImmediate = void 0;
          if (this._writeQueue.length === 0) {
            return;
          }
          var task = this._writeQueue[0];
          fs7.write(this._fd, task.buffer, task.offset, function(err, written) {
            if (err) {
              if ("code" in err && err.code === "EAGAIN") {
                _this._writeImmediate = setImmediate(function() {
                  return _this._processWriteQueue();
                });
              } else {
                _this._writeQueue.length = 0;
                console.error("Unhandled pty write error", err);
              }
              return;
            }
            task.offset += written;
            if (task.offset >= task.buffer.byteLength) {
              _this._writeQueue.shift();
            }
            _this._processWriteQueue();
          });
        };
        return CustomWriteStream2;
      })()
    );
  }
});

// node_modules/node-pty/lib/index.js
var require_lib = __commonJS({
  "node_modules/node-pty/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.native = exports.open = exports.createTerminal = exports.fork = exports.spawn = void 0;
    var utils_1 = require_utils();
    var terminalCtor;
    if (process.platform === "win32") {
      terminalCtor = require_windowsTerminal().WindowsTerminal;
    } else {
      terminalCtor = require_unixTerminal().UnixTerminal;
    }
    function spawn2(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports.spawn = spawn2;
    function fork(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports.fork = fork;
    function createTerminal(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports.createTerminal = createTerminal;
    function open(options) {
      return terminalCtor.open(options);
    }
    exports.open = open;
    exports.native = process.platform !== "win32" ? utils_1.loadNativeModule("pty").module : null;
  }
});

// src/services/pty/manager.ts
import { EventEmitter as EventEmitter2 } from "events";
var pty, PTYManager, ptyManager;
var init_manager = __esm({
  "src/services/pty/manager.ts"() {
    "use strict";
    pty = __toESM(require_lib(), 1);
    init_logger();
    PTYManager = class extends EventEmitter2 {
      processes = /* @__PURE__ */ new Map();
      activeProcesses = /* @__PURE__ */ new Set();
      config;
      constructor(config = {}) {
        super();
        this.config = {
          maxConcurrent: 5,
          idleTimeout: 3e5,
          // 5 minutes
          enableCaching: true,
          logLevel: "info",
          ...config
        };
      }
      async spawn(options) {
        const processId = crypto.randomUUID();
        const process2 = this.createPTYProcess(processId, options);
        this.activeProcesses.add(processId);
        this.processes.set(processId, process2);
        process2.onData((data) => {
          process2.outputBuffer.push(data);
          process2.lastActivity = /* @__PURE__ */ new Date();
          this.emit("data", { type: "data", data, process: process2 });
        });
        process2.onExit((exitCode, signal) => {
          this.handleExit(process2, exitCode, signal);
        });
        return process2;
      }
      async getProcess(processId) {
        return this.processes.get(processId) || null;
      }
      async getProcessByCwd(cwd) {
        return Array.from(this.processes.values()).find((p) => p.cwd === cwd && p.isAlive()) || null;
      }
      async kill(processId, signal = "SIGTERM") {
        const process2 = this.processes.get(processId);
        if (!process2) {
          throw new PTYNotFoundError(processId);
        }
        if (!process2.isAlive()) {
          Log.warn(`Process ${processId} already dead`);
          this.processes.delete(processId);
          return;
        }
        Log.info(`Killing process ${processId} with ${signal}`);
        process2.kill(signal);
      }
      async shutdown(processId) {
        const process2 = this.processes.get(processId);
        if (!process2) return;
        if (!process2.isAlive()) return;
        Log.info(`Shutting down process ${processId}`);
        process2.kill("SIGTERM");
        await this.waitForExit(process2, 1e3);
        if (process2.isAlive()) {
          process2.kill("SIGKILL");
          await this.waitForExit(process2, 500);
        }
        this.processes.delete(processId);
        this.activeProcesses.delete(processId);
      }
      async shutdownAll() {
        Log.info(`Shutting down all PTY processes (${this.processes.size})`);
        const shutdownPromises = Array.from(this.processes.entries()).map(([id]) => this.shutdown(id));
        await Promise.all(shutdownPromises);
        this.processes.clear();
        this.activeProcesses.clear();
      }
      handleExit(process2, exitCode, signal) {
        Log.info(`Process ${process2.id} exited with code ${exitCode}, signal: ${signal}`);
        this.activeProcesses.delete(process2.id);
        this.emit("exit", {
          type: "exit",
          exitCode,
          signal,
          process: process2
        });
        process2.removeAllListeners();
        this.processes.delete(process2.id);
      }
      async waitForExit(process2, timeout) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout && process2.isAlive()) {
          await new Promise((resolve4) => setTimeout(resolve4, 100));
        }
      }
      createPTYProcess(processId, options) {
        const ptyProcess = pty.spawn(
          options.shell || process.env.SHELL || "bash",
          options.args || [],
          {
            name: "xterm-256color",
            cols: options.cols || 80,
            rows: options.rows || 24,
            cwd: options.cwd || process.cwd(),
            env: {
              ...process.env,
              ...options.env,
              TERM: "xterm-256color",
              COLORTERM: "xterm-256color"
            },
            useConpty: true
          }
        );
        return {
          id: processId,
          pid: ptyProcess.pid,
          shell: options.shell || "bash",
          cwd: options.cwd || process.cwd(),
          cols: options.cols || 80,
          rows: options.rows || 24,
          env: { ...process.env, ...options.env },
          isAlive: () => ptyProcess.pid > 0 && !ptyProcess.killed,
          kill: (signal) => ptyProcess.kill(signal),
          resize: (cols, rows) => ptyProcess.resize(cols, rows),
          write: (data) => ptyProcess.write(data),
          onData: (callback) => ptyProcess.onData(callback),
          onExit: (callback) => ptyProcess.onExit(callback),
          onError: (callback) => ptyProcess.on("error", callback),
          outputBuffer: [],
          lastActivity: /* @__PURE__ */ new Date()
        };
      }
      async cleanupStaleSessions() {
        const now = Date.now();
        const staleThreshold = this.config.idleTimeout;
        let staleCount = 0;
        for (const [id, process2] of this.processes.entries()) {
          if (!process2.isAlive()) {
            await this.shutdown(id);
            staleCount++;
          }
        }
        if (staleCount > 0) {
          Log.info(`Cleaned up ${staleCount} stale sessions`);
        }
      }
    };
    ptyManager = new PTYManager();
  }
});

// src/services/pty/prompt-detector.ts
var PromptDetector, promptDetector;
var init_prompt_detector = __esm({
  "src/services/pty/prompt-detector.ts"() {
    "use strict";
    PromptDetector = class {
      patterns = {
        general: [
          /\$\s*$/,
          // bash $
          />\s*$/,
          // fish >
          /\#\s*$/,
          // root #
          /%\s*$/,
          // zsh %
          /\?\s*$/
          // command ?
        ],
        confirmation: [
          /\[yYnN\]$/,
          /\(y\/n\)$/,
          /\[y\/n\]$/,
          /Continue\?/,
          /Proceed\?/
        ],
        password: [
          /Password:\s*$/,
          /password:\s*$/,
          /Enter password:\s*$/
        ],
        multiLine: [
          />\s*$/,
          /\.\.\.\s*$/,
          /"/
        ]
      };
      detect(data) {
        const trimmed = data.trim();
        for (const pattern of this.patterns.password) {
          if (pattern.test(trimmed)) {
            return {
              type: "password",
              prompt: trimmed,
              suggestions: ["Enter password (hidden input)"]
            };
          }
        }
        for (const pattern of this.patterns.confirmation) {
          if (pattern.test(trimmed)) {
            return {
              type: "confirmation",
              prompt: trimmed,
              suggestions: ["[y] Yes", "[n] No", "[Ctrl+C] Cancel"]
            };
          }
        }
        for (const pattern of this.patterns.multiLine) {
          if (pattern.test(trimmed)) {
            return {
              type: "multi-line",
              prompt: trimmed,
              suggestions: ["Continue typing", "[Ctrl+D] Submit", "[Ctrl+C] Cancel"]
            };
          }
        }
        for (const pattern of this.patterns.general) {
          if (pattern.test(trimmed)) {
            return {
              type: "general",
              prompt: trimmed,
              suggestions: ["Enter command"]
            };
          }
        }
        return null;
      }
      stripANSIColors(data) {
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        return data.replace(ansiRegex, "");
      }
    };
    promptDetector = new PromptDetector();
  }
});

// src/core/tools/bash-pty.ts
var bashTool;
var init_bash_pty = __esm({
  "src/core/tools/bash-pty.ts"() {
    "use strict";
    init_manager();
    init_prompt_detector();
    bashTool = {
      name: "bash",
      description: "Execute bash command (supports interactive mode with PTY)",
      parameters: [
        {
          name: "command",
          type: "string",
          description: "The command to execute",
          required: true
        },
        {
          name: "interactive",
          type: "boolean",
          description: "Enable interactive PTY mode for long-running commands",
          required: false,
          default: false
        },
        {
          name: "workdir",
          type: "string",
          description: "Working directory",
          required: false
        },
        {
          name: "timeout",
          type: "number",
          description: "Timeout in milliseconds (default: 30000)",
          required: false,
          default: 3e4
        }
      ],
      async execute(args, context) {
        const command = args.command;
        const interactive = args.interactive ?? false;
        const workdir = args.workdir || context.workdir;
        const timeout = args.timeout || 3e4;
        if (interactive) {
          return await this.executeInteractive(command, workdir, timeout);
        } else {
          return await this.executeNonInteractive(command, workdir, timeout);
        }
      },
      async executeInteractive(command, cwd, timeout) {
        try {
          const process2 = await ptyManager.spawn({
            shell: "bash",
            args: ["-i"],
            cwd,
            cols: 80,
            rows: 24
          });
          let output = "";
          let promptDetected = false;
          const dataHandler = (data) => {
            output += data;
            const prompt = promptDetector.detect(data);
            if (prompt) {
              promptDetected = true;
              output += `
\u{1F514} Prompt detected: ${prompt.type}
\u{1F4A1} Suggestions: ${prompt.suggestions.join(", ")}`;
            }
          };
          process2.onData(dataHandler);
          process2.write(`${command}
`);
          await new Promise((resolve4, reject) => {
            const timer = setTimeout(() => {
              resolve4();
            }, timeout);
            process2.onExit((exitCode, signal) => {
              clearTimeout(timer);
              resolve4();
            });
            process2.onError((error) => {
              clearTimeout(timer);
              reject(error);
            });
          });
          process2.onData(() => {
          });
          return {
            success: true,
            output
          };
        } catch (error) {
          return {
            success: false,
            output: "",
            error: error instanceof Error ? error.message : String(error)
          };
        }
      },
      async executeNonInteractive(command, cwd, timeout) {
        const { exec: exec3 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execAsync2 = promisify2(exec3);
        try {
          const { stdout, stderr } = await execAsync2(command, {
            cwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024
          });
          return {
            success: true,
            output: stdout + (stderr ? `
${stderr}` : "")
          };
        } catch (error) {
          const execError = error;
          return {
            success: false,
            output: execError.stdout || "",
            error: execError.stderr || execError.message
          };
        }
      }
    };
  }
});

// src/core/tools/file.ts
import * as fs3 from "fs/promises";
import * as path3 from "path";
var readTool, writeTool, editTool;
var init_file = __esm({
  "src/core/tools/file.ts"() {
    "use strict";
    readTool = {
      name: "read",
      description: "Read content from a file",
      parameters: [
        {
          name: "filePath",
          type: "string",
          description: "The path to the file to read",
          required: true
        },
        {
          name: "offset",
          type: "number",
          description: "Line number to start reading from (0-based)",
          required: false
        },
        {
          name: "limit",
          type: "number",
          description: "Number of lines to read",
          required: false
        }
      ],
      async execute(args, context) {
        const filePath = args.filePath;
        const offset = args.offset || 0;
        const limit = args.limit || 2e3;
        const resolvedPath = path3.isAbsolute(filePath) ? filePath : path3.resolve(context.workdir, filePath);
        try {
          const content = await fs3.readFile(resolvedPath, "utf-8");
          const lines = content.split("\n");
          const selectedLines = lines.slice(offset, offset + limit);
          const numberedContent = selectedLines.map((line, index) => `${String(offset + index + 1).padStart(5)}| ${line}`).join("\n");
          return {
            success: true,
            output: numberedContent,
            data: { totalLines: lines.length, readLines: selectedLines.length }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
    writeTool = {
      name: "write",
      description: "Write content to a file",
      parameters: [
        {
          name: "filePath",
          type: "string",
          description: "The path to the file to write",
          required: true
        },
        {
          name: "content",
          type: "string",
          description: "The content to write",
          required: true
        }
      ],
      async execute(args, context) {
        const filePath = args.filePath;
        const content = args.content;
        const resolvedPath = path3.isAbsolute(filePath) ? filePath : path3.resolve(context.workdir, filePath);
        try {
          const dir = path3.dirname(resolvedPath);
          await fs3.mkdir(dir, { recursive: true });
          await fs3.writeFile(resolvedPath, content, "utf-8");
          return {
            success: true,
            output: `File written: ${resolvedPath}`
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
    editTool = {
      name: "edit",
      description: "Edit content in a file by replacing text",
      parameters: [
        {
          name: "filePath",
          type: "string",
          description: "The path to the file to edit",
          required: true
        },
        {
          name: "oldString",
          type: "string",
          description: "The text to replace",
          required: true
        },
        {
          name: "newString",
          type: "string",
          description: "The replacement text",
          required: true
        },
        {
          name: "replaceAll",
          type: "boolean",
          description: "Replace all occurrences",
          required: false,
          default: false
        }
      ],
      async execute(args, context) {
        const filePath = args.filePath;
        const oldString = args.oldString;
        const newString = args.newString;
        const replaceAll = args.replaceAll || false;
        const resolvedPath = path3.isAbsolute(filePath) ? filePath : path3.resolve(context.workdir, filePath);
        try {
          const content = await fs3.readFile(resolvedPath, "utf-8");
          if (!content.includes(oldString)) {
            return {
              success: false,
              error: "oldString not found in content"
            };
          }
          const occurrences = content.split(oldString).length - 1;
          if (occurrences > 1 && !replaceAll) {
            return {
              success: false,
              error: `oldString found ${occurrences} times. Use replaceAll to replace all occurrences.`
            };
          }
          const newContent = replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
          await fs3.writeFile(resolvedPath, newContent, "utf-8");
          return {
            success: true,
            output: `File edited: ${resolvedPath}`,
            data: { replacements: replaceAll ? occurrences : 1 }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }
});

// src/core/tools/search.ts
import * as fs4 from "fs/promises";
import * as path4 from "path";
async function searchDirectory(dir, pattern, include, matches) {
  const entries = await fs4.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path4.join(dir, entry.name);
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }
    if (entry.isDirectory()) {
      await searchDirectory(fullPath, pattern, include, matches);
    } else if (entry.isFile()) {
      if (include && !matchPattern(entry.name, include)) {
        continue;
      }
      try {
        const content = await fs4.readFile(fullPath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            matches.push({
              file: fullPath,
              line: i + 1,
              content: lines[i]
            });
          }
        }
      } catch {
      }
    }
  }
}
function matchPattern(filename, pattern) {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
  );
  return regex.test(filename);
}
async function findFiles(dir, pattern, files) {
  const entries = await fs4.readdir(dir, { withFileTypes: true });
  const parts = pattern.split("/");
  for (const entry of entries) {
    const fullPath = path4.join(dir, entry.name);
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }
    if (entry.isDirectory()) {
      if (parts[0] === "**") {
        await findFiles(fullPath, pattern, files);
      } else if (matchPattern(entry.name, parts[0])) {
        await findFiles(fullPath, parts.slice(1).join("/"), files);
      }
    } else if (entry.isFile()) {
      const filePattern = parts[parts.length - 1];
      if (matchPattern(entry.name, filePattern)) {
        files.push(fullPath);
      }
    }
  }
}
var grepTool, globTool;
var init_search = __esm({
  "src/core/tools/search.ts"() {
    "use strict";
    grepTool = {
      name: "grep",
      description: "Search for a pattern in files",
      parameters: [
        {
          name: "pattern",
          type: "string",
          description: "The regex pattern to search for",
          required: true
        },
        {
          name: "path",
          type: "string",
          description: "The directory or file to search in",
          required: false
        },
        {
          name: "include",
          type: "string",
          description: "File pattern to include (e.g., '*.ts')",
          required: false
        }
      ],
      async execute(args, context) {
        const pattern = args.pattern;
        const searchPath = args.path || context.workdir;
        const include = args.include;
        const resolvedPath = path4.isAbsolute(searchPath) ? searchPath : path4.resolve(context.workdir, searchPath);
        try {
          const regex = new RegExp(pattern);
          const matches = [];
          await searchDirectory(resolvedPath, regex, include, matches);
          if (matches.length === 0) {
            return {
              success: true,
              output: "No matches found",
              data: { matches: [] }
            };
          }
          const output = matches.slice(0, 100).map((m) => `${m.file}:${m.line}: ${m.content.trim()}`).join("\n");
          return {
            success: true,
            output,
            data: { matches: matches.slice(0, 100), total: matches.length }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
    globTool = {
      name: "glob",
      description: "Find files matching a pattern",
      parameters: [
        {
          name: "pattern",
          type: "string",
          description: "The glob pattern (e.g., '**/*.ts')",
          required: true
        },
        {
          name: "path",
          type: "string",
          description: "The directory to search in",
          required: false
        }
      ],
      async execute(args, context) {
        const pattern = args.pattern;
        const searchPath = args.path || context.workdir;
        const resolvedPath = path4.isAbsolute(searchPath) ? searchPath : path4.resolve(context.workdir, searchPath);
        try {
          const files = [];
          await findFiles(resolvedPath, pattern, files);
          if (files.length === 0) {
            return {
              success: true,
              output: "No files found",
              data: { files: [] }
            };
          }
          return {
            success: true,
            output: `Found ${files.length} file(s)

${files.slice(0, 100).join("\n")}`,
            data: { files: files.slice(0, 100), total: files.length }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }
});

// src/core/tools/todo.ts
var TodoWriteTool, TodoReadTool;
var init_todo = __esm({
  "src/core/tools/todo.ts"() {
    "use strict";
    init_todo_manager();
    TodoWriteTool = {
      name: "todowrite",
      description: "Use this tool to create or update your todo list. Provide an array of todo items with content, status, priority, and id. This allows the agent to track progress and work continuously until all tasks are completed.",
      parameters: [
        {
          name: "todos",
          type: "array",
          description: "Array of todo items. Each item should have: content (brief description), status (pending|in_progress|completed|cancelled), priority (high|medium|low), id (unique identifier)",
          required: true
        }
      ],
      async execute(args, context) {
        try {
          const todoManager = getTodoManager();
          const todosArray = args.todos;
          const todoItems = todosArray.map((item) => ({
            id: item.id || crypto.randomUUID(),
            sessionId: context.sessionId,
            content: item.content,
            status: item.status,
            priority: item.priority,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }));
          todoManager.setTodos(context.sessionId, todoItems);
          const pending = todoManager.listPending();
          return {
            success: true,
            output: `Todo list updated with ${todosArray.length} items. ${pending.length} tasks remaining.`,
            data: todoItems
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
    TodoReadTool = {
      name: "todoread",
      description: "Use this tool to read your current todo list and see task progress. This helps track what tasks are pending, in progress, or completed.",
      parameters: [],
      async execute(_args, context) {
        try {
          const todoManager = getTodoManager();
          const todos = todoManager.list();
          const pending = todoManager.listPending();
          const formatted = todos.map((todo) => {
            const statusIcon = todo.status === "completed" ? "\u2713" : todo.status === "in_progress" ? "\u2192" : todo.status === "failed" ? "\u2717" : "\u25CB";
            return `${statusIcon} [${todo.priority}] ${todo.content} (${todo.status})`;
          }).join("\n");
          return {
            success: true,
            output: `Current todo list (${pending.length} pending, ${todos.length} total):
${formatted}`,
            data: todos
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }
});

// src/tools/registry.ts
var registry_exports = {};
__export(registry_exports, {
  ToolRegistry: () => ToolRegistry2,
  toolRegistry: () => toolRegistry
});
import { EventEmitter as EventEmitter3 } from "events";
var ToolRegistry2, toolRegistry;
var init_registry = __esm({
  "src/tools/registry.ts"() {
    "use strict";
    init_logger();
    ToolRegistry2 = class extends EventEmitter3 {
      tools = /* @__PURE__ */ new Map();
      toolCache = /* @__PURE__ */ new Map();
      categories = /* @__PURE__ */ new Map();
      register(schema, implementation) {
        this.validateSchema(schema);
        if (this.tools.has(schema.name)) {
          Log.warn(`Tool ${schema.name} already registered, overwriting`);
        }
        this.tools.set(schema.name, schema);
        this.toolCache.set(schema.name, implementation);
        const categorySet = this.categories.get(schema.category) || /* @__PURE__ */ new Set();
        categorySet.add(schema.name);
        this.categories.set(schema.category, categorySet);
        Log.info(`\u2705 Registered tool: ${schema.name} (${schema.category})`);
        this.emit("tool:registered", { name: schema.name, category: schema.category });
      }
      unregister(name) {
        const schema = this.tools.get(name);
        if (!schema) {
          return false;
        }
        this.tools.delete(name);
        this.toolCache.delete(name);
        const categorySet = this.categories.get(schema.category);
        categorySet?.delete(name);
        this.emit("tool:unregistered", { name });
        Log.info(`\u{1F5D1}\uFE0F Unregistered tool: ${name}`);
        return true;
      }
      get(name) {
        return this.tools.get(name);
      }
      getAll() {
        return Array.from(this.tools.values());
      }
      getByCategory(category) {
        const names = this.categories.get(category);
        if (!names) return [];
        return Array.from(names).map((name) => this.tools.get(name)).filter((schema) => schema !== void 0);
      }
      search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(
          (schema) => schema.name.toLowerCase().includes(lowerQuery) || schema.description.toLowerCase().includes(lowerQuery) || schema.category.toLowerCase().includes(lowerQuery)
        );
      }
      exists(name) {
        return this.tools.has(name);
      }
      clear() {
        this.tools.clear();
        this.toolCache.clear();
        this.categories.clear();
        Log.info("\u{1F9F9} Cleared tool registry");
      }
      validateSchema(schema) {
        if (!schema.name || typeof schema.name !== "string") {
          throw new Error("Tool name is required and must be a string");
        }
        if (!schema.description || typeof schema.description !== "string") {
          throw new Error("Tool description is required and must be a string");
        }
        if (!schema.category) {
          throw new Error("Tool category is required");
        }
        if (!Array.isArray(schema.parameters)) {
          throw new Error("Tool parameters must be an array");
        }
        for (const param of schema.parameters) {
          if (!param.name || typeof param.name !== "string") {
            throw new Error(`Parameter name is required for ${schema.name}`);
          }
          if (!param.type) {
            throw new Error(`Parameter type is required for ${schema.name}.${param.name}`);
          }
        }
      }
    };
    toolRegistry = new ToolRegistry2();
  }
});

// src/core/tools/bash.ts
import { exec as exec2 } from "child_process";
import { promisify } from "util";
var execAsync, bashTool2;
var init_bash = __esm({
  "src/core/tools/bash.ts"() {
    "use strict";
    execAsync = promisify(exec2);
    bashTool2 = {
      name: "bash",
      description: "Execute a bash command",
      parameters: [
        {
          name: "command",
          type: "string",
          description: "The command to execute",
          required: true
        },
        {
          name: "workdir",
          type: "string",
          description: "Working directory",
          required: false
        },
        {
          name: "timeout",
          type: "number",
          description: "Timeout in milliseconds",
          required: false,
          default: 12e4
        }
      ],
      async execute(args, context) {
        const command = args.command;
        const workdir = args.workdir || context.workdir;
        const timeout = args.timeout || 12e4;
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: workdir,
            timeout,
            maxBuffer: 10 * 1024 * 1024
          });
          return {
            success: true,
            output: stdout + (stderr ? `
${stderr}` : "")
          };
        } catch (error) {
          const execError = error;
          return {
            success: false,
            output: execError.stdout || "",
            error: execError.stderr || execError.message
          };
        }
      }
    };
  }
});

// src/core/tools/adapter.ts
function getToolRegistry2() {
  return toolRegistry;
}
function convertToToolSchema(toolDef, category = "custom") {
  return {
    name: toolDef.name,
    description: toolDef.description,
    category,
    parameters: toolDef.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      required: p.required || false,
      default: p.default
    })),
    returns: { type: "any", description: "Tool result" },
    examples: [],
    requiresAuth: false,
    requiresPermission: [],
    timeout: 3e4
  };
}
function inferCategory(toolName) {
  const nameLower = toolName.toLowerCase();
  if (nameLower.includes("bash") || nameLower.includes("terminal") || nameLower.includes("command")) {
    return "terminal";
  }
  if (nameLower.includes("read") || nameLower.includes("write") || nameLower.includes("edit") || nameLower.includes("file")) {
    return "file";
  }
  if (nameLower.includes("grep") || nameLower.includes("glob") || nameLower.includes("search")) {
    return "file";
  }
  if (nameLower.includes("todo")) {
    return "system";
  }
  return "custom";
}
function initializeTools() {
  const registry = getToolRegistry2();
  const coreRegistry = getToolRegistry();
  const tools = [
    { tool: bashTool2 },
    { tool: readTool },
    { tool: writeTool },
    { tool: editTool },
    { tool: grepTool },
    { tool: globTool },
    { tool: TodoWriteTool },
    { tool: TodoReadTool }
  ];
  tools.forEach(({ tool }) => {
    try {
      const category = inferCategory(tool.name);
      const schema = convertToToolSchema(tool, category);
      registry.register(schema, tool.execute);
      coreRegistry.register(tool);
      Log.info(`\u2705 Registered tool: ${tool.name} (${category})`);
    } catch (error) {
      Log.error(`Failed to register tool ${tool.name}: ${error.message}`);
    }
  });
}
var init_adapter = __esm({
  "src/core/tools/adapter.ts"() {
    "use strict";
    init_registry();
    init_tools();
    init_bash();
    init_file();
    init_search();
    init_todo();
    init_logger();
  }
});

// src/core/tools/command-executor.ts
var CommandExecutor, commandExecutor;
var init_command_executor = __esm({
  "src/core/tools/command-executor.ts"() {
    "use strict";
    CommandExecutor = class {
      rateLimits = /* @__PURE__ */ new Map();
      config;
      processTimeout;
      constructor(config = {}) {
        this.config = {
          maxConcurrent: 5,
          timeout: 3e4,
          // 30 seconds default
          enableRateLimiting: true,
          logLevel: "info",
          ...config
        };
        this.processTimeout = this.config.timeout;
      }
      async execute(toolName, parameters, context) {
        const startTime = Date.now();
        if (this.config.enableRateLimiting) {
          const allowed = await this.checkRateLimit(toolName, context);
          if (!allowed) {
            return {
              success: false,
              output: null,
              error: new Error(`Rate limit exceeded for ${toolName}`),
              duration: Date.now() - startTime,
              toolName
            };
          }
        }
        try {
          const result = await Promise.race([
            this.executeTool(toolName, parameters, context),
            new Promise(
              (_, reject) => setTimeout(
                () => reject(new Error(`Execution timeout after ${this.processTimeout}ms`)),
                this.processTimeout
              )
            )
          ]);
          return result;
        } catch (error) {
          return {
            success: false,
            output: null,
            error: error instanceof Error ? error : new Error(String(error)),
            duration: Date.now() - startTime,
            toolName
          };
        }
      }
      async executeTool(toolName, parameters, context) {
        const startTime = Date.now();
        const { toolRegistry: toolRegistry2 } = await Promise.resolve().then(() => (init_registry(), registry_exports));
        const registry = toolRegistry2;
        const tool = registry.get(toolName);
        if (!tool) {
          return {
            success: false,
            output: null,
            error: new Error(`Tool not found: ${toolName}`),
            duration: Date.now() - startTime,
            toolName
          };
        }
        const implementation = toolRegistry2.toolCache?.get(toolName);
        if (!implementation) {
          return {
            success: false,
            output: null,
            error: new Error(`Tool implementation not found: ${toolName}`),
            duration: Date.now() - startTime,
            toolName
          };
        }
        const validation = this.validateParameters(tool, parameters);
        if (!validation.valid) {
          return {
            success: false,
            output: null,
            error: new Error(`Parameter validation failed: ${validation.errors.join(", ")}`),
            duration: Date.now() - startTime,
            toolName
          };
        }
        if (tool.requiresPermission && tool.requiresPermission.length > 0) {
          const hasPermission = tool.requiresPermission.some(
            (perm) => context.permissions.includes(perm)
          );
          if (!hasPermission) {
            return {
              success: false,
              output: null,
              error: new Error(`Missing required permissions: ${tool.requiresPermission.join(", ")}`),
              duration: Date.now() - startTime,
              toolName
            };
          }
        }
        const result = await implementation(parameters, context);
        return {
          success: true,
          output: result,
          duration: Date.now() - startTime,
          toolName
        };
      }
      validateParameters(schema, params) {
        const errors = [];
        for (const param of schema.parameters) {
          if (param.required && !(param.name in params)) {
            errors.push(`Missing required parameter: ${param.name}`);
          }
          if (param.name in params) {
            const value = params[param.name];
            switch (param.type) {
              case "string":
                if (typeof value !== "string") {
                  errors.push(`Parameter ${param.name} must be a string`);
                }
                break;
              case "number":
                if (typeof value !== "number") {
                  errors.push(`Parameter ${param.name} must be a number`);
                }
                if (param.minimum !== void 0 && value < param.minimum) {
                  errors.push(`Parameter ${param.name} must be >= ${param.minimum}`);
                }
                if (param.maximum !== void 0 && value > param.maximum) {
                  errors.push(`Parameter ${param.name} must be <= ${param.maximum}`);
                }
                break;
              case "boolean":
                if (typeof value !== "boolean") {
                  errors.push(`Parameter ${param.name} must be a boolean`);
                }
                break;
              case "array":
                if (!Array.isArray(value)) {
                  errors.push(`Parameter ${param.name} must be an array`);
                }
                break;
              case "object":
                if (typeof value !== "object" || value === null) {
                  errors.push(`Parameter ${param.name} must be an object`);
                }
                break;
              case "file":
              case "directory":
                if (typeof value !== "string") {
                  errors.push(`Parameter ${param.name} must be a file/directory path (string)`);
                }
                break;
            }
            if (param.enum && !param.enum.includes(value)) {
              errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(", ")}`);
            }
          }
        }
        return {
          valid: errors.length === 0,
          errors
        };
      }
      async checkRateLimit(toolName, context) {
        const key = `${toolName}:${context.sessionId}`;
        const now = Date.now();
        const config = this.rateLimits.get(key);
        if (!config) {
          this.rateLimits.set(key, []);
          return true;
        }
        const windowStart = now - 6e4;
        const recentRequests = config.filter((time) => time > windowStart);
        const rateLimit = 10;
        if (recentRequests.length >= rateLimit) {
          return false;
        }
        config.push(now);
        if (config.length > rateLimit * 2) {
          this.rateLimits.set(key, config.slice(-rateLimit));
        }
        return true;
      }
      updateConfig(key, timestamp) {
        this.rateLimits.set(key, timestamp);
      }
      isRateLimited(key) {
        const config = this.rateLimits.get(key);
        if (!config) return false;
        const now = Date.now();
        const recentCount = config.filter((t) => now - t < 6e4).length;
        return recentCount >= 10;
      }
      getStats() {
        const stats = Array.from(this.rateLimits.entries()).map(([key, timestamps]) => ({
          key,
          count: timestamps.length,
          isRateLimited: this.isRateLimited(key)
        }));
        return stats;
      }
      clearRateLimits() {
        this.rateLimits.clear();
      }
    };
    commandExecutor = new CommandExecutor();
  }
});

// src/tools/discovery.ts
import * as fs5 from "fs/promises";
import * as path5 from "path";
function getToolRegistry3() {
  return toolRegistry;
}
var ToolDiscovery, toolDiscovery;
var init_discovery = __esm({
  "src/tools/discovery.ts"() {
    "use strict";
    init_logger();
    init_registry();
    ToolDiscovery = class {
      discoveredTools = /* @__PURE__ */ new Map();
      scanPaths = [];
      constructor(scanPaths = []) {
        this.scanPaths = scanPaths;
      }
      setScanPaths(paths) {
        this.scanPaths = paths;
      }
      addScanPath(path7) {
        if (!this.scanPaths.includes(path7)) {
          this.scanPaths.push(path7);
        }
      }
      async discover() {
        Log.info("\u{1F50D} Starting tool discovery...");
        const discovered = /* @__PURE__ */ new Map();
        for (const scanPath of this.scanPaths) {
          const toolsInPath = await this.scanPath(scanPath);
          toolsInPath.forEach((tool, name) => {
            discovered.set(name, tool);
          });
        }
        this.discoveredTools = discovered;
        Log.info(`\u2705 Discovered ${discovered.size} tools`);
        return discovered;
      }
      async scanPath(dirPath) {
        const tools = /* @__PURE__ */ new Map();
        try {
          const files = await this.getToolFiles(dirPath);
          for (const file of files) {
            const fileTools = await this.parseToolFile(file);
            fileTools.forEach((tool, name) => {
              tools.set(name, tool);
            });
          }
        } catch (error) {
          Log.warn(`Failed to scan path ${dirPath}: ${error.message}`);
        }
        return tools;
      }
      async getToolFiles(dirPath) {
        const toolFiles = [];
        async function scan(currentPath) {
          const entries = await fs5.readdir(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path5.join(currentPath, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
              await scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".ts")) {
              const content = await fs5.readFile(fullPath, "utf-8");
              if (content.includes("ToolDefinition") || content.includes("ToolSchema")) {
                toolFiles.push(fullPath);
              }
            }
          }
        }
        await scan(dirPath);
        return toolFiles;
      }
      async parseToolFile(filePath) {
        const tools = /* @__PURE__ */ new Map();
        try {
          const content = await fs5.readFile(filePath, "utf-8");
          const relativePath = path5.relative(process.cwd(), filePath);
          const toolPatterns = [
            /export\s+const\s+(\w+)\s*:\s*ToolDefinition\s*=\s*\{/g,
            /export\s+const\s+(\w+)\s*=\s*\{\s*name:\s*["']([^"']+)["']/g
          ];
          for (const pattern of toolPatterns) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(content)) !== null) {
              const variableName = match[1];
              const toolName = match[2] || variableName;
              if (!tools.has(toolName)) {
                tools.set(toolName, {
                  schema: await this.extractSchema(content, toolName),
                  implementation: async () => {
                    const module = await import(filePath);
                    return module[variableName];
                  },
                  filePath: relativePath
                });
              }
            }
          }
        } catch (error) {
          Log.warn(`Failed to parse tool file ${filePath}: ${error.message}`);
        }
        return tools;
      }
      async extractSchema(content, toolName) {
        const schema = {
          name: toolName,
          description: "",
          category: "custom",
          parameters: [],
          returns: { type: "any", description: "Tool result" },
          examples: []
        };
        const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
        if (nameMatch) schema.name = nameMatch[1];
        const descriptionMatch = content.match(/description:\s*["']([^"']+)["']/);
        if (descriptionMatch) schema.description = descriptionMatch[1];
        const parametersMatch = content.match(/parameters:\s*\[(.*?)\]/s);
        if (parametersMatch) {
          schema.parameters = this.extractParameters(parametersMatch[1]);
        }
        return schema;
      }
      extractParameters(parametersBlock) {
        const parameters = [];
        const paramPattern = /\{\s*name:\s*["']([^"']+)["'],\s*type:\s*["']([^"']+)["'],\s*description:\s*["']([^"']+)["'][^}]*required:\s*(true|false)/g;
        let match;
        while ((match = paramPattern.exec(parametersBlock)) !== null) {
          parameters.push({
            name: match[1],
            type: match[2],
            description: match[3],
            required: match[4] === "true"
          });
        }
        return parameters;
      }
      async registerDiscoveredTools() {
        const registry = getToolRegistry3();
        let registeredCount = 0;
        for (const [toolName, discoveredTool] of this.discoveredTools) {
          try {
            const implementation = await discoveredTool.implementation();
            const toolDef = implementation.default || implementation;
            if (toolDef && toolDef.name) {
              registry.register({
                name: toolDef.name,
                description: toolDef.description || "",
                category: discoveredTool.schema.category,
                parameters: toolDef.parameters || [],
                returns: discoveredTool.schema.returns,
                examples: discoveredTool.schema.examples
              }, toolDef.execute);
              registeredCount++;
              Log.info(`\u{1F4E6} Registered tool: ${toolName} from ${discoveredTool.filePath}`);
            }
          } catch (error) {
            Log.warn(`Failed to register tool ${toolName}: ${error.message}`);
          }
        }
        return registeredCount;
      }
      getDiscoveredTools() {
        return this.discoveredTools;
      }
      search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.discoveredTools.values()).filter(
          (tool) => tool.schema.name.toLowerCase().includes(lowerQuery) || tool.schema.description.toLowerCase().includes(lowerQuery) || tool.schema.category.toLowerCase().includes(lowerQuery)
        );
      }
      clear() {
        this.discoveredTools.clear();
      }
    };
    toolDiscovery = new ToolDiscovery();
  }
});

// src/tools/generator.ts
import * as fs6 from "fs/promises";
import * as path6 from "path";
var ToolGenerator, toolGenerator;
var init_generator = __esm({
  "src/tools/generator.ts"() {
    "use strict";
    init_logger();
    ToolGenerator = class {
      templatesPath;
      outputPath;
      constructor(templatesPath = "./tools/templates", outputPath = "./src/core/tools") {
        this.templatesPath = path6.resolve(templatesPath);
        this.outputPath = path6.resolve(outputPath);
      }
      async generateFromTemplate(templateName, config) {
        const templatePath = path6.join(this.templatesPath, `${templateName}.ts`);
        try {
          const template = await fs6.readFile(templatePath, "utf-8");
          const toolSchema = this.buildToolSchema(config);
          const toolContent = this.fillTemplate(template, toolSchema);
          const fileName = `${toolSchema.name}.ts`;
          const filePath = path6.join(this.outputPath, fileName);
          return {
            content: toolContent,
            fileName,
            filePath
          };
        } catch (error) {
          throw new Error(`Failed to generate tool from template: ${error.message}`);
        }
      }
      async generateFromSchema(schema) {
        const template = await this.getDefaultTemplate();
        const toolContent = this.fillTemplate(template, schema);
        const fileName = `${schema.name}.ts`;
        const filePath = path6.join(this.outputPath, fileName);
        return {
          content: toolContent,
          fileName,
          filePath
        };
      }
      async generateFromPrompt(prompt) {
        const schema = await this.inferSchemaFromPrompt(prompt);
        return this.generateFromSchema(schema);
      }
      buildToolSchema(config) {
        return {
          name: config.name || "new_tool",
          description: config.description || "Description of the tool",
          category: config.category || "custom",
          parameters: config.parameters || [],
          returns: config.returns || { type: "any", description: "Tool result" },
          examples: config.examples || [],
          requiresAuth: false,
          requiresPermission: [],
          timeout: 3e4,
          rateLimit: { maxRequests: 10, windowMs: 6e4 }
        };
      }
      fillTemplate(template, schema) {
        let content = template;
        content = content.replace(/\{\{TOOL_NAME\}\}/g, schema.name);
        content = content.replace(/\{\{TOOL_DESCRIPTION\}\}/g, schema.description);
        content = content.replace(/\{\{TOOL_CATEGORY\}\}/g, schema.category);
        const parametersBlock = this.generateParametersBlock(schema.parameters);
        content = content.replace(/\{\{PARAMETERS\}\}/g, parametersBlock);
        const executeBody = this.generateExecuteBody(schema);
        content = content.replace(/\{\{EXECUTE_BODY\}\}/g, executeBody);
        return content;
      }
      generateParametersBlock(parameters) {
        if (parameters.length === 0) {
          return "[]";
        }
        const paramStrings = parameters.map((param) => {
          const required = param.required ? "true" : "false";
          const defaultStr = param.default !== void 0 ? `default: ${JSON.stringify(param.default)}` : "";
          return `    {
      name: "${param.name}",
      type: "${param.type}",
      description: "${param.description}",
      required: ${required},
      ${defaultStr}
    }`;
        });
        return `[
${paramStrings.join(",\n")}
  ]`;
      }
      generateExecuteBody(schema) {
        const args = [];
        const destructure = [];
        for (const param of schema.parameters) {
          if (param.required) {
            destructure.push(`${param.name}: args.${param.name} as ${param.type}`);
          }
        }
        if (destructure.length > 0) {
          args.push(`const { ${destructure.join(", ")} } = args`);
        }
        return `    // Implementation here
    // ${args.join("\n    // ")}
    
    return {
      success: true,
      output: "Tool executed successfully"
    }`;
      }
      async getDefaultTemplate() {
        const defaultTemplate = `import type { ToolDefinition, ToolContext, ToolResult } from "../types";

export const {{TOOL_NAME}}Tool: ToolDefinition = {
  name: "{{TOOL_NAME}}",
  description: "{{TOOL_DESCRIPTION}}",
  parameters: {{PARAMETERS}},

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
{{EXECUTE_BODY}}
  },
};
`;
        return defaultTemplate;
      }
      async inferSchemaFromPrompt(prompt) {
        const promptLower = prompt.toLowerCase();
        let category = "custom";
        if (promptLower.includes("file")) category = "file";
        else if (promptLower.includes("terminal") || promptLower.includes("bash") || promptLower.includes("command")) category = "terminal";
        else if (promptLower.includes("network") || promptLower.includes("http") || promptLower.includes("api")) category = "network";
        else if (promptLower.includes("database") || promptLower.includes("db")) category = "database";
        else if (promptLower.includes("ai") || promptLower.includes("model")) category = "ai";
        const schema = {
          name: this.generateToolName(prompt),
          description: prompt,
          category,
          parameters: [],
          returns: { type: "any", description: "Tool result" },
          examples: [],
          requiresAuth: false,
          requiresPermission: [],
          timeout: 3e4
        };
        return schema;
      }
      generateToolName(prompt) {
        const words = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((word) => word.length > 0);
        if (words.length === 0) return "new_tool";
        const name = words.join("_");
        return name.endsWith("_tool") ? name : `${name}_tool`;
      }
      async saveTool(tool) {
        const dir = path6.dirname(tool.filePath);
        await fs6.mkdir(dir, { recursive: true });
        await fs6.writeFile(tool.filePath, tool.content, "utf-8");
        Log.info(`\u{1F4C4} Generated tool: ${tool.fileName} at ${tool.filePath}`);
      }
      async listTemplates() {
        try {
          const files = await fs6.readdir(this.templatesPath);
          return files.filter((file) => file.endsWith(".ts")).map((file) => path6.basename(file, ".ts"));
        } catch (error) {
          Log.warn(`Failed to list templates: ${error.message}`);
          return [];
        }
      }
      async validateTool(tool) {
        const errors = [];
        try {
          const content = await fs6.readFile(tool.filePath, "utf-8");
          if (!content.includes("ToolDefinition")) {
            errors.push("Tool must implement ToolDefinition interface");
          }
          if (!content.includes("name:")) {
            errors.push("Tool must have a name property");
          }
          if (!content.includes("execute:")) {
            errors.push("Tool must have an execute method");
          }
          if (!content.includes("ToolContext")) {
            errors.push("Tool must use ToolContext");
          }
          if (!content.includes("ToolResult")) {
            errors.push("Tool must return ToolResult");
          }
        } catch (error) {
          errors.push(`Failed to validate: ${error.message}`);
        }
        return {
          valid: errors.length === 0,
          errors
        };
      }
    };
    toolGenerator = new ToolGenerator();
  }
});

// src/core/tools/index.ts
var tools_exports = {};
__export(tools_exports, {
  TodoReadTool: () => TodoReadTool,
  TodoWriteTool: () => TodoWriteTool,
  bashTool: () => bashTool,
  commandExecutor: () => commandExecutor,
  editTool: () => editTool,
  globTool: () => globTool,
  grepTool: () => grepTool,
  initializeTools: () => initializeTools,
  readTool: () => readTool,
  toolDiscovery: () => toolDiscovery,
  toolGenerator: () => toolGenerator,
  writeTool: () => writeTool
});
var init_tools2 = __esm({
  "src/core/tools/index.ts"() {
    "use strict";
    init_bash_pty();
    init_file();
    init_search();
    init_todo();
    init_adapter();
    init_command_executor();
    init_discovery();
    init_generator();
  }
});

// src/services/auth/claude.ts
import * as clack from "@clack/prompts";

// src/server/store/token-store.ts
init_logger();
import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import * as crypto2 from "crypto";
import path from "path";
var TokenStore = class {
  ALGORITHM = "aes-256-gcm";
  KEY_LENGTH = 32;
  IV_LENGTH = 16;
  encryptionKey = null;
  configDir;
  keyFile;
  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path.join(home, ".config", "supercoin");
    this.keyFile = path.join(this.configDir, ".key");
    if (!existsSync(this.configDir)) {
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
    if (existsSync(this.keyFile)) {
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
    return path.join(this.configDir, fileName);
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
          files.push(path.join(this.configDir, file));
        } else if (file === `${provider}.token`) {
          files.push(path.join(this.configDir, file));
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
      if (!existsSync(filePath)) {
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
      if (existsSync(filePath)) {
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
init_logger();
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
init_logger();
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
init_logger();
import { promises as fs2 } from "fs";
import { existsSync as existsSync2 } from "fs";
import * as crypto3 from "crypto";
import path2 from "path";
var STATE_EXPIRY_MS = 10 * 60 * 1e3;
var OAuthStateStore = class {
  states = /* @__PURE__ */ new Map();
  configDir;
  stateFile;
  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    this.configDir = path2.join(home, ".config", "supercoin");
    this.stateFile = path2.join(this.configDir, ".oauth-states");
    this.loadStates();
    this.startCleanupTimer();
  }
  async loadStates() {
    try {
      if (existsSync2(this.stateFile)) {
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
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
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
            await new Promise((resolve4) => setTimeout(resolve4));
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
  return new Promise((resolve4, reject) => {
    const timer = setTimeout(() => {
      callbackEmitter.removeAllListeners(`callback:${provider}`);
      reject(new Error(`OAuth callback timeout for ${provider}`));
    }, timeoutMs);
    callbackEmitter.once(`callback:${provider}`, (result) => {
      clearTimeout(timer);
      if (result.success) {
        resolve4({ code: result.code, state: result.state });
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
init_logger();
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
init_logger();
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
init_logger();
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
init_logger();
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
init_logger();
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
    return new Promise((resolve4) => setTimeout(resolve4, ms));
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

// src/services/agents/registry.ts
var AgentRegistry = class {
  agents = /* @__PURE__ */ new Map();
  register(agent) {
    this.agents.set(agent.name, agent);
  }
  get(name) {
    return this.agents.get(name);
  }
  has(name) {
    return this.agents.has(name);
  }
  list() {
    return Array.from(this.agents.values());
  }
  listNames() {
    return Array.from(this.agents.keys());
  }
};
var registryInstance = null;
function getAgentRegistry() {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
  }
  return registryInstance;
}

// src/services/agents/index.ts
init_todo_manager();

// src/services/agents/background.ts
var BackgroundManager = class {
  tasks = /* @__PURE__ */ new Map();
  concurrencyLimits = /* @__PURE__ */ new Map([
    ["default", 3],
    ["anthropic", 2],
    ["openai", 3],
    ["google", 5]
  ]);
  runningCounts = /* @__PURE__ */ new Map();
  queue = [];
  async spawn(input) {
    const taskId = crypto.randomUUID();
    const task = {
      id: taskId,
      sessionId: input.sessionId,
      agent: input.agent,
      prompt: input.prompt,
      description: input.description,
      status: "pending",
      progress: { step: 0, total: 1, message: "Queued" },
      startedAt: /* @__PURE__ */ new Date()
    };
    this.tasks.set(taskId, task);
    const provider = this.getProviderForAgent(input.agent);
    if (this.canRun(provider)) {
      this.runTask(task);
    } else {
      this.queue.push({ task, provider });
    }
    return taskId;
  }
  async runTask(task) {
    const provider = this.getProviderForAgent(task.agent);
    this.incrementRunning(provider);
    task.status = "in_progress";
    task.progress.message = "Executing...";
    try {
      const registry = getAgentRegistry();
      const agent = registry.get(task.agent);
      if (!agent) {
        throw new Error(`Agent not found: ${task.agent}`);
      }
      const result = await agent.execute(task.prompt);
      task.status = "completed";
      task.result = result;
      task.completedAt = /* @__PURE__ */ new Date();
      task.progress = { step: 1, total: 1, message: "Completed" };
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      task.completedAt = /* @__PURE__ */ new Date();
    } finally {
      this.decrementRunning(provider);
      this.processQueue();
    }
  }
  async getStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }
  async cancel(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed") {
      return false;
    }
    task.status = "cancelled";
    task.completedAt = /* @__PURE__ */ new Date();
    return true;
  }
  async getOutput(taskId, wait = false) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (wait && task.status === "in_progress") {
      await this.waitForCompletion(taskId);
    }
    return task.result || null;
  }
  listTasks(sessionId) {
    const tasks = Array.from(this.tasks.values());
    if (sessionId) {
      return tasks.filter((t) => t.sessionId === sessionId);
    }
    return tasks;
  }
  cleanup(sessionId) {
    for (const [id, task] of this.tasks) {
      if (task.sessionId === sessionId) {
        if (task.status === "in_progress") {
          task.status = "cancelled";
        }
        this.tasks.delete(id);
      }
    }
  }
  getProviderForAgent(agent) {
    const providerMap = {
      coin: "anthropic",
      analyst: "google",
      executor: "openai",
      code_reviewer: "anthropic",
      doc_writer: "google",
      explorer: "anthropic"
    };
    return providerMap[agent] || "default";
  }
  canRun(provider) {
    const limit = this.concurrencyLimits.get(provider) || this.concurrencyLimits.get("default") || 3;
    const running = this.runningCounts.get(provider) || 0;
    return running < limit;
  }
  incrementRunning(provider) {
    const current = this.runningCounts.get(provider) || 0;
    this.runningCounts.set(provider, current + 1);
  }
  decrementRunning(provider) {
    const current = this.runningCounts.get(provider) || 0;
    this.runningCounts.set(provider, Math.max(0, current - 1));
  }
  processQueue() {
    const toRun = [];
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const item = this.queue[i];
      if (this.canRun(item.provider)) {
        toRun.push(item);
        this.queue.splice(i, 1);
      }
    }
    for (const item of toRun) {
      this.runTask(item.task);
    }
  }
  async waitForCompletion(taskId, timeoutMs = 6e4) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const task = this.tasks.get(taskId);
      if (!task || task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        return;
      }
      await new Promise((resolve4) => setTimeout(resolve4, 100));
    }
    throw new Error(`Timeout waiting for task ${taskId}`);
  }
};
var backgroundManagerInstance = null;
function getBackgroundManager() {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundManager();
  }
  return backgroundManagerInstance;
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

// src/config/opencode.ts
import { z } from "zod";
import { readFile } from "fs/promises";
import { join } from "path";
var OpenCodeConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "ollama", "lmstudio", "llamacpp"]).default("ollama"),
  model: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(4096),
  streaming: z.boolean().default(true)
});
var CONFIG_FILENAMES = ["opencode.json", ".opencode.json", "supercoin.json"];
async function loadOpenCodeConfig(cwd = process.cwd()) {
  for (const filename of CONFIG_FILENAMES) {
    try {
      const configPath = join(cwd, filename);
      const content = await readFile(configPath, "utf-8");
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

// src/services/agents/coin.ts
init_todo_manager();

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

// src/services/agents/coin.ts
init_hooks();
init_logger();
function classifyRequest(request) {
  if (/ultrawork|ulw|울트라워크/i.test(request)) {
    return "complex" /* COMPLEX */;
  }
  if (/\s+and\s+(then\s+)?/i.test(request) || /\s+then\s+/i.test(request)) {
    return "complex" /* COMPLEX */;
  }
  const exploratoryPatterns = [
    // "How does the X module/component/service work?" - codebase specific
    /how\s+(does|do|is|are)\s+the\s+\w+\s*(module|component|service|class|function|method|handler|controller|router|manager|provider)?\s*(work|implemented|function)/i,
    // "Where is the X defined/located?"
    /where\s+(is|are)\s+(the\s+)?\w+\s*(defined|located|used|found)/i,
    // "Find all X"
    /find\s+(all|every|the)\s+/i,
    // "What files/modules handle X?"
    /what\s+(files?|modules?|functions?)\s+(handle|contain|have)/i
  ];
  for (const pattern of exploratoryPatterns) {
    if (pattern.test(request)) return "exploratory" /* EXPLORATORY */;
  }
  const openEndedPatterns = [
    /^(improve|optimize|refactor|enhance)/i,
    /^(review|analyze|assess|evaluate)/i,
    /make\s+(it|this)\s+(better|faster|cleaner)/i
  ];
  for (const pattern of openEndedPatterns) {
    if (pattern.test(request)) return "open_ended" /* OPEN_ENDED */;
  }
  const explicitPatterns = [
    /^(run|execute|start|stop|build|test|deploy)/i,
    /^(create|add|remove|delete|update)\s+/i,
    /^(install|uninstall)/i,
    /^npm\s+/i,
    /^bun\s+/i
  ];
  for (const pattern of explicitPatterns) {
    if (pattern.test(request)) return "explicit" /* EXPLICIT */;
  }
  const trivialPatterns = [
    /^(what|why|when)\s+(is|are|do|does)/i,
    /^(explain|describe|tell me about)/i,
    /^(fix|correct)\s+(this|the)\s+(typo|error)/i
  ];
  for (const pattern of trivialPatterns) {
    if (pattern.test(request)) return "trivial" /* TRIVIAL */;
  }
  return "trivial" /* TRIVIAL */;
}
var Coin = class {
  name = "coin";
  displayName = "Coin";
  model = "ollama/llama3:latest";
  capabilities = [
    "planning",
    "delegation",
    "verification",
    "coordination"
  ];
  systemPrompt = `You are Coin, an AI orchestrator that coordinates multiple specialized agents to complete complex tasks.

## Your Responsibilities
1. Analyze user requests and classify their type
2. Create execution plans with clear task breakdown
3. Delegate tasks to appropriate specialized agents
4. Monitor execution progress
5. Verify results meet requirements
6. Report final outcomes

## Agent Catalog
- analyst: Large codebase analysis, architecture review (Gemini - CHEAP)
- executor: Command execution, build, deploy (GPT-4o - MEDIUM)
- code_reviewer: Deep code review, security audit (Claude Opus - EXPENSIVE)
- doc_writer: Documentation writing (Gemini Pro - CHEAP)
- explorer: Codebase navigation, search (Haiku - FREE)

## Delegation Rules
- Use the cheapest agent that can handle the task
- Use explorer for simple searches
- Use analyst for large context analysis
- Use code_reviewer only for critical reviews
- Run independent tasks in parallel

## Output Format
Provide clear status updates and final summaries.`;
  async execute(prompt, context) {
    const sessionId = context?.sessionId || "default";
    const workdir = context?.workdir || process.cwd();
    const todoManager = getTodoManager();
    const sessionManager = getSessionManager();
    const hookRegistry = getHookRegistry();
    const classification = classifyRequest(prompt);
    const isUltraWork = /ultrawork|ulw|울트라워크/i.test(prompt);
    const session = sessionManager.get(sessionId);
    if (session) {
      session.mode = isUltraWork ? "ultrawork" : "normal";
      session.loop = {
        iteration: 0,
        maxIterations: isUltraWork ? 50 : 10,
        stagnantCount: 0
      };
    }
    logger_default.debug(`Request classified as: ${classification} (ULW: ${isUltraWork})`);
    try {
      const mode = session?.mode || "normal";
      if (mode === "normal" && (classification === "trivial" /* TRIVIAL */ || classification === "explicit" /* EXPLICIT */)) {
        const config = await resolveProviderFromConfig(workdir, mode);
        const result = await streamAIResponse({
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          messages: [{ role: "user", content: prompt }],
          systemPrompt: this.systemPrompt
        });
        return {
          success: true,
          content: result.text,
          usage: result.usage,
          model: `${config.provider}/${config.model}`
        };
      }
      const plan = await this.createPlan(prompt, classification);
      for (const task of plan.tasks) {
        await todoManager.create({
          sessionId,
          content: task.description,
          priority: task.critical ? "high" : "medium"
        });
      }
      let currentPrompt = prompt;
      let finalContent = "";
      let iterations = 0;
      const maxIterations = session?.loop?.maxIterations || 10;
      while (iterations < maxIterations) {
        iterations++;
        if (session?.loop) session.loop.iteration = iterations;
        const results = await this.executePlan(plan, context);
        finalContent += this.formatResults(plan, results) + "\n";
        const continuation = await hookRegistry.trigger("session.idle", {
          sessionId,
          workdir,
          event: "session.idle",
          data: { iterations, classification, isUltraWork }
        });
        const result = continuation;
        if (!result?.continue) {
          break;
        }
        currentPrompt = result.prompt || currentPrompt;
        logger_default.info(`Looping: iteration ${iterations}/${maxIterations}`);
      }
      return {
        success: true,
        content: finalContent || "Tasks completed",
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async createPlan(prompt, classification) {
    const tasks = [];
    if (classification === "exploratory" /* EXPLORATORY */) {
      tasks.push({
        id: crypto.randomUUID(),
        description: `Explore codebase for: ${prompt}`,
        type: "exploration",
        expectedOutcome: "Search results with file locations",
        agent: "explorer"
      });
    } else if (classification === "open_ended" /* OPEN_ENDED */) {
      tasks.push({
        id: crypto.randomUUID(),
        description: `Analyze and plan: ${prompt}`,
        type: "analysis",
        expectedOutcome: "Analysis with recommendations",
        agent: "analyst",
        runInBackground: true
      });
    } else if (classification === "complex" /* COMPLEX */) {
      tasks.push(
        {
          id: crypto.randomUUID(),
          description: `Analyze requirements: ${prompt}`,
          type: "analysis",
          expectedOutcome: "Detailed analysis",
          agent: "analyst"
        },
        {
          id: crypto.randomUUID(),
          description: `Execute implementation: ${prompt}`,
          type: "execution",
          expectedOutcome: "Implementation complete",
          agent: "executor",
          critical: true
        }
      );
    }
    return { tasks, parallel: false };
  }
  async executePlan(plan, context) {
    const registry = getAgentRegistry();
    const sessionId = context?.sessionId || "default";
    const todoManager = getTodoManager();
    const backgroundManager = getBackgroundManager();
    const results = [];
    for (const task of plan.tasks) {
      const todos = todoManager.list(sessionId);
      const todo = todos.find((t) => t.content === task.description);
      if (todo) {
        await todoManager.updateStatus(todo.id, "in_progress");
      }
      const agent = task.agent ? registry.get(task.agent) : void 0;
      if (!agent) {
        results.push({ success: false, error: `Agent not found: ${task.agent}` });
        if (todo) {
          await todoManager.updateStatus(todo.id, "failed");
        }
        continue;
      }
      if (task.runInBackground) {
        const taskId = await backgroundManager.spawn({
          sessionId: context?.sessionId || "default",
          agent: task.agent,
          prompt: task.description,
          description: task.description
        });
        results.push({ success: true, taskId, pending: true });
      } else {
        const result = await agent.execute(task.description, context);
        results.push({ success: result.success, error: result.error });
        if (todo) {
          await todoManager.updateStatus(todo.id, result.success ? "completed" : "failed");
        }
      }
    }
    return results;
  }
  formatResults(plan, results) {
    const lines = ["## Execution Summary\n"];
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      const result = results[i];
      const status = result.success ? "\u2713" : "\u2717";
      const pending = result.pending ? " (background)" : "";
      lines.push(`${status} ${task.description}${pending}`);
      if (result.error) {
        lines.push(`  Error: ${result.error}`);
      }
    }
    return lines.join("\n");
  }
};

// src/services/agents/explorer.ts
var ExplorerAgent = class {
  name = "explorer";
  displayName = "Explorer";
  model = "ollama/llama3:latest";
  capabilities = ["exploration", "search", "navigation"];
  allowedTools = [
    "grep",
    "glob",
    "read",
    "lsp_find_references",
    "lsp_goto_definition",
    "lsp_workspace_symbols"
  ];
  systemPrompt = `You are a fast codebase explorer. Your job is to quickly find information.

## Approach
1. Use grep for text search
2. Use glob for file patterns
3. Use lsp_* tools for semantic search
4. Return results concisely

## Output Format
Found X results:
1. file:line - brief description
2. file:line - brief description
...`;
  async execute(prompt, _context) {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.1,
        maxTokens: 4096
      });
      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// src/services/agents/analyst.ts
var AnalystAgent = class {
  name = "analyst";
  displayName = "Analyst";
  model = "ollama/llama3:latest";
  capabilities = [
    "large_context_analysis",
    "code_review",
    "architecture_analysis",
    "security_audit"
  ];
  allowedTools = ["read", "grep", "glob"];
  systemPrompt = `You are a specialized code analyst with expertise in:
- Large-scale codebase analysis (1M+ tokens)
- Architecture assessment and documentation
- Performance profiling and optimization suggestions
- Security vulnerability detection
- Dependency analysis and upgrade paths

## Approach
1. Start with high-level overview
2. Identify patterns and anti-patterns
3. Provide actionable insights with file:line references
4. Prioritize findings by impact

## Output Format
Always structure your analysis as:
- Executive Summary (2-3 sentences)
- Key Findings (bullet points)
- Detailed Analysis (by category)
- Recommendations (prioritized)`;
  async execute(prompt, _context) {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.3,
        maxTokens: 8192
      });
      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// src/services/agents/executor.ts
var ExecutorAgent = class {
  name = "executor";
  displayName = "Executor";
  model = "ollama/llama3:latest";
  capabilities = [
    "command_execution",
    "build_automation",
    "test_execution",
    "deployment"
  ];
  allowedTools = [
    "bash",
    "interactive_bash",
    "read",
    "write",
    "grep",
    "glob"
  ];
  systemPrompt = `You are a command execution specialist with expertise in:
- Shell command execution and scripting
- Build systems (npm, yarn, bun, make, gradle, cargo)
- Test runners and CI/CD pipelines
- Docker and container operations
- Git operations and version control

## Approach
1. Validate command safety before execution
2. Execute commands in proper sequence
3. Capture and report all output
4. Handle errors gracefully

## Safety Rules
- NEVER execute destructive commands without confirmation
- NEVER expose secrets or credentials in output
- ALWAYS validate paths before file operations
- ALWAYS use --dry-run where available first

## Output Format
\`\`\`
Command: <executed command>
Exit Code: <0 or error code>
Output:
<stdout/stderr>

Result: SUCCESS | FAILURE
\`\`\``;
  async execute(prompt, _context) {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.1,
        maxTokens: 4096
      });
      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// src/services/agents/code-reviewer.ts
var CodeReviewerAgent = class {
  name = "code_reviewer";
  displayName = "Code Reviewer";
  model = "ollama/llama3:latest";
  capabilities = [
    "code_review",
    "security_analysis",
    "performance_review",
    "bug_detection"
  ];
  allowedTools = ["read", "grep"];
  systemPrompt = `You are an expert code reviewer with decades of experience in:
- Software design patterns and anti-patterns
- Code quality and maintainability
- Security vulnerabilities and best practices
- Performance optimization
- Testing strategies

## Review Process
1. **First Pass**: Overall structure and design
2. **Second Pass**: Logic and correctness
3. **Third Pass**: Security and edge cases
4. **Fourth Pass**: Performance and optimization
5. **Fifth Pass**: Style and consistency

## Severity Levels
- \u{1F534} CRITICAL: Must fix before merge (security, data loss, crashes)
- \u{1F7E0} MAJOR: Should fix (bugs, significant issues)
- \u{1F7E1} MINOR: Consider fixing (code quality, style)
- \u{1F7E2} NIT: Optional (preferences, suggestions)

## Output Format
For each issue:
\`\`\`
[SEVERITY] file:line
Description: <what's wrong>
Suggestion: <how to fix>
Example: <code snippet>
\`\`\``;
  async execute(prompt, _context) {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.2,
        maxTokens: 8192
      });
      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// src/services/agents/doc-writer.ts
var DocWriterAgent = class {
  name = "doc_writer";
  displayName = "Documentation Writer";
  model = "ollama/llama3:latest";
  capabilities = [
    "documentation",
    "api_docs",
    "readme",
    "guides"
  ];
  allowedTools = ["read", "write", "grep", "glob"];
  systemPrompt = `You are a technical documentation specialist with expertise in:
- API documentation (OpenAPI, JSDoc, TSDoc)
- README files and project documentation
- User guides and tutorials
- Architecture documentation
- Changelog and release notes

## Approach
1. Analyze the codebase structure
2. Identify documentation gaps
3. Write clear, concise documentation
4. Include code examples where appropriate

## Documentation Standards
- Use clear, simple language
- Include examples for complex concepts
- Structure content with headings and lists
- Add cross-references where helpful

## Output Format
Provide documentation in Markdown format with proper headings, code blocks, and formatting.`;
  async execute(prompt, _context) {
    try {
      const result = await streamAIResponse({
        provider: "ollama",
        model: "llama3:latest",
        messages: [{ role: "user", content: prompt }],
        systemPrompt: this.systemPrompt,
        temperature: 0.5,
        maxTokens: 8192
      });
      return {
        success: true,
        content: result.text,
        usage: result.usage,
        model: "ollama/llama3:latest"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// src/services/agents/index.ts
function initializeAgents() {
  const registry = getAgentRegistry();
  registry.register(new Coin());
  registry.register(new ExplorerAgent());
  registry.register(new AnalystAgent());
  registry.register(new ExecutorAgent());
  registry.register(new CodeReviewerAgent());
  registry.register(new DocWriterAgent());
}

// src/core/index.ts
init_hooks();
init_tools();
init_hooks2();
init_tools2();
function initializeCore() {
  const { initializeHooks: initializeHooks2 } = (init_hooks2(), __toCommonJS(hooks_exports));
  const { initializeTools: initializeTools2 } = (init_tools2(), __toCommonJS(tools_exports));
  initializeHooks2();
  initializeTools2();
}

// src/supercoin.ts
init_logger();
var SuperCoin = class {
  config;
  workdir;
  initialized = false;
  _auth = null;
  _models = null;
  constructor(options) {
    this.config = options.config;
    this.workdir = options.workdir || process.cwd();
  }
  async initialize() {
    if (this.initialized) return;
    initializeCore();
    initializeAgents();
    this.initialized = true;
    logger_default.debug("SuperCoin initialized");
  }
  get auth() {
    if (!this._auth) {
      this._auth = getAuthHub();
    }
    return this._auth;
  }
  get models() {
    if (!this._models) {
      this._models = getModelRouter({
        defaultModel: this.config.default_model,
        fallbackModels: this.config.fallback_models
      });
    }
    return this._models;
  }
  getAgents() {
    return getAgentRegistry();
  }
  getTodos() {
    return getTodoManager();
  }
  getBackground() {
    return getBackgroundManager();
  }
  getSessions() {
    return getSessionManager();
  }
  getHooks() {
    return getHookRegistry();
  }
  getTools() {
    return getToolRegistry();
  }
  get agents() {
    return this.getAgents();
  }
  get todos() {
    return this.getTodos();
  }
  get background() {
    return this.getBackground();
  }
  get sessions() {
    return this.getSessions();
  }
  get hooks() {
    return this.getHooks();
  }
  get tools() {
    return this.getTools();
  }
  async chat(message, options) {
    await this.initialize();
    const router = this.models;
    if (options?.model) {
      await router.setModel(options.model);
    }
    const response = await router.route({
      messages: [{ role: "user", content: message }]
    });
    return response.content;
  }
  async runAgent(agentName, prompt) {
    await this.initialize();
    const agent = this.getAgents().get(agentName);
    if (!agent) {
      return { success: false, error: `Agent not found: ${agentName}` };
    }
    const result = await agent.execute(prompt, {
      sessionId: "default",
      workdir: this.workdir
    });
    return {
      success: result.success,
      content: result.content,
      error: result.error
    };
  }
  async spawnBackground(agentName, prompt, description) {
    await this.initialize();
    const sessions = this.getSessions();
    const session = sessions.getCurrent() || sessions.create(this.workdir, this.config.default_model);
    const taskId = await this.getBackground().spawn({
      sessionId: session.id,
      agent: agentName,
      prompt,
      description
    });
    return taskId;
  }
  async getBackgroundResult(taskId, wait = true) {
    return this.getBackground().getOutput(taskId, wait);
  }
  createSession() {
    const session = this.getSessions().create(this.workdir, this.config.default_model);
    return session.id;
  }
  async executeTool(toolName, args) {
    await this.initialize();
    const sessions = this.getSessions();
    const session = sessions.getCurrent() || sessions.create(this.workdir, this.config.default_model);
    const result = await this.getTools().execute(toolName, args, {
      sessionId: session.id,
      workdir: this.workdir
    });
    return result;
  }
};
function createSuperCoin(config, workdir) {
  return new SuperCoin({ config, workdir });
}
export {
  SuperCoin,
  createSuperCoin
};
//# sourceMappingURL=index.js.map

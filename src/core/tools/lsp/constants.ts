/**
 * LSP Constants
 * Server configurations, language mappings, and default values.
 * Adapted from Oh-My-OpenCode for SuperCode integration
 */

import type { LSPServerConfig, SymbolKind, DiagnosticSeverity } from "./types";

/**
 * Symbol kind names
 */
export const SYMBOL_KIND_NAMES: Record<number, string> = {
  1: "File",
  2: "Module",
  3: "Namespace",
  4: "Package",
  5: "Class",
  6: "Method",
  7: "Property",
  8: "Field",
  9: "Constructor",
  10: "Enum",
  11: "Interface",
  12: "Function",
  13: "Variable",
  14: "Constant",
  15: "String",
  16: "Number",
  17: "Boolean",
  18: "Array",
  19: "Object",
  20: "Key",
  21: "Null",
  22: "EnumMember",
  23: "Struct",
  24: "Event",
  25: "Operator",
  26: "TypeParameter",
};

/**
 * Severity names
 */
export const SEVERITY_NAMES: Record<number, string> = {
  1: "error",
  2: "warning",
  3: "information",
  4: "hint",
};

/**
 * Default limits
 */
export const DEFAULT_MAX_REFERENCES = 200;
export const DEFAULT_MAX_SYMBOLS = 200;
export const DEFAULT_MAX_DIAGNOSTICS = 200;
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
export const DEFAULT_IDLE_TIMEOUT_MS = 300000; // 5 minutes

/**
 * File extension to language ID mapping
 */
export const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "javascript",
  ".jsx": "javascriptreact",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".mts": "typescript",
  ".cts": "typescript",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",

  // Data
  ".json": "json",
  ".jsonc": "jsonc",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",

  // Python
  ".py": "python",
  ".pyi": "python",
  ".pyx": "cython",

  // Go
  ".go": "go",
  ".mod": "gomod",

  // Rust
  ".rs": "rust",

  // C/C++
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".hxx": "cpp",

  // Java/Kotlin
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",

  // Ruby
  ".rb": "ruby",
  ".erb": "erb",

  // PHP
  ".php": "php",

  // Shell
  ".sh": "shellscript",
  ".bash": "shellscript",
  ".zsh": "shellscript",
  ".fish": "fish",

  // Lua
  ".lua": "lua",

  // Elixir
  ".ex": "elixir",
  ".exs": "elixir",

  // Haskell
  ".hs": "haskell",
  ".lhs": "haskell",

  // Scala
  ".scala": "scala",
  ".sc": "scala",

  // Swift
  ".swift": "swift",

  // C#/F#
  ".cs": "csharp",
  ".fs": "fsharp",
  ".fsx": "fsharp",

  // Dart
  ".dart": "dart",

  // Zig
  ".zig": "zig",

  // Nim
  ".nim": "nim",

  // OCaml
  ".ml": "ocaml",
  ".mli": "ocaml",

  // Clojure
  ".clj": "clojure",
  ".cljs": "clojurescript",
  ".cljc": "clojure",
  ".edn": "clojure",

  // Nix
  ".nix": "nix",

  // Terraform
  ".tf": "terraform",
  ".tfvars": "terraform",

  // Dockerfile
  "Dockerfile": "dockerfile",
  ".dockerfile": "dockerfile",

  // Markdown
  ".md": "markdown",
  ".mdx": "mdx",

  // LaTeX
  ".tex": "latex",
  ".bib": "bibtex",

  // SQL
  ".sql": "sql",

  // Prisma
  ".prisma": "prisma",

  // GraphQL
  ".graphql": "graphql",
  ".gql": "graphql",

  // Protocol Buffers
  ".proto": "proto",

  // Solidity
  ".sol": "solidity",

  // Gleam
  ".gleam": "gleam",

  // Typst
  ".typ": "typst",
};

/**
 * Built-in LSP server configurations
 */
export const BUILTIN_SERVERS: LSPServerConfig[] = [
  // TypeScript/JavaScript
  {
    id: "typescript",
    command: ["typescript-language-server", "--stdio"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
  },
  {
    id: "deno",
    command: ["deno", "lsp"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  {
    id: "biome",
    command: ["biome", "lsp-proxy"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },

  // Go
  {
    id: "gopls",
    command: ["gopls"],
    extensions: [".go"],
  },

  // Python
  {
    id: "pyright",
    command: ["pyright-langserver", "--stdio"],
    extensions: [".py", ".pyi"],
  },
  {
    id: "basedpyright",
    command: ["basedpyright-langserver", "--stdio"],
    extensions: [".py", ".pyi"],
  },
  {
    id: "ruff",
    command: ["ruff", "server"],
    extensions: [".py", ".pyi"],
  },

  // Rust
  {
    id: "rust-analyzer",
    command: ["rust-analyzer"],
    extensions: [".rs"],
  },

  // C/C++
  {
    id: "clangd",
    command: ["clangd"],
    extensions: [".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
  },

  // Ruby
  {
    id: "ruby-lsp",
    command: ["ruby-lsp"],
    extensions: [".rb", ".erb"],
  },

  // PHP
  {
    id: "intelephense",
    command: ["intelephense", "--stdio"],
    extensions: [".php"],
  },

  // Bash
  {
    id: "bash-language-server",
    command: ["bash-language-server", "start"],
    extensions: [".sh", ".bash"],
  },

  // YAML
  {
    id: "yaml-language-server",
    command: ["yaml-language-server", "--stdio"],
    extensions: [".yaml", ".yml"],
  },

  // Lua
  {
    id: "lua-language-server",
    command: ["lua-language-server"],
    extensions: [".lua"],
  },

  // Elixir
  {
    id: "elixir-ls",
    command: ["elixir-ls"],
    extensions: [".ex", ".exs"],
  },

  // Zig
  {
    id: "zls",
    command: ["zls"],
    extensions: [".zig"],
  },

  // Haskell
  {
    id: "haskell-language-server",
    command: ["haskell-language-server-wrapper", "--lsp"],
    extensions: [".hs", ".lhs"],
  },

  // Vue
  {
    id: "vue-language-server",
    command: ["vue-language-server", "--stdio"],
    extensions: [".vue"],
  },

  // Svelte
  {
    id: "svelte-language-server",
    command: ["svelteserver", "--stdio"],
    extensions: [".svelte"],
  },

  // CSS
  {
    id: "css-languageserver",
    command: ["css-languageserver", "--stdio"],
    extensions: [".css", ".scss", ".less"],
  },

  // HTML
  {
    id: "html-languageserver",
    command: ["html-languageserver", "--stdio"],
    extensions: [".html", ".htm"],
  },

  // JSON
  {
    id: "json-languageserver",
    command: ["json-languageserver", "--stdio"],
    extensions: [".json", ".jsonc"],
  },

  // Dockerfile
  {
    id: "dockerfile-language-server",
    command: ["docker-langserver", "--stdio"],
    extensions: [".dockerfile"],
  },

  // Terraform
  {
    id: "terraform-ls",
    command: ["terraform-ls", "serve"],
    extensions: [".tf", ".tfvars"],
  },

  // Prisma
  {
    id: "prisma-language-server",
    command: ["prisma-language-server", "--stdio"],
    extensions: [".prisma"],
  },

  // LaTeX
  {
    id: "texlab",
    command: ["texlab"],
    extensions: [".tex", ".bib"],
  },

  // Nix
  {
    id: "nixd",
    command: ["nixd"],
    extensions: [".nix"],
  },

  // OCaml
  {
    id: "ocaml-lsp",
    command: ["ocamllsp"],
    extensions: [".ml", ".mli"],
  },

  // Gleam
  {
    id: "gleam",
    command: ["gleam", "lsp"],
    extensions: [".gleam"],
  },

  // Clojure
  {
    id: "clojure-lsp",
    command: ["clojure-lsp"],
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
  },

  // Dart
  {
    id: "dart-language-server",
    command: ["dart", "language-server", "--protocol=lsp"],
    extensions: [".dart"],
  },

  // Swift
  {
    id: "sourcekit-lsp",
    command: ["sourcekit-lsp"],
    extensions: [".swift"],
  },

  // C#
  {
    id: "csharp-ls",
    command: ["csharp-ls"],
    extensions: [".cs"],
  },

  // Java
  {
    id: "jdtls",
    command: ["jdtls"],
    extensions: [".java"],
  },
];

/**
 * Installation hints for servers
 */
export const LSP_INSTALL_HINTS: Record<string, string> = {
  typescript: "npm install -g typescript-language-server typescript",
  gopls: "go install golang.org/x/tools/gopls@latest",
  pyright: "npm install -g pyright",
  basedpyright: "npm install -g basedpyright",
  ruff: "pip install ruff",
  "rust-analyzer": "rustup component add rust-analyzer",
  clangd: "apt install clangd (or brew install llvm)",
  "ruby-lsp": "gem install ruby-lsp",
  intelephense: "npm install -g intelephense",
  "bash-language-server": "npm install -g bash-language-server",
  "yaml-language-server": "npm install -g yaml-language-server",
  "lua-language-server": "brew install lua-language-server",
  "elixir-ls": "mix escript.install hex elixir_ls",
  zls: "brew install zls (or download from GitHub)",
  "haskell-language-server": "ghcup install hls",
  "vue-language-server": "npm install -g @vue/language-server",
  svelte: "npm install -g svelte-language-server",
  texlab: "cargo install texlab",
  nixd: "nix profile install nixpkgs#nixd",
  "ocaml-lsp": "opam install ocaml-lsp-server",
  gleam: "Install Gleam from https://gleam.run",
  "clojure-lsp": "brew install clojure-lsp/brew/clojure-lsp-native",
  sourcekit: "Included with Xcode",
  jdtls: "Download from Eclipse JDT Language Server",
  biome: "npm install -g @biomejs/biome",
  deno: "Install Deno from https://deno.land",
};

/**
 * Workspace root markers (files that indicate project root)
 */
export const WORKSPACE_ROOT_MARKERS = [
  ".git",
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "pyproject.toml",
  "setup.py",
  "Gemfile",
  "composer.json",
  "mix.exs",
  "deno.json",
  "deno.jsonc",
  "tsconfig.json",
  ".supercode",
  ".opencode",
];

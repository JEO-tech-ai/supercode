import { build } from "esbuild";

const externalPackages = [
  "@clack/prompts",
  "commander",
  "zod",
  "hono",
  "ai",
  "@ai-sdk/openai",
  "@ai-sdk/anthropic",
  "@ai-sdk/google",
];

export async function buildProject() {
  await Promise.all([
    build({
      entryPoints: ["./src/cli/index.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      outfile: "./dist/cli/index.js",
      sourcemap: true,
      external: externalPackages,
      minify: false,
      format: "esm",
      banner: {
        js: "#!/usr/bin/env node",
      },
    }),

    build({
      entryPoints: ["./src/supercoin.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      outfile: "./dist/index.js",
      sourcemap: true,
      external: externalPackages,
      minify: false,
      format: "esm",
    }),
  ]);
}

buildProject();

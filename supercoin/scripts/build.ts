import { build } from "esbuild";

export async function build() {
  await Promise.all([
    build({
      entryPoints: ["./src/cli/index.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      outfile: "./dist/cli/index.js",
      sourcemap: true,
      external: ["@clack/prompts", "commander", "zod", "hono"],
      minify: false,
      format: "esm",
    }),

    build({
      entryPoints: ["./src/supercoin.ts"],
      bundle: true,
      platform: "neutral",
      target: "node18",
      outfile: "./dist/index.js",
      sourcemap: true,
      external: ["@clack/prompts", "commander", "zod", "hono"],
      minify: false,
      format: "esm",
    }),
  ]);
}

let buildProject;
try {
  const esbuildModule = await import("esbuild");
  buildProject = esbuildModule.build;
} catch (error) {
  console.error("esbuild is not installed. Run: npm install");
  process.exit(1);
}

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

async function build() {
  await Promise.all([
    buildProject({
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

    buildProject({
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

build();

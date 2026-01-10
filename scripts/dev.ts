import { $ } from "bun";

await $`bun run build`;

console.log("\n✅ Build complete!");
console.log("\nTo start development:");
console.log("  bun run dev");

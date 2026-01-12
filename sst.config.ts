/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "supercode",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "cloudflare",
    };
  },
  async run() {
    const storage = await import("./infra/storage");
    const api = await import("./infra/api");
    const auth = await import("./infra/auth");
    const web = await import("./infra/console");

    return {
      api: api.apiUrl,
      auth: auth.authUrl,
      console: web.consoleUrl,
    };
  },
});

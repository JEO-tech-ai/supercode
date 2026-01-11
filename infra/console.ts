import { database, sessionStore, fileBucket } from "./storage";
import { allSecrets } from "./secrets";
import { apiWorker } from "./api";
import { authWorker } from "./auth";

export const consoleWorker = new sst.cloudflare.Worker("ConsoleWorker", {
  handler: "./packages/console/app/.output/server/index.mjs",
  link: [
    database,
    sessionStore,
    fileBucket,
    apiWorker,
    authWorker,
    ...allSecrets,
  ],
  url: true,
  assets: {
    path: "./packages/console/app/.output/public",
  },
  environment: {
    NODE_ENV: $app.stage === "production" ? "production" : "development",
    API_URL: apiWorker.url,
    AUTH_URL: authWorker.url,
  },
});

export const consoleUrl = consoleWorker.url;

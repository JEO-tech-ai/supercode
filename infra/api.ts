import { database, sessionStore } from "./storage";
import { allSecrets, jwtSecret } from "./secrets";

export const apiWorker = new sst.cloudflare.Worker("ApiWorker", {
  handler: "./packages/server/src/index.ts",
  link: [database, sessionStore, jwtSecret, ...allSecrets],
  url: true,
  environment: {
    NODE_ENV: $app.stage === "production" ? "production" : "development",
  },
});

export const apiUrl = apiWorker.url;

import { database, sessionStore } from "./storage";
import { githubClientId, githubClientSecret, jwtSecret } from "./secrets";

export const authWorker = new sst.cloudflare.Worker("AuthWorker", {
  handler: "./packages/auth/src/worker.ts",
  link: [database, sessionStore, githubClientId, githubClientSecret, jwtSecret],
  url: true,
  environment: {
    NODE_ENV: $app.stage === "production" ? "production" : "development",
    GITHUB_CLIENT_ID: githubClientId.value,
    GITHUB_CLIENT_SECRET: githubClientSecret.value,
    JWT_SECRET: jwtSecret.value,
  },
});

export const authUrl = authWorker.url;

import { Hono } from "hono";
import { createAuthRouter } from "./index";

type Bindings = {
  Database: D1Database;
  SessionStore: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.route("/auth", createAuthRouter());

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;

import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@supercoin/database/schema";

type Bindings = {
  Database: D1Database;
  SessionStore: KVNamespace;
};

type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://supercoin.ai"],
    credentials: true,
  })
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("*", async (c, next) => {
  const db = drizzle(c.env.Database, { schema });
  c.set("db", db);
  await next();
});

app.get("/api/users", async (c) => {
  const db = c.get("db");
  const users = await db.query.users.findMany({
    limit: 10,
  });
  return c.json(users);
});

app.get("/api/sessions", async (c) => {
  const db = c.get("db");
  const sessions = await db.query.sessions.findMany({
    limit: 10,
    orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
  });
  return c.json(sessions);
});

app.get("/api/models", (c) => {
  return c.json({
    providers: [
      {
        id: "anthropic",
        name: "Anthropic",
        models: ["claude-sonnet-4", "claude-3.5-sonnet", "claude-3.5-haiku"],
      },
      {
        id: "openai",
        name: "OpenAI",
        models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"],
      },
      {
        id: "google",
        name: "Google",
        models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
      },
    ],
  });
});

export default app;

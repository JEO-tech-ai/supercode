import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

export type DatabaseClient = ReturnType<typeof createClient>;

export function createClient(path: string = ":memory:") {
  const sqlite = new Database(path);
  return drizzle(sqlite, { schema });
}

let localDb: DatabaseClient | null = null;

export function getLocalDb(
  path: string = "./.data/supercoin.db"
): DatabaseClient {
  if (!localDb) {
    localDb = createClient(path);
  }
  return localDb;
}

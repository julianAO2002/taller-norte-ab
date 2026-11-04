import { Pool } from "pg";

/** One pool per server process, reused across hot reloads in development. */
const globalForDb = globalThis as unknown as { experimentPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.experimentPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForDb.experimentPool = new Pool({ connectionString, max: 5 });
  }
  return globalForDb.experimentPool;
}

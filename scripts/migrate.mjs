// Applies db/schema.sql. Idempotent: safe to run on every start.
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url });

for (let attempt = 1; ; attempt++) {
  try {
    await client.connect();
    break;
  } catch (error) {
    if (attempt >= 10) throw error;
    console.log(`database not ready (attempt ${attempt}), retrying...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

try {
  await client.query(sql);
  console.log("schema applied");
} finally {
  await client.end();
}

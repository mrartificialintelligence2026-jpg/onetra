import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const text = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function statements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("--"));
}

loadEnvLocal();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);
const migration = readFileSync(join(root, "migrations", "001_init.sql"), "utf8");
for (const statement of statements(migration)) {
  if (typeof sql.query === "function") await sql.query(statement, []);
  else await sql(statement);
}

const tables = typeof sql.query === "function"
  ? await sql.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    [],
  )
  : await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
const names = (Array.isArray(tables) ? tables : tables.rows || []).map((row) => row.tablename);
const required = [
  "reviewers",
  "validation_sessions",
  "validation_cases",
  "validation_runs",
  "reviewer_feedback",
  "analysis_rate_events",
  "schema_migrations",
];
const missing = required.filter((name) => !names.includes(name));
if (missing.length) {
  console.error("migration incomplete; missing tables:", missing.join(","));
  process.exit(1);
}
console.log("ledger migration applied:", required.join(","));

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";
import { createNeonDb } from "../api/_lib/db.js";
import { createRouter } from "../api/_lib/router.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  let value = trimmed.slice(eq + 1);
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  const key = trimmed.slice(0, eq);
  if (!process.env[key]) process.env[key] = value;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const SECRET = "phase2-test-secret-not-for-production";
process.env.ONETRA_AUTH_TEST_SECRET = SECRET;
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test.apps.googleusercontent.com";
process.env.ONETRA_ADMIN_EMAILS = process.env.ONETRA_ADMIN_EMAILS || "contact@onetra.health";

const db = createNeonDb(process.env.DATABASE_URL);
const tables = await db.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
);
const names = tables.rows.map((row) => row.tablename);
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
  console.error("missing tables", missing.join(","));
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const token = await new SignJWT({
  iss: "https://accounts.google.com",
  aud: process.env.GOOGLE_CLIENT_ID,
  sub: "neon-smoke-sub",
  email: "smoke@example.com",
  email_verified: true,
  name: "Neon Smoke",
  exp: now + 3600,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt(now)
  .setExpirationTime(now + 3600)
  .sign(new TextEncoder().encode(SECRET));

const route = createRouter({ db });
function req(path, { method = "GET", body } = {}) {
  return new Request(`http://127.0.0.1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const session = await route(req("/api/auth/session"));
if (session.status !== 200) {
  console.error("session failed", session.status, session.body);
  process.exit(1);
}
const profile = await route(req("/api/auth/profile", {
  method: "POST",
  body: { display_name: "Smoke", reviewer_type: "researcher" },
}));
const consent = await route(req("/api/auth/consent", { method: "POST", body: { accepted: true } }));
const started = await route(req("/api/ledger/session", { method: "POST", body: {} }));
const match = await route(req("/api/ledger/run", {
  method: "POST",
  body: {
    session_id: started.body.session.id,
    intake: { cancer_type: "Non-Small Cell Lung Cancer", stage: "IV", line_of_therapy: "1L", biomarkers: ["MET_EX14_SKIP"], age: 65, ecog: "1" },
    d1_status: "MATCH",
    matched_regimen: "Tepotinib",
    source_identifiers: ["FDA-label"],
    d2_evidence_identifiers: ["FDA-label"],
    d3_status: "SILENCE",
    d3_silence_status: "No clinical document uploaded.",
  },
}));
const feedback = await route(req("/api/ledger/feedback", {
  method: "POST",
  body: {
    run_id: match.body.run.id,
    clinically_correct: "yes",
    recommendation_usefulness: 5,
    evidence_usefulness: 4,
    abstention_appropriate: "not_applicable",
    requires_correction_before_clinical_use: false,
  },
}));
const counts = await db.query("SELECT COUNT(*)::int AS n FROM validation_runs");
console.log(JSON.stringify({
  neon_tables: required.length,
  session: session.status,
  profile: profile.status,
  consent: consent.status,
  ledger_session: started.status,
  match_run: match.status,
  d1: match.body?.run?.d1_status,
  feedback: feedback.status,
  run_rows: counts.rows[0]?.n,
}));

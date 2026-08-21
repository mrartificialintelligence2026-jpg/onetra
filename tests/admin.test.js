import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";
import { createMemoryDb } from "../api/_lib/db.js";
import { createRouter } from "../api/_lib/router.js";

const SECRET = "phase2-test-secret-not-for-production";
const CLIENT_ID = "test-google-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
process.env.ONETRA_AUTH_TEST_SECRET = SECRET;
process.env.ONETRA_ADMIN_EMAILS = "admin@onetra.health";

const key = new TextEncoder().encode(SECRET);

async function token(sub, email) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub,
    email,
    email_verified: true,
    name: email,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

function request(path, { method = "GET", body, bearer } = {}) {
  const headers = { "content-type": "application/json" };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new Request(`http://127.0.0.1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const db = createMemoryDb();
const route = createRouter({ db });
const userTok = await token("sub-user", "reviewer@example.com");
const adminTok = await token("sub-admin", "admin@onetra.health");

await route(request("/api/auth/session", { bearer: userTok }));
await route(request("/api/auth/profile", { method: "POST", bearer: userTok, body: { reviewer_type: "researcher", display_name: "User" } }));
const created = await route(request("/api/ledger/session", { method: "POST", bearer: userTok, body: {} }));
await route(request("/api/ledger/run", {
  method: "POST",
  bearer: userTok,
  body: {
    session_id: created.body.session.id,
    intake: { cancer_type: "Breast Cancer", stage: "IV", line_of_therapy: "1L", biomarkers: [], age: 70 },
    d1_status: "ABSTAIN",
  },
}));

const blocked = await route(request("/api/admin/summary", { bearer: userTok }));
assert.equal(blocked.status, 403);

await route(request("/api/auth/session", { bearer: adminTok }));
const summary = await route(request("/api/admin/summary", { bearer: adminTok }));
assert.equal(summary.status, 200);
assert.equal(summary.body.reviewer_count >= 2, true);
assert.equal(summary.body.run_count >= 1, true);
assert.equal(summary.body.abstain_count >= 1, true);
assert.equal(JSON.stringify(summary.body).includes("reviewer@example.com"), false);

const runId = summary.body.recent_runs[0].id;
const detail = await route(request(`/api/admin/run?id=${runId}`, { bearer: adminTok }));
assert.equal(detail.status, 200);
assert.equal(detail.body.d1_status, "ABSTAIN");
assert.equal(detail.body.reviewer.type, "researcher");
assert.equal(JSON.stringify(detail.body).includes("reviewer@example.com"), false);

console.log("admin tests passed");

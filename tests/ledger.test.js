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
process.env.ANALYSIS_RATE_LIMIT_MAX = "3";
process.env.ANALYSIS_RATE_LIMIT_WINDOW_SECONDS = "3600";

const key = new TextEncoder().encode(SECRET);

async function token(sub, email) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub,
    email,
    email_verified: true,
    name: "Reviewer",
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
const bearer = await token("sub-reviewer", "reviewer@example.com");

const sessionRes = await route(request("/api/auth/session", { bearer }));
assert.equal(sessionRes.status, 200);

const badProfile = await route(request("/api/auth/profile", { method: "POST", bearer, body: { reviewer_type: "verified_oncologist" } }));
assert.equal(badProfile.status, 400);

const profile = await route(request("/api/auth/profile", {
  method: "POST",
  bearer,
  body: { display_name: "Dr Reviewer", reviewer_type: "oncologist", specialty: "thoracic", institution: "Test Center", country: "US" },
}));
assert.equal(profile.status, 200);
assert.equal(profile.body.reviewer.profile_complete, true);
assert.equal(profile.body.reviewer.reviewer_verification_status, "unverified");

const consent = await route(request("/api/auth/consent", { method: "POST", bearer, body: { accepted: true } }));
assert.equal(consent.status, 200);
assert.equal(consent.body.reviewer.consent_complete, true);

const session = await route(request("/api/ledger/session", { method: "POST", bearer, body: {} }));
assert.equal(session.status, 201);
const sessionId = session.body.session.id;

const matchRun = await route(request("/api/ledger/run", {
  method: "POST",
  bearer,
  body: {
    session_id: sessionId,
    intake: { cancer_type: "Non-Small Cell Lung Cancer", stage: "IV", line_of_therapy: "1L", biomarkers: ["MET_EX14_SKIP"], ecog: "1", age: 65 },
    d1_status: "MATCH",
    d1_rule_id: "NSCLC-006B",
    matched_regimen: "Tepotinib",
    reasons: "Matched MET ex14",
    source_identifiers: ["FDA-label"],
    d2_evidence_identifiers: ["FDA-label"],
    d3_status: "SILENCE",
    d3_silence_status: "No clinical document uploaded.",
    document_meta: { files: [{ file_type: "text/plain", byte_size: 12, sha256: "abc", deidentify_ack: true }], raw_text: "SHOULD_NOT_PERSIST" },
  },
}));
assert.equal(matchRun.status, 201);
assert.equal(matchRun.body.run.d1_status, "MATCH");
assert.equal(JSON.stringify(matchRun.body.run.document_meta || matchRun.body).includes("SHOULD_NOT_PERSIST"), false);

const abstainRun = await route(request("/api/ledger/run", {
  method: "POST",
  bearer,
  body: {
    session_id: sessionId,
    intake: { cancer_type: "NSCLC", stage: "I", line_of_therapy: "1L", biomarkers: [], ecog: "1", age: 65 },
    d1_status: "ABSTAIN",
    d2_evidence_identifiers: [],
    d3_status: "SILENCE",
    d3_silence_status: "SILENCE",
  },
}));
assert.equal(abstainRun.status, 201);
assert.equal(abstainRun.body.run.d1_status, "ABSTAIN");

const feedback = await route(request("/api/ledger/feedback", {
  method: "POST",
  bearer,
  body: {
    run_id: matchRun.body.run.id,
    clinically_correct: "yes",
    recommendation_usefulness: 5,
    evidence_usefulness: 4,
    abstention_appropriate: "not_applicable",
    comments: "Looks correct for this synthetic case.",
    requires_correction_before_clinical_use: false,
  },
}));
assert.equal(feedback.status, 201);
assert.equal(feedback.body.feedback.clinically_correct, "yes");

const p1 = await route(request("/api/ledger/preflight", { method: "POST", bearer, body: {} }));
const p2 = await route(request("/api/ledger/preflight", { method: "POST", bearer, body: {} }));
const p3 = await route(request("/api/ledger/preflight", { method: "POST", bearer, body: {} }));
const p4 = await route(request("/api/ledger/preflight", { method: "POST", bearer, body: {} }));
assert.equal(p1.status, 200);
assert.equal(p2.status, 200);
assert.equal(p3.status, 200);
assert.equal(p4.status, 429);

const down = createRouter({
  db: {
    async query() { throw Object.assign(new Error("connection refused"), { status: 503, code: "database_unavailable" }); },
  },
});
const dbFail = await down(request("/api/auth/session", { bearer }));
assert.equal(dbFail.status, 503);
assert.doesNotMatch(JSON.stringify(dbFail.body), /connection refused|DATABASE_URL/i);

console.log("ledger tests passed");

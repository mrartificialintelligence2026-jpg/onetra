import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";
import { createMemoryDb, migrationSql } from "../api/_lib/db.js";
import { verifyGoogleIdToken } from "../api/_lib/google.js";
import { createRouter } from "../api/_lib/router.js";

const SECRET = "phase2-test-secret-not-for-production";
const CLIENT_ID = "test-google-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
process.env.ONETRA_AUTH_TEST_SECRET = SECRET;
process.env.ONETRA_ADMIN_EMAILS = "admin@onetra.health";

const key = new TextEncoder().encode(SECRET);

async function token(claims, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: extra.iss || "https://accounts.google.com",
    aud: extra.aud || CLIENT_ID,
    sub: claims.sub || "google-sub-1",
    email: claims.email || "reviewer@example.com",
    email_verified: claims.email_verified !== false,
    name: claims.name || "Reviewer One",
    exp: extra.exp || now + 3600,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(extra.exp || now + 3600)
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

const sql = migrationSql();
assert.match(sql, /PRIMARY KEY/);
assert.match(sql, /google_sub TEXT NOT NULL UNIQUE/);
assert.match(sql, /REFERENCES reviewers/);
assert.match(sql, /REFERENCES validation_sessions/);
assert.match(sql, /REFERENCES validation_runs/);
assert.match(sql, /CREATE INDEX/);
assert.doesNotMatch(sql, /raw_text|file_bytes|document_text/i);

const valid = await token({});
const identity = await verifyGoogleIdToken(valid);
assert.equal(identity.sub, "google-sub-1");
assert.equal(identity.email, "reviewer@example.com");

await assert.rejects(() => verifyGoogleIdToken(""), { code: "missing_token" });
await assert.rejects(() => verifyGoogleIdToken("not-a-jwt"), { code: "malformed_token" });
const wrongAud = await token({}, { aud: "wrong-client" });
const wrongIss = await token({}, { iss: "https://evil.example" });
const expired = await token({}, { exp: Math.floor(Date.now() / 1000) - 30 });
await assert.rejects(() => verifyGoogleIdToken(wrongAud), { status: 401 });
await assert.rejects(() => verifyGoogleIdToken(wrongIss), { code: "wrong_issuer" });
await assert.rejects(() => verifyGoogleIdToken(expired), { code: "expired_token" });

const db = createMemoryDb();
const route = createRouter({ db });

const noToken = await route(request("/api/auth/session"));
assert.equal(noToken.status, 401);

const bad = await route(request("/api/auth/session", { bearer: "aaa.bbb.ccc" }));
assert.equal(bad.status, 401);

const session = await route(request("/api/auth/session", { bearer: valid }));
assert.equal(session.status, 200);
assert.equal(session.body.reviewer.id.length > 10, true);
assert.equal(session.body.reviewer.profile_complete, false);
assert.equal(session.body.reviewer.consent_complete, false);
assert.equal(session.body.reviewer.is_admin, false);
assert.match(session.body.reviewer.identity_note, /self-declared/i);

const again = await route(request("/api/auth/session", { bearer: valid }));
assert.equal(again.body.reviewer.id, session.body.reviewer.id);

console.log("auth tests passed");

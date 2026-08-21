import { APP_VERSION, CORPUS_IDENTIFIER, TERMS_VERSION, isAdminEmail } from "./config.js";
import { getDb } from "./db.js";
import { verifyGoogleIdToken } from "./google.js";
import { json, publicError, readBearer, readJson } from "./http.js";
import {
  adminRun,
  adminSummary,
  checkAndConsumeRateLimit,
  createSession,
  publicReviewer,
  recordFeedback,
  recordRun,
  saveConsent,
  saveProfile,
  upsertReviewer,
} from "./ledger.js";

export function createRouter({ db, verify = verifyGoogleIdToken } = {}) {
  const database = db || getDb();

  async function identityFrom(request) {
    const token = readBearer(request);
    return verify(token);
  }

  async function withReviewer(request) {
    const identity = await identityFrom(request);
    try {
      const reviewer = await upsertReviewer(database, identity);
      return { identity, reviewer };
    } catch (error) {
      if (error.code === "database_unavailable" || error.status === 503) throw error;
      const wrapped = new Error("The validation ledger is temporarily unavailable.");
      wrapped.status = 503;
      wrapped.code = "database_unavailable";
      throw wrapped;
    }
  }

  return async function route(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = request.method.toUpperCase();

    try {
      if (method === "OPTIONS") return json(204, {});

      if (method === "GET" && path === "/api/auth/session") {
        const { identity, reviewer } = await withReviewer(request);
        return json(200, {
          reviewer: publicReviewer(reviewer, identity.email || reviewer.email),
          terms_version: TERMS_VERSION,
          app_version: APP_VERSION,
          corpus_identifier: CORPUS_IDENTIFIER,
        });
      }

      if (method === "POST" && path === "/api/auth/profile") {
        const { identity, reviewer } = await withReviewer(request);
        const body = await readJson(request);
        const saved = await saveProfile(database, reviewer.id, body);
        return json(200, { reviewer: publicReviewer(saved, identity.email || saved.email) });
      }

      if (method === "POST" && path === "/api/auth/consent") {
        const { identity, reviewer } = await withReviewer(request);
        const saved = await saveConsent(database, reviewer.id);
        return json(200, { reviewer: publicReviewer(saved, identity.email || saved.email), terms_version: TERMS_VERSION });
      }

      if (method === "POST" && path === "/api/ledger/session") {
        const { reviewer } = await withReviewer(request);
        const body = await readJson(request).catch(() => ({}));
        const session = await createSession(database, reviewer.id, body || {});
        return json(201, { session });
      }

      if (method === "POST" && path === "/api/ledger/preflight") {
        const { reviewer } = await withReviewer(request);
        const limit = await checkAndConsumeRateLimit(database, reviewer.id);
        return json(200, { ok: true, rate_limit: limit });
      }

      if (method === "POST" && path === "/api/ledger/run") {
        const { reviewer } = await withReviewer(request);
        const body = await readJson(request);
        const recorded = await recordRun(database, reviewer.id, body);
        return json(201, recorded);
      }

      if (method === "POST" && path === "/api/ledger/feedback") {
        const { reviewer } = await withReviewer(request);
        const body = await readJson(request);
        const feedback = await recordFeedback(database, reviewer.id, body);
        return json(201, { feedback });
      }

      if (method === "GET" && path === "/api/admin/summary") {
        const { identity, reviewer } = await withReviewer(request);
        if (!isAdminEmail(identity.email || reviewer.email)) {
          return publicError(403, "Administrator access is required.", "forbidden");
        }
        return json(200, await adminSummary(database));
      }

      if (method === "GET" && path === "/api/admin/run") {
        const { identity, reviewer } = await withReviewer(request);
        if (!isAdminEmail(identity.email || reviewer.email)) {
          return publicError(403, "Administrator access is required.", "forbidden");
        }
        const id = url.searchParams.get("id");
        if (!id) return publicError(400, "Run id is required.", "invalid_request");
        return json(200, await adminRun(database, id));
      }

      return publicError(404, "Not found.", "not_found");
    } catch (error) {
      const status = error.status || 500;
      const publicByCode = {
        database_unavailable: "The validation ledger is temporarily unavailable.",
        rate_limited: "Analysis rate limit reached. Try again later.",
      };
      const message = error.publicMessage
        || publicByCode[error.code]
        || (status >= 500 ? "The validation service is temporarily unavailable." : (error.message || "Request failed."));
      return publicError(status, message, error.code || "error");
    }
  };
}

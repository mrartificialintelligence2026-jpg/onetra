import { APP_VERSION, CORPUS_IDENTIFIER, REVIEWER_TYPES, TERMS_VERSION, isAdminEmail, rateLimitConfig } from "./config.js";
import { databaseUnavailable } from "./db.js";

function asJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

export function publicReviewer(row, email) {
  return {
    id: row.id,
    email: email || row.email || "",
    display_name: row.display_name || "",
    reviewer_type: row.reviewer_type || "",
    specialty: row.specialty || "",
    institution: row.institution || "",
    country: row.country || "",
    reviewer_verification_status: row.reviewer_verification_status || "unverified",
    profile_complete: Boolean(row.profile_completed_at && row.reviewer_type),
    consent_complete: Boolean(row.consent_at && row.consent_version === TERMS_VERSION),
    consent_version: row.consent_version || null,
    is_admin: isAdminEmail(email || row.email),
    identity_note: "Reviewer type is self-declared unless independently verified.",
  };
}

export async function upsertReviewer(db, identity) {
  const result = await db.query(
    `INSERT INTO reviewers (google_sub, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_sub) DO UPDATE SET
       email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE reviewers.email END,
       display_name = CASE WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE reviewers.display_name END,
       last_login_at = now()
     RETURNING *`,
    [identity.sub, identity.email || "", identity.name || ""],
  );
  return result.rows[0];
}

export async function getReviewerById(db, id) {
  const result = await db.query("SELECT * FROM reviewers WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function saveProfile(db, reviewerId, body) {
  const type = String(body.reviewer_type || "");
  if (!REVIEWER_TYPES.includes(type)) {
    const error = new Error("Select a reviewer type.");
    error.status = 400;
    error.code = "invalid_profile";
    throw error;
  }
  const result = await db.query(
    `UPDATE reviewers
     SET reviewer_type = $1,
         specialty = $2,
         institution = $3,
         country = $4,
         display_name = COALESCE(NULLIF($5, ''), display_name),
         profile_completed_at = now()
     WHERE id = $6
     RETURNING *`,
    [
      type,
      String(body.specialty || "").slice(0, 200) || null,
      String(body.institution || "").slice(0, 200) || null,
      String(body.country || "").slice(0, 80) || null,
      String(body.display_name || "").slice(0, 200),
      reviewerId,
    ],
  );
  return result.rows[0];
}

export async function saveConsent(db, reviewerId) {
  const result = await db.query(
    `UPDATE reviewers
     SET consent_version = $1, consent_at = now()
     WHERE id = $2
     RETURNING *`,
    [TERMS_VERSION, reviewerId],
  );
  return result.rows[0];
}

export async function createSession(db, reviewerId, extras = {}) {
  const result = await db.query(
    `INSERT INTO validation_sessions (reviewer_id, app_version, backend_version, corpus_identifier)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reviewerId, extras.app_version || APP_VERSION, extras.backend_version || null, extras.corpus_identifier || CORPUS_IDENTIFIER],
  );
  return result.rows[0];
}

export async function assertSessionOwner(db, sessionId, reviewerId) {
  const result = await db.query(
    "SELECT * FROM validation_sessions WHERE id = $1 AND reviewer_id = $2",
    [sessionId, reviewerId],
  );
  const row = result.rows[0];
  if (!row) {
    const error = new Error("Validation session was not found.");
    error.status = 404;
    error.code = "session_not_found";
    throw error;
  }
  return row;
}

export async function recordRun(db, reviewerId, body) {
  const session = await assertSessionOwner(db, body.session_id, reviewerId);
  const d1 = String(body.d1_status || "").toUpperCase();
  if (!["MATCH", "ABSTAIN", "ERROR"].includes(d1)) {
    const error = new Error("d1_status must be MATCH, ABSTAIN, or ERROR.");
    error.status = 400;
    error.code = "invalid_run";
    throw error;
  }
  const intake = body.intake || {};
  const documentMeta = sanitizeDocumentMeta(body.document_meta);
  const caseRow = (await db.query(
    `INSERT INTO validation_cases (
       session_id, cancer_type, stage, line_of_therapy, biomarkers, ecog, age, histology, prior_therapy, extra_predicates
     ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10::jsonb)
     RETURNING *`,
    [
      session.id,
      intake.cancer_type || null,
      intake.stage || null,
      intake.line_of_therapy || null,
      JSON.stringify(Array.isArray(intake.biomarkers) ? intake.biomarkers : []),
      intake.ecog || null,
      Number.isInteger(intake.age) ? intake.age : null,
      intake.histology || null,
      JSON.stringify(Array.isArray(intake.prior_therapy) ? intake.prior_therapy : []),
      JSON.stringify(intake.extra_predicates && typeof intake.extra_predicates === "object" ? intake.extra_predicates : {}),
    ],
  )).rows[0];

  const run = (await db.query(
    `INSERT INTO validation_runs (
       case_id, session_id, reviewer_id, d1_status, d1_rule_id, matched_regimen, reasons,
       source_identifiers, d2_evidence_identifiers, d3_status, d3_silence_status,
       runtime_state, error_state, latency_ms, app_version, backend_version, corpus_identifier, document_meta
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb
     ) RETURNING *`,
    [
      caseRow.id,
      session.id,
      reviewerId,
      d1,
      body.d1_rule_id || null,
      body.matched_regimen || null,
      body.reasons || null,
      JSON.stringify(Array.isArray(body.source_identifiers) ? body.source_identifiers : []),
      JSON.stringify(Array.isArray(body.d2_evidence_identifiers) ? body.d2_evidence_identifiers : []),
      body.d3_status || null,
      body.d3_silence_status || null,
      body.runtime_state || null,
      body.error_state || null,
      Number.isInteger(body.latency_ms) ? body.latency_ms : null,
      body.app_version || APP_VERSION,
      body.backend_version || null,
      body.corpus_identifier || CORPUS_IDENTIFIER,
      documentMeta ? JSON.stringify(documentMeta) : null,
    ],
  )).rows[0];

  return { case: caseRow, run };
}

function sanitizeDocumentMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  const files = Array.isArray(meta.files) ? meta.files : [meta];
  const clean = files.slice(0, 8).map((file) => ({
    file_type: String(file.file_type || file.type || "").slice(0, 40),
    byte_size: Number.isFinite(Number(file.byte_size ?? file.size)) ? Number(file.byte_size ?? file.size) : null,
    sha256: String(file.sha256 || "").slice(0, 64) || null,
    extract_ok: file.extract_ok === true || file.extract_ok === false ? file.extract_ok : null,
    deidentify_ack: file.deidentify_ack === true,
  }));
  if (JSON.stringify(meta).toLowerCase().includes("raw_text") || meta.raw_text || meta.content) {
    return { files: clean, raw_omitted: true };
  }
  return { files: clean };
}

export async function recordFeedback(db, reviewerId, body) {
  const runId = body.run_id;
  const owned = await db.query(
    "SELECT id FROM validation_runs WHERE id = $1 AND reviewer_id = $2",
    [runId, reviewerId],
  );
  if (!owned.rows[0]) {
    const error = new Error("Validation run was not found.");
    error.status = 404;
    error.code = "run_not_found";
    throw error;
  }
  const allowedCorrect = ["yes", "partially", "no", "unable_to_judge"];
  const allowedAbstain = ["yes", "no", "not_applicable"];
  const correct = String(body.clinically_correct || "");
  if (!allowedCorrect.includes(correct)) {
    const error = new Error("Select whether the output was clinically correct.");
    error.status = 400;
    error.code = "invalid_feedback";
    throw error;
  }
  const recUse = Number(body.recommendation_usefulness);
  const evUse = Number(body.evidence_usefulness);
  if (!Number.isInteger(recUse) || recUse < 1 || recUse > 5 || !Number.isInteger(evUse) || evUse < 1 || evUse > 5) {
    const error = new Error("Usefulness scores must be integers from 1 to 5.");
    error.status = 400;
    error.code = "invalid_feedback";
    throw error;
  }
  const abstain = String(body.abstention_appropriate || "");
  if (!allowedAbstain.includes(abstain)) {
    const error = new Error("Select whether abstention was appropriate.");
    error.status = 400;
    error.code = "invalid_feedback";
    throw error;
  }
  const result = await db.query(
    `INSERT INTO reviewer_feedback (
       run_id, reviewer_id, clinically_correct, recommendation_usefulness, evidence_usefulness,
       abstention_appropriate, missing_clinical_factor, clinical_error_category, comments,
       requires_correction_before_clinical_use
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      runId,
      reviewerId,
      correct,
      recUse,
      evUse,
      abstain,
      String(body.missing_clinical_factor || "").slice(0, 500) || null,
      String(body.clinical_error_category || "").slice(0, 120) || null,
      String(body.comments || "").slice(0, 4000) || null,
      body.requires_correction_before_clinical_use === true,
    ],
  );
  return result.rows[0];
}

export async function checkAndConsumeRateLimit(db, reviewerId) {
  const { max, windowSeconds } = rateLimitConfig();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const counted = await db.query(
    "SELECT COUNT(*)::int AS n FROM analysis_rate_events WHERE reviewer_id = $1 AND created_at >= $2",
    [reviewerId, since],
  );
  const used = Number(counted.rows[0]?.n || 0);
  if (used >= max) {
    const error = new Error("Analysis rate limit reached. Try again later.");
    error.status = 429;
    error.code = "rate_limited";
    error.retry_after = windowSeconds;
    throw error;
  }
  await db.query("INSERT INTO analysis_rate_events (reviewer_id) VALUES ($1)", [reviewerId]);
  return { used: used + 1, max, window_seconds: windowSeconds };
}

export async function adminSummary(db) {
  const totals = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM reviewers) AS reviewer_count,
       (SELECT COUNT(*)::int FROM validation_runs) AS run_count,
       (SELECT COUNT(DISTINCT cancer_type)::int FROM validation_cases WHERE cancer_type IS NOT NULL AND cancer_type <> '') AS cancer_types,
       (SELECT COUNT(*)::int FROM validation_runs WHERE d1_status = 'MATCH') AS match_count,
       (SELECT COUNT(*)::int FROM validation_runs WHERE d1_status = 'ABSTAIN') AS abstain_count,
       (SELECT COUNT(*)::int FROM validation_runs WHERE d1_status = 'ERROR') AS error_count,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE clinically_correct = 'yes') AS clinically_correct_yes,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE clinically_correct = 'partially') AS clinically_correct_partial,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE clinically_correct = 'no') AS clinically_correct_no,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE clinically_correct = 'unable_to_judge') AS clinically_correct_unable,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE evidence_usefulness <= 2) AS evidence_complaints,
       (SELECT COUNT(*)::int FROM reviewer_feedback WHERE clinically_correct = 'no' OR requires_correction_before_clinical_use = true) AS unresolved_errors`,
  );
  const row = totals.rows[0] || {};
  const judgeable = Number(row.clinically_correct_yes || 0) + Number(row.clinically_correct_partial || 0) + Number(row.clinically_correct_no || 0);
  const correctness = judgeable ? Math.round((Number(row.clinically_correct_yes || 0) / judgeable) * 1000) / 10 : null;
  const rules = await db.query(
    `SELECT COALESCE(NULLIF(vr.d1_rule_id, ''), NULLIF(vr.matched_regimen, ''), 'unspecified') AS rule_key,
            COUNT(*)::int AS tested,
            COUNT(*) FILTER (
              WHERE rf.clinically_correct = 'no' OR rf.requires_correction_before_clinical_use = true
            )::int AS negative
     FROM validation_runs vr
     LEFT JOIN reviewer_feedback rf ON rf.run_id = vr.id
     GROUP BY 1
     ORDER BY tested DESC
     LIMIT 25`,
  );
  const recent = await db.query(
    `SELECT vr.id, vr.response_at, vr.d1_status, vr.d1_rule_id, vr.matched_regimen,
            vc.cancer_type, vc.stage, r.reviewer_type, rf.clinically_correct
     FROM validation_runs vr
     JOIN validation_cases vc ON vc.id = vr.case_id
     JOIN reviewers r ON r.id = vr.reviewer_id
     LEFT JOIN reviewer_feedback rf ON rf.run_id = vr.id
     ORDER BY vr.response_at DESC
     LIMIT 50`,
  );
  return {
    reviewer_count: Number(row.reviewer_count || 0),
    run_count: Number(row.run_count || 0),
    cancer_types: Number(row.cancer_types || 0),
    match_count: Number(row.match_count || 0),
    abstain_count: Number(row.abstain_count || 0),
    error_count: Number(row.error_count || 0),
    clinically_correct_yes: Number(row.clinically_correct_yes || 0),
    clinically_correct_partial: Number(row.clinically_correct_partial || 0),
    clinically_correct_no: Number(row.clinically_correct_no || 0),
    clinically_correct_unable: Number(row.clinically_correct_unable || 0),
    correctness_pct: correctness,
    evidence_complaints: Number(row.evidence_complaints || 0),
    unresolved_errors: Number(row.unresolved_errors || 0),
    rules_tested: rules.rows,
    recent_runs: recent.rows,
  };
}

export async function adminRun(db, runId) {
  const result = await db.query(
    `SELECT vr.*, vc.cancer_type, vc.stage, vc.line_of_therapy, vc.biomarkers, vc.ecog, vc.age,
            vc.histology, vc.prior_therapy, vc.extra_predicates, vc.request_at,
            r.reviewer_type, r.reviewer_verification_status, r.country,
            rf.clinically_correct, rf.recommendation_usefulness, rf.evidence_usefulness,
            rf.abstention_appropriate, rf.missing_clinical_factor, rf.clinical_error_category,
            rf.comments, rf.requires_correction_before_clinical_use, rf.submitted_at AS feedback_at
     FROM validation_runs vr
     JOIN validation_cases vc ON vc.id = vr.case_id
     JOIN reviewers r ON r.id = vr.reviewer_id
     LEFT JOIN reviewer_feedback rf ON rf.run_id = vr.id
     WHERE vr.id = $1`,
    [runId],
  );
  const row = result.rows[0];
  if (!row) {
    const error = new Error("Validation run was not found.");
    error.status = 404;
    error.code = "run_not_found";
    throw error;
  }
  return {
    id: row.id,
    response_at: row.response_at,
    request_at: row.request_at,
    d1_status: row.d1_status,
    d1_rule_id: row.d1_rule_id,
    matched_regimen: row.matched_regimen,
    reasons: row.reasons,
    source_identifiers: asJson(row.source_identifiers, []),
    d2_evidence_identifiers: asJson(row.d2_evidence_identifiers, []),
    d3_status: row.d3_status,
    d3_silence_status: row.d3_silence_status,
    runtime_state: row.runtime_state,
    error_state: row.error_state,
    latency_ms: row.latency_ms,
    app_version: row.app_version,
    backend_version: row.backend_version,
    corpus_identifier: row.corpus_identifier,
    document_meta: asJson(row.document_meta, null),
    intake: {
      cancer_type: row.cancer_type,
      stage: row.stage,
      line_of_therapy: row.line_of_therapy,
      biomarkers: asJson(row.biomarkers, []),
      ecog: row.ecog,
      age: row.age,
      histology: row.histology,
      prior_therapy: asJson(row.prior_therapy, []),
      extra_predicates: asJson(row.extra_predicates, {}),
    },
    reviewer: {
      type: row.reviewer_type,
      verification_status: row.reviewer_verification_status,
      country: row.country,
    },
    feedback: row.clinically_correct
      ? {
          clinically_correct: row.clinically_correct,
          recommendation_usefulness: row.recommendation_usefulness,
          evidence_usefulness: row.evidence_usefulness,
          abstention_appropriate: row.abstention_appropriate,
          missing_clinical_factor: row.missing_clinical_factor,
          clinical_error_category: row.clinical_error_category,
          comments: row.comments,
          requires_correction_before_clinical_use: row.requires_correction_before_clinical_use,
          submitted_at: row.feedback_at,
        }
      : null,
  };
}

export { databaseUnavailable };

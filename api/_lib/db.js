import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = join(root, "migrations", "001_init.sql");

export function databaseUnavailable() {
  const error = new Error("The validation ledger is temporarily unavailable.");
  error.status = 503;
  error.code = "database_unavailable";
  return error;
}

export function wrapExecutor(query) {
  return {
    async query(text, params = []) {
      return query(text, params);
    },
    async exec(text) {
      return query(text, []);
    },
  };
}

export function createNeonDb(url) {
  if (!url) throw databaseUnavailable();
  return {
    kind: "neon",
    async query(text, params = []) {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(url);
      if (typeof sql.query === "function") {
        const result = await sql.query(text, params);
        return { rows: Array.isArray(result) ? result : result?.rows || [] };
      }
      const result = await sql(text, params);
      return { rows: Array.isArray(result) ? result : [] };
    },
    async exec(text) {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(url);
      if (typeof sql.query === "function") await sql.query(text, []);
      else await sql(text);
    },
  };
}

export function createMemoryDb() {
  const store = {
    reviewers: [],
    validation_sessions: [],
    validation_cases: [],
    validation_runs: [],
    reviewer_feedback: [],
    analysis_rate_events: [],
    schema_migrations: [],
  };

  function uuid() {
    return crypto.randomUUID();
  }

  function now() {
    return new Date().toISOString();
  }

  return {
    kind: "memory",
    store,
    async exec() {
      return { rows: [] };
    },
    async query(text, params = []) {
      const sql = text.replace(/\s+/g, " ").trim();
      if (/INSERT INTO reviewers/i.test(sql)) {
        const [google_sub, email, display_name] = params;
        const existing = store.reviewers.find((row) => row.google_sub === google_sub);
        if (existing) {
          if (email) existing.email = email;
          if (display_name) existing.display_name = display_name;
          existing.last_login_at = now();
          return { rows: [existing] };
        }
        const row = {
          id: uuid(),
          google_sub,
          email: email || "",
          display_name: display_name || "",
          reviewer_type: null,
          specialty: null,
          institution: null,
          country: null,
          reviewer_verification_status: "unverified",
          created_at: now(),
          last_login_at: now(),
          consent_version: null,
          consent_at: null,
          profile_completed_at: null,
        };
        store.reviewers.push(row);
        return { rows: [row] };
      }
      if (/FROM reviewers WHERE id =/i.test(sql)) {
        return { rows: store.reviewers.filter((row) => row.id === params[0]) };
      }
      if (/UPDATE reviewers SET reviewer_type/i.test(sql)) {
        const [type, specialty, institution, country, display_name, id] = params;
        const row = store.reviewers.find((item) => item.id === id);
        if (!row) return { rows: [] };
        row.reviewer_type = type;
        row.specialty = specialty;
        row.institution = institution;
        row.country = country;
        if (display_name) row.display_name = display_name;
        row.profile_completed_at = now();
        return { rows: [row] };
      }
      if (/UPDATE reviewers SET consent_version/i.test(sql)) {
        const [version, id] = params;
        const row = store.reviewers.find((item) => item.id === id);
        if (!row) return { rows: [] };
        row.consent_version = version;
        row.consent_at = now();
        return { rows: [row] };
      }
      if (/INSERT INTO validation_sessions/i.test(sql)) {
        const row = {
          id: uuid(),
          reviewer_id: params[0],
          started_at: now(),
          completed_at: null,
          app_version: params[1],
          backend_version: params[2],
          corpus_identifier: params[3],
        };
        store.validation_sessions.push(row);
        return { rows: [row] };
      }
      if (/FROM validation_sessions WHERE id =/i.test(sql)) {
        return {
          rows: store.validation_sessions.filter((row) => row.id === params[0] && (!params[1] || row.reviewer_id === params[1])),
        };
      }
      if (/INSERT INTO validation_cases/i.test(sql)) {
        const row = {
          id: uuid(),
          session_id: params[0],
          cancer_type: params[1],
          stage: params[2],
          line_of_therapy: params[3],
          biomarkers: params[4],
          ecog: params[5],
          age: params[6],
          histology: params[7],
          prior_therapy: params[8],
          extra_predicates: params[9],
          request_at: now(),
        };
        store.validation_cases.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO validation_runs/i.test(sql)) {
        const row = {
          id: uuid(),
          case_id: params[0],
          session_id: params[1],
          reviewer_id: params[2],
          d1_status: params[3],
          d1_rule_id: params[4],
          matched_regimen: params[5],
          reasons: params[6],
          source_identifiers: params[7],
          d2_evidence_identifiers: params[8],
          d3_status: params[9],
          d3_silence_status: params[10],
          runtime_state: params[11],
          error_state: params[12],
          latency_ms: params[13],
          app_version: params[14],
          backend_version: params[15],
          corpus_identifier: params[16],
          document_meta: params[17],
          response_at: now(),
        };
        store.validation_runs.push(row);
        return { rows: [row] };
      }
      if (/FROM validation_runs WHERE id = \$1 AND reviewer_id/i.test(sql)) {
        return { rows: store.validation_runs.filter((row) => row.id === params[0] && row.reviewer_id === params[1]).map((row) => ({ id: row.id })) };
      }
      if (/INSERT INTO reviewer_feedback/i.test(sql)) {
        const row = {
          id: uuid(),
          run_id: params[0],
          reviewer_id: params[1],
          clinically_correct: params[2],
          recommendation_usefulness: params[3],
          evidence_usefulness: params[4],
          abstention_appropriate: params[5],
          missing_clinical_factor: params[6],
          clinical_error_category: params[7],
          comments: params[8],
          requires_correction_before_clinical_use: params[9],
          submitted_at: now(),
        };
        store.reviewer_feedback.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO analysis_rate_events/i.test(sql)) {
        store.analysis_rate_events.push({ id: uuid(), reviewer_id: params[0], created_at: now() });
        return { rows: [] };
      }
      if (/FROM analysis_rate_events/i.test(sql)) {
        const since = new Date(params[1]).getTime();
        const rows = store.analysis_rate_events.filter(
          (row) => row.reviewer_id === params[0] && new Date(row.created_at).getTime() >= since,
        );
        return { rows: [{ n: rows.length }] };
      }
      if (/SELECT vr\.\*/i.test(sql) && /WHERE vr.id =/i.test(sql)) {
        const run = store.validation_runs.find((row) => row.id === params[0]);
        if (!run) return { rows: [] };
        const kase = store.validation_cases.find((row) => row.id === run.case_id) || {};
        const reviewer = store.reviewers.find((row) => row.id === run.reviewer_id) || {};
        const feedback = store.reviewer_feedback.find((row) => row.run_id === run.id) || {};
        return {
          rows: [{
            ...run,
            cancer_type: kase.cancer_type,
            stage: kase.stage,
            line_of_therapy: kase.line_of_therapy,
            biomarkers: kase.biomarkers,
            ecog: kase.ecog,
            age: kase.age,
            histology: kase.histology,
            prior_therapy: kase.prior_therapy,
            extra_predicates: kase.extra_predicates,
            request_at: kase.request_at,
            reviewer_type: reviewer.reviewer_type,
            reviewer_verification_status: reviewer.reviewer_verification_status,
            country: reviewer.country,
            clinically_correct: feedback.clinically_correct,
            recommendation_usefulness: feedback.recommendation_usefulness,
            evidence_usefulness: feedback.evidence_usefulness,
            abstention_appropriate: feedback.abstention_appropriate,
            missing_clinical_factor: feedback.missing_clinical_factor,
            clinical_error_category: feedback.clinical_error_category,
            comments: feedback.comments,
            requires_correction_before_clinical_use: feedback.requires_correction_before_clinical_use,
            feedback_at: feedback.submitted_at,
          }],
        };
      }
      if (/AS reviewer_count/i.test(sql)) {
        return { rows: [adminAggregate(store)] };
      }
      if (/GROUP BY 1/i.test(sql) || /AS rule_key/i.test(sql)) {
        return { rows: ruleStats(store) };
      }
      if (/FROM validation_runs vr JOIN validation_cases/i.test(sql)) {
        return { rows: recentRuns(store, 50) };
      }
      return { rows: [] };
    },
  };
}

function adminAggregate(store) {
  const judgeable = store.reviewer_feedback.filter((row) => row.clinically_correct && row.clinically_correct !== "unable_to_judge");
  const yes = judgeable.filter((row) => row.clinically_correct === "yes").length;
  const partial = store.reviewer_feedback.filter((row) => row.clinically_correct === "partially").length;
  const no = store.reviewer_feedback.filter((row) => row.clinically_correct === "no").length;
  return {
    reviewer_count: store.reviewers.length,
    run_count: store.validation_runs.length,
    cancer_types: new Set(store.validation_cases.map((row) => row.cancer_type).filter(Boolean)).size,
    match_count: store.validation_runs.filter((row) => row.d1_status === "MATCH").length,
    abstain_count: store.validation_runs.filter((row) => row.d1_status === "ABSTAIN").length,
    error_count: store.validation_runs.filter((row) => row.d1_status === "ERROR").length,
    clinically_correct_yes: yes,
    clinically_correct_partial: partial,
    clinically_correct_no: no,
    clinically_correct_unable: store.reviewer_feedback.filter((row) => row.clinically_correct === "unable_to_judge").length,
    correctness_pct: judgeable.length ? Math.round((yes / judgeable.length) * 1000) / 10 : null,
    evidence_complaints: store.reviewer_feedback.filter((row) => Number(row.evidence_usefulness) <= 2).length,
    unresolved_errors: store.reviewer_feedback.filter((row) => row.clinically_correct === "no" || row.requires_correction_before_clinical_use === true).length,
  };
}

function recentRuns(store, limit) {
  return store.validation_runs
    .slice()
    .sort((a, b) => String(b.response_at).localeCompare(String(a.response_at)))
    .slice(0, Number(limit) || 50)
    .map((run) => {
      const kase = store.validation_cases.find((row) => row.id === run.case_id) || {};
      const reviewer = store.reviewers.find((row) => row.id === run.reviewer_id) || {};
      const feedback = store.reviewer_feedback.find((row) => row.run_id === run.id);
      return {
        id: run.id,
        response_at: run.response_at,
        d1_status: run.d1_status,
        d1_rule_id: run.d1_rule_id,
        matched_regimen: run.matched_regimen,
        cancer_type: kase.cancer_type,
        stage: kase.stage,
        reviewer_type: reviewer.reviewer_type,
        clinically_correct: feedback?.clinically_correct || null,
      };
    });
}

function ruleStats(store) {
  const map = new Map();
  for (const run of store.validation_runs) {
    const key = run.d1_rule_id || run.matched_regimen || "unspecified";
    if (!map.has(key)) map.set(key, { rule_key: key, tested: 0, negative: 0 });
    const row = map.get(key);
    row.tested += 1;
    const feedback = store.reviewer_feedback.find((item) => item.run_id === run.id);
    if (feedback && (feedback.clinically_correct === "no" || feedback.requires_correction_before_clinical_use)) {
      row.negative += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.tested - a.tested);
}

let cached;

export function getDb(override) {
  if (override) return override;
  if (cached) return cached;
  if (process.env.ONETRA_LEDGER_DRIVER === "memory") {
    cached = createMemoryDb();
    return cached;
  }
  const url = process.env.DATABASE_URL || "";
  if (!url) throw databaseUnavailable();
  cached = createNeonDb(url);
  return cached;
}

export function resetDbCache() {
  cached = undefined;
}

export function migrationSql() {
  return readFileSync(MIGRATION, "utf8");
}

export async function applyMigrations(db) {
  const sql = migrationSql();
  if (db.kind === "memory") {
    await db.exec(sql);
    return { applied: ["001_init"], driver: "memory" };
  }
  await db.exec(sql);
  return { applied: ["001_init"], driver: db.kind };
}

// Always same-origin. Vite and Vercel proxy /api and /doctor3 to
// https://onetra-veda-live.azurewebsites.net.
export const API_BASE = "";

function errorFromBody(json, status) {
  if (typeof json?.detail === "string") return json.detail;
  if (Array.isArray(json?.detail)) {
    const first = json.detail[0];
    if (typeof first?.msg === "string") return first.msg;
  }
  return `HTTP ${status}`;
}

export function parsePatientAge(value) {
  if (value === "" || value == null) return null;
  const age = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(age) || age < 18 || age > 120) return null;
  return age;
}

export function toClinicalPayload(intake) {
  const age = parsePatientAge(intake.age);
  const payload = {
    cancer_type: intake.cancer_type,
    stage: intake.stage,
    biomarkers: Array.isArray(intake.biomarkers) ? intake.biomarkers : [],
    ecog: String(intake.ecog),
    line_of_therapy: intake.line_of_therapy,
    prior_therapy: Array.isArray(intake.prior_therapy) ? intake.prior_therapy : [],
    age,
  };
  if (intake.histology) payload.histology = intake.histology;
  return payload;
}

export function doctor2FromClinical(clinical) {
  const recommendations = clinical?.recommendations || [];
  const evidence = [];
  const seen = new Set();
  for (const rec of recommendations) {
    const parts = [rec.evidence_tier, rec.fda_status, ...(rec.references || [])].filter(Boolean);
    for (const part of parts) {
      if (seen.has(part)) continue;
      seen.add(part);
      evidence.push({ title: part, citation: part });
    }
  }
  return {
    status: evidence.length ? "GROUNDED" : "ABSTAIN",
    evidence,
  };
}

export function mapDoctor3(raw, uploaded) {
  if (!uploaded) {
    return {
      doctor3_status: "SILENCE",
      triggers: [],
      display_message: "No clinical document uploaded.",
    };
  }
  if (!raw || typeof raw !== "object") {
    return {
      doctor3_status: "SILENCE",
      triggers: [],
      display_message: "Longitudinal review unavailable.",
    };
  }
  const display =
    raw.factual_summary ||
    raw.display_message ||
    raw.silence_reason ||
    raw.case_status ||
    (Array.isArray(raw.limitations) && raw.limitations[0]) ||
    "No grounded document findings.";
  return {
    doctor3_status: raw.doctor3_status || "SILENCE",
    triggers: raw.triggers || [],
    positive_trigger_count: raw.positive_trigger_count,
    display_message: display,
    nano: raw.nano_allowed === false ? { status: "LIVE_NANO_VERIFICATION_BLOCKED" } : raw.nano,
  };
}

async function readJson(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : response.status === 403
          ? "You do not have access to that resource."
          : errorFromBody(json, response.status),
    );
    error.status = response.status;
    throw error;
  }
  return json;
}

function authHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function runClinicalRecommendation(intake, { token } = {}) {
  const response = await fetch(`${API_BASE}/api/clinical-recommendation`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(toClinicalPayload(intake)),
  });
  return readJson(response);
}

export async function runDoctor3(files, { token } = {}) {
  if (!files?.length) return null;
  const body = new FormData();
  let path;
  if (files.length === 1) {
    body.append("file", files[0]);
    path = "/doctor3/analyze-upload";
  } else {
    for (const file of files) body.append("files", file);
    path = "/doctor3/analyze-case";
  }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body });
  return readJson(response);
}

export async function runThreeDoctorAnalysis({ intake, files, token }) {
  const [clinical, doctor3] = await Promise.all([
    runClinicalRecommendation(intake, { token }),
    runDoctor3(files, { token }),
  ]);
  return {
    standard_of_care_pathway: clinical,
    verified_supporting_evidence: doctor2FromClinical(clinical),
    longitudinal_pattern_review: mapDoctor3(doctor3, Boolean(files?.length)),
  };
}

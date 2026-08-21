import assert from "node:assert/strict";
import {
  API_BASE,
  doctor2FromClinical,
  mapDoctor3,
  parsePatientAge,
  toClinicalPayload,
} from "../src/liveClient.js";

assert.equal(API_BASE, "");

assert.equal(parsePatientAge(""), null);
assert.equal(parsePatientAge("17"), null);
assert.equal(parsePatientAge("65.5"), null);
assert.equal(parsePatientAge("65"), 65);

const payload = toClinicalPayload({
  cancer_type: "NSCLC",
  stage: "IV",
  biomarkers: ["MET_EX14_SKIP"],
  ecog: "1",
  line_of_therapy: "1L",
  prior_therapy: [],
  age: "65",
});
assert.deepEqual(payload, {
  cancer_type: "NSCLC",
  stage: "IV",
  biomarkers: ["MET_EX14_SKIP"],
  ecog: "1",
  line_of_therapy: "1L",
  prior_therapy: [],
  age: 65,
});
assert.equal(typeof payload.age, "number");

const analSetting = "Nonmetastatic definitive primary chemoradiation";
const analPayload = toClinicalPayload({
  cancer_type: "Anal Cancer",
  stage: analSetting,
  biomarkers: [],
  ecog: "1",
  line_of_therapy: "1L_curative",
  prior_therapy: [],
  age: "65",
});
assert.equal(analPayload.stage, analSetting, "must not rewrite chemoradiation setting to Stage I");
assert.notEqual(analPayload.stage, "Stage I");
assert.equal(analPayload.cancer_type, "Anal Cancer");
assert.equal(analPayload.line_of_therapy, "1L_curative");

const d2 = doctor2FromClinical({
  status: "OK",
  recommendations: [{ treatment: "Tepotinib", evidence_tier: "FDA-label", fda_status: "", references: ["FDA-label"] }],
});
assert.equal(d2.status, "GROUNDED");
assert.deepEqual(d2.evidence, [{ title: "FDA-label", citation: "FDA-label" }]);

const d3none = mapDoctor3(null, false);
assert.equal(d3none.display_message, "No clinical document uploaded.");

const d3live = mapDoctor3({
  doctor3_status: "SILENCE",
  silence_reason: "REDACTION_REVIEW_REQUIRED",
  triggers: [],
  nano_allowed: false,
}, true);
assert.equal(d3live.doctor3_status, "SILENCE");
assert.equal(d3live.display_message, "REDACTION_REVIEW_REQUIRED");
assert.equal(d3live.nano.status, "LIVE_NANO_VERIFICATION_BLOCKED");

console.log("liveClient unit tests passed");

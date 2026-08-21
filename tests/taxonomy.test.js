import assert from "node:assert/strict";
import fs from "node:fs";
import {
  BIOMARKERS_BY_PATH,
  CANCER_TYPES,
  CORPUS_RULE_COUNT,
  HISTOLOGIES_BY_PATH,
  LINES_BY_CANCER_STAGE,
  STAGES_BY_CANCER,
  optionsFor,
} from "../src/intakeTaxonomy.js";

assert.equal(CORPUS_RULE_COUNT, 315);
assert.ok(CANCER_TYPES.length >= 80);
assert.ok(CANCER_TYPES.some((c) => c.value === "Non-Small Cell Lung Cancer"));
assert.ok(CANCER_TYPES.some((c) => c.value === "NSCLC"));
assert.ok(CANCER_TYPES.some((c) => c.value === "Breast Cancer"));
assert.ok(CANCER_TYPES.every((c) => c.rule_count >= 1));
assert.ok(CANCER_TYPES.every((c) => c.value === c.label), "cancer labels must not rewrite canonical values");
const analStages = optionsFor("Anal Cancer", "", "").stages.map((s) => s.value);
assert.ok(analStages.includes("Nonmetastatic definitive primary chemoradiation"));
assert.ok(analStages.includes("Stage I"));
assert.notEqual(
  analStages.find((s) => s === "Nonmetastatic definitive primary chemoradiation"),
  "Stage I",
);

const empty = optionsFor("", "", "");
assert.deepEqual(empty.stages, []);
assert.deepEqual(empty.lines, []);

const nsclc = optionsFor("Non-Small Cell Lung Cancer", "IV", "1L");
assert.ok(nsclc.biomarkers.some((b) => b.value === "MET_EX14_SKIP"));
assert.equal(BIOMARKERS_BY_PATH["Breast Cancer|IV|made-up-line"], undefined);
assert.ok((LINES_BY_CANCER_STAGE["Non-Small Cell Lung Cancer|IV"] || []).length > 0);

const CORPUS = "C:/OneTra/cc-sonnet5-live-wiring-2026-08-12/deploy_staging/corpus/doctor1_frozen/11_FINAL_D1_ACTIVE_CORPUS.json";
const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
const rawRules = Array.isArray(corpus) ? corpus : corpus.rules || [];
assert.equal(rawRules.length, 315);

function fold(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}
function preferCasing(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}
function stagesOf(rule) {
  const values = [];
  const add = (v) => {
    const text = String(v || "").trim();
    if (text && !values.includes(text)) values.push(text);
  };
  const anyOf = rule.stage_or_disease_state_any_of || rule.stage_disease_state_any_of;
  if (Array.isArray(anyOf)) anyOf.forEach(add);
  else add(anyOf);
  add(rule.stage_or_disease_state);
  add(rule.setting);
  add(rule.stage);
  return values;
}
function biosOf(rule) {
  const raw = rule.biomarker_required || rule.biomarkers_required || rule.biomarker || [];
  return (Array.isArray(raw) ? raw : [raw]).map((x) => String(x || "").trim()).filter((x) => x && x.toLowerCase() !== "none");
}

const foldToValues = new Map();
for (const rule of rawRules) {
  const raw = String(rule.cancer || rule.cancer_type || "").trim();
  if (!raw) continue;
  const key = fold(raw);
  if (!foldToValues.has(key)) foldToValues.set(key, []);
  foldToValues.get(key).push(raw);
}
const foldToCanonical = new Map([...foldToValues.entries()].map(([key, values]) => [key, preferCasing(values)]));

const missing = [];
for (const rule of rawRules) {
  const rawCancer = String(rule.cancer || rule.cancer_type || "").trim();
  if (!rawCancer) continue;
  const cancer = foldToCanonical.get(fold(rawCancer)) || rawCancer;
  if (!CANCER_TYPES.some((c) => c.value === cancer)) missing.push(`cancer ${cancer}`);
  for (const stage of stagesOf(rule)) {
    if (!(STAGES_BY_CANCER[cancer] || []).some((s) => s.value === stage)) {
      missing.push(`${cancer} stage ${stage}`);
    }
    const line = String(rule.line || rule.line_of_therapy || "").trim();
    if (!line) continue;
    if (!(LINES_BY_CANCER_STAGE[`${cancer}|${stage}`] || []).some((l) => l.value === line)) {
      missing.push(`${cancer}|${stage} line ${line}`);
    }
    for (const bio of biosOf(rule)) {
      if (!(BIOMARKERS_BY_PATH[`${cancer}|${stage}|${line}`] || []).some((b) => b.value === bio)) {
        missing.push(`${cancer}|${stage}|${line} bio ${bio}`);
      }
    }
  }
}
assert.deepEqual(missing, [], `taxonomy dropped corpus predicates: ${missing.slice(0, 10).join("; ")}`);

for (const [cancer, stages] of Object.entries(STAGES_BY_CANCER)) {
  for (const option of stages) {
    assert.equal(option.label, option.value.replace(/_/g, " "), `${cancer} stage label rewrote value`);
  }
}
assert.ok((HISTOLOGIES_BY_PATH["Hepatocellular Carcinoma|METASTATIC|1L"] || []).some((h) => h.value === "HCC"));
assert.ok((HISTOLOGIES_BY_PATH["Soft Tissue Sarcoma|UNRESECTABLE|Any line"] || []).some((h) => h.value === "Alveolar Soft Part Sarcoma"));

console.log(`taxonomy passed: ${CANCER_TYPES.length} cancers from ${CORPUS_RULE_COUNT} rules`);

import fs from "node:fs";
import path from "node:path";

const CORPUS = "C:/OneTra/cc-sonnet5-live-wiring-2026-08-12/deploy_staging/corpus/doctor1_frozen/11_FINAL_D1_ACTIVE_CORPUS.json";
const OUT = path.resolve("src/intakeTaxonomy.js");
const CONTROLS = path.resolve("tests/positive-controls.json");

function fold(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function preferCasing(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function labelize(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  return text.replace(/_/g, " ").replace(/\s+/g, " ");
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

function histologyOf(rule) {
  const text = String(rule.histology || "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (["any", "not otherwise specified", "not otherwise specified in source rule", "n/a"].includes(lower)) return "";
  return text;
}

const data = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
const rawRules = Array.isArray(data) ? data : data.rules || [];

const foldToValues = new Map();
for (const rule of rawRules) {
  const raw = String(rule.cancer || rule.cancer_type || "").trim();
  if (!raw) continue;
  const key = fold(raw);
  if (!foldToValues.has(key)) foldToValues.set(key, []);
  foldToValues.get(key).push(raw);
}
const foldToCanonical = new Map([...foldToValues.entries()].map(([key, values]) => [key, preferCasing(values)]));

function cancerCanonical(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  return foldToCanonical.get(fold(text)) || text;
}

const rules = rawRules.filter((rule) => cancerCanonical(rule.cancer || rule.cancer_type));
const byCancer = new Map();
for (const rule of rules) {
  const cancer = cancerCanonical(rule.cancer || rule.cancer_type);
  if (!byCancer.has(cancer)) byCancer.set(cancer, []);
  byCancer.get(cancer).push(rule);
}

const cancerTypes = [...byCancer.keys()]
  .sort((a, b) => a.localeCompare(b))
  .map((value) => ({ value, label: value, rule_count: byCancer.get(value).length }));

const stagesByCancer = {};
const linesByCancerStage = {};
const biomarkersByPath = {};
const histologiesByPath = {};

for (const [cancer, cancerRules] of byCancer) {
  const stageSet = new Map();
  for (const rule of cancerRules) {
    for (const stage of stagesOf(rule)) stageSet.set(stage, true);
  }
  stagesByCancer[cancer] = [...stageSet.keys()].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: labelize(value) }));

  for (const stage of stageSet.keys()) {
    const lineSet = new Map();
    for (const rule of cancerRules) {
      if (!stagesOf(rule).includes(stage)) continue;
      const line = String(rule.line || rule.line_of_therapy || "").trim();
      if (!line) continue;
      lineSet.set(line, true);
    }
    linesByCancerStage[`${cancer}|${stage}`] = [...lineSet.keys()].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: labelize(value) }));

    for (const line of lineSet.keys()) {
      const bioSet = new Map();
      const histSet = new Map();
      for (const rule of cancerRules) {
        if (!stagesOf(rule).includes(stage)) continue;
        if (String(rule.line || rule.line_of_therapy || "").trim() !== line) continue;
        for (const bio of biosOf(rule)) bioSet.set(bio, true);
        const hist = histologyOf(rule);
        if (hist) histSet.set(hist, true);
      }
      biomarkersByPath[`${cancer}|${stage}|${line}`] = [...bioSet.keys()].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: labelize(value) }));
      histologiesByPath[`${cancer}|${stage}|${line}`] = [...histSet.keys()].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: labelize(value) }));
    }
  }
}

const file = `/**
 * Generated from the frozen 315-rule Doctor 1 corpus.
 * option.value is the exact corpus predicate. option.label is display-only.
 * Rebuild with scripts/build-intake-taxonomy.mjs.
 */
export const CORPUS_RULE_COUNT = ${rules.length};
export const CANCER_TYPES = ${JSON.stringify(cancerTypes, null, 2)};
export const STAGES_BY_CANCER = ${JSON.stringify(stagesByCancer, null, 2)};
export const LINES_BY_CANCER_STAGE = ${JSON.stringify(linesByCancerStage, null, 2)};
export const BIOMARKERS_BY_PATH = ${JSON.stringify(biomarkersByPath, null, 2)};
export const HISTOLOGIES_BY_PATH = ${JSON.stringify(histologiesByPath, null, 2)};

export const ECOG_OPTIONS = [
  { value: "0", label: "0 — Fully active" },
  { value: "1", label: "1 — Restricted, ambulatory" },
  { value: "2", label: "2 — Ambulatory, unable to work" },
  { value: "3", label: "3 — Limited self-care" },
  { value: "4", label: "4 — Completely disabled" },
];

export function optionsFor(cancer, stage, line) {
  return {
    stages: STAGES_BY_CANCER[cancer] || [],
    lines: LINES_BY_CANCER_STAGE[\`\${cancer}|\${stage}\`] || [],
    biomarkers: BIOMARKERS_BY_PATH[\`\${cancer}|\${stage}|\${line}\`] || [],
    histologies: HISTOLOGIES_BY_PATH[\`\${cancer}|\${stage}|\${line}\`] || [],
  };
}
`;

fs.writeFileSync(OUT, file);
const anal = (stagesByCancer["Anal Cancer"] || []).map((s) => s.value);
console.log(JSON.stringify({
  cancers: cancerTypes.length,
  has_nsclc_short: cancerTypes.some((c) => c.value === "NSCLC"),
  has_nsclc_long: cancerTypes.some((c) => c.value === "Non-Small Cell Lung Cancer"),
  anal_includes_setting: anal.includes("Nonmetastatic definitive primary chemoradiation"),
  anal_includes_stage_i: anal.includes("Stage I"),
}, null, 2));
void CONTROLS;

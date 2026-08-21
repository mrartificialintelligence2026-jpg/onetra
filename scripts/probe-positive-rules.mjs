import fs from "node:fs";

const CORPUS = "C:/OneTra/cc-sonnet5-live-wiring-2026-08-12/deploy_staging/corpus/doctor1_frozen/11_FINAL_D1_ACTIVE_CORPUS.json";
const API = "https://onetra-veda-live.azurewebsites.net/api/clinical-recommendation";

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

const rules = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
const list = Array.isArray(rules) ? rules : rules.rules;
const mapped = new Set(["EGFR_EX19DEL","EGFR_L858R","EGFR_T790M","EGFR_EXON20_INSERTION","ALK_FUSION","ALK_G1202R","ROS1_FUSION","ROS1_G2032R","KRAS_G12C","MET_EX14_SKIP","RET_FUSION","BRAF_V600E","PD-L1_HIGH"]);

const probes = [];
for (const rule of list) {
  const cancer = String(rule.cancer || rule.cancer_type || "").trim();
  const line = String(rule.line || rule.line_of_therapy || "").trim();
  const stages = stagesOf(rule);
  if (!cancer || !line || !stages.length) continue;
  const bios = biosOf(rule);
  const usable = bios.length === 0 || bios.every((b) => mapped.has(b) || mapped.has(String(b).toUpperCase()));
  if (!usable && bios.length > 2) continue;
  probes.push({
    id: rule.id || rule.rule_id,
    cancer,
    line,
    stage: stages[0],
    stages,
    biomarkers: bios.filter((b) => mapped.has(b) || bios.length <= 2),
    regimen: String(rule.regimen || "").slice(0, 80),
  });
}

const expanded = [];
for (const probe of probes) {
  for (const stage of probe.stages.slice(0, 3)) {
    expanded.push({ ...probe, stage });
  }
}
const prioritized = [
  ...expanded.filter((p) => ["MET_EX14_SKIP", "ALK_FUSION", "ROS1_FUSION", "EGFR_L858R", "KRAS_G12C", "RET_FUSION", "BRAF_V600E", "PD-L1_HIGH"].some((b) => p.biomarkers.includes(b))),
  ...expanded.filter((p) => p.biomarkers.length === 0),
].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id && x.stage === p.stage) === i).slice(0, 180);

const results = [];
for (const probe of prioritized) {
  const body = {
    cancer_type: probe.cancer,
    stage: probe.stage,
    biomarkers: probe.biomarkers,
    ecog: "1",
    line_of_therapy: probe.line,
    prior_therapy: [],
    age: 65,
  };
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  const status = json.status;
  const tx = (json.recommendations || []).map((r) => r.treatment).join("; ");
  const row = { id: probe.id, status, http: res.status, cancer: probe.cancer, stage: probe.stage, line: probe.line, bios: probe.biomarkers, tx: tx.slice(0, 90) };
  results.push(row);
  if (status === "OK" && tx) console.log("MATCH", JSON.stringify(row));
  else process.stdout.write(".");
}

const matches = results.filter((r) => r.status === "OK" && r.tx);
console.log("\nPROBED", results.length, "MATCH", matches.length, "ABSTAIN", results.length - matches.length);
fs.writeFileSync("tests/positive-probe.json", JSON.stringify({ matches, results }, null, 2));
console.log(JSON.stringify(matches, null, 2));

import fs from "node:fs";
const CORPUS = "C:/OneTra/cc-sonnet5-live-wiring-2026-08-12/deploy_staging/corpus/doctor1_frozen/11_FINAL_D1_ACTIVE_CORPUS.json";
const API = "https://onetra-veda-live.azurewebsites.net/api/clinical-recommendation";
const already = new Set(JSON.parse(fs.readFileSync("tests/positive-probe.json","utf8")).results.map(r => r.id));

function stagesOf(rule) {
  const values = [];
  const add = (v) => { const t = String(v||"").trim(); if (t && !values.includes(t)) values.push(t); };
  const anyOf = rule.stage_or_disease_state_any_of || rule.stage_disease_state_any_of;
  if (Array.isArray(anyOf)) anyOf.forEach(add); else add(anyOf);
  add(rule.setting); add(rule.stage); add(rule.stage_or_disease_state);
  return values;
}
function biosOf(rule) {
  const raw = rule.biomarker_required || rule.biomarkers_required || rule.biomarker || [];
  return (Array.isArray(raw)?raw:[raw]).map(x=>String(x||"").trim()).filter(x=>x && x.toLowerCase()!=="none");
}

const list = JSON.parse(fs.readFileSync(CORPUS,"utf8"));
const rules = Array.isArray(list)?list:list.rules;
const matches = [];
let n = 0;
for (const rule of rules) {
  const id = rule.id || rule.rule_id;
  if (already.has(id)) continue;
  const cancer = String(rule.cancer || rule.cancer_type || "").trim();
  const line = String(rule.line || rule.line_of_therapy || "").trim();
  const stages = stagesOf(rule);
  const bios = biosOf(rule);
  if (!cancer || !line || !stages.length || bios.length) continue;
  const body = { cancer_type: cancer, stage: stages[0], biomarkers: [], ecog: "1", line_of_therapy: line, prior_therapy: [], age: 65 };
  const res = await fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  n++;
  if (json.status === "OK" && (json.recommendations||[]).length) {
    const row = { id, cancer, stage: stages[0], line, tx: json.recommendations[0].treatment.slice(0,90) };
    matches.push(row);
    console.log("MATCH", JSON.stringify(row));
  } else process.stdout.write(".");
  if (n >= 120) break;
}
console.log("\nNEW_MATCH", matches.length, "PROBED", n);
fs.writeFileSync("tests/positive-probe-more.json", JSON.stringify(matches, null, 2));

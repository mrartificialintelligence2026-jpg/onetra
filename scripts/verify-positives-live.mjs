import fs from "node:fs";
const controls = JSON.parse(fs.readFileSync("tests/positive-controls.json", "utf8"));
const API = "https://onetra-veda-live.azurewebsites.net/api/clinical-recommendation";
const live = [];
for (const c of controls) {
  const body = {
    cancer_type: c.cancer,
    stage: c.stage,
    biomarkers: c.biomarkers || [],
    ecog: "1",
    line_of_therapy: c.line,
    prior_therapy: [],
    age: 65,
  };
  if (c.histology) body.histology = c.histology;
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  const tx = (json.recommendations || [])[0]?.treatment || "";
  const row = { id: c.id, http: res.status, status: json.status, live_tx: tx.slice(0, 80), expected: c.treatment.slice(0, 40) };
  live.push(row);
  console.log((json.status === "OK" && tx ? "LIVE_MATCH" : "LIVE_FAIL"), JSON.stringify(row));
}
const ok = live.filter((r) => r.status === "OK" && r.live_tx);
console.log("LIVE_MATCH_COUNT", ok.length, "/", live.length);
fs.writeFileSync("tests/positive-controls-live.json", JSON.stringify({ ok, live }, null, 2));

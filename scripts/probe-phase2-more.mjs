const bases = ["https://onetra.health", "https://onetra.vercel.app"];

async function probe(base) {
  const paths = [
    ["GET", "/api/auth/session"],
    ["POST", "/api/auth/profile"],
    ["POST", "/api/auth/consent"],
    ["POST", "/api/ledger/session"],
    ["POST", "/api/ledger/preflight"],
    ["POST", "/api/ledger/run"],
    ["POST", "/api/ledger/feedback"],
    ["GET", "/api/admin/summary"],
    ["GET", "/api/admin/run?id=00000000-0000-0000-0000-000000000000"],
    ["POST", "/doctor3/analyze-upload"],
  ];
  const out = { base };
  for (const [method, path] of paths) {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    const json = await res.json().catch(() => ({}));
    out[path] = { status: res.status, code: json.code || json.detail || null };
  }
  const clinicalBad = await fetch(base + "/api/clinical-recommendation", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer aaa.bbb.ccc" },
    body: JSON.stringify({
      cancer_type: "Non-Small Cell Lung Cancer",
      stage: "IV",
      biomarkers: ["MET_EX14_SKIP"],
      ecog: "1",
      line_of_therapy: "1L",
      prior_therapy: [],
      age: 65,
    }),
  });
  out.clinical_bad_token = clinicalBad.status;
  return out;
}

for (const base of bases) console.log(JSON.stringify(await probe(base)));

const azure = {
  parse: (await fetch("https://onetra-veda-live.azurewebsites.net/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stream: "x" }),
  })).status,
  analyze: (await fetch("https://onetra-veda-live.azurewebsites.net/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stream: "x" }),
  })).status,
  clinical: (await fetch("https://onetra-veda-live.azurewebsites.net/api/clinical-recommendation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cancer_type: "Non-Small Cell Lung Cancer",
      stage: "IV",
      biomarkers: ["MET_EX14_SKIP"],
      ecog: "1",
      line_of_therapy: "1L",
      prior_therapy: [],
      age: 65,
    }),
  })).status,
  docs: (await fetch("https://onetra-veda-live.azurewebsites.net/docs")).status,
  root: (await fetch("https://onetra-veda-live.azurewebsites.net/")).status,
  d3health: (await fetch("https://onetra-veda-live.azurewebsites.net/doctor3/health")).status,
};
console.log(JSON.stringify({ azure }));

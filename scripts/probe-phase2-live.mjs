const bases = ["https://onetra.vercel.app", "https://onetra.health"];
for (const base of bases) {
  const session = await fetch(`${base}/api/auth/session`);
  const sessionBody = await session.json().catch(() => ({}));
  const bad = await fetch(`${base}/api/auth/session`, {
    headers: { Authorization: "Bearer aaa.bbb.ccc" },
  });
  const admin = await fetch(`${base}/api/admin/summary`);
  const clinical = await fetch(`${base}/api/clinical-recommendation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const clinicalJson = await clinical.json().catch(() => ({}));
  console.log(JSON.stringify({
    base,
    session: session.status,
    session_code: sessionBody.code,
    bad_token: bad.status,
    admin: admin.status,
    clinical_via_site: clinical.status,
    clinical_status: clinicalJson.status || null,
    has_recs: Array.isArray(clinicalJson.recommendations) && clinicalJson.recommendations.length > 0,
  }));
}

const azure = await fetch("https://onetra-veda-live.azurewebsites.net/api/clinical-recommendation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
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
console.log(JSON.stringify({ azure_direct: azure.status }));

const html = await (await fetch("https://onetra.vercel.app/login")).text();
const match = html.match(/assets\/index-[^"]+\.js/);
let bundleHasDb = false;
let bundleHasClient = false;
if (match) {
  const js = await (await fetch(`https://onetra.vercel.app/${match[0]}`)).text();
  bundleHasDb = /postgres(ql)?:\/\//i.test(js) || js.includes("DATABASE_URL") || js.includes("npg_");
  bundleHasClient = js.includes("25702905297-15ujkqchtq7un8f56776u4h6v080sqo5");
}
console.log(JSON.stringify({
  login_html: html.includes("id=\"root\""),
  bundleHasDb,
  bundleHasClient,
}));

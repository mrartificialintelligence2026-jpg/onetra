import assert from "node:assert/strict";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const POSITIVE_CONTROLS = [
  { id: "NSCLC-006B", cancer: "Non-Small Cell Lung Cancer", stage: "IV", line: "1L", biomarkers: ["MET_EX14_SKIP"], expect: /Tepotinib/i },
  { id: "NSCLC-004B", cancer: "Non-Small Cell Lung Cancer", stage: "LOCALLY_ADVANCED", line: "Any", biomarkers: ["ROS1_FUSION"], expect: /Repotrectinib/i },
  { id: "HCC-001", cancer: "Hepatocellular Carcinoma", stage: "METASTATIC", line: "1L", biomarkers: [], expect: /Atezolizumab/i },
  { id: "BLA-001", cancer: "Urothelial Carcinoma", stage: "Locally Advanced", line: "1L", biomarkers: [], expect: /Enfortumab/i },
  { id: "STS-004", cancer: "Soft Tissue Sarcoma", stage: "UNRESECTABLE", line: "Any line", biomarkers: [], expect: /Atezolizumab/i },
  { id: "CLL-006", cancer: "Chronic Lymphocytic Leukemia", stage: "IWCLL_INDICATION_FOR_TREATMENT", line: "1L", biomarkers: [], expect: /Acalabrutinib/i },
  { id: "CSCC-001", cancer: "Cutaneous Squamous Cell Carcinoma", stage: "metastatic_not_candidate_for_curative_surgery_or_curative_radiation", line: "Any line", biomarkers: [], expect: /Cemiplimab/i },
  { id: "TGCT-002", cancer: "Tenosynovial Giant Cell Tumor", stage: "symptomatic_tgct_surgical_resection_potentially_causes_worsening_functional_limitation_or_severe_morbidity", line: "Any", biomarkers: [], expect: /Vimseltinib/i },
  { id: "BTC-006", cancer: "Biliary Tract Cancer", stage: "locally_advanced", line: "1L", biomarkers: [], expect: /Durvalumab/i },
  { id: "CRC-BEV-A", cancer: "Colorectal Cancer", stage: "Metastatic unresectable", line: "1L", biomarkers: [], expect: /FOLFOX|Bevacizumab/i },
];

async function launchChromium() {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const remoteBase = process.env.E2E_BASE || "";
const server = remoteBase
  ? null
  : await createServer({
      root,
      server: { host: "127.0.0.1", port: 4183, strictPort: true },
    });
if (server) await server.listen();
const origin = remoteBase.replace(/\/$/, "") || "http://127.0.0.1:4183";
const browser = await launchChromium();
let failed = false;
const records = [];

try {
  const page = await browser.newPage();
  await page.goto(`${origin}/dashboard`);
  await page.getByRole("heading", { name: "Clinical intake" }).waitFor();

  await page.locator("#cancer-type").selectOption("Anal Cancer");
  const analValues = await page.locator("#stage option").evaluateAll((opts) =>
    opts.map((o) => o.value).filter(Boolean),
  );
  assert.ok(analValues.includes("Nonmetastatic definitive primary chemoradiation"));
  assert.ok(analValues.includes("Stage I"));
  await page.locator("#stage").selectOption("Nonmetastatic definitive primary chemoradiation");
  await page.locator("#line").selectOption("1L_curative");
  await page.locator("#patient-age").fill("65");
  const [analRequest] = await Promise.all([
    page.waitForRequest((req) => req.method() === "POST" && req.url().includes("/api/clinical-recommendation")),
    page.getByRole("button", { name: "Run analysis" }).click(),
  ]);
  const analPayload = analRequest.postDataJSON();
  assert.equal(analPayload.stage, "Nonmetastatic definitive primary chemoradiation");
  assert.notEqual(analPayload.stage, "Stage I");
  await page.getByTestId("doctor1-card").waitFor({ timeout: 60000 });
  await page.reload();
  await page.getByRole("heading", { name: "Clinical intake" }).waitFor();

  for (const control of POSITIVE_CONTROLS) {
    await page.locator("#cancer-type").selectOption(control.cancer);
    await page.locator("#stage").selectOption(control.stage);
    await page.locator("#line").selectOption(control.line);
    if (control.biomarkers[0]) {
      await page.locator("#biomarkers").selectOption(control.biomarkers[0]);
    }
    await page.locator("#patient-age").fill("65");
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.method() === "POST" && req.url().includes("/api/clinical-recommendation")),
      page.getByRole("button", { name: "Run analysis" }).click(),
    ]);
    const payload = request.postDataJSON();
    assert.equal(payload.cancer_type, control.cancer, `${control.id} cancer`);
    assert.equal(payload.stage, control.stage, `${control.id} stage must stay canonical`);
    assert.equal(payload.line_of_therapy, control.line, `${control.id} line`);
    assert.equal(payload.age, 65, `${control.id} age`);
    if (control.biomarkers.length) {
      assert.deepEqual(payload.biomarkers, control.biomarkers, `${control.id} biomarkers`);
    }
    await page.getByTestId("doctor1-card").waitFor({ timeout: 60000 });
    const d1 = await page.getByTestId("doctor1-card").innerText();
    assert.doesNotMatch(d1, /ABSTAIN/, `${control.id} unexpectedly abstained`);
    assert.match(d1, control.expect, `${control.id} missing expected match`);
    records.push({ id: control.id, status: "MATCH", d1: d1.replace(/\s+/g, " ").slice(0, 140) });
    await page.reload();
    await page.getByRole("heading", { name: "Clinical intake" }).waitFor();
  }
  console.log("10 POSITIVE CONTROLS PASS");
  for (const row of records) console.log(JSON.stringify(row));
} catch (err) {
  failed = true;
  console.error("POSITIVE CONTROLS FAIL");
  console.error(err);
  console.error(JSON.stringify(records, null, 2));
} finally {
  await browser.close();
  if (server) await server.close();
}

process.exit(failed ? 1 : 0);

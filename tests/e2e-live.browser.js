import assert from "node:assert/strict";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import {
  BIOMARKERS_BY_PATH,
  CANCER_TYPES,
  LINES_BY_CANCER_STAGE,
  STAGES_BY_CANCER,
} from "../src/intakeTaxonomy.js";

async function launchChromium() {
  const candidates = [
    "playwright",
    "file:///C:/OneTra/onetra-three-doctor-frontend/node_modules/playwright/index.mjs",
    "file:///C:/OneTra/onetra-three-doctor-website-engineering/node_modules/playwright/index.mjs",
  ];
  let lastError;
  for (const spec of candidates) {
    try {
      const { chromium } = await import(spec);
      return await chromium.launch({ headless: true });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function firstPath(cancer) {
  for (const stage of STAGES_BY_CANCER[cancer] || []) {
    for (const line of LINES_BY_CANCER_STAGE[`${cancer}|${stage.value}`] || []) {
      const bios = BIOMARKERS_BY_PATH[`${cancer}|${stage.value}|${line.value}`] || [];
      return { cancer, stage: stage.value, line: line.value, biomarker: bios[0]?.value || "" };
    }
  }
  return null;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureTxt = join(root, "tests", "fixtures", "synthetic-nsclc-met.txt");
const cases = [
  { cancer: "Non-Small Cell Lung Cancer", stage: "IV", line: "1L", biomarker: "MET_EX14_SKIP", expectMatch: /Tepotinib/i },
  firstPath("Breast Cancer"),
  firstPath("Prostate Cancer"),
  firstPath("Melanoma"),
  firstPath("Ovarian Cancer"),
].filter(Boolean);

assert.ok(CANCER_TYPES.length >= 80, "corpus-backed cancer list is too small");
assert.ok(cases.length >= 5, "need five supported cancers");

const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 4180, strictPort: true },
});
await server.listen();
const browser = await launchChromium();
let failed = false;
const records = [];

try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4180/");
  await page.getByRole("heading", { name: /Auditable Oncology Decision Support/i }).waitFor();
  for (const claim of ["PubMed Papers Daily", "FHIR", "Epic", "Cerner", "Bias Mitigation", "MARIPOSA"]) {
    assert.equal(await page.getByText(claim, { exact: false }).count(), 0, `forbidden claim: ${claim}`);
  }
  await page.getByRole("link", { name: "Open Validation Platform" }).first().click();
  await page.getByRole("heading", { name: "Clinical intake" }).waitFor();

  for (const [index, testCase] of cases.entries()) {
    await page.locator("#cancer-type").selectOption(testCase.cancer);
    await page.locator("#stage").selectOption(testCase.stage);
    await page.locator("#line").selectOption(testCase.line);
    if (testCase.biomarker) await page.locator("#biomarkers").selectOption(testCase.biomarker);
    await page.locator("#patient-age").fill("65");
    if (index === 0) {
      await page.locator("#clinical-documents").setInputFiles([fixtureTxt]);
      await page.locator("#deidentify-confirm").check();
    }
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.method() === "POST" && req.url().includes("/api/clinical-recommendation")),
      page.getByRole("button", { name: "Run analysis" }).click(),
    ]);
    const payload = request.postDataJSON();
    assert.equal(payload.cancer_type, testCase.cancer);
    assert.equal(payload.stage, testCase.stage);
    assert.equal(payload.line_of_therapy, testCase.line);
    assert.equal(payload.age, 65);
    await page.getByTestId("doctor1-card").waitFor({ timeout: 60000 });
    const d1 = await page.getByTestId("doctor1-card").innerText();
    if (testCase.expectMatch) assert.match(d1, testCase.expectMatch);
    else assert.match(d1, /Tepotinib|ABSTAIN|No eligible pathway/i);
    records.push({ ...testCase, d1: d1.replace(/\s+/g, " ").slice(0, 160) });
    await page.reload();
    await page.getByRole("heading", { name: "Clinical intake" }).waitFor();
  }
  console.log("browser E2E PASS");
  for (const row of records) console.log(JSON.stringify(row));
} catch (err) {
  failed = true;
  console.error("browser E2E FAIL");
  console.error(err);
} finally {
  await browser.close();
  await server.close();
}

process.exit(failed ? 1 : 0);

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = join(root, "..", "veda-rt");
const cases = JSON.parse(readFileSync(join(backendRoot, "doctor1_vnext", "golden_20_cases.json"), "utf8")).cases;
const rules = JSON.parse(readFileSync(join(backendRoot, "doctor1_vnext", "golden_20_rules.json"), "utf8")).rules;
const artifactRoot = join(root, "..", "doctor1-vnext-pristine-end-to-end-2026-08-17");
const e2eRecords = [];
const backendOrigin = "http://127.0.0.1:8017";
const AUTH_SECRET = "doctor1-vnext-test-secret-not-for-production";
const AUTH_CLIENT_ID = "doctor1-vnext-test.apps.googleusercontent.com";
process.env.VITE_BACKEND_TARGET = backendOrigin;
process.env.GOOGLE_CLIENT_ID = AUTH_CLIENT_ID;
process.env.VITE_GOOGLE_CLIENT_ID = AUTH_CLIENT_ID;
process.env.VITE_AUTH_TEST_HOOK = "1";
process.env.ONETRA_AUTH_TEST_SECRET = AUTH_SECRET;

async function makeReviewerToken() {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: "https://accounts.google.com",
    aud: AUTH_CLIENT_ID,
    sub: "doctor1-vnext-e2e-reviewer",
    email: "doctor1-vnext-e2e@example.com",
    email_verified: true,
    name: "Doctor 1 vNext E2E Reviewer",
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(AUTH_SECRET));
}

async function completeAuthenticatedEntry(page) {
  await page.goto("http://127.0.0.1:4197/dashboard");
  await page.waitForURL(/\/login/);
  await page.getByRole("heading", { name: /Continue with Google/i }).waitFor();
  const token = await makeReviewerToken();
  await page.evaluate(async (credential) => window.__ONETRA_TEST_LOGIN(credential), token);
  await page.waitForURL(/\/dashboard/);
  await page.getByTestId("reviewer-profile").waitFor();
  await page.locator("#display-name").fill("Doctor 1 vNext E2E Reviewer");
  await page.locator("#reviewer-type").selectOption("researcher");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("validation-consent").waitFor();
  await page.locator("#consent-ack").check();
  await page.getByRole("button", { name: "Start validation" }).click();
  await page.getByTestId("doctor1-vnext-ready").waitFor();
}

const backend = spawn(process.env.PYTHON || "python", ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8017"], {
  cwd: backendRoot,
  env: { ...process.env, DOCTRINE_SOURCE: "LOCAL" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let backendLog = "";
backend.stdout.on("data", (chunk) => { backendLog += chunk.toString(); });
backend.stderr.on("data", (chunk) => { backendLog += chunk.toString(); });

async function waitForBackend() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${backendOrigin}/api/doctor1-vnext/health`);
      if (response.ok) return;
    } catch { /* startup in progress */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend did not start.\n${backendLog}`);
}

function pathValue(patient, path) {
  return path.split(".").reduce((value, key) => value?.[key], patient);
}

function matchingPaths(definition, patient) {
  return definition.pathways.filter(({ base }) => (
    base.cancer === patient.diagnosis.cancer
    && (!base.stage || base.stage === patient.disease.stage)
    && (!base.disease_state || patient.disease.states.includes(base.disease_state))
    && (!base.resectability || base.resectability === patient.disease.resectability)
    && (!base.metastatic_status || base.metastatic_status === patient.disease.metastatic_status)
    && base.line === patient.treatment_context.line
    && base.setting === patient.treatment_context.setting
    && (!base.histology || base.histology === patient.diagnosis.histology)
  ));
}

function therapySelection(field, patient) {
  const identity = field.therapy_code || field.class_code;
  const event = patient.treatment_history.events.find((item) => item.therapy_codes.includes(identity) || item.class_codes.includes(identity));
  if (!event) return field.negated ? "NOT_EXPOSED" : "UNKNOWN";
  if (event.outcome === "THERAPY_OUTCOME:REFRACTORY_TO") return "REFRACTORY_TO";
  if (event.intolerant === "TRUE") return "INTOLERANT_TO";
  if (event.progression_relation === "ON_OR_AFTER") return "PROGRESSED_ON_OR_AFTER";
  if (event.progression_relation === "ON") return "PROGRESSED_ON";
  if (event.exposure_status === "COMPLETED") return "COMPLETED";
  return "EXPOSED";
}

async function enterGoldenCase(page, definition, goldenCase) {
  const patient = goldenCase.positive_request.patient;
  await page.goto("http://127.0.0.1:4197/dashboard");
  await page.getByTestId("doctor1-vnext-ready").waitFor();
  await page.locator("#vnext-cancer").selectOption(patient.diagnosis.cancer);
  let diseaseChoice;
  if (patient.disease.stage !== "UNKNOWN") diseaseChoice = `stage|${patient.disease.stage}`;
  else if (patient.disease.states.length) diseaseChoice = `disease_state|${patient.disease.states[0]}`;
  else if (patient.disease.resectability !== "UNKNOWN") diseaseChoice = `resectability|${patient.disease.resectability}`;
  else diseaseChoice = `metastatic_status|${patient.disease.metastatic_status}`;
  await page.locator("#vnext-disease").selectOption(diseaseChoice);
  await page.locator("#vnext-line").selectOption(`${patient.treatment_context.line}|${patient.treatment_context.setting}`);
  if (patient.diagnosis.histology !== "UNKNOWN" && await page.locator("#vnext-histology").count()) {
    await page.locator("#vnext-histology").selectOption(patient.diagnosis.histology);
  }

  const fields = new Map();
  for (const path of matchingPaths(definition, patient)) for (const field of path.dynamic_fields) fields.set(field.id, field);
  for (const field of fields.values()) {
    if (field.kind === "number") {
      const value = pathValue(patient, field.path);
      if (value != null && value !== "UNKNOWN") await page.locator(`[data-field-id="${field.id}"]`).fill(String(value));
      continue;
    }
    if (field.kind === "contraindication") {
      if (patient.contraindications.includes(field.code)) await page.locator(`[data-field-id="${field.id}"]`).check();
      continue;
    }
    let value;
    if (field.kind === "boolean") value = pathValue(patient, field.path) ? "TRUE" : "UNKNOWN";
    else if (field.kind === "tristate" || field.kind === "select") value = pathValue(patient, field.path);
    else if (field.kind === "biomarker") value = patient.biomarkers.find((item) => item.code === field.code)?.status || "UNKNOWN";
    else value = therapySelection(field, patient);
    await page.locator(`[id="vnext-${field.id}"]`).selectOption(String(value));
  }
  if (goldenCase.positive_request.preferred_alternative_member) {
    await page.locator("#vnext-alternative").selectOption(goldenCase.positive_request.preferred_alternative_member);
  }

  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/doctor1-vnext/recommendation"));
  await page.getByRole("button", { name: "Run analysis" }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();
  assert.match(request.headers().authorization || "", /^Bearer /);
  assert.equal(payload.patient.schema_version, "onetra.doctor1.patient.vnext.1");
  assert.equal(payload.patient.diagnosis.cancer, patient.diagnosis.cancer);
  assert.deepEqual(payload.patient.disease.states, patient.disease.states);
  assert.equal(payload.patient.disease.stage, patient.disease.stage);
  assert.equal(payload.patient.treatment_context.line, patient.treatment_context.line);
  assert.equal(payload.patient.treatment_context.setting, patient.treatment_context.setting);
  assert.equal(payload.patient.demographics.age_years, patient.demographics.age_years);

  const result = page.getByTestId("doctor1-vnext-result");
  await result.waitFor({ timeout: 30000 });
  assert.match(await result.innerText(), /MATCH/);
  assert.equal(await page.getByTestId("vnext-regimen").innerText(), goldenCase.expected_regimen);
  const evidence = page.getByTestId("vnext-evidence");
  assert.equal(await evidence.locator("a").getAttribute("href"), goldenCase.expected_evidence_url);
  assert.ok((await page.getByTestId("vnext-match-trace").locator("li").count()) > 0);
  const rule = rules.find((item) => item.rule_id === goldenCase.rule_id);
  e2eRecords.push({
    golden_index: goldenCase.golden_index,
    rule_id: goldenCase.rule_id,
    audit_key: rule.provenance.audit_key,
    candidate_id: goldenCase.candidate_id,
    authenticated_login_path: "PASS",
    authenticated_request: "PASS",
    real_frontend_controls: "PASS",
    actual_payload_captured: "PASS",
    backend_api_response: "PASS",
    correct_regimen_displayed: "PASS",
    correct_evidence_displayed: "PASS",
    match_trace_displayed: "PASS",
    result: "PASS",
  });
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeLedger() {
  const columns = Object.keys(e2eRecords[0]);
  const rows = [columns.join(","), ...e2eRecords.map((row) => columns.map((column) => csvValue(row[column])).join(","))];
  writeFileSync(join(artifactRoot, "15_GOLDEN_E2E_TEST_LEDGER.csv"), `${rows.join("\r\n")}\r\n`, "utf8");
}

async function verifyNoDeadEnds(page) {
  await page.goto("http://127.0.0.1:4197/dashboard");
  await page.getByTestId("doctor1-vnext-ready").waitFor();
  const cancers = await page.locator("#vnext-cancer option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  let checked = 0;
  for (const cancer of cancers) {
    await page.locator("#vnext-cancer").selectOption(cancer);
    const diseases = await page.locator("#vnext-disease option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    assert.ok(diseases.length > 0, `${cancer} has no disease choices`);
    for (const disease of diseases) {
      await page.locator("#vnext-disease").selectOption(disease);
      const lines = await page.locator("#vnext-line option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
      assert.ok(lines.length > 0, `${cancer} / ${disease} produced an empty required line dropdown`);
      checked += 1;
    }
  }
  return checked;
}

let vite;
let browser;
let page;
try {
  await waitForBackend();
  const definition = await fetch(`${backendOrigin}/api/doctor1-vnext/intake-definition`).then((response) => response.json());
  vite = await createServer({ root, server: { host: "127.0.0.1", port: 4197, strictPort: true } });
  await vite.listen();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  page.on("console", (message) => { if (message.type() === "error") console.error(`BROWSER CONSOLE: ${message.text()}`); });
  page.on("pageerror", (error) => console.error(`BROWSER PAGE ERROR: ${error.message}`));
  await completeAuthenticatedEntry(page);
  for (const goldenCase of cases) {
    await enterGoldenCase(page, definition, goldenCase);
    console.log(`E2E PASS ${goldenCase.golden_index}/20 ${goldenCase.candidate_id}`);
  }
  const checked = await verifyNoDeadEnds(page);
  writeLedger();
  console.log(`DEAD-END REGRESSION PASS ${checked} selectable cancer/disease paths`);
  console.log("DOCTOR1 VNEXT GOLDEN E2E PASS 20/20");
} catch (error) {
  console.error("DOCTOR1 VNEXT GOLDEN E2E FAIL");
  console.error(error);
  if (page) console.error(`FAILED PAGE: ${page.url()}\n${(await page.locator("body").innerText().catch(() => "<body unavailable>")).slice(0, 2000)}`);
  console.error(backendLog);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  backend.kill();
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/App.jsx",
  "src/Dashboard.jsx",
  "src/Login.jsx",
  "src/Legal.jsx",
  "src/SiteChrome.jsx",
  "index.html",
];
const text = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
const forbidden = [
  "PubMed papers daily",
  "12 min",
  "FHIR",
  "Epic",
  "Cerner",
  "trial matching",
  "Trial Match",
  "Bias Mitigation",
  "Outcomes Data Flywheel",
  "MARIPOSA",
  "longitudinal pattern",
  "Optional longitudinal",
  "ranked 1st",
  "Case Studies",
  "Pricing",
];

for (const claim of forbidden) {
  assert.equal(text.toLowerCase().includes(claim.toLowerCase()), false, `unsupported claim remains: ${claim}`);
}

assert.match(text, /Auditable oncology decision support/i);
assert.match(text, /Optional clinical documents/i);
assert.match(text, /validation-stage/i);
assert.match(text, /For Oncologists/);
assert.match(text, /How It Works/);
assert.match(text, /label: "Login"/);
console.log("claim audit passed");

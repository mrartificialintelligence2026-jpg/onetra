import assert from "node:assert/strict";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { SignJWT } from "jose";
import { TextEncoder } from "node:util";

const SECRET = "phase2-test-secret-not-for-production";
const CLIENT_ID = "test-google-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
process.env.VITE_GOOGLE_CLIENT_ID = CLIENT_ID;
process.env.VITE_AUTH_TEST_HOOK = "1";
process.env.ONETRA_AUTH_TEST_SECRET = SECRET;
process.env.ONETRA_ADMIN_EMAILS = "admin@onetra.health";

async function makeToken(sub, email) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub,
    email,
    email_verified: true,
    name: "Phase Two Reviewer",
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(SECRET));
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 4185, strictPort: true },
});
await server.listen();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
let failed = false;

try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4185/dashboard");
  await page.waitForURL(/\/login/);
  await page.getByRole("heading", { name: /Continue with Google/i }).waitFor();

  const userTok = await makeToken("e2e-user", "reviewer@example.com");
  await page.evaluate(async (credential) => {
    await window.__ONETRA_TEST_LOGIN(credential);
  }, userTok);
  await page.waitForURL(/\/dashboard/);
  await page.getByTestId("reviewer-profile").waitFor();
  await page.locator("#display-name").fill("E2E Reviewer");
  await page.locator("#reviewer-type").selectOption("researcher");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("validation-consent").waitFor();
  await page.locator("#consent-ack").check();
  await page.getByRole("button", { name: "Start validation" }).click();
  await page.getByRole("heading", { name: "Clinical intake" }).waitFor();

  await page.locator("#cancer-type").selectOption("Non-Small Cell Lung Cancer");
  await page.locator("#stage").selectOption("IV");
  await page.locator("#line").selectOption("1L");
  await page.locator("#biomarkers").selectOption("MET_EX14_SKIP");
  await page.locator("#patient-age").fill("65");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await page.getByTestId("doctor1-card").waitFor({ timeout: 60000 });
  await page.getByTestId("validation-feedback").waitFor();
  await page.locator("#clinically-correct").selectOption("yes");
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await page.getByTestId("feedback-recorded").waitFor();

  await page.goto("http://127.0.0.1:4185/admin");
  await page.getByRole("heading", { name: /Administrator access required/i }).waitFor();

  const adminPage = await browser.newPage();
  const adminTok = await makeToken("e2e-admin", "admin@onetra.health");
  await adminPage.goto("http://127.0.0.1:4185/login");
  await adminPage.evaluate(async (credential) => {
    await window.__ONETRA_TEST_LOGIN(credential);
  }, adminTok);
  await adminPage.waitForURL(/\/dashboard/);
  await adminPage.goto("http://127.0.0.1:4185/admin");
  await adminPage.getByRole("heading", { name: "Validation summary" }).waitFor();
  await adminPage.close();

  console.log("phase2 browser e2e passed");
} catch (err) {
  failed = true;
  console.error("phase2 browser e2e failed");
  console.error(err);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);

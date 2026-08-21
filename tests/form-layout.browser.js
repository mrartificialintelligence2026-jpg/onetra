import assert from "node:assert/strict";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

async function launchChromium() {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 4182, strictPort: true },
});
await server.listen();
const browser = await launchChromium();
let failed = false;

const widths = [1366, 1024, 768, 390];
const fields = ["#cancer-type", "#stage", "#line", "#biomarkers", "#ecog", "#patient-age", "#clinical-documents"];

try {
  const page = await browser.newPage();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:4182/dashboard");
    await page.locator("#cancer-type").selectOption("Breast Cancer");
    await page.locator("#stage").selectOption({ index: 1 });
    const card = await page.locator(".form-card").boundingBox();
    assert.ok(card, `form card missing at ${width}`);
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(docWidth <= width + 1, `page scrollWidth ${docWidth} > viewport ${width}`);
    for (const selector of fields) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box, `${selector} missing at ${width}`);
      const right = box.x + box.width;
      const cardRight = card.x + card.width;
      assert.ok(right <= cardRight + 1, `${selector} overflows card at ${width}: fieldRight=${right.toFixed(1)} cardRight=${cardRight.toFixed(1)}`);
      assert.ok(box.x + 1 >= card.x, `${selector} starts left of card at ${width}`);
    }
    console.log(`layout PASS ${width}px`);
  }
} catch (err) {
  failed = true;
  console.error("layout FAIL");
  console.error(err);
} finally {
  await browser.close();
  await server.close();
}

process.exit(failed ? 1 : 0);

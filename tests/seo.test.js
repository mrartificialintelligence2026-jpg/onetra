import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "public/robots.txt",
  "public/sitemap.xml",
  "public/llms.txt",
  "public/manifest.webmanifest",
  "public/favicon.svg",
];
for (const file of required) {
  assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
}

const html = readFileSync(join(root, "index.html"), "utf8");
assert.match(html, /rel="canonical"/);
assert.match(html, /property="og:title"/);
assert.match(html, /name="twitter:card"/);
assert.match(html, /application\/ld\+json/);
assert.match(html, /"@type": "Organization"/);
assert.match(html, /"@type": "WebSite"/);
assert.match(html, /"@type": "SoftwareApplication"/);
assert.doesNotMatch(html, /approved medical device/i);
assert.doesNotMatch(html, /FAQPage/);

const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
assert.match(robots, /Sitemap: https:\/\/onetra.vercel.app\/sitemap.xml/);

const llms = readFileSync(join(root, "public/llms.txt"), "utf8");
assert.match(llms, /Validation-stage/);
assert.doesNotMatch(llms, /Epic|Cerner|FHIR|trial matching/i);

console.log("seo files passed");

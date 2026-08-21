import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".git", ".vercel"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|mjs|ts|tsx|json|md)$/.test(name)) acc.push(full);
  }
  return acc;
}

const files = walk(join(root, "src")).concat(walk(join(root, "api")));
const blob = files.map((file) => readFileSync(file, "utf8")).join("\n");

assert.doesNotMatch(blob, /DATABASE_URL\s*=\s*['"]postgres/);
assert.doesNotMatch(blob, /GOCSPX-/);
assert.doesNotMatch(blob, /client_secret\s*[:=]\s*['"][^'"]+['"]/);
assert.doesNotMatch(blob, /console\.log\([^)]*id_token/i);
assert.doesNotMatch(blob, /console\.log\([^)]*credential/i);
assert.match(blob, /verifyGoogleIdToken|Authorization/);
assert.equal(blob.includes("acfb358c-6c02-4053-bb7b-2089e2904d72"), false);

console.log("security bundle source scan passed");

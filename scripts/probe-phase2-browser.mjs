import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://onetra.health/dashboard", { waitUntil: "networkidle" });
const dashUrl = page.url();
const loginHeading = await page.getByRole("heading", { name: /Continue with Google/i }).count();
const googleHost = await page.locator("#google-login-btn, iframe[src*='accounts.google.com']").count();
await page.goto("https://onetra.health/", { waitUntil: "domcontentloaded" });
const landing = await page.getByRole("heading", { name: /Auditable Oncology Decision Support/i }).count();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("https://onetra.health/login", { waitUntil: "networkidle" });
const mobileLogin = await page.getByRole("heading", { name: /Continue with Google/i }).count();
console.log(JSON.stringify({ dashUrl, loginHeading, googleHost, landing, mobileLogin }));
await browser.close();

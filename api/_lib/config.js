export const TERMS_VERSION = process.env.ONETRA_TERMS_VERSION || "2026-08-14-v1";
export const APP_VERSION = process.env.ONETRA_APP_VERSION || "0.2.0";
export const CORPUS_IDENTIFIER = process.env.ONETRA_CORPUS_IDENTIFIER || "11_FINAL_D1_ACTIVE_CORPUS:315";
export const REVIEWER_TYPES = Object.freeze([
  "oncologist",
  "other_physician",
  "researcher",
  "other_reviewer",
]);

export function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

export function adminEmails() {
  return String(process.env.ONETRA_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function rateLimitConfig() {
  const max = Number.parseInt(process.env.ANALYSIS_RATE_LIMIT_MAX || "40", 10);
  const windowSeconds = Number.parseInt(process.env.ANALYSIS_RATE_LIMIT_WINDOW_SECONDS || "3600", 10);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 40,
    windowSeconds: Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : 3600,
  };
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).trim().toLowerCase());
}

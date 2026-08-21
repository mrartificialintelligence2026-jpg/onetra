const TOKEN_KEY = "onetra.google_id_token";

export function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function storeToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sessionStorage may be unavailable */
  }
}

export function clearToken() {
  storeToken("");
}

export function authHeaders(token = getStoredToken()) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function ledgerFetch(path, { method = "GET", body, token } = {}) {
  const headers = {
    ...authHeaders(token),
  };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(path, init);
  } catch {
    const error = new Error("The validation service is temporarily unavailable.");
    error.code = "network";
    throw error;
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.detail || statusMessage(response.status));
    error.status = response.status;
    error.code = json.code || `http_${response.status}`;
    throw error;
  }
  return json;
}

export function statusMessage(status) {
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "You do not have access to that resource.";
  if (status === 429) return "Analysis rate limit reached. Try again later.";
  if (status === 503) return "A required service is temporarily unavailable.";
  return `Request failed (${status}).`;
}

export function googleClientId() {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  const existing = document.getElementById("google-identity");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in is temporarily unavailable.")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-identity";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google sign-in is temporarily unavailable."));
    document.head.appendChild(script);
  });
}

export async function hashFileMeta(files, deidentifyAck) {
  const list = [];
  for (const file of files || []) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    list.push({
      file_type: file.type || (file.name || "").split(".").pop() || "unknown",
      byte_size: file.size,
      sha256,
      extract_ok: null,
      deidentify_ack: Boolean(deidentifyAck),
    });
  }
  return { files: list };
}

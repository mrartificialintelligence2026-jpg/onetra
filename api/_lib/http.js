export function json(status, body) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body,
  };
}

export function publicError(status, message, code) {
  return json(status, { detail: message, code });
}

export function readBearer(request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  if (!header.trim()) return "";
  const [scheme, token] = header.trim().split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

export async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Invalid JSON body.");
    error.status = 400;
    error.code = "invalid_json";
    throw error;
  }
}

export function nodeToWebRequest(req, bodyBuffer) {
  const host = req.headers.host || "127.0.0.1";
  const url = new URL(req.url, `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const init = { method: req.method, headers };
  if (bodyBuffer && req.method !== "GET" && req.method !== "HEAD") {
    init.body = bodyBuffer;
  }
  return new Request(url, init);
}

export function sendNode(res, result) {
  res.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value);
  res.end(JSON.stringify(result.body ?? {}));
}

export function readNodeBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

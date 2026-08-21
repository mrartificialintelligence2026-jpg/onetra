import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const PROTECTED = new Set([
  "/api/clinical-recommendation",
  "/doctor3/analyze-upload",
  "/doctor3/analyze-case",
]);

export const config = {
  matcher: ["/api/clinical-recommendation", "/doctor3/analyze-upload", "/doctor3/analyze-case"],
};

function deny(status, detail) {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async function middleware(request) {
  const path = new URL(request.url).pathname;
  if (!PROTECTED.has(path) || request.method === "OPTIONS") return;
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.trim().split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return deny(401, "Authentication required.");
  }
  const audience = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  if (!audience) return deny(503, "Authentication is temporarily unavailable.");
  try {
    const { payload } = await jwtVerify(token, JWKS, { audience, clockTolerance: 5 });
    if (!ISSUERS.has(String(payload.iss || "")) || !payload.sub) {
      return deny(401, "Authentication failed.");
    }
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      return deny(401, "Your session expired. Sign in again.");
    }
    return deny(401, "Authentication failed.");
  }
}

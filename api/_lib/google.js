import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import { googleClientId } from "./config.js";
import { TextEncoder } from "node:util";

export const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const DEFAULT_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let remoteJwks;

export function authError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.publicMessage = message;
  return error;
}

export function getJwks(jwks) {
  if (jwks) return jwks;
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(DEFAULT_JWKS_URL));
  return remoteJwks;
}

export async function verifyGoogleIdToken(token, options = {}) {
  if (!token || typeof token !== "string" || !token.trim()) {
    throw authError(401, "Authentication required.", "missing_token");
  }
  if (token.trim().split(".").length !== 3) {
    throw authError(401, "Authentication failed.", "malformed_token");
  }
  const audience = options.clientId || googleClientId();
  if (!audience) {
    throw authError(503, "Authentication is temporarily unavailable.", "unconfigured");
  }
  try {
    const testSecret = process.env.ONETRA_AUTH_TEST_SECRET;
    const key = options.jwks || (testSecret
      ? new TextEncoder().encode(testSecret)
      : getJwks());
    const { payload } = await jwtVerify(token.trim(), key, {
      audience,
      clockTolerance: 5,
      currentDate: options.now instanceof Date ? options.now : undefined,
    });
    if (!GOOGLE_ISSUERS.has(String(payload.iss || ""))) {
      throw authError(401, "Authentication failed.", "wrong_issuer");
    }
    if (!payload.sub) {
      throw authError(401, "Authentication failed.", "missing_sub");
    }
    const emailVerified = payload.email_verified === true;
    return {
      sub: String(payload.sub),
      email: emailVerified && payload.email ? String(payload.email) : "",
      name: payload.name ? String(payload.name) : "",
      email_verified: emailVerified,
    };
  } catch (error) {
    if (error.status) throw error;
    if (error instanceof joseErrors.JWTExpired) {
      throw authError(401, "Your session expired. Sign in again.", "expired_token");
    }
    if (error instanceof joseErrors.JWTClaimValidationFailed && /audience/i.test(error.message)) {
      throw authError(401, "Authentication failed.", "wrong_audience");
    }
    throw authError(401, "Authentication failed.", "invalid_token");
  }
}

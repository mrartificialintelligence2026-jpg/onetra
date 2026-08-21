/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getStoredToken, ledgerFetch, storeToken } from "./authClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [reviewer, setReviewer] = useState(null);
  const [ready, setReady] = useState(() => !getStoredToken());
  const [error, setError] = useState(null);

  const refresh = useCallback(async (nextToken = token) => {
    if (!nextToken) {
      setReviewer(null);
      setReady(true);
      return null;
    }
    try {
      const data = await ledgerFetch("/api/auth/session", { token: nextToken });
      setReviewer(data.reviewer);
      setError(null);
      setReady(true);
      return data.reviewer;
    } catch (err) {
      if (err.status === 401) {
        clearToken();
        setToken("");
        setReviewer(null);
        setError(err.message);
        setReady(true);
        return null;
      }
      setError(err.message);
      setReady(true);
      throw err;
    }
  }, [token]);

  useEffect(() => {
    const existing = getStoredToken();
    if (!existing) return undefined;
    let cancelled = false;
    ledgerFetch("/api/auth/session", { token: existing })
      .then((data) => {
        if (cancelled) return;
        setReviewer(data.reviewer);
        setError(null);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          clearToken();
          setToken("");
          setReviewer(null);
        }
        setError(err.message);
        setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (credential) => {
    storeToken(credential);
    setToken(credential);
    return refresh(credential);
  }, [refresh]);

  const signOut = useCallback(() => {
    clearToken();
    setToken("");
    setReviewer(null);
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* GIS may be absent */
    }
  }, []);

  const value = useMemo(() => ({
    ready,
    token,
    reviewer,
    error,
    signedIn: Boolean(token && reviewer),
    signIn,
    signOut,
    refresh,
    setReviewer,
  }), [ready, token, reviewer, error, signIn, signOut, refresh]);

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_TEST_HOOK === "1") {
      window.__ONETRA_TEST_LOGIN = (credential) => signIn(credential);
      window.__ONETRA_TEST_LOGOUT = () => signOut();
    }
  }, [signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}

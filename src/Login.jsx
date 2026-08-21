import { useEffect, useRef, useState } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { setPageMeta } from "./pageMeta.js";
import { useAuth } from "./AuthProvider.jsx";
import { googleClientId, loadGoogleIdentity } from "./authClient.js";

export default function Login() {
  const { signedIn, signIn } = useAuth();
  const buttonRef = useRef(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(() => (googleClientId() ? "loading" : "unconfigured"));
  const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";

  useEffect(() => {
    setPageMeta({
      title: "Sign in — OneTra Health",
      description: "Sign in with Google to use the OneTra validation-stage oncology validator. Synthetic or de-identified adult cases only.",
      path: "/login",
    });
  }, []);

  useEffect(() => {
    if (signedIn) {
      window.location.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [signedIn, next]);

  useEffect(() => {
    const clientId = googleClientId();
    if (!clientId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleIdentity();
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              setError("Sign-in was cancelled.");
              return;
            }
            try {
              await signIn(response.credential);
            } catch (err) {
              setError(err.message || "Sign-in failed.");
            }
          },
          cancel_on_tap_outside: true,
        });
        buttonRef.current.innerHTML = "";
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setError(err.message || "Google sign-in is temporarily unavailable.");
      }
    })();
    return () => { cancelled = true; };
  }, [signIn]);

  return (
    <SiteChrome active="/login">
      <main id="main" className="page-main">
        <p className="kicker">Reviewer sign-in</p>
        <h1>Continue with Google</h1>
        <p className="lede">
          Sign in to run the live validator, inspect outputs, and record structured review.
          OneTra does not store a password. Google’s stable account identifier is used as your identity.
        </p>
        <div className="form-card login-card">
          <div ref={buttonRef} id="google-login-btn" data-testid="google-login" />
          {status === "loading" && <p className="hint">Loading Google sign-in…</p>}
          {status === "unconfigured" && (
            <p className="hint">Google sign-in is not configured on this deployment yet.</p>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <p className="hint" style={{ marginTop: 18 }}>
            Use a work or personal Google account. Reviewer credentials are self-declared unless independently verified.
          </p>
        </div>
      </main>
    </SiteChrome>
  );
}
